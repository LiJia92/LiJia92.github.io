---
title: 尝试使用 Android SVG
date: 2017-07-26 18:50:34
tags:
 - 日常开发
---

普遍的 Android 开发可以理解为移动端界面开发，那么界面自然是重中之重。当设计师给到你设计稿时，你便需要将设计稿中的东西用代码做出来。
项目开发中便遇到了这样一个设计稿：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/07/26/%E9%80%89%E5%8C%BA_053.png)

这算是一个很基本的对话框了，没什么难度。写这篇文章主要是为了记一下图中``关闭按钮``的实现。
这个``关闭按钮``算是再简单不过的一个图标了，那么要如何实现呢？当然可以找到设计师要切图。但是这里我想尝试一下 Android 中的 SVG，顺便也是减轻设计师的工作量，经常劳烦别人也不是什么好事。

<!-- more -->

## SVG
什么是 SVG ?
简单来说：SVG 即 **可缩放矢量图形**(Scalable Vector Graphics)，是使用XML来描述二维图形和绘图程序的语言，其定义遵循W3C标准。它有哪些特点：
1. SVG 可被非常多的工具读取和修改(比如记事本)
2. SVG 与 JPEG 和 GIF 图像比起来，尺寸更小，且可压缩性更强
3. SVG 是可伸缩的，可以保证高清晰度的被放大
4. SVG 文件是纯粹的 XML

特殊说明一下，SVG 相比 Bitmap，它最大的优点就是放大不会失真。当 Bitmap 需要为不同分辨率适配多套图标时，一套 SVG 即可搞定一切分辨率。

## 如何使用
这里说一下最简单的使用方法。
1. 首先去[阿里巴巴矢量图标库](http://www.iconfont.cn/)(当然也有其他的网站)搜索需要的图标。
2. 下载需要图标的 SVG 图像。
3. 到[Android SVG to VectorDrawable](http://inloop.github.io/svg2android/)将下载的 SVG 图像转成 XML（也可通过 Android Studio 本身的支持进行转换），然后直接用到 Android Studio 中的 drawable 中即可。

## 举个栗子
在网站搜索``关闭``图标：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/07/26/%E9%80%89%E5%8C%BA_052.png)

选择上图中第三个图标，选择下载：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/07/26/%E9%80%89%E5%8C%BA_054.png)

选择图标颜色，大小，选择``SVG 下载``。然后将下载的文件拖到上面所说的网站中即可生产 XML：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/07/26/%E9%80%89%E5%8C%BA_055.png)

然后直接用到 drawable 即可：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/07/26/%E9%80%89%E5%8C%BA_057.png)

当然你可以利用 Android Studio 本身的 VectorDrawable 支持：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/07/26/%E9%80%89%E5%8C%BA_056.png)

文中关于 SVG 的使用算是最简单的了，但是 SVG 还有很多其他的用法，它有很多标签，来实现各种效果，有兴趣的同学可以自行谷歌。
