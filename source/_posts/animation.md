---
title: Android 动画序列的实现
date: 2019-02-02 14:19:14
tags:
 - Android 进阶
---
老规矩，上需求：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/animation.gif)
这个 Gif 里有众多的动画效果，怎么实现呢？

### 拆分效果
整体的动画效果大致可以分为 3 个：
1. 右上角小车移动的动画
2. 图片缩放动画及文字展示的动画
3. 左侧 Logo 及底部文字的动画

拆分完之后，依次来实现。

<!-- more -->

### 小车轨迹动画
项目基于高德地图，小车绘制的路线必须是实际路线的样子，然后车头还要跟着路线进行旋转，里面的细节还是挺多的。

如何绘制路线？
使用高德自带的 Api 很难实现这样的效果，所以采取的方案是：利用高德地图绘制出路线，然后将路线中的 GPS 点映射成为屏幕中的坐标点，这些坐标点是基于 Android 手机屏幕的，所以可以直接传入到 Path 中，然后利用 Path 进行绘制，这样绘制出来的图形遍与真实的路线一致了。

小车如何移动旋转？
小车的移动显然与路线的绘制保持一致，小车的中心点即是路线最新画出来的点。至于角度，则是根据前面 N 个点的平均点，与后面 N 个点的平均点进行连线所形成的的夹角来得到。
```
val pastCenter = Point()  // 过去 N 个点的平均点
var totalX = 0
var totalY = 0
for (index in startIndex..newIndex) {
    totalX += traceDataList!![index].x
    totalY += traceDataList!![index].y
}
pastCenter.x = totalX / (newIndex - startIndex + 1)
pastCenter.y = totalY / (newIndex - startIndex + 1)

val lastCenter = Point()  // 未来 N 个点的平均点
totalX = 0
totalY = 0
for (index in newIndex..endIndex) {
    totalX += traceDataList!![index].x
    totalY += traceDataList!![index].y
}
lastCenter.x = totalX / (endIndex - newIndex + 1)
lastCenter.y = totalY / (endIndex - newIndex + 1)
val angle = (lastCenter.y - pastCenter.y).toFloat() / (lastCenter.x - pastCenter.x)
```
求得角度之后，将其转化为 Canvas 使用的角度进行绘制小车 Bitmap 即可。

### 图片缩放动画，文字展示的动画
Gif 演示图中有 5 张图片，对应了 5 个文字展示动画。
1. 第一张图对应里程、时间动画。
2. 第二张图对应速度、海拔动画。
3. 第三、四张图对应描述文字动画。
4. 第五张图对应推广文字动画。

将每张图的动画仔细拆分：
1. 第一张图：里程文字 alpha 渐变 -> 里程数据从右往左展示 -> 时间文字 alpha 渐变 -> 时间数据从右往左展示。
2. 第二张图：速度文字从上往下展示 -> 速度数据从左往右展示 -> 海拔文字从上往下展示 -> 海拔数据从左往右展示。
3. 第三、四张图：整体从左往右逐渐揭露展示。
4. 第五张图：整体 alpha 渐变。

