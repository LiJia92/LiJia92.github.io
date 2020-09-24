---
title: 混淆小记
date: 2020-09-24 19:17:51
tags:
 - 日常开发
---
最近做的项目是个新项目，早期为了快速迭代实现需求，在混淆这块没做过处理。最近打算上 release 包，混淆这块肯定还是需要的。

## 开启混淆
在 App Module 的 build.gradle 文件中配置开启混淆：
```
release {
    signingConfig signingConfigs.release
    minifyEnabled true
    multiDexEnabled = true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    resValue("string", "build_type", "debug")
}
```

<!-- more -->

minifyEnabled 开启为 true 则开启混淆，混淆规则为 proguard-rules.pro 中配置。proguardFiles getDefaultProguardFile('proguard-android.txt') 会包含一份 Android 默认的混淆规则，比如四大组件的混淆等等。proguard-android-optimize.txt 也是默认的混淆规则，但是相比于 proguard-android.txt，它包含更“严格”的优化项，可能会出现某些预料之外的表现，比如连包名都给混淆了，视情况是否需要采用 optimize 吧。

## 混淆继承
作为 lib 库，最好是能实现自身的混淆规则，通过 consumerProguardFiles 指定自身混淆规则，这样第三方在依赖 lib 时便可以不用手动配混淆规则了：
```
release {
    minifyEnabled false
    consumerProguardFiles 'proguard-rules.pro'
}
```

## 混淆文件合并
有些时候可能需要获取全量的混淆规则，来排查一些问题，可以在 App 层的混淆文件中加入这句：
```
-printconfiguration "build/outputs/mapping/configuration.txt"
```
这样再成功 build 完之后，就能在相应路径下面看到 configuration.txt，它包含了全部的混淆规则（Android 默认的也能看得到）。

## 常用混淆
1. 开启 ViewBinding 使用反射调用 inflate 实现基类，需要 keep ViewBinging：
```
private fun initViewBinding(inflater: LayoutInflater, container: ViewGroup?): View {
    val type = javaClass.genericSuperclass
    val clazz = (type as ParameterizedType).actualTypeArguments[0] as Class<VB>
    val method = clazz.getMethod(
        "inflate",
        LayoutInflater::class.java,
        ViewGroup::class.java,
        Boolean::class.java
    )
    viewBinding = method.invoke(null, inflater, container, false) as VB
    return viewBinding.root
}

-keep class * implements androidx.viewbinding.ViewBinding {
    *;
}
```
2. 自定义 ViewModelProvider.Factory，会反射调用构造方法，也需要 keep：
```
override fun <T : ViewModel> create(modelClass: Class<T>): T {
    val examSite = intent.getSerializableExtra(KEY_EXAM_SITE) as ExamSite
    return modelClass.getConstructor(ExamSite::class.java).newInstance(examSite)
}

-keepclassmembers public class * extends androidx.lifecycle.ViewModel {
    public <init>(...);
}
```
kotlin 写的这个 ViewModelProvider.Factory 在添加混淆之后，依然报错：
> kotlin.jvm.KotlinReflectionNotSupportedError: Kotlin reflection implementation is not found at runtime. Make sure you have kotlin-reflect.jar in the classpath.

所以解决方法便是添加 kotlin-reflect.jar：
```
implementation "org.jetbrains.kotlin:kotlin-reflect:$project.thirdparty.kotlinVersion"
```
3. 其他用到反射的地方，以及各类 SDK 的混淆，需要注意。