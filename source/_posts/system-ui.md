---
title: Android状态栏、虚拟按键小记
date: 2016-09-20 16:05:23
tags:
 - 日常开发
---

之前写过一篇[状态栏小记](http://lastwarmth.win/2016/08/04/statusbar/)，这里加入虚拟按键重新做一下总结。

<!-- more -->

## 前言
Android 4.0之后，我们可以通过``setSystemUiVisibility(int)``方法，结合各种flag来设置系统组件（状态栏、虚拟按键）的显示或隐藏。那么有哪些Flag呢？Android官方文档有以下flag：
1. View.SYSTEM_UI_FLAG_FULLSCREEN
> View has requested to go into the normal fullscreen mode so that its content can take over the screen while still allowing the user to interact with the application.

2. View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
> View has requested that the system navigation be temporarily hidden.

3. View.SYSTEM_UI_FLAG_IMMERSIVE
> View would like to remain interactive when hiding the navigation bar with SYSTEM_UI_FLAG_HIDE_NAVIGATION.

4. View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
> View would like to remain interactive when hiding the status bar with SYSTEM_UI_FLAG_FULLSCREEN and/or hiding the navigation bar with SYSTEM_UI_FLAG_HIDE_NAVIGATION.

5. View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
> View would like its window to be laid out as if it has requested SYSTEM_UI_FLAG_FULLSCREEN, even if it currently hasn't.

6. View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
> View would like its window to be laid out as if it has requested SYSTEM_UI_FLAG_HIDE_NAVIGATION, even if it currently hasn't.

7. View.SYSTEM_UI_FLAG_LAYOUT_STABLE
> When using other layout flags, we would like a stable view of the content insets given to fitSystemWindows(Rect).

8. SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
> Requests the status bar to draw in a mode that is compatible with light status bar backgrounds.

9. View.SYSTEM_UI_FLAG_LOW_PROFILE
> View has requested the system UI to enter an unobtrusive "low profile" mode.

10. SYSTEM_UI_FLAG_VISIBLE
> View has requested the system UI (status bar) to be visible (the default).

11. SYSTEM_UI_LAYOUT_FLAGS
> Flags that can impact the layout in relation to system UI.

## 实用代码
在做与状态栏、虚拟按键相关的工作时，有些代码亲测比较实用。
获取状态栏高度：
```
/**
 * 获取状态栏高度
 *
 * @return
 */
public int getStatusBarHeight() {
    int result = 0;
    int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
    if (resourceId > 0) {
        result = getResources().getDimensionPixelSize(resourceId);
    }
    return result;
}
```
判断是否有虚拟按键：
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
获取虚拟按键的高度：
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
显示状态栏：
```
WindowManager.LayoutParams attr = getWindow().getAttributes();
attr.flags &= (~WindowManager.LayoutParams.FLAG_FULLSCREEN);
getWindow().setAttributes(attr);
getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
```
隐藏状态栏：
```
WindowManager.LayoutParams lp = getWindow().getAttributes();
 lp.flags |= WindowManager.LayoutParams.FLAG_FULLSCREEN;
 getWindow().setAttributes(lp);
 getWindow().addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
```
关于隐藏状态栏以及虚拟按键的显示、隐藏，目前知道的只有通过``setSystemUiVisibility``方法结合flag来实现。
隐藏虚拟按键：
```
getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);
```
下面来做一个示例。

## 示例
前言中11种flag，真正用到的也就几种，下面结合示例来说。
新建一个应用，将Activity设置为全屏，并且横屏（模拟直播、播放视频类似的环境）。
先贴一下示例代码：
```
public class MainActivity extends AppCompatActivity {

    private boolean isShowing;
    private TextView hello;
    private Button dialog;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dialog = (Button) findViewById(R.id.dialog_button);
        hello = (TextView) findViewById(R.id.hello_world);
        hello.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isShowing) {
                    hideOperation();
                } else {
                    showOperation();
                }
            }
        });
        dialog.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                AlertDialog.Builder builder = new AlertDialog.Builder(MainActivity.this);
                builder.setMessage("Hello World!");
                builder.setTitle("Title");
                builder.create().show();
                hideOperation();
            }
        });
    }

    private void showOperation() {
        isShowing = true;
        WindowManager.LayoutParams attr = getWindow().getAttributes();
        attr.flags &= (~WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setAttributes(attr);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_LAYOUT_FLAGS
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    private void hideOperation() {
        isShowing = false;
        int options = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_LAYOUT_FLAGS
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            options |= View.SYSTEM_UI_FLAG_IMMERSIVE;
        }
        getWindow().getDecorView().setSystemUiVisibility(options);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
//        int options = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
//                | View.SYSTEM_UI_LAYOUT_FLAGS
//                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
//                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
//                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
//                | View.SYSTEM_UI_FLAG_FULLSCREEN;
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
//            options |= View.SYSTEM_UI_FLAG_IMMERSIVE;
//        }
//        getWindow().getDecorView().setSystemUiVisibility(options);
    }
}
```
运行效果如下图：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/system1.gif)

