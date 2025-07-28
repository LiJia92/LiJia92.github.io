---
title: Android PAG 之初体验
date: 2023-04-26 14:51:42
tags:
 - Android 进阶
---
基于公司发展，App 需要配合不定期的进行一次大版本更新。改动主要是启屏页的产品宣传，以及应用主页的 UI 效果。说白了，动画越来越花哨，让人感觉起来更加“高大上”。已经经历过启屏的好几个版本更新了，每次更新都需要配合实现一大堆的动画效果，以及与设计师沟通切图细节等等，十分花费精力。这不，近期又来了一个启屏升级的需求，设计效果感觉都快和游戏差不多了，纯安卓也能做，但是很多光效、粒子等效果，最快的实现方式还是切图。在与设计师沟通的过程中，设计师提供了另一种实现思路：PAG。于是顺着这个思路研究了一下，最终觉得这个方案更好，在此记录一下。

## PAG 简介
> PAG 即 Portable Animated Graphics，是一套完整的动效工作流解决方案。
目标是降低或消除动效相关的研发成本，能够一键将设计师在 AE（Adobe After Effects）中制作的动效内容导出成素材文件，并快速上线应用于几乎所有的主流平台。

<!-- more -->

是由腾讯开源的一套动效解决方案，和之前的 Lottie 相似，二者有各自的优劣势。网上关于多种动画方案的对比有很多，这里只摘录一个图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG564.jpeg)

## 集成
gradle 依赖：
```
implementation 'com.tencent.tav:libpag:4.2.61'
```
混淆：
```
# pag
-keep class org.libpag.** {*;}
-keep class androidx.exifinterface.** {*;}
```
使用：
```
pagFile = PAGFile.Load(getAssets(), "demo.pag");
pagView.setComposition(pagFile);
pagView.setRepeatCount(0);
pagView.play();
```
非常简单明了了。

## 真实场景
将 PAG 库集成之后，准备嵌入到真实项目里。需求是这样的：启屏先是执行一段版本动画，然后出来一些元素，元素全部显示完之后进行“弹一弹”动效。因为启屏页要做很多事情，也不确定什么时候做完，所以需要动画有循环播放的能力。假设启屏时间无限长，那就需要动画重复播放后面的“弹一弹”特效。
起初尝试了用两个 PAG 结合 PAGComposition 实现：
```
val pagFile1 = PAGFile.Load(assets, "first.pag")
val pagFile2 = PAGFile.Load(assets, "second.pag")
val composition = PAGComposition.Make(pagFile1.width(), pagFile1.height())
pagFile1.setTimeStretchMode(PAGTimeStretchMode.None)
pagFile1.setStartTime(0)
pagFile1.setDuration(8000000)
pagFile2.setTimeStretchMode(PAGTimeStretchMode.Repeat)
pagFile2.setStartTime(8000000)
pagFile2.setDuration(7200 * 100000 * 1000000L)
composition.addLayer(pagFile1)
composition.addLayer(pagFile2)
binding.pagView1.composition = composition
binding.pagView1.setRepeatCount(0)
binding.pagView1.play()
```
启屏动画前八秒是第一段，后八秒是重复动效，所以从后八秒开始，需要循环播放。但研究下来使用 PAGComposition 设置循环播放好像只能通过 setDuration 来。于是将 pageFile2 的 duration 设置成尽可能大。
调试下来，发现 first.pag 切到 second.pag 会有个短暂的“卡顿”，感受很明显。然后尝试准备用两个 PAGView 来实现：
```
val pagFile1 = PAGFile.Load(assets, "first.pag")
val pagFile2 = PAGFile.Load(assets, "second.pag")
var startTime = System.currentTimeMillis()
binding.pagView1.addListener(object : PAGViewListener {

    override fun onAnimationEnd(p0: PAGView?) {
        binding.pagView1.visibility = View.GONE
        binding.pagView2.visibility = View.VISIBLE
        binding.pagView2.play()
    }
})
binding.pagView1.composition = pagFile1
binding.pagView1.play()
binding.pagView2.composition = pagFile2
binding.pagView2.flush()
binding.pagView2.setRepeatCount(0)
```
第一个 pagView 动画执行完之后消失，第二个 pagView 显示然后开始无限循环播放。
但是很可惜，测试下来，仍然会有切换的“卡顿”感受。继续研究了一阵，没有发现很好的办法，逛论坛时发现可以通过 setProgress 来控制动画进度，于是转变了思路：使用一个 PAG 动画，当动画执行完之后，手动设置进度到 0.5。代码如下：
```
val pagFile = PAGFile.Load(assets, "total.pag")
binding.pagView.composition = pagFile
binding.pagView.setRepeatCount(0)
binding.pagView.addListener(object : PAGImageViewListener {
    override fun onAnimationRepeat(p0: PAGImageView?) {
        binding.pagView.pagFile.progress = 0.5
    }
})
binding.pagView.composition = pagFile
binding.pagView.play()
```
测试下来，感受不到“卡顿”了。虽然动画从最后一帧，一下子切到一半进度的那一帧，有些许不连贯，但是已经达到期望效果了。

