---
title: Git data stream error
date: 2018-06-22 12:38:56
tags:
 - 开发工具
---
今天使用 Git 碰到个问题，在此小记一下。
场景：``git stash``当前工作区，然后``git pull --rebase``:
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/6/22/1.png)

然后执行``git stash pop``时报错。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/6/22/2.png)

执行``git status``也报错：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/6/22/3.png)

<!-- more -->

Google 之后大致是因为 Git 记录一些文件的版本指针被损坏了。这个损坏可能不是人为的，可能你正在 push 或者 pull 一些文件的时候，电脑突然断电或者关机了，就可能会导致这个异常发生。至于为什么在我的场景中出现了这个问题，就不得而知了。
下面来解决它，执行指令``git fsck --full``：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/6/22/4.png)

可以看到有问题的指针引用。这串字符串的前 2 位是你的``.git/objects/``文件夹下对应的文件夹目录，然后``cd ./fe``删除掉这个字符串，``rm e91c5f...``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/6/22/5.png)

删除掉之后，回到工作目录，继续执行``git fsck --full``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/6/22/6.png)

可以看到没有错误状态的 blob 或者 commit 了。此时 git 已经可以正常使用了。

再补充一下，指针的 hash 值可能由于某些原因出错了，需要重新生成 hash 值。
```
git hash-object -w spec/routing/splits_routing_spec.rb
```
spec/routing/splits_routing_spec.rb 为对应的文件。

参考：
1. [git commit stopped working - Error building trees](https://stackoverflow.com/questions/14448326/git-commit-stopped-working-error-building-trees)
2. [在使用 Git pull 时候报错 error: inflate](https://www.cnblogs.com/erbingbing/p/7263540.html)
