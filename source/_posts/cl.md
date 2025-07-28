---
title: ConstraintLayout 真香
date: 2019-06-13 10:37:26
tags:
 - Android 基础
---
ConstraintLayout 出来蛮久了，但是一直没怎么用，说是可以直接进行拖拽来实现布局，但是 xml 里全是写死的 dp，不实用。然后用代码吧，属性都贼长贼多，有些难记。最近同学强力安利，说多写写就熟悉了，于是项目新的布局基本都用 ConstraintLayout 来写了，刚开始写的时候确实比较慢，很多属性不知道，有些属性有什么用也不晓得，但是用了几天后，发现真好用！人类的本质啊，真香怪！

## 基本属性
1. layout_constraintRight_toLeftOf
2. layout_constraintRight_toRightOf
3. layout_constraintLeft_toLeftOf
4. layout_constraintLeft_toRightOf
5. layout_constraintTop_toTopOf
6. layout_constraintTop_toBottomOf
7. layout_constraintBottom_toTopOf
8. layout_constraintBottom_toBottomOf
9. layout_constraintBaseline_toBaselineOf

<!-- more -->

见名思意，都很直接明了，还是很方便使用的。和 RelativeLayout 很相似，但是还有着 LinearLayout 的特性，可以说是结合了两大布局的特性，用起来爽歪歪。用这些基础属性已经可以实现大部分的布局了，而且布局嵌套层级就一级。举个例子：
```
<android.support.constraint.ConstraintLayout
        android:layout_width="match_parent"
        android:layout_height="44dp"
        android:paddingLeft="14dp"
        android:paddingRight="4dp"
        tools:background="#f00">

        <ImageView
            android:id="@+id/backIv"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:paddingLeft="6dp"
            android:src="@drawable/vyg__icon_back_white"
            android:tint="#fff"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintLeft_toLeftOf="parent"
            app:layout_constraintTop_toTopOf="parent"/>

        <TextView
            android:id="@+id/catalogTv"
            android:layout_width="wrap_content"
            android:layout_height="match_parent"
            android:gravity="center"
            android:paddingLeft="16dp"
            android:paddingRight="16dp"
            android:text="目录"
            android:textColor="@color/vyg__white"
            android:textSize="14sp"
            android:visibility="gone"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintRight_toRightOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            tools:visibility="gone"/>

        <ImageView
            android:id="@+id/avatarIv"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_marginLeft="12dp"
            android:src="@drawable/vyg__user_avatar_default"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintLeft_toRightOf="@id/backIv"
            app:layout_constraintTop_toTopOf="parent"/>

        <TextView
            android:id="@+id/nameTv"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginLeft="8dp"
            android:layout_marginRight="16dp"
            android:ellipsize="end"
            android:singleLine="true"
            android:textColor="@color/vyg__363A3E"
            android:textSize="13sp"
            app:layout_constraintBottom_toTopOf="@+id/timeTv"
            app:layout_constraintHorizontal_bias="0"
            app:layout_constraintLeft_toRightOf="@+id/avatarIv"
            app:layout_constraintRight_toLeftOf="@+id/followTv"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintVertical_chainStyle="packed"
            tools:text="小孩子的故事小孩子的故事小孩子的故事小孩子的故事"/>

        <TextView
            android:id="@+id/timeTv"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/vyg__A0A9B9"
            android:textSize="11sp"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintLeft_toLeftOf="@+id/nameTv"
            app:layout_constraintTop_toBottomOf="@id/nameTv"
            tools:text="2012-11-12"/>

        <TextView
            android:id="@+id/followTv"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/vyg__shape_f8e71c_r100"
            android:drawablePadding="4dp"
            android:gravity="center"
            android:paddingBottom="6dp"
            android:paddingLeft="12dp"
            android:paddingRight="12dp"
            android:paddingTop="6dp"
            android:text="关注"
            android:textColor="@color/vyg__font_363a3e"
            android:textSize="14sp"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintRight_toLeftOf="@id/catalogTv"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_goneMarginRight="16dp"/>

        <android.support.constraint.Group
            android:id="@+id/group"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:visibility="gone"
            app:constraint_referenced_ids="avatarIv,nameTv,timeTv,followTv"
            tools:visibility="visible"/>

    </android.support.constraint.ConstraintLayout>
```
界面效果如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/cl.png)