## 优化
不论使用一个 PAG 还是两个 PAG 方案时，都发现一个问题：前八秒的动画执行到某一刻，总会很明显的卡一下。前面八秒的动画设计到品牌宣传，必须得优化好。通过 addPAGFlushListener，发现有时候刷新间隔竟然超过了 200ms。于是将当前进度也打出来，发现总是固定的 0.21 左右的进度时，flush 间隔会比较久，导致感受到卡顿。
```
binding.pagView.addPAGFlushListener(object : PAGView.PAGFlushListener {
    override fun onFlush() {
        if (flushTime == 0L) {
            flushTime = System.currentTimeMillis()
        } else {
            val current = System.currentTimeMillis()
            val tmp = current - flushTime
            if (tmp > 100) {
                Log.e("PAG", "progress:" + binding.pagView.progress + "，duration:" + tmp)
            }
            flushTime = current
        }
    }
})
```
观察 PAG 动画，大概就是 0.2 进度时，会展示全屏的背景动画。怀疑是全屏尺寸(1920*1080)太大，导致内存一下子上涨，从而引起卡顿。那能不能提前将这一帧缓冲好，等缓冲好了再从头开始播放动画呢？当然是可以的。只是设置缓冲进度时，View 必须可见，那么就必须搞个黑色背景盖在上面了。当缓冲完事开始播放动画时，再将这个黑色背景移除掉。最终代码如下：
```
val pagFile = PAGFile.Load(activity.assets, "splash.pag")
binding.pagView.composition = pagFile
binding.pagView.progress = 0.21
binding.pagView.addPAGFlushListener(object : PAGView.PAGFlushListener {
    override fun onFlush() {
        binding.pagView.removePAGFlushListener(this)
        binding.pagView.addPAGFlushListener(object : PAGView.PAGFlushListener {
            override fun onFlush() {
                binding.maskView.visibility = View.GONE
                binding.pagView.removePAGFlushListener(this)
            }
        })
        binding.pagView.progress = 0.0
        binding.pagView.addListener(object : SimplePAGViewListener() {
            override fun onAnimationRepeat(p0: PAGView?) {
                binding.pagView.progress = 0.5
            }
        })
        binding.pagView.setRepeatCount(0)
        binding.pagView.play()
    }
})
```
测试下来效果还不错，产品、设计、研发都比较满意，几天的辛苦没有白费。附上一个测试视频：
<video src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/demo.mp4" width="640" height="400" controls="controls">
Your browser does not support the video tag.
</video>
另外有个点需要注意下，PAG 文件是有分辨率的，当 View 宽高和这个分辨率不一致时，可能会有黑边。项目设备分辨率是固定的 1920*1080，但是当导航栏出现时，会占用一定的高度，导致左右有黑边。于是给启屏页设置了这样的 flag：
```
window.decorView.apply {
    systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
}
```
这样的话导航栏将盖在 activity 之上，不会影响 activity 的宽高了。

## 总结
通过 PAG 方案实现了新的启屏效果，后续若有类似的版本升级，只需要设计师设计新的 PAG 文件即可，达到了一劳永逸的效果。当然也可以直接使用视频实现，但是视频占用空间会更大，也没有 PAG 这样代码控制灵活。这是第一次使用 PAG，在研究的过程中，越来越佩服这样的技术了，极大的改善了动画交付效果。
保持 open，虚心学习吧！

## 参考
1. [PAG 官网](https://pag.art/)
2. [PAG 论坛](https://bbs.pag.art/)
3. [PAG Github](https://github.com/Tencent/libpag)
4. [PAG 安卓文档](https://pag.art/api.html#/apis/android/org/libpag/package-summary.html)
5. [PAG 动效方案使用总结](https://juejin.cn/post/7220375870228185146)
