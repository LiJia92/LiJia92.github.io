---
title: MotionLayout 使用介绍
date: 2019-08-13 16:18:16
tags:
 - Android 基础
---
MotionLayout 是 ConstraintLayout 2.0 版本引入进来的，目前还在测试版本中，但感觉还挺有意思的，就写一篇记录一下。

> MotionLayout 类继承自 ConstraintLayout 类，允许你为各种状态之间的布局设置过渡动画。由于 MotionLayout 继承了 ConstraintLayout，因此可以直接在 XML 布局文件中使用 MotionLayout 替换 ConstraintLayout。MotionLayout 是完全声明式的，你可以完全在 XML 文件中描述一个复杂的过渡动画而无需任何代码。

MotionLayout 与 ConstraintLayout 不同的是 MotionLayout 需要链接到一个 MotionScene 文件。使用 MotionLayout 的 app:layoutDescription 属性将 MotionLayout 链接到一个 MotionScene 文件。另外，**MotionLayout 所有的直接子 View 需要指定 id**，不然会报错：
```
All children of ConstraintLayout must have ids to use ConstraintSet.
```

<!-- more -->

### 简单使用
1. 起始状态：
```
<android.support.constraint.motion.MotionLayout
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:app="http://schemas.android.com/apk/res-auto"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:id="@+id/motionLayout"
        app:layoutDescription="@xml/activity_main_motion_scene">

    <TextView
            android:id="@+id/button"
            android:layout_width="100dp"
            android:layout_height="56dp"
            android:text="这个View不动"
            android:textColor="#fff"
            android:gravity="center"
            android:background="#f00"
            app:layout_constraintLeft_toLeftOf="parent"
            app:layout_constraintRight_toRightOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent"/>

    <ImageView
            android:id="@+id/image"
            android:layout_width="56dp"
            android:layout_height="56dp"
            android:src="@mipmap/ic_launcher"
            android:background="@color/colorPrimary"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintLeft_toLeftOf="parent"
            app:layout_constraintRight_toRightOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintVertical_bias="1"/>

</android.support.constraint.motion.MotionLayout>
```
2. 结束状态:
```
<android.support.constraint.motion.MotionLayout
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:app="http://schemas.android.com/apk/res-auto"
        android:id="@+id/motionLayout"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layoutDescription="@xml/activity_main_motion_scene">

    <ImageView
            android:id="@+id/image"
            android:layout_width="48dp"
            android:layout_height="48dp"
            app:layout_constraintLeft_toLeftOf="parent"
            app:layout_constraintRight_toRightOf="parent"
            android:layout_marginTop="100dp"
            app:layout_constraintTop_toTopOf="parent"/>

</android.support.constraint.motion.MotionLayout>
```
3. MotionScene：文件名 activity_main_motion_scene.xml，存放在 res/xml 目录下。
```
<?xml version="1.0" encoding="utf-8"?>
<MotionScene xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto">

    <Transition
        app:constraintSetStart="@layout/activity_main_scene1"
        app:constraintSetEnd="@layout/activity_main_scene2"
        app:duration="1000">

        <OnClick
            app:clickAction="toggle"
            app:targetId="@id/image" />

    </Transition>

</MotionScene>
```
看下效果：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/cl2.gif)

### 属性讲解
MotionLayout 会自动检测这两个场景中具有相同 id 的 View 的属性差别，然后针对这些差别属性应用过渡动画。
MotionLayout 除了支持一下的标准属性外，还支持全部的 **ConstraintLayout** 属性。
- android:visibility
- android:alpha
- android:elevation
- android:rotation
- android:rotationX
- android:rotationY
- android:scaleX
- android:scaleY
- android:translationX
- android:translationY
- android:translationZ

MotionScene 文件的根元素是 MotionScene。在 MotionScene 元素中使用 Transition 子元素来描述一个过渡，使用 Transition 元素的 **app:constraintSetStart** 属性指定起始场景的布局文件，使用 **app:constraintSetEnd** 指定结束场景的布局文件。在 Transition 元素中使用 OnClick 或者 OnSwip 子元素来描述过渡的触发条件。使用 **app:duration** 指定动画时间，**app:motionInterpolator** 指定差值器，取值有 **linear**、**bounce** 等等。

OnClick 元素的属性：
- app:targetId：Id 值，设置用来触发过渡的那个 View 的 Id，例如：@id/image。
- app:clickAction：设置点击时执行的动作，有 5 个可选项：
    - toggle：在 Start 场景和 End 场景之间循环的切换。
    - transitionToEnd：过渡到 End 场景。
    - transitionToStart：过渡到 Start 场景。
    - jumpToEnd：跳到 End 场景（不执行过渡动画）。
    - jumpToStart：跳到 Start 场景（不执行过渡动画）。
    
OnSwip 拖动操作，由于拖动操作涉及的交互较为复杂，这里就不讲述了，有兴趣的同学可以自己了解。
    
