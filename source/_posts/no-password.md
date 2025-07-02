---
title: 博客免密提交、部署到Github
date: 2017-04-19 10:08:07
tags:
 - blog
---

每次写完博客，``hexo d``的时候需要输入一次Github账号密码，``git push``的时候又需要输入一次，有点烦了。最近转到 Ubuntu 工作，也换了台电脑，之前的配置都忘记了，于是重新查了一下，这里摘录一下，忘记了后面可以回头来看。

## hexo d 免密输入
在 user 根目录下新建``.netrc``文件，填写内容：
```
machine github.com
login username      //username为github账户名 （不是用来登录的邮箱或手机号）
password password   //password为github账户的密码
```
保存之后，再执行 hexo d 时即可直接部署，不用输入账号密码了。

<!-- more -->

## git push 免密输入
因为是用的 https 方式，进入到 git 控制的根目录，执行：
```
gedit .git/config
```
看到：
```
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
[remote "origin"]
	url = https://github.com/LiJia92/LiJia92.github.io.git
	fetch = +refs/heads/*:refs/remotes/origin/*
```
编辑url为：
```
https://LiJia92:5201314lijia@github.com/LiJia92/LiJia92.github.io.git
```
即：**https://username:password@github.com/username/project.git**，username就是你账号名。

## 参考
[github https方式免密码提交代码 在git config 中添加用户名密码](http://www.akmumu.com/2015/06/02/360.html)
[Hexo免输入密码部署到Github](http://jianwl.com/2016/04/14/Hexo%E5%85%8D%E8%BE%93%E5%85%A5%E5%AF%86%E7%A0%81%E9%83%A8%E7%BD%B2%E5%88%B0Github/)

## 2025/07/02更新
