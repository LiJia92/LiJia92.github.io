---
title: 关于使用 kotlin 碰到的一个坑
date: 2018-07-11 17:58:49
tags:
 - Kotlin
---
今天碰到个问题，起初看的时候一脸懵逼，后面追溯问题根源，发现是 kotlin 里的一个坑。看下代码：
```
override fun showRoadCondition(list: List<MyObject>) {
    val size = Math.ceil(list.size / 8.0).toInt()
    for (i in (0 until size)) {
        val min = Math.min((i + 1) * 8, list.size)
        val subList = list.subList(i * 8, min).toList() as ArrayList<MyObject>
    }
    // 其他代码...
}
```
这样一个方法，需要将列表的数据，根据 8 个一组进行划分。subList 生成的一个 List 不是我们平常使用的 List，所以后面加上了 kotlin 自带的 toList() 方法，来转化成真正的 List。
这段代码在大多数情况下都没有什么问题，但是当 list 的长度为 9、17、25等等时就会崩溃。所报异常为：
```
java.util.Collections$SingletonList cannot be cast to java.util.ArrayList
```

<!-- more -->

很显然，强制转换的异常。
起初真的是一脸懵逼啊，后面只能耐心解决问题，看到代码容易发现 toList 应该是问题所在。看下其源码：
```
/**
 * Returns a [List] containing all elements.
 */
public fun <T> Iterable<T>.toList(): List<T> {
    if (this is Collection) {
        return when (size) {
            0 -> emptyList()
            1 -> listOf(if (this is List) get(0) else iterator().next())
            else -> this.toMutableList()
        }
    }
    return this.toMutableList().optimizeReadOnlyList()
}
```
当 size == 1 时调用的 listOf，继续跟：
```
/**
 * Returns an immutable list containing only the specified object [element].
 * The returned list is serializable.
 * @sample samples.collections.Collections.Lists.singletonReadOnlyList
 */
@JvmVersion
public fun <T> listOf(element: T): List<T> = java.util.Collections.singletonList(element)
```
一目了然了，当 size 为 1 时，toList 方法会生成一个 singletonList，而这个 List 无法转化成 ArrayList，从而导致崩溃。嗯，我的内心也是崩溃的...
后面将 toList 改成 toMutableList 即可。
```
/**
 * Returns a [MutableList] filled with all elements of this collection.
 */
public fun <T> Collection<T>.toMutableList(): MutableList<T> {
    return ArrayList(this)
}
```

## 题外话
关于 kotlin 的 var 变量，我们可能经常需要可以为 null 的类型。比如：
```
var data: List<MyObject>? = null
```
可以通过 ? 进行判空，或者直接使用 ?.let{} 在非 null 的时候执行某些代码。也可以加上 ?:run {} 来执行为 null 时的操作：
```
var data: List<MyObject>? = null

data?.let {
    maskView.visibility = View.VISIBLE
} ?: kotlin.run {
    maskView.visibility = View.GONE
}
```