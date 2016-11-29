---
title: Android自定义View实现弧形SeekBar
date: 2016-04-27 13:53:19
tags:
 - 自定义View
---

## 前言
项目开发中有这样一个需求：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/seekbar4.png)
通过滑动SeekBar来控制打赏金额，金额设置5个档次。

看到设计稿的时候，除了自定义View想不到什么更好的方法了。自定义View一直是我的短板，内心总会有点抗拒，总感觉自己做不出来。最近一段时间，也是有意无意的练习自定义View。最后决定还是用自定义View来实现这次的需求。

根据设计图，我分为3个步骤：
1. 画弧线。
2. 画圆球。
3. 触摸事件的处理，并提供对外接口。

<!-- more -->

## 画弧线
### 圆弧
起初的想法是根据自定义View的宽高，创建一个正方形，然后画一个内切圆，截取其中的一段圆弧。大致就是这样的：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/seekbar1.png)
假设这样的圆存在，那么对于View的宽高有一个要求:
假定宽为a，高为b，x为半径。取一个直角三角形，勾股定理能得出这样的公式：
```
(a/2)*(a/2) + (x-b)*(x-b) = x*x;
```
化简得到:
```
x = b/2 + (a*a) / (8*b)
```
假设若成立，那么``x-b>0``,得到
```
a > 2b
```
即对View的宽高有一个这样的硬性要求，才能符合预期。

另外，后续还需要画圆球，圆球的圆心肯定是需要在弧线上的，那么我每次画圆球时，圆心的坐标都需要通过三角函数来获得，会显得比较麻烦。考虑再三便放弃这种做法了。

### 抛物线
晚上下班回家，跟室友讨论了一波这个问题，我室友当场来了个：``抛物线``。后面一想：卧槽？确实可以啊。直接确定3个点，就能确定抛物线的公式了，这样对于后续画圆球，求圆心的坐标也非常简单。于是打算第二天来做一波。

第二天。

网上一查，没查到android关于画抛物线的方法。我的内心：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/seekbar3.jpg)
于是便也放弃了这种做法。

### 贝塞尔
网上查阅资料的时候，关于弧线说的最多的就是利用贝塞尔曲线。
关于贝塞尔曲线的更多介绍可以参考[这篇文章](http://blog.csdn.net/androidzhaoxiaogang/article/details/8680330)。

二阶贝塞尔曲线符合我的情况，于是选取的二阶贝塞尔曲线。
贝塞尔曲线的关键代码如下：
```
path.moveTo(pointF1.x, pointF1.y);
path.quadTo(pointF2.x, pointF2.y, pointF3.x, pointF3.y);
canvas.drawPath(path, paint);
```
pointF1是起始点，pointF2是控制点，pointF3是终止点。
采用贝塞尔曲线实现的效果还不错，只是控制点是不在曲线上的，曲线无法与View的顶部相切，但也无伤大雅了。

## 画圆球
画圆球就比较简单了，计算出圆心坐标直接画圆即可。
```
// 二阶贝塞尔曲线公式计算坐标
float t = (currentX / (right - left));
float x = (1 - t) * (1 - t) * pointF1.x + 2 * (t) * (1 - t) * pointF2.x + t * t * pointF3.x;
float y = (1 - t) * (1 - t) * pointF1.y + 2 * (t) * (1 - t) * pointF2.y + t * t * pointF3.y;
circleCenter.set(x, y);
paint.reset();
paint.setFlags(Paint.ANTI_ALIAS_FLAG);
paint.setColor(Color.WHITE);
paint.setStyle(Paint.Style.FILL);
canvas.drawCircle(x, y, RADIUS, paint);
```
二阶贝塞尔曲线的公式是这样的：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/seekbar2.png)
我们把当前的横坐标currentX对于View宽度的比例作为t。

## 触摸事件处理&对外接口
触摸事件无非就是重写``onTouchEvent``，这里我只对横坐标做了处理，只要横着滑，就能滑动圆球了，并没有处理纵坐标。
1. ACTION_DOWN：判断点下的坐标是否在圆球返回内（我设置了20的误差），若不在圆球内，则直接返回false，那么后续就不会接收ACTION_MOVE等其他事件了。若在则返回true，接收后续的ACTION_MOVE等事件。
2. ACTION_MOVE：获取x坐标，然后设置currentX，重绘。对外的接口也是在这里调用。
3. default：当手指移出或者离开View时，利用Scroller使圆球平滑滑到距离最近的档次。

