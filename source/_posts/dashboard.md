---
title: Android自定义View实现仪表盘效果
date: 2016-05-16 14:41:26
tags:
 - Android 基础
---

本篇博客主要介绍如何实现一个仪表盘动态显示的效果，此效果来源于[买卖人](http://www.maimairen.com/)这个应用，3个室友有2个做安卓，而且都在``买卖人``，所以我也跟着实现了一波。
效果如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard1.gif)

<!-- more -->

## 实现思路
涉及到动画效果，首先将其拆分成``变化的部分``，和``不变的部分``。变化的部分有：颜色渐变的进度条、以及数字。不变的部分：指针刻度、灰色圆弧背景。拆分开来后，再来单独实现就非常简单了。
1. 渐变的进度条：通过``shader``，设置起点和终点的颜色，便能达到颜色渐变的一个效果了。
```
mShader = new RadialGradient(0, 0, (1080 - 300) / 2, 0xffde5669, 0xffe79950, Shader.TileMode.MIRROR);
```
2. 数字：直接调用``drawText``即可。
3. 指针刻度：先选取最好画的一个刻度，然后通过``旋转画布``重新绘制，就能画出所有的刻度了。（记得在画完之后要把画布归位）
4. 灰色圆弧背景：设置好参数，调用``drawArc``即可。
5. 动画效果：通过handler发送消息，改变变量值然后重绘就能实现了。

## 完整代码
```
public class DashboardView extends View {

    private Paint mPaint;
    private RectF rectF;
    private Shader mShader;

    private int targetDegree; // 目标角度
    private int currentDegree; // 当前角度
    private int currentNum; // 当前数值
    private int targetNum; // 目标数值

    public DashboardView(Context context) {
        super(context);
        init();
    }

    public DashboardView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public DashboardView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        mPaint = new Paint();
        rectF = new RectF();
        // 颜色渐变的shader
        mShader = new RadialGradient(0, 0, (1080 - 300) / 2, 0xffde5669, 0xffe79950, Shader.TileMode.MIRROR);
    }

    /**
     * 通过Handler发送消息，改变变量，重绘View
     */
    private Handler handler = new Handler() {
        @Override
        public void handleMessage(Message msg) {
            currentDegree += 5;
            currentNum += currentDegree / 1000f * 259;
            if (currentDegree < targetDegree) {
                handler.sendEmptyMessageDelayed(0, 5);
            } else {
                currentDegree = targetDegree;
                currentNum = targetNum;
            }
            invalidate();
        }
    };

    public void setNum(int num) {
        targetNum = num;
        targetDegree = (int) (targetNum / 1000f * 259);
        handler.sendEmptyMessageDelayed(0, 400);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        // 画大圆弧灰色背景
        mPaint.reset();
        mPaint.setFlags(Paint.ANTI_ALIAS_FLAG);
        mPaint.setColor(Color.GRAY);
        mPaint.setStrokeWidth(40);
        mPaint.setStyle(Paint.Style.STROKE);
        mPaint.setStrokeCap(Paint.Cap.ROUND);
        rectF.top = getMeasuredHeight() / 2 - getMeasuredWidth() / 4;
        rectF.left = getMeasuredWidth() / 4;
        rectF.right = getWidth() / 4 * 3;
        rectF.bottom = getMeasuredHeight() / 2 + getMeasuredWidth() / 4;
        canvas.drawArc(rectF, 140, 260, false, mPaint);

        // 通过旋转画布画指针刻度
        mPaint.reset();
        mPaint.setFlags(Paint.ANTI_ALIAS_FLAG);
        mPaint.setColor(Color.GRAY);
        mPaint.setStrokeWidth(3);
        canvas.drawLine(getMeasuredWidth() / 2, rectF.top + 40, getMeasuredWidth() / 2, rectF.top + 60, mPaint);
        for (int i = 0; i < 26; i++) {
            int degrees = (int) (10 * (i + 1) * Math.pow(-1, i));
            canvas.rotate(degrees, getWidth() / 2, getHeight() / 2);
            canvas.drawLine(getMeasuredWidth() / 2, rectF.top + 40, getMeasuredWidth() / 2, rectF.top + 60, mPaint);
        }
        canvas.rotate(130, getWidth() / 2, getHeight() / 2);

        // 画中间的小圆
        mPaint.reset();
        mPaint.setFlags(Paint.ANTI_ALIAS_FLAG);
        mPaint.setColor(Color.DKGRAY);
        canvas.drawCircle(getMeasuredWidth() / 2, getMeasuredHeight() / 2, 80, mPaint);

        // 画带颜色的进度条
        mPaint.reset();
        mPaint.setFlags(Paint.ANTI_ALIAS_FLAG);
        mPaint.setShader(mShader);
        mPaint.setStyle(Paint.Style.STROKE);
        mPaint.setStrokeWidth(40);
        mPaint.setStrokeCap(Paint.Cap.ROUND);
        canvas.drawArc(rectF, 140, currentDegree, false, mPaint);

        // 画Text
        mPaint.reset();
        mPaint.setFlags(Paint.ANTI_ALIAS_FLAG);
        mPaint.setColor(Color.parseColor("#ffde5669"));
        mPaint.setTextSize(70);
        canvas.drawText(String.valueOf(currentNum), getMeasuredWidth() / 2 - 55, getMeasuredHeight() / 2 + 25, mPaint);
    }
}
```
## 画笔相关
Style有三种。
STROKE：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard1.png)
FILL：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard2.png)
FILL_AND_STROKE：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard3.png)
StrokeCap也有三种。
BUTT：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard4.png)
SQUARE:
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard5.png)
ROUND：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/05/dashboard6.png)
## 最后
代码比较简单，在实现带动画的View时，最好先进行拆分，找出变化的部分和不变的部分，然后各自实现，将大问题拆分成若干个小问题，逐个击破。
