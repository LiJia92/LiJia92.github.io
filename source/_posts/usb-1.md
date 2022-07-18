---
title: Usb 端口在文件系统中的 index 它果然变化了...
date: 2022-07-18 16:18:09
tags:
 - 日常开发
---
在之前的一篇文章[Usb 摄像头绑定](http://lastwarmth.win/2022/04/12/camera/#more)中，想要将实际 Usb 端口绑定到具体业务上，利用 Usb 端口在文件系统中的 index 来做的绑定。在外发的设备上暂时没有发现 index 发生变化的情况，所以就没处理了。但是最近还是有反馈说，设备重启后绑定关系就错了，应该就是 index 发生变化了。哎，该趟的坑一个都跑不掉啊。正如「墨菲定律」：如果事情有变坏的可能，不管这种可能性有多小，它总会发生。

<!-- more -->

那么还能采用什么方式来做这种绑定呢？查阅很多资料也找不到相关的讯息，只能自己慢慢研究了。通过查看系统文件，发现了一个可能用来做唯一标识的属性：serial，就像这样：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG378.png)
也不能确定是否能好使，只能先用了再说，看后续有没有反馈。相关代码由其他同事实现，本文摘录一下，方便后面使用。
```
/**
 * @param serial：serial 文件中读到的字符串
 */
data class UsbSerial(val devBus: Int, val serial: String)

/**
 * 获取设备 Usb 的设备序列号，并初始化默认绑定关系
 */
private fun initUsbSerialBind(context: Context) {
    usbSerialList.clear()
    MainScope().launch {
        withContext(Dispatchers.IO) {
            val serialList = UsbUtils.getAllSerial()
            JLog.normal("initUsbSerialBind : ${JSON.toJSONString(serialList)}")
            var devBusList = UsbUtils.getDevBusByDriver()
            if (devBusList.isEmpty()) {
                devBusList = UsbUtils.getDevBus()
                JLog.normal("getDevBusByVendor : ${JSON.toJSONString(devBusList)}")
            }
            val oldPorts = File("/dev/bus/usb").listFiles()?.map { it.absolutePath }?.sorted()
            var index = 0
            CameraIntent.cacheList.forEach { intent ->
                //1.已近绑定过了就跳过
                if (!intent.isSerialNoBind()) return@forEach
                //2.设置绑定关系
                if (intent.getDevice() != -1) {
                    //2.1.检查老的绑定关系，并转换成新的绑定
                    oldPorts?.getOrNull(intent.getDevice())?.let { name ->
                        serialList.find {
                            it.devBus == UsbUtils.getDevBusByName(name)
                        }?.let {
                            JLog.normal("旧转新绑定关系-$intent: \nold: ${name}\nnew: usb${it.devBus}->${it.serial}")
                            intent.bindSerial(it.serial)
                        }
                    }
                } else if (devBusList.isNotEmpty()) {
                    //2.2.从未绑定过则设置新的默认绑定关系
                    serialList.find {
                        it.devBus == devBusList.getOrNull(index % devBusList.size)
                    }?.let {
                        JLog.normal("设置默认绑定关系-$intent: \nusb${it.devBus}->${it.serial}")
                        intent.bindSerial(it.serial)
                    }
                    index++
                }
            }
            serialList
        }.let {
            usbSerialList.addAll(it)
        }
        usbMonitor = USBMonitor(context, this@UsbCameraManager)
        usbMonitor?.register()
    }
}

@WorkerThread
fun getAllSerial(): List<UsbSerial> {
    val driverBus = getDevBusByDriver()
    val list = HashMap<String, UsbSerial>()
    File("sys/bus/usb/devices").listFiles { _, name ->
        name.contains("usb")
    }?.forEach {
        val serail = kotlin.runCatching {
            File(it, "serial").readLines().getOrNull(0)
        }.getOrNull()
        val devBus = Regex("usb(.+)").find(it.name)?.groupValues?.getOrNull(1)?.toIntOrNull()
        if (serail != null && devBus != null) {
            if (list.containsKey(serail)) {
                if (driverBus.contains(devBus)) {
                    list[serail] = UsbSerial(devBus, serail)
                }
            } else {
                list[serail] = UsbSerial(devBus, serail)
            }
        }
    }
    return list.values.sortedBy { it.devBus }
}

/**
 * 查找摄像头usb驱动所在的设备
 */
@WorkerThread
fun getDevBusByDriver(): List<Int> {
    val usbDriver = File("sys/bus/usb/drivers/usb")
    val usbList = HashSet<Int>()
    var hubBus = -1
    var hubHasDriver = false
    usbDriver.listFiles()?.forEach { parent ->
        if (!parent.isDirectory) return@forEach
        val result = Regex("^(\\d)-\\d\\.?(\\d?)").find(parent.name) ?: return@forEach
        val bus = result.groupValues.getOrNull(1)?.toIntOrNull()//总线号
        val hubNum = result.groupValues.getOrNull(2)?.toIntOrNull()//扩展口编号
        if (bus != null && hubNum != null) {
            //有扩展口
            hubBus = bus
            if (hubNum <= 3 && isVideoDriver(parent)) {//3个扩展口
                hubHasDriver = true
            }
        } else if (bus != null && isVideoDriver(parent)) {
            usbList.add(bus)
        }
    }
    if (hubBus != -1) {
        if (hubHasDriver) {
            usbList.add(hubBus)
        } else {
            usbList.remove(hubBus)
        }
    }
    JLog.normal("getDevBusByDriver : $usbList")
    return usbList.toList()
}

private fun isVideoDriver(parent: File): Boolean {
    var drcount = 0
    //排除掉音频设备等
    parent.listFiles()?.forEach drcount@{ child ->
        if (!child.isDirectory) return@drcount
        if (drcount > 2) return false
        if (Regex("^(\\d)-\\d\\.?(\\d?):").find(child.name) != null) {
            drcount++
        }
    }
    return drcount != 1
}
```
相关方法差不多就这些，主要就是遍历文件系统，找到对应的 Usb 端口的 serial，结合驱动来做一些判断。
至于这样的方案是不是真正解决问题了，就只能交给时间了。
