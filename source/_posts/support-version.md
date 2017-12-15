---
title: Support 库，注意你的版本号
date: 2017-12-15 17:18:29
tags:
 - 日常开发
---
项目开发，引进了一个新的三方库，导致之前能运行的代码出现问题，错误堆栈：
```
FATAL EXCEPTION: main
Process: com.lijia.app.catering.dev, PID: 29387
java.lang.NoClassDefFoundError: android.support.v4.animation.AnimatorCompatHelper
    at android.support.v7.widget.DefaultItemAnimator.resetAnimation(DefaultItemAnimator.java:514)
    at android.support.v7.widget.DefaultItemAnimator.animateAdd(DefaultItemAnimator.java:217)
    at android.support.v7.widget.SimpleItemAnimator.animateAppearance(SimpleItemAnimator.java:114)
    at android.support.v7.widget.RecyclerView.animateAppearance(RecyclerView.java:3243)
    at android.support.v7.widget.RecyclerView.access$800(RecyclerView.java:147)
    at android.support.v7.widget.RecyclerView$4.processAppeared(RecyclerView.java:436)
    at android.support.v7.widget.ViewInfoStore.process(ViewInfoStore.java:249)
    at android.support.v7.widget.RecyclerView.dispatchLayoutStep3(RecyclerView.java:3098)
    at android.support.v7.widget.RecyclerView.dispatchLayout(RecyclerView.java:2917)
    at android.support.v7.widget.RecyclerView.onLayout(RecyclerView.java:3283)
    at android.view.View.layout(View.java)
    at android.view.ViewGroup.layout(ViewGroup.java)
    at android.widget.LinearLayout.setChildFrame(LinearLayout.java)
    at android.widget.LinearLayout.layoutVertical(LinearLayout.java)
    at android.widget.LinearLayout.onLayout(LinearLayout.java)
    ...
```

<!-- more -->

即是在 v4 包中找不到类：AnimatorCompatHelper。Google 了一下，发现这个类在 v4 包版本 26 以上就被剔除了，而 RecyclerView 引用了这个类。所以先查看下依赖，来看看自己依赖的 v4 版本。执行命令：
```
./gradlew app:dependencies --configuration cateringDevCompile
```
因为我的 buildVariant 很多，这里利用 configuration 参数指定一个 variant，缩减编译的时间。
给出的 Log 如下：
```
cateringDevCompile - Classpath for compiling the cateringDev sources.
\--- project :ui-jch
     +--- org.jetbrains.kotlin:kotlin-android-extensions-runtime:1.2.0
     |    \--- org.jetbrains.kotlin:kotlin-stdlib:1.2.0
     |         \--- org.jetbrains:annotations:13.0
     +--- project :ui-common-portrait
     |    +--- project :appcommon
     |    |    +--- com.yanzhenjie:recyclerview-swipe:1.0.2
     |    |    |    \--- com.android.support:recyclerview-v7:23.4.0
     |    |    |         +--- com.android.support:support-annotations:23.4.0 -> 26.1.0
     |    |    |         \--- com.android.support:support-v4:23.4.0 -> 26.1.0 (*)
     |    |    +--- com.jph.takephoto:takephoto_library:3.0.1
     |    |    |    +--- com.android.support:support-v4:24.0.0 -> 26.1.0 (*)
     |    |    |    +--- com.soundcloud.android.crop:lib_crop:1.0.0
     |    |    |    |    +--- com.android.support:support-v4:23.0.1 -> 26.1.0 (*)
     |    |    |    |    \--- com.android.support:support-annotations:23.0.1 -> 26.1.0
     |    |    |    \--- com.darsh.multipleimageselect:multipleimageselect:1.0.4
     |    |    |         +--- com.android.support:appcompat-v7:23.1.1 -> 26.1.0
     |    |    |         |    +--- com.android.support:support-annotations:26.1.0
     |    |    |         |    +--- com.android.support:support-v4:26.1.0 (*)
     |    |    |         |    +--- com.android.support:support-vector-drawable:26.1.0
     |    |    |         |    |    +--- com.android.support:support-annotations:26.1.0
     |    |    |         |    |    \--- com.android.support:support-compat:26.1.0 (*)
     |    |    |         |    \--- com.android.support:animated-vector-drawable:26.1.0
     |    |    |         |         +--- com.android.support:support-vector-drawable:26.1.0 (*)
     |    |    |         |         \--- com.android.support:support-core-ui:26.1.0 (*)
     |    |    |         \--- com.github.bumptech.glide:glide:3.6.0
     |    |    +--- me.alzz:kosp:1.0.0
     |    |    |    +--- org.jetbrains.kotlin:kotlin-stdlib-jre7:1.1.51 -> 1.2.0
     |    |    |    |    \--- org.jetbrains.kotlin:kotlin-stdlib:1.2.0 (*)
     |    |    |    \--- com.android.support:appcompat-v7:26.1.0 (*)
     |    |    +--- com.lijia.lib:modservice:7.1.0-SNAPSHOT
     |    |    |    +--- com.lijia:useragent:7.1.0-SNAPSHOT
     |    |    |    |    +--- com.lijia.lib:modcore:7.1.0-SNAPSHOT
     |    |    |    |    |    +--- com.android.support:support-annotations:25.0.1 -> 26.1.0
     |    |    |    |    |    \--- com.lijia.lib:common:7.1.0-SNAPSHOT
     |    |    |    |    |         +--- com.android.support:design:23.2.1 -> 23.3.0
     |    |    |    |    |         |    +--- com.android.support:appcompat-v7:23.3.0 -> 26.1.0 (*)
     |    |    |    |    |         |    +--- com.android.support:support-v4:23.3.0 -> 26.1.0 (*)
     |    |    |    |    |         |    \--- com.android.support:recyclerview-v7:23.3.0 -> 23.4.0 (*)
     |    |    |    |    |         \--- com.tencent.bugly:crashreport:latest.release -> 2.6.6.1
     |    |    |    |    \--- com.lijia.lib:common:7.1.0-SNAPSHOT (*)
     |    |    +--- com.lijia.lib:webserver:7.0.0
     |    |    \--- org.jetbrains.kotlin:kotlin-stdlib-jre7:1.2.0 (*)
     |    \--- com.tencent.mm.opensdk:wechat-sdk-android-without-mta:1.4.0
(*) - dependencies omitted (listed previously)
```

