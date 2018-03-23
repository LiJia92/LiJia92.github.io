---
title: Gradle 多版本管理（续）
date: 2017-10-24 10:20:01
tags:
 - gradle
---
之前写过一篇[Gradle多版本管理](http://lastwarmth.win/2017/03/16/gradle-app/)，主要是通过``productFlavors``来控制产品版本。这篇文章将结合``buildTypes``来说一下多版本管理。
在正常开发中，我们一般会有至少 2 个环境：Debug、Release，即测试环境和生产环境。显然这 2 个环境要用 2 套不同的数据，那么在我们的 App 里必然就需要有个地方来控制这个环境。当然，我们可以在 Debug 的时候用 Debug 环境，然后当要发版时手动改成 Release 环境，但是这很麻烦，很难排除忘记修改的情况，那么等待重新编译将是个很漫长的过程。其实Gradle可以很好的解决这个问题：**利用 buildTypes 来控制编译类型。**
buildTypes 默认会有 debug、release 2 个类型，当然我们还可以添加自己的。比如有个beta环境，用于外网测试。当对接一些三方平台的接口时，有的只能用外网，那么只能整一套外网的测试环境了，比如美团外卖。好，现在假设我们有 debug、beta、release 3 个 buildTypes，然后 pad、phone、custom ３个 productFlavors，接下来就是针对这些环境做配置了：

<!-- more -->

```
signingConfigs {
    lijia {
        keyAlias 'lijia'
        keyPassword '123456'
        storeFile file('../lijia.jks')
        storePassword '123456'
    }
}

buildTypes {
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        buildConfigField("Integer", "HOST_TYPE", '0')
        signingConfig signingConfigs.lijia
    }

    debug {
        buildConfigField("Integer", "HOST_TYPE", '1')
    }

    beta {
        buildConfigField("Integer", "HOST_TYPE", '2')
        signingConfig signingConfigs.lijia
    }
}

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
除了 debug 版不需要签名，其他的编译版本都需要签名。这里随便生成一个，配置在 grandl e中。可以看到我们通过``buildConfigField("Integer", "HOST_TYPE", '2')``来进行配置``HOST_TYPE``，配置好了后需要在应用启动的时候进行设置。一般放在 Application 中：
```
public class MyApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        // 设置编译类型
        AppCore.setType(BuildConfig.HOST_TYPE);
    }
}
```
然后 AppCore 根据 HOST_TYPE 来读取、操作不同环境的数据。
```
public class AppCore {

    private final static int TYPE_RELEASE = 0;
    private final static int TYPE_DEBUG = 1;
    private final static int TYPE_BETA = 2;

    private static int mHostType = TYPE_DEBUG;


    public static void setType(int type) {
        mHostType = type;
    }

    public static String getContentFromCore() {
        if (mHostType == TYPE_RELEASE) {
            return "Hello World From Release";
        } else if (mHostType == TYPE_DEBUG) {
            return "Hello World From Debug";
        } else if (mHostType == TYPE_BETA) {
            return "Hello World From Beta";
        }
        return "Hello World";
    }
}
```
然后选择 release 版本运行会显示``Hello World From Release``，其他版本也会显示对应的字符串。那么我们在打包的时候直接打包 Release Build Variant 就行了。当 Debug 或 Beta 进行调试时，选择 Debug（Beta）Build Variant 即可，通过配置可以减少程序员可能造成的错误。当然，如果只是场景比较简单，你也可以直接代码里写``if (BuildConfig.DEBUG)``。另外如果 Release 版本出问题后面进行跟踪时， Release 的包默认是会混淆优化资源的，而且不可调试，只能改配置。但是如果是根据 Gradle 配置的，我可以直接在 debug 版本里设置 release 的值：
```
release {
    buildConfigField("Integer", "HOST_TYPE", '0')
}

debug {
    buildConfigField("Integer", "HOST_TYPE", '0') // 设置和 release 一样的值，运行跟踪问题
}
```
另外一般接入三方 SDK 的时候都会有很多平台的 so，x86 平台一般只是虚拟机用到，在 release 版本中是不需要的，那么就可以配置，在 release 版本中去除 x86，这样也可以减小包的体积。
```
buildTypes {
    release {
      ndk {
          abiFilters 'armeabi', 'armeabi-v7a'
      }
    }
    debug {
        ndk {
            abiFilters 'armeabi', 'armeabi-v7a', 'x86'
        }
    }
    beta {
        ndk {
            abiFilters 'armeabi', 'armeabi-v7a', 'x86'
        }
    }
}
```
通过``buildTypes``与``productFlavors``二者结合可以构建出很多的版本，而且可以进行很灵活的配置。文中例子３个 buildTypes，３个 productFlavors，那么就会有``3 * 3 = 9``个Build Variant了。当然这只是一个Module的配置，当我们Module很多时，上层 App 定义产品 Build Variant，然后依赖 Module 的不同 Build Variant，这样下来我们可以构建各种各样的版本来适应各种需求定制了。
再说个项目中用到的场景。业务越做越广，涉及到商家之前的合作也越来越多。很多商家有自己的定制需求，比如换 Logo 啊，换启动图标啊，等等，总不能需求来一个我们就手动改下资源，然后打包吧。所以通过 Gradle 配置好了 Build Variant 了，然后不同的变种下面放置不同的资源，达到打包含不同资源（或其他定制需求）的包的目的。
```
buildTypes {
    retail { }

    catering { }

    takeout { }
}

publishNonDefault true
productFlavors {
    mmr {}

    xgt {}

    efs {}
}
```
这是我们项目中配置的，然后区分文件夹放置不同的资源：
![](http://7xryow.com1.z0.glb.clouddn.com/2017/10/24/%E9%80%89%E5%8C%BA_218.GdkPixdata)

注意这种配置并不是只有``3 * 3 = 9``个变种，而是有１５个。buildTypes 默认包含 debug，release，尽管我们没有显示的配置，所以应该是``5 * 3 = 15``个变种。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/10/24/%E9%80%89%E5%8C%BA_219.png)
当不需要某些变种时，可以直接忽略掉：
```
variantFilter { variant ->
    def ignoreVariants = [
            "xgtTakeout",
            "efsTakeout",
            "efsCatering",
    ]

    def buildType = variant.buildType.name
    // To check for a certain build type, use variant.buildType.name == "<buildType>"
    if (buildType.contains("debug") || buildType.contains("release")) {
        // Gradle ignores any variants that satisfy the conditions above.
        setIgnore(true)
    } else if (ignoreVariants.contains(variant.name)) {
        setIgnore(true)
    }
}
```
重新编译，就可以看到变种只剩６个了。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/10/24/%E9%80%89%E5%8C%BA_220.png)
Gradle 的功能真的是太强大了，需要持续学习。
