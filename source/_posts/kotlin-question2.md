---
title: 关于使用 kotlin 碰到的一个坑（二）
date: 2018-07-19 15:01:49
tags:
 - Kotlin
---
最近新做的项目，有点性能问题，今天集中弄了下性能优化，又发现了一个 kotlin 中的坑。其实也不算是坑，只是使用不熟练而已。

介绍下场景：项目有用到高德地图，高德地图的 MapView 需要在 Activity 或者 Fragment 的声明周期中进行调用，就像这样：
```
@Override
public void onCreate(Bundle savedInstanceState) {
    mapView = contentView.findViewById(R.id.map_view);
    mapView.onCreate(savedInstanceState);
}

@Override
public void onResume() {
    super.onResume();
    mapView.onResume();
}

@Override
public void onPause() {
    super.onPause();
    mapView.onPause();
}

@Override
public void onSaveInstanceState(Bundle outState) {
    super.onSaveInstanceState(outState);
    mapView.onSaveInstanceState(outState);
}

@Override
public void onDestroy() {
    super.onDestroy();
    mapView.onDestroy();
}
```

<!-- more -->

然后在我写的某个 Fragment 中用到了 MapView，是用 kotlin 写的。发现每次打开这个页面，内存占用只增不减，在排除了其他因素之后，将问题定位到了高德地图的回收上。
```
override fun onDestroy() {
    super.onDestroy()
    downloadMap?.onDestroy()
}
```
这是 Fragment 里的 onDestroy 调用，断点到这里，发现 downloadMap 总是为 null。这是为啥呢？这个 downloadMap 就是定义到 xml 中的 MapView 呀。
```
<com.amap.api.maps.MapView
    android:id="@+id/downloadMap"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```
后面网上查阅资料，发现问题的本质：**kotlin 在 Fragment 中使用 xml 中 id 直接使用控件，也是使用了 findViewById ，同时进行缓存。释放缓存的操作在 onDestroyView 里，所以在 onDestroy 里，使用 xml id 获取的控件已经全部被置空了，所以无法使用。 **

AndroidStudio 中可以直接打开 kotlin Bytecode，进行反编译查看编译后的代码，Tools -> Kotlin -> Show Kotlin Bytecode -> Decompile，看到编译后的代码：
```
public void onDestroy() {
    super.onDestroy();
    MapView var10000 = (MapView) this._$_findCachedViewById(id.downloadMap);
    if (var10000 != null) {
        var10000.onDestroy();
    }
}

public View _$_findCachedViewById(int var1) {
    if (this._$_findViewCache == null) {
        this._$_findViewCache = new HashMap();
    }

    View var2 = (View) this._$_findViewCache.get(var1);
    if (var2 == null) {
        View var10000 = this.getView();
        if (var10000 == null) {
            return null;
        }

        var2 = var10000.findViewById(var1);
        this._$_findViewCache.put(var1, var2);
    }

    return var2;
}

public void _$_clearFindViewByIdCache() {
    if (this._$_findViewCache != null) {
        this._$_findViewCache.clear();
    }

}

// $FF: synthetic method
public void onDestroyView() {
    super.onDestroyView();
    this._$_clearFindViewByIdCache();
}
```
果不其然，所以在 onDestroy 中我执行 MapView 的 onDestroy 时 MapView 已经为 null 了，从而导致内存一直占用，无法释放。
那么在 Activity 中是否存在这样的问题呢？答案是不存在。Activity 中也会生成 ``_$_clearFindViewByIdCache`` 方法，但是没有地方调用。

结论：**在利用 Kotlin 编写的 Fragemnt 中，如果有些特殊的 View 需要处理销毁事件，需要写在 onDestroyView 中，并且在 super 调用之前。这里的 View 必须是直接通过 kotlin 利用 id 从 xml 获取的 View，如果是自己手动写 findViewById 的方式则不会出现这个问题。若是在 Activity 中则没有限制。**

参考：[Kotlin 为什么不用findViewById](https://blog.csdn.net/jansin_love/article/details/79140247)