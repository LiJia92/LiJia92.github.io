---
title: Android 双屏异显
date: 2017-09-13 18:42:54
tags:
 - 日常开发
---

最近在做收银机相关的开发，涉及到``双屏异显``的一些东西，之前也没有接触过，在查阅一番资料之后，把功能走通了，这里小记一下。

## Presentation
Presentation 是一种特殊的对话框，主要用于在另外一块屏幕上显示内容。默认为克隆模式，即副屏显示和正屏一样的内容。当需要显示不同内容时，需要自定义 Presentation，并为其指定一个 Display。这里随便定义一个 Presentation：
```
public class MyPresentation extends Presentation {

    public MyPresentation(Context outerContext, Display display) {
        super(outerContext, display);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.presentation_second_screen);
    }
}
```

<!-- more -->

## 声明权限
因为 Presentation 是对话框，所以需要以下权限：
```
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
<uses-permission android:name="android.permission.SYSTEM_OVERLAY_WINDOW" />
```

## 获取 Displays
在实例化 Presentation 之前需要先获取 Displays。
```
private void initDisplays() {
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.JELLY_BEAN_MR1) {
        return;
    }

    DisplayManager mDisplayManager;
    mDisplayManager = (DisplayManager) this.getSystemService(Context.DISPLAY_SERVICE);
    mDisplays = new Display[0];
    mDisplays = mDisplayManager.getDisplays();
}
```
mDisplays 即代表设备所有的屏幕。

## 实例化 Presentation
```
private void initPresentation() {
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.JELLY_BEAN_MR1) {
        return;
    }

    if (mPresentation == null && mDisplays != null && mDisplays.length > 1) {
        mPresentation = new MyPresentation(this, mDisplays[mDisplays.length - 1]);
        if (mPresentation.getWindow() != null) {
            mPresentation.getWindow().setType(WindowManager.LayoutParams.TYPE_SYSTEM_ALERT);
        }
        mPresentation.show();
    }
}
```
通过 show() 方法即可展示了。

## Tips
1. 双屏需要``API >= 17``才可使用。
2. 需要兼容只有一块屏幕的设备。所以在展示时，最好加上``mDisplays.length > 1``的判断，避免在单屏设备上展示了副屏要展示的内容。
3. 直接在 Activity onCreate 中初始化进行展示时，会展示不了，需要延迟一点进行展示。
