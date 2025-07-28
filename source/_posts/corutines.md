---
title: Kotlin 协程小实践
date: 2021-10-15 14:34:25
tags:
 - Android 进阶
---
太久没有注重 Android 开发知识了，打算学习下协程，算是未来的趋势吧。二话不多说，凯哥视频三连~
[Kotlin 的协程「用力瞥一眼」](https://www.bilibili.com/video/BV164411C7FK)
[Kotlin 协程的挂起好神奇好难懂？今天我把它的皮给扒了](https://www.bilibili.com/video/BV1KJ41137E9)
[到底什么是「非阻塞式」挂起？协程真的比线程更轻量级吗？](https://www.bilibili.com/video/BV1JE411R7hp)

站在凯哥的肩膀上，我大概建立了以下几个概念：
1. 协程就是一个线程框架，它可以很方便地进行线程切换；
2. 非阻塞式挂起，也就是协程内部切线程了，所以当前调用协程的线程不会被阻塞，它可以继续做其他的事情。假设协程内部不切线程，那么其实也是阻塞（同步）的；
3. 使用协程可以将异步代码平铺，看起来就像同步代码一样，避免线程切换的各种回调和缩进。

所以当有切线程这样的场景时，就可以使用协程了。

<!-- more -->
## 举个栗子
一个方案「启用」按钮，点击之后需要告诉服务器：我现在要启用这个方案了，服务器返回成功了之后，需要更新 UI，当前这个方案被启用。同时，这个方案启用了之后，有一些后续的事情需要做：加载这个方案的资源数据，是一个耗时任务。
现在看看代码是怎么写的：
```
holder.viewBinding.enableTv.setOnClickListener {
    lifecycleScope.launch {
        val dialog = JLoadingDialog(this@PlanActivity)
        dialog.showLoading("正在启用")
        val result = enablePlan(item)
        // 启用成功了才走后面的逻辑
        if (result) {
            PlanUtil.savePlanId(item.id)
            adapter.notifyDataSetChanged()
            syncRes()
            MainThreadUtils.toast("启用成功")
        } else {
            MainThreadUtils.toast("启用失败")
        }
        dialog.safeDismiss()
    }
}
```
然后 2 个 suspend 方法：
```
/**
 * 启用方案
 */
suspend fun enablePlan(item: PlanItemModel): Boolean {
    var result = false
    withContext(Dispatchers.IO) {
        try {
            result = PlanApi().enablePlan(item.id)
        } catch (e: Exception) {
            LogUtils.e("TAG", e.toString())
        }
    }
    return result
}

/**
 * 同步资源
 */
suspend fun syncRes() {
    withContext(Dispatchers.IO) {
        ResourceManager.syncData(null, mutableListOf(ResourceManager.Resource.Plan))
    }
}
```
简单看一下，使用 lifecycleScope.launch 开启一个协程，这个协程是在主线程里调用的，那么这个协程的 context 就是 Dispatchers.Main。然后展示一个 loading 弹窗，当前也在主线程，没问题。然后调用 suspend 方法：enablePlan。内部用了 withContext 切换到 IO 线程了，也就是从这个时候开始，线程从主线程切到子线程去了，主线程就是正常的挂起，同时可以处理其他的 UI 消息，并不会阻塞。然后子线程就会去执行网络请求，当网络请求执行完了，就会走到 return result 返回结果。因为用的是协程，所以当协程代码执行完了之后，会自动切回调用协程的那个线程，在这个场景里，也就是主线程了。所以 result 后面的代码就是在主线程了，网络请求成功之后，本地更新数据，并且调用 adapter.notifyDataSetChanged() 更新 UI。这个并不会报错，因为协程自动切回了主线程。随后再切到子线程执行 syncRes() 方法，当这个方法执行完之后，又自动切回主线程然后 Toast 启用成功。
可以看到，我们用同步代码块的方式，实现了 2 次主线程、子线程切换的效果，代码平铺，没有任何切换回调和缩进。

## 日志
上面的一顿分析猛如虎，那么实际情况是不是这样呢？打个日志验证一下：
```
holder.viewBinding.enablePlan.setOnClickListener {
    lifecycleScope.launch {
        LogUtils.e("coroutines", "isMainThread1:" + MainThreadUtils.isMainThread())
        val dialog = JLoadingDialog(this@PlanrActivity)
        dialog.showLoading("正在启用")
        val result = enablePlan(item)
        LogUtils.e("coroutines", "isMainThread5:" + MainThreadUtils.isMainThread())
        // 启用成功了才走后面的逻辑
        if (result) {
            PlanUtil.savePlanId(item.id)
            adapter.notifyDataSetChanged()
            syncRes()
            LogUtils.e("coroutines", "isMainThread7:" + MainThreadUtils.isMainThread())
            MainThreadUtils.toast("启用成功")
        } else {
            MainThreadUtils.toast("启用失败")
        }
        dialog.safeDismiss()
    }
}
```
```
/**
 * 启用方案
 */
suspend fun enablePlan(item: TeachPlanItemModel): Boolean {
    LogUtils.e("coroutines", "isMainThread2:" + MainThreadUtils.isMainThread())
    var result = false
    withContext(Dispatchers.IO) {
        try {
            LogUtils.e("coroutines", "isMainThread3:" + MainThreadUtils.isMainThread())
            result = PlanApi().enablePlan(item.id)
        } catch (e: Exception) {
            LogUtils.e("TAG", e.toString())
        }
    }
    LogUtils.e("coroutines", "isMainThread4:" + MainThreadUtils.isMainThread())
    return result
}

/**
 * 同步资源
 */
suspend fun syncRes() {
    withContext(Dispatchers.IO) {
        LogUtils.e("coroutines", "isMainThread6:" + MainThreadUtils.isMainThread())
        ResourceManager.syncData(null, mutableListOf(ResourceManager.Resource.Plan))
    }
}
```
看下打的日志：
```
isMainThread1:true
isMainThread2:true
isMainThread3:false
isMainThread4:true
isMainThread5:true
isMainThread6:false
isMainThread7:true
```
可以看到，完全符合分析，**只有被 withContext(Dispatchers.IO) 包裹的代码是运行在子线程的**。
enablePlan 这个方法，就可以理解为：起一个子线程做耗时任务，任务执行完之后返回结果。就有点像带返回值的线程，也就是 Java 里的 Callable + FutureTask 的组合。后续可以研究一下内部实现。

## 小结
1. 协程切换线程之后，会自动切回调用的线程，假设我们用正常的代码写这样的功能，大概会是这样：
```
holder.viewBinding.enablePlan.setOnClickListener {
    val dialog = JLoadingDialog(this@PlanActivity)
    dialog.showLoading("正在启用")
    // 切线程
    ThreadUtils.execute {
        try {
            val result = PlanApi().enablePlan(item.id)
            if (result) {
                // 我再切
                MainThreadUtils.post {
                    PlanUtil.savePlanId(item.id)
                    adapter.notifyDataSetChanged()

                    // 我还切
                    ThreadUtils.execute {
                        ResourceManager.syncData(null, mutableListOf(ResourceManager.Resource.Plan))

                        // 我切切切
                        MainThreadUtils.post {
                            MainThreadUtils.toast("启用成功")
                        }
                    }
                }
            } else {
                MainThreadUtils.post {
                    dialog.safeDismiss()
                }
                MainThreadUtils.toast("启用失败")
            }
        } catch (e: Exception) {
            MainThreadUtils.post {
                dialog.safeDismiss()
            }
            MainThreadUtils.toast("启用失败")
        }
    }
}
```
这线程切得也太累了，这个场景还非常简单，假设场景再复杂一点，写起来就更麻烦了。
可能有人会说，协程的方式单独写了 2 个方法，所以看起来简洁一点，如果把正常的代码也封装下方法，其实也差不多了。我只能说：too young too simple，naive!
**不使用协程，手动切换线程所带来的回调和缩进，是很难避免的。**
2. suspend 方法只是一个标记，标记这个方法是协程方法，需要在协程里进行调用。假设 suspend 方法体内部没有用到任何协程的代码，那么这个标记是可以去掉的，不要把它想得太玄乎。
3. 挂起其实就是切线程切走了，所以当前线程不会被阻塞，可以继续做其他的事情。但是一个网络请求，总是会有一个线程去等待请求返回结果的，结果返回之前，这个线程就会一直等待，也就是阻塞了，没有任何方法或者途径，可以减去这个线程的开销。
4. 使用带生命周期感知功能的 scope，比如 lifecycleScope，可以当生命周期不可见的时候，自行取消线程回调。假设 enablePlan 接口执行 10 秒钟超时了，而 activity 在第 3 秒的时候就关闭了，那么当接口执行完之后就不切回到主线程了，也就是 return result（包括更后面的代码）压根就不执行了，这样可以避免一些问题，就和 Handler postDelay 需要做保护一样的道理。

总得来说，协程用起来相当的方便，后续我应该会持续学习并使用协程，最近出的 Flow 听说也很不错。
路漫漫其修远兮啊~~~