那么如何将这么些动画组织起来呢？它就像事件流一样，1 执行完了执行 2，2 执行完了执行 3。。。
Android View 提供一个 animate() 方法，它会返回一个 ViewPropertyAnimator 对象，它提供了很多动画方法进行调用，并且有点像建造者模式，可以链式调用，最后写起来就像这样：
```
/**
 * 展示里程、时间动画
 */
private fun startFirstPageAnimation() {
    firstView.distanceLl.animate()
            .alphaBy(0F)
            .alpha(1F)
            .withEndAction {
                firstView.distanceTv.animate()
                        .translationXBy(firstView.distanceTv.measuredWidth.toFloat())
                        .translationX(0F)
                        .withEndAction {
                            firstView.timeLl.animate()
                                    .alphaBy(0F)
                                    .alpha(1F)
                                    .withEndAction {
                                        firstView.timeTv.animate()
                                                .translationXBy(firstView.timeTv.measuredWidth.toFloat())
                                                .translationX(0F)
                                                .withEndAction {
                                                    hideView(firstView)
                                                }
                                                .setDuration(240L)
                                                .start()
                                    }
                                    .setDuration(240L)
                                    .start()
                        }
                        .setDuration(240L)
                        .start()
            }
            .setDuration(240L)
            .start()
}
```
顺带贴一下 firstView 的布局：
```
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    android:id="@+id/firstAnimationRoot"
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_gravity="right|bottom"
    android:layout_marginBottom="24dp"
    android:layout_marginRight="24dp"
    android:gravity="right"
    android:orientation="vertical"
    tools:background="#c000ffff">

    <LinearLayout
        android:id="@+id/distanceLl"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:gravity="center_vertical">

        <View
            android:layout_width="24dp"
            android:layout_height="1dp"
            android:background="@color/vyg__white"/>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginLeft="4dp"
            android:text="总里程"
            android:textColor="@color/vyg__white"
            android:textSize="8sp"/>

    </LinearLayout>

    <TextView
        android:id="@+id/distanceTv"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="@color/vyg__white"
        android:textSize="22sp"
        tools:text="8765KM"/>

    <LinearLayout
        android:id="@+id/timeLl"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="14dp"
        android:gravity="center_vertical">

        <View
            android:layout_width="24dp"
            android:layout_height="1dp"
            android:background="@color/vyg__white"/>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginLeft="4dp"
            android:text="总时间"
            android:textColor="@color/vyg__white"
            android:textSize="8sp"/>

    </LinearLayout>

    <TextView
        android:id="@+id/timeTv"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="@color/vyg__white"
        android:textSize="12sp"
        tools:text="01:23:89"/>

</LinearLayout>
```
利用 withEndAction 方法很方便的在动画结束后执行某个操作，而不用加监听。但是这样动画多了就会产生「回调地狱」，看起来不太舒服...但是也没想到其他好的方法，姑且只能这样了。
第二张图动画代码也和这个类似就不帖了。看下第三张揭露动画：
```
/**
 * 展示文字描述动画
 */
private fun startDescPageAnimation(view: View) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val animator = ViewAnimationUtils.createCircularReveal(view, 0, 0, 0F, DimenUtils.dp2px(240F).toFloat())
        animator.duration = 160L
        animator.start()
        animator.removeAllListeners()
        animator.addListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator?) {
                hideView(view)
            }
        })
    } else {
        view.animate()
                .alphaBy(0F)
                .alpha(1F)
                .withEndAction {
                    hideView(view)
                }
                .setDuration(160L)
                .start()
    }
}
```
直接使用的 createCircularReveal 来创建动画，若是在 5.0 以下，则直接展示个 alpha 渐变动画。
最后一张图的动画就是 alpha 渐变，也没啥好说的。

ok，每一页的动画都准备好了，如何将他们组织起来呢？
首先，需要将每一页元素添加到界面上进行展示。如果需求是固定的 5 组图文，可以直接将布局写死到代码里，可是数量不是固定的。图片是根据路线的数据来取的。
1. 如果没有图片，则返回默认三张图，并展示 1、2、5 对应的文本动画。
2. 如果只有一张或三张，则使用返回的图片，并展示 1、2、5 对应的文本动画。
3. 如果只有两张，则使用返回的图片，并展示 1、2 对应的文本动画。
4. 如果有大于三张，则使用返回的图片，固定展示 1、2、5 的文本动画，多的图片展示 3、4 的动画。

