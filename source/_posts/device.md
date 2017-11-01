---
title: 在硬件设备上运行应用
date: 2017-11-01 14:39:22
tags:
 - 日常开发
---
最近做收银机上的软件，之前都是用无线调试，有个功能需要要测一下断网的情况，然后断网后无线调试就不能用了。然后接上 USB，通过 Android Studio 能看到设备但无法使用。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/11/01/%E9%80%89%E5%8C%BA_236.png)

然后通过 adb devices 能看到设备，但是提示权限不允许，并且提示到[官网](https://developer.android.com/studio/run/device.html#setting-up)来解决。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/11/01/%E9%80%89%E5%8C%BA_234.png)
跟到网站中可以看到
> 如果您在 Ubuntu Linux 上开发，则需要为想要在开发中使用的每一种设备类型添加一个包含 USB 配置的 udev 规则文件。

这个便是问题所在了，跟着描述进行操作后面便可以使用 USB 调试了。

<!-- more -->

1. 以 root 身份登录，并创建此文件：/etc/udev/rules.d/51-android.rules。
使用下面的格式将各个供应商添加到文件中：
```
SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"
```

在本例中，供应商 ID 为 HTC 的 ID。MODE 赋值指定读/写权限，GROUP 则定义哪个 Unix 组拥有设备节点。

> 注：取决于您的环境，规则语法可能稍有不同。如有需要，请查阅适用于您的系统的 udev 文档。有关规则语法的概述，请参阅编写 udev 规则的指南。

2. 现在，请执行：
```
chmod a+r /etc/udev/rules.d/51-android.rules
```

然后文中还附上了 USB 供应商 ID 表。

|公司|USB 供应商 ID |
|:--|:-- |
|Acer|502 |
|ASUS|0b05 |
|Dell|413c |
|Foxconn|489 |
|Fujitsu|04c5 |
|Fujitsu Toshiba|04c5 |
|Garmin-Asus|091e |
|Google|18d1 |
|Haier|201E |
|Hisense|109b |
|HP|03f0 |
|HTC|0bb4 |
|Huawei|12d1 |
|Intel|8087 |
|K-Touch|24000 |
|KT Tech|2116 |
|Kyocera|482 |
|Lenovo|17ef |
|LG|1004 |
|Motorola|22b8 |
|MTK|0e8d |
|NEC|409 |
|Nook|2080 |
|Nvidia|955 |
|OTGV|2257 |
|Pantech|10a9 |
|Pegatron|1d4d |
|Philips|471 |
|PMC-Sierra|04da |
|Qualcomm|05c6 |
|SK Telesys|1f53 |
|Samsung|400000000 |
|Sharp|04dd |
|Sony|054c |
|Sony Ericsson|0fce |
|Sony Mobile Communications|0fce |
|Teleepoch|2340 |
|Toshiba|930 |
|ZTE|19d2 |
当你不知道自己的 USB 设备属于哪个供应商时，可以通过``lsusb``指令查看所有的 USB 设备，然后拔掉 USB，再次执行指令，然后对比一下看少了哪条记录，就能知道 USB 设备的 idVendor 了。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/11/01/TIM%E5%9B%BE%E7%89%8720171101152639.png)

可以看到是``Qualcomm -> 05c6``。当知道供应商时直接查询表格就可以了。

# 题外话
本来不想贴表格的，觉得 Markdown 弄表格贼麻烦，但是还是搜了一下，找到一个比较方便的方法。
[Markdown 快速生成表格](http://www.jianshu.com/p/abaff828100d)
第三种方式很简单，先粘到 excel 中，然后执行 exe， Linux 下只需要在指令前面加个 wine 即可（安装过 wine 环境）。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/11/01/%E9%80%89%E5%8C%BA_237.png)