下面上完整代码：
```
public class CustomArcSeekBar extends View {

    private Scroller scroller;
    private Paint paint;
    private Path path;
    private PointF pointF1; // 起始点
    private PointF pointF2; // 控制点
    private PointF pointF3; // 终止点
    private PointF circleCenter; // 圆心的坐标
    private int top;
    private int right;
    private int bottom;
    private int left;
    private float currentX; // 当前x坐标，用于控制圆球位置
    private int currentLevel; // 当前档次
    private OnProgressChangedListener listener;

    private final static float RADIUS = 30f; // 圆球半径
    private final static float LEVEL = 6f; // 设置档次

    public CustomArcSeekBar(Context context) {
        super(context);
        init(context);
    }

    public CustomArcSeekBar(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public CustomArcSeekBar(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        paint = new Paint();
        path = new Path();
        pointF1 = new PointF();
        pointF2 = new PointF();
        pointF3 = new PointF();
        circleCenter = new PointF();
        scroller = new Scroller(context);
    }

    @Override
    public void computeScroll() {
        if (scroller.computeScrollOffset()) {
            currentX = scroller.getCurrX();
            postInvalidate();
        }
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
        pointF1.set(0, bottom - top);
        pointF2.set((right - left) / 2, -(bottom - top) / 2);
        pointF3.set(right, bottom - top);
        currentX = (right - left) / LEVEL;
        currentLevel = 1;
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

        // 通过x坐标，计算圆心的坐标，画圆
        float t = (currentX / (right - left));
        float x = (1 - t) * (1 - t) * pointF1.x + 2 * (t) * (1 - t) * pointF2.x + t * t * pointF3.x;
        float y = (1 - t) * (1 - t) * pointF1.y + 2 * (t) * (1 - t) * pointF2.y + t * t * pointF3.y;
        circleCenter.set(x, y);
        paint.reset();
        paint.setFlags(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.WHITE);
        paint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(x, y, RADIUS, paint);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                float downX = event.getX();
                float downY = event.getY();
                float distance = (downX - circleCenter.x) * (downX - circleCenter.x) + (downY - circleCenter.y) * (downY - circleCenter.y);
                // 计算到圆球中心的距离，考虑20的误差
                return !(distance - (RADIUS + 20) * (RADIUS + 20) > 0);
            case MotionEvent.ACTION_MOVE:
                float moveX = event.getX();
                currentX = moveX; // 通过x坐标重绘圆球
                invalidate();
                currentLevel = getLevel(moveX);
                if (listener != null) {
                    listener.OnProgressChanged(currentLevel);
                }
                break;
            default:
                // 当手指移出或者离开View时，圆球平滑滑到最近的档次
                scroller.startScroll((int) currentX, 0, (int) ((right - left) / LEVEL * currentLevel - currentX), 0, 200);
                postInvalidate();
                break;
        }
        return super.onTouchEvent(event);
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

    /**
     * 滑动接口
     */
    public interface OnProgressChangedListener {
        void OnProgressChanged(int level);
    }
}
```
## 使用
在代码中使用，非常简单，在布局文件中引用：
```
<com.lastwarmth.viewstudy.CustomArcSeekBar
    android:id="@+id/seek_bar"
    android:layout_width="match_parent"
    android:layout_height="100dp"
    android:layout_marginTop="40dp"
    android:background="@color/colorAccent" />

<TextView
    android:id="@+id/seek_bar_progress"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:text="1"
    android:textSize="30sp" />
```
代码中：
```
final TextView textView = (TextView) findViewById(R.id.seek_bar_progress);
CustomArcSeekBar seekBar = (CustomArcSeekBar) findViewById(R.id.seek_bar);
seekBar.setListener(new CustomArcSeekBar.OnProgressChangedListener() {
    @Override
    public void OnProgressChanged(int level) {
        textView.setText(String.valueOf(level));
    }
});
```
最终效果：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/seekbareffect.gif)
算是达到我的预期。

<font size=5>[源码链接](https://github.com/LiJia92/CustomArcSeekBar)</font>

## 小结
1. 自定义View在绘制矩形、圆等图形时，使用的坐标是要相对于View本身的，而不是相对于屏幕的坐标。
2. 使用贝塞尔曲线能获得不错的曲线效果。
3. Paint在画完1个东西之后记得reset，然后重新设置值，不然画笔的属性一样，得到的效果就不对。
