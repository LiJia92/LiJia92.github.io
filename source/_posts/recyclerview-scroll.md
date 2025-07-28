---
title: CoordinatorLayout + RecyclerView 处理滑动
date: 2018-12-12 10:25:19
tags:
 - Android 进阶
---
先看一下设计稿：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/%E6%88%AA%E5%9B%BE.png)
最底层是个地图，再上面有一些按钮，最上层是路线信息 UI，页面可以滑动，滑动时地图和按钮不动，自然而然想到的 RecyclerView 来实现。
早些时候只有 2 个按钮，使用了一种很笨拙的方式，与之前写过的一篇文章类似：[一个关于Android滑动“因缺斯厅”的想法](http://lastwarmth.win/2016/04/22/android-scroll/)。
这种方式，相当于有四层：地图->按钮->RecyclerView->与按钮相同位置的View，但是是透明的。界面布局就像这样：

<!-- more -->

```
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
                xmlns:tools="http://schemas.android.com/tools"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:background="@color/vyg__background_gray"
                android:orientation="vertical">

    <!-- 底层地图 -->
    <include
        layout="@layout/vyg__base_map_view"
        android:layout_width="match_parent"
        android:layout_height="@dimen/vyg__route_map_height"/>

    <!-- 地图上的按钮 -->
    <LinearLayout
        android:id="@+id/mapLayerLl"
        style="@style/vyg__map_action"
        android:layout_alignParentRight="true"
        android:layout_marginRight="12dp"
        android:layout_marginTop="84dp"
        android:gravity="center"
        android:orientation="vertical">

        <ImageView
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:scaleType="centerInside"
            android:src="@drawable/vyg__map_icon_layer"/>

        <TextView
            android:id="@+id/mapLevelTv"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="14级"
            android:textColor="@color/vyg__font_333"
            android:textSize="10sp"/>

    </LinearLayout>

    <ImageView
        android:id="@+id/fullIv"
        style="@style/vyg__map_action"
        android:layout_alignParentRight="true"
        android:layout_marginRight="12dp"
        android:layout_marginTop="184dp"
        android:scaleType="centerInside"
        android:src="@drawable/vyg__map_icon_fullscreen"/>

    <LinearLayout
        android:id="@+id/fullTrendLl"
        style="@style/vyg__map_action"
        android:layout_alignParentRight="true"
        android:layout_marginRight="12dp"
        android:layout_marginTop="134dp"
        android:gravity="center"
        android:orientation="vertical">

        <ImageView
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:scaleType="centerInside"
            android:src="@drawable/vyg__route_icon_trend"/>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="趋势图"
            android:textColor="@color/vyg__font_333"
            android:textSize="10sp"/>

    </LinearLayout>

    <!-- 列表 RecyclerView -->
    <android.support.v7.widget.RecyclerView
        android:id="@+id/detailRv"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_marginBottom="50dp"
        android:clipToPadding="false"/>

    <!-- 最上层的透明点击 View -->
    <ImageView
        android:id="@+id/exitFullIv"
        style="@style/vyg__map_action"
        android:layout_alignParentRight="true"
        android:layout_marginRight="12dp"
        android:layout_marginTop="140dp"
        android:scaleType="centerInside"
        android:src="@drawable/vyg__map_icon_fullscreen_exit"
        android:visibility="gone"/>

    <View
        android:id="@+id/trendView"
        android:layout_width="44dp"
        android:layout_height="44dp"
        android:layout_alignParentRight="true"
        android:layout_marginRight="12dp"
        android:layout_marginTop="134dp"/>

    <View
        android:id="@+id/mapLayerView"
        android:layout_width="44dp"
        android:layout_height="44dp"
        android:layout_alignParentRight="true"
        android:layout_marginRight="12dp"
        android:layout_marginTop="84dp"/>

</RelativeLayout>
```
通过给透明 View 设置点击事件，来实现点击按钮的效果。但是要考虑一点：在界面滑动的时候，RecyclerView 会覆盖到地图上的按钮，这个时候最顶层的透明 View 点击区域应该是要变化的。所以早些时候有了这样的代码：
```
trendView.setOnTouchListener { _, event ->

    if (event.action == MotionEvent.ACTION_UP) {
        val y = event.y
        // 102 = 280（地图高度） - 134（trendView.marginTop）- 44（trendView.height）
        if (trendView.height + DimenUtils.dp2px(102F) - y > offsetY) {
            switchTrend()
        }
    }
    true
}

mapLayerView.setOnTouchListener { _, event ->

    if (event.action == MotionEvent.ACTION_UP) {
        val y = event.y
        // 152 = 280（地图高度） - 84（mapLayerView.marginTop）- 44（mapLayerView.height）
        if (mapLayerView.height + DimenUtils.dp2px(152F) - y > offsetY) {
            showLayerSwitchDialog()
        }
    }
    true
}
```
一堆 XML 中固定宽高的 dp，十分影响阅读，而且后续每加一个按钮都得这样：先地图上面覆盖一个按钮，然后在 RecyclerView 上层再覆盖一个相同位置透明的 View，并通过 setOnTouchListener 计算滑动位置来实现点击事件，十分繁杂。
这次新版需求出来，直接多了3 4个按钮，再这样做我可能会死，只能思考另外的实现方案了。

其实核心思路是，在 RecyclerView 上面添加一个透明的 View，这样便能看到底层的地图和按钮了，但是又不能影响地图上按钮的点击。不幸的是 RecyclerView 会吃掉所有的点击事件，导致事件无法传达至底层的按钮，所以才会有了上面的那种思路。重写 RecyclerView 的 onTouchEvent 返回 false，本身不处理事件，这样底层按钮可以点击了，但是滑动有问题，也不可取。看网上说也有 NestedScrollView + RecyclerView 的，但是这样的话 RecyclerView 的复用机制貌似就没有了，因为它需要测量全部子 View。最后想到的便是 CoordinatorLayout + RecyclerView 了，尝试了一波，可以实现需求！
看下调整后的 XML：
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

        <android.support.v7.widget.RecyclerView
            android:id="@+id/detailRv"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_behavior="@string/appbar_scrolling_view_behavior"/>

    </cn.mucang.android.voyager.lib.business.route.detail.fragment.MyCoordinatorLayout>

</RelativeLayout>
```
地图和底层按钮在 vyg__route_detail_map_action 中，然后上层使用 CoordinatorLayout + RecyclerView。透明的 AppBarLayout 在 RecyclerView 上面，使其能看到底层的地图，当滑动时，CoordinatorLayout 会先消费滑动，将 AppBarLayout 往上滑，直至 AppBarLayout 完全消失，RecyclerView 覆盖整个页面。当 AppBarLayout 尚未完全消失时，点击 AppBarLayout，因为其本身没有处理点击事件，所以事件最后会返回到 CoordinatorLayout 的 onTouchEvent，如果不复写，它会返回 true，直接消费点击事件，但是我需要的是不消费点击事件，这样事件就会传递到底层的按钮去响应。所以重写了一下 CoordinatorLayout：
```
class MyCoordinatorLayout(context: Context, attributeSet: AttributeSet) : CoordinatorLayout(context, attributeSet) {

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(ev: MotionEvent?): Boolean {
        super.onTouchEvent(ev)
        return false
    }
}
```
直接强制返回 false，目前没有发现不良影响。
至此，方案完美落幕。地图上的按钮你想加多少就加多少，做不好算我输！