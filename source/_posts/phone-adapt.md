---
title: 「小米MIX2」全面屏适配
date: 2018-09-13 10:53:11
tags:
 - 日常开发
---
有这样一个需求：
![](http://7xryow.com1.z0.glb.clouddn.com/2018/09/13/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180913113729.png)
作为一个 Android 开发者，首先想到的就是用 PopupWindow 来实现。底部阴影的高度固定，剩余的高度全部填充到 PopupWindow，然后调用 PopupWindow 的 showAsDropDown 让它在应用标题栏下面显示就行了。

<!-- more -->

首先适配全面屏，在 AndroidManifest.xml 中添加如下代码：
```
<meta-data android:name="android.max_aspect" android:value="2.1" />
```
大体代码如下：
```
class FilterPopup(val context: Activity) : PopupWindow(context) {

    init {
        val root = View.inflate(context, R.layout.popup, null) as LinearLayout
        width = ViewGroup.LayoutParams.MATCH_PARENT
        height = ViewGroup.LayoutParams.WRAP_CONTENT
        contentView = root
        // 省略...
}
```
本以为就结束了，结果在我的「小米MIX2」手机上显示有问题，底部会有一条白边，十分难受。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/09/13/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180913113734.jpg)
于是我尝试把 height 设置成 MATCH_PARENT，白边是没了，但是整个 PopupWindow 占据了整个屏幕的高度，直接覆盖住了应用的标题栏。
于是我开始设置 root 的 paddingTop 为标题栏的高度，嗯，显示刚刚好。可是在全国加点击事件时就尴尬了：点击事件给 PopupWindow 吃掉了。如果只有一个按钮，可以在 PopupWindow 上面覆盖个同样位置的 View fake 一下，可是标题栏还有搜索，想想比较麻烦就打消这个念头了。
设置 MATCH_PARENT 不行，我直接设置真正的高度行不行呢？
参照界面：
```
height = 屏幕高度 - 状态栏高度 - 标题栏高度 - 导航栏高度（如果有显示导航栏）
```
获取屏幕高度：
```
context.resources.displayMetrics.heightPixels
```
获取状态栏高度：
```
Resources.getSystem().getDimensionPixelSize(Resources.getSystem().getIdentifier("status_bar_height", "dimen", "android"));
```
标题栏高度是写死的 48dp。
然后就是判断是否有导航栏，有也要减去导航栏的高度：
```
fun getNavigationBarHeight(wm: WindowManager): Int {
    if (!isNavigationBarShow(wm)) {
        return 0
    }
    val resources = context.resources
    val resourceId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
    return resources.getDimensionPixelSize(resourceId)
}

fun isNavigationBarShow(wm: WindowManager): Boolean {
    val display = wm.defaultDisplay
    val size = Point()
    val realSize = Point()
    display.getSize(size)
    display.getRealSize(realSize)
    return realSize.y != size.y
}
```
嗯，如果一切真这么顺利就不会有这篇文章了。
首先获取屏幕高度就一直是错误的。方法返回 2030，可「小米MIX2」的高度是 2160 像素，差了 130。只能用如下方法才能获取到 2160：
```
val outMetrics = DisplayMetrics()
context.windowManager.defaultDisplay.getRealMetrics(outMetrics)
outMetrics.heightPixels
```
关于刚刚的 130，经查阅正好是导航栏的高度。可我手机当前是全面屏手势的模式，没有显示导航栏，所以，还得判断是否是全面屏。又查阅了一番：
```
/**
 * 判断设备是否存在NavigationBar
 *
 * @return true 存在, false 不存在
 */
public static boolean deviceHasNavigationBar() {
    boolean haveNav = false;
    try {
        Class<?> windowManagerGlobalClass = Class.forName("android.view.WindowManagerGlobal");
        Method getWmServiceMethod = windowManagerGlobalClass.getDeclaredMethod("getWindowManagerService");
        getWmServiceMethod.setAccessible(true);
        Object iWindowManager = getWmServiceMethod.invoke(null);

        Class<?> iWindowManagerClass = iWindowManager.getClass();
        Method hasNavBarMethod = iWindowManagerClass.getDeclaredMethod("hasNavigationBar");
        hasNavBarMethod.setAccessible(true);
        haveNav = (Boolean) hasNavBarMethod.invoke(iWindowManager);
    } catch (Exception e) {
        e.printStackTrace();
    }
    return haveNav;
}

public static boolean miuiNavigationGestureEnabled(Context context) {
    try {
        return Settings.Global.getInt(context.getContentResolver(), "force_fsg_nav_bar") != 0;
    } catch (Settings.SettingNotFoundException e) {
        e.printStackTrace();
    }
    return false;
}
```
获取导航栏高度的方法返回的值倒是准确的，可是 isNavigationBarShow 方法则是一直返回的 true，即使我当前是全面屏手势模式，没有显示导航栏。
最后整合一下：
```
val outMetrics = DisplayMetrics()
context.windowManager.defaultDisplay.getRealMetrics(outMetrics)
var height  = outMetrics.heightPixels - SystemUtils.getStateBarHeight() - DimenUtils.dp2px(48)

if (SystemUtils.deviceHasNavigationBar() && !SystemUtils.miuiNavigationGestureEnabled(context)) {
    height -= SystemUtils.getNavigationBarHeight(context.windowManager)
}

this.height = height
```
如此在我手机上，能够完美运行了。但是针对其他厂商的全面屏，还需要判断 Rom 类型，再判断是否开启全面屏手势，本文在此不做详细描述，可自行 Google。
这里贴下 oppo 手机全面屏是否开启的方法：
```
private static final String NAVIGATION_GESTURE = "navigation_gesture_on";
private static final int NAVIGATION_GESTURE_OFF = 0;

public static boolean vivoNavigationGestureEnabled(Context context) {
    int val = Settings.Secure.getInt(context.getContentResolver(), NAVIGATION_GESTURE, NAVIGATION_GESTURE_OFF);
    return val != NAVIGATION_GESTURE_OFF;
}
```
但是这样针对不同的 Rom 要做很多种判断，总感觉不靠谱。后面找到一种方式来判断是否展示导航栏：
```
/**
 * 判断是否显示导航栏
 */
private fun isNavigationBarExist(activity: Activity): Boolean {
    val vp = activity.window.decorView as? ViewGroup
    if (vp != null) {
        for (i in 0 until vp.childCount) {
            if (vp.getChildAt(i).id != NO_ID && "navigationBarBackground" == activity.resources.getResourceEntryName(vp.getChildAt(i).id)) {
                return true
            }
        }
    }
    return false
}
```
经测试，在我的 MIX2 及同事的华为手机上，展示正常，在一些测试机上展示也 ok，便先采取这种方式了。

参考：
[MIX2 获取屏幕高度Bug](http://www.miui.com/thread-13296153-1-1.html)
[判断用户是否打开了全面屏手势](http://www.miui.com/thread-13012674-1-1.html)
[Android获取系统的硬件信息、系统版本以及如何检测ROM类型](https://blog.csdn.net/xx326664162/article/details/52438706)
[Android APP适配全面屏手机的技术要点](https://blog.csdn.net/weelyy/article/details/79284332)
[Android全面屏虚拟导航栏适配](https://juejin.im/post/5bb5c4e75188255c72285b54)