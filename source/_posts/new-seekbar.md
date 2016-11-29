---
title: Android自定义View实现弧形SeekBar（续）
date: 2016-04-28 16:13:36
tags:
 - 自定义View
---

## 问题
在我的[上一篇文章](http://lastwarmth.site/2016/04/27/seekbar/)中，写了自定义弧形SeekBar，效果达到了自己的预期，于是高高兴兴回家了。但是后面手贱，在家里自己随意玩了玩，发现SeekBar滑动几下之后再滑动就会变得特别卡。然后查看代码，短时间内没什么头绪。

没错，这个时候又要祭出我的室友了。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/new-seekbar1.jpg)
室友之前是做rom相关的，对于android系统工具用得很熟。然后他拿着我的手机打开开发者选项中的``GPU呈现模式分析``，运行了一下程序，滑了一会之后就这样了：

<!-- more -->

![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/new-seekbar3.png)
我们可以看到一条绿线，这条绿线代表的是60帧，超过这条线就代表不足60帧，那么人眼看起来就会感觉卡顿，可以看到超出了好多了，难怪会很卡~。

那么问题可以大致定位到``绘制View的方法不够科学``。

那么怎样才能科学呢？其实我也没答案。但是大致有了一个思路：绘制好弧线和圆球之后，在滑动的时候不再重绘弧线和圆球，仅仅改变圆球的位置，这样就会少了很多的绘制操作。如此实现的话或许便能解决问题了。但也只是假设，下面开始实战。

