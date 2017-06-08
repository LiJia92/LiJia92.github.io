---
title: 关于 Git 的使用小记
date: 2017-06-07 20:04:42
tags:
 - 日常开发
---

相信选择选择绝大部分开发者都使用的 Git 来进行版本控制，关于 Git 比较基本的东西就不说了，这里主要记录一下我用到的 2 个较为进阶一点的命令。

# git revert
场景：假定现在有一个分支``develop/1.0.0``，该分支用于发布``1.0.0``版本的包，``develop/1.0.0``依赖一个 module，该 module 的版本与之对应也是``1.0.0``，就在将要打包的时候， develop 分支新增了一个提交，这个提交依赖 module 的``1.0.1``版本，可能是由于同事之间的沟通不足导致这种问题，不需要提交的被提交了。在发布``1.0.0``版本的包时，是不应该包含最新的提交的。那么可以怎么样做呢？
**revert 意为回退。可以使用``git revert``指令，回退最新的一次提交。**
举个例子：
初始化一个 git 仓库，添加一个文件``git``，做一次提交``init``。
然后编辑``git``文件，做一次提交``feature A``。
准备以当前节点打包时，又多了一次提交``feature B``，此次提交是不需要包含到此次打包的代码里的。

<!-- more -->

此时``git log``可以看到 3 次提交：

![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/07%E9%80%89%E5%8C%BA_001.png)

执行指令：
```
git revert 10ffa5
```
``10ffa5``为需要回退的 commit id，即上图中``feature B``那次提交，版本号没必要写全，前几位就可以了，Git会自动去找。填写提交信息：

![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/07%E9%80%89%E5%8C%BA_002.png)

执行结束后，代码便回退到``feature A``的提交了,可以安心打包了。

![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/07%E9%80%89%E5%8C%BA_003.png)

打完包后，可以基于``develop/1.0.0``分支 new branch``develop/1.0.1``，然后切到``develop/1.0.1``执行指令：
```
git revert 13fbb4
```
之前``feature B``的提交便回来了，可以继续开发了。

# git cherry-pick
场景：假定现在有 2 个分支``feature/A``、``feature/B``，然后发现了一个 bug，这个 bug 是公共代码造成的，即 2 个分支都存在这样的 bug。选择在``feature/A``上修复这个 bug，但不能直接 merge ``feature/A``到``feature/B``上，因为 2 个分支在进行不同特性的开发。那么可以怎么样做呢？
**cherry-pick 是对已经存在的 commit 进行再次提交。**
举个例子：
我们在``feature/A``分支修复问题后提交。然后切到``feature/B``分支，执行指令：
```
git cherry-pick a89acbe4
```
因为我的例子中，2 个分支都对同一个文件同一个位置做了修改，所以冲突了。提示：

![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/07%E9%80%89%E5%8C%BA_004.png)

所以需要先解决冲突，然后执行：
```
git cherry-pick --continue
```
好了，再来看看修复bug的提交是否存在``feature/B``分支中吧。

最后贴一下关于 Git 的一个很好的教程：[git-recipes](https://github.com/geeeeeeeeek/git-recipes/wiki)
