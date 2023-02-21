---
title: 使用 Dialog 的两个问题
date: 2023-02-21 16:54:17
tags:
 - 日常开发
---
近期在使用 Dialog 的过程中，出现过两个问题，也记录一下。

## TextureView
当 Dialog 布局有 TextureView 时，运行报错：
```
java.lang.UnsupportedOperationException: TextureView doesn't support displaying a background drawable
  at android.view.TextureView.setBackgroundDrawable(TextureView.java:315)
  at android.view.View.setBackground(View.java:18124)
  at android.view.View.<init>(View.java:4573)
  at android.view.View.<init>(View.java:4082)
  at android.view.TextureView.<init>(TextureView.java:159)
```
<!--more-->

说是 TextureView 不支持设置 background。可布局文件里压根就没设置 background。于是尝试将所有 View 的 background 全部去掉，仍然崩溃。然后尝试把 TexureView 从 xml 去掉，能正常运行。所以肯定还是 TextureView 的问题。
Google 了很久，也没找到问题所在，主要是很“无厘头”的崩溃，也没什么关键字。后面突然灵光一身，Dialog 会有 style，有没有可能是 style 导致的呢？使用的 style 是这样的：
```
<style name="dialog__style" parent="@android:style/Theme.Dialog">
    <item name="android:windowBackground">@android:color/transparent</item>
    <item name="android:windowContentOverlay">@null</item>
    <item name="android:windowFrame">@null</item>
    <item name="android:background">@android:color/transparent</item>
    <item name="android:windowNoTitle">true</item>
    <item name="android:windowIsFloating">true</item>
    <item name="android:windowIsTranslucent">false</item>
    <item name="android:backgroundDimEnabled">true</item>
    <item name="android:windowSoftInputMode">stateHidden|adjustResize</item>
</style>
```
于是去掉 style，确实就没崩溃了。然后加上 style，挨个屏蔽属性，最终定位到是 android:background 属性导致崩溃的，猜测是这个属性会迭代 Dialog 中的 view 挨个去设置 background 导致的。
**所以，在 Dialog 中使用 TextureView 时，Dialog 一定不要设置 android:background 的 style。**

## VideoView
在 Dialog 中使用 VideoView 时，播放视频感觉会是“很暗”的感觉。查阅资料最终发现 VideoView 是继承自 SurfaceView 的，Surface 是纵深排序(Z-ordered)的，很有可能就是这个排序导致的。于是调用``setZOrderOnTop(true)``果然就好了。
