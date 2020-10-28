---
title: Android 打包动态修改变量
date: 2020-10-28 16:47:52
tags:
 - 日常开发
---
在项目中经常有这种需求：在打包时指定某些变量的值，比如渠道号、应用名称等。我们采用 Jenkins 进行打包构建，可以添加相应的参数，参数可以直接在打包脚本中使用，也可以在项目的 gradle 文件中使用。下面以动态改变端口号，举例进行说明。

## Jenkins 添加变量
在 Jenkins 构建的设置中，添加变量``PORT_NAME``，做成选择项（固定的变量尽量避免人为错误），然后添加一下说明。这个变量可以在 Build 配置中的 Execute shell 中使用，当前场景不需要，只需要配置即可。

<!-- more -->

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/WechatIMG59.png)

## gradle 获取
在项目的 gradle 文件的 android 路径下，使用``System.getenv("PORT_NAME")``便可以获取到 Jenkins 上配置的值了。
```
// 默认 MT1 端口
def portName = "/dev/ttyMT1"
if (System.getenv("PORT_NAME")) {
    portName = System.getenv("PORT_NAME")
}
```

## 设置使用
现在在 gradle 代码中已经获取到配置的变量了，那么就有几种方式将它写入到我们的 android 代码中。
1. resValue：
```
resValue("string", "port_name", "/dev/ttyMT1")
```
此种方式，是添加一个 string 的 resource 到我们的代码中，编译打包最终生成的 resource.arsc 中便会包含这个 port_name 值，但是在引用时，会提示找不到变量，从而标红，但是运行没问题。（运行后代码便会写入，就能找到了）同时，我们的 res 文件夹下面不能添加 port_name 的 res，否则会报错：duplicate string resources。
2. manifestPlaceholders：
```
<meta-data
     android:name="port_name"
     android:value="${port_name}"/>

buildTypes {
    debug {
        manifestPlaceholders = [port_name: "/dev/ttyMT1"]
    }
    release {
 　　    manifestPlaceholders = [port_name: "/dev/ttyMT1"]
    }
}
```
然后获取 meta 值：
```
ActivityInfo info = getPackageManager().getActivityInfo(getComponentName(), PackageManager.GET_META_DATA);
String msg = info.metaData.getString("port_name");
```
3. buildConfigField：
```
buildTypes {
    release {
        buildConfigField("String", "PORT_NAME", "\"$portName\"")
    }
    }
    debug {
        buildConfigField("String", "PORT_NAME", "\"$portName\"")
    }
}
```
这种方式要注意2点：**String 开头 S 必须大写；双引号必须要转义**。
获取：
```
private static final String PortName = BuildConfig.PORT_NAME;
```

小结：方式 1 会变红；方式 2 获取比较麻烦；所以最后采用方式 3。