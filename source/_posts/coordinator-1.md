---
title: CoordinatorLayout 滑动再探
date: 2019-04-16 14:11:55
tags:
 - 日常开发
---
嗯，还是之前的路线详情的页面，新增了需求，导致界面结构又发生变化了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/coordinator.png)
添加了一个途经点的列表，与打点列表并列，可以和横向滑动切换 Tab。
之前写过一篇文章[CoordinatorLayout + RecyclerView 处理滑动](http://lastwarmth.win/2018/12/12/recyclerview-scroll/)说的也是这个页面，这里再贴一下当前的 xml 布局：

<!-- more -->

```
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
                xmlns:app="http://schemas.android.com/apk/res-auto"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:orientation="vertical">

    <include layout="@layout/vyg__route_detail_map_action"/>

    <cn.mucang.android.voyager.lib.business.route.detail.fragment.MyCoordinatorLayout
        android:id="@+id/unFullScreenRoot"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_marginBottom="50dp">

        <android.support.design.widget.AppBarLayout
            android:id="@+id/barLayout"
            android:layout_width="match_parent"
            android:layout_height="330dp"
            android:background="@color/vyg__transparent"
            app:elevation="0dp">

            <View
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                app:layout_scrollFlags="scroll"/>

        </android.support.design.widget.AppBarLayout>

        <cn.mucang.android.ui.widget.xrecyclerview.SafeRecyclerView
            android:id="@+id/detailRv"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_behavior="@string/appbar_scrolling_view_behavior"/>

    </cn.mucang.android.voyager.lib.business.route.detail.fragment.MyCoordinatorLayout>

    <include layout="@layout/vyg__route_detail_fullscreen"/>

    <include layout="@layout/vyg__route_detail_title"/>

    <include layout="@layout/vyg__route_detail_bottom"/>

</RelativeLayout>
```
基于这个布局，为了实现新增需求，改成了如下：
```
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
                xmlns:app="http://schemas.android.com/apk/res-auto"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:orientation="vertical">

    <include layout="@layout/vyg__route_detail_map_action"/>

    <cn.mucang.android.voyager.lib.business.route.detail.fragment.MyCoordinatorLayout
        android:id="@+id/unFullScreenRoot"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_marginBottom="50dp">

        <android.support.design.widget.AppBarLayout
            android:id="@+id/barLayout"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:background="@color/vyg__transparent"
            app:elevation="0dp">

            <View
                android:layout_width="match_parent"
                android:layout_height="330dp"
                app:layout_scrollFlags="scroll"/>

            <android.support.v4.widget.NestedScrollView
                android:id="@+id/headerContainer"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                app:layout_scrollFlags="scroll"/>

            <cn.mucang.android.voyager.lib.framework.tab.CustomTabLayout
                android:id="@+id/tabLayout"
                android:layout_width="match_parent"
                android:layout_height="65dp"/>

        </android.support.design.widget.AppBarLayout>

        <cn.mucang.android.voyager.lib.framework.widget.SafeViewPager
            android:id="@+id/viewPager"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_behavior="@string/appbar_scrolling_view_behavior"/>

    </cn.mucang.android.voyager.lib.business.route.detail.fragment.MyCoordinatorLayout>

    <include layout="@layout/vyg__route_detail_fullscreen"/>

    <include layout="@layout/vyg__route_detail_title"/>

    <include layout="@layout/vyg__route_detail_bottom"/>

</RelativeLayout>
```
将旧布局中的路线详情 Header 单独抽出个布局，添加到 headerContainer 中。这里使用 NestedScrollView 进行包裹是因为 MyCoordinatorLayout 拦截了 onTouchEvent 始终返回 false，MyCoordinatorLayout 就只能处理自身实现了 NestedScrollingChild2 的 View 了，tabLayout 则是 Tab 栏。
嗯，这样功能是能实现了，但是在这界面进行滑动的时候，总会感觉不流畅，而且在快速滑动的时候，还容易反弹。这是很好理解的，因为 MyCoordinatorLayout 重写 onTouchEvent 并且始终返回 false，可能就会导致事件的传递有问题，造成这种滑动不顺的感觉。
那如果不使用 MyCoordinatorLayout，地图上按钮的点击事件如何传递下去呢？这就得想另外一个法子了。**CoordinatorLayout 本身是一个增强型的 FrameLayout，增加了嵌套滑动的处理**。所以另一种方式的布局就出来了：
```
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
                xmlns:app="http://schemas.android.com/apk/res-auto"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:orientation="vertical">

    <android.support.design.widget.CoordinatorLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_above="@+id/bottomActionLl">

        <include layout="@layout/vyg__route_detail_map_action"/>

        <cn.mucang.android.voyager.lib.framework.widget.NestAppBarLayout
            android:id="@+id/barLayout"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:background="@color/vyg__transparent"
            app:elevation="0dp"
            app:layout_behavior="cn.mucang.android.voyager.lib.framework.widget.SnapAppBarLayoutBehavior">

            <View
                android:id="@+id/mapFakeView"
                android:layout_width="match_parent"
                android:layout_height="330dp"
                app:layout_scrollFlags="scroll"/>

            <LinearLayout
                android:id="@+id/headerContainer"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:clickable="true"
                android:orientation="vertical"
                app:layout_scrollFlags="scroll"/>

            <cn.mucang.android.voyager.lib.framework.tab.CustomTabLayout
                android:id="@+id/tabLayout"
                android:layout_width="match_parent"
                android:layout_height="65dp"/>

        </cn.mucang.android.voyager.lib.framework.widget.NestAppBarLayout>

        <cn.mucang.android.voyager.lib.framework.widget.SafeViewPager
            android:id="@+id/viewPager"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_behavior="@string/appbar_scrolling_view_behavior"/>

    </android.support.design.widget.CoordinatorLayout>

    <include layout="@layout/vyg__route_detail_fullscreen"/>

    <include layout="@layout/vyg__route_detail_title"/>

    <include layout="@layout/vyg__route_detail_bottom"/>

</RelativeLayout>
```
**将地图布局直接被 CoordinatorLayout 包裹，弃用 MyCoordinatorLayout。当页面处于非全屏时，设置 mapFakeView 的 isClickable 为 false。那么 AppBarLayout 便不会消费地图上按钮的点击事件，事件就会传递到地图那一层进行处理了。**
在使用 CoordinatorLayout + AppBarLayout 时，会有一些滑动抖动的问题，和 AppBarLayout 无法拖动的问题，这些在网上都有案例。所以会有自定义的 AppBarLayout、Behavior：
```
/**
 * 解决 AppBarLayout 滑动抖动问题
 */
public class SnapAppBarLayoutBehavior extends AppBarLayout.Behavior {
    private boolean isNestedFlinging = true;
    private boolean isFlinging;
    private boolean shouldBlockNestedScroll;

    public SnapAppBarLayoutBehavior() {
    }

    public SnapAppBarLayoutBehavior(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public boolean onNestedPreFling(@NonNull CoordinatorLayout coordinatorLayout,
            @NonNull AppBarLayout child, @NonNull View target, float velocityX, float velocityY) {
        return false;
    }

    @Override
    public void onStopNestedScroll(CoordinatorLayout coordinatorLayout, AppBarLayout abl,
            View target, int type) {
        if (!isNestedFlinging) {
            super.onStopNestedScroll(coordinatorLayout, abl, target, ViewCompat.TYPE_NON_TOUCH);
        } else {
            if (type == ViewCompat.TYPE_TOUCH) {
                super.onStopNestedScroll(coordinatorLayout, abl, target, ViewCompat.TYPE_NON_TOUCH);
            } else {
                super.onStopNestedScroll(coordinatorLayout, abl, target, ViewCompat.TYPE_TOUCH);
            }
        }
        isFlinging = false;
        shouldBlockNestedScroll = false;

    }

    @Override
    public void onNestedPreScroll(CoordinatorLayout coordinatorLayout, AppBarLayout child,
            View target, int dx, int dy, int[] consumed, int type) {
        if (type == ViewCompat.TYPE_TOUCH) {
            isNestedFlinging = false;
        }
        if (type == ViewCompat.TYPE_NON_TOUCH) {
            isFlinging = true;
        }
        if (!shouldBlockNestedScroll) {
            super.onNestedPreScroll(coordinatorLayout, child, target, dx, dy, consumed, type);
        }
    }

    @Override
    public void onNestedScroll(CoordinatorLayout coordinatorLayout, AppBarLayout child, View target,
            int dxConsumed, int dyConsumed, int dxUnconsumed, int dyUnconsumed, int type) {
        if (!shouldBlockNestedScroll) {
            super.onNestedScroll(coordinatorLayout, child, target, dxConsumed, dyConsumed, dxUnconsumed, dyUnconsumed,
                    type);
        }
    }

    @Override
    public boolean onNestedFling(@NonNull CoordinatorLayout coordinatorLayout,
            @NonNull AppBarLayout child, @NonNull View target, float velocityX, float velocityY,
            boolean consumed) {
        isNestedFlinging = true;
        return super.onNestedFling(coordinatorLayout, child, target, velocityX, velocityY, consumed);
    }


    @Override
    public boolean onInterceptTouchEvent(CoordinatorLayout parent, AppBarLayout child,
            MotionEvent ev) {
        shouldBlockNestedScroll = false;
        if (isFlinging) {
            shouldBlockNestedScroll = true;
        }

        if (ev.getAction() == MotionEvent.ACTION_DOWN) {
            Object scroller = getSuperSuperField(this, "mScroller");
            if (scroller != null && scroller instanceof OverScroller) {
                OverScroller overScroller = (OverScroller) scroller;
                overScroller.abortAnimation();
            }
        }

        return super.onInterceptTouchEvent(parent, child, ev);
    }

    private Object getSuperSuperField(Object paramClass, String paramString) {
        Field field = null;
        Object object = null;
        try {
            field = paramClass.getClass().getSuperclass().getSuperclass().getDeclaredField(paramString);
            field.setAccessible(true);
            object = field.get(paramClass);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return object;
    }
}

/**
 * 解决 AppBarLayout 无法滚动的问题
 */ 
class NestAppBarLayout : AppBarLayout {

    constructor(context: Context) : super(context)

    constructor(context: Context, attrs: AttributeSet) : super(context, attrs)

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        compactAppbarNestScroll()
    }

    private fun compactAppbarNestScroll() {
        try {
            ((this.layoutParams as? CoordinatorLayout.LayoutParams)?.behavior as? AppBarLayout.Behavior)
                    ?.setDragCallback(object : AppBarLayout.Behavior.DragCallback() {
                        override fun canDrag(appBarLayout: AppBarLayout): Boolean {
                            return true
                        }
                    })
        } catch (e: Exception) {
            LogUtils.d("NestAppBarLayout", e.message)
        }
    }
}
```
但是仍然有一个问题：当点击地图全屏按钮时，隐藏 barLayout 与 viewPager，只剩下 CoordinatorLayout 包裹一层地图。这个时候滑动地图下面可以滑动流畅，但是滑动上面被 AppBarLayout 盖住的一部分（即使不可见）则不流畅。然后监听 AppBarLayout 的 addOnOffsetChangedListener 方法会发现有回调。也就是说，**即使 AppBarLayout 即使是 GONE，但是它仍然在消费触摸事件**，这很令人费解。但是转念一想，好像也不无道理。CoordinatorLayout 是结合 Behavior 来进行处理嵌套滑动的，说明 Behavior 是具有事件处理能力的，在 Behavior 内没有对 View 是否可见进行控制则显得没那么重要了。这里看到 Behavior 中有一个是否可拖动的 Callback：
```
/**
 * Callback to allow control over any {@link AppBarLayout} dragging.
 */
public static abstract class DragCallback {
    /**
     * Allows control over whether the given {@link AppBarLayout} can be dragged or not.
     *
     * <p>Dragging is defined as a direct touch on the AppBarLayout with movement. This
     * call does not affect any nested scrolling.</p>
     *
     * @return true if we are in a position to scroll the AppBarLayout via a drag, false
     *         if not.
     */
    public abstract boolean canDrag(@NonNull AppBarLayout appBarLayout);
}
```
想来 NestAppBarLayout 里设置 canDrag 一直返回 true 是为了解决  AppBarLayout 无法拖动的问题了，所以要解决我现在的问题就很简单了：
```
private fun compactAppbarNestScroll() {
    try {
        ((this.layoutParams as? CoordinatorLayout.LayoutParams)?.behavior as? AppBarLayout.Behavior)
                ?.setDragCallback(object : AppBarLayout.Behavior.DragCallback() {
                    override fun canDrag(appBarLayout: AppBarLayout): Boolean {
                        return appBarLayout.visibility == View.VISIBLE
                    }
                })
    } catch (e: Exception) {
        LogUtils.d("NestAppBarLayout", e.message)
    }
}
```
当 AppBarLayout 不可见时，当然是不能拖动的了。至此，整个页面的滑动又如丝般顺滑了~