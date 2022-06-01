---
title: Dialog 新姿势
date: 2022-05-31 16:16:34
tags:
 - 日常开发
---
近日测试同学报了一个 bug，当界面展示了雷达距离弹窗时，登录页面的按钮竟然还可以点击，点击 EditText 可以唤醒系统键盘，但是点击系统键盘后无法输出到 EditText 上。布局大概是这样：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG354.png)

<!-- more -->

负责这个的同事请假了，只能自己看代码排查了，看了下弹窗的类：
```
class RadarSignalDialog(context: Context) : Dialog(context, R.style.out_side_click_dialog)
```
确实是继承自 Dialog 的，在我之前的认知中：Dialog 出现后，下面的布局是无法点击的，必须要把 Dialog 消失掉才可以点击。可为什么会出现这个情况呢？
看到 Dialog 类的具体实现，发现如下代码：
```
window?.setFlags(
    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
)
window?.setFlags(
    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
)
```
于是 Google 这些 Flag 的作用：
> FLAG_NOT_TOUCH_MODAL：Window flag: even when this window is focusable (its FLAG_NOT_FOCUSABLE is not set), allow any pointer events outside of the window to be sent to the windows behind it.
FLAG_NOT_FOCUSABLE：Window flag: this window won't ever get key input focus, so the user can not send key or other button events to it.
FLAG_WATCH_OUTSIDE_TOUCH：Window flag: if you have set FLAG_NOT_TOUCH_MODAL, you can set this flag to receive a single special MotionEvent with the action MotionEvent.ACTION_OUTSIDE for touches that occur outside of your window.

所以就很了然了：**即使是 Dialog，也可以通过给 Window 设置 Flag 来达到 Dialog 外的 View 也可以被点击**。
为了修复 EditText 无法输入的问题，我将 Flag 改成了 FLAG_NOT_FOCUSABLE。但是如果弹窗内部也有 EditText，就无法获取焦点，也没法输入了。所以，当 Dialog 内、外都有 EditText 时，是没办法两全的，届时就得考虑其他方法实现了，比如系统浮窗。
所以后面如果有类似的场景，可以直接使用 Dialog 设置 Flag，比系统浮窗会更方便，同时也避免了系统浮窗的权限问题。这一波是涨姿势了~

## 题外话
实现一个自定义 View，让 Dialog 可以像系统浮窗一样，随意拖动：
```
class ScrollableView : FrameLayout {
    constructor(context: Context) : this(context, null)
    constructor(context: Context, attrs: AttributeSet?) : this(context, attrs, 0)
    constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(context, attrs, defStyleAttr)

    private var lastX = 0f
    private var lastY = 0f

    private var onScrollListener: OnScrollListener? = null

    fun setScrollListener(onScrollListener: OnScrollListener) {
        this.onScrollListener = onScrollListener
    }

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        when (ev.action) {
            MotionEvent.ACTION_DOWN -> {
                lastX = ev.x
                lastY = ev.y
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = ev.x - lastX
                val dy = ev.y - lastY
                if (abs(dx) > ViewConfiguration.get(context).scaledTouchSlop
                    || abs(dy) > ViewConfiguration.get(context).scaledTouchSlop
                ) {
                    return true
                }
            }
        }
        return false
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_MOVE) {
            onScrollListener?.onScroll(
                ((event.x - lastX) / 3).toInt(), ((event.y - lastY) / 3).toInt()
            )
        }
        return true
    }

    interface OnScrollListener {
        fun onScroll(distanceX: Int, distanceY: Int)
    }
}

viewBinding.scrollableView.setScrollListener(object : ScrollableView.OnScrollListener {
    override fun onScroll(distanceX: Int, distanceY: Int) {
        val params = window?.attributes ?: return
        params.x += distanceX
        params.y -= distanceY
        checkValidPos()
        onWindowAttributesChanged(params)
    }
})
```
实现思路很新颖，记录一下，万一以后用得到呢。