## 分析
可以看到自己依赖的 support 库都是 23 24版本的，所以不会导致问题，但是加上依赖``me.alzz:kosp``之后，依赖的 support v7 版本是 26.1.0，而 v7 库又依赖了 v4 库，所以 v4 库被升到了 26.1.0，但是用到的 Recycleview 在 design 包中，版本号是 23.3.0，依赖的一个库``com.yanzhenjie:recyclerview-swipe``将其升到了 23.4.0，所以 Recycleview 的版本和 support-v4 的版本是对应不上的，才导致的这个问题。所以将依赖的 design 包升级到 26 即可解决问题。
```
compile 'com.android.support:design:26.1.0'
```
出现这个问题的原因就是 support 各种库的版本不一致。一般不容易出现这个问题，但是我的项目 **进行模块化，将代码分为了很多模块，对应到不同的工程，不同的 Module，导致 gradle 文件是分散的，经常改了这处忘了那处。这里写下这篇文章也是加深下印象，也给自己提个醒，以后一定要注意 support 库的版本号，不然有可能导致崩溃**。

## 题外话
gradle 插件升级 3.0.0 之后执行查找依赖变化了，执行命令后返回的 Log 如下：
```
cateringDevCompile - Compile dependencies for 'cateringDev' sources (deprecated: use 'cateringDevImplementation' instead). (n)
No dependencies
```
换成：
```
./gradlew app:dependencies --configuration cateringDevImplementation
```
返回的 Log 如下：
```
cateringDevImplementation - Implementation only dependencies for 'cateringDev' sources. (n)
\--- project ui-jch (n)

(n) - Not resolved (configuration is not meant to be resolved)
```
无法直观的看到依赖树，这个时候直接去掉 configuration，然后执行，可以看到所有编译的依赖树，然后选取你要的 buildVariant 即可，比如：
```
./gradlew app:dependencies --configuration cateringDevDebugCompileClasspath
```
