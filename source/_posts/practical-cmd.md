---
title: 常用代码和指令小结
date: 2018-05-28 17:23:32
tags:
 - 日常开发
---
这篇文章主要总结一下日常开发中常用的一些代码和指令。

## ADB 指令
### 设置调试 App
有些时候需要在应用启动的时候直接调试，如果设好断点然后``Debug App``重新编译运行会很慢，通过如下指令可以直接设置调试 App，然后设置断点后自动继续。
```
adb shell am set-debug-app -w com.example.appdebugsample
```
### 开启 GPU 过度绘制
GPU 过度绘制的作用就不用多说了，直接指令开启，方便快捷。
```
adb shell setprop debug.hwui.overdraw show
adb shell setprop debug.hwui.overdraw false
```

<!-- more -->

### INSTALL_FAILED_TEST_ONLY
安装 Apk 出现这样的错误。看下 adb install 的所有参数：
```
app installation:
 install [-lrtsdg] PACKAGE
 install-multiple [-lrtsdpg] PACKAGE...
     push package(s) to the device and install them
     -l: forward lock application
     -r: replace existing application
     -t: allow test packages
     -s: install application on sdcard
     -d: allow version code downgrade (debuggable packages only)
     -p: partial application install (install-multiple only)
     -g: grant all runtime permissions
 uninstall [-k] PACKAGE
     remove this app package from the device
     '-k': keep the data and cache directories
```
adb install 加上 -t 参数即可安装成功。
```
adb install -d -r "apk path"
```
降版本覆盖安装。
```
adb ( -s 设备名 ) install ( -r ) 文件名称.apk
```
当有多个设备时，使用 **-s**来指定设备，使用 **-r** 指定是否覆盖安装。

### 查看应用信息
```
adb shell dumpsys package com.example.appdebugsample
```

### 网络调试
```
## 电脑USB连接手机
adb tcpip 5555
## 断掉USB
adb connect 10.10.28.35（connect后面跟上手机的ip地址）
```
断开连接
```
adb disconnect
```

### 显示Task栈内activity信息
```
adb shell dumpsys activity activities | sed -En -e '/Running activities/,/Run #0/p'
```
快速获取当前Activity的名称：
```
adb shell dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp' --color=always
```

