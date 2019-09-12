---
title: 使用Android新特性：Material Design
date: 2016-02-17 16:34:11
tags:
 - Material Design
---

## 前言
大年初十，相信许多人都已经过完年，在上班的路上或者已经上班了。在这里跟大家说一声：新年好~

新年新气象，今天打算写一篇关于Android新特性：``Material Design``的文章。Material Design作为android 5.0的重头戏，说是新特性，但是其实已经算不上“新”了，毕竟android 6.0都出来了呢。

情人节刚过，我便以“秀恩爱”为主题，做一个新特性的使用例子。废话少说，下面开撸。

## 添加依赖
使用新特性需要添加依赖：
```
compile 'com.android.support:design:23.0.1'
compile 'com.android.support:cardview-v7:23.1.0'
compile 'com.android.support:recyclerview-v7:23.1.0'
```
<!--more-->

## 新组件介绍

### AppBarlayout
AppBarLayout是继承LinearLayout实现的一个ViewGroup容器组件，它是为了Material Design设计的App Bar,支持手势滑动操作。默认的AppBarLayout是垂直方向的，它的作用是把AppBarLayout包裹的内容都作为AppBar。

常用效果：将Toolbar 和Tablayout的组合部分共同构成 AppBar的效果。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design1.png)

### CoordinatorLayout
CoordinatorLayout是一个增强型的FrameLayout。它的作用有两个：

 1. 作为一个布局的根布局
 2. 最后一个为子视图之间相互协调手势效果的一个协调布局

我们可以用过上滑将顶部的ToolBar移出屏幕，下滑时再显示。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design2.png)

### NavigationView
用于侧滑菜单中的menu布局。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design3.png)

### FloatingActionButton
悬浮按钮，给人一种Z轴的空间感。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design4.png)

### SnackBar
当Snackbar在显示的时候，往往出现在屏幕的底部。为了给Snackbar留出空间，浮动操作按钮需要向上移动。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design5.png)

### CardView
CardView继承自FrameLayout类，可以在一个卡片布局中一致性的显示内容，卡片可以包含圆角和阴影。CardView是一个Layout，可以布局其他View。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design6.png)

### RecyclerView
RecyclerView用于展示数据集，与ListView、GridView类似，但是它更灵活。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design7.png)

### SwipeRefreshLayout
Google官方推出的下拉刷新控件，使用非常简便。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design8.png)

## 布局文件
首先是activity_main布局文件：
```
<?xml version="1.0" encoding="utf-8"?>
<android.support.v4.widget.DrawerLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/drawer_layout"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <include layout="@layout/content_main" />

    <android.support.design.widget.NavigationView
        android:id="@+id/navigation"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_gravity="left" />


</android.support.v4.widget.DrawerLayout>
```
看到content_main.xml：
```
<?xml version="1.0" encoding="utf-8"?>
<android.support.design.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:fitsSystemWindows="true">

    <android.support.design.widget.AppBarLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:theme="@style/AppTheme.AppBarOverlay">

        <android.support.v7.widget.Toolbar
            android:id="@+id/toolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            android:background="?attr/colorPrimary"
            app:layout_scrollFlags="scroll|enterAlways"
            app:popupTheme="@style/ThemeOverlay.AppCompat.Light"
            app:theme="@style/ThemeOverlay.AppCompat.ActionBar"
            app:title="" />

        <android.support.design.widget.TabLayout
            android:id="@+id/tab_layout"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            app:tabGravity="fill"
            app:tabIndicatorColor="#ffffff" />

    </android.support.design.widget.AppBarLayout>

    <android.support.v4.view.ViewPager
        android:id="@+id/view_pager"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        app:layout_behavior="@string/appbar_scrolling_view_behavior" />

    <android.support.design.widget.FloatingActionButton
        android:id="@+id/floating_button"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom|end"
        android:layout_margin="@dimen/fab_margin"
        android:src="@android:drawable/ic_dialog_email" />

</android.support.design.widget.CoordinatorLayout>

```
ViewPager对应的fragment布局：
```
<?xml version="1.0" encoding="utf-8"?>
<android.support.v4.widget.SwipeRefreshLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/swipe_refresh"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:layout_behavior="@string/appbar_scrolling_view_behavior">

    <android.support.v7.widget.RecyclerView
        android:id="@+id/recycler_view"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content" />


</android.support.v4.widget.SwipeRefreshLayout>

```
RecyclerView对应的Adapter布局：
```
<?xml version="1.0" encoding="utf-8"?>
<android.support.v7.widget.CardView xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_gravity="center"
    app:cardCornerRadius="4dp"
    app:cardElevation="5dp"
    app:cardMaxElevation="10dp"
    app:cardPreventCornerOverlap="true"
    app:cardUseCompatPadding="true">

    <TextView
        android:id="@+id/card_text"
        android:layout_width="match_parent"
        android:layout_height="200dp"
        android:layout_gravity="center"
        android:gravity="center"
        android:text="1111"
        android:textColor="@android:color/black"
        android:textSize="30sp" />

</android.support.v7.widget.CardView>
```
抽屉对应的HeaderView布局：
```
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="220dp"
    android:background="@drawable/ic_user_background"
    android:gravity="center"
    android:orientation="vertical">

    <ImageView
        android:id="@+id/id_header_face"
        android:layout_width="120dp"
        android:layout_height="120dp"
        android:scaleType="fitXY"
        android:src="@drawable/user" />

    <TextView
        android:id="@+id/id_header_authorname"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@string/header_author_name"
        android:textColor="@android:color/black"
        android:textSize="16sp" />

    <TextView
        android:id="@+id/id_header_url"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@string/header_author_url"
        android:textColor="@android:color/black"
        android:textSize="18sp" />


</LinearLayout>
```

