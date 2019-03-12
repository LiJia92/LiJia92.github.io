---
title: Android 滑动吸顶效果
date: 2019-03-12 14:06:58
tags:
 - 日常开发
---
啥也不说，先上个图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/scroll.gif)
往上滑动的时候，有两点：
1. 透明度渐变显示个人主页标题栏，这个是覆盖在最上层的标题栏
2. 当 Tab 栏滑动到主页下面时，固定不动了，下面的布局继续滑动

<!-- more -->

看下布局：
```
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
                xmlns:app="http://schemas.android.com/apk/res-auto"
                android:layout_width="match_parent"
                android:layout_height="match_parent">

    <android.support.design.widget.CoordinatorLayout
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:app="http://schemas.android.com/apk/res-auto"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:clickable="true"
        android:focusable="true">

        <cn.mucang.android.voyager.lib.framework.widget.NestAppBarLayout
            android:id="@+id/barLayout"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:theme="@style/ThemeOverlay.AppCompat.Dark.ActionBar"
            app:elevation="0dp"
            app:layout_behavior="cn.mucang.android.voyager.lib.framework.widget.SnapAppBarLayoutBehavior">

            <!-- 用户头像、简介 -->
            <include
                layout="@layout/profile_fragment_header"/>

            <!-- Tab 栏 -->
            <include layout="@layout/ucenter_fragment_tab"/>

        </cn.mucang.android.voyager.lib.framework.widget.NestAppBarLayout>

        <android.support.v4.view.ViewPager
            android:id="@+id/viewPager"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_behavior="@string/appbar_scrolling_view_behavior"/>

    </android.support.design.widget.CoordinatorLayout>

    <LinearLayout
        android:id="@+id/titleLl"
        android:layout_width="match_parent"
        android:layout_height="72dp"
        android:background="@color/vyg__transparent"
        android:clickable="true"
        android:gravity="center_vertical"
        android:paddingTop="24dp">

        <ImageView
            android:id="@+id/backIv"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_marginLeft="12dp"
            android:paddingLeft="6dp"
            android:src="@drawable/vyg__icon_back"/>

        <TextView
            android:id="@+id/titleTv"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginLeft="16dp"
            android:layout_marginRight="16dp"
            android:layout_weight="1"
            android:ellipsize="end"
            android:gravity="center"
            android:singleLine="true"
            android:textColor="@color/vyg__transparent"
            android:textSize="18sp"/>

        <Space
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_marginRight="12dp"/>

    </LinearLayout>

</RelativeLayout>
```
profile layout 的根布局有设置：
```
app:layout_scrollFlags="scroll"
```
使其能跟着界面一起滑动，那下面的 Tab 栏需要在滑动到标题栏下面的时候停止滑动，吸附在上面。如果没有标题栏，就不会有这篇文章了。加上标题栏之后，相当于：往上滑动，scroll 的布局滑出界面，然后 Tab 栏滑动到距离顶部一个标题栏的高度后固定不动，如果拿去标题栏，应该是还能看到一部分 scroll 布局的内容的。也就是说**需要固定的布局距离顶部有一段距离**。
起初想着这种需求能否利用 CoordinatorLayout、layout_scrollFlags 来实现，但是找了找，并没有发现类似功能的 Api。后面突发奇想：AppBarLayout 里面包裹了两个布局，**给下面的 Tab 栏布局设置个 marginTop，这样应该就可以距离顶部一段距离了，然后给上面的距离设置个负数的 marginBottom，一正一负正好抵消**，或许有作用？想没用，直接上代码：
```
// 距离顶部的高度为 状态栏的高度 + 标题栏的高度（固定 48dp）
val titleHeight = statusBarHeight + DimenUtils.dp2px(48F)
(profileHeaderRl.layoutParams as AppBarLayout.LayoutParams).bottomMargin = -titleHeight
(userHomeTabScroll.layoutParams as AppBarLayout.LayoutParams).topMargin = titleHeight
```
然后试了一下效果，还真有用！因缺思厅！