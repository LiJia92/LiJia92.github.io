---
title: Windows使用Hexo + Github Pages搭建自己的博客
date: 2016-03-17 11:30:45
tags:
 - 博客
---

本文主要讲述一下Windows环境使用Hexo + Github Pages搭建自己博客的一些主要步骤。
## 介绍
### Hexo
hexo是一个基于Node.js的静态博客程序，可以方便的生成静态网页托管在Github上。

> A fast, simple & powerful blog framework

1. 超快的速度：Node.js 所带来的超快生成速度，让上百个页面在几秒内瞬间完成渲染。
2. 支持 Markdown：Hexo 支持 GitHub Flavored Markdown 的所有功能，甚至可以整合 Octopress 的大多数插件。
3. 一键部署：只需一条指令即可部署到 GitHub Pages, Heroku 或其他网站。
4. 丰富的插件：Hexo 拥有强大的插件系统，安装插件可以让 Hexo 支持 Jade, CoffeeScript。

### Github Pages
GitHub Pages本用于介绍托管在GitHub的项目， 不过，由于他的空间免费稳定，用来做搭建一个博客再好不过了。

> Websites for you and your projects.

1. Github Pages 有300M免费空间，资料自己管理，保存可靠；
2. Github作为最大的同性交流社区，已经得到了人们的肯定；
3. Github上有很多大牛，学着用 Github ，享受 GitHub 的便利，眼界会开阔很多。

<!--more-->

## 前期准备
### 安装Git
去 [Git](https://git-scm.com/) 官网下载相应版本，进行安装即可。
### 安装Node.js
去 [NodeJs](https://nodejs.org/en/) 官网下载相应版本，进行安装即可。
### 注册Github账号
去 [Github](https://github.com/) 官网进行注册即可。
注册完之后记得添加 [SSH Key](https://help.github.com/articles/generating-an-ssh-key/)。

## 搭建博客
### 安装Hexo
在本地新建一个blog文件夹，右键，选择Git Bash。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-blog3.png)
输入指令安装Hexo：

```
npm install -g hexo
```
等到完成之后，输入指令初始化Hexo：

```
hexo init Hexo
```
完成之后，便能在blog文件夹下看到hexo文件夹了。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-blog4.png)

进入到hexo目录，输入指令npm install，安装依赖文件

```
$ cd hexo
$ npm install
```
安装完成之后，输入指令部署：

```
$ hexo generate
$ hexo server
```
此时打开浏览器，输入``http://localhost:4000/``便可看到最原始的博客了。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-blog1.png)

此时，Hexo已搭建完毕。

### GitHub创建仓库
登录Github，点击New respository。

![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-blog6.png)

输入仓库名：你的Github名称.github.io。然后点击Create repository。
图中因为我已经创建，故给出提示，不用管。

### 托管到Github
打开hexo配置文件_config.yml。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-blog5.png)

编辑deploy属性：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-blog7.png)
repository属性改成你的git地址即可。

然后Git Bash进入到hexo文件夹，输入指令即可完成部署：

```
$ hexo clean
$ hexo generate
$ hexo deploy
```
最后，打开你的github.io页面看下效果吧~
