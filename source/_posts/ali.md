---
title: 记一次阿里云推流问题排查的辛酸历史
date: 2022-02-18 15:16:51
tags:
 - 日常开发
---
说下问题背景：App 接入摄像头，摄像头产生的每一帧数据（byte 数组），经由阿里云推流的 api 推到监控中心。
摄像头的管理用 HandlerThread 实现，当摄像头打开之后，拿到每一帧的数据回调出去。

<!-- more -->

```
/**
 * 每一帧的数据
 */
override fun onFrame(frame: ByteBuffer) {
    val len = frame.capacity()
    if (yuv == null || yuv!!.size != len) {
        yuv = ByteArray(len)
    }
    frame.get(yuv!!)
    callback.onPreviewFrame(device, yuv!!)
}

/**
 * 摄像头需要的回调
 */
interface UsbCameraCallback {
    /**
     * 帧数据回调
     */
    fun onPreviewFrame(cameraDevice: UsbDevice?, data: ByteArray)
}
```
最终会回调到推流管理类的 onFrame 方法：
```
override fun onFrame(byteArray: ByteArray, width: Int, height: Int, stride: Int, size: Int, timeUs: Long, rotation: Int) {
    frameLost = false
    FpsUtils.compute()
    if (isPushStart == true) {
        mAlivcLivePusher?.inputStreamVideoData(byteArray, width, height, stride, size, timeUs, rotation)
    }
}
```
就这样将摄像头产生的流推到监控中心了，同时监控中心可以下发指令来开启或者关闭推流。
在测试过程中，发现一个问题：**监控中心的画面会出现偶发性的黑屏，通过下发开启推流指令也无法恢复。**
于是从帧数据产生的源头，将数据传递的每一个方法中都打上了日志，然后观察日志。发现源数据生产的日志都没有了，也就是说摄像头自身都没有产生数据了，并且发现每次黑屏都会有特定的日志出现。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG221.png)
然后找到 **释放推流** 日志的地方：
```
private fun releasePush() {
    JLog.normal("释放推流")
    reconnectJob?.cancel()
    pushScope?.cancel()
    mAlivcLivePusher?.setLivePushNetworkListener(null)
    kotlin.runCatching {
        mAlivcLivePusher?.stopPush()
    }
    kotlin.runCatching {
        mAlivcLivePusher?.destroy()
    }
    reconnectJob = null
    pushScope = null
    mAlivcLivePusher = null
    isPushStart = null
}
```
仔细分析：onFrame 产生的数据是从摄像头的 HandlerThread 中回调出来的，直接调用阿里云的 inputStreamVideoData 方法进行推流，在子线程。而这个 releasePush 是接受 LiveData 的值进行调用的，是在主线程。
所以就有理由怀疑了：**mAlivcLivePusher 的 inputStreamVideoData、stopPush、destroy 这些方法，并不是线程安全的。主线程调用 stopPush、destroy 之后，再在子线程调用 inputStreamVideoData，可能内部发生死锁或者其他的什么原因，导致子线程直接挂了，或者阻塞了，不能正常生产数据了**。
查看阿里云推流的文档中也没看到相关的描述。只能简单实验一把：**将 onFrame 的回调放到主线程**。然后打包测试，监控中心的画面可以持续很久的正常展示了，不论下发多少次开启、关闭的指令，流都可以正常关闭、推送了。
为了确保问题解决，需要更多的信息。可惜 mAlivcLivePusher 的方法都是 native 的，看不到什么有用的东西，只能使用其他方法从侧面进行验证了。
将线程修改先还原，在 inputStreamVideoData 调用前，调用后打上日志，同时加上 try catch 看是否可以看到可以的日志：
```
JLog.normal("push in")
try {
    mAlivcLivePusher?.inputStreamVideoData(byteArray, width, height, stride, size, timeUs, rotation)
} catch (e: Throwable) {
    JLog.normal("push error:" + e.message)
}
JLog.normal("push out")
```
出现黑屏情况时，看到日志只有 in 没有 out，也没有 error。这已经可以初步验证猜想了：**推送的线程已经被玩坏了**。
继续使用 Android Studio 的 Profiler 来查看线程的状态。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG222.png)
正常时线程是可以工作的状态，出现黑屏之后线程就变成了持续的 sleeping 了。
至此问题基本解决，将帧数据回调改成主线程，重新打包发布，目前没有问题反馈。

## 感慨
问题排查的过程远没有文章描述的简单，它耗费三个人力，一整天的时间才排查到。抱着怀疑一切的态度，从数据产生开始，一层一层抽丝剥茧。怀疑过数据回调监听失效了，也怀疑 HandlerThread 因为某些原因被回收了，后面一点点地才将日志链路补全，再根据日志理性分析可能的原因。然后进行验证，解决之后继续验证，最终将问题解决。
主要代码不是一个人写的，某同事负责摄像头的封装，某同事负责阿里云的接入，就很容易忽略这类线程问题。另外，这阿里云推流的文档是真的简单，碰到问题找客服下工单估计几天就过去了，只能自己排查。
经此一役，得给自己提个醒了，自己封装代码时需要指明回调的线程，方便他人使用。集成 SDK 严格按照文档来，文档说明不充分的，尽量一个线程里使用。
