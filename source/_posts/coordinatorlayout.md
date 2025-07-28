---
title: CoordinatorLayout之Behavior认识
date: 2017-03-31 19:09:45
tags:
 - Android 进阶
---

## 背景
项目开发中，我们经常有滑动控件固定某一个部分在顶部的需求，效果类似这样：

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/04/01/ListviewHack-listview-1.gif)

在``Material Design``出来之前，我们可能会有方案一：
>给 ListView C 添加一个HeadView（包含A、B），然后另外准备一个外部的B在屏幕顶部，一开始不可见。ListView当前滚动高度超过A的高度时，显示外部的B；滚动高度小于A时隐藏外部的B。

<!-- more -->

正如我此时的项目中的一样，但是项目中的B是一个搜索框，类似这样：

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/04/01/%E9%80%89%E5%8C%BA_031.png)

可以看到 B 的构成是相对复杂的，B 相关的事件操作也会写 2 遍，很显然的会导致整个代码结构非常臃肿，所以需要寻找方案二。

## 嵌套滚动机制
在我早些的一篇文章[使用Android新特性：Material Design](http://lastwarmth.win/2016/02/17/material-design/)中有说起一个控件：``CoordinatorLayout``。它是一个增强型的 FrameLayout。它的作用有两个：
1. 作为一个布局的根布局
2. 最后一个为子视图之间相互协调手势效果的一个协调布局

为子视图协调手势效果主要是基于 Android 的嵌套滚动机制。
> 所谓嵌套滚动其实就是界面布局中包含一个可滚动的列表和一个不可滚动的View，这样在滚动列表时，首先将不可滚动View移出屏幕或移进屏幕，待不可滚动View固定时，才会继续滚动滚动列表的内容。

关于嵌套滚动机制更详细的一些说明有很多文章都说的不错，稍后会在参考中放出链接。

## 实例
我们知道可以通过``Behavior``来实现各种嵌套滑动效果。最为典型的就是``AppBarLayout中的ScrollingViewBehavior``。很经典的示例代码：
```
<?xml version="1.0" encoding="utf-8"?>

<android.support.design.widget.CoordinatorLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@android:color/background_light"
    android:fitsSystemWindows="true"
    >

    <android.support.design.widget.AppBarLayout
        android:id="@+id/main.appbar"
        android:layout_width="match_parent"
        android:layout_height="300dp"
        android:theme="@style/ThemeOverlay.AppCompat.Dark.ActionBar"
        android:fitsSystemWindows="true"
        >

        <android.support.design.widget.CollapsingToolbarLayout
            android:id="@+id/main.collapsing"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_scrollFlags="scroll|exitUntilCollapsed"
            android:fitsSystemWindows="true"
            app:contentScrim="?attr/colorPrimary"
            app:expandedTitleMarginStart="48dp"
            app:expandedTitleMarginEnd="64dp"
            >

            <ImageView
                android:id="@+id/main.backdrop"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:scaleType="centerCrop"
                android:fitsSystemWindows="true"
                android:src="@drawable/material_flat"
                app:layout_collapseMode="parallax"
                />

            <android.support.v7.widget.Toolbar
                android:id="@+id/main.toolbar"
                android:layout_width="match_parent"
                android:layout_height="?attr/actionBarSize"
                app:popupTheme="@style/ThemeOverlay.AppCompat.Light"
                app:layout_collapseMode="pin"
                />
        </android.support.design.widget.CollapsingToolbarLayout>
    </android.support.design.widget.AppBarLayout>

    <android.support.v4.widget.NestedScrollView
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_behavior="@string/appbar_scrolling_view_behavior"
        >

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textSize="20sp"
            android:lineSpacingExtra="8dp"
            android:text="@string/lorem"
            android:padding="@dimen/activity_horizontal_margin"
            />
    </android.support.v4.widget.NestedScrollView>

    <android.support.design.widget.FloatingActionButton
        android:layout_height="wrap_content"
        android:layout_width="wrap_content"
        android:layout_margin="@dimen/activity_horizontal_margin"
        android:src="@drawable/ic_comment_24dp"
        app:layout_anchor="@id/main.appbar"
        app:layout_anchorGravity="bottom|right|end"
        />
</android.support.design.widget.CoordinatorLayout>
```
通过给滑动控件设置``app:layout_behavior="@string/appbar_scrolling_view_behavior"``来实现控制 ToolBar 隐藏或消失的效果。但是这个 Behavior 是依赖于 AppBarLayout 的，换成其他的控件将会失效。

## 尝试一
基于我的情况，我的Header可能是这样的：
```
<LinearLayout>
    <!-- 展示库存的HeaderA -->
    <!-- 展示过滤搜索的HeaderB -->
</LinearLayout>
```

所以我期初的做法是定义 Behavior ,然后通过依赖让 LinearLayout 与 RecyclerView 联动。
布局代码如下：
```
<?xml version="1.0" encoding="utf-8"?>
<android.support.design.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/activity_behavior"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <android.support.v7.widget.RecyclerView
        android:id="@+id/recycler"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="@color/colorAccent"
        app:layout_behavior="com.study.lijia.coordinatorlayoutdemo.RecyclerBehavior" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        app:layout_behavior="com.study.lijia.coordinatorlayoutdemo.HeaderBehavior">

        <TextView
            android:layout_width="match_parent"
            android:layout_height="56dp"
            android:background="#4400ff00"
            android:gravity="center"
            android:text="Header A"
            android:textSize="18sp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="48dp"
            android:background="#4400ffff"
            android:gravity="center"
            android:text="Header B"
            android:textSize="16sp" />

    </LinearLayout>

</android.support.design.widget.CoordinatorLayout>
```
HeaderBehavior：
```
public class HeaderBehavior extends CoordinatorLayout.Behavior<View> {

    private View childA;    // Header A
    private View childB;    // Header B

    private int childAHeight;
    private int childBHeight;

    public HeaderBehavior(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public boolean onStartNestedScroll(CoordinatorLayout coordinatorLayout, View child, View directTargetChild, View target, int nestedScrollAxes) {
        if (child instanceof LinearLayout) {
            LinearLayout dependent = (LinearLayout) child;
            if (dependent.getChildCount() == 2) {
                childA = dependent.getChildAt(0);
                childB = dependent.getChildAt(1);
                childAHeight = childA.getHeight();
                childBHeight = childB.getHeight();
            }
        }
        return target instanceof RecyclerView;
    }

    @Override
    public void onNestedPreScroll(CoordinatorLayout coordinatorLayout, View child, View target, int dx, int dy, int[] consumed) {
        if (dy > 0) { //表示向上滚动
            float trY = child.getY() - dy <= -childAHeight ? -childAHeight : child.getTranslationY() - dy;
            child.setY(trY);
            child.setTag(dy);
        } else if (dy < 0) { //向下滚动
            if (target instanceof RecyclerView) {
                int scrollY = getScrollY((RecyclerView) target);
                if (scrollY == 0) {
                    if (target.getTranslationY() < childBHeight) {
                        child.setTag(dy);
                    } else {
                        float trY = child.getY() - dy >= 0 ? 0 : child.getY() - dy;
                        child.setY(trY);
                        child.setTag(dy);
                    }
                }
            }
        }
    }

//    @Override
//    public boolean onNestedPreFling(CoordinatorLayout coordinatorLayout, View child, View target, float velocityX, float velocityY) {
//        ((NestedScrollView) child).fling((int)velocityY);
//        return true;
//    }

    private int getScrollY(RecyclerView target) {
        RecyclerView recyclerView = target;
        LinearLayoutManager layoutManager = (LinearLayoutManager) recyclerView.getLayoutManager();
        int position = layoutManager.findFirstVisibleItemPosition();
        View firstVisiableChildView = layoutManager.findViewByPosition(position);
        int itemHeight = firstVisiableChildView.getHeight();
        return (position) * itemHeight - firstVisiableChildView.getTop();
    }
}
```
RecyclerBehavior：
```
public class RecyclerBehavior extends CoordinatorLayout.Behavior<RecyclerView> {

    private Context context;
    private View childA;    // Header A
    private View childB;    // Header B

    private int childAHeight;
    private int childBHeight;

    public RecyclerBehavior(Context context, AttributeSet attrs) {
        super(context, attrs);
        this.context = context;
    }

    @Override
    public boolean layoutDependsOn(CoordinatorLayout parent, RecyclerView child, View dependency) {
        if (dependency instanceof LinearLayout) {
            LinearLayout dependent = (LinearLayout) dependency;
            if (dependent.getChildCount() == 2) {
                childA = dependent.getChildAt(0);
                childB = dependent.getChildAt(1);
                childAHeight = childA.getHeight();
                childBHeight = childB.getHeight();
                return true;
            }
        }
        return false;
    }

    @Override
    public boolean onDependentViewChanged(CoordinatorLayout parent, RecyclerView child, View dependency) {
        int y = (int) (dependency.getY() + dependency.getBottom());
        Log.e("TAG", "y:" + y);
        int z;
        if (y > childBHeight) {
            child.setTranslationY(y);
        } else {
            if (dependency.getTag() != null) {
                int x = (int) child.getTranslationY();
                z = x - (int) (dependency.getTag());
                if (z < 0) {
                    z = 0;
                } else if (z > childBHeight + childAHeight) {
                    z = childAHeight + childBHeight;
                }
                Log.e("TAG", "z:" + z);
                child.setTranslationY(z);
            }
        }
        return true;
    }
}
```
最后实现的效果可以说基本满足了。但是当发生``Fling``滑动时，便会很容易出现问题。因为上面的Header LinearLayout并没有处理Fling的操作。后面我自定义``LinearLayoutWithFling``利用``OverScroller``来实现``Fling``但是结果并不如意。

## 尝试二
自定义实现``NestedScrollingParent``接口的 LinearLayout ,然后内部来处理 RecyclerView 的滑动。布局代码如下：
```
<com.study.lijia.coordinatorlayoutdemo.StickyNavLayout
    android:id="@+id/activity_behavior"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="56dp"
        android:background="#4400ff00"
        android:gravity="center"
        android:text="Header A"
        android:textSize="18sp" />

    <TextView
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:background="#4400ffff"
        android:gravity="center"
        android:text="Header B"
        android:textSize="16sp" />

    <android.support.v7.widget.RecyclerView
        android:id="@+id/recycler"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="@color/colorAccent" />

</com.study.lijia.coordinatorlayoutdemo.StickyNavLayout>
```
StickyNavLayout如下：
```
public class StickyNavLayout extends LinearLayout implements NestedScrollingParent {

    private NestedScrollingParentHelper parentHelper = new NestedScrollingParentHelper(this);
    private View mTop;
    private View mNav;
    private View thirdView;
    private int mTopViewHeight;
    private OverScroller mScroller;
    private VelocityTracker mVelocityTracker;
    private int mTouchSlop;
    private int mMaximumVelocity, mMinimumVelocity;
    private float mLastY;
    private boolean mDragging;

    public StickyNavLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        setOrientation(LinearLayout.VERTICAL);

        mScroller = new OverScroller(context);
        mTouchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
        mMaximumVelocity = ViewConfiguration.get(context).getScaledMaximumFlingVelocity();
        mMinimumVelocity = ViewConfiguration.get(context).getScaledMinimumFlingVelocity();
    }


    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();
        mTop = getChildAt(0);
        mNav = getChildAt(1);
        thirdView = getChildAt(2);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);

        mTopViewHeight = mTop.getMeasuredHeight();

        //上面测量的结果是viewPager的高度只能占满父控件的剩余空间
        //重新设置viewPager的高度
        ViewGroup.LayoutParams layoutParams = thirdView.getLayoutParams();
        layoutParams.height = getMeasuredHeight() - mNav.getMeasuredHeight();
        Log.e("TAG", "height:" + layoutParams.height);
        thirdView.setLayoutParams(layoutParams);
    }

    @Override
    public void scrollTo(int x, int y) {
        Log.e("TAG", "y:" + y);
        //限制滚动范围
        if (y < 0) {
            y = 0;
        }
        if (y > mTopViewHeight) {
            y = mTopViewHeight;
        }
        super.scrollTo(x, y);
    }

    @Override
    public void computeScroll() {
        if (mScroller.computeScrollOffset()) {
            scrollTo(0, mScroller.getCurrY());
            invalidate();
        }
    }

    public void fling(int velocityY) {
        mScroller.fling(0, getScrollY(), 0, velocityY, 0, 0, 0, mTopViewHeight);
        invalidate();
    }

//实现NestedScrollParent接口-------------------------------------------------------------------------

    @Override
    public boolean onStartNestedScroll(View child, View target, int nestedScrollAxes) {
        return true;
    }

    @Override
    public void onNestedScrollAccepted(View child, View target, int nestedScrollAxes) {
        parentHelper.onNestedScrollAccepted(child, target, nestedScrollAxes);
    }

    @Override
    public void onStopNestedScroll(View target) {
        parentHelper.onStopNestedScroll(target);
    }

    @Override
    public void onNestedScroll(View target, int dxConsumed, int dyConsumed, int dxUnconsumed, int dyUnconsumed) {
    }

    @Override
    public void onNestedPreScroll(View target, int dx, int dy, int[] consumed) {
        boolean hiddenTop = dy > 0 && getScrollY() < mTopViewHeight;
        boolean showTop = dy < 0 && getScrollY() >= 0 && !ViewCompat.canScrollVertically(target, -1);

        if (hiddenTop || showTop) {
            scrollBy(0, dy);
            consumed[1] = dy;
        }
    }

    //boolean consumed:子view是否消耗了fling
    //返回值：自己是否消耗了fling。可见，要消耗只能全部消耗
    @Override
    public boolean onNestedFling(View target, float velocityX, float velocityY, boolean consumed) {
        Log.e("onNestedFling", "called");
        return false;
    }

    //返回值：自己是否消耗了fling。可见，要消耗只能全部消耗
    @Override
    public boolean onNestedPreFling(View target, float velocityX, float velocityY) {
        Log.e("onNestedPreFling", "called");
        if (getScrollY() < mTopViewHeight) {
            fling((int) velocityY);
            return true;
        } else {
            return false;
        }
    }

    @Override
    public int getNestedScrollAxes() {
        return parentHelper.getNestedScrollAxes();
    }
}
```
达到的效果姑且不错，但是当我想要加入下拉刷新``SwipeRefreshLayout``的时候，感觉不是很好加。``SwipeRefreshLayout``也是基于嵌套滑动机制的一个下拉刷新类，``StickyNavLayout``与``SwipeRefreshLayout``要共同处理 RecyclerView 的滑动事件，会冲突。

## 方案三--回归本质
当几经尝试后，感觉还是对原理没摸清，于是回过头来看 AppBarLayout 的 Behavior 。结果我特喵的发现**AppBarLayout 就是 LinearLayout**，很符合我的项目实情。然后利用``layout_scrollFlags``来控制``Header A``的显示、隐藏，并且加入下拉刷新也很方便，最后便采用了原生的方法了。
```
<android.support.design.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <android.support.design.widget.AppBarLayout
        android:id="@+id/activity_behavior"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@null"
        android:orientation="vertical">

        <TextView
            android:layout_width="match_parent"
            android:layout_height="56dp"
            android:background="#4400ffff"
            android:gravity="center"
            android:text="Header A"
            android:textSize="18sp"
            app:layout_scrollFlags="scroll" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="48dp"
            android:background="#4400ff00"
            android:gravity="center"
            android:text="Header B"
            android:textSize="16sp" />

    </android.support.design.widget.AppBarLayout>

    <android.support.v4.widget.SwipeRefreshLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <android.support.v7.widget.RecyclerView
            android:id="@+id/recycler"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:background="@color/colorAccent" />

    </android.support.v4.widget.SwipeRefreshLayout>

</android.support.design.widget.CoordinatorLayout>
```
下拉刷新加载 RecyclerView 那里实际效果看起来很怪，最后调整将 SwipeRefreshLayout 作为根节点， CoordinatorLayout 作为其子 View ，这个时候下拉刷新会有问题，因为2者都实现了 NestedScrollParent 接口，采取的方法是监听 AppBarLayout 的 offset，根据这个值来是否禁用 SwipeRefreshLayout。
```
mAppBarLayout.addOnOffsetChangedListener(new AppBarLayout.OnOffsetChangedListener() {
    @Override
    public void onOffsetChanged(AppBarLayout appBarLayout, int verticalOffset) {
        if (verticalOffset >= 0) {
            mRefreshLayout.setEnabled(true);
        } else {
            mRefreshLayout.setEnabled(false);
        }
    }
});
```

[示例代码](https://github.com/LiJia92/CoordinatorLayoutDemo)

## 参考
demo为了速成，很多代码都是从以下参考文章中直接拿的-。-
1. [ListView 两种固定标头的技巧](http://2bab.me/2014/12/16/ListView-%E4%B8%A4%E7%A7%8D%E5%9B%BA%E5%AE%9A%E6%A0%87%E5%A4%B4%E7%9A%84%E6%8A%80%E5%B7%A7/)
2. [Android CoordinatorLayout和Behavior](http://ltlovezh.com/2016/08/07/Android-CoordinatorLayout%E5%92%8CBehavior/)
3. [(译)掌握 Coordinator Layout](https://www.aswifter.com/2015/11/12/mastering-coordinator/)
4. [CoordinatorLayout高级用法-自定义Behavior](http://blog.csdn.net/qibin0506/article/details/50290421)
5. [NestedScrolling机制(二)——实例](http://blog.csdn.net/al4fun/article/details/53889075)
6. [SwipeRefreshLayout 与 CoordinatorLayout 嵌套刷新](https://my.oschina.net/smuswc/blog/612697)
