---
title: Android自定义属性
date: 2016-05-10 15:42:43
tags:
 - 日常开发
---

## 前言
项目中对于图片的长宽比有很严格的需求，如果比例不一致，那么在App上显示会影响体验，于是要求长宽比一致。但是比例并不是固定的，有的图需要1:1比例，有的图需要14:9比例，有的图又需要9:16的比例。

起初我的想法是，自定义View在onMeasure里利用比例，将计算后的宽高设置给View就好了。但是这么一想，比例不一致啊。现在需要3种比例，我要自定义3个View，那如果后面有其他的一些比例呢？我不是又得写啦~

抱着偷懒的态度，我设想用自定义属性来解决这个问题，自己设置比例，这样只用自定义一个View，然后根据传入的比例再行计算即可。

<!-- more -->

## 自定义属性
### 添加属性
在``res/value``文件夹下定义一个``attr.xml``文件，添加如下代码：
```
<?xml version="1.0" encoding="utf-8"?>  
<resources>  
    <declare-styleable name="CertainScaleImageView">  
        <attr name="radio" format="float" />  
    </declare-styleable>  
</resources>
```
radio即是代表比例，这里是高比宽。我是先获取宽，然后根据比例计算高。

### 设置属性
在xml顶层布局中添加``xmlns:app="http://schemas.android.com/apk/res-auto"``，然后利用``app:radio``设置属性，示例代码如下：
```
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <FrameLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="8dp"
        android:background="#ffffff"
        android:focusable="true"
        android:focusableInTouchMode="true">

        <com.miamusic.android.live.ui.widget.CertainScaleImageView
            android:id="@+id/anchor_profile_background"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:scaleType="centerCrop"
            android:transitionName="cover"
            app:radio="1.779" />

...
```
这里我设置的1.779，即高是宽的1.779倍，显示一个瘦窄的长方形。

### 获取属性
在自定义View中通过如下代码获取``radio``属性：
```
public CertainScaleImageView(Context context, AttributeSet attrs) {
    super(context, attrs);
    TypedArray typedArray = context.obtainStyledAttributes(attrs, R.styleable.CertainScaleImageView);
    radio = typedArray.getFloat(R.styleable.CertainScaleImageView_radio, 1f);
    typedArray.recycle();
}
```
radio自定义View的一个属性，通过TypedArray获取相应的值并保存起来，TypedArray用完需要调用``recycle()``。

### 计算宽高
获取属性之后，我们需要通过这个比例来计算宽高，代码如下：
```
@Override
protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
    int width = MeasureSpec.getSize(widthMeasureSpec);
    int widthSpec = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY);
    int heightSpec = MeasureSpec.makeMeasureSpec((int) (width * radio), MeasureSpec.EXACTLY);
    setMeasuredDimension(widthSpec, heightSpec);
}
```
获得宽度值，然后根据radio计算高度，然后调用``setMeasuredDimension``即可。

## 总结
通过onMeasure，我们可以自行控制View要显示的区域。
在调用``setMeasuredDimension``时，我们不仅需要计算它确切的高宽，还要给他设置一个``MODE``。
``MODE``有三类：
1. MeasureSpec.EXACTLY：精确尺寸，当我们将控件的layout_width或layout_height指定为具体数值时如andorid:layout_width="50dp"，或者为match_parent是，都是控件大小已经确定的情况，都是精确尺寸。
2. MeasureSpec.AT_MOST：最大尺寸，当控件的layout_width或layout_height指定为wrap_content时，控件大小一般随着控件的子空间或内容进行变化，此时控件尺寸只要不超过父控件允许的最大尺寸即可。因此，此时的mode是AT_MOST，size给出了父控件允许的最大尺寸。
3. MeasureSpec.UNSPECIFIED：未指定尺寸，这种情况不多，一般都是父控件是AdapterView，通过measure方法传入的模式。
