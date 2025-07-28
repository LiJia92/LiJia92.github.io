---
title: Android Studio中使用.9（Nine Patch）图
date: 2015-11-23 10:09:38
tags:
 - Android 基础
---

本文主要结合Android Studio讲述一下.9图片的原理与使用。

---
## 原理
在Android的设计过程中，为了适配不同的手机分辨率，图片大多需要拉伸或者压缩，这样就出现了可以任意调整大小的一种图片格式“.9.png”。这种图片是用于Android开发的一种特殊的图片格式，它的好处在于可以用简单的方式把一张图片中哪些区域可以拉伸，哪些区域不可以拉伸设定好，同时可以把显示内容区域的位置标示清楚。

.9图片相比普通图片，在四条边会多出1px的空隙，我们在这1px的空隙中画上黑线，即可控制图片怎么拉伸，内容区域的位置。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch1.png)
讲解一下四条边的作用：

 1. Top，图中1所示，是控制图片可横向拉伸的区域。
 2. Left，图中2所示，是控制图片可纵向拉伸的区域。
 3. Right&Botton，图中的3与4，结合起来控制内容显示的区域。

<!--more-->

---
## 使用
我们在Android Studio中新建一个项目，选择一张普通图片，置于drawable目录下。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch2.png)

下面我们将它改为.9图片。在Android Studio中使用.9图很简单：<font color=red>直接将图片名称以".9.png"结束。
使用.9图必须注意一点：文件的后缀名必须是.9.png，不能是.png或者是.9.png.png，这样的命名都会导致编译失败。</font>
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch3.png)

将名称改好之后，重新打开图片，可以看到图片下面会有2个Tab，切换到``9-Patch``即可配置.9图片了。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch4.png)

下面做如下配置：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch5.png)

在右边的效果图中，纵向只拉伸了Left所画黑线对应的区域，横向只拉伸了Top所画黑线对应的区域。至于Right与Bottom，我们可以通过勾选下方的Show content让其显示内容区域。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch6.png)

可以看到，这里上下左右四条黑边的作用确实如原理中所说。
图中效果很难看，改成这样：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch7.png)
看起来效果还不错，这样我们可以尽情的配置图片该如何拉伸，针对不同分辨率，以达到一个更好的效果。

## 解惑
起初对Right与Bottom这2条边限定的内容区域不太了解，便做了个小测试。
将2条边改成如下：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch8.png)
然后布局文件里引入一个TextView，将background设置为此.9图片。
```
<TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_centerInParent="true"
        android:background="@drawable/ninepatch"
        android:text="Hello World!" />
```
运行后的效果：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/nine-patch9.png)
可以看到“Hello World！”显示在了图片的右下方。
Right与Bottom这2条边限定的内容区域所起的作用便一目了然了。
