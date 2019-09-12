---
title: Android屏幕横竖屏切换小记
date: 2016-07-01 17:22:25
tags:
 - 日常开发
---

最后做的项目中，有用到横竖屏切换，碰到个小坑，在这里记录一下。

背景：用户在进入直播页面（姑且称之为RoomActivity），进入页面的时候会传入横竖屏的参数，在RoomActivity中拿到参数通过``setRequestedOrientation``来进行设置横竖屏。

众所周知，android在横竖屏切换的时候，会销毁当前的页面，然后重建，导致的便是activity的生命周期会执行2次，那么写在其中的方法也会执行2次。在onStart()中我写了进入直播间的方法(enterRoom())，在onStop()中写了离开直播间的方法(exitRoom())，那么在切换屏幕的时候，会调用2次enterRoom，1次exitRoom，因为都是网络请求，不能保证后请求的一定后完成，那么就有可能导致2次enterRoom执行完成之后，exitRoom才执行完成，即用户发了2次进入直播间的请求，1次离开直播间的请求，离开的请求是最后完成，导致的最终结果便是用户不在直播间了，但他依然能看到画面，只不过看不到弹幕相关的一些东西了。

这显然是个问题，需要解决。

<!-- more -->

方案一：
起初，我的想法是在切换的时候保存状态，在新建的时候取出状态，根据状态来判断要不要执行第二次方法，这种想法应该是可行的，但是我找不到保存状态的方法。网上查的是``onSaveInstanceState()``方法可用来保存，但是它只会在activity意外关闭的时候才会调用，何为意外就不得知了，有点不可控，所以我便放弃了这种做法。


方案二：
设置activty参数，避免销毁当前页面重建。在设置``configChanges``参数后，在切换横竖屏时候便不会重建页面了，那么当前页面或得到的业务数据也自然就还在，只是要强调一点：切换横竖屏后，``所有的View需要重新进行初始化``。
在``AndroidManifest.xml``中给activity设置如下``configChanges``参数：
```
<activity
    android:name=".RoomActivity"
    android:screenOrientation="portrait"
    android:keepScreenOn="true"
    android:configChanges="orientation|screenSize"
    android:windowSoftInputMode="adjustNothing"/>
```
然后在activity的``onConfigurationChanged``中进行view的初始化。
```
@Override
public void onConfigurationChanged(Configuration newConfig) {
    setContentView(R.layout.activity_room);
    initViewHolder();
    initBarrageView();
    super.onConfigurationChanged(newConfig);
}
```
之所以会重新调用``setContentView(R.layout.activity_room);``是因为我的RoomActivity有横、竖两套布局，需要重新设置一下（布局名称名字一样，横屏的布局文件写在land文件下即可）。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/screent1.png)

如此便解决了横竖屏切换导致的问题了，特此小记一下。

补充：
Android横屏切换可能有2种：90度和270度。这两种都是横屏。现在做直播产品，需要设置摄像头的角度，所以不仅仅需要知道横竖屏，也需要知道横屏是90度的那种还是270度的那种。如果仅仅依靠重力感应，部分安卓手机会不支持180度转屏，以致于从90度转到270度或者从270度转到90度时，系统认为界面没有发生变化，所以没有合适的机会来设置摄像头的角度。采用DisplayManager.DisplayListener可以达到目的，但是必须是Android 17以上，这就需要依据项目情况来做些取舍了。
```
private void initDisplayListener() {
	/**
	 * 部分安卓手机不支持180度转屏，以致于从90度转到270度或者从270度转到90度时，系统认为界面没有发生变化
	 * Android 17及以上可以通过DisplayManager.DisplayListener来监听手机旋转，以解决这个问题
	 */
	if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
		mDisplayListener = new DisplayManager.DisplayListener() {
			@Override
			public void onDisplayAdded(int displayId) {
			}

			@Override
			public void onDisplayChanged(int displayId) {
				changeRotation();
			}

			@Override
			public void onDisplayRemoved(int displayId) {
			}
		};
		DisplayManager displayManager = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
		displayManager.registerDisplayListener(mDisplayListener, null);
	}
}

private void changeRotation() {
	switch (getWindowManager().getDefaultDisplay().getRotation()) {
		case Surface.ROTATION_0:
			// 0度
			break;
		case Surface.ROTATION_90:
			// 90度
			break;
		case Surface.ROTATION_180:
			// 180度
			break;
		case Surface.ROTATION_270:
			// 270度
			break;
	}
}
```

参考：
1. [Activity 横竖屏切换](http://www.cnblogs.com/yishujun/p/5395266.html)
2. [Android 横竖屏切换小结](http://www.cnblogs.com/franksunny/p/3714442.html)
