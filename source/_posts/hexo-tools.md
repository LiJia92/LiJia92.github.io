---
title: Hexo-Tools
date: 2016-03-17 18:14:16
tags:
 - blog
---

本文主要讲述一下使用Hexo搭建博客的过程中，使用的一些比较实用的工具。

## 七牛
### 介绍
在博客中若要插入图片，我们可以直接将图片放在本地。但是这样的话，在deploy的时候，图片也会上传至Github。但是Github上的空间只有300Mb，很有可能导致以后不够用，所以最好找一个图床。
之前听说过七牛，便打算试一试。
它：
1. 注册之后实名制便有10G的免费空间，一段时间内是肯定够用的；
2. 比较稳定；
3. 有很多实用的工具，你可以使用；
4. 更多的就待以后慢慢发现了~

<!--more-->

### 注册
1. 去到[七牛官网](https://portal.qiniu.com/signin)注册账户。

### 上传图片
2. 创建空间。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tools1.png)
3. 长传图片。
选择空间后，点击内容管理。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tools4.png)
点击上传文件。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tools2.png)
在长传文件时，建议加入路径前缀，方便后面进行查找。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tools3.png)

### 使用图片
1. 在七牛中预览图片，点击复制外链。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tools5.png)
2. 在Markdown中引用
```
![这里输入图片描述](图片外链地址)
```

## Atom
### 介绍
在代码编辑器、文本编辑器领域，有着不少的「神器」级的产品，如历史悠久的 VIM、Emacs 以及如今当红的 SublimeText。另外还有 EditPlus、NotePad++、UltraEdit 等一大堆流行的利器，可谓百家争鸣。

然而，作为目前全球范围内影响力最大的代码仓库/开源社区，GitHub 的程序员们并不满足于此。他们使用目前最先进流行的技术重新打造了一款称为“属于21世纪”的代码编辑器——``Atom``， 它开源免费跨平台，并且整合 GIT 并提供类似 SublimeText 的包管理功能，支持插件扩展，可配置性非常高……

> ATOM - 由 GitHub 打造更为先进的编辑器

### 安装
去到[ Atom ](https://atom.io/)官网，进行下载安装。
### 使用
点击File-->Open Folder...
打开自己的工程。
然后便可以随心所欲的编辑了~
### Markdown编辑与预览
1. 打开任意.md文件(Markdown源文件);
2. windows下使用快捷键 ctrl + shift + p，打开命令输入框；
3. 输入``Markdown Preview Toggle``(可以偷懒只输入mdpt，支持模糊匹配)。也可以通过菜单栏Packages->Markdown Preview->Toggle Treview。按enter键即可看到预览，左边编辑，右边实时预览。也可以直接使用快捷键``Ctrl + Shift + M``。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tools6.png)
如此便能非常方便的编辑、预览我们的博客了。