所以：图片的数量和下面展示的文本数量并不是一致的，要将图片动画和文本动画拆开。为了统一控制，最好保持一个动画触发入口。再看到 Gif 图，基本上文本动画执行完准备消失时，图片动画开始。所以我的做法是：统一一个入口，管理文本动画，当文本动画要消失时，触发图片动画。若数量不对应，则不执行图片动画。下面贴代码：
1. 图片容器添加所有的图片
```
/**
 * 填充图片内容
 */
private fun fillPicContent(picList: MutableList<Any>) {
    picContainer.removeAllViews()
    picList.forEach {
        val imageView = ImageView(context)
        imageView.scaleType = ImageView.ScaleType.CENTER_CROP
        if (it is VygImage) {
            AsImage.show(it.detail).into(imageView)
        } else {
            AsImage.show(it).into(imageView)
        }
        picContainer.addView(imageView, 0)
    }
}
```
2. 文本容器添加所有的文本
```
/**
 * 填充文本内容
 */
private fun fillTextContent(route: VygRoute, picList: MutableList<Any>) {
    firstView.timeTv.text = route.showTime
    firstView.distanceTv.setTextWithEmpty(route.distance / 1000.00, "%.1fkm")
    secondView.speedTv.setTextWithEmpty(route.avgSpeed.toDouble(), "%.1fkm/h")
    secondView.altTv.setTextWithEmpty(route.maxAlt, "%.0fm")

    textContainer.removeAllViews()
    textContainer.addView(firstView, 0)
    textContainer.addView(secondView, 0)

    val picSize = picList.size
    /*
     * 1 张或 3 张图片，展示 1、2、5 的样式
     * 2 张，，展示 1、2 的样式
     * 4 张或以上，固定展示 1、2、5，中间 3、4 展示图片打点描述的样式
     */
    if (picSize == 1 || picSize == 3) {
        showTime = (BASE_DURATION - LAST_PAGE_DURATION - 2 * HIDE_DURATION) / 3
        textContainer.addView(lastView, 0)

    } else if (picSize == 4) {
        showTime = (BASE_DURATION - LAST_PAGE_DURATION - DESC_PAGE_DURATION - 3 * HIDE_DURATION) / 4
        val desc = LayoutInflater.from(context).inflate(R.layout.vyg__route_video_share_desc_page, textContainer, false)
        textContainer.addView(desc, 0)
        textContainer.addView(lastView, 0)

        setPointDesc(picList, 2, desc, route)

    } else if (picSize == 5) {
        showTime = (BASE_DURATION - LAST_PAGE_DURATION - DESC_PAGE_DURATION * 2 - 4 * HIDE_DURATION) / 5
        val desc1 = LayoutInflater.from(context).inflate(R.layout.vyg__route_video_share_desc_page, textContainer, false)
        val desc2 = LayoutInflater.from(context).inflate(R.layout.vyg__route_video_share_desc_page, textContainer, false)
        textContainer.addView(desc1, 0)
        textContainer.addView(desc2, 0)
        textContainer.addView(lastView, 0)

        setPointDesc(picList, 2, desc1, route)
        setPointDesc(picList, 3, desc2, route)

    } else {
        showTime = (BASE_DURATION - HIDE_DURATION) / 2
    }
}
```
showTime 为文本动画执行完之后的展示时间，因为动画总时长为 10 秒，文本内容越多，每个文本展示的时间就越短，所以需要计算 showTime，展示时间到了之后就进行隐藏：
```
/**
 * 展示隐藏动画
 */
private fun hideView(view: View) {
    handler.postDelayed({
        if (!isPlaying) {
            return@postDelayed
        }

        showPicAnimation()
        view.animate()
                .alphaBy(1F)
                .alpha(0F)
                .setDuration(600L)
                .withEndAction {
                    textAnimationIndex--
                    startAnimation()
                }
                .start()
    }, showTime)
}
```
隐藏的时候触发图片动画：
```
/**
 * 展示图片缩放动画
 */
private fun showPicAnimation() {
    picAnimationIndex--
    if (picAnimationIndex == 0) {
        return
    }

    val view = picContainer.getChildAt(picAnimationIndex)
    view?.let {
        it.pivotX = 0F
        it.pivotY = picContainer.measuredHeight / 2F
        it.animate()
                .scaleXBy(1F)
                .scaleX(0F)
                .scaleYBy(1F)
                .scaleY(0F)
                .alphaBy(1F)
                .alpha(0F)
                .setDuration(HIDE_DURATION)
                .start()
    }
}
```
textAnimationIndex 为当前展示文本动画的 index，picAnimationIndex 为当前展示图片动画的 index。
然后提供一个入口，触发所有的动画：
```
/**
 * 播放动画
 */
fun play() {
    isPlaying = true
    picAnimationIndex = picContainer.childCount
    textAnimationIndex = textContainer.childCount - 1
    resetAnimationStatus()
    startLeftAnimation()
    startAnimation()
}

/**
 * 开始动画
 */
private fun startAnimation() {
    if (!isPlaying) {
        return
    }

    if (textAnimationIndex < 0 || textAnimationIndex >= textContainer.childCount) {
        textAnimationIndex = 0
        animationEnded()
        return
    }
    val view = textContainer.getChildAt(textAnimationIndex)
    when (view) {
        firstView -> {
            startFirstPageAnimation()
        }
        secondView -> {
            startSecondPageAnimation(textAnimationIndex != 0)
        }
        lastView -> {
            startLastPageAnimation()
        }
        else -> {
            startDescPageAnimation(view)
        }
    }
}
```
通过取文本容器的孩子，判断是什么 View 来执行相应的动画，那么第二部分的动画就算是完成了。

