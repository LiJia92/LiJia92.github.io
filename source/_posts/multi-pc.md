---
title: Hexo多台电脑同步博客
date: 2016-11-29 19:06:25
tags:
 - blog
---

## 前言
iMac到了之后，这2天一直在熟悉系统，准备记点东西写到博客里，发现需要解决Hexo多台电脑同步的问题，其实蛮早之前就打算弄的，方便自己在家里也能写写博客，但是考虑要带电脑到公司，而且这也确实是与工作无关的事情，只能周末来弄，但是周末是吧，大家懂的，压根不想来呀233333，所以便拖到今天了。

## 原理
先来想想多台电脑同步博客的原理。假设电脑A已经可以正常写博客发布了，这个时候B电脑也想发布博客该如何做呢？我们知道，发不到Github pages上的东西是静态内容，这些是Hexo生成的，这些东西其实不需要我们管，我们只要在``hexo d``的时候就会帮我们生成然后上传到github。所以我们需要同步的只是``源文件``。这里的源文件指的就是``md文件、theme相关文件、以及博客配置文件``等``一切跟Hexo无关的文件``。举个栗子，这里看看Hexo目录。

<!-- more -->

![](http://7xryow.com1.z0.glb.clouddn.com/2016/11%EF%BC%8Fmulti-pc1.png)
我们需要同步的就是``suorce、themes、以及_config.yml``了，其他都是Hexo生成的。
那么接下来便是同步这些文件了。同步的话我们可以在github.io的仓库下建个分支source（也可以建仓库，原理是一样的），然后将这些源文件同步到source分支，当另一台电脑要写博客时，先从该分支pull最新的数据，然后hexo new，当部署完之后将自己新建的源文件push到该分支。反正就是记住一点，每次写博客的时候先pull，完毕的时候push。

## A 电脑操作
首先，我们要同步themes，就把theme文件夹下面对应的``.git``删掉，删掉之后便是没有之前的版本控制了，意味着你不能再更新主题了-。-，但是其实一般主题我们再配置后就很少修改它了，所以为了``同步主题设置``姑且删掉吧。
然后在hexo目录下执行下面的命令初始化仓库：
```
git init
```
然后配置``.gitignore``：
```
/.deploy_git
/node_modules
/public
db.json
```
db.json是每次部署的时候会自动生成，会经常变动，导致冲突，所以我们把它忽略。
然后添加远程分支，并push：
```
git checkout -b source
git add .
git commit -m "first commit"
git remote add origin https://github.com/LiJia92/LiJia92.github.io.git
git push origin source
```
执行完毕后再github.io上便能看到source分支了，这个分支里的内容便是源文件了。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/11%EF%BC%8Fmulti-pc2.png)

## B 电脑操作
假设新电脑已经装好Git，Node，Hexo这些环境，那么只需要同步下来source分支的内容即可。
```
git init
git remote add origin https://github.com/LiJia92/LiJia92.github.io.git
git pull origin source    # 从source分支拉取内容
```
建议先将hexo目录下的source、themes等source分支上有的内容删掉，避免冲突。
这样B电脑便具备了和A电脑一样的源文件环境了，接下来便可以进行写博客了。

## 最后
每次在写博客的时候，需要执行一次pull操作：
```
git pull origin source
```
写完之后push：
```
git add .                     
git commit -m "update new paper"
git push origin source
```
记得带上分支名称source。

## Tip
看到一些博客说是要设置github的默认branch，这个设置只是针对采用git clone方式拷贝代码的，如果通过我文中的方法是不需要设置默认branch的。

## 参考
[通过 git 实现多台电脑同步博客](https://juzi.in/2016/04/17/the-blog-sync-multi-pc.html)
[Hexo利用Github分支在不同电脑上写博客](http://www.dxjia.cn/2016/01/27/hexo-write-everywhere/)
