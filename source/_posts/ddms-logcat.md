---
title: Android DDMS无法输出logcat
date: 2015-10-24 16:00:11
tags:
 - 日常开发
---

### 问题
在Android开发中，我们经常需要真机测试，查看log。有好几次碰到如下的情况：
```
Unable to open log device‘/dev/log/main’: No such file or directory
```
导致连上真机却看不到log。

网上有很多解决方法，比如各种重启，重启手机，电脑，eclipse，adb，重新安装eclipse，拨号等。又或者[stackoverflow](http://stackoverflow.com/questions/4867971/dev-log-main-not-found)上说的与手机内核有关。但是对我的手机都不奏效，我的手机是华为3C，刷的MIUI的rom。

### 原因
后面折腾了老半天，终于找到了原因：

 >./system/etc/init.d目录下的脚本删掉了日志设备 </font>


知道问题出在哪了，那么解决起来就很方便了。

<!--more-->

### 解决方法

#### 找到删掉日志设备的脚本
```
adb shell
su
cd /system/etc/init.d && grep -r "rm /dev/log/main"
```
找到该文件：03MTKTweakElse文件。

![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2015/10/ddms-logcat1.png)

#### 修改脚本
利用pull指令将该文件拷贝到电脑上。
```
abd pull /system/ect/init.d/03MTKTweakElse  L:\
```
利用文本编辑工具（editplus、notepad++等）打开03MTKTweakElse文件，找到``rm    /dev/log/main``，然后注释掉该行。

![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2015/10/ddms-logcat2.png)

#### 将文件替换到之前的路径中
```
adb push L:\03MTKTweakElse  /system/etc/init.d
```

#### 重启手机
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2015/10/ddms-logcat3.png)

经过以上几个步骤，应该就可以输出logcat了。

### Tips
- 手机需要root。
- adb pull、push指令可能会失败，建议可以使用R.E资源管理器。
