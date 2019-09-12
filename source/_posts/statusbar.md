---
title: Android状态栏小记
date: 2016-08-04 14:29:46
tags:
 - 日常开发
---

最近做了一个需求：在全屏看视频的时候，点击空白处，显示状态栏。距离最后一次点击5秒后，自动收起状态栏。
最后做出的效果如下图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/08/statusbar1.gif)

<!-- more -->

## 状态栏显示与隐藏
首先状态栏的显示与隐藏代码如下：
```
private void showOperation() {
    isShowing = true;
    handler.removeCallbacks(showOrHide);
    handler.postDelayed(showOrHide, 5000);
    // 显示状态栏
    WindowManager.LayoutParams attr = getWindow().getAttributes();
    attr.flags &= (~WindowManager.LayoutParams.FLAG_FULLSCREEN);
    getWindow().setAttributes(attr);
    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

    top.setTranslationY(getStatusBarHeight());
}

/**
 * 获取状态栏高度
 */
public int getStatusBarHeight() {
    int result = 0;
    int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
    if (resourceId > 0) {
        result = getResources().getDimensionPixelSize(resourceId);
    }
    return result;
}

/**
 * 隐藏状态栏
 */
private void hideOperation() {
    isShowing = false;
    // 隐藏状态栏
    WindowManager.LayoutParams lp = getWindow().getAttributes();
    lp.flags |= WindowManager.LayoutParams.FLAG_FULLSCREEN;
    getWindow().setAttributes(lp);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

    top.setTranslationY(0);
}
```
使用handler来进行自动收起，在每次有效操作时，刷新时间重新数5秒。
```
private Runnable showOrHide = new Runnable() {
    @Override
    public void run() {
        hideOperation();
    }
};

handler.removeCallbacks(showOrHide);
handler.postDelayed(showOrHide, 5000);
```

## 全屏透明状态栏
首先在Application的Theme里，我进行的如下配置：
```
<style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
    <!-- Customize your theme here. -->
    <item name="colorPrimary">@color/colorPrimary</item>
    <item name="colorPrimaryDark">@color/live_gray_bg</item>
    <item name="colorAccent">@color/colorAccent</item>
    <item name="windowNoTitle">true</item>
    <item name="android:windowNoTitle">true</item>
    <item name="android:windowFullscreen">true</item>
</style>
```
整个App所有界面都是``FullScreen``的，``colorPrimaryDark``是状态栏的颜色，我这里设置的是``#4d000000``，一个带透明度的黑色,该属性只在``android5.0及以上``有效。
然后在activity的onCreate里，在setContentView()之前，调用如下代码：
```
if (Build.VERSION.SDK_INT > 16) {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_LAYOUT_FLAGS | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
}
```
针对View的各种FLAG这里列一下说明：
1. View.SYSTEM_UI_FLAG_VISIBLE：显示状态栏，Activity不全屏显示(恢复到有状态的正常情况)；
2. View.INVISIBLE：隐藏状态栏，同时Activity会伸展全屏显示；
3. View.SYSTEM_UI_FLAG_FULLSCREEN：Activity全屏显示，且状态栏被隐藏覆盖掉；
4. View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN：Activity全屏显示，但状态栏不会被隐藏覆盖，状态栏依然可见，Activity顶端布局部分会被状态遮住；
5. View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION：效果同View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN；
6. View.SYSTEM_UI_LAYOUT_FLAGS：效果同View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN；
7. View.SYSTEM_UI_FLAG_HIDE_NAVIGATION：隐藏虚拟按键(导航栏)。有些手机会用虚拟按键来代替物理按键；
8. View.SYSTEM_UI_FLAG_LOW_PROFILE：状态栏显示处于低能显示状态(low profile模式)，状态栏上一些图标显示会被隐藏。

## 状态栏显示时布局调整
通过上面的代码，这样整个状态栏就是按照我设置的颜色来显示了，他会直接覆盖在我们的布局上。
那么问题来了，当状态栏显示的时候，他会盖在我们的布局上，那么如果布局顶部有View，那么就会被遮盖住，要如何解决呢？
网上查了很多，说是在activity的根布局设置属性``android:fitsSystemWindows="true"``，确实，设置后就不会遮盖在布局了，但是它会单独占据空间，设置的半透明的黑色背景也无作用了，另外界面会被压缩，然后屏幕会跳一下。
发个图感受一下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/08/statusbar2.gif)
可以看到界面会跳，而且视频这种具有一定长宽比的可能会自适应，导致黑边，所以这不是一个解决方案，所以我没有添加这个属性。
那么到底要怎么解决呢？
其实是一个很笨的方法，上面的代码已经写到了：``在状态栏显示的时候，直接将被挡住的View下移``。
即上面代码中的：
```
top.setTranslationY(getStatusBarHeight());
top.setTranslationY(0);
```
在这里也可以添加动画，使效果更柔和一点。

## 疑问
在android4.4上达不到半透明这样的效果，设置的``colorPrimaryDark``是不起作用的，他会是一整个黑条（黑色和rom有关吧），看起来效果就会差一些了，不知道该要怎么解决，望了解的朋友可以指导一下~
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/08/statusbar3.gif)
Tip：找到很多修改颜色的文章，但是都是用到了``android:fitsSystemWindows="true"``属性，故不是我的解决方案~
