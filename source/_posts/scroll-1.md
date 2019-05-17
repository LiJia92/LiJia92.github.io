---
title: RecyclerView 滑动小记
date: 2019-05-17 15:58:19
tags:
 - 日常开发
---
关于 RecyclerView 的滑动方法有很多：
1. scrollToPosition
2. scrollTo
3. scrollBy
4. smoothScrollBy
5. smoothScrollToPosition

针对 LineaderLayoutManager 还有一个很重要的方法：scrollToPositionWithOffset，下面逐一进行说明。

<!-- more -->

## scrollTo
```
public void scrollTo(int x, int y) {
    Log.w(TAG, "RecyclerView does not support scrolling to an absolute position. "
            + "Use scrollToPosition instead");
}
```
滑动到绝对位置，直接不支持。很皮~

## scrollBy & smoothScrollBy
基于当前位置进行相对滑动。
```
public void scrollBy(int x, int y) {
    if (mLayout == null) {
        Log.e(TAG, "Cannot scroll without a LayoutManager set. "
                + "Call setLayoutManager with a non-null argument.");
        return;
    }
    if (mLayoutFrozen) {
        return;
    }
    final boolean canScrollHorizontal = mLayout.canScrollHorizontally();
    final boolean canScrollVertical = mLayout.canScrollVertically();
    if (canScrollHorizontal || canScrollVertical) {
        scrollByInternal(canScrollHorizontal ? x : 0, canScrollVertical ? y : 0, null);
    }
}
```
根据布局的方向进行滑动。scrollByInternal 为具体处理滑动的方法，这里不贴了，它会调用 dispatchOnScrolled：
```
void dispatchOnScrolled(int hresult, int vresult) {
    mDispatchScrollCounter++;
    // Pass the current scrollX/scrollY values; no actual change in these properties occurred
    // but some general-purpose code may choose to respond to changes this way.
    final int scrollX = getScrollX();
    final int scrollY = getScrollY();
    onScrollChanged(scrollX, scrollY, scrollX, scrollY);

    // Pass the real deltas to onScrolled, the RecyclerView-specific method.
    onScrolled(hresult, vresult);

    // Invoke listeners last. Subclassed view methods always handle the event first.
    // All internal state is consistent by the time listeners are invoked.
    if (mScrollListener != null) {
        mScrollListener.onScrolled(this, hresult, vresult);
    }
    if (mScrollListeners != null) {
        for (int i = mScrollListeners.size() - 1; i >= 0; i--) {
            mScrollListeners.get(i).onScrolled(this, hresult, vresult);
        }
    }
    mDispatchScrollCounter--;
}
```
会调用到 mScrollListener.onScrolled，**也就是说可以与 ScrollListener 共同作用。**这里先提一下，后面做详细说明。
```
public void smoothScrollBy(int dx, int dy, Interpolator interpolator) {
    if (mLayout == null) {
        Log.e(TAG, "Cannot smooth scroll without a LayoutManager set. "
                + "Call setLayoutManager with a non-null argument.");
        return;
    }
    if (mLayoutFrozen) {
        return;
    }
    if (!mLayout.canScrollHorizontally()) {
        dx = 0;
    }
    if (!mLayout.canScrollVertically()) {
        dy = 0;
    }
    if (dx != 0 || dy != 0) {
        mViewFlinger.smoothScrollBy(dx, dy, interpolator);
    }
}
```
最终调用的是 mViewFlinger.smoothScrollBy，mViewFlinger 是 RecyclerView 内部的一个 Runnable，通过不停执行 postOnAnimation 来实现平滑滑动。

## scrollToPosition & smoothScrollToPosition
滑动到指定 position，也是可以直接或者平滑滑动。最后调用到的还是 LayoutManager 中的方法：
```
public void scrollToPosition(int position) {
    mPendingScrollPosition = position;
    mPendingScrollPositionOffset = INVALID_OFFSET;
    if (mPendingSavedState != null) {
        mPendingSavedState.invalidateAnchor();
    }
    requestLayout();
}
```
改了属性直接 requestLayout。看下：smoothScrollToPosition
```
public void smoothScrollToPosition(RecyclerView recyclerView, RecyclerView.State state,
        int position) {
    LinearSmoothScroller linearSmoothScroller =
            new LinearSmoothScroller(recyclerView.getContext());
    linearSmoothScroller.setTargetPosition(position);
    startSmoothScroll(linearSmoothScroller);
}
```
创建了一个 LinearSmoothScroller 来进行滑动，滑动也是调用的 RecyclerView 内部的 ViewFlinger 来实现的，它也会调用到 dispatchOnScrolled 方法，所以也可以与 ScrollListener 共用。

## scrollToPositionWithOffset
```
public void scrollToPositionWithOffset(int position, int offset) {
    mPendingScrollPosition = position;
    mPendingScrollPositionOffset = offset;
    if (mPendingSavedState != null) {
        mPendingSavedState.invalidateAnchor();
    }
    requestLayout();
}
```
与 scrollToPosition 几无二致，只不过带上了 offset。当 offset > 0，目标元素会距离顶部多出 offset 的距离，小于 0 则会被盖住 offset 的距离。注意：**当 mPendingScrollPositionOffset 为 INVALID_OFFSET 时，滑动表现是 SNAP_TO_ANY，否则为 SNAP_TO_START**，下面来具体说说。