1. 可以看到，在我点击依次"Hello World"之后，button往下移了一点点，同时状态栏也显示了。（初始的时候虚拟按键就已经显示）
2. 再点击一下，进行隐藏操作，状态栏、虚拟按键同时消失。当点击中间的button弹出dialog时，虚拟按键与状态栏会同时出来。然后关掉dialog后要连着点2次，状态栏、虚拟按键才会消失。

针对第一点，是初始的时候，虚拟按键在App布局之外，当执行``SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN（根据说明：按全屏模式来表现，尽管当前没有设置全屏模式）``之后，App布局占据手机整个显示框，所以会“变高”了些，button会下移。
针对第二点，目前也不知道是什么原因导致必须点2次才会执行消失操作。姑且以为是虚拟按键抢占焦点，第一次的点击被它消费了，第二次才是我们App进行消费。另外，当弹出dialog时，我们也可以控制状态栏不显示，将hideOperation改为如下：
```
private void hideOperation() {
    isShowing = false;
    WindowManager.LayoutParams lp = getWindow().getAttributes();
    lp.flags |= WindowManager.LayoutParams.FLAG_FULLSCREEN;
    getWindow().setAttributes(lp);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

    int options = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_LAYOUT_FLAGS
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;
//              | View.SYSTEM_UI_FLAG_FULLSCREEN;

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        options |= View.SYSTEM_UI_FLAG_IMMERSIVE;
    }
    getWindow().getDecorView().setSystemUiVisibility(options);
}
```
如此，当弹出dialog时，状态栏便不会显示了，但是``虚拟按键是一定会显示的``。可以认为：``SYSTEM_UI_FLAG_FULLSCREEN flag的意思就是全屏显示，在此flag下，不会显示状态栏。``

至于点击2次才消失的解决方案，便是取消``onWindowFocusChanged``中的注释，如此，1、2中描述的问题都不会出现了。

通过``SYSTEM_UI_FLAG_HIDE_NAVIGATION``来隐藏虚拟按键，会导致一个问题：界面有交互时虚拟按键会自动显示。要解决这个问题，便要用到``SYSTEM_UI_FLAG_IMMERSIVE``了，它的意思是``当虚拟按键隐藏时仍然保留交互``，可以理解为虚拟按键只是隐藏，但仍然还在，所以发生交互的时候便不会再自动显示了。

## 总结
1. SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN：按照全屏模式来显示，尽管当前没有设置为全屏模式，设置此flag便会抢占虚拟按键的空间，使应用真正的全屏，虚拟按键若要显示，则只是覆盖在应用的View上了。
2. SYSTEM_UI_FLAG_FULLSCREEN：全屏显示，此模式下不会显示状态栏。
3. SYSTEM_UI_FLAG_HIDE_NAVIGATION：隐藏虚拟按键。
4. SYSTEM_UI_FLAG_IMMERSIVE：当虚拟按键隐藏时，仍然保留交互。解决隐藏后界面发生交互又自动显示的问题。
5. SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION：按照隐藏虚拟按键模式显示，尽管当前没有设置为隐藏虚拟按键模式。针对示例中的第一点，将SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN改为此flag或者SYSTEM_UI_FLAG_HIDE_NAVIGATION都会使App充满显示框，导致button下移。

大致就说这些了，还有一些flag没弄明白，后面继续努力，写得有点乱~

[示例代码](https://github.com/LiJia92/MyStudyProject/tree/master/systemuistudy)
