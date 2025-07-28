---
title: Android 获取 BuildConfig 信息
date: 2018-01-04 09:36:15
tags:
 - Android 基础
---
项目开发中，我们的 App 这个 Module 定义了3个 buildType：
```
buildTypes {
    release {
        buildConfigField("Integer", "HOST_TYPE", '0')
    }
    debug {
        buildConfigField("Integer", "HOST_TYPE", '1')
    }
    beta {
        buildConfigField("Integer", "HOST_TYPE", '2')
    }
}
```
通过参数 HOST_TYPE 来指定数据的环境。debug 为内网测试版，beta 为外网测试版，release 为正式版本。
项目有3个产品线：手机、POS机、收银机，Module 的依赖是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/01/04/%E9%80%89%E5%8C%BA_322.png)
App 作为 Application，其他作为 Library。

<!-- more -->

现在需要在收银机登录页打上版本的标识，方便调试（因为经常搞混...）。例如 v3.1.0(debug)，v3.1.0(beta)，正式版本则是 v3.1.0。
那么现在就需要在收银机 Module 中获取 BuildConfig 的信息，一个是 BuildConfig.DEBUG，以及 BuildConfig.BUILD_TYPE。但是无论我 App 切换成 debug，beta，还是 release，收银机中获取到的值都是``BuildConfig.DEBUG = false，BuildConfig.BUILD_TYPE = "release"``。可以看出来，**BuildConfig 信息是根据当前 Module 来的，每个 Module 的 BuildConfig 是各自进行配置的**。而作为 Library Module，我们直接把 debug 给忽略了，所以 Library Module 一直是 release 版本。
```
variantFilter { variant ->
    def buildType = variant.buildType.name
    if (buildType.contains("debug")) {
        setIgnore(true)
    }
}
```
那么 **如何在 Library Module 获取 App Module 中的 BuildConfig 信息呢？**

## 方案一
Library Module 进行与 App Module 一样的 buildType 设置。然后 App 的依赖就像这样：
```
dependencies {
    releaseCompile project(path: ':Library', configuration: 'release')
    debugCompile project(path: ':Library', configuration: 'debug')
    betaCompile project(path: ':Library', configuration: 'beta')
}
```
这当然可以解决问题，但是 Library 添加多个编译类型无疑会加长编译时间，而且所有 buildVariant 都得进行配置，侵入性太强，不可取。

## 方案二
使 Library Module 能够 import 到外层真正运行 App 的 BuildConfig，如下：
```
public class AppUtils {

    private static Boolean isDebug = null;

    public static boolean isDebug() {
        return isDebug == null ? false : isDebug.booleanValue();
    }

    public static void syncIsDebug(Context context) {
        if (isDebug == null) {
            try {
                String packageName = context.getPackageName();
                Class buildConfig = Class.forName(packageName + ".BuildConfig");
                Field DEBUG = buildConfig.getField("DEBUG");
                DEBUG.setAccessible(true);
                isDebug = DEBUG.getBoolean(null);
            } catch (Throwable t) {
                // Do nothing
            }
        }
    }
}
```
通过反射得到真正执行的 Module 的 BuildConfig，在自己的 Application 内调用：
```
AppUtils.syncIsDebug(getApplicationContext());
```
这样看起来达到目的了。
但仔细想想会发现这种解决方案还是有问题，因为 BuildConfig.java 的 packageName 是 Module 的 Package Name，即 AndroidManifest.xml 中的 package 属性，而 context.getPackageName() 得到的是应用的 applicationId，这个 applicationId 通过 build.gradle 是可以修改的。所以当 build.gradle 中的 applicationId 与 AndroidManifest.xml 中的 package 属性不一致时，上面的反射查找类路径便会出错。而恰恰项目中利用了 gradle 配置的 applicationId，所以此方案也不可取。

## 方案三
AppCommon 中新建一个类，利用这个类保存 App Module 中的 BuildConfig 信息。
```
public class BuildTypeHelper {

    /**
     * 是否可调试
     */
    private static boolean mIsDebug = false;

    /**
     * 编译类型：debug、beta、release
     */
    private static String mBuildType = "";

    public static void init(boolean isDebug, String buildType) {
        mIsDebug = isDebug;
        mBuildType = buildType;
    }

    public static String getBuildType() {
        return mBuildType;
    }

    public static boolean isDebug() {
        return mIsDebug;
    }
}
```
然后在 App Module 中的 Application 初始化时进行赋值：
```
public class MyApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        BuildTypeHelper.init(BuildConfig.DEBUG, BuildConfig.BUILD_TYPE);
    }
}
```
然后在 Library Module 中取值使用：
```
if (BuildTypeHelper.isDebug()) {
    mVersionTv.setText(String.format("v%s(%s)", AppUtils.getCurrentVersionName(this), BuildTypeHelper.getBuildType()));
} else {
    mVersionTv.setText(String.format("v%s", AppUtils.getCurrentVersionName(this)));
}
```

## 再说一点
如果只是想获取 BuildConfig.DEBUG，可以使用 ApplicationInfo.FLAG_DEBUGGABLE。我们反编译 Debug 包和 Release 包对比看看有没有其他的区别，会发现他们 AndroidManifest.xml 中 Application 节点的 android:debuggable 值是不同的。Debug 包值为 true，Release 包值为 false，这是编译自动修改的。
```
public class AppUtils {

    private static Boolean isDebug = null;

    public static boolean isDebug() {
        return isDebug == null ? false : isDebug.booleanValue();
    }

    public static void syncIsDebug(Context context) {
        if (isDebug == null) {
            isDebug = context.getApplicationInfo() != null &&
                    (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        }
    }
}
```
在自己的 Application 内调用进行初始化：
```
AppUtils.syncIsDebug(getApplicationContext());
```
这样以后调用 AppUtils.isDebug() 即可判断是否是 Debug 版本，比如在上面的 LogUtils 中。同时适用于 Module 是 Lib 和 applicationId 被修改的情况，比 BuildConfig.DEBUG 靠谱的多。
这个方案有个注意事项就是自己 App Module 中不能主动设置 android:debuggable，否则无论 Debug 还是 Release 版会始终是设置的值。当然本身就没有自动设置的必要。
但是因为本例中还需要获取 BuildConfig.BUILD_TYPE，所以没有采取此方案。

## 参考
[Android Debug 版本判断及为什么 BuildConfig.DEBUG 始终为 false](http://www.trinea.cn/android/android-whether-debug-mode-why-buildconfig-debug-always-false/)
[AndroidStudio多模块编译之子模块的调试](https://huzongyao.github.io/2017/10/21/8.AndroidStudio%E5%A4%9A%E6%A8%A1%E5%9D%97%E7%BC%96%E8%AF%91%E4%B9%8B%E5%AD%90%E6%A8%A1%E5%9D%97%E7%9A%84%E8%B0%83%E8%AF%95/)
