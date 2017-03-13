---
title: 博客主题更新
date: 2017-02-16 14:54:43
tags:
 - blog
---
之前一直用的是``next``主题，后面看到过``yilia``主题，感觉也不错，便切换到了``yilia``主题。但是在用的时候有个问题一直让我很不爽：空行的处理让代码上下空出很多行。就像这样：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/02/984899F5-CB20-4A44-B7EF-5F311A4E2B48.png)

<!-- more -->

到主题的[issues#339](https://github.com/litten/hexo-theme-yilia/issues/339)里面也找到了跟我遇到一样问题的朋友。是yilia主题中的一个bug，作者也回复了已经修改，更新后这个bug便没有了。
接下来，我就很尴尬了：我当时为了多电脑在同步博客的同时，也删除了主题的git版本管理，导致此时我无法更新主题了,囧。。。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/02/34F818B7-2D4E-4C08-A171-E02D8AE51DEB.png)

那么该怎么办呢？感觉只能用死办法重新下一次了-.-。
首先直接删除主题目录下的yilia文件夹（删除前备份一下，因为yilia中也有_config.yml），然后执行命令：
```
git clone https://github.com/litten/hexo-theme-yilia.git themes/yilia
```
下载下来后，更新配置文件，然后再删掉yilia文件夹下得.git版本控制文件夹，这样新更新下来的yilia代码就会处于之前设置的整个git仓库的管理下了，分支是source。后面便和之前的操作保持一致就好了~
``yilia``主题的近期更新：
1. 打赏
2. 搜索
3. “更好的”标签云
4. “更好的”分享
5. 一些动画

作者出的搜索直接合并了之前的``标签``。跟进作者的配置，修改``yilia``的配置：
```
# slider的设置
slider:
  # 是否默认展开tags板块
  showTags: true

smart_menu:
  innerArchive: '搜索'
  friends: '友链'
  aboutme: '关于我'
```
重新部署后，界面如下：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/02/3.png)

说明很简单明了了，照着操作一遍后即可。

当执行后仍然如此的话，那就是``Node.js的版本``与``jsonContent``不兼容导致，要么升级Node.js版本，要么降低jsonContent版本。

此次更新后，博客整体变得更好看了~

PS：只是以后如果博客主题要更新，就得这样来一次了，着实有点蛋疼>.<。。。
