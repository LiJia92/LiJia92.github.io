---
title: 记一次动画实践
date: 2019-12-12 11:48:19
tags:
 - Android 进阶
---
废话少说，先上效果图：
<video src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/%E8%A7%86%E9%A2%91%E5%8A%A8%E7%94%BB%20.mp4" width="264" height="460" controls="controls">
Your browser does not support the video tag.
</video>
得如何实现这样的效果呢？

<!-- more -->

首先，将动画拆分几个独立的部分：
1. 「芳草地考场」横轴从左侧移动到中间，纵轴移动到标题栏，字体同时变小；
2. 「切换考场」纵轴移动到标题栏，距离右侧边距变斤，字体同时变小；
3. 「标题栏」背景渐变，图标颜色变化；
4. 「考场横向列表」缩小，左移靠边，同时能吸顶；

现在来考虑具体要怎么做。做开始想到的就是 CoordinatorLayout + CollapsingToolbarLayout 来实现，Google 后发现实现的效果与预期不同，又没有足够的时间去研究，所以抛弃了此方案，打算直接自己写。那么要如何写呢？动画无非是由一系列的状态组合起来的，当滑动 100dp 时，界面这样展示；当滑动 200dp 时，界面那样展示。思路就很明确了：直接监听页面滑动，根据滑动的距离，来展示界面所有的元素。那么剩下的，便是根据滑动距离，来做 4 个部分动画元素的展示了。
最终实现的 xml 布局如下：
```
<android.support.design.widget.CoordinatorLayout
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#F7FBFF">

    <android.support.design.widget.AppBarLayout
        android:id="@+id/appBarLayout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:theme="@style/ThemeOverlay.AppCompat.Dark.ActionBar"
        app:elevation="0dp">

        <ImageView
            android:id="@+id/bgView"
            android:layout_width="match_parent"
            android:layout_height="375dp"
            android:layout_marginBottom="-217dp"
            android:scaleType="fitXY"
            android:src="@drawable/jiakao_ke3_exam_route_unbuy_banner"
            app:layout_scrollFlags="scroll" />

        <LinearLayout
            android:id="@+id/videoLl"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginLeft="12dp"
            android:layout_marginTop="68dp"
            android:layout_marginRight="-12dp"
            android:background="@drawable/bg_white_corner_5dp"
            android:orientation="vertical"
            android:paddingBottom="12dp"
            tools:ignore="MissingPrefix">

            <include
                android:id="@+id/tipView"
                layout="@layout/exam_route_line_top_tip"
                android:layout_width="match_parent"
                android:layout_height="36dp"
                android:layout_marginRight="12dp"
                android:visibility="invisible" />

            <android.support.v7.widget.RecyclerView
                android:id="@+id/placeRv"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="20dp"
                android:clipToPadding="false"
                android:paddingRight="27dp" />

        </LinearLayout>

    </android.support.design.widget.AppBarLayout>

    <android.support.v4.widget.NestedScrollView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:clipToPadding="false"
        android:paddingBottom="80dp"
        android:scrollbars="none"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <include layout="@layout/layout_exam_video_unbuy_bottom" />

    </android.support.v4.widget.NestedScrollView>

    <RelativeLayout
        android:id="@+id/titleRl"
        android:layout_width="match_parent"
        android:layout_height="68dp"
        android:fitsSystemWindows="true"
        app:layout_behavior=".paid_video.behavior.ExamTitleBehavior">

        <ImageView
            android:id="@+id/backIv"
            android:layout_width="50dp"
            android:layout_height="match_parent"
            android:layout_marginLeft="1dp"
            android:layout_marginTop="20dp"
            android:scaleType="centerInside"
            android:src="@drawable/core__title_bar_back_icon"
            android:tint="#FFFFFFFF" />

        <TextView
            android:id="@+id/locationTv"
            android:layout_width="wrap_content"
            android:layout_height="match_parent"
            android:layout_alignParentRight="true"
            android:layout_marginTop="20dp"
            android:layout_marginRight="22dp"
            android:gravity="center_vertical"
            android:includeFontPadding="false"
            android:text="北京"
            android:textColor="#FFFFFFFF"
            android:textSize="14dp" />

        <ImageView
            android:id="@+id/locationIv"
            android:layout_width="wrap_content"
            android:layout_height="match_parent"
            android:layout_marginTop="20dp"
            android:layout_marginRight="5dp"
            android:layout_toLeftOf="@id/locationTv"
            android:src="@drawable/jiakao__ic_exam_route_video_dizhi"
            android:tint="#FFFFFFFF" />

    </RelativeLayout>

    <TextView
        android:id="@+id/titleTv"
        android:layout_width="wrap_content"
        android:layout_height="48dp"
        android:layout_marginLeft="28dp"
        android:layout_marginTop="230dp"
        android:ellipsize="marquee"
        android:focusable="true"
        android:focusableInTouchMode="true"
        android:gravity="center"
        android:marqueeRepeatLimit="marquee_forever"
        android:maxWidth="200dp"
        android:singleLine="true"
        android:textColor="#000"
        android:textSize="21sp"
        android:textStyle="bold"
        app:layout_behavior=".paid_video.behavior.ExamPlaceNameBehavior"
        tools:text="芳草地考场" />

    <TextView
        android:id="@+id/switchPlaceTv"
        android:layout_width="106dp"
        android:layout_height="32dp"
        android:layout_gravity="right"
        android:layout_marginTop="238dp"
        android:layout_marginRight="15dp"
        android:background="@drawable/bg_shape_ff8149_ff2803_r100"
        android:gravity="center"
        android:text="切换考场 >"
        android:textColor="#ffffff"
        android:textSize="16sp"
        app:layout_behavior=".paid_video.behavior.SwitchPlaceBehavior" />

</android.support.design.widget.CoordinatorLayout>
```
下面逐一来解析。
1. bgView 是最上面的背景图，高度 375dp，「考场横向列表」卡片需要覆盖一部分在上面，AppBarLayout 是继承自 LinearLayout 的，所以加了个 **android:layout_marginBottom="-217dp"** 以此来实现覆盖效果。
2. 当滑到最大值时，顶部的 tipView 与 placeRv 需要吸顶，所以二者组合为一个 LinearLayout，同时只给 bgView 设置 **app:layout_scrollFlags="scroll"**，便可实现吸顶。因为整个界面是通栏，所以在动画结束状态，videoLl 需要设置一个 **android:layout_marginTop="68dp"**，使其正好处于标题栏之下。参考[Android 滑动吸顶效果](http://lastwarmth.win/2019/03/12/scroll/)。
3. 「芳草地考场」、「切换考场」、「标题栏」需要在页面最上层展示，所以直接写到 CoordinatorLayout 最外层。
4. 「芳草地考场」、「切换考场」 的 marginTop 都是依据设计稿写死的值，使其正好处于 AppBarLayout 的某个位置，不能轻易改。
5. NestedScrollView include 底部的列表布局，进行嵌套滑动。

ok，现在静态界面写好了，下面就是要根据页面滑动来进行元素展示了。CoordinatorLayout 直接子孩子可以直接使用 Behavior，这样可以将 4 个动画块分开，非直接子孩子则使用监听的方式。
「芳草地考场」Behavior：
```
class ExamPlaceNameBehavior(context: Context, attr: AttributeSet) : CoordinatorLayout.Behavior<TextView>(context, attr) {

    private val dp230 = DimenUtils.dp2px(230F)
    private val startLeftMargin = DimenUtils.dp2px(28F)
    private val topMarginGap = dp230 - DimenUtils.dp2px(20F)

    override fun layoutDependsOn(parent: CoordinatorLayout, child: TextView, dependency: View): Boolean {
        return dependency is AppBarLayout
    }

    override fun onDependentViewChanged(parent: CoordinatorLayout, child: TextView, dependency: View): Boolean {
        if (dependency is AppBarLayout) {
            val offset = abs(dependency.top)
            var progress = offset / MAX_OFFSET
            if (progress > 1) {
                progress = 1F
            }
            if (progress < 0) {
                progress = 0F
            }
            val maxMargin = (DimenUtils.getScreenWidth() - child.width) / 2
            (child.layoutParams as CoordinatorLayout.LayoutParams).leftMargin =
                    (startLeftMargin + (maxMargin - startLeftMargin) * progress).toInt()
            (child.layoutParams as CoordinatorLayout.LayoutParams).topMargin = (dp230 - topMarginGap * progress).toInt()
            child.isSelected = progress == 0F
            child.textSize = 21 - 4 * progress
            child.requestLayout()
            return true
        }
        return false
    }
}
```
「切换考场」Behavior：
```
class SwitchPlaceBehavior(context: Context, attr: AttributeSet) : CoordinatorLayout.Behavior<TextView>(context, attr) {

    private val dp15 = DimenUtils.dp2px(15F)
    private val dp32 = DimenUtils.dp2px(32F)
    private val dp106 = DimenUtils.dp2px(106F)
    private val dp238 = DimenUtils.dp2px(238F)

    private val widthGap = DimenUtils.dp2px(106F - 86F)
    private val heightGap = DimenUtils.dp2px(32F - 28F)
    private val rightMarginGap = DimenUtils.dp2px(15F - 12F)
    private val topMarginGap = DimenUtils.dp2px(238F - 30F)

    override fun layoutDependsOn(parent: CoordinatorLayout, child: TextView, dependency: View): Boolean {
        return dependency is AppBarLayout
    }

    override fun onDependentViewChanged(parent: CoordinatorLayout, child: TextView, dependency: View): Boolean {
        if (dependency is AppBarLayout) {
            val offset = abs(dependency.top)
            var progress = offset / MAX_OFFSET
            if (progress > 1) {
                progress = 1F
            }
            if (progress < 0) {
                progress = 0F
            }
            (child.layoutParams as ViewGroup.MarginLayoutParams).width = (dp106 - widthGap * progress).toInt()
            (child.layoutParams as ViewGroup.MarginLayoutParams).height = (dp32 - heightGap * progress).toInt()
            (child.layoutParams as ViewGroup.MarginLayoutParams).rightMargin = (dp15 - rightMarginGap * progress).toInt()
            (child.layoutParams as ViewGroup.MarginLayoutParams).topMargin = (dp238 - topMarginGap * progress).toInt()
            child.textSize = 16 - 2 * progress
            child.requestLayout()
            return true
        }
        return false
    }
}
```
「标题栏」Behavior：
```
class ExamTitleBehavior(context: Context, attr: AttributeSet) : CoordinatorLayout.Behavior<RelativeLayout>(context, attr) {

    override fun layoutDependsOn(parent: CoordinatorLayout, child: RelativeLayout, dependency: View): Boolean {
        return dependency is AppBarLayout
    }

    override fun onDependentViewChanged(parent: CoordinatorLayout, child: RelativeLayout, dependency: View): Boolean {
        if (dependency is AppBarLayout) {
            val offset = abs(dependency.top)
            var progress = offset / MAX_OFFSET
            if (progress > 1) {
                progress = 1F
            }
            if (progress < 0) {
                progress = 0F
            }
            val activity = ActivityUtils.findActivity(child)
            child.setBackgroundColor(Color.argb((progress * 255).toInt(), 255, 255, 255))
            if (progress > 0.5) {
                StatusBarUtils.setStatusBarTransparentBg(activity, true)
                child.backIv.setColorFilter(Color.parseColor("#333333"))
            } else {
                child.backIv.setColorFilter(Color.parseColor("#ffffff"))
                StatusBarUtils.setStatusBarTransparentBg(activity, false)
            }
            return true
        }
        return false
    }
}
```
「考场横向列表」监听：
```
appBarLayout.addOnOffsetChangedListener(AppBarLayout.OnOffsetChangedListener { _, y ->
    val offset = abs(y)
    var progress = offset / MAX_OFFSET
    if (progress > 1) {
        progress = 1F
    }
    if (progress < 0) {
        progress = 0F
    }
    if ((placeRv.tag as? Float) != progress) {
        if (ExamRouteLineTopTipModel.needClose()) {
            (placeRv.layoutParams as ViewGroup.MarginLayoutParams).topMargin =
                    (DimenUtils.dp2px(20F) - DimenUtils.dp2px(8F) * progress).toInt()
        } else {
            (placeRv.layoutParams as ViewGroup.MarginLayoutParams).topMargin =
                    (DimenUtils.dp2px(56F) - DimenUtils.dp2px(48F) * progress).toInt()
        }
        (videoLl.layoutParams as ViewGroup.MarginLayoutParams).leftMargin =
                (DimenUtils.dp2px(12F) * (1 - progress)).toInt()

        if (progress == 1F) {
            if (tipView.visibility == View.INVISIBLE) {
                tipView.visibility = View.VISIBLE
            }
            videoLl.setBackgroundResource(R.drawable.white)
        } else {
            if (tipView.visibility == View.VISIBLE) {
                tipView.visibility = View.INVISIBLE
            }
            videoLl.setBackgroundResource(R.drawable.bg_white_corner_5dp)
        }
        placeRv.tag = progress
        (placeRv.adapter as? ExamVideoUnbuyAdapter)?.setProgress(progress)
    }
})
```
tipView 通过 **ExamRouteLineTopTipModel.needClose()** 判断是否需要展示，两种状态的 margin 不一致，需要区分开。另外，**CoordinatorLayout 有子孩子变化，都会回调到 OnOffsetChangedListener**，所以需要保存 progress，避免一直调用方法。
因为需求太具体，文章写起来不宜碎碎念，就只帖了代码，记录一下，以后碰到类似需求，有思路去做。