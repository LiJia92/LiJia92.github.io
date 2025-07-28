---
title: Android感悟之造轮子
date: 2016-09-12 11:17:11
tags:
 - Android 进阶
---

最近项目要添加一个点赞的效果，类似[这篇文章所说](http://www.jianshu.com/p/03fdcfd3ae9c)，其实效果是差不多的，便打算直接拿来用了，感谢这位大大制作的轮子~

而后自己思考了一下，怎么样的轮子别人用起来才方便呢？为了实现``方便``，其实我们能做的事情有很多，这里说一下自己的感悟。

下面我便拿着我之前写的一个自定义弧形SeekBar来说明，将其抽成一个三方库要做哪些事。

<!-- more -->

之前的代码结构是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/09/wheel1.png)
引用的时候是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/09/wheel2.png)
这显然是非常笨重的引用方式，那么改如何改进呢？

## Library
第一个最先想到的自然是将代码抽成一个library。然后项目要引用时候，直接gradle添加依赖即可。
选择``New Module``，选择``Android Library``即可，然后将代码放在``src/main/java/包名``文件夹下，添加``compile project(':library')``依赖即可。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/09/wheel3.png)

## 精简引用方式
之前的代码要用，我需要xml中引入三个自定义View，显得很繁杂。站在使用者的角度，若是只用引入一个自定义View，便简单多了。
至于球的大小，球的颜色等独立的属性，通过自定义属性来进行设置即可。

下面上一下修改后的代码，ArcSeekBarParent类：
```
public class ArcSeekBarParent extends FrameLayout implements SeekBarBallView.OnSmoothScrollListener {

    private PointF pointF1;                     // 起始点
    private PointF pointF2;                     // 控制点
    private PointF pointF3;                     // 终止点
    private PointF circleCenter;                // 球的坐标
    private int top;
    private int right;
    private int bottom;
    private int left;
    private float currentX;                     // 当前x坐标，用于控制圆球位置
    private final static float LEVEL = 6f;      // 设置档次
    private int currentLevel = 1;               // 当前档次

    private OnProgressChangedListener listener; // 档次改变的监听
    private Context context;

    private SeekBarBallView ball;               // 球
    private SeekBarArcView arc;                 // 弧
    private int ballSize;                       // 球的大小
    private String ballColor;                   // 球的颜色
    private int arcWidth;                       // 弧的宽度
    private String arcColor;                    // 弧的颜色

    public ArcSeekBarParent(Context context) {
        super(context);
        init();
    }

    public ArcSeekBarParent(Context context, AttributeSet attrs) {
        super(context, attrs);
        this.context = context;
        TypedArray array = context.obtainStyledAttributes(attrs, R.styleable.ArcSeekBarParent);
        ballSize = array.getDimensionPixelSize(R.styleable.ArcSeekBarParent_ballSize, 30);
        arcWidth = array.getDimensionPixelSize(R.styleable.ArcSeekBarParent_arcWidth, 10);
        ballColor = array.getString(R.styleable.ArcSeekBarParent_ballColor);
        arcColor = array.getString(R.styleable.ArcSeekBarParent_arcColor);
        array.recycle();
        init();
    }

    private void init() {
        pointF1 = new PointF();
        pointF2 = new PointF();
        pointF3 = new PointF();
        circleCenter = new PointF();

        // 添加弧线View
        if (arcColor == null) {
            arcColor = "#000000";      // 当没有设置颜色时候，默认使用黑色
        }
        arc = new SeekBarArcView(context, arcColor, arcWidth);
        arc.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        addView(arc);

        // 添加球View
        if (ballColor == null) {
            ballColor = "#FFFFFF";      // 当没有设置颜色时候，默认使用白色
        }
        ball = new SeekBarBallView(context, ballColor, ballSize);
        ball.setListener(this);
        addView(ball);
    }

    public void setListener(OnProgressChangedListener listener) {
        this.listener = listener;
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
SeekBarArcView类：
```
public class SeekBarArcView extends View {

    private Paint paint;
    private Path path;
    private PointF pointF1;     // 起始点
    private PointF pointF2;     // 控制点
    private PointF pointF3;     // 终止点
    private String arcColor;    // 弧的颜色
    private int arcWidth;       // 弧的宽度

    public SeekBarArcView(Context context, String arcColor, int arcWidth) {
        super(context);
        this.arcColor = arcColor;
        this.arcWidth = arcWidth;
        init();
    }

    private void init() {
        paint = new Paint();
        path = new Path();
        pointF1 = new PointF();
        pointF2 = new PointF();
        pointF3 = new PointF();
        // 初始化画笔
        paint.setFlags(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.parseColor(arcColor));
        paint.setStrokeWidth(arcWidth);
        paint.setStyle(Paint.Style.STROKE);
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
        path.moveTo(pointF1.x, pointF1.y);
        path.quadTo(pointF2.x, pointF2.y, pointF3.x, pointF3.y);
        canvas.drawPath(path, paint);
    }
}
```
SeekBarBallView类：
```
public class SeekBarBallView extends View {

    private Paint paint;
    private Scroller scroller;
    private int ballSize;
    private String ballColor;
    private OnSmoothScrollListener listener;

    public SeekBarBallView(Context context, String ballColor, int ballSize) {
        super(context);
        this.ballColor = ballColor;
        this.ballSize = ballSize;
        init(context);
    }

    private void init(Context context) {
        scroller = new Scroller(context);
        paint = new Paint();
        paint.setFlags(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.parseColor(ballColor));
        paint.setStyle(Paint.Style.FILL);
    }

    public void setListener(OnSmoothScrollListener listener) {
        this.listener = listener;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int spec = MeasureSpec.makeMeasureSpec(ballSize, MeasureSpec.EXACTLY);
        setMeasuredDimension(spec, spec);
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
以及自定义属性attr.xml：
```
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <declare-styleable name="ArcSeekBarParent">
        <attr name="ballColor" format="string" />
        <attr name="ballSize" format="dimension" />
        <attr name="arcWidth" format="dimension" />
        <attr name="arcColor" format="string" />
    </declare-styleable>
</resources>
```
修改后，在使用的时候只用这样：
```
<com.android.lovesixgod.library.ArcSeekBarParent
        android:id="@+id/seek_bar"
        android:layout_width="match_parent"
        android:layout_height="100dp"
        android:layout_marginTop="40dp"
        android:background="@color/colorAccent"
        app:arcColor="#000000"
        app:arcWidth="3dp"
        app:ballColor="#00ffff"
        app:ballSize="30dp" />
```
相比之前简单了不少。
代码中再设置档次改变的监听响应即可直接使用了：
```
ArcSeekBarParent seekBar = (ArcSeekBarParent) findViewById(R.id.seek_bar);
seekBar.setListener(new ArcSeekBarParent.OnProgressChangedListener() {
    @Override
    public void OnProgressChanged(int level) {
        textView.setText(String.valueOf(level));
    }
});
```

代码已更新至[Github](https://github.com/LiJia92/CustomArcSeekBar)。
