---
title: Usb 摄像头绑定
date: 2022-04-12 16:44:45
tags:
 - 日常开发
---
在之前的文章中，写了一个 CameraIntent 的类，代表用到摄像头的业务。App 允许连接多个 Usb 摄像头，然后将业务绑定到一个确定的 Usb 端口。如果这个端口插入了摄像头，则可以直接使用摄像头产生的数据进行业务处理，如果没插入摄像头，则相应的业务不做处理或中断。
通过 UsbManager.ACTION_USB_DEVICE_ATTACHED、UsbManager.ACTION_USB_DEVICE_DETACHED 广播可以知道 Usb 设备插入、拔出的时机。通过 intent 获取到的是一个 UsbDevice 对象。如何通过这样的一个 UsbDevice 确定物理实际的 Usb 端口呢？

<!-- more -->

## 通过 deviceName
先打印一下 UsbDevice 的内容：
> UsbDevice[mName=/dev/bus/usb/007/007,mVendorId=3141,mProductId=25771,mClass=239,mSubclass=2,
mProtocol=1,mManufacturerName=CLSJ-H63-210317,mProductName=Integrated Camera,mVersion=2.1,mSerialNumber=null ...]

mVendorId、mProductId、mProductName 都是这个 Usb 设备自身的属性，无法和实际的 Usb 端口对应上。通过查阅 UsbDevice 相关文档，初步觉得可以使用 mName 这个属性来进行绑定。
进行测试，来回插拔多个不同 Usb 设备到同一个物理端口，发现 mName 是固定的一个字符串 **/dev/bus/usb/007/00X**。每插拔一次，后面的 X 会自增一次。那是不是可以使用前面的 **/dev/bus/usb/007** 来确定这个物理端口呢？
先试一把再说，于是就有了 CameraIntent 的 saveDevice、getDevice 方法，匹配的都是 String 类型的参数和返回值，对应的就是 **/dev/bus/usb/007** 这样的串。来回插拔多次，使用不同硬件设备也试过，好像没什么问题，都可以对应上。

## 意外
起初以为没什么问题了，结果后面测试同学过来报 bug：Usb 摄像头对应关系错了。于是问相关操作，包含了一系列的插拔、绑定等等，还有 **设备重启** 。单纯插拔、App 进行绑定已经经过自己的充分测试了，唯独 **设备重启** 当时没有考虑到。
针对重启测试一轮，重启多次后发现，确实是出现了同一个物理端口，但 deviceName 从 **/dev/bus/usb/007** 变成 **/dev/bus/usb/005** 的情况。
！@#！@￥@#%￥%……*&……（*&））（*——（）+）——+——@#！
shit，感觉没什么思路了...

## index
后面上级提了个思路：**可不可以利用 index 来做绑定关系？**
做了相关了解后，/dev/bus/usb 这个路径其实就是对应到文件系统里的文件路径。经过多次重启，查看文件路径如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG275.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG276.png)
确实发现 005、007 会来回变，但是在文件系统中顺序没变。
于是尝试用 index 来做绑定关系。将之前的 String 改成 Int。
如何确定 index 呢？直接遍历文件系统：
```
/**
 * 获取设备 Usb 的端口路径
 */
private fun initUsbPorts() {
    ports.clear()
    val file = File("/dev/bus/usb")
    if (file.isDirectory) {
        file.listFiles()?.forEach {
            ports.add(it.absolutePath)
        }
    }
    ports.sortBy { it }
    JLog.normal("initUsbPorts : ${JSON.toJSONString(ports)}")
}
```
按道理这种操作在正常手机系统里是不行的，需要系统权限。但是我们的设备都是自己生产的，也不存在设备适配的情况，所以暂时先忽略这个问题。
拿到 Path 列表后，通过 UsbDevice 的 deviceName 去对比是第几个，就可以拿到 index 进行业务绑定了。

## 再来个意外
经过一段时间的测试，测试同学后面又来报 bug 了。
wtf...
后面跟进排查，发现同一个物理端口，重启后在文件系统的 index 确实不一样了，但是这个设备是之前生产的样机，不是最终外发的设备。
于是用最终的设备重新进行测试，暂时没发现这个情况。如果最终外发的设备后面还是出现了这个情况，就得再想别的方法了。
so，就先这样吧...
