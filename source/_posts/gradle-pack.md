---
title: Android Studio使用Gradle进行多渠道打包
date: 2016-03-09 14:39:58
tags:
 - gradle
---

使用Android Studio也有一段时间了，最近项目开发完成，内部测试也已经通过。下一步就是渠道打包，然后上线了。

在出渠道包的时候，若是出一个包，便手动修改一次渠道号，很显然是很费时费力的。庆幸的是，Android Studio采用的Gradle可以很方便的实现我们的多渠道出包。

下面结合代码进行说明。

项目中使用的是友盟，在AndroidManifest.xml中有这样的代码：
```
<meta-data android:name="UMENG_CHANNEL" android:value="${UMENG_CHANNEL_VALUE}" />
```
其中${UMENG_CHANNEL_VALUE}中的值就是在gradle中自定义配置的值。

<!--more-->

然后在项目的build.gradle中利用productFlavors进行多渠道的配置，在android节点下添加如下代码：
```
productFlavors {
        official {
            manifestPlaceholders = [UMENG_CHANNEL_VALUE: "official"]
        }
        baidu {
            manifestPlaceholders = [UMENG_CHANNEL_VALUE: "baidu"]
        }
        _360 {
            manifestPlaceholders = [UMENG_CHANNEL_VALUE: "_360"]
        }
        samsung {
            manifestPlaceholders = [UMENG_CHANNEL_VALUE: "samsung"]
        }
        huawei {
            manifestPlaceholders = [UMENG_CHANNEL_VALUE: "huawei"]
        }
        lenovo {
            manifestPlaceholders = [UMENG_CHANNEL_VALUE: "lenovo"]
        }
    }
```
项目实际情况，便是上线百度、360、三星、华为、联想这5个市场。

至此，所有的配置已经完成。下面开始编译出包了。

在Android Studio中打开Terminal：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/03/gradle-pack1.png)
输入指令``gradlew assembleRelease``便可以生成所有的渠道包了。但是此次命令中使用的gradle版本无法控制，很有可能会去下其他的gradle版本，gradle的下载需要翻墙，若是没翻则会一直下载，耽误时间。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/03/gradle-pack2.png)
这里我们直接ctrl+c，再输入y，终止操作。使用下面的方法。

先找到gralde的根目录，在系统变量里添加两个环境变量：

变量名为GRADLE_HOME，变量值就为gradle的根目录。在我的环境里，使用的gradle 2.2.1的版本，目录是C:\Users\*****\.gradle\wrapper\dists\gradle-2.2.1-all\c64ydeuardnfqctvr1gm30w53\gradle-2.2.1。

然后在系统变量path里面添加gradle的bin目录%GRADLE_HOME%\bin。

这里配置完成了，接着在Terminal中敲下``gradle assembleRelease``就可以一次性生成所有的渠道包了。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/03/gradle-pack3.png)
build成功后，便可生成所有渠道的渠道包了。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/03/gradle-pack4.png)
若是想单独生成某一个渠道包，先打开Android Studio右侧的Gradle栏：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/03/gradle-pack5.png)
点到相应项目的build task中。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/03/gradle-pack6.png)
要生成什么渠道包，双击相应的栏目即可。

---
改进：将productFlavors改成如下，更加简洁些：
```
productFlavors {
        "official" {}
        "baidu" {}
        "_360" {}
        "samsung" {}
        "huawei" {}
        "lenovo" {}
    }

    productFlavors.all {
        flavor -> flavor.manifestPlaceholders = [UMENG_CHANNEL_VALUE: name]
    }
```
