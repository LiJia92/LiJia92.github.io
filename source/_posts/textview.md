---
title: TextView使用小记
date: 2016-07-26 10:46:16
tags:
 - 日常开发
---

相信TextView是Android最常见的控件了，在日常使用中也有一些“心得”，这里记录一下。

## 格式化
有些时候需要在一个TextView上显示不同字体格式的内容，比如说一段黑色，一段灰色的内容，又或者字体一大一小的内容，要实现这样的效果有2种方式：
1. 使用SpannableString
```
SpannableString spanString = new SpannableString("Hello world!");
ForegroundColorSpan span = new ForegroundColorSpan(getResources().getColor(R.color.black));
spanString.setSpan(span, 0, 5, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
```
2. 使用Html format
```
String text = "<font color='black'>Hello:</font>" + "world!";
content.setText(Html.fromHtml(text), TextView.BufferType.SPANNABLE);
```

两种方式都是可以的，但是第2种方式会导致TextView设置``maxLines="3"、ellipsize="end"``的情况下，文本超过3行的时候不显示``...``提示符了。所以在有``...``的需求的时候建议还是使用第一种。

<!-- more -->

## 字的行间距
如果内容过多是会换行的，要设置行间距可以如下设置：
1. android:lineSpacingExtra
设置行间距，如"3dp"。
2. android:lineSpacingMultiplier
设置行间距的倍数，如"1.2"。

## 占位符
有些时候一段字符大部分是固定的，只有一两位是变化的，那么可以在strings.xml中进行如下配置：
```
<string name="barrage_reward">%1$s打赏了主播的专辑</string>
<string name="living_view_count">%1$d人观看</string>
```
1%代表第一个占位符，$s代表字符占位，$d代表数字占位。
然后在设置的时候，用真实的数据替换掉占位符即可。
```
textView.setText(getResources().getString(R.string.barrage_reward, "Jay"));
textView.setText(getResources().getString(R.string.living_view_count, 10));
```

## FontMetrics
FontMetrics意为字体测量。
```
public static class FontMetrics {
        /**
         * The maximum distance above the baseline for the tallest glyph in
         * the font at a given text size.
         */
        public float   top;
        /**
         * The recommended distance above the baseline for singled spaced text.
         */
        public float   ascent;
        /**
         * The recommended distance below the baseline for singled spaced text.
         */
        public float   descent;
        /**
         * The maximum distance below the baseline for the lowest glyph in
         * the font at a given text size.
         */
        public float   bottom;
        /**
         * The recommended additional space to add between lines of text.
         */
        public float   leading;
    }
```
这五个属性分别是什么呢？看如下的图便能一目了然了：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/07/textview1.png)
