---
title: Andoird开发中适配小记
date: 2016-07-21 09:59:06
tags:
 - 日常开发
---

Android也做了一段时间了，做的项目也经历过大大小小的测试，这里把一些适配的实际情形写下来，方便日后查阅，后面会持续更新。
主要记录一些适配的实际情形，至于使用.9图、dp单位这类适配就不说了。

<!-- more -->

## 适配虚拟按键
部分手机会有虚拟按键，会占用屏幕的一定空间，当我们的界面布局存在“硬编码”的时候（固定写死多少dp），就可能导致界面显示出问题。
可以通过如下方法来判断是否有虚拟按键：
```
/**
 * 是否有虚拟按键
 *
 * @return
 */
public static boolean checkDeviceHasNavigationBar(Context context) {
    boolean hasNavigationBar = false;
    Resources rs = context.getResources();
    int id = rs.getIdentifier("config_showNavigationBar", "bool", "android");
    if (id > 0) {
        hasNavigationBar = rs.getBoolean(id);
    }
    try {
        Class systemPropertiesClass = Class.forName("android.os.SystemProperties");
        Method m = systemPropertiesClass.getMethod("get", String.class);
        String navBarOverride = (String) m.invoke(systemPropertiesClass, "qemu.hw.mainkeys");
        if ("1".equals(navBarOverride)) {
            hasNavigationBar = false;
        } else if ("0".equals(navBarOverride)) {
            hasNavigationBar = true;
        }
    } catch (Exception e) {

    }
    return hasNavigationBar;
}
```
然后通过如下方法获取虚拟按键的高度：
```
/**
 * 获取虚拟按键的高度
 *
 * @return
 */
public int getNavigationBarHeight() {
    Resources resources = context.getResources();
    int resourceId = resources.getIdentifier("navigation_bar_height", "dimen", "android");
    if (resourceId > 0) {
        return resources.getDimensionPixelSize(resourceId);
    }
    return 0;
}
```
获得到高度之后，便能代码控制之前的“硬编码”了，依情况减去或者加上虚拟按键的高度便可以解决这类问题的适配的。示例如下：
```
// 如果有虚拟按键，则加上虚拟按键的高度
if (checkDeviceHasNavigationBar(context)) {
    int navigationBarHeight = getNavigationBarHeight();
    RecyclerView.LayoutParams params = (RecyclerView.LayoutParams) holder.root.getLayoutParams();
    params.bottomMargin = (int) (context.getResources().getDimension(R.dimen.minus_living_card_height) - navigationBarHeight);
    holder.root.setLayoutParams(params);
}
```
当然你也可以简单粗暴的隐藏掉虚拟按键。代码如下：
```
View decorView = getWindow().getDecorView();
decorView.setSystemUiVisibility(
           View.SYSTEM_UI_FLAG_LAYOUT_STABLE
           | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
           | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
           | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION // hide nav bar
           | View.SYSTEM_UI_FLAG_FULLSCREEN // hide status bar
           | View.SYSTEM_UI_FLAG_IMMERSIVE);
```

## Android4.4横屏弹出的对话框顶部被状态栏遮盖
效果就像这样：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/07/adapter1.png)
初步感觉是Android4.4的一个BUG，可以在Dialog创建的时候，添加如下代码来解决问题：
```
/**
 * 针对Android 4.4在横屏下顶部被状态栏遮挡的问题
 * 暂没有4.4以下的手机进行测试
 */
if (Build.VERSION.SDK_INT == 19) {
    mWindow.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN);
}
```

## 联想K3 Note中GridView自带分隔线
效果就像这样：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/07/adapter2.png)
在GridViewz中添加``horizontalSpacing``、``verticalSpacing``2条属性来解决问题：
```
<?xml version="1.0" encoding="utf-8"?>
<CustomGridView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:horizontalSpacing="0dp"
    android:listSelector="@color/transparent"
    android:numColumns="3"
    android:scrollbars="none"
    android:verticalSpacing="0dp" />
```

## VideoView切换横竖屏
VideoView在切换横竖屏，如果是Activity跳转，那么就会重新加载，导致切换前后不连贯。
所以我的做法是：只有一个Activity，点击全屏按钮将其置为横屏状态，每次切换的时候，显示一套布局，隐藏一套布局。配置activity的``android:configChanges="orientation|screenSize"``，这样在切换的时候就不会重新布局，然后在``onConfigurationChanged``中进行相关操作：
```
@Override
public void onConfigurationChanged(Configuration newConfig) {
    /**
     * 适配部分机型在旋转的时候，视频尺寸没有自适应的问题
     */
    videoView.getHolder().setFixedSize(videoView.getWidth(), videoView.getHeight());
    if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
        // 横屏时隐藏竖屏布局
    } else {
        // 竖屏时隐藏横屏布局
    }
    super.onConfigurationChanged(newConfig);
}
```
但是在部分机型会导致切换后视屏尺寸没有自适应，如图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/07/adapter3.gif)
利用如上代码``videoView.getHolder().setFixedSize(videoView.getWidth(), videoView.getHeight());``即可解决问题。
