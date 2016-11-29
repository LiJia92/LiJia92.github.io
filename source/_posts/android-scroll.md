---
title: 一个关于Android滑动“因缺斯厅”的想法
date: 2016-04-22 14:07:10
tags:
 - 日常开发
---

## 前言
在项目实际开发过程中，需要实现一个这样的需求：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/android-srcoll1.png)
在屏幕上进行上滑时，顶端``大图背景``不动，下面的``正在直播``、``数字专辑``等模块进行滑动，并且``大图背景``慢慢模糊。

起初想着是自定义View，重写onTouchEvent来进行滑动事件的处理，如果是手指滑一点，界面跟着滑一点还好。如果还要计算加速度、阻尼效果等这些因素，就会显得非常复杂了。于是跟基友讨论了一下，有个因缺斯厅的idea，先上一下最后实现的一个效果图。

<!-- more -->

![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/android-srcoll3.gif)
擦，好端端的妹子录Gif被录得完全看不清...

## 方案
通过FrameLayout叠加2个布局，第1个布局就是``大图背景``，第2个布局就是原生ScrollView，ScrollView顶部使用一个透明的View，与第2个布局完全重叠，因为是透明的，所以尽管是叠加上去的，``大图背景``依然能正常显示，底部的``正在直播``、``数字专辑``等模块也能正常显示。FrameLayout的特性是后面的View叠加在前面的View之上。所以ScrollView处于界面的顶端，能够全屏接收触摸事件，然后进行滑动即可。并且ScrollView是android原生用来滑动的View，滑动起来会比较流畅。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/android-srcoll4.jpg)
特意整了一个示意图：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/android-srcoll2.png)

## 实现
### 布局
```
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <FrameLayout
        android:layout_width="match_parent"
        android:layout_height="480dp"
        android:layout_marginBottom="8dp"
        android:background="#ffffff"
        android:focusable="true"
        android:focusableInTouchMode="true">

        <!-- 大图背景布局 -->

        <!-- 大图背景中的关注按钮 -->
        <TextView
            android:id="@+id/follow_text"
            android:layout_width="80dp"
            android:layout_height="64dp"
            android:layout_gravity="right|bottom"
            android:gravity="center"
            android:text="关注"
            android:textColor="@color/white"
            android:textSize="20sp" />

    </FrameLayout>

    <com.example.CustomScrollView
        android:id="@+id/scroll_view"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:scrollbars="none">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical">

            <!-- 这个FrameLayout与大图背景的属性要完全一致，才能完全覆盖，并且设置alpha为0，使其透明 -->
            <FrameLayout
                android:id="@+id/shade"
                android:layout_width="match_parent"
                android:layout_height="480dp"
                android:alpha="0"
                android:background="#000000">

                <!-- 用于覆盖大图背景中的点击事件，相对位置、大小也必须一致 -->
                <TextView
                    android:id="@+id/follow"
                    android:layout_width="80dp"
                    android:layout_height="64dp"
                    android:layout_gravity="right|bottom"
                    android:gravity="center"
                    android:text=""
                    android:textColor="@color/white"
                    android:textSize="20sp" />

            </FrameLayout>

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:background="#000000"
                android:orientation="vertical">
                <!-- 布局代码 -->

            </LinearLayout>

        </LinearLayout>

    </com.example.CustomScrollView>

</FrameLayout>
```
这里重点说明一点，因为是覆盖上去的，所以长宽的属性必须要一致，才能完全覆盖。另外，大图背景中的点击事件，可以在ScrollView顶部布局使用相对位置一致的View来进行响应，注意相对位置，长宽也最好一致。

### 监听ScrollView滑动
上面的布局大致已经能实现滑动的功能了。接下来就是要监听ScrollView滑动，来慢慢模糊大图背景。
Android SDK并没有提供能够直接监听滑动的方法，但是提供了一个``protected void onScrollChanged(int x, int y, int oldx, int oldy)``方法，是protectd的，所以不能被外界调用。因此写一个接口，然后把它暴露出去。
```
public class CustomScrollView extends ScrollView {

    private OnScrollListener listener;

    public CustomScrollView(Context context) {
        super(context);
    }

    public CustomScrollView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public CustomScrollView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public interface OnScrollListener {

        void onScrollChanged(CustomScrollView scrollView, int x, int y, int oldx, int oldy);

    }

    public void setListener(OnScrollListener listener) {
        this.listener = listener;
    }

    @Override
    protected void onScrollChanged(int x, int y, int oldx, int oldy) {
        super.onScrollChanged(x, y, oldx, oldy);
        if (listener != null) {
            listener.onScrollChanged(this, x, y, oldx, oldy);
        }
    }
}
```
然后定义自己的Listener即可。
```
scrollView.setListener(new CustomScrollView.OnScrollListener() {
    @Override
    public void onScrollChanged(CustomScrollView scrollView, int x, int y, int oldx, int oldy) {
        int scrollY = scrollView.getScrollY();
        if (scrollY == 0) {
            followToggle.setClickable(true);
        } else {
            followToggle.setClickable(false);
        }
        if (scrollY > 0) {
            if (scrollY > background.getHeight()) {
                scrollY = background.getHeight();
            }
            if (bitmap != null) {
                int radius = (int) (scrollY * 25f / background.getHeight() * 1.5f);
                if (radius <= 0) {
                    radius = 1;
                } else if (radius > 25) {
                    radius = 25;
                }
                if (lastRadius != radius) {
                    lastRadius = radius;
                    Bitmap blurBitmap = AndroidUtils.fastBlur(MainActivity.this, bitmap, radius);
                    background.setImageBitmap(blurBitmap);
                }
                float alpha = (float) scrollY / background.getHeight() / 1.5f;
                shade.setAlpha(alpha);
            }
        }
    }
});
```
在Listener中通过``getScrollY()``来获得滑动距离，来设置响应的模糊radius，以及alpha值，即可实现想要的效果了。

## 小结
虽然并不一定是最好的实现方法，但是这个方法我个人觉得是比较取巧，比较``因缺斯厅``的方法。其实之前就想到了这样的方法，只不过当时脑袋短路，一直纠结自定义View，导致想不清楚，后面再仔细想一想就没什么大问题了。
