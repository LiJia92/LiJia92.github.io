---
title: 关于枚举类初始化的一个“耳光”
date: 2022-03-07 14:00:53
tags:
 - 日常开发
---
项目中需要使用 Usb 摄像头，摄像头产生数据，然后业务方拿到数据后做自己的事情：推流、人脸登录、AI 检测等等。于是写了一个枚举类 CameraIntent 用来标识摄像头的意图。在 CameraIntent 每个枚举项初始化的时候，设置一个 key，然后根据这个 key 拿到 SharedPreferences 中绑定 UsbDevice 的名称，以此找到对应 UsbDevice 的摄像头，从而获取数据。

<!-- more -->

所以写了这样的一个类：
```
enum class CameraIntent(val desc: String, val key: String) {

    PUSH("视频推流", KEY_PUSH),
    AI("AI识别", KEY_ACTION),
    FACE("人脸识别", KEY_FACE);

    private val cache = ValueCache.create(key, getDefaultValue(), String::class.java)

    /**
     * 将业务绑定到具体的摄像头，可以多个业务绑定到同一个摄像头
     */
    fun saveDevice(device: String) {
        cache.save(device)
    }

    fun getDevice(): String {
        return cache.get()
    }

    private fun getDefaultValue(): String {
        return when (this.key) {
            KEY_FACE -> {
                MucangConfig.getContext().resources.getString(R.string.default_face_camera)
            }
            KEY_ACTION -> {
                MucangConfig.getContext().resources.getString(R.string.default_action_camera)
            }
            KEY_PUSH -> {
                MucangConfig.getContext().resources.getString(R.string.default_push_camera)
            }
            else -> {
                ""
            }
        }
    }
}
```
自信满满跑了一把，然后...收获了崩溃。日志是这样的...
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2022/WechatIMG232.png)
报了两个错：ExceptionInInitializerError、空指针异常。
然后围绕着这两个错误进行了大量的搜索，也没找到有效的信息。然后再回过头仔细看看代码，豁然开朗！
枚举类也是类，枚举项即是类对象。在使用对象之前，一般都得先 new 一个，枚举类无非就是 Java 自动 new 了，但是它仍然可以理解为一个对象。一个对象在没有初始化完成的时候，它是不可用的状态，调用其属性、方法肯定是会报错的。
再看到代码：在 cache 属性的创建过程中，使用了 this 关键字，而 cache 的创建过程是属于这个类对象初始化过程的，也就是在类还没有初始化完成的时候就去使用它了，必然报错。
先有鸡还是先有蛋？当然这个问题我也不知道答案是什么。但是文中的答案是确定的：先有对象，再有属性。
所以改成这样：
```
enum class CameraIntent(val desc: String, val key: String) {

    PUSH("视频推流", KEY_PUSH),
    AI("AI识别", KEY_ACTION),
    FACE("人脸识别", KEY_FACE);

    private val cache = ValueCache.create(key, getDefaultValue(key), String::class.java)

    /**
     * 将业务绑定到具体的摄像头，可以多个业务绑定到同一个摄像头
     */
    fun saveDevice(device: String) {
        cache.save(device)
    }

    fun getDevice(): String {
        return cache.get()
    }

    private fun getDefaultValue(key: String): String {
        return when (key) {
            KEY_FACE -> {
                MucangConfig.getContext().resources.getString(R.string.default_face_camera)
            }
            KEY_ACTION -> {
                MucangConfig.getContext().resources.getString(R.string.default_action_camera)
            }
            KEY_PUSH -> {
                MucangConfig.getContext().resources.getString(R.string.default_push_camera)
            }
            else -> {
                ""
            }
        }
    }
}
```
getDefaultValue 直接使用构造函数中的 key，这样在对象初始化的时候，依赖的都是外部的属性。编译一把，正常运行。
**所以啊，碰到问题了先看看代码，自己分析一下。可能有些问题是不需要 Google 的，它只需要结合逻辑思维，多想一下，可能答案就会出来了。**
