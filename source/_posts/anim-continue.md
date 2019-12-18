---
title: 记一次动画实践-续
date: 2019-12-18 11:28:39
tags:
---
嗯，这篇文章是接着[上一篇](http://lastwarmth.win/2019/12/12/anim/)的，因为需求“变”了。上一篇文章中已经实现了滑动动画效果，现在需求变为：当停止滑动时，判断当前状态，若满足一个阈值就直接展开或者收起，也就是动画进度为 0 或 1 的状态。
如果只是单纯这种展开或者收起的效果，使用 layout_scrollFlags 的 snap 效果即可实现。layout_scrollFlags 有 5 种效果，摘录一片博客中的内容：
1. scroll
> The view will be scroll in direct relation to scroll events. This flag needs to be set for any of the other flags to take effect. If any sibling views before this one do not have this flag, then this value has no effect.

Child View 伴随着滚动事件而滚出或滚进屏幕。注意两点：第一点，如果使用了其他值，必定要使用这个值才能起作用；第二点：如果在这个 Child View 前面的任何其他 Child View 没有设置这个值，那么这个 Child View 的设置将失去作用。

<!-- more -->

2. enterAlways
> When entering (scrolling on screen) the view will scroll on any downwards scroll event, regardless of whether the scrolling view is also scrolling. This is commonly referred to as the 'quick return' pattern.

快速返回模式。其实就是向下滚动时 Scrolling View 和 Child View 之间的滚动优先级问题。对比 scroll 和 scroll | enterAlways 设置，发生向下滚动事件时，前者优先滚动 Scrolling View，后者优先滚动 Child View，当优先滚动的一方已经全部滚进屏幕之后，另一方才开始滚动。

3. enterAlwaysCollapsed
> An additional flag for 'enterAlways' which modifies the returning view to only initially scroll back to it's collapsed height. Once the scrolling view has reached the end of it's scroll range, the remainder of this view will be scrolled into view. The collapsed height is defined by the view's minimum height.

enterAlways的附加值。这里涉及到 Child View 的高度和最小高度，向下滚动时，Child View 先向下滚动最小高度值，然后 Scrolling View 开始滚动，到达边界时，Child View 再向下滚动，直至显示完全。

4. exitUntilCollapsed
>When exiting (scrolling off screen) the view will be scrolled until it is 'collapsed'. The collapsed height is defined by the view's minimum height.

这里也涉及到最小高度。发生向上滚动事件时，Child View 向上滚动退出直至最小高度，然后 Scrolling View 开始滚动。也就是，Child View 不会完全退出屏幕。

5. snap
>Upon a scroll ending, if the view is only partially visible then it will be snapped and scrolled to it's closest edge. For example, if the view only has it's bottom 25% displayed, it will be scrolled off screen completely. Conversely, if it's bottom 75% is visible then it will be scrolled fully into view.

简单理解，就是 Child View 滚动比例的一个吸附效果。也就是说，Child View 不会存在局部显示的情况，滚动 Child View 的部分高度，当我们松开手指时，Child View 要么向上全部滚出屏幕，要么向下全部滚进屏幕，有点类似 ViewPager 的左右滑动。

给 bgView 添加使用 snap 效果：
```
<ImageView
    android:id="@+id/bgView"
    android:layout_width="match_parent"
    android:layout_height="375dp"
    android:layout_marginBottom="-217dp"
    android:scaleType="fitXY"
    android:src="@drawable/jiakao_ke3_exam_route_unbuy_banner"
    app:layout_scrollFlags="scroll|snap" />
```
运行后  bgView 一直是张开状态，收不起来。如果把 marginBottom 去掉则可以收起了。目测是必须要滑到 **一半的距离** 才可以收起。于是跑到源码里去看，研究了一阵没发现修改这个距离的办法。由于是原生提供，所以我更倾向这个方案。无奈界面的覆盖效果，必须使用 marginBottom 设置负值，所以只能另寻他法了。
那么便只能自己监听事件，来做滑动了。
自定义 CoordinatorLayout 判断上滑、下滑：
```
class ExamVideoCoordinatorLayout(context: Context, attr: AttributeSet) : CoordinatorLayout(context, attr) {

    var listener: ExamVideoScrollListener? = null
    private var originY = 0F

    private val scrollHandler = Handler()

    @SuppressLint("ClickableViewAccessibility")
    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN) {
            originY = event.y
            scrollHandler.removeCallbacksAndMessages(null)
        } else if (event.action == MotionEvent.ACTION_UP) {
            val y = event.y
            if (y > originY) {
                scrollHandler.postDelayed({
                    listener?.scrollDown()
                }, 100L)
            } else {
                scrollHandler.postDelayed({
                    listener?.scrollUp()
                }, 100L)
            }
        }
        return super.dispatchTouchEvent(event)
    }
}

interface ExamVideoScrollListener {

    fun scrollUp()

    fun scrollDown()
}
```
然后设置 listener：
```
coordinator.listener = object : ExamVideoScrollListener {

    override fun scrollUp() {
        appBarLayout.post {
            val behavior = (appBarLayout?.layoutParams as? CoordinatorLayout.LayoutParams)?.behavior
            if (behavior is AppBarLayout.Behavior) {
                val topAndBottomOffset = behavior.topAndBottomOffset
                if (Math.abs(topAndBottomOffset) > DimenUtils.dp2px(150F) * 0.2) {
                    appBarLayout.setExpanded(false, true)
                } else {
                    appBarLayout.setExpanded(true, true)
                }
            }
        }
    }

    override fun scrollDown() {
        appBarLayout.post {
            val behavior = (appBarLayout?.layoutParams as? CoordinatorLayout.LayoutParams)?.behavior
            if (behavior is AppBarLayout.Behavior) {
                val topAndBottomOffset = behavior.topAndBottomOffset
                if (Math.abs(topAndBottomOffset) < DimenUtils.dp2px(150F) * 0.8) {
                    appBarLayout.setExpanded(true, true)
                } else {
                    appBarLayout.setExpanded(false, true)
                }
            }
        }
    }
}
```
通过判断 AppBarLayout 的 topAndBottomOffset 值，来执行 **appBarLayout.setExpanded()** 方法，第一个参数为 appBarLayout 是否打开，第二个参数为是否使用动画。
使用此种方式，基本能实现效果，但是有小概率操作（手指 fling），会导致 AppBarLayout 处于中间态，目前还没发现好的解决办法，只能先妥协了~

参考：
[Android 详细分析AppBarLayout的五种ScrollFlags](https://www.jianshu.com/p/7caa5f4f49bd)