## LinearSmoothScroller SNAP
```
/**
 * Align child view's left or top with parent view's left or top
 *
 * @see #calculateDtToFit(int, int, int, int, int)
 * @see #calculateDxToMakeVisible(android.view.View, int)
 * @see #calculateDyToMakeVisible(android.view.View, int)
 */
public static final int SNAP_TO_START = -1;

/**
 * Align child view's right or bottom with parent view's right or bottom
 *
 * @see #calculateDtToFit(int, int, int, int, int)
 * @see #calculateDxToMakeVisible(android.view.View, int)
 * @see #calculateDyToMakeVisible(android.view.View, int)
 */
public static final int SNAP_TO_END = 1;

/**
 * <p>Decides if the child should be snapped from start or end, depending on where it
 * currently is in relation to its parent.</p>
 * <p>For instance, if the view is virtually on the left of RecyclerView, using
 * {@code SNAP_TO_ANY} is the same as using {@code SNAP_TO_START}</p>
 *
 * @see #calculateDtToFit(int, int, int, int, int)
 * @see #calculateDxToMakeVisible(android.view.View, int)
 * @see #calculateDyToMakeVisible(android.view.View, int)
 */
public static final int SNAP_TO_ANY = 0;
```
根据注释很清晰了，SNAP_TO_START 为左上角对齐，SNAP_TO_END 为 右下角对齐，SNAP_TO_ANY 则是不限制，只要显示完对应 postion 的 Item 即可。
举个栗子：当前有 10个 Item。
1. 处于列表顶部，调用 scrollToPosition(5)，列表会从顶部定位到第 6 个 Item，且第 6 个 Item 位于屏幕最下方。
2. 处于列表底部，调用 scrollToPosition(5)，列表会从底部定位到第 6 个 Item，且第 6 个 Item 位于屏幕最上方。
3. 处于列表中部，第 6 个 Item 可见时调用 scrollToPosition(5)，界面不会发生任何改变。

这也就是网上众多文章吐槽 RecycleView 定位不准的原因了。因为默认是 SNAP_TO_ANY，RecycleView 处理起来就是让目标 position 的 Item 在列表中完全可见。如果目标是从底部滑上来，那么当目标完全可见时，滑动就会终止了，所以目标处理可见列表的最底端，反之亦然。当目标本身就是完全可见的，便不会做任何处理。所以，如若有定位目标必须处于列表顶端的需求，则可以这样：
```
RecyclerView.SmoothScroller smoothScroller = new LinearSmoothScroller(context) {
  	@Override protected int getVerticalSnapPreference() {
    	return LinearSmoothScroller.SNAP_TO_START;
  	}
};

smoothScroller.setTargetPosition(position);
layoutManager.startSmoothScroll(smoothScroller);
```

如果是底端则可以使用 SNAP_TO_END。

## addOnScrollListener
通常会有这种需求，监听 RecyclerView 滑动多少了，来改变标题栏的表现等需求。所以会有这样的代码：
```
private val onScrollListener = object : RecyclerView.OnScrollListener() {

    // 滑动的距离
    private var offsetY = 0

    override fun onScrolled(recyclerView: RecyclerView?, dx: Int, dy: Int) {
        super.onScrolled(recyclerView, dx, dy)
        offsetY += dy
        if (offsetY > DimenUtils.dp2px(100F)) {
            // do something
        }
    }
}
```
当滑动距离超过 100dp 则进行某些处理。上文有**可以与 ScrollListener 共同作用**这一说法，下面进行说明。
当设置了 onScrollListener 了之后，现在假设每个 Item 高度为 100， 现在处于第 2个 Item，那么 offsetY 的值为 100。现在分别执行下面几个操作：
1. scrollBy(200)：基于当前位置直接滑动 200 单位，会回调 onScrolled，dy 为 200，所以 offsetY 为 300，符合预期。
2. smoothScrollBy(200)：大体与 scrollBy 一直，只不过是平滑滑动，会多几个中间值，但最终结果是一样的。
3. scrollToPosition(3)：直接定位到 position 为 3 的位置，最终会调用 onScrolled（重新 layout 调用，而不是滑动操作调用），dy 为 0，offsetY 仍然为 100，即当前已经显示在第 4 个 Item 了，结果 offsetY 仍然为 100，这是有问题的。
4. smoothScrollToPosition(3)：会平滑定位到 position 为 3 的位置，与 smoothScrollBy 表现类似，最终结果与 1、2 一致。
5. scrollToPositionWithOffset(3)：与 3 表现一致，只不过允许 offset。

鉴于文章长度，没有粘贴测试代码及 Log，只是把现象描述出来，需要细心看看。综上所述：平滑滑动或相对滑动的方法可以与 onScrollListener 结合使用，scrollToPosition 和 scrollToPositionWithOffset 则不能与 onScrollListener 结合使用。

## scrollToPositionWithOffset & onScrollListener
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/article.png)
如上图，是一个文章详情页。
1. 需要监听 onScrollListener 来改变标题栏。
2. 文章是个列表，文章详情为一个 Item，每一条评论为一个 Item，新增一条评论时需要定位到这条评论。
3. 标题栏覆盖在列表之上。

直接使用 smoothScrollToPosition 会导致标题栏覆盖一部分评论，所以需要加上偏移。可惜上文得出的结论 scrollToPositionWithOffset 与 onScrollListener 无法结合使用。所以如何处理呢？
这里我保持 onScrollListener 不变，针对偏移采用曲线救国的方法：给详情 Item 添加一个 layout_marginBottom="-60dp"，给新增的一条评论添加 layout_marginBottom="60dp"，这样当使用 smoothScrollToPosition 定位到最新一条评论时，它距离顶部有 60 dp 的距离，如此便不会被覆盖了。这个想法与[Android 滑动吸顶效果](http://lastwarmth.win/2019/03/12/scroll/)是一致的，发现这个做法还真挺有用，哈哈~