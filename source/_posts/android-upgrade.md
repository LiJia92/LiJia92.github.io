---
title: Android 版本升级
date: 2023-11-09 17:14:26
tags:
 - Android 进阶
---
公司内部有一套自己的基础库，各 App 或者模块都使用这个基础库进行开发。基础库有自己的迭代版本，可能是需求开发，也可能是 bugfix。项目初期，基于 16 版本的基础库进行开发，后续有若干个性化需求或者 bug 需要调整，便基于 16 的版本创建了 16-jky 的个性版本，用于自己这个项目。后面便独立出来了，不再跟进基础库的版本升级了，自己有 bug 或者需求自己改，自己升版本，自己用。
项目后期有一个 SDK 的需求，抽出项目中的一些功能，给出一个 SDK 由公司另一个 App 集成。这个 SDK 是基于 16-jky 版本进行开发。近期公司基础库做了很大的升级，升到了 18，适配到了 Android 14。集成的 App 也需要升级，便要求我们出一个基于最新版本基础库的 SDK。于是便开始了一次 Android 版本升级之旅，小小记录一下，万一后面项目也需要升级呢。

<!-- more -->

此次升级，有若干版本升级：
```
minSdkVersion = 24
compileSdkVersion = 34
buildToolsVersion = 34.0.0
targetSdkVersion = 34
javaVersion = 17
kotlinVersion = 1.8.22
AGP = 8.1.0
```

## 升级 Android Studio
为了升级 AGP 到 8.1.0，需要升级 Android Studio。Android Studio 于 AGP 的版本适配关系如下图：
<img src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/DE9FF54A-52BF-4455-B5DF-C467B7B4C485.png"  width=50% />
通过 Android 官网下载最新稳定版 Android Studio Giraffe 是支持 AGP 8.1.0 的。

## 下载 JDK
通过下面的步骤将项目的 JDK 17 环境下载好：
<img src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG735.jpg"  width=50% />

<img src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG736.jpg"  width=50% />

## 配置修改
几个必备的资源准备好了之后，下面就是通过各种代码配置相应的东西了。
1. 项目根目录 build.gradle 设置 AGP 和 kotlin：
```
buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.22'
    }
}
```
2. 在 build.gradle 的 android 目录下设置相应的 JDK 版本：
```
android {
  compileOptions {
    sourceCompatibility project.androidsdk.javaVersion
    targetCompatibility project.androidsdk.javaVersion
  }

  kotlinOptions {
      jvmTarget = project.androidsdk.javaVersion
    }
}
```
3. gradle wrapper 设置成 8.0：
```
distributionUrl=https\://services.gradle.org/distributions/gradle-8.0-bin.zip
```
4. settings.gradle 设置插件环境：
```
pluginManagement {
    repositories {
        mavenLocal()
        mavenCentral()
        google()
    }

    plugins {
        id 'cn.mc.simple.plugins.mc-deploy' version '4.0.3'
    }
}
```
定义了``mc-deploy``的插件，并设置了版本，在其他 module 需要用到插件时在 module 的 gradle 文件设置：
```
plugins {
    id 'cn.mc.simple.plugins.mc-deploy'
}
```
注意，这个时候就不要定义版本号了，否则容易版本冲突，报如下的错误：
> Error resolving plugin Plugin request for plugin already on the classpath must not include a version.

**即在 settings.gradle 中设置好所有插件的版本，其他 gradle 文件直接引用即可，不要再单独指定版本号。**关于 plugins 的使用还有一些限制：buildScript 必须放 plugins 之前等等，这个在使用时需要注意。
5. 设置 buildConfig。碰到如下错误：
> Build Type contains custom BuildConfig fields, but the feature is disabled.

在 module 的 build.gradle 设置：
```
android {
    buildFeatures {
        buildConfig = true
    }
}
```
6. namespace 设置：
```
android {
  namespace = "xx.xx.xx.xx"
}
```
7. Manifest merger failed with multiple errors。Manifest 文件在合并时出现多个错误。通常日志一次就显示一条错误，甚至不显示，这里直接使用如下指令：
```
./gradlew processReleaseManifest --stacktrace
```
这样会将所有的错误全部罗列完，然后照着改就好了。
8. android 14 适配。在 android 14 有一些特性的调整，但 SDK 代码不多，目前就调整了一个广播相关的：
```
ContextCompat.registerReceiver(context, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
```
动态广播注册需要显示指定相应的 Flag。至于其他适配，那便是需要修改什么就改什么了。
9. 去掉 kotlin stdlib 的声明：
> You no longer need to declare a dependency on the stdlib library in any Kotlin Gradle project, including a multiplatform one. The dependency is added by default.
The automatically added standard library will be the same version of the Kotlin Gradle plugin, since they have the same versioning.
For platform-specific source sets, the corresponding platform-specific variant of the library is used, while a common standard library is added to the rest. The Kotlin Gradle plugin will select the appropriate JVM standard library depending on the kotlinOptions.jvmTarget compiler option of your Gradle build script.

## 小结
整个升级过程持续了三小时，中途碰到的问题不止文中描述的，记录一下方便后面其他项目升级时使用。
