---
title: Android任意View边沿渐变透明
date: 2017-02-16 10:04:39
tags:
 - 自定义View
---

之前在做直播产品的时候，有个需求：弹幕列表在滑入滑出的时候要有渐变效果。当时想了几种方案但是都没有做到满意的效果，后面便搁置了。直到我看到了这个库：[Android任意View边沿渐变透明](https://github.com/qinci/EdgeTranslucent)，看了下效果，正是我当时需要的。虽然时过境迁，现在没有在意这个需求了，但是从心底里还是想知道它是如何实现的。
![](https://raw.githubusercontent.com/qinci/EdgeTranslucent/master/image/image.gif)

<!-- more -->

---
将代码clone下来后，发现代码其实就一个类：
```
public class EdgeTransparentView extends FrameLayout {
    private Paint mPaint;
    private int position;
    private float drawSize;

    private int topMask = 0x01;
    private int bottomMask = topMask << 1;
    private int leftMask = topMask << 2;
    private int rightMask = topMask << 3;

    private int mWidth;
    private int mHeight;

    public EdgeTransparentView(Context context) {
        this(context, null);
    }

    public EdgeTransparentView(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public EdgeTransparentView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context, attrs);
    }

    private void init(Context context, AttributeSet attrs) {
        mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        mPaint.setStyle(Paint.Style.FILL);
        mPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_OUT));


        final TypedArray typedArray = context.obtainStyledAttributes(attrs, R.styleable.EdgeTransparentView);
        position = typedArray.getInt(R.styleable.EdgeTransparentView_edge_position, 0);
        drawSize = typedArray.getDimension(R.styleable.EdgeTransparentView_edge_width, Utils.d2p(getContext(), 20));
        typedArray.recycle();
    }


    @Override
    protected void dispatchDraw(Canvas canvas) {
        super.dispatchDraw(canvas);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        initShader();
        mWidth = getWidth();
        mHeight = getHeight();
    }

    //渐变颜色
    private int[] mGradientColors = {0xffffffff, 0x00000000};
    //渐变位置
    private float[] mGradientPosition = new float[]{0, 1};

    private void initShader() {
        mPaint.setShader(new LinearGradient(0, 0, 0, drawSize, mGradientColors, mGradientPosition, Shader.TileMode.CLAMP));
    }


    @Override
    protected boolean drawChild(Canvas canvas, View child, long drawingTime) {
        int layerSave = canvas.saveLayer(0, 0, getWidth(), getHeight(), null, Canvas.ALL_SAVE_FLAG);
        boolean drawChild = super.drawChild(canvas, child, drawingTime);
        if (position == 0 || (position & topMask) != 0) {
            canvas.drawRect(0, 0, mWidth, drawSize, mPaint);
        }

        if (position == 0 || (position & bottomMask) != 0) {
            int save = canvas.save();
            canvas.rotate(180, mWidth / 2, mHeight / 2);
            canvas.drawRect(0, 0, mWidth, drawSize, mPaint);
            canvas.restoreToCount(save);
        }

        int offset = (mHeight - mWidth) / 2;
        if (position == 0 || (position & leftMask) != 0) {
            int saveCount = canvas.save();
            canvas.rotate(90, mWidth / 2, mHeight / 2);
            canvas.translate(0, offset);
            canvas.drawRect(0 - offset, 0, mWidth + offset, drawSize, mPaint);
            canvas.restoreToCount(saveCount);
        }

        if (position == 0 || (position & rightMask) != 0) {
            int saveCount = canvas.save();
            canvas.rotate(270, mWidth / 2, mHeight / 2);
            canvas.translate(0, offset);
            canvas.drawRect(0 - offset, 0, mWidth + offset, drawSize, mPaint);
            canvas.restoreToCount(saveCount);
        }

        canvas.restoreToCount(layerSave);
        return drawChild;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
    }
}
```
这里开始一点点分析与学习。
1. 自定义属性：
```
<resources>
    <!--边沿透明View-->
    <declare-styleable name="EdgeTransparentView">
        <attr name="edge_position">
            <flag name="top" value="0x01"/>
            <flag name="bottom" value="0x02"/>
            <flag name="left" value="0x04"/>
            <flag name="right" value="0x08"/>
        </attr>

        <attr name="edge_width" format="dimension"/>
    </declare-styleable>
</resources>
```
定义了2个属性，一个是要透明的边（上下左右），一个是要透明的宽度。这里利用0x01、0x02十六进制这样的标识，后面再通过“&”操作符来用于标志位的判断真是个不错的idea。

2. 渐变：
代码中的渐变是利用给画笔设置shader来实现的。关键代码：
```
mPaint.setShader(new LinearGradient(0, 0, 0, drawSize, mGradientColors, mGradientPosition, Shader.TileMode.CLAMP));
```
看下LinearGradient的构造函数：
```
/** Create a shader that draws a linear gradient along a line.
    @param x0           The x-coordinate for the start of the gradient line
    @param y0           The y-coordinate for the start of the gradient line
    @param x1           The x-coordinate for the end of the gradient line
    @param y1           The y-coordinate for the end of the gradient line
    @param  colors      The colors to be distributed along the gradient line
    @param  positions   May be null. The relative positions [0..1] of
                        each corresponding color in the colors array. If this is null,
                        the the colors are distributed evenly along the gradient line.
    @param  tile        The Shader tiling mode
*/
public LinearGradient(float x0, float y0, float x1, float y1, int colors[], float positions[],
        TileMode tile) {
    if (colors.length < 2) {
        throw new IllegalArgumentException("needs >= 2 number of colors");
    }
    if (positions != null && colors.length != positions.length) {
        throw new IllegalArgumentException("color and position arrays must be of equal length");
    }
    mType = TYPE_COLORS_AND_POSITIONS;
    mX0 = x0;
    mY0 = y0;
    mX1 = x1;
    mY1 = y1;
    mColors = colors;
    mPositions = positions;
    mTileMode = tile;
    init(nativeCreate1(x0, y0, x1, y1, colors, positions, tile.nativeInt));
}
```
可以知道前面4个参数都是设置起始、结束坐标。colors是渐变的颜色：0xffffffff-->0x00000000，tile是shader mode。
```
public enum TileMode {
    /**
     * replicate the edge color if the shader draws outside of its
     * original bounds
     */
    CLAMP   (0),
    /**
     * repeat the shader's image horizontally and vertically
     */
    REPEAT  (1),
    /**
     * repeat the shader's image horizontally and vertically, alternating
     * mirror images so that adjacent images always seam
     */
    MIRROR  (2);

    TileMode(int nativeInt) {
        this.nativeInt = nativeInt;
    }
    final int nativeInt;
}
```
3. 画：在drawChild中，会优先调用``super.drawChild(canvas, child, drawingTime);``因为我们的layer要遮罩在子View上，才能有这种效果，所以画layer一定要在其之后执行。根据position的判断，来判断上下左右4条边哪些边需要画layer，通过旋转画布来画不同的边，画完后恢复现场，进行下一个判断。

4. setXfermode：可能刚开始会没注意到这个方法的调用，但是它的作用不可谓不大。看到核心代码：
```
mPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_OUT));
```
这个便是给画笔设置xfermode，没有这句代码效果可就很不如意咯。这里便要拓展学习一下了，贴一下[爱哥的博客](http://blog.csdn.net/aigestudio/article/details/41316141)。