### 左侧 Logo 动画
这个在第二部分动画完成之后便不是什么问题了：
```
/**
 * 展示左侧 Logo、时间、起点动画
 */
private fun startLeftAnimation() {
    leftRoot.bgView.animate()
            .translationXBy(dpMinus44)
            .translationX(0F)
            .setDuration(160L)
            .start()

    handler.postDelayed({
        leftRoot.logoTv.animate()
                .translationYBy(dpMinus118)
                .translationY(0F)
                .withEndAction {
                    leftRoot.dayTv.animate()
                            .translationYBy(dp22)
                            .translationY(0F)
                            .setDuration(400L)
                            .start()
                    leftRoot.dateTv.animate()
                            .translationYBy(dpMinus8)
                            .translationY(0F)
                            .withEndAction {
                                leftRoot.endCityLl.animate()
                                        .alphaBy(0F)
                                        .alpha(1F)
                                        .setDuration(240L)
                                        .start()
                            }
                            .setDuration(400L)
                            .start()
                }
                .setDuration(160L)
                .start()
    }, 80L)
}
```
### 如何停止播放
所有的动画执行时间为 10 秒，当动画开始后，切换到别的 Tab 或页面时，动画应该停止播放，并且恢复到初始状态，然后点击播放按钮能正常从头开始播放。
为了解决这个问题，引入一个变量记录当前正在播放动画的 View，利用 withStartAction 方法即可。
```
firstView.distanceLl.animate()
        .alphaBy(0F)
        .alpha(1F)
        .withStartAction {
            currentAnimationView = firstView.distanceLl
        }
        .setDuration(240L)
        .start()
```
当页面切换时，停止动画并重置所有的 View 的状态：
```
/**
 * 播放停止重置界面展示
 */
private fun resetInitStatus() {
    currentAnimationView?.animate()?.cancel()

    leftRoot.bgView.translationX = 0F
    leftRoot.logoTv.translationY = 0F
    leftRoot.endCityLl.alpha = 1F
    leftRoot.dayTv.translationY = 0F
    leftRoot.dateTv.translationY = 0F

    var picView = picContainer.getChildAt(picAnimationIndex)
    picView?.animate()?.cancel()
    picView = picContainer.getChildAt(picContainer.childCount - 1)
    picView?.scaleX = 1F
    picView?.scaleY = 1F
    picView?.alpha = 1F

    val view = textContainer.getChildAt(textAnimationIndex)
    view?.animate()?.cancel()
    view?.visibility = View.INVISIBLE
    firstView.visibility = View.VISIBLE
    firstView.alpha = 1F
    firstView.distanceLl.alpha = 1F
    firstView.distanceTv.translationX = 0F
    firstView.timeLl.alpha = 1F
    firstView.timeTv.translationX = 0F
}
```

### 小结
1. View 的逐渐显示效果，可以在 View 外层套一层 ViewGroup，然后利用 translate 来实现。
2. animate() 后面的动画使用 alphaBy、translationXBy 等方法时，需要在动画开始的时候将 View 对应的属性设置成相应的值，否则动画会错误的执行（提前结束等）。
3. 动画很多，做的时候要细心，将动画一个个拆分开来，然后逐一攻破。
4. 优化点：能否将 animate() 改造成 RxJava 类似的调用链，避免回调地狱呢？