## 相关说明 ##

1. 使用NavigationView时，通过``layout_gravity="left"``属性控制抽屉从左边打开。
抽屉内容填充对应于xml属性app:headerLayout与app:menu。
```
// 跳转到Menu的Toggle
ActionBarDrawerToggle mActionBarDrawerToggle = new ActionBarDrawerToggle(this, drawerLayout, toolbar, R.string.drawer_open, R.string.drawer_open);
mActionBarDrawerToggle.syncState();
drawerLayout.setDrawerListener(mActionBarDrawerToggle);

// 抽屉菜单填充内容
navigationView.inflateHeaderView(R.layout.header_navigation);
navigationView.inflateMenu(R.menu.menu_navigation);
```

2. TabLayout与ViewPager关联。
```
tabLayout.setTabMode(TabLayout.MODE_SCROLLABLE);
tabLayout.setupWithViewPager(viewPager);
tabLayout.setTabsFromPagerAdapter(myViewPagerAdapter);
```

3. SwipeRefreshLayout刷新设置颜色及刷新事件。
```
swipeRefreshLayout = (SwipeRefreshLayout) view.findViewById(R.id.swipe_refresh);
swipeRefreshLayout.setColorSchemeResources(R.color.colorPrimary);
swipeRefreshLayout.setOnRefreshListener(this);
```

4. RecyclerView设置布局及Adapter。
```
RecyclerView recyclerView = (RecyclerView) view.findViewById(R.id.recycler_view);
adapter = new MyRecyclerViewAdapter(getActivity());
RecyclerView.LayoutManager layoutManager = new LinearLayoutManager(getActivity(), LinearLayoutManager.VERTICAL, false);
recyclerView.setAdapter(adapter);
recyclerView.setLayoutManager(layoutManager);
```
5. CoordinatorLayout可滑动的条件。

 - CoordinatorLayout必须作为整个布局的父布局容器。
 - 给需要滑动的组件设置 app:layout_scrollFlags=”scroll|enterAlways” 属性。 (ToolBar)
 - 给你的可滑动的组件，也就是RecyclerView、ViewPager或者 NestedScrollView 设置属性：``app:layout_behavior=@string/appbar_scrolling_view_behavior``

6. 设置的layout_scrollFlags有如下几种选项：

 - scroll: 所有想滚动出屏幕的view都需要设置这个flag- 没有设置这个flag的view将被固定在屏幕顶部。
 - enterAlways: 这个flag让任意向下的滚动都会导致该view变为可见，启用快速“返回模式”。
 - enterAlwaysCollapsed: 当你的视图已经设置minHeight属性又使用此标志时，你的视图只能已最小高度进入，只有当滚动视图到达顶部时才扩大到完整高度。
 - exitUntilCollapsed: 滚动退出屏幕，最后折叠在顶端。

在我的布局中给Toolbar设置了app:layout_scrollFlags属性，因此，Toolbar是可以滚动出屏幕，且向下滚动有可以出现。

## 最后
最终效果：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/02/material-design9.png)
源码地址：https://github.com/LiJia92/showlove

Tips：本文只对这些新的特性做了最基本的说明及非常简单的使用，至于更加复杂的使用及效果，则需要在使用过程中慢慢发现、慢慢学习了。
