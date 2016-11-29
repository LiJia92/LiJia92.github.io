---
title: React Native For Android初探-问题小结
date: 2016-01-19 11:38:48
tags:
 - hybrid开发
---

在[上一篇文章](http://lijia92.github.io/2016/01/15/react-native/)中，我介绍了React Native For Android的基本使用。这篇文章重点介绍一下使用过程中碰到的问题以及解决办法。

## 真机运行白屏
在执行``react-native run-android``指令编译安装apk到真机之后，运行程序，发现程序白屏，感觉像ANR一样。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native-tips1.png)
解决方法：手机设置中打开应用管理，选择我们安装的应用。然后点击权限管理，将显示悬浮框设置为允许。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native-tips2.png)
白屏问题便能解决了。

<!--more-->

## 真机运行提示Unable to download JS bundle
在我们解决完白屏问题之后，重新运行程序，发现程序能运行了，但是报错了：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native-tips3.png)
点击Reload JS后，提示Unable to download JS bundle：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native-tips4.png)
解决方法：摇晃设备或按Menu键，可以打开调试菜单，点击DevSettings，选Debug server host for device，输入你的正在运行packager的那台电脑的``局域网IP加:8081``（同时要保证手机和电脑在同一网段，且没有防火墙阻拦），再按back键返回，再次打开Menu键，在调试菜单中选择Reload JS，就可以看到运行的结果了。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native-tips5.png)

## Chrome调试JS

 1. 安装拓展程序``React Developer Tools``。
 2. 在模拟器或真机菜单中选择Debug JS，打开调试开关。
 3. Chrome打开：``http://localhost:8081/debugger-ui``，按F12打开开发者工具便能进行调试。

![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native-tips6.png)
