---
title: Android 日常开发的一些小知识
date: 2017-08-29 17:06:48
tags:
 - 日常开发
---

前段时间终于下定决心自己实践 RxJava，Retrofit 等当前十分流行的库，利用 Gank.io 的公共 API，做一个自己的 Gank 客户端。项目地址： [Gank](https://github.com/LiJia92/Gank)。只要有闲暇时间便会写写代码，慢慢完善。期间有一些小的知识点，但是却很实用，这里便列一下。关于 RxJava，Retrofit 目前学习还不是很深入，这里便不展开了。

## @SerializedName
现在与服务端通信通常都是Json，但是服务器返回的Json串的key是服务端自己的命名规则（可能是中文key，或者大写开头），我们直接通过Gson解析就必须一一对应，但是这样的命名在Java里很不友好。
那么就可以通过@SerializedName注解给Bean类进行“重命名”，这样在解析的时候便可以直接利用我们自己的命名规则命名变量了。
举个栗子：http://gank.io/api/day/2017/08/03
返回的数据包含``Android``，``福利``等不符合Java规范的key，那么就可以这样：
```
public class DataResults {
    @SerializedName("Android")
    List<ItemData> androidList;

    @SerializedName("iOS")
    List<ItemData> iOSList;

    @SerializedName("休息视频")
    List<ItemData> restList;

    @SerializedName("前端")
    List<ItemData> jsList;

    @SerializedName("福利")
    List<ItemData> welfareList;
}
```
如此便可以直接通过Gson解析，并且变量名是以我们自己的命名规则进行命令的了。

<!-- more -->

## 水波纹效果
Android 5.0 及以上才有水波纹效果。简单实现:
```
android:background="?attr/selectableItemBackground"
```
也可以添加手动添加drawable:
```
<ripple xmlns:android="http://schemas.android.com/apk/res/android"
    android:color="?android:colorControlHighlight">

</ripple>
```
然后设置给布局的 background， **布局必须可点击**。同时为了兼容，最好建立``drawable-v21``来区分开来。建立低版本的 drawable 去对应 5.0 以下的版本。当然，目前也有很多库可以实现 5.0 以下的水波纹效果，可以参考[RippleEffect](https://github.com/traex/RippleEffect)。

> [android5.0 水波纹点击效果](http://www.jianshu.com/p/7d2a8a5836e0)

## Intent传递复杂数据
我们知道可以通过 Intent 在多个 Activity、Fragment 之间进行数据传递。基本数据类型不用说，当传递自定义数据类型时，需要实现 Serializable 或 Parcelable 接口。前者通过 Intent 的 getSerializableExtra() 获取数据，后者通过 getParcelableExtra()、getParcelableArrayExtra()、getParcelableArrayListExtra() 获取数据。
但是当我们传递的数据是``ArrayList<List<Object>>``这种嵌套 List 数据呢？
当我们是通过 Parcelable 接口进行传递时，会碰到如下的错误：
```
Error:(46, 88) 错误: 不兼容的类型: ArrayList<Parcelable>无法转换为ArrayList<List<MyObject>>
```
即类型无法强转。
当我们通过 Serializable 接口进行传递时，没有错误，只会有警告：
```
Unchecked cast: 'java.io.Serializable' to 'java.util.ArrayList<java.util.List<com.study.lijia.gank.data.MyObject>>'
```
这警告只需添加``@SuppressWarnings("unchecked")``即可消除。
看到 ArrayList 的定义:
```
public class ArrayList<E> extends AbstractList<E>
        implements List<E>, RandomAccess, Cloneable, java.io.Serializable
```
实现了 Serializable，自然是能转换的，但是没有实现 Parcelable，所以无法使用 Parcelable 传递``ArrayList<List<Object>>``这种嵌套 List 数据。碰到这种需求则只能通过 Serializable 接口来了，或者更换数据传递的方式。

## 获取资源
经常我们会通过``mContext.getResources().getColor(R.color.black);``来获取我们定义在 color.xml 中的颜色，但是 getColor(@ColorRes int id) 已经被标记为``@Deprecated``，导致代码里看起来就是一条横线，很不舒服。当然我们可以通过 getColor(@ColorRes int id, @Nullable Theme theme) 来替换它，但是又会有这个问题：
```
Call requires API level 23 (current min is 15): android.content.res.Resources#getColor
```
代码强迫症肯定依然受不了。此时我们可以通过 ContextCompat 来获取
```
ContextCompat.getColor(mContext, R.color.black);
```
它的实现：
```
public static final int getColor(Context context, @ColorRes int id) {
    final int version = Build.VERSION.SDK_INT;
    if (version >= 23) {
        return ContextCompatApi23.getColor(context, id);
    } else {
        return context.getResources().getColor(id);
    }
}
```
一目了然了。