## goneMargin
如上图的界面中，为了加大「目录」两字的点击相应区域，给它设置了左右 16dp 的 padding，但是某些情况下，这个「目录」不需要展示，设置为 GONE 之后「关注」按钮距离右边的距离就只剩 4dp 了，需要手动改为 16dp，这样就得写一句很蛋疼的代码：
```
(followTv.layoutParams as ViewGroup.MarginLayoutParams).rightMargin = DimenUtils.dp2px(16F)
```
但是利用 ConstraintLayout 之后，你会发现一句 xml 代码即可搞定，给「关注」设置如下属性
```
app:layout_goneMarginRight="16dp"
```
当它依赖的 View 变为 GONE 时，仍然能保留 margin，ConstraintLayout 流弊！
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/cl1.png)

## chainStyle
上述代码中有一个属性：
```
app:layout_constraintVertical_chainStyle="packed"
```
可以将约束元素组成一个链，chainStyle 用来设置元素之间的效果。
![](https://img-blog.csdn.net/20170917222312991?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvbG1qNjIzNTY1Nzkx/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)

## weight
经常有这种布局：
```
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal">

    <View
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"/>

    <View
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"/>

    <View
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"/>

</LinearLayout>
```
ConstraintLayout 利用 layout_constraintHorizontal_weight 或 layout_constraintVertical_weight 也可以轻而易举的实现。只有一个 View 占据宽度的 1/3，利用 LinearLayout 可以将 View 换成 Space：
```
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal">

    <Space
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"/>

    <View
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"/>

    <Space
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_weight="1"/>

</LinearLayout>
```
利用 ConstraintLayout 实现将会更简单：
```
<android.support.constraint.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <View
        android:layout_width="0dp"
        android:layout_height="100dp"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintVertical_weight=""
        app:layout_constraintWidth_percent="0.33"/>


</android.support.constraint.ConstraintLayout>
```
忽略除不断的小数- -。

## Group
经常会有这种需求：在某个场景下，展示哪些 View，在其他场景要隐藏这些 View，它们是同显示同隐藏的，一个两个 View 还好，如果 View 很多，写起来就很蛋疼了。用 Group 则会很简单。
```
<android.support.constraint.Group
    android:id="@+id/group"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:visibility="gone"
    app:constraint_referenced_ids="avatarIv,nameTv,timeTv,followTv"
    tools:visibility="visible"/>
```
然后使用 group.visibility 即可设置 ids 里面所有 id 对应的 View 了。
注：**Group 只有在 1.1 及以上的版本才添加进来。**
再注：**Group 添加后的 id 再针对子 View 单独操作 visibility 是无效的。**
代码：
```
public void updatePreLayout(ConstraintLayout container) {
    int visibility = this.getVisibility();
    float elevation = 0.0F;
    if (VERSION.SDK_INT >= 21) {
        elevation = this.getElevation();
    }

    for(int i = 0; i < this.mCount; ++i) {
        int id = this.mIds[i];
        View view = container.getViewById(id);
        if (view != null) {
            view.setVisibility(visibility);
            if (elevation > 0.0F && VERSION.SDK_INT >= 21) {
                view.setElevation(elevation);
            }
        }
    }

}
```
界面绘制时，Group 关联的所有 View 的 visibility 只会根据 Group 来，**要么全看得见，要么全看不见。**

## constrainedWidth
先看两张图：
![](https://codimd.mucang.cn/uploads/upload_d30980d97c56b4dbaf8517b3abe31b26.png)

![](https://codimd.mucang.cn/uploads/upload_c3c501aa370768ffb6213acceb5a51c4.png)

文章 RecyclerView 处于微信图标的左侧，且从右边开始布局，嵌套布局很容易实现，看下约束布局如何实现：
```
<android.support.constraint.ConstraintLayout
    android:id="@+id/articleRoot"
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_gravity="bottom"
    android:layout_marginBottom="112dp">

    <ImageView
        android:id="@+id/wxIconIv"
        android:layout_width="62dp"
        android:layout_height="57dp"
        android:layout_marginLeft="6dp"
        android:paddingRight="8dp"
        android:src="@drawable/vyg__article_icon_wx"
        android:visibility="gone"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintHorizontal_bias="0"
        app:layout_constraintLeft_toLeftOf="parent"/>

    <android.support.v7.widget.RecyclerView
        android:id="@+id/articleRv"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginBottom="12dp"
        android:layout_marginLeft="12dp"
        app:layout_constrainedWidth="true"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintHorizontal_bias="1"
        app:layout_constraintLeft_toRightOf="@+id/wxIconIv"
        app:layout_constraintRight_toRightOf="parent"/>

</android.support.constraint.ConstraintLayout>
```
将控件的尺寸设置为 wrap_content，那么对控件设置的 maxWidth、minHeight 这些约束是不起作用的，而强制约束就用于使控件在设置 wrap_content 的情况下约束依然生效。

## 小结
ConstraintLayout 还有很多我没用到特性，目前为止，我：真香！已经不想再用原始的三大布局了，嘿嘿嘿。