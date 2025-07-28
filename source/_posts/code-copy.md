---
title: 解锁拷贝代码的新姿势
date: 2018-01-22 15:13:26
tags:
 - 开发工具
---
作为程序员，我们总会有各种拷贝代码的需求，例如现场部署，基友探讨，亦或是 公司电脑 -> 自家电脑 等等。最最无脑的就是直接硬盘拷贝了，复制代码文件夹或压缩文件，直接拷贝到自己的硬盘或 U 盘里。但是作为安卓开发，如果要拷贝安卓代码，那就很费劲了。因为 Android Studio 会生成各种与代码无关的文件，尤其是 build 文件夹，有些时候代码可能就一两百兆，但是 build 文件夹就能有大几百兆甚至上 G 了。当然我们可以先 clean，然后再拷贝，但是如果项目复杂，多个工程多个 Module 互相依赖的，那就得每个 Module 都执行一遍 clean 了，想想那有多繁杂。

现在大多的代码版本控制都是采用的 Git，我们需要的其实就只是代码文件，其他的一概不需要，而 Git 内部的 .gitignore 不是正好对应我们的需求吗？所以，我们得从版本控制的角度来拷贝代码。相信大多数公司项目的代码都是私有仓库，只能在公司内网访问到。但我们可以给代码添加远程仓库 origin，这个 origin 可以指到 Github 或自己搭建的 Git 服务器，但是如果是公司代码是不建议这么做的，泄密了嘛～若是自己写的小工具，三方库倒是没什么影响，但这也不是本文要说的重点。

今天就说一下利用 Git 拷贝代码的新姿势，SVN 或其他版本控制工具不在此文范围之内。**其实就是一个 Git 命令：git bundle。**

<!-- more -->

来看看一个简单的例子。 假设你有一个包含两个提交的仓库：
```
$ git log
commit 9a466c572fe88b195efd356c3f2bbeccdb504102
Author: Scott Chacon <schacon@gmail.com>
Date:   Wed Mar 10 07:34:10 2010 -0800

    second commit

commit b1ec3248f39900d2a406049d762aa68e9641be25
Author: Scott Chacon <schacon@gmail.com>
Date:   Wed Mar 10 07:34:01 2010 -0800

    first commit
```
然后利用``git bundle``指令来打包：
```
$ git bundle create repo.bundle HEAD master
Counting objects: 6, done.
Delta compression using up to 2 threads.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (6/6), 441 bytes, done.
Total 6 (delta 0), reused 0 (delta 0)
```
然后你就会有一个名为 repo.bundle 的文件，该文件包含了所有重建该仓库 master 分支所需的数据。 在使用 bundle 命令时，你需要列出所有你希望打包的引用或者提交的区间。 如果你希望这个仓库可以在别处被克隆，你应该像例子中那样增加一个 HEAD 引用。

你可以将这个 repo.bundle 文件通过邮件或者U盘传给别人。

另一方面，假设别人传给你一个 repo.bundle 文件并希望你在这个项目上工作。 你可以从这个二进制文件中克隆出一个目录，就像从一个 URL 克隆一样。
```
$ git clone repo.bundle repo
Initialized empty Git repository in /private/tmp/bundle/repo/.git/
$ cd repo
$ git log --oneline
9a466c5 second commit
b1ec324 first commit
```
**如果你在打包时没有包含 HEAD 引用，你还需要在命令后指定一个 -b master 或者其他被引入的分支，否则 Git 不知道应该检出哪一个分支。** 如此，拿着生成的打包文件便可随时随地的拷贝代码了。

另外，我们可以只打包部分 commit。现在假设你提交了 3 个修订，并且要用邮件或者U盘将新的提交放在一个包里传回去。
```
$ git log --oneline
71b84da last commit - second repo
c99cf5b fourth commit - second repo
7011d3d third commit - second repo
9a466c5 second commit
b1ec324 first commit
```
首先我们需要确认我们希望被打包的提交区间。 和网络协议不太一样，网络协议会自动计算出所需传输的最小数据集，而我们需要手动计算。 当然你可以像上面那样将整个仓库打包，但 **最好仅仅打包变更的部分** —— 就是我们刚刚在本地做的 3 个提交。

