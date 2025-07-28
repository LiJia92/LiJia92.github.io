---
title: Android仿QQ实现ListView滑动删除
date: 2015-11-14 02:09:38
tags:
 - Android 基础
---

## 前言
手机QQ应该是很普及的App了，看到QQ消息栏对话框列表的每个子项左滑的时候会弹出删除、置顶图标。like this：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/swipe-listview1.png)
于是突发奇想：想要自己实现一个这样的效果。
很显然的，这样的效果实现要依赖Android的事件分发机制，于是我先从Android事件分发入手。对于事件分发还不太熟悉的朋友可以参考[Android事件分发机制学习](http://lijia92.github.io/2015/11/14/touch-event/)。
下面开工！

<!--more-->

## List Item
首先，针对ListView的每个Item自定义一个MyItemLayout。代码如下：
```
public class MyItemLayout extends LinearLayout {

    // content View
    private LinearLayout contentView;
    // menu View
    private LinearLayout menuView;
    // content View的布局参数对象
    private LayoutParams contentLayout;
    // 菜单是否打开
    private boolean isMenuOpen;
    // contentView最小的leftMargin
    private int minLeftMargin;
    // contentView最大的leftMargin
    private int maxLeftMargin = 0;
    // 滑动类
    private Scroller mScroller = null;

    public MyItemLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        contentLayout = new LayoutParams(getScreenWidth(), LayoutParams.WRAP_CONTENT);
        mScroller = new Scroller(context);
    }

    @Override
    public void computeScroll() {
        if (mScroller.computeScrollOffset()) {
            setLeftMargin(mScroller.getCurrX());
            postInvalidate();
        }
    }

    /**
     * Scroller平滑打开Menu
     */
    public void smoothOpenMenu() {
        isMenuOpen = true;
        mScroller.startScroll(contentLayout.leftMargin, 0, minLeftMargin - contentLayout.leftMargin, 0, 350);
        postInvalidate();
    }

    /**
     * Scroller平滑关闭Menu
     */
    public void smoothCloseMenu() {
        isMenuOpen = false;
        mScroller.startScroll(contentLayout.leftMargin, 0, maxLeftMargin - contentLayout.leftMargin, 0, 350);
        postInvalidate();
    }

    /**
     * 在布局inflate完成后调用
     */
    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();
        // 第一个孩子是contentView
        contentView = (LinearLayout) getChildAt(0);
        // 第二个孩子是MenuView
        menuView = (LinearLayout) getChildAt(1);
        // 最小的leftMargin为负的menuView宽度
        ViewGroup.LayoutParams lp = menuView.getLayoutParams();
        minLeftMargin = -lp.width;
    }

    /**
     * 获取屏幕宽度
     * @return
     */
    private int getScreenWidth() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        return dm.widthPixels;
    }

    /**
     * 给contentView设置leftMargin
     * @param leftMargin
     */
    public void setLeftMargin(int leftMargin) {
        // 控制leftMargin不越界
        if (leftMargin > maxLeftMargin) {
            leftMargin = maxLeftMargin;
        }
        if (leftMargin < minLeftMargin) {
            leftMargin = minLeftMargin;
        }
        contentLayout.leftMargin = leftMargin;
        // 通过设置leftMargin，达到menu显示的效果
        contentView.setLayoutParams(contentLayout);
    }

    /**
     * 获取menuView宽度
     * @return
     */
    public int getMenuWidth() {
        return -minLeftMargin;
    }

    /**
     * Menu是否打开
     * @return
     */
    public boolean isMenuOpen() {
        return isMenuOpen;
    }

}
```
每个Item有2个直接子节点，第一个是contentView，第二个是menuView。通过设置contentView的leftMargin，达到显示Menu的效果。初始时，leftMargin为0，Menu完全隐藏。当滑动时，leftMargin逐渐缩小（因为是负数），当leftMargin等于minLeftMargin时，Menu完全显示。
本来有种想法（参考[郭霖大神的博客](http://blog.csdn.net/guolin_blog/article/details/8714621)）是采用线程Sleep的方式来达到滑动效果的。代码如下：
```
private class ScrollTask extends AsyncTask<Integer, Integer, Integer> {

        @Override
        protected Integer doInBackground(Integer... speed) {
            int leftMargin = contentLayout.leftMargin;
            while (true) {
                leftMargin = leftMargin - speed[0];
                if (leftMargin > maxLeftMargin) {
                    leftMargin = maxLeftMargin;
                    break;
                }
                if (leftMargin < minLeftMargin) {
                    leftMargin = minLeftMargin;
                    break;
                }
                publishProgress(leftMargin);
                try {
                    Thread.sleep(20);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            isMenuOpen = speed[0] > 0;
            return leftMargin;
        }

        @Override
        protected void onProgressUpdate(Integer... leftMargin) {
            contentLayout.leftMargin = leftMargin[0];
            contentView.setLayoutParams(contentLayout);
        }

        @Override
        protected void onPostExecute(Integer leftMargin) {
            contentLayout.leftMargin = leftMargin;
            contentView.setLayoutParams(contentLayout);
        }
    }

public void toOpenMenu() {
        new ScrollTask().execute(30);
    }

    public void toCloseMenu() {
        new ScrollTask().execute(-30);
    }
```
但是后面产生的实际效果不太好，滑动的时候总是有点卡顿的感觉，于是便弃用了，后面还是采用的Scroller类。

下面贴上每个Item的布局：
```
<?xml version="1.0" encoding="utf-8"?>
<com.lastwarmth.mylistview.MyItemLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal">

    <LinearLayout
        android:id="@+id/content"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:paddingBottom="4dp"
        android:paddingLeft="8dp"
        android:paddingTop="4dp">

        <de.hdodenhof.circleimageview.CircleImageView
            android:id="@+id/profile_image"
            android:layout_width="56dp"
            android:layout_height="56dp"
            app:civ_border_color="#FF000000"
            app:civ_border_width="1dp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:layout_marginLeft="16dp"
            android:layout_marginTop="4dp"
            android:orientation="vertical">

            <TextView
                android:id="@+id/group_name"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="群名称" />

            <TextView
                android:id="@+id/qq_content"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="8dp"
                android:singleLine="true"
                android:text="聊天内容" />

        </LinearLayout>
    </LinearLayout>


    <LinearLayout
        android:id="@+id/menu"
        android:layout_width="240dp"
        android:layout_height="match_parent"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/to_top"
            style="@style/menu_text_style"
            android:layout_width="80dp"
            android:layout_height="match_parent"
            android:background="@android:color/darker_gray"
            android:gravity="center"
            android:text="置顶" />

        <TextView
            android:id="@+id/had_read"
            style="@style/menu_text_style"
            android:layout_width="80dp"
            android:layout_height="match_parent"
            android:background="@android:color/holo_orange_light"
            android:gravity="center"
            android:text="标为已读" />

        <TextView
            android:id="@+id/delete"
            style="@style/menu_text_style"
            android:layout_width="80dp"
            android:layout_height="match_parent"
            android:background="@android:color/holo_red_light"
            android:gravity="center"
            android:text="删除" />
    </LinearLayout>

</com.lastwarmth.mylistview.MyItemLayout>
```
content id即是第一个子节点，menu id为第二个子节点。

## Adapter
```
public class MyAdapter extends BaseAdapter {
    private List<MyModel> data;
    private Context mContext;

    public MyAdapter(List<MyModel> data, Context mContext) {
        this.data = data;
        this.mContext = mContext;
    }

    @Override
    public int getCount() {
        if (data != null) {
            return data.size();
        }
        return 0;
    }

    @Override
    public Object getItem(int position) {
        if (data != null) {
            return data.get(position);
        }
        return null;
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }

    @Override
    public View getView(final int position, View contentView, ViewGroup parent) {
        ViewHolder holder;
        if (contentView == null) {
            holder = new ViewHolder();
            contentView = LayoutInflater.from(mContext).inflate(R.layout.list_item, parent, false);
            holder.imageView = (CircleImageView) contentView.findViewById(R.id.profile_image);
            holder.groupName = (TextView) contentView.findViewById(R.id.group_name);
            holder.content = (TextView) contentView.findViewById(R.id.qq_content);
            holder.toTop = (TextView) contentView.findViewById(R.id.to_top);
            holder.hadRead = (TextView) contentView.findViewById(R.id.had_read);
            holder.delete = (TextView) contentView.findViewById(R.id.delete);
            contentView.setTag(holder);
        } else {
            holder = (ViewHolder) contentView.getTag();
        }
        MyModel myModel = (MyModel) getItem(position);
        holder.groupName.setText(myModel.getGroupName());
        holder.content.setText(myModel.getContent());
        Picasso.with(mContext)
                .load(myModel.getImageUrl())
                .placeholder(R.mipmap.lb_zjtx)
                .into(holder.imageView);
        final MyItemLayout finalContentView = (MyItemLayout) contentView;
        holder.toTop.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Toast.makeText(mContext, "已置顶", Toast.LENGTH_SHORT).show();
                finalContentView.smoothCloseMenu();
            }
        });
        holder.hadRead.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Toast.makeText(mContext, "已阅读", Toast.LENGTH_SHORT).show();
                finalContentView.smoothCloseMenu();
            }
        });
        holder.delete.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                data.remove(position);
                finalContentView.smoothCloseMenu();
                notifyDataSetChanged();
                Toast.makeText(mContext, "已删除", Toast.LENGTH_SHORT).show();
            }
        });
        return contentView;
    }

    private static class ViewHolder {
        CircleImageView imageView;
        TextView groupName;
        TextView content;
        TextView toTop;
        TextView hadRead;
        TextView delete;
    }
}
```
Adapter类比较简单，这里不做过多的赘述。

## Model类
MyModel类主要是为了模仿QQ会话写的一个类。
```
public class MyModel {

    String imageUrl; // 头像Url
    String groupName; // 群名称
    String content; // 聊天内容

    public MyModel(String imageUrl, String groupName, String content) {
        this.imageUrl = imageUrl;
        this.groupName = groupName;
        this.content = content;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getGroupName() {
        return groupName;
    }

    public String getContent() {
        return content;
    }

}
```
## 自定义ListView
下面便是最关键的一个：自定义ListView，覆写onTouchEvent方法，实现滑动删除。
```
public class MyListView extends ListView {

    // 滑动速度追踪类
    private VelocityTracker mVelocityTracker;
    // ACTION_DOWN的坐标
    private float xDown;
    private float yDown;
    // 判断横滑、竖滑的最小值
    private int MAX_Y = 5;
    private int MAX_X = 3;
    // 当前点击的position
    private int mTouchPosition;
    // 当前点击的item View
    private MyItemLayout mTouchView;
    // 当前触摸状态
    private int mTouchState = TOUCH_STATE_NONE;
    private static final int TOUCH_STATE_NONE = 0; //ACTION_DOWN时设置的状态
    private static final int TOUCH_STATE_X = 1; //横滑
    private static final int TOUCH_STATE_Y = 2; //竖滑


    public MyListView(Context context, AttributeSet attrs) {
        super(context, attrs);
        MAX_X = dp2px(MAX_X);
        MAX_Y = dp2px(MAX_Y);
    }

    /**
     * 创建VelocityTracker对象，并将触摸事件加入到VelocityTracker当中
     *
     * @param event
     */
    private void createVelocityTracker(MotionEvent event) {
        if (mVelocityTracker == null) {
            mVelocityTracker = VelocityTracker.obtain();
        }
        mVelocityTracker.addMovement(event);
    }

    /**
     * 获取手指在滑动的速度
     *
     * @return 滑动速度，以每秒钟移动了多少像素值为单位
     */
    private int getScrollVelocity() {
        mVelocityTracker.computeCurrentVelocity(1000);
        int velocity = (int) mVelocityTracker.getXVelocity();
        return Math.abs(velocity);
    }

    /**
     * 回收VelocityTracker对象
     */
    private void recycleVelocityTracker() {
        mVelocityTracker.recycle();
        mVelocityTracker = null;
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        return super.onInterceptTouchEvent(ev);
    }

    /**
     * 触摸事件的控制
     *
     * @param ev
     * @return
     */
    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        if (ev.getAction() != MotionEvent.ACTION_DOWN && mTouchView == null) {
            return super.onTouchEvent(ev);
        }
        // 加入触摸跟踪类
        createVelocityTracker(ev);
        float moveX;
        float moveY;
        int action = ev.getAction();
        switch (action) {
            case MotionEvent.ACTION_DOWN:
                int prevPosition = mTouchPosition;
                xDown = ev.getX();
                yDown = ev.getY();
                mTouchState = TOUCH_STATE_NONE;
                mTouchPosition = pointToPosition((int) xDown, (int) yDown);
                // 当前点击的Item正好是已经显示Menu的Item
                if (prevPosition == mTouchPosition && mTouchView != null && mTouchView.isMenuOpen()) {
                    mTouchState = TOUCH_STATE_X;
                    return true; // 返回true表示接受了ACTION_DOWN，那么后面的事件依然会分发给MyListView
                }
                View view = getChildAt(mTouchPosition - getFirstVisiblePosition());
                // 点击的Item不是正在显示Menu的Item，则直接关闭Menu
                if (mTouchView != null && mTouchView.isMenuOpen()) {
                    mTouchView.smoothCloseMenu();
                    mTouchView = null;
                    return false; // 返回false，那么后面的事件全部会接收不到
                }
                if (view instanceof MyItemLayout) {
                    mTouchView = (MyItemLayout) view;
                }
                break;
            case MotionEvent.ACTION_MOVE:
                moveX = ev.getX() - xDown;
                moveY = ev.getY() - yDown;
                if (mTouchState == TOUCH_STATE_X) {
                    // 如果是横滑，则设置leftMargin
                    if (!mTouchView.isMenuOpen()) {
                        mTouchView.setLeftMargin((int) moveX);
                    } else {
                        mTouchView.setLeftMargin((int) (moveX - mTouchView.getMenuWidth()));
                    }
                    return true;
                } else if (mTouchState == TOUCH_STATE_NONE) {
                    // 设置横滑还是竖滑
                    if (Math.abs(moveY) > MAX_Y) {
                        mTouchState = TOUCH_STATE_Y;
                    } else if (Math.abs(moveX) > MAX_X) {
                        mTouchState = TOUCH_STATE_X;
                    }
                }
                break;
            case MotionEvent.ACTION_UP:
                moveX = ev.getX() - xDown;
                if (mTouchState == TOUCH_STATE_X) {
                    // 若滑动的距离是Menu宽度的一半，或者左滑速度大于200,
                    if (-moveX > mTouchView.getMenuWidth() / 2 || (moveX < 0 && getScrollVelocity() > 200)) {
                        // 若Menu是关闭的
                        if (!mTouchView.isMenuOpen()) {
                            // 滑动打开Menu
                            mTouchView.smoothOpenMenu();
                        }
                    } else {
                        // 滑动关闭Menu
                        mTouchView.smoothCloseMenu();
                        mTouchView = null;
                        mTouchPosition = -1;
                    }
                    recycleVelocityTracker();
                    return true;
                }
                break;
        }
        return super.onTouchEvent(ev);
    }

    private int dp2px(int dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp,
                getContext().getResources().getDisplayMetrics());
    }
}
```
在这个项目中，触摸事件分以下几种情况：
1. 当前没有Menu正在显示

 - ACTION_DOWN记录相关信息，准备接收ACTION_MOVE、ACTION_UP事件。
 - ACTION_MOVE中，判断是横滑还是竖滑。若是横滑，则调用setLeftMargin()，这个时候若一直滑动，Menu会慢慢地显示出来。后面会返回true，主要是为了拦截最后的super.onTouchEvent(ev)不执行。若是竖滑，则直接调用super.onTouchEvent(ev)，这个时候若一直滑动，则是ListView的上下滑动了。
 - ACTION_UP中，我们只需要判断是否要显示，若显示则调用smoothOpenMenu()，并返回true（这里返回true或者false都没有实际的意义）。若是不需要，则直接super.onTouchEvent(ev)。

2. 当前有Menu正在显示

 - ACTION_DOWN，若当前点击的Item不是Menu正在显示的Item，那么直接smoothCloseMenu()，并且返回false。返回false后MOVE、UP等事件会统统不接收。
 - 若是正在点击的Item，那么首先设置为横滑，并且返回true，等待后续的触摸事件。
 - ACTION_MOVE因为在DOWN的时候设置了mTouchState = TOUCH_STATE_X;那么会执行到if内部，因为Menu正在显示，所以不会调用setLeftMargin()，并且直接返回true，即后面的super.onTouchEvent(ev)也不会调用。
 - ACTION_UP中判断Menu是否要关闭，若关闭则调用smoothCloseMenu()，并且返回true。若是不需要，则直接返回super.onTouchEvent(ev)。

这里是复杂的地方，需要对各种情况进行判断，然后执行相应的逻辑。我写了好多次，改过好多次QAQ...

## Tips
 - 在ACTION_DOWN的分支中，返回false会直接截断后面MOVE、UP等事件的接收。
 - 在ACTION_MOVE与ACTION_UP的返回值，为true为false，并没有特别实际的效果，仅仅是为了返回，以此来截断super.onTouchEvent(ev)的执行。

## 最后
下面上效果图：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/swipe-listview2.png)
看起来效果也还不错，是吧？

<font size=5>[源码下载](https://github.com/LiJia92/MyListView)</font>
