---
title: Android开发事件分发小记
date: 2016-08-05 15:39:32
tags:
 - 事件分发
---

项目开发中，碰到这样一个情形：在点击页面空白处时会弹出状态栏，效果就如我[上一篇博客](http://lastwarmth.win/2016/08/04/statusbar/)一样。
那么何为空白处呢？
我的理解是：若是你这个点击事件没有其他View消费，那么便算是点击空白处了。
大致画一下页面布局：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/08/touchevent1.png)
那么在点击图中画框的其他地方，应该都能算上是空白处了，也就是在点击这些地方的时候，需要执行状态栏弹出的操作。

<!-- more -->

大致说一下页面布局的层次结构：
```
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context="com.miamusic.android.live.ui.RoomActivity">

    <!-- 最底层的摄像画面 -->
    <SurfaceView
        android:id="@+id/surfaceview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <HorizontalFrameLayout
        android:id="@+id/parent_layout"
        android:layout_width="match_parent"
        android:layout_height="match_parent">

            <!-- 弹幕 -->
            <android.support.v7.widget.RecyclerView
                android:id="@+id/barrage_layout"
                android:layout_width="match_parent"
                android:layout_height="140dp"
                android:layout_alignParentBottom="true"
                android:layout_marginBottom="40dp" />

            <RelativeLayout
                android:id="@+id/bottom_layout"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_alignParentBottom="true">

                <!-- 底部操作栏 -->

            </RelativeLayout>

    </HorizontalFrameLayout>

    <RelativeLayout
        android:id="@+id/top_layout"
        android:layout_width="match_parent"
        android:layout_height="match_parent">

        <!--顶部主播信息与删除的布局-->

    </RelativeLayout>

</FrameLayout>
```
下面便来逐渐分析事件的分发。

## 清屏操作与RecyclerView的滑动冲突
需求中有``向右滑动清屏``的操作，向左滑动的时候恢复。
我给整个布局``parent_layout``设置了OnTouchListener，图中弹幕是使用的RecyclerView，RecyclerView本身就会处理滑动，那么就只能滑动RecyclerView之外的地方才能进行清屏。但是这样的体验不好，因为清屏必须要滑动空白地方，因为弹幕的原因可能导致空白地方很小。如何处理好与RecyclerView的滑动冲突呢？项目中，弹幕只具有上下滑动的功能，是不具备左右滑动的，所以事件分发给RecyclerView实际上是没有任何作用的，那么便可以在左右滑动的时候拦截掉事件，从而不分发给RecyclerView，拦截掉之后，若便会执行``parent_layout``自身的OnTouchListener中的onTouch事件，在这个事件中做清屏的功能。
拦截横滑代码：
```
@Override
public boolean onInterceptTouchEvent(MotionEvent ev) {
    switch (ev.getAction()) {
        case MotionEvent.ACTION_DOWN:
            downX = ev.getRawX();
            downY = ev.getRawY();
            break;
        case MotionEvent.ACTION_MOVE:
            float moveX = ev.getRawX();
            float moveY = ev.getRawY();
            /**
             * 如果是横滑，则拦截，用于清屏
             * 如果不是则直接将事件传递
             */
            if (Math.abs(moveX - downX) > Math.abs(moveY - downY)) {
                return true;
            }
            break;
    }
    return super.onInterceptTouchEvent(ev);
}
```
设置的OnTouchListener：
```
class LiveGestureListener extends GestureDetector.SimpleOnGestureListener implements View.OnTouchListener {

    Context context;
    GestureDetector gestureDetector;

    public LiveGestureListener(Context context) {
        this(context, null);
    }

    public LiveGestureListener(Context context, GestureDetector detector) {
        if (detector == null) {
            detector = new GestureDetector(context, this);
        }

        this.context = context;
        this.gestureDetector = detector;
    }

    @Override
    public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {

        if (velocityX >= 0) {
            hideInteractLayout();
        } else if (velocityX < 0) {
            showInteractLayout();
        }

        return super.onFling(e1, e2, velocityX, velocityY);
    }

    @Override
    public boolean onScroll(MotionEvent e1, MotionEvent e2, float distanceX, float distanceY) {


        return super.onScroll(e1, e2, distanceX, distanceY);
    }

    @Override
    public boolean onSingleTapConfirmed(MotionEvent e) {
        return super.onSingleTapConfirmed(e);
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        // Within the MyGestureListener class you can now manage the event.getAction() codes.

        // Note that we are now calling the gesture Detectors onTouchEvent. And given we've set this class as the GestureDetectors listener
        // the onFling, onSingleTap etc methods will be executed.
        return gestureDetector.onTouchEvent(event);
    }

    public GestureDetector getGestureDetector() {
        return gestureDetector;
    }
}
```
结合手势在``onFling``中做了清屏与恢复的功能。

