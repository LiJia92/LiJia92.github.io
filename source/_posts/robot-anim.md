---
title: 动画小记
date: 2022-02-17 15:59:05
tags:
 - 日常开发
---
嗯，产品需求要将[语音机器人交互实现](http://lastwarmth.win/2021/03/24/robot)文中的动画效果进行修改，改成什么样呢？
演示视频太大了，随便截了几个图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG217.png)

<!-- more -->

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG218.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG219.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG220.png)
可以看到，整体变简洁了，整体效果主要有两个动画：
1. 背景框缩小的动画，同时圆角慢慢变大；
2. 中间提示文案的闪烁效果，变灰然后变亮；
机器人上下眨眼睛的动画，搞个 Gif 图就完事儿了，让我自己画也是画不出来的![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh24.gif)。

## 缩小动画
因为有圆角改变的动画，所以单独弄个图，ImageView 进行缩放是实现不了的：没法改变圆角。然后找到一个可以设置圆角的类：GradientDrawable。那么思路就比较明确了：先说服设计背景色就使用渐变色实现![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh124.gif)，下面就好实现了：
```
private val drawable = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Color.parseColor("#1B3461"), Color.parseColor("#0A1C42")))

private fun zoomOut() {
    val anim = ValueAnimator.ofFloat(0F, 1F)
    anim.duration = 200
    anim.addUpdateListener {
        val value: Float = it.animatedValue as Float
        val width = maxWidth - (maxWidth - minWidth) * value
        val height = maxHeight - (maxHeight - minHeight) * value
        val radius = minRadius + (maxRadius - minRadius) * value
        drawable.cornerRadius = radius
        val lp = viewBinding.bgView.layoutParams
        lp.width = width.toInt()
        lp.height = height.toInt()
        viewBinding.bgView.layoutParams = lp
        viewBinding.bgView.background = drawable
        if (value == 1F) {
            // 动画完成做些事情
        }
    }
}
```
使用属性动画，计算每一刻的属性，然后赋值即可。需要放大的时候，将动画返回来即可。

## 文字闪烁
文字闪烁的动画应该是在哪里见过的，但是一时想不起来了，搜索的时候也找不准关键字，于是找我的大腿舍友询问一波：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG215.jpeg)
于是思路就来了：给 Paint 设置渐变的 Shader(LinearGradient)，然后改变 Shader 的坐标或者位移，就可以实现动画效果了。代码如下：
```
class ShiningTextView(context: Context, attrs: AttributeSet?) : View(context, attrs) {

    private val tipList = context.resources.getStringArray(R.array.voice__robot_tips)
    private var tipIndex = -1
    private var text = nextTip()
    private var mHeight = 0
    private var mWidth = 0
    private var distance = 0f
    private var mBaseline = 0f
    private val paint = Paint()
    private val mMatrix = Matrix()
    private var darkGradient: LinearGradient? = null
    private var lightGradient: LinearGradient? = null

    init {
        paint.isAntiAlias = true
        paint.textSize = context.resources.getDimension(R.dimen.text_53)
        paint.color = Color.parseColor("#FAFBFB")
        val fontMetrics = paint.fontMetrics
        distance = (fontMetrics.bottom - fontMetrics.top) / 2 - fontMetrics.bottom
        darkGradient = LinearGradient(0f, 0f, 100f, 0f, Color.parseColor("#48597f"), Color.WHITE, Shader.TileMode.CLAMP)
        lightGradient = LinearGradient(0f, 0f, 100f, 0f, Color.WHITE, Color.parseColor("#48597f"), Shader.TileMode.CLAMP)
        mMatrix.setTranslate(-100f, 0f)
        darkGradient?.setLocalMatrix(mMatrix)
        paint.shader = darkGradient
    }

    fun dark() {
        MainScope().launch {
            delay(2000L)
            val darkAnim = ValueAnimator.ofFloat(0F, 1F)
            darkAnim.duration = 200
            darkAnim.addUpdateListener {
                val value = it.animatedValue as Float
                mMatrix.setTranslate(-100f + mWidth * value, 0f)
                darkGradient?.setLocalMatrix(mMatrix)
                paint.shader = darkGradient
                invalidate()
                if (value == 1F) {
                    light()
                }
            }
            darkAnim.start()
        }
    }

    private fun light() {
        text = nextTip()
        val lightAnim = ValueAnimator.ofFloat(0F, 1F)
        lightAnim.duration = 200
        lightAnim.addUpdateListener {
            val value = it.animatedFraction as Float
            mMatrix.setTranslate(100f + mWidth * value, 0f)
            lightGradient?.setLocalMatrix(mMatrix)
            paint.shader = lightGradient
            invalidate()
            if (value == 1F) {
                dark()
            }
        }
        lightAnim.start()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawText(text, 0f, mBaseline, paint)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        mHeight = h
        mWidth = w
        mBaseline = mHeight / 2 + distance
    }

    /**
     * 返回下一个 Tip
     */
    private fun nextTip(): String {
        tipIndex++
        return tipList[tipIndex.rem(tipList.size)]
    }
}
```
几点 Tips:
1. 给 LinearGradient 设置 Matrix，使用 Matrix 进行 translate，就可以一点点改变文本的颜色。
2. drawText 的第二个参数是 baseline 的值，所以需要结合画笔的设置，计算 baseline。
