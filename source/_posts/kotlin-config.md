---
title: Kotlin - 配置篇
date: 2017-12-05 18:05:32
tags:
 - Kotlin
---
最近随着 Google 的大力推荐，越来越多开发者开始使用 Kotlin 了。其实我对 Kotlin 的并没有很特别的感觉，它就类似于 Swift 相比于 OC，大量的语法糖着实能使写代码的效率变高，但是是否能左右 Android 开发的现状还未可知。我接触 Kotlin 的主要原因是：**业务代码太无聊啦**。相信很多开发者都跟我有同样的感触，在一个公司待久了，技术框架摸透之后，后面的开发就基本是纯业务开发了，写界面，写业务代码，对于技术提升没有什么实质的帮助，就是真正的码农。为了改变这一现状，我不断在新需求中使用一些新的技术，比如 RxJava、Retrofit 等等，说是新技术其实也不新了，都出来都很久了，只是自己在项目中没有用到，接触得不多。在新需求中引入这些技术，**可以边开发边学习，解决写业务代码的无聊，还能拓宽视野，学习新知识。虽然不一定会成为主流，但学习一下总是没问题的**，因此开始接触 Kotlin。这篇文章主要先讲讲 Kotlin 的配置。

## Kotlin 插件
最新的 Android Studio 已默认装了 Kotlin 插件了，在旧版本可自己手动安装 Kotlin 插件。

<!-- more -->

![](http://7xryow.com1.z0.glb.clouddn.com/2017/12/05/%E9%80%89%E5%8C%BA_280.png)
安装插件后，选择一个 Java 文件，点击 Code -> Convert Java File To Kotlin File，即可转换成 Kotlin 文件了。

## 配置 Kotlin 环境
在 kt 文件中，随便使用一下 Kotlin 的特性，例如 List 的 filter 操作符，然后报错按下 Alt + Enter 弹出的方框中就有配置 Kotlin 的选项。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/12/05/%E9%80%89%E5%8C%BA_279.png)
如上图，选择要配置的 Module，确定后就会有自动配置了。
项目根目录的 build.gradle 中：
```
buildscript {
    // kotlin 版本
    ext.kotlin_version = '1.2.0'
    repositories {
        jcenter()
        google()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:3.0.0'
        // 依赖 kotlin 插件
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}
```
然后 Module 的 build.gradle 中：
```
apply plugin: 'kotlin-android'

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jre7:$kotlin_version"
}
```
当然，你可以自己做这些配置。
注意到``apply plugin: 'kotlin-android'``，这个配置是针对 Module 的。如果有多个 Module 都需要用到 Kotlin，则每个 Module 都需要做这个配置。
比如 app -> library -> core，app、library 中都使用了 kotlin，那么 app、library 2个 Module 都需要配置``apply plugin: 'kotlin-android'``，否则会提示``找不到符号:xxx（xxx为 Kotlin 编写的类）``。

## Kotlin 拓展
Kotlin 团队研发的可以让开发更简单的插件是 Kotlin Android Extensions。这个插件可以自动绑定 View，再也不用 findViewById 了。
要使用这个插件，在 Module 的 build.gradle 中配置：
```
apply plugin: 'kotlin-android-extensions'
```
然后一行代码导入即可直接使用布局中的 View。
```
import kotlinx.android.synthetic.main.＜布局＞.*
```
假设当前布局文件是``activity_main.xml``，我们只需要引入``kotlinx.android.synthetic.main.activity_main.*。``
导入完成后即可调用在 xml 文件中以视图控件命名属性的对应扩展，比如下例：
```
<TextView
    android:id="@+id/hello"
    android:layout_width="fill_parent"
    android:layout_height="wrap_content"/>
```
然后 activity 中可以直接如下使用：
```
hello.text = "Hello World!"
```
再也不用 findViewById 了。当然你如果引用 ButterKnife 也可以省去 findViewById，只不过实现方式不一样。**如此使用需要注意生命周期，在 view 还没创建时调用肯定是会失败的。**
注意到``import kotlinx.android.synthetic.main.＜布局＞.*``中的``main``，这是因为大多数时候我们的布局都是在 main 文件夹下，当我们定义了多种 buildVariant 时，就像[Gradle 多版本管理（续）](http://lastwarmth.win/2017/10/24/gradle-app-2/)中写到的一样，那么我们就会有很多文件夹来分别对应这些 buildVariant 以实现多版本控制的需求了。那么这个时候我们的布局就不是在``main``文件夹中了。此时我们需要开启 **Experimental Mode**。
```
androidExtensions {
    experimental = true
}
```
然后选择对应的 buildVariant，我们可以直接导入对应的布局了。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/12/05/%E9%80%89%E5%8C%BA_278.png)

## 参考
[Kotlin 中文教程](https://www.kotlincn.net/docs/tutorials/)
