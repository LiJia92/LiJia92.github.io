---
title: android PopupWindow在控件上方显示
date: 2016-06-02 16:26:54
tags:
 - Android 基础
---

项目中有这样一个需求：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/popupwindow1.png)

用户点击送礼物，会弹出一个礼物选择对话框，然后在选择一个礼物之后，可以选择礼物数量，按照图中的意思，选择数量很自然的想到了用``PopupWindow``来做了。但是这里有一个问题就是：弹出来的数量选择框是需要在数量显示栏的上方的。

如果是在下方，那很简单，直接``popupWindow.showAsDropDown(v);``即可。但若是在上方，则需要自己计算坐标了，然后通过``showAtLocation()``方法来显示。

<!-- more -->

首先贴一下大致的布局：
```
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical">

    <FrameLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content">

        <com.miamusic.android.live.ui.widget.CertainScaleImageView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:scaleType="centerCrop"
            android:src="@drawable/gift_background"
            android:visibility="visible"
            app:radio="0.667" />

        <com.miamusic.android.live.ui.widget.WrapContentViewPager
            android:id="@+id/gift_view_pager"
            android:layout_width="match_parent"
            android:layout_height="wrap_content" />

    </FrameLayout>

    <LinearLayout
        android:id="@+id/gift_recharge_layout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="#000000"
        android:gravity="center"
        android:orientation="horizontal"
        android:paddingBottom="24dp"
        android:paddingLeft="16dp"
        android:paddingRight="16dp"
        android:paddingTop="24dp">

        <TextView
            android:id="@+id/gift_remain_coin"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:drawablePadding="2dp"
            android:drawableRight="@drawable/m_coin_small"
            android:minWidth="24dp"
            android:textColor="#C4AF94"
            android:textSize="15sp" />

        <TextView
            android:id="@+id/gift_recharge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:gravity="center"
            android:paddingBottom="4dp"
            android:paddingLeft="8dp"
            android:paddingTop="4dp"
            android:text="充值 >"
            android:textColor="@color/white"
            android:textSize="14sp" />

        <android.support.v4.widget.Space
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1" />

        <LinearLayout
            android:id="@+id/choose_gift_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/follow_button_background"
            android:gravity="center"
            android:paddingBottom="8dp"
            android:paddingLeft="12dp"
            android:paddingRight="12dp"
            android:paddingTop="8dp"
            android:visibility="visible">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:gravity="center"
                android:text="数量"
                android:textColor="@color/white"
                android:textSize="14sp" />

            <TextView
                android:id="@+id/send_gift_count"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginLeft="4dp"
                android:gravity="left"
                android:text="1"
                android:textColor="@color/white"
                android:textSize="14sp" />

            <ImageView
                android:layout_width="16dp"
                android:layout_height="16dp"
                android:src="@drawable/btn_up_white" />

        </LinearLayout>

        <TextView
            android:id="@+id/gift_send"
            android:layout_width="80dp"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:layout_marginLeft="16dp"
            android:background="@drawable/reward_album"
            android:gravity="center"
            android:paddingBottom="8dp"
            android:paddingTop="8dp"
            android:text="送礼物"
            android:textColor="@color/black"
            android:textSize="14sp" />

    </LinearLayout>

</LinearLayout>
```
对应界面的预览如下图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/popupwindow4.png)

这里贴一下Android中的坐标体系：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/popupwindow3.png)
根据这个图，再来计算坐标值。

这里我在图中做了一下标注：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/popupwindow2.png)
popupwindow的y坐标应该是``1的高度 + 2的高度 - popupwindow的高度``。

1的高度即是gift_recharge_layout对应view.getTop()，2的高度即是choose_gift_count对应view.getTop()。

popupwindow的高度，我们通过调用一次``measure()``方法然后通过``getMeasuredHeight()``获取。

那么最终popupwindow的y坐标便计算出来了，横坐标的计算比较简单，就不多说了。x、y计算完之后通过``showAtLocation``进行设置即可。

下面给下示例的片段代码：
```
popupParent = (LinearLayout) findViewById(R.id.gift_recharge_layout);
chooseCount.setOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        final View convertView = LayoutInflater.from(mContext).inflate(R.layout.choose_count_popup_window, null);
        ListView listView = (ListView) convertView.findViewById(R.id.count_list);
        listView.setAdapter(new CountAdapter());
        // 弹出PopupWindow
        final PopupWindow popupWindow = new PopupWindow(convertView, LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT, true);
        popupWindow.setTouchable(true);
        popupWindow.setBackgroundDrawable(mContext.getResources().getDrawable(
                android.R.color.transparent));
        // 执行measure操作，以便后面获取高宽
        convertView.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
        int x = v.getLeft();
        // 对应2的高度
        int y1 = v.getTop();
        // 对应1的高度
        int y2 = popupParent.getTop();
        // 设置PopupWindow显示的位置，
        popupWindow.showAsDropDown(v);
        popupWindow.showAtLocation(v, Gravity.NO_GRAVITY, x + v.getMeasuredWidth() / 2 - convertView.getMeasuredWidth() / 2, (y1 + y2 - 10) - convertView.getMeasuredHeight());

        listView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                popupWindow.dismiss();
                sendCount.setText(counts[position]);
            }
        });
    }
});
```
