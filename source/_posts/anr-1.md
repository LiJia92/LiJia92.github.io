---
title: onDestroy 没有立刻执行
date: 2022-08-31 18:09:29
tags:
 - 日常开发
---
做了个需求：给按钮加个倒计时，时间到了之后触发点击事件（结束当前页面，打开另一个页面），当然也可以手动点击。
代码是这样写的：

<!-- more -->

```
viewBinding.jumpTv.setOnClickListener {
    LoginActivity.launch(it.context)
    finish()
}

job = lifecycleScope.launch {
    flow {
        for (i in 5 downTo 1) {
            emit(i)
            delay(1000)
        }
    }.onStart {
        viewBinding.jumpTv.text = "检测完成(5s)"
    }.onCompletion { cause ->
        if (cause == null) {
            viewBinding.jumpTv.performClick()
        }
    }.collect {
        viewBinding.jumpTv.text = "检测完成(${it}s)"
    }
}
```
感觉挺简单的一个需求，代码也比较清晰，利用协程的 flow 实现，相当好用。但是后面却发现一个问题：假设倒计时到两秒了，手动点击按钮，打开了新页面。然后等待约两秒，又会打开一次这个页面。很明显，第二次打开的页面是由这个 job 触发的：倒计时结束了。可代码里用的已经是 lifecycleScope 了，按道理 activity 执行 finish 之后，这个 job 就会失效了，为什么还会执行呢？
起初我查找了很久的资料，查阅 lifecycleScope 的相关特性，没发现什么问题。后面想了一下，先在 onDestroy 里打一个日志吧。结果发现 activity 执行 finish 之后，并没有很快的调用 onDestroy，等了差不多有十秒钟才执行，导致 lifecycleScope 一直是有效的状态，job 就会一直运行。
那么问题就很简单了：**activity 执行 finish 之后，为什么 onDestroy 没有立刻执行？**
这个问题比较普遍了，在网上一搜一大把，最终的结论大概就是：**主线程消息队列中有源源不断的同步消息屏障，让执行 onDestroy 的 IdleHandler 没有机会执行。但是会有一个十秒的兜底，也就是最多会延迟十秒就会执行 onDestroy。**
所以现在来排查一下启动的页面：LoginActivity。经过排查，发现 LoginActivity 确实会有动画效果：
```
private fun startAnimation() {
    if (!rotateAnimator.isStarted) {
        rotateAnimator.interpolator = LinearInterpolator()
        rotateAnimator.repeatCount = ValueAnimator.INFINITE
        rotateAnimator.setTarget(binding.circleIv)
        rotateAnimator.addUpdateListener {
            binding.circleIv.rotation = (it.animatedValue as Int).toFloat()
        }
        rotateAnimator.start()
    }
    scanAnimator?.apply {
        if (!isStarted) {
            interpolator = LinearInterpolator()
            repeatCount = ValueAnimator.INFINITE
            setTarget(binding.scanView)
            addUpdateListener {
                val height = it.animatedValue as Int
                val lp = binding.scanView.layoutParams
                lp.height = height
                binding.scanView.layoutParams = lp
            }
            start()
        }
    }
    binding.scanView.isVisible = true
}
```
将 LoginActivity 换成一个其他的简单 Activity，onDestroy 确实就很快的执行了。
显然不能通过改切换的页面来规避这个问题，只能把 job 手动 cancel 了：
```
viewBinding.jumpTv.setOnClickListener {
    job?.cancel()
    LoginActivity.launch(it.context)
    finish()
}
```
以后碰到类似问题，一定要**注意打开的页面是否有动画效果**。
后面有时间还得重新看一波 Handler 的消息发送机制啊~

## 参考
[Android 在执行完finish()方法后为什么没有立即执行onDestroy()](https://juejin.cn/post/7026950515560808462)
[Activity.onStop() 延迟10秒？检测、定位、修复它！](https://juejin.cn/post/7118901913793331207)
