---
title: ViewPager 左右突出
date: 2020-05-09 16:29:19
tags:
 - Android 基础
---
日常开发中经常会有如下需求：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/viewpager.png)

ViewPager 左右突出，实现起来非常简单：
```
<android.support.v4.view.ViewPager
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:clipToPadding="false"
    android:paddingLeft="48dp"
    android:paddingRight="48dp" />
```
添加 padding、clipToPadding 即可。
现在还有几个需求：
1. 两边的 item 小一点，并且有透明度
2. item 之间的间距固定
3. 滑动有动画效果

<!-- more -->

第 1点使用 scale 进行缩放即可，但是**左边需要向右缩放，右边需要向左缩放**，才能保证第 2 点。
第 2 点使用 setPageMargin。
第 3 点使用 setPageTransformer。

transformPage 有 2 个参数：
1. page，View: Apply the transformation to this page
2. position，float: Position of page relative to the current front-and-center position of the pager. 0 is front and center. 1 is one full page position to the right, and -1 is one page position to the left.

也就是左边的 View -1~0 变化，右边的 View 0~1 变化。
下面问题来了，显示的页面并非在中间的时候缩放到最大，而是要滑动到左边的边缘才是最大。通过断点调试，发现 postion 值就没有出现过0，也就是从来没有滑到“正中间”。看到代码调用 transformPage 的地方：
```
protected void onPageScrolled(int position, float offset, int offsetPixels) {
    ...

    if (mPageTransformer != null) {
        final int scrollX = getScrollX();
        final int childCount = getChildCount();
        for (int i = 0; i < childCount; i++) {
            final View child = getChildAt(i);
            final LayoutParams lp = (LayoutParams) child.getLayoutParams();

            if (lp.isDecor) continue;
            final float transformPos = (float) (child.getLeft() - scrollX) / getClientWidth();
            mPageTransformer.transformPage(child, transformPos);
        }
    }

    ...
}
```
**传回来的 transformPos 在进行计算时，没有考虑 ViewPager 的 padding，**一切似乎都对应上了。
自己计算位置，最终代码：
```
viewPager.pageMargin = DimenUtils.dp2px(10f)
viewPager.setPageTransformer(false) { page: View, _: Float ->
    var position = getPositionConsiderPadding(view.itemView.schoolViewPager, page)
    if (position < -1) {
        position = -1f
    }
    if (position > 1) {
        position = 1f
    }
    val scale: Float
    val alpha: Float
    val pivotX: Float
    val pivotY: Float
    when {
        position < 0 -> {
            scale = 1f + position * (1 - ORIGIN_SCALE)
            alpha = (0.5f + 0.5f * (1 + position))
            pivotX = width.toFloat()
            pivotY = height / 2f
        }
        position > 0 -> {
            scale = 1f - position * (1 - ORIGIN_SCALE)
            alpha = (0.5f + 0.5f * (1 - position))
            pivotX = 0f
            pivotY = height / 2f
        }
        else -> {
            scale = 1f
            alpha = 1f
            pivotX = width / 2f
            pivotY = height / 2f
        }
    }
    page.alpha = alpha
    page.pivotX = pivotX
    page.pivotY = pivotY
    page.scaleX = scale
    page.scaleY = scale
}

/**
 * 根据 padding 计算真实的 position
 */
private fun getPositionConsiderPadding(viewPager: ViewPager, page: View): Float {
    val clientWidth = (viewPager.measuredWidth - viewPager.paddingLeft - viewPager.paddingRight).toFloat()
    return ((page.left - viewPager.scrollX - viewPager.paddingLeft) / clientWidth)
}
```
注：scale 动画可以设置 x、y 的参照点，**代码设置为相对值，不是百分比，所以需要根据百分比映射到真实的位置**。

参考：[解决几个ViewPager 异常问题 | 深入剖析](https://www.itcodemonkey.com/article/9599.html)