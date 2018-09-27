---
title: Android 开发减少 shape 文件
date: 2018-09-27 17:15:17
tags:
 - 日常开发
---
作为一名 Android 开发者，对于 shape 文件肯定不会陌生。但是，用时一时爽，到后面遇到缩包要求时，或者强迫症开发者不希望有重复的 shape 文件，便是有苦说不出了。
通常，我们定义 shape 文件可能会根据业务来，代表这个 shape 文件在哪里用到，举个栗子：``vyg__route_search_bg_selector.xml``，开发人员看到这个 shape 文件可以知道是在路线搜索页面用到的。可是这样命名，当开发人员各自独立开发时，可能会有一大堆业务相关的 shape 文件，可能会和其他开发人员相关业务重复了。所以后面我们干脆改成这样了：``vyg__shape_r2_f7f7f7.xml``，代表 2dp 的 radius，然后填充色是 #F7F7F7。如果项目设计师严格按照一套标准来设计所有的背景，这样命名一套 shape 文件可以做到复用了。可如果设计师经常换人，或者不够专业等等其他原因，这里一个颜色，那里又是另外一个颜色，或者把 2dp 的圆角变成 4dp，如此下来，shape 文件依然会很多。就像这样：

<!-- more -->

![](http://7xryow.com1.z0.glb.clouddn.com/2018/09/27/1.png)
现在做的项目还是个新项目，看着这日益增多的 shape 文件感觉还是得采取点措施处理一下。本着不重复造轮子的原则，Google 了一波，发现这是广大开发者都面对过的一个问题，目前看到的有几个方案。
##  自定义View
通过自定义 View 或 ViewGroup，解析对应的 xml 属性，来生成相应的 BackgroundDrawable，这种方式不太灵活，即使用到 Android 自带的 TextView 等控件也得在 xml 中声明自定义的 View，比较蛋疼。
最新的 support 包里也出了一个 Material Button，可以来设置简单的 shape 属性，和这个类似。

参考：
[是时候跟 shape 标签说拜拜了](https://www.jianshu.com/p/4b20502f2692)
[Material Button](https://material.io/develop/android/components/material-button/)

## 代码生成 
通过代码直接生成相应的 BackgroundDrawable，然后设置到 View 上。比如这样：
```
FSelector.with(tvtext1)
        .addDrawable().circleAngle(dp2px(15)).bgColor(getColors(R.color.clr_fb720e))
        .create()
        .bind();
```
这种显然也不行的，每个 View 要设置背景得写多少这种代码？还不如直接写 shape 得了。

参考：
[解放双手,提高编码效率,减少大量的selecor文件](https://juejin.im/entry/5b98857ce51d450e7825e9a9)

## BackgroundLibrary
有没有一种更好的方式呢？找了一阵子，终于找到了个还比较满意的：[BackgroundLibrary](https://github.com/JavaNoober/BackgroundLibrary)
针对这个库，作者也写了篇文章进行相关的说明，还不错。[无需自定义View，彻底解放shape，selector吧](https://juejin.im/post/5b9682ebe51d450e543e3495)
引入只需要在BaseActivity里添加如下代码：
```
BackgroundLibrary.inject(this)
```
然后直接在 xml 中声明对应的属性即可。通过这种方式，比较省心，也没有其他不必要的依赖，已经可以应付绝大多数场景了。用的是 Google 提供的 Api，没有使用到反射，针对高版本可能的非 SDK 接口限制的问题也不存在。缺点就是不能实时预览，也没有属性提示，熟悉后问题不大。
实现原理作者也说了：**通过低入侵的方式，加入一个自定义的 LayoutInflater.Factory，去解析添加的自定义属性，然后生成系统提供的 GradientDrawable、RippleDrawable、StateListDrawable 即可。**
目前来看算是最好的方案了，先用着，后面有问题再跟进，给作者点个赞~