## 解决方案
我将代码拆分成3个类：继承自FrameLayout的``ArcSeekBarParent``，``SeekBarArcView``以及``SeekBarBallView``。
ArcSeekBarParent代码：
```
public class ArcSeekBarParent extends FrameLayout implements SeekBarBallView.OnSmoothScrollListener {

    private PointF pointF1; // 起始点
    private PointF pointF2; // 控制点
    private PointF pointF3; // 终止点
    private PointF circleCenter; // 球的坐标
    private int top;
    private int right;
    private int bottom;
    private int left;
    private float currentX; // 当前x坐标，用于控制圆球位置
    private final static float LEVEL = 6f; // 设置档次
    private int currentLevel = 1; // 当前档次

    private OnProgressChangedListener listener;

    private SeekBarBallView ball;

    public ArcSeekBarParent(Context context) {
        super(context);
        init();
    }

    public ArcSeekBarParent(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public ArcSeekBarParent(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        pointF1 = new PointF();
        pointF2 = new PointF();
        pointF3 = new PointF();
        circleCenter = new PointF();
    }

    public void setListener(OnProgressChangedListener listener) {
        this.listener = listener;
    }

    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();
        ball = (SeekBarBallView) getChildAt(1);
        ball.setListener(this);
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        pointF1.set(0, bottom - top - 30);
        pointF2.set((right - left) / 2, -(bottom - top) / 4);
        pointF3.set(right, bottom - top - 30);
        currentX = (right - left) / LEVEL;
        changeBallLayout(currentX);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                float downX = event.getX();
                float downY = event.getY();
                float distance = (downX - circleCenter.x) * (downX - circleCenter.x) + (downY - circleCenter.y) * (downY - circleCenter.y);
                // 计算到圆球中心的距离，考虑20的误差
                return !(distance - (ball.getMeasuredWidth() / 2 + 20) * (ball.getMeasuredWidth() / 2 + 20) > 0);
            case MotionEvent.ACTION_MOVE:
                float moveX = event.getX();
                currentX = moveX; // 通过x坐标改变圆球的位置
                changeBallLayout(currentX);
                currentLevel = getLevel(moveX);
                if (listener != null) {
                    listener.OnProgressChanged(currentLevel);
                }
                break;
            default:
                // 当手指移出或者离开View时，圆球平滑滑到最近的档次
                ball.smoothScrollLevel((int) currentX, (int) ((right - left) / LEVEL * currentLevel - currentX));
                break;
        }
        return super.onTouchEvent(event);
    }

    /**
     * 改变球的位置
     *
     * @param currentX 横坐标
     */
    private void changeBallLayout(float currentX) {
        float t = (currentX / (right - left));
        float x = (1 - t) * (1 - t) * pointF1.x + 2 * (t) * (1 - t) * pointF2.x + t * t * pointF3.x;
        float y = (1 - t) * (1 - t) * pointF1.y + 2 * (t) * (1 - t) * pointF2.y + t * t * pointF3.y;
        circleCenter.set(x, y);
        ball.layout((int) (circleCenter.x - ball.getMeasuredWidth() / 2), (int) (circleCenter.y - ball.getMeasuredWidth() / 2), (int) (circleCenter.x + ball.getMeasuredWidth() / 2), (int) (circleCenter.y + ball.getMeasuredWidth() / 2));
    }

    /**
     * 计算档次
     *
     * @param x 横坐标
     * @return 档次
     */
    private int getLevel(float x) {
        float ratio = (x / (right - left)) * LEVEL;
        // 计算距离哪个档次最近
        int result = new BigDecimal(ratio).setScale(0, BigDecimal.ROUND_HALF_UP).intValue();
        if (result < 1) {
            result = 1;
        } else if (result > (LEVEL - 1)) {
            result = (int) (LEVEL - 1);
        }
        return result;
    }

    @Override
    public void onSmoothScroll(int currentX) {
        changeBallLayout(currentX);
    }

    /**
     * 滑动接口
     */
    public interface OnProgressChangedListener {
        void OnProgressChanged(int level);
    }
}
```
SeekBarArcView代码：
```
public class SeekBarArcView extends View {

    private Paint paint;
    private Path path;
    private PointF pointF1; // 起始点
    private PointF pointF2; // 控制点
    private PointF pointF3; // 终止点

    public SeekBarArcView(Context context) {
        super(context);
        init();
    }

    public SeekBarArcView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public SeekBarArcView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        paint = new Paint();
        path = new Path();
        pointF1 = new PointF();
        pointF2 = new PointF();
        pointF3 = new PointF();
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        pointF1.set(0, bottom - top - 30);
        pointF2.set((right - left) / 2, -(bottom - top) / 4);
        pointF3.set(right, bottom - top - 30);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        // 画2阶贝塞尔曲线
        paint.setFlags(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.GRAY);
        paint.setStrokeWidth(10);
        paint.setStyle(Paint.Style.STROKE);
        path.moveTo(pointF1.x, pointF1.y);
        path.quadTo(pointF2.x, pointF2.y, pointF3.x, pointF3.y);
        canvas.drawPath(path, paint);
    }
}
```
SeekBarBallView代码：
```
public class SeekBarBallView extends View {

    private Paint paint;
    private Scroller scroller;
    private OnSmoothScrollListener listener;

    public SeekBarBallView(Context context) {
        super(context);
        init(context);
    }

    public SeekBarBallView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public SeekBarBallView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        paint = new Paint();
        scroller = new Scroller(context);
    }

    public void setListener(OnSmoothScrollListener listener) {
        this.listener = listener;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(widthMeasureSpec, widthMeasureSpec);
    }

    @Override
    public void computeScroll() {
        if (scroller.computeScrollOffset()) {
            if (listener != null) {
                listener.onSmoothScroll(scroller.getCurrX());
                postInvalidate();
            }
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        paint.reset();
        paint.setFlags(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.WHITE);
        paint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(getMeasuredWidth() / 2, getMeasuredWidth() / 2, getMeasuredWidth() / 2, paint);
    }

    /**
     * 平滑滑动
     *
     * @param start    起始值
     * @param distance 滑动距离
     */
    public void smoothScrollLevel(int start, int distance) {
        scroller.startScroll(start, 0, distance, 0, 200);
        postInvalidate();
    }

    public interface OnSmoothScrollListener {
        void onSmoothScroll(int currentX);
    }
}
```
可以看到代码基本都是差不多的，只不过我将之前的View拆分成一个ViewGroup，绘制弧线的``SeekBarArcView``和绘制圆球的``SeekBarBallView``。在ACTION_MOVE的时候，我只是使用ball.layout()方法，即只改变圆球的layout，而没有重绘整个SeekBar。

添加xml引用：
```
<com.android.lovesixgod.customarcseekbar.seekbar.ArcSeekBarParent
    android:id="@+id/seek_bar"
    android:layout_width="match_parent"
    android:layout_height="100dp"
    android:layout_marginTop="40dp"
    android:background="@color/colorAccent">

    <com.android.lovesixgod.customarcseekbar.seekbar.SeekBarArcView
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <com.android.lovesixgod.customarcseekbar.seekbar.SeekBarBallView
        android:layout_width="20dp"
        android:layout_height="100dp" />

</com.android.lovesixgod.customarcseekbar.seekbar.ArcSeekBarParent>
```
然后运行，进行滑动。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/new-seekbar2.png)
可以看到GPU分析显示的线条基本不会超过绿线，滑起来也没有明显的卡顿，问题应该算是解决了~

代码已更新至[Github](https://github.com/LiJia92/CustomArcSeekBar)。

## 小结
1. 自定义View的时候尽量避免不变View的重绘。因为弧形线这个View是没有任何改变的，但是还不停地重绘，可能就会导致这样的性能问题了。
2. Scroller的使用是针对View的，对于ViewGroup好像是无效的，所以我将Scroller写在了``SeekBarBallView``中。另外Scroller要能正常使用，在``startScroll()``以及``computeScroll()``需要``invalidate()``或者``postInvalidate``。
3. 多使用相关工具，来观察代码的性能。
