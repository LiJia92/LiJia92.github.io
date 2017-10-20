---
title: Gradle多版本管理
date: 2017-03-16 16:54:10
tags:
 - gradle
---
之前有写过一篇[Android Studio使用Gradle进行多渠道打包](http://lastwarmth.win/2016/03/09/gradle-pack/)，多渠道打包算是Gradle最常用的功能了，但是它的强大可不止于此。

## 简介
Gradle是一个基于Apache Ant和Apache Maven概念的项目自动化建构工具。它使用一种基于Groovy的特定领域语言来声明项目设置，而不是传统的XML。
使用Gradle的优势:
1. 自动处理包相依关系 - 取自 Maven Repos 的概念
2. 自动处理布署问题 - 取自 Ant 的概念
3. 条件判断写法直觉 - 使用 Groovy 语言

更多关于Gradle的学习可以阅读[Gradle User Guide 中文版](https://dongchuan.gitbooks.io/gradle-user-guide-/)。

<!-- more -->

## 多版本
其实很多东西在你没有接触的时候，它的一些概念你是很难理解的。我现在重新去理解它，因为我碰到了这样一个情形：由于业务的拓展导致项目越来越复杂，由最初的一个手机基本App版本衍生出很多其他版本，比如pos机，收银机，pad等等，又或者是针对某些具体用户定制的版本。而这些版本的业务是基本一致的，只是在界面或者交互上有一些不一样，这个时候要如何构建自己的项目呢？答案当然是Gradle。

下面举个栗子。
创建一个AS项目，在app的build.radle中加入如下代码：
```
productFlavors {
    // pad版
    pad {

    }
    // 手机版
    phone {

    }
    // 定制版
    custom {

    }
}
```
然后我们看到``Build Variant``:
3个版本对应debug release，6个编译指令。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/03/16/%E9%80%89%E5%8C%BA_001.png)
在不同版本的编译指令中，我们可以做不同的事情。比如替换包名：
```
productFlavors {
    // pad版
    pad {
        applicationId "com.study.lijia.gradleapp.pad"
    }
    // 手机版
    phone {
        applicationId "com.study.lijia.gradleapp.phone"
    }
    // 定制版
    custom {
        applicationId "com.study.lijia.gradleapp"
    }
}
```
这样我们在手机上就可以安装三个不同的版本了。
再继续上面的情形，三个版本的绝大部分东西是一样的，只是有个别页面不一样。那么可以这样做：

依然继续上面的栗子。
在app src目录下，新建目录，与main目录平行，目录名称与gradle中配置的一致。然后继续创建java、res文件夹，再就是写代码了。注意多个文件夹中的文件名以及路径要一样，代码必须添加java文件夹，资源必须添加res文件夹。**公共模块中不能包含与其一样的类，否则当切到相应的版本会导致类重复。**
![](http://7xryow.com1.z0.glb.clouddn.com/2017/03/16/2017-03-17%2009:24:35%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)

当我们选择一个版本时候，另外不可用的代码就会变成``红色J标志``。如上图中，我选的custom版本，那么pad与phone目录下的代码都变成``红色J``了，代表当前版本没有用到此代码。
改变Build Variant，然后运行，将3个版本都装到设备上，运行后可以看到每个版本的内容是不一样的。（ubuntu录制gif还没找到很好的方法，就不放图了，可以自己跑代码看。）运行都是各自的代码，main下面的代码则是公共模块。

通过上面的栗子，我们知道可以通过``productFlavors``做各种版本配置。

## 依赖
当项目变得越来越复杂，就不仅仅是单个项目或者Module能解决的了的。我们通常会有很多个Module，继上面的栗子。

项目拓展后，我们新建了pad，phone，appcore3个module，最顶层的app定义实现各种presenter，pad主要针对pad版的界面，phone主要是针对phone版的界面，appcore则是公共底层，用于数据管理等。那么如果是pad版就有app->pad->appcore这样的依赖链。在app的build.gradle中配置:
```
dependencies {
    padCompile project(path: ':pad', configuration: 'commenDebug')
    phoneCompile project(path: ':phone', configuration: 'commenDebug')

    // custom依赖phone的special版
    customCompile project(path: ':phone', configuration: 'specialDebug')
}
```
可以结合productFlavors的gradle配置，这里是配置依赖。path是指定module，configuration是指定那个版本。因为我们在pad，phone中也有productFlavors配置。
```
publishNonDefault true
productFlavors {
    commen {

    }

    special {

    }
}

dependencies {
    commenCompile project(path: ':appcore')
    specialCompile project(path: ':appcore')
}
```
**注意publishNonDefault true必须加上，否则会提示找不到依赖项。** 这句话是设置没有默认发布类型。因为我们在productFlavors中设置了版本，而默认的是debug和release，所以会导致找不到依赖。
> It is important to realize that publishing multiple variants means publishing multiple aar files, instead of a single aar containing multiple variants. Each aar packaging contains a single variant. Publishing a variant means making this aar available as an output artifact of the Gradle project. This can then be used either when publishing to a maven repository, or when another project creates a dependency on the library project.

[摘自官网](http://tools.android.com/tech-docs/new-build-system/user-guide#TOC-Library-Publication)。

这时我们修改app的Build variant，下面相关的依赖则会跟着变化，因为我们做了这样的配置。

## 多渠道
通过``productFlavors``配置多版本，但是如果此时又要配置多渠道该怎么办呢？
最笨的方法，自然是依然通过``productFlavors``来配置了。但是这里要做1个乘法，如果有3个版本，每个版本又有15个渠道，那么可就得配置45个渠道了，简直要累死。。。

那么有没有不笨的方法呢？
方法终归是有的，美团的瓦力便是个不错的方法。它是在生成母包之后，动态替换里面的变量，重新生成渠道包，省去了编译时间，极大的减少了AS gradle编译的时间。
瓦力相关信息可参考[新一代开源Android渠道包生成工具Walle](http://tech.meituan.com/android-apk-v2-signature-scheme.html)。

## 任务
Gradle可以配置各种task，接上面的来讲，可以在生成母包之后直接执行瓦力的渠道替换。
比如举个栗子，配置pad版的渠道：
```
task releasePAD << {

    def flavorMap = [
        // 官网版本
        "maimairen" : "MHP4PDQFZXZRVNSDXK3G",
        // 360平台
        "_360cn" : "KB3G2X6SKY379YWWBD56",
        // 腾讯应用宝
        "QQyyb" : "DCRCMBNQDWMV4GDQCTXW",
    ]

    def sourceApk = "./build/outputs/apk/app-pad-release.apk"
    if (!file(sourceApk).exists()) {
        throw new RuntimeException("找不到原始apk,请先执行 assemblePadRelease!!");
    }

    flavorMap.each {
        def flavor = it.key
        def flurryKey = it.value

        exec {
            executable "bash"
            args "-c", "java -jar ./walle-cli-all.jar put -c $flavor -e flurryKey=$flurryKey $sourceApk ./build/outputs/apk/app-$flavor-release.apk"
        }
    }
}
```

[示例代码](https://github.com/LiJia92/GradleApp)