### 代码控制
代码开启动画，切换到起始状态：
```
motionLayout.transitionToStart();
```
同样，切换到终止状态：
```
motionLayout.transitionToEnd()
```
设置动画进度：
```
motionLayout.setProgress(progress) // 取值 0 ~ 1
```
监听动画：
```
motionLayout.setTransitionListener(object : MotionLayout.TransitionListener {

    override fun onTransitionTrigger(p0: MotionLayout?, p1: Int, p2: Boolean, p3: Float) {
        // Call when a trigger is fired
    }

    override fun onTransitionStarted(p0: MotionLayout?, p1: Int, p2: Int) {
        // Called when a drawer is about to start a transition.
    }

    override fun onTransitionChange(p0: MotionLayout?, p1: Int, p2: Int, p3: Float) {
        // Called when a drawer's position changes.
    }

    override fun onTransitionCompleted(p0: MotionLayout?, p1: Int) {
        // Called when a drawer has settled completely a state.
    }
})
```

### 在 MotionScene 文件中定义约束
我们可以在 MotionScene 元素中使用 ConstraintSet 子元素定义一个场景约束集，并在 ConstraintSet 元素中使用 Constraint 元素定义单个 View 的属性约束。
将 activity_main_motion_scene.xml 改成如下：
```
<MotionScene xmlns:app="http://schemas.android.com/apk/res-auto"
             xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 定义 Start 场景的属性约束集 -->
    <ConstraintSet android:id="@+id/activity_main_start">

        <!-- 定义布局中 id 为 image 的 View 的属性约束 -->
        <Constraint
                android:id="@id/image"
                android:layout_width="56dp"
                android:layout_height="56dp"
                app:layout_constraintBottom_toBottomOf="parent"
                app:layout_constraintLeft_toLeftOf="parent"
                app:layout_constraintRight_toRightOf="parent"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintVertical_bias="1.0"/>

    </ConstraintSet>


    <!-- 定义 End 场景的属性约束集 -->
    <ConstraintSet android:id="@+id/activity_main_end">

        <!-- 定义布局中 id 为 image 的 View 的属性约束 -->
        <Constraint
                android:id="@id/image"
                android:layout_width="80dp"
                android:layout_height="80dp"
                app:layout_constraintBottom_toBottomOf="parent"
                app:layout_constraintLeft_toLeftOf="parent"
                app:layout_constraintRight_toRightOf="parent"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintVertical_bias="0.0"/>

    </ConstraintSet>

    <!-- Start 场景与 End 场景都是定义在 MotionScene 文件中的约束集 -->
    <Transition
            app:constraintSetStart="@id/activity_main_start"
            app:constraintSetEnd="@id/activity_main_end"
            app:duration="1000">

        <OnClick
                app:clickAction="toggle"
                app:targetId="@id/image"/>

    </Transition>

</MotionScene>
```
效果如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/cl.gif)

这种写法还支持自定义属性：在 Constraint 元素中使用 CustomAttribute 子元素来指定自定义属性。改成如下代码：
```
<MotionScene xmlns:app="http://schemas.android.com/apk/res-auto"
             xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 定义 Start 场景的属性约束集 -->
    <ConstraintSet android:id="@+id/activity_main_start">

        <!-- 定义布局中 id 为 image 的 View 的属性约束 -->
        <Constraint
                android:id="@id/image"
                android:layout_width="56dp"
                android:layout_height="56dp"
                app:layout_constraintBottom_toBottomOf="parent"
                app:layout_constraintLeft_toLeftOf="parent"
                app:layout_constraintRight_toRightOf="parent"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintVertical_bias="1.0">

            <!-- 使用自定义属性 -->
            <CustomAttribute
                    app:attributeName="backgroundColor"
                    app:customColorValue="@color/colorPrimary"/>

        </Constraint>

    </ConstraintSet>

    <!-- 定义 End 场景的属性约束集 -->
    <ConstraintSet android:id="@+id/activity_main_end">

        <!-- 定义布局中 id 为 image 的 View 的属性约束 -->
        <Constraint
                android:id="@id/image"
                android:layout_width="80dp"
                android:layout_height="80dp"
                app:layout_constraintBottom_toBottomOf="parent"
                app:layout_constraintLeft_toLeftOf="parent"
                app:layout_constraintRight_toRightOf="parent"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintVertical_bias="0.0">

            <!-- 使用自定义属性 -->
            <CustomAttribute
                    app:attributeName="backgroundColor"
                    app:customColorValue="@color/colorAccent"/>

        </Constraint>

    </ConstraintSet>

    <!-- Start 场景与 End 场景都是定义在 MotionScene 文件中的约束集 -->
    <Transition
            app:constraintSetStart="@id/activity_main_start"
            app:constraintSetEnd="@id/activity_main_end"
            app:duration="1000">

        <OnClick
                app:clickAction="toggle"
                app:targetId="@id/image"/>

    </Transition>

</MotionScene>
```
效果如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/cl1.gif)

所以如果有使用到 CustomAttribute，则最好将约束变化定义在 MotionScene xml 中。

### 小结
利用 MotionLayout 实现了一个普遍的按钮点击动画：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/cl3.gif)
效果还不错，只是如果前后动画的插值器不一致，或有其他定制的需求时，MotionLayout 是否能满足呢？

本文只是简单介绍了一下 MotionLayout 的使用，它其实还有很多东西，比如 OnSwipe，以及 app:transitionEasing、app:transitionPathRotate、app:drawPath 等一些比较有意思的属性，有空的时候可以再多看看。MotionLayout 当前还只是测试版，期待正式版本出来的那一天！