为了实现这个目标，你需要计算出差别。 就像我们在 提交区间 介绍的，你有很多种方式去指明一个提交区间。 我们可以使用 ``origin/master..master``或者``master ^origin/master``之类的方法来获取那 3 个在我们的 master 分支而不在原始仓库中的提交。 你可以用 log 命令来测试。
```
$ git log --oneline master ^origin/master
71b84da last commit - second repo
c99cf5b fourth commit - second repo
7011d3d third commit - second repo
```
这样就获取到我们希望被打包的提交列表，让我们将这些提交打包。 我们可以用 git bundle create 命令，加上我们想用的文件名，以及要打包的提交区间。
```
$ git bundle create commits.bundle master ^9a466c5
Counting objects: 11, done.
Delta compression using up to 2 threads.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (9/9), 775 bytes, done.
Total 9 (delta 0), reused 0 (delta 0)
```
现在在我们的目录下会有一个 commits.bundle 文件。 如果我们把这个文件发送给我们的合作者，她可以将这个文件导入到原始的仓库中，即使在这期间已经有其他的工作提交到这个仓库中。

当她拿到这个包时，她可以在导入到仓库之前查看这个包里包含了什么内容。 bundle verify 命令可以检查这个文件是否是一个合法的 Git 包，是否拥有共同的祖先来导入。
```
$ git bundle verify ../commits.bundle
The bundle contains 1 ref
71b84daaf49abed142a373b6e5c59a22dc6560dc refs/heads/master
The bundle requires these 1 ref
9a466c572fe88b195efd356c3f2bbeccdb504102 second commit
../commits.bundle is okay
```
如果打包工具仅仅把最后两个提交打包，而不是三个，把指令中 commit 改为 ``7011d3d``，原始的仓库是无法导入这个包的，因为这个包缺失了必要的提交记录。这时候 verify 的输出类似：
```
$ git bundle verify ../commits-bad.bundle
error: Repository lacks these prerequisite commits:
error: 7011d3d8fc200abe0ad561c011c3852a4b7bbe95 third commit - second repo
```
而我们的第一个包是合法的，所以我们可以从这个包里提取出提交。 如果你想查看这边包里可以导入哪些分支，同样有一个命令可以列出这些顶端：
```
$ git bundle list-heads ../commits.bundle
71b84daaf49abed142a373b6e5c59a22dc6560dc refs/heads/master
```
verify 子命令同样可以告诉你有哪些顶端。 该功能的目的是查看哪些是可以被拉入的，所以你可以使用 fetch 或者 pull 命令从包中导入提交。 这里我们要从包中取出 master 分支到我们仓库中的 other-master 分支：
```
$ git fetch ../commits.bundle master:other-master
From ../commits.bundle
 * [new branch]      master     -> other-master
```
可以看到我们已经将提交导入到 other-master 分支，以及在这期间我们自己在 master 分支上的提交。
```
$ git log --oneline --decorate --graph --all
* 8255d41 (HEAD, master) third commit - first repo
| * 71b84da (other-master) last commit - second repo
| * c99cf5b fourth commit - second repo
| * 7011d3d third commit - second repo
|/
* 9a466c5 second commit
* b1ec324 first commit
```
因此，**当你在没有合适的网络或者可共享仓库的情况下，git bundle 很适合用于共享或者网络类型的操作。**

### 小插曲
注意打包命令``git bundle create commits.bundle master ^9a466c5``中的 **^ 符号**，做了几次实验，若没有这个符号，打出来的包都可以通过验证。并且这个包是包含了所有提交的 bundle，没有增量 commits，所以这个符号在打增量 commits 包时一定不能忘。
```
➜  git git:(master) ✗ git bundle verify 6.bundle
这个包中含有这个引用：
31814aab295f73d45130b7278c4b03656f1d75cd refs/heads/master
这个包记录一个完整历史。
6.bundle 可以
```

之前买了凯哥的[《Git 原理详解及实用指南》](https://juejin.im/book/5a124b29f265da431d3c472e)，第二章里有一个图：
![](https://user-gold-cdn.xitu.io/2017/11/30/1600a9a4a20c2e6e?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)
之前一直搞不懂``偶尔``那条线是怎么来实现的，加群询问也没什么答案，现在算是知道了。同事之间直接利用打包指令，生成打包文件，利用这个文件来直接交互。

关于 Git 的更多讲述，请参考[官方文档](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E6%89%93%E5%8C%85)。
