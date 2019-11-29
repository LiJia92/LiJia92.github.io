---
title: 问题集锦
date: 2019-11-29 18:18:21
tags:
---
换了个项目组，最近忙了很多，没空写什么东西，碎碎念贴点碰到的小问题。

## 文件校验
应用内部有本地数据库，有版本校验，会不定时更新，在使用的时候会使用 md5 进行校验。当更新版本后，发现数据库更新一直失败，调试后发现是 md5 值不一致，一脸懵逼的状态。数据库文件由服务端下发，然后复制移动到目标工程，并没有改任何东西，为何会造成 md5 值不一致呢？
最后定位问题：**同事拿到数据库文件，为了确定版本是对的，打开 db 文件看了一眼，然后 SQLite 就会自动写入一些东西，导致 md5 值改变。** 涨点姿势，以后应当注意。

<!-- more -->

## 移除权限
现在项目中难免会集成某些三方库，基础库，这些库有些时候大而全的会申明许多并未用到的权限，项目在集成时需要移除这些权限。如何在不修改三方库、基础库的基础上移除呢？
以蓝牙权限为例，在 AndroidManifest.xml 中声明：
```
<uses-permission android:name="android.permission.BLUETOOTH"
        tools:node="remove"/>
```

## webp 加载
为了达到某些页面效果，设计师会设计一些动态图，有时是 gif，有时是 webp。碰到的问题是 webp 的文件放到 xhdpi 文件夹会一直报错：unsolved reference，也不知道是什么原因。**放到其他分辨率的文件夹下** 就好了，暂时还不知道原因。

## 恢复“误删”的本地文件
项目中有 Java、Kotlin 文件，当把 Java 文件转成 Kotlin 文件时，会生成新的 Git 记录，无法查看 .java 文件的历史提交记录。可以右键项目根目录，然后选择 Local History，然后可以搜索出 .java 文件对照着看。

## Android Studio 代码错位
莫名其妙 .java 文件展示了 .xml 的内容，文件全部错乱展示，为 Android Studio 编译错误导致。删除所有的编译文件：.idea、.gradle、build 文件夹，以及 /user/AndroidStudio3.5/system/caches 文件夹，然后重启。

## View 设置背景
当有这样一个 selector：
```
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:color="#4A5356" android:state_selected="true" />
    <item android:color="@android:color/transparent" />
</selector>
```
调用 view.setBackgroundResource 时会失败，可以使用 StateListDrawable，手动 addState。或者使用 shape：
```
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">

    <item android:state_checked="true">
        <shape>
            <solid android:color="#333333" />
            <corners android:bottomLeftRadius="4dp" android:topLeftRadius="4dp" />
        </shape>
    </item>
    <item>
        <layer-list>
            <item android:right="-2dp">
                <shape android:shape="rectangle">
                    <stroke android:width="1dp" android:color="#333333" />
                    <corners android:bottomLeftRadius="4dp" android:topLeftRadius="4dp" />
                </shape>
            </item>
        </layer-list>
    </item>
</selector>

<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:state_checked="true">
        <shape>
            <solid android:color="#333333" />
        </shape>
    </item>
    <item>
        <shape android:shape="rectangle">
            <stroke android:width="1dp" android:color="#333333" />
        </shape>
    </item>
</selector>

<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">

    <item android:state_checked="true">
        <shape>
            <solid android:color="#333333" />
            <corners android:bottomRightRadius="4dp" android:topRightRadius="4dp" />
        </shape>
    </item>
    <item>
        <layer-list>
            <item android:left="-2dp">
                <shape android:shape="rectangle">
                    <stroke android:width="1dp" android:color="#333333" />
                    <corners android:bottomRightRadius="4dp" android:topRightRadius="4dp" />
                </shape>
            </item>
        </layer-list>
    </item>
</selector>
```
selector 可以添加各种 item 实现不用的效果，item 内部可以使用 layer-list 来达到不同的效果覆盖。