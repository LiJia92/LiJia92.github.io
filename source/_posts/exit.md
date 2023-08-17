---
title: Android 结合 Unity 彻底退出应用
date: 2023-08-17 15:44:59
tags:
 - 日常开发
---
最近测试频繁出现一个问题：在登录页点关闭车机，倒计时结束后，应用卡住不动了，不一会便弹应用无响应的弹窗了。

<!-- more -->

倒计时退出相关代码是这样的：
```
fun LifecycleOwner.exitCountDown(viewBinding: LayoutExitAppBinding, onExit: () -> Unit) {
    lifecycleScope.launch {
        flow {
            for (i in 5 downTo 1) {
                emit(i)
                delay(1000)
            }
        }.onStart {
            viewBinding.root.visibility = View.VISIBLE
        }.onCompletion {
            onExit()
        }.collect {
            viewBinding.countDownTv.text = it.toString()
        }
    }
}


private fun exitCountDown() {
    exitCountDown(viewBinding.countDownCl) {
        exit()
    }
}

/**
 * 退出
 */
private fun exit() {
    finishUnity()
    finish()
}

/**
 * 主动退出登录页面，如果 Unity 页面还存活，要 finish 掉
 */
private fun finishUnity() {
    val activity = weakReference?.get()
    activity?.finish()
}

@JvmStatic
fun launch(context: Context) {
    val isUnityPage = isUnityPage(context)
    if (isUnityPage == true) {
        val activity = ActivityUtils.getActivity(context) ?: return
        weakReference = WeakReference(activity)
    }
    ActivityUtils.startIntent(context, Intent(context, LoginActivity::class.java))
}
```
登录页启动时，会判断 context 是否是 Unity Activity，如果是的话，用 weakReference 保存起来。当需要退出时，调用各自的 finish 方法，从而退出应用。
通过拉取 trace 日志，发现如下信息：
> "main" prio=5 tid=1 Native
  | group="main" sCount=1 dsCount=0 obj=0x752fa640 self=0xed585400
  | sysTid=29419 nice=-10 cgrp=default sched=0/0 handle=0xf0303534
  | state=S schedstat=( 814378259296 185199035946 982842 ) utm=65595 stm=15842 core=3 HZ=100
  | stack=0xff47d000-0xff47f000 stackSize=8MB
  | held mutexes=
  kernel: __switch_to+0x8c/0xb4
  kernel: hrtimer_nanosleep+0x98/0x13c
  kernel: compat_SyS_nanosleep+0xa8/0x114
  kernel: el0_svc_naked+0x24/0x28
  native: #00 pc 00049560  /system/lib/libc.so (nanosleep+12)
  native: #01 pc 003af7a3  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #02 pc 0041e0b7  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #03 pc 00261560  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libmonobdwgc-2.0.so (mono_chain_signal+180)
  native: #04 pc 000713c0  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libmonobdwgc-2.0.so (???)
  native: #05 pc 00001f71  /system/bin/app_process32 (InvokeUserSignalHandler+156)
  native: #06 pc 0014b687  /system/lib/libart.so (_ZN3art12FaultManager11HandleFaultEiP7siginfoPv+222)
  native: #07 pc 000170a4  /system/lib/libc.so (???)
  native: #08 pc 002e28ce  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #09 pc 002e285f  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #10 pc 002a6ad9  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #11 pc 002a668b  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #12 pc 002a6671  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #13 pc 00205531  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #14 pc 0020545b  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #15 pc 00204b5d  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  native: #16 pc 00cc7acd  /data/app/cn.mucang.android.jiakaoyi.teachingk2-1/lib/arm/libunity.so (???)
  at com.unity3d.player.NativeLoader.unload(Native method)
  at com.unity3d.player.UnityPlayer.unloadNative(unavailable:-1)
  at com.unity3d.player.UnityPlayer.destroy(unavailable:-1)
  at com.unity3d.player.UnityPlayer.quit(unavailable:-1)
  at cn.mucang.android.jiakaoyi.unity.activity.UnityMainActivity.finish(UnityMainActivity.java:92)

看到 Unity 代码，在 Unity Activity 退出的时候，会调用 UnityPlayer 的 destroy 方法，最后在 unload 方法时出现了 anr。libunity.so 也没法改，于是尝试使用另外的思路退出应用：**直接手动杀进程**。
将 exit 方法改成如下：
```
private fun exit() {
    Process.killProcess(Process.myPid())
}
```
倒计时结束后，App 确实会退出，但是立刻又会将 Unity Activity 给拉起来，这不符合预期，继续尝试。
```
private fun exit() {
    System.exit(status)
}
```
和之前的情况一致，再继续尝试。
```
private fun exit() {
    moveTaskToBack(true)
    exitProcess(1)    // kotlin 方法，实际也是调用的 System.exit
}
```
发现 App 确实正常退出了。但是当手动点击应用图标尝试启动时，App 直接从 Unity Activity 启动了，前置的起屏页等页面都没有执行。很奇怪，继续尝试。
```
private fun exit() {
    finishAffinity()
    exitProcess(0)
}
```
如此之后，App 正常退出了。点击图标启动时，也是正常地从起屏页开始，问题终于解决。没想到，结合 Unity 的一个 App 退出的功能竟然花费了大量时间。

在当前场景（单进程）中，通过测试，exitProcess(0)、exitProcess(1)、Process.killProcess(Process.myPid()) 三个方法退出进程，并没有什么明显的不同。值得一提的是 exitProcess 方法会有 activity 正常退出的动画效果，相对平滑一点。而 killProcess 会直接顿一下，然后回到桌面。故采用的 exitProcess 方式。

通过后续了解，大概知道一些东西：
> System.exit() does not kill your app if you have more than one activity on the stack. What actually happens is that the process is killed and immediately restarted with one fewer activity on the stack. This is also what happens when your app is killed by the Force Close dialog, or even when you try to kill the process from DDMS. This is a fact that is entirely undocumented, to my knowledge.

当栈里有超过一个 activity 时，System.exit() 并不会直接杀掉 App。它会立刻重启栈里的 fewer activity。这就和测试的现象吻合啊，会把 Unity Activity 给重启。但是这个并没有一个官方的文档解释，只是开发者的一个经验讲述。

当添加 moveTaskToBack 后，会将任务栈放到后台，这个时候再去结束进程就不会重新拉起 Activity 了。猜测是都处于后台了，就没有必要去重新拉起了。但是点击图标时，可能系统认为上一次不是正常退出，还保留着之前任务栈，于是会从最底部的 Activity 给重新启动。盲猜一把：如果结束进程的时间足够长，系统应该不会保留任务栈，从而将应用从起屏页重新打开。待测试。

当使用 finishAffinity 方法时，它会将栈里的所有 activity 都 finish 掉，那么栈里超过一个 activity 的限制条件便不存在了，这个时候结束进程便可以正常结束了，App 重新启动也是正常启动了。

## 参考
1. [How to exit an Android app programmatically?](https://stackoverflow.com/questions/17719634/how-to-exit-an-android-app-programmatically)
2. [Is quitting an application frowned upon?](https://stackoverflow.com/questions/2033914/is-quitting-an-application-frowned-upon)
3. [Android 彻底关闭----退出程序](https://blog.csdn.net/Chen_xiaobao/article/details/86641743)