## Git 指令
```
git fetch origin branchname:branchname
```
拉取远程分支到本地分支或者创建本地新分支
```
git checkout origin/remoteName -b localName
```
获取远程分支remoteName 到本地新分支localName，并跳到localName分支
```
git push -u origin branchname
```
推送本地分支到远程分支
```
git branch (-m | -M) <oldbranch> <newbranch>
```
重命名分支
```
git clean [-d] [-f] [-i] [-n] [-q] [-e <pattern>] [-x | -X] [--] <path>...
-d   # 删除未跟踪目录以及目录下的文件，如果目录下包含其他git仓库文件，并不会删除（-dff可以删除）。
-f   # 如果 git cofig 下的 clean.requireForce 为true，那么clean操作需要-f(--force)来强制执行。
-i   # 进入交互模式
-n   # 查看将要被删除的文件，并不实际删除文件
```
通过以上几根参数组合，基本上可以满足删除未跟踪文件的需求了。例如在删除前先查看有哪些文件将被删除运行：
```
git clean -n
```
想删除当前工作目录下的未跟踪文件，但不删除文件夹运行（如果clean.requireForce为false可以不加-f选项）：
```
git clean -f
```
想删除当前工作目录下的未跟踪文件以及文件夹运行：
```
git clean -df
```
tag ：
```
git tag tagName  // 轻量级 tag，不带标注
git tag -a tagName -m 'tag 说明' // 带标注的 tag
git push origin --tags // 推送本地所有 tag 到远程仓库
git push origin tagName // 推送某个 tag
git tag -d tagName // 删除某个 tag
git push origin :refs/tags/oldName
```
修复当前提交的错误：
```
git commit --amend
```
并不是直接修改原 commit 的内容，而是生成一条新的 commit。
![](https://user-gold-cdn.xitu.io/2017/11/21/15fdf0187f2f4b2d?imageslim)

```
git stash apply
git stash apply stash@{2}
git config [–local|–global|–system] -l
```
本地所有修改的，没有的提交的，都返回到原来的状态：
```
git checkout .
```

windows AS 安装 git for windows 2.16.2，cmd 控制台乱码。网上找了好多解决办法，都没法解决。最后只有降 git 版本。
> http://blog.csdn.net/QasimCyrus/article/details/65628752

## 错误码
定义的错误码如果无法做到每个 code 对应一个描述语，那么在 Toast 或 Dialog 展示错误时带上错误码，eg：ToastUtils.showShort(mContent, "登录失败（错误码：-8）")，这样根据 -8 这个 code 很容易定位到问题。

## 适配全面屏
在 AndroidManifest.xml <application> </application> 中添加最大屏幕高宽比：
```
<meta-data android:name="android.max_aspect" android:value="2.1" />
```
Android 标准接口中，支持应用声明其支持的最大屏幕高宽比（maximum aspect ratio）。具体声明如下，其中的 ratio_float 被定义为是高除以宽，以16:9为例，ratio_float = 16/9 = 1.778 (18.5:9则为2.056)。
若开发者没有声明该属性，ratio_float 的默认值为1.86，小于2.056，因此这类应用在三星S8上，默认不会全屏显示，屏幕两边会留黑。

## 列表边界留白
Android 上 ListView、GridView、RecyclerView 默认行都是置顶的，这样会很丑。
一般为了解决这个问题都会在首行或尾行加上一个隐藏的View，那样实在是太麻烦了。
1. 设置 ListView 或 GridView 的 android:clipToPadding ＝ false，
2. 然后通过 paddingTop 和 paddingBottom 设置距离就好了。

## TextView drawableRight
TextView 在添加 drawableRight 等属性时，即使设置了居中也会有不对齐的现象，给它设置一个 includeFontPadding 为 false 的属性就好了。
```
<TextView
    android:id="@+id/topic_detail_reward_amount_tv"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginRight="12dp"
    android:drawablePadding="4dp"
    android:drawableRight="@drawable/saturn__income_coin"
    android:gravity="center_vertical"
    android:includeFontPadding="false"
    android:textColor="#FF6B00"
    android:textSize="15sp"
    tools:text="+200" />
```

## SeekBar
1. 去掉滑块 thumb 周围的阴影，使用``android:background="@null"``：
```
<com.xxxxxxx.widget.CustomSeekBar
    android:id="@+id/sb_light_bar"
    android:layout_width="wrap_content"
    android:layout_height="190.0px"
    android:layout_centerInParent="true"
    android:maxHeight="6dp"
    android:background="@null"
    android:progressDrawable="@drawable/video_light_seekbar"
    android:thumb="@drawable/sele" />
```
2. seekbar默认两边会有间隙，导致不能符合预期效果。同时滑块可能会因为太大而显示不全，添加属性:
```
android:paddingStart="0dp"
android:paddingEnd="0dp"

<!-- 滑块偏移 -->
android:thumbOffset="0dp"
```
3. thumb 的 icon 四周透明，但是显示效果不透明
```
android:splitTrack="false"
```
> https://www.jianshu.com/p/d7eb29d3d5c4

4. 进度颜色控制：
- 第一进度条、第二进度条的位置不能更换，更换后第一进度条不能正常显示。
- 背景色不能添加clip标签，添加后不能正常显示。
- 第一、第二进度条若要正常显示，需要添加clip标签。
- 通过调整paddingLeft、paddingRight与thumbOffset来控制thumb的起点对齐、左右被遮盖。
```
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 背景色 -->
    <item android:id="@android:id/background">
        <shape>
            <solid android:color="#ececec" />
        </shape>
    </item>
    <!-- 第二进度条，用于缓冲显示（？） -->
    <!--<item android:id="@android:id/secondaryProgress">-->
        <!--<clip>-->
            <!--<shape>-->
                <!--<solid android:color="#dcdcdc" />-->
            <!--</shape>-->
        <!--</clip>-->
    <!--</item>-->
    <!-- 第一进度条，用于显示已执行的进度 -->
    <item android:id="@android:id/progress">
        <clip>
            <shape>
                <solid android:color="#86e7de" />
            </shape>
        </clip>
    </item>
</layer-list>
```
> https://www.jianshu.com/p/7f00c5361094

5. 结合音乐一般是以秒为单位来设置播放进度。使用 1000d 浮点数进行运算，然后再用``rint``取最近的整数进行返回，这样显示的进度更平缓。对于暂停、续播，当检查播放器有暂停进度时，在续播开始时先 setProgress 一下。eg：
```
seekBar.setMax(duration);

double position = SingleAudioPlayer.getInstance().getCurrentPosition();
seekBar.setProgress((int) Math.rint(position / 1000d));
```
