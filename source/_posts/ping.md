---
title: 使用 Ping 指令判断网络
date: 2021-12-31 14:34:09
tags:
 - 日常开发
---
有个需求，需要判断网络是否连接，如果是正常的移动网络或者 WiFi，是可以判断出来的，但是目标设备使用的是以太网，就像台式机插入的网线一样。假设拔掉机器这边的网线，很显然就是没有网络的，通过 Android 的 ConnectivityManager 的 getActiveNetworkInfo 也可以判断出来。但如果拔掉的是网线的另一端，通过 Android SDK 获取的网络会仍然是 CONNECTED。这显然是有问题的，因为此时此刻设备连访问百度的能力都没有了。所以打算使用 ping 指令，不断的去 ping 一个 host，如果能正常返回，则说明网络是没问题的。

<!-- more -->
代码很简单，就一个方法：
```
/**
 * ping 域名的工具类
 */
object PingUtils {

    private var networkConnected = false

    @JvmStatic
    fun startPing(host: String = "www.baidu.com") {
        MainScope().launch {
            // 无限循环，1秒 ping 1次
            while (true) {
                delay(1000)
                val ping = async(Dispatchers.IO) {
                    var result = false
                    try {
                        val process = Runtime.getRuntime().exec("ping -c 1 $host")
                        result = process.waitFor() == 0
                    } catch (e: Exception) {
                        JLog.normal("域名$host ping 失败了，错误：" + e.localizedMessage)
                    }
                    result
                }
                val result = withTimeoutOrNull(5000) {
                    ping.await()
                }
                networkConnected = result ?: false
            }
        }
    }

    @JvmStatic
    fun isNetWorkConnected(): Boolean {
        return networkConnected
    }
}
```
核心思路就是每隔一秒钟 ping 一次，如果在 5 秒内返回了结果，则认为网络连接正常，否则就是未连接。结合 Kotlin 协程的一些方法，让代码写起来简单直接，也算是学习一把协程。
