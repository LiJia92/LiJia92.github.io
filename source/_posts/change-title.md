---
title: Android实现渐变title栏
date: 2016-03-02 10:03:48
tags:
 - 日常开发
---

最近用美团外卖点餐看到这样一个效果：

![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/03/change-title1.png)

顶部的title栏伴随着滑动有这样的一个效果，看起来很不错。

正好项目中可能需要用到，于是打算自己实现一波。

后面在百度、谷歌之后，发现ToolBar+CoordinatorLayout可以很轻易的实现这种效果。

但是在项目中，并没有采用Android新特性的一些东西，所以就得基于目前状况想办法了。

<!--more-->

---
先上一下最终的效果图：

![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/03/change-title2.png)

项目中并没有使用ToolBar这种控件，而是全部自己写的xml文件当做title，整个页面又是由ListView构成。顶部的遮罩背景是添加的一个HeaderView。

贴一下这个页面的布局：
```
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#ffffff"
    android:orientation="vertical">

    <ListView
        android:id="@+id/share_list"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:divider="@null"
        android:scrollbars="none" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical">

        <FrameLayout
            android:id="@+id/profile_header"
            android:layout_width="match_parent"
            android:layout_height="@dimen/activity_head_normal_height"
            android:background="#00ffffff">

            <ImageView
                android:id="@+id/profile_play_entry"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_gravity="center_vertical|right"
                android:scaleType="center"
                android:src="@drawable/play_entry" />

            <TextView
                android:id="@+id/profile_page"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:text="我的"
                android:textColor="#ffffff"
                android:textSize="16sp" />

        </FrameLayout>

        <View
            android:id="@+id/divider"
            android:layout_width="match_parent"
            android:layout_height="1px"
            android:background="@color/dark_gray" />

    </LinearLayout>

</FrameLayout>
```
使用了一个布局固定在顶部，利用FrameLayout进行遮盖。那么要怎么样实现图中的效果呢？

起初，我是想着自定义View，然后重写onTouchEvent事件，但是后面考虑到滑动距离，上滑、下滑等等很多可能性之后，可能需要各种各样的逻辑判断，会显得非常复杂，所以便放弃了这种思路。

后面考虑到，其实我只需要获得到ListView顶端滑出屏幕的纵向距离，然后计算alpha值，赋给title的父布局应该就可以实现了。

若是使用ScrollView，则会有个方法getScrollY可以直接获得到滑出的Y值，但是ListView我试了一下，获得的Y值总是0，所以得另想办法了。

在网上找到这样的一个方法：
```
public int getScrollY() {
    View c = mListView.getChildAt(0);
    if (c == null) {
        return 0;
    }
    int firstVisiblePosition = mListView.getFirstVisiblePosition();
    int top = c.getTop();
    return -top + firstVisiblePosition * c.getHeight() ;
}
```
就是通过item高度，以及第一个child的top值来计算出滑出的距离。

结合这个思路，写出如下代码：
```
private AbsListView.OnScrollListener mScrollListener = new AbsListView.OnScrollListener() {
        @Override
        public void onScrollStateChanged(AbsListView view, int scrollState) {
            if (scrollState == AbsListView.OnScrollListener.SCROLL_STATE_IDLE && !nothingToLoad) {
                // 如果到达最后一行
                if (shareList.getLastVisiblePosition() == shareList.getAdapter().getCount() - 1) {
                    loadMore(); // 加载更多
                }
            }
        }

        @Override
        public void onScroll(AbsListView view, int firstVisibleItem, int visibleItemCount, int totalItemCount) {
            float scrollY = getScrollY();
            float alpha = getAlpha(scrollY);
            profilePage.setAlpha(alpha);
            if (alpha > 0.5) { // alpha > 0.5设置黑色图标
                if (isWhite) {
                    entryPlay.setImageResource(R.drawable.play_entry1);
                    profilePage.setTextColor(Color.BLACK);
                    ObjectAnimator animator = ObjectAnimator.ofFloat(entryPlay, "alpha", 0.5f, 1);
                    animator.setDuration(1000);
                    animator.start();
                }
                isWhite = false;
            } else { // 否则设置白色
                if (!isWhite) {
                    entryPlay.setImageResource(R.drawable.play_entry);
                    profilePage.setTextColor(Color.WHITE);
                    ObjectAnimator animator = ObjectAnimator.ofFloat(entryPlay, "alpha", 0.5f, 1);
                    animator.setDuration(1000);
                    animator.start();
                }
                isWhite = true;
            }
            if (Math.abs(alpha - 1) < 0.03) {
                divider.setVisibility(View.VISIBLE);
            } else {
                divider.setVisibility(View.GONE);
            }
            header.setBackgroundColor(Color.argb((int) (alpha * 255), 255, 255, 255));
        }
    };

    /**
     * 计算ListView顶部滑动Y值
     *
     * @return
     */
    public float getScrollY() {
        float scrollY;
        View c = shareList.getChildAt(0);
        if (c == null) {
            return 0;
        }
        int firstVisiblePosition = shareList.getFirstVisiblePosition();
        int top = c.getTop();
        if (firstVisiblePosition > 0) {
            scrollY = mHeaderView.getHeight() - getResources().getDimension(R.dimen.activity_head_normal_height); // 当HeaderView完全滑出时，alpha值为1，直接设置其高度值
        } else {
            scrollY = -top;
        }
        if (scrollY > mHeaderView.getHeight() - getResources().getDimension(R.dimen.activity_head_normal_height)) {
            scrollY = mHeaderView.getHeight() - getResources().getDimension(R.dimen.activity_head_normal_height);
        }
        return scrollY;
    }

    /**
     * 根据滑动Y值计算alpha值
     *
     * @param scrollY
     * @return
     */
    public float getAlpha(float scrollY) {
        if (mHeaderView.getHeight() != 0) {
            return scrollY / (mHeaderView.getHeight() - getResources().getDimension(R.dimen.activity_head_normal_height));
        }
        return 0;
    }
```
activity_head_normal_height就是title栏的高度，所以能够滑动的最高距离是ListView的HeaderView的高度减去title的高度，当滑出高度大于这个高度，alpha直接就等于1了。

通过上述代码，即可实现之前的效果了。

---
疑问：

 - 当HeaderView完全滑出的时候，c.getHeight() != mHeaderView.getHeight()，按理说c应该是跟mHeaderView是一致的；
 - 在滑动过程中，白色变黑色如何能够让它更自然的过渡呢（图标、文字）？目前是alpha = 0.5这个阈值，直接由白变黑，由黑变白，显得不太自然。

欢迎网友们一起探讨~
