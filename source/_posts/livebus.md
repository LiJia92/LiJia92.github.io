---
title: LiveBus 之思考
date: 2021-01-28 17:15:41
tags:
 - JetPack
---
在项目中使用到 [LiveBus](http://lastwarmth.win/2019/09/02/livedata/) 时，还是挺好用的，各方面的需求也都能满足。碰到的问题也能一一解决，这篇文章就稍微总结一下：

<!-- more -->

## observeForever
当调用 observeForever 时，发现 remove 会失效，这个是代码问题导致的，在那篇文章中已经修复，这里再啰嗦一下：
```
private val wrappers = mutableMapOf<Observer<in T>, BusWrapper>()

override fun observeForever(observer: Observer<in T>) {
    val wrapper = DefaultWrapper(observer)
    wrappers[observer] = wrapper
    super.observeForever(wrapper)
}

override fun removeObserver(observer: Observer<in T>) {
    val wrapper = wrappers[observer]
    if (wrapper != null) {
        super.removeObserver(wrapper)
        wrappers.remove(observer)
    } else {
        super.removeObserver(observer)
    }
}
```
然后就会出现另外一个问题：**假设我现在有一个 observer，在 observe 之后，当收到回调时，想手动 remove 掉，发现也 remove 不掉**。因为在 observe 时没有把外面传入的 observer 给保存起来，那么在手动 remove 的时候就会发现 remove 不掉了，解决方案也简单：再加入到 wrappers 里。
```
open class BusLiveData<T> : MutableLiveData<T>() {

    private val wrappers = mutableMapOf<Observer<in T>, BusWrapper>()

    override fun observe(owner: LifecycleOwner, observer: Observer<in T>) {
        // 不重复注册
        if (wrappers[observer] != null) {
            return
        }
        val wrapper = DefaultWrapper(observer)
        wrappers[observer] = wrapper
        super.observe(owner, wrapper)
    }

    open fun observeSticky(owner: LifecycleOwner, observer: Observer<T>) {
        super.observe(owner, observer)
    }

    override fun observeForever(observer: Observer<in T>) {
        // 不重复注册
        if (wrappers[observer] != null) {
            return
        }
        val wrapper = DefaultWrapper(observer)
        wrappers[observer] = wrapper
        super.observeForever(wrapper)
    }

    fun observeStickyForever(observer: Observer<T>) {
        super.observeForever(observer)
    }

    override fun removeObserver(observer: Observer<in T>) {
        val wrapper = wrappers[observer]
        if (wrapper != null) {
            super.removeObserver(wrapper)
            wrappers.remove(observer)
        } else {
            val iterator = wrappers.iterator()
            run find@{
                while (iterator.hasNext()) {
                    val data = iterator.next()
                    if (data.value == observer) {
                        wrappers.remove(data.key)
                        return@find
                    }
                }
            }
            super.removeObserver(observer)
        }
    }

    inner class DefaultWrapper(observer: Observer<in T>) : BusWrapper(observer) {
        override fun onChanged(t: T?) {
            if (lastVersion >= version) {
                return
            }

            lastVersion = version
            observer.onChanged(t)
        }
    }

    abstract inner class BusWrapper(val observer: Observer<in T>) : Observer<T> {
        var lastVersion = version
    }
}
```
不论是 observe 或者 observeForever 都会加入到 wrappers 里进行管理，然后在 remove 时通过遍历，找到对应 observer 的 wrapper，再进行移除，如此一来，问题也都解决了。同时也处理了同一个 observer 不重复 observe 的问题。

## 思考
在这样进行修改的时候，我就发现有点麻烦了，外部传入的 observer 都要经过 LiveBus 进行转换，转换成相应的 wrapper 才调用 LiveData 的 observe 方法，其实 LiveData 内部就已经针对 observer 进行管理了。而现在的 LiveBus 为了实现 LiveData notSticky 的效果，把每一个 observer 都做了 wrapper 转换，导致外部的 observer 在 LiveBus 内部都需要再管理一遍。
那么能不能直接就调用 LiveData.observe 方法，传入一个 observer，是否粘性由 observer 自身决定。
按照这个思路，我重写了 BusLiveData 类：
```
open class BusLiveData<T> : MutableLiveData<T>() {

    abstract inner class NotStickyObserver : Observer<T> {

        private var observerVersion: Int = version

        override fun onChanged(t: T) {
            if (observerVersion >= version ) {
            	return
            }
            onRealChanged(t)
            observerVersion = version
        }

        abstract fun onRealChanged(t: T)
    }
}
```
为了获取 version，必须要把包名命名为 androidx.lifecycle，同时 NotStickyObserver 必须为 BusLiveData 的内部类，并且是 inner 的。那这样的话，就导致外面的类就无法使用 NotStickyObserver了，所以需要 BusLiveData 自身来生成 Observer：
```
open class BusLiveData<T> : MutableLiveData<T>() {

    fun getNotStickyObserver(onChanged: (T) -> Unit): NotStickyObserver {
        return object : NotStickyObserver() {
            override fun onRealChanged(t: T) {
                onChanged(t)
            }
        }
    }

    fun observeNotSticky(owner: LifecycleOwner, onChanged: (T) -> Unit) {
        observe(owner, getNotStickyObserver(onChanged))
    }

    abstract inner class NotStickyObserver : Observer<T> {

        private var observerVersion: Int = version

        override fun onChanged(t: T) {
            if (observerVersion >= version ) {
            	return
            }
            onRealChanged(t)
            observerVersion = version
        }

        abstract fun onRealChanged(t: T)
    }
}
```
添加一个 getNotStickyObserver 方法，返回非粘性的 observer，如有需要可以接收，方便后续手动 remove。结合 LiveData 自身的使用方式，添加一个 observeNotSticky，自动生成一个 NotStickyObserver 并 observe。
现在就只有这样的一个初步方案，不知使用起来是否可行，有待验证。

## 调试
通过 LiveBus 监听，很难调试相应的代码：监听的地方可以通过事件类名找到相应的代码，**但是无法得知是哪里 post 出这个事件的**。所以打算直接把 LiveBus 里的 post 方法去掉：
```
object LiveBus {

    private val busMap by lazy { ConcurrentHashMap<Class<*>, BusLiveData<*>>() }

    private fun <T> bus(clazz: Class<T>) = busMap.getOrPut(clazz) { BusLiveData<T>() }

    @Suppress("UNCHECKED_CAST")
    @JvmStatic
    fun <T> with(clazz: Class<T>) = bus(clazz) as BusLiveData<T>
}
```
只提供 with 方法，返回 BusLiveData，然后手动 postValue。
```
LiveBus.with(String.class).postValue("Hello world");
```
这样的话就比较方便调试了，但是代码会多一些，具体哪种方式好，还得依赖具体的场景吧。同时无法限制 postValue 的使用了，由外部自己调用的，那么就又可能就会出现在子线程调用 setValue 的场景了。
想来想去，貌似也没有十全十美的方案，只能说针对自己的场景选取最合适的方式，头发又少了![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh118.gif)