## 整个页面的空白处
布局层次中可以看到``top_layout``是单独出来的，并且在FrameLayout的顶层。
详细说明一下：
1、清屏只清屏``parent_layout``中的内容，``top_layout``是不需要隐藏的，所以单独提了出来。
2、在顶层是为了提前消费事件，FrameLayout接到事件后会优先分发给顶层的孩子，即``top_layout``，若``top_layout``消费了，即点击了关闭或者主播信息等有消费事件的View，那么就不算是点击``空白处``了，事件便不会分发给``parent_layout``；若``top_layout``没消费，即点击了``空白处``，则会将事件分发给``parent_layout``，``parent_layout``便是我们自定义的FrameLayout，重写onTouchEvent，执行弹出状态栏的操作便可实现需求。
```
@Override
public boolean onTouchEvent(MotionEvent event) {
    /**
     * 若是单纯的点击，并且没有其他View消费事件，则调用onClickEvent（用于显示或隐藏状态栏）
     */
    switch (event.getAction()) {
        case MotionEvent.ACTION_DOWN:
            interceptX = event.getRawX();
            interceptY = event.getRawY();
            return true;
        case MotionEvent.ACTION_UP:
            float moveX = event.getRawX();
            float moveY = event.getRawY();
            if ((Math.abs(moveX - interceptX) < 20) && (Math.abs(moveY - interceptY) < 20)) {
                if (listener != null) {
                    listener.onClickEvent(event);
                }
            }
            break;
    }
    return super.onTouchEvent(event);
}

public interface DealClickEventListener {
    void onClickEvent(MotionEvent event);
}
```
我们必须在ACTION_DOWN的时候返回true，才会继续收到ACTION_MOVE、ACTION_UP等事件，否则是收不到的。至于为什么，可以参考我之前的一篇博客[Android事件分发机制学习小记](http://lastwarmth.win/2015/11/14/touch-event/)。
我们再ACTION_UP的时候执行我们弹出状态栏的操作即可。
```
holder.interactLayout.setListener(new HorizontalFrameLayout.DealClickEventListener() {
    @Override
    public void onClickEvent(MotionEvent event) {
        if (!isShowing) {
            showOperation();
        } else {
            handler.removeCallbacks(showOrHide);
            handler.postDelayed(showOrHide, 5000);
        }
    }
});
```

最后上一下``HorizontalFrameLayout``的完整代码:
```
public class HorizontalFrameLayout extends FrameLayout {

    private float downX;
    private float downY;
    private float interceptX;
    private float interceptY;
    private DealClickEventListener listener;

    public HorizontalFrameLayout(Context context) {
        super(context);
    }

    public HorizontalFrameLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public HorizontalFrameLayout(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public void setListener(DealClickEventListener listener) {
        this.listener = listener;
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        switch (ev.getAction()) {
            case MotionEvent.ACTION_DOWN:
                downX = ev.getRawX();
                downY = ev.getRawY();
                break;
            case MotionEvent.ACTION_MOVE:
                float moveX = ev.getRawX();
                float moveY = ev.getRawY();
                /**
                 * 如果是横滑，则拦截，用于清屏
                 * 如果不是则直接将事件传递
                 */
                if (Math.abs(moveX - downX) > Math.abs(moveY - downY)) {
                    return true;
                }
                break;
        }
        return super.onInterceptTouchEvent(ev);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        /**
         * 若是单纯的点击，并且没有其他View消费事件，则调用onClickEvent（用于显示或隐藏状态栏）
         */
        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                interceptX = event.getRawX();
                interceptY = event.getRawY();
                return true;
            case MotionEvent.ACTION_UP:
                float moveX = event.getRawX();
                float moveY = event.getRawY();
                if ((Math.abs(moveX - interceptX) < 20) && (Math.abs(moveY - interceptY) < 20)) {
                    if (listener != null) {
                        listener.onClickEvent(event);
                    }
                }
                break;
        }
        return super.onTouchEvent(event);
    }

    public interface DealClickEventListener {
        void onClickEvent(MotionEvent event);
    }
}
```

## 题外话
在我的另一篇博客[一个关于Android滑动“因缺斯厅”的想法](http://lastwarmth.win/2016/04/22/android-scroll/)中说到一个点，顶部布局采用透明的，那么便会引发一个问题：需要透传``关注``按钮的点击事件，因为透明布局是在顶部，会拦截掉点击事件，需要透传才能执行关注的响应事件。
```
public class CustomRecyclerView extends RecyclerView {

    private View view;

    public CustomRecyclerView(Context context) {
        super(context);
    }

    public CustomRecyclerView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
    }

    public void setView(View view) {
        this.view = view;
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (view != null) {
            final float downX = e.getX();
            final float downY = e.getY();
            int firstVisiblePosition = ((LinearLayoutManager) getLayoutManager()).findFirstVisibleItemPosition();
            if (firstVisiblePosition > 0) {
                return super.onTouchEvent(e);
            } else {
                View c = getLayoutManager().findViewByPosition(0);
                int top = c.getTop();
                float scrollY = -top;
                if (downX >= view.getLeft() && downX <= view.getRight() && downY <= view.getBottom() && downY >= view.getTop() && scrollY < view.getHeight()) {
                    return false;
                } else {
                    return super.onTouchEvent(e);
                }
            }

        }
        return super.onTouchEvent(e);
    }
}
```
通过调用``setView``设置需要透传的View，通过判断点击的位置是否在View的范围内，以及RecyclerView滑动的高度是否已经高过``关注按钮的高度``，通过返回false，便可以将事件透传下去了。
