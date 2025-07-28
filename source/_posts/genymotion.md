---
title: Android Studio使用Genymotion小记
date: 2015-11-05 10:46:29
tags:
 - 开发工具
---

在学习Android Studio的过程中，看到网上很多人都推荐使用Genymotion插件，在某些无法使用真机的情况下，这个模拟器插件能大大加快模拟器的运行速度。而且由于没有Android 5.0以上的真机，使用Genymotion可以运行Android 5.0以上的模拟器，看看Meterial Design的设计，所谓一举两得，于是便开始了一波Genymotion的学习。

---
### 安装Genymotion
安装Genymotion。进入到官网，下载Genymotion，没有安装Virtual Box的，选择带有Virtual Box的安装文件进行下载。下载成功后，安装，基本都是下一步，下一步。

### Android Studio使用Genymotion插件

1. Android Studio安装Genymotion插件。安装过程很简单，网上一搜一大把，就不赘述了。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion1.png)

2. 将Genymotion路径配置到Android Studio中。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion2.png)

3. 启动Genymotion插件，选择要配置的机型，系统，点击Next，等待下载，安装，部署结束之后，启动模拟器即可进行使用了。

<!--more-->

### 问题
- 在选择好机型后，点击Next时，一直在Downloading files界面，最后弹出"Connection timeout occurred"，提示创建虚拟机失败。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion3.png)
出现这种情况，主要是下载的ova文件无法正常下载下来。打开日志文件（路径：C:\Users\Administrator\AppData\Local\Genymobile\genymotion.log），可以看到类似的log：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion4.png)
拷贝出.ova的那个地址，下载好这个ova文件后，替换到C:\Users\Administrator\AppData\Local\Genymobile\Genymotion\ova文件夹中即可。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion14.png)
在我的情形中，是由于公司网速太慢导致QAQ...后面在寝室一下就好了~

- 创建好虚拟机后，启动失败。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion5.png)
网上查了许多解决方法，诸如修改Ip的一些等等，但是并不适用于我的情况。后面找到了解决方法：减少虚拟机内存！
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion6.png)
打开Virtual Box，找到相应的虚拟机，打开设置->系统，将内存大小从2048改成1024后，虚拟机启动成功！

- 但是当我创建安卓5.0以上的虚拟机时，虚拟机虽然启动成功了，却一直停留在下面这个画面：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion7.png)
本以为进度到了74之后就会结束，进入系统的，结果是我太天真...
进度到了74之后，黑屏，显示一个“Android”字样，然后又重复开始从1到74，就这样不停重复不停重复，根本无法使用虚拟机。
于是又在网上搜罗相关的解决办法，最后算是找到了：``安装HAXM``。
1. 首先进入BIOS开启intel虚拟加速。不同的品牌电脑设置界面不同，这个自行百度。
2. 需要在SDK Manager里面下载Intel x86 Emulator Accelator。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion8.png)
3. 下载完成之后，找到相关安装文件进行安装。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion9.png)
4. 进入cmd，输入命令【sc query intelhaxm】查看intelhaxm状态。没有开启的话，输入【sc start intelhaxm】即可进行开启。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion10.png)
通过以上步骤，我的安卓5.1虚拟机，总算是成功跑起来了！！！
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion11.png)

- 后面回到家里，也通过上述一些操作，但是却仍然启动失败！！！后面打开VirtualBox，从VirtualBox启动虚拟机，报如下的错误：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion12.png)
后面网上找到该错误的原因，是因为系统破解，system32文件夹下的uxtheme.dll文件出问题。在网上下载电脑相应64位或32位的未破解的uxtheme.dll文件，替换到system32里去，然后重新启动虚拟机，成功！也可以下载下面的破解还原工具，还原破解。
[破解还原工具](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotiontheme%28win7X64%29.zip)
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotion13.png)
- 使用Genymotion安装APK出现错误INSTALL_FAILED_CPU_ABI_INCOMPATIBLE，解决办法如下：下载[这个Zip](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/genymotionGenymotion-ARM-Translation.zip)，不要解压，直接拖到虚拟机窗口中。对，你没有看错，就是直接拖进去。然后重启虚拟机就可以了。
