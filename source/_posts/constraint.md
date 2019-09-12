---
title: Android 约束布局的使用
date: 2017-11-20 10:00:12
tags:
 - 日常开发
---
习惯了用 LinearLayout、RelativeLayout 等布局，但是在某些界面的优化上这些布局很难做到。说下我项目中的实际例子：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/11/20/%E9%80%89%E5%8C%BA_254.png)
一件商品有品名、数量、单价、金额等几条属性，要显示在一行。 **注意，图中金额属性没有显示全，但这不是本文要写的内容。当文本过长显示不下，这是个历史难题。** 本文要讲述的是如何利用约束布局来优化界面的显示。
看到图中，我们通长使用 LinearLayout 的 weight 属性，给每一列设置一个 weight，相信大多数人都是这么做的，就像这样：

<!-- more -->

```
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:paddingBottom="@dimen/margin_x_x_small"
    android:paddingLeft="@dimen/padding_middle_large"
    android:paddingRight="@dimen/padding_middle_large"
    android:paddingTop="@dimen/margin_x_x_small">

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="8"
        android:orientation="horizontal">

        ...

    </LinearLayout>

    <TextView
        android:id="@+id/product_count_tv"
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_weight="2"
        android:gravity="center_vertical|end"
        android:maxLines="1"
        android:textColor="@color/font_main"
        android:textSize="@dimen/font_body"
        tools:text="4000.00" />

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="4"
        android:gravity="center"
        android:layout_gravity="center_vertical"
        android:orientation="vertical"
        android:paddingLeft="@dimen/margin_small">

        ...

    </LinearLayout>

    <TextView
        android:id="@+id/total_amount_tv"
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_weight="4"
        android:gravity="end|center_vertical"
        android:maxLines="1"
        android:paddingLeft="@dimen/margin_small"
        android:textColor="@color/font_main"
        android:textSize="@dimen/font_body"
        tools:text="4000.00" />

</LinearLayout>
```
示例中的比例是8:2:4:4，标题与流水使用相同的比例。第一列与标题左对齐，后面几列与标题右对齐，这样写出来的界面效果会比较整洁。但是存在一种情况：商品名称很短，但是数量却很多。就像上图所示。那么数量所占的 2 / 18 的比例是无法显示出1000000这个数量的，商品名称又很短导致浪费很多空间，但是图中却完美显示了。原因就在于 **约束布局**，这也是本文的重点。
直接贴出使用约束布局的XML：
```
<?xml version="1.0" encoding="utf-8"?>
<android.support.constraint.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="55dp"
    android:paddingBottom="@dimen/margin_x_x_small"
    android:paddingLeft="@dimen/padding_middle_large"
    android:paddingRight="@dimen/padding_middle_large"
    android:paddingTop="@dimen/margin_x_x_small">

    <View
        android:id="@+id/view_mask1"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintHorizontal_weight="8"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toLeftOf="@+id/view_mask2" />

    <View
        android:id="@+id/view_mask2"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintHorizontal_weight="2"
        app:layout_constraintLeft_toRightOf="@+id/view_mask1"
        app:layout_constraintRight_toLeftOf="@+id/view_mask3" />

    <View
        android:id="@+id/view_mask3"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintHorizontal_weight="4"
        app:layout_constraintLeft_toRightOf="@+id/view_mask2"
        app:layout_constraintRight_toLeftOf="@+id/view_mask4" />

    <View
        android:id="@+id/view_mask4"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintHorizontal_weight="4"
        app:layout_constraintLeft_toRightOf="@+id/view_mask3"
        app:layout_constraintRight_toRightOf="parent" />

    <com.makeramen.roundedimageview.RoundedImageView
        android:id="@+id/product_icon_iv"
        android:layout_width="45dp"
        android:layout_height="45dp"
        android:scaleType="center"
        app:riv_corner_radius="@dimen/round_view_circular" />

    <LinearLayout
        android:id="@+id/product_name_ll"
        android:layout_width="0dp"
        android:layout_height="45dp"
        android:layout_marginLeft="@dimen/margin_x_x_x_small"
        android:layout_marginRight="@dimen/margin_x_x_x_small"
        android:gravity="center_vertical"
        android:orientation="vertical"
        app:layout_constraintLeft_toRightOf="@+id/product_icon_iv"
        app:layout_constraintRight_toLeftOf="@+id/product_count_tv">

        ...

    </LinearLayout>

    <TextView
        android:id="@+id/product_count_tv"
        android:layout_width="0dp"
        android:layout_height="45dp"
        android:ellipsize="end"
        android:gravity="center_vertical|end"
        android:maxLines="1"
        android:textColor="@color/font_main"
        android:textSize="@dimen/font_body"
        app:layout_constraintRight_toRightOf="@+id/view_mask2"
        tools:text="4000.00" />

    <LinearLayout
        android:id="@+id/product_price_ll"
        android:layout_width="0dp"
        android:layout_height="45dp"
        android:layout_marginLeft="@dimen/margin_x_x_x_small"
        android:layout_marginStart="@dimen/margin_x_x_x_small"
        android:gravity="center"
        android:orientation="vertical"
        app:layout_constraintLeft_toRightOf="@+id/product_count_tv"
        app:layout_constraintRight_toRightOf="@+id/view_mask3">

        ...

    </LinearLayout>

    <TextView
        android:id="@+id/total_amount_tv"
        android:layout_width="0dp"
        android:layout_height="45dp"
        android:layout_marginLeft="@dimen/margin_x_x_x_small"
        android:layout_marginStart="@dimen/margin_x_x_x_small"
        android:ellipsize="end"
        android:gravity="end|center_vertical"
        android:maxLines="1"
        android:textColor="@color/font_main"
        android:textSize="@dimen/font_body"
        app:layout_constraintLeft_toRightOf="@+id/product_price_ll"
        app:layout_constraintRight_toRightOf="@+id/view_mask4"
        tools:text="40000.00" />

</android.support.constraint.ConstraintLayout>
```
可以看到约束布局的一些属性：layout_constraintLeft_toRightOf。布局的左边在谁的右边，字面意思，很好理解。其他类似的还有 layout_constraintRight_toRightOf 、layout_constraintRight_toLeftOf等等。看到上面最上层有几个 view_mask，这是用来做对齐的，因为标题和流水没有在一个布局里。商品列与 view_mask1 左对齐，其他几列与相应的 view_mask 右对齐。
然后看一下布局的宽度属性，我都是设置的``0dp``，这是因为在约束布局里，``0dp``代表``MATCH_CONSTRAINT``，它会利用约束自动设置控件的宽度。那么``MATCH_PARENT``去哪了？官网做了如下说明：
> Important: MATCH_PARENT is not supported for widgets contained in a ConstraintLayout, though similar behavior can be defined by using MATCH_CONSTRAINT with the corresponding left/right or top/bottom constraints being set to "parent".

``MATCH_CONSTRAINT``则是实现本文效果的核心。我并不需要给每列属性设置宽度，我需要的仅仅是：品名在数量的左边，数量在品名的右边，当品名字符串很长时，它可以无限接近数量字符串，直到没有剩余空间。
虽然只是一点小小的优化，但是能改进某些情况下界面的显示效果，好处还是有的，今后还是多尝试用用约束布局，但是我是肯定不会用拖拽来实现布局的╮(╯▽╰)╭。

参考：[拒绝拖拽 使用ConstraintLayout优化你的布局吧](https://mp.weixin.qq.com/s/vI-fPaNoJ7ZBlZcMkEGdLQ)
