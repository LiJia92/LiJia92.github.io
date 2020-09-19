---
title: 使用 LiveData 实现消息总线
date: 2019-09-02 13:46:54
tags:
 - JetPack
---
作为 Android 开发，对消息总线总不会陌生，当需要告知某些界面进行一些操作的时候，都会通过发送消息来做。早期的可以有广播，或者回调的方式，但是写起来都会比较麻烦，所以才会出现 EventBus 这种三方库，它使用起来非常方便，极大的解耦了我们的代码，所以当它一出现就受到了广大开发者的青睐。那用了这么久的 EventBus，香确实是很香，但是感觉还可以有优化的地方：
1. 只在界面可见的时候进行处理（生命周期感知功能）；
2. 每次都得显式 register，unregister；
3. 回调方法名称固定为 onEventMainThread 等等几个规定的名称，在 Android Studio 里会显示成 **xxx is never used**，警告也是很烦人的；
4. 多个同类型消息不能只处理一次，这其实也和第 1 点呼应；
5. 不同类型的消息，但是导致的业务操作其实是一致的，这种情景其实只需要处理一次即可，但 EventBus 做不到；

所以，在新出了 LiveData 之后，基于它的特性，是否可以进行改造呢？当然是可以的。

<!-- more -->

### 改造第一步
基于 EventBus 的使用习惯，很容易改造出第一版：
```
object LiveBus {

    private val busMap by lazy { ConcurrentHashMap<Class<*>, MutableLiveData<*>>() }

    private fun <T> bus(clazz: Class<T>) = busMap.getOrPut(clazz) { MutableLiveData<T>() }

    @Suppress("UNCHECKED_CAST")
    fun <T> with(clazz: Class<T>) = bus(clazz) as MutableLiveData<T>

    fun post(event: Any) {
        with(event.javaClass).value = event
    }
}
```
发送消息只需要：
```
LiveBus.post("Hello world!")
```
接收消息：
```
LiveBus.with(String::class.java).observe(this, Observer {
    // do something
})
```
只需要 observe，不再需要注销，下面的代码再也不会出现了：
```
@Override
public void onDestroy() {
    super.onDestroy();
    EventBus.getDefault().unregister(this);
}
```
写个 onDestroy 纯粹为了注销 EventBus。
可以看到，基于 LiveData，第一版这样很简短的写法，已经就可以解决我上面的 4 个问题了！我可以在一个界面重复发送消息，但是只有在界面展示的时候，处理一次。在某些场景下，这种优化还是很有必要的，不然每次都在不可见的状态下还刷新数据，如果消息发送非常频繁，那就可能导致很大的性能问题了。

### Sticky 改造
使用第一版的代码，很容易就发现一个问题：订阅者会收到订阅之前发布的消息。这其实类似于 EventBus 提供的 Sticky 功能。这种默认功能，在大多数下情况下，是不适用的，所以也需要改造。
导致这个问题的原因在 LiveData 的源码是有体现的：
```
private void considerNotify(ObserverWrapper observer) {
    if (!observer.mActive) {
        return;
    }
    // Check latest state b4 dispatch. Maybe it changed state but we didn't get the event yet.
    //
    // we still first check observer.active to keep it as the entrance for events. So even if
    // the observer moved to an active state, if we've not received that event, we better not
    // notify for a more predictable notification order.
    if (!observer.shouldBeActive()) {
        observer.activeStateChanged(false);
        return;
    }
    if (observer.mLastVersion >= mVersion) {
        return;
    }
    observer.mLastVersion = mVersion;
    //noinspection unchecked
    observer.mObserver.onChanged((T) mData);
}
```
在 LiveData 的 considerNotify 方法中，如果 ObserverWrapper 的 mLastVersion 小于 LiveData 的 mVersion，就会去回调 mObserver 的 onChanged 方法。而每个新的订阅者，其 version 都是 -1，LiveData 一旦设置过其 version 是大于 -1 的（每次 LiveData 设置值都会使其 version 加 1），这样就会导致 LiveBus 每注册一个新的订阅者，这个订阅者立刻会收到一个回调，即使这个设置的动作发生在订阅之前。
知道问题所在之后，便可以进行解决了：提供相同包名的 BusLiveData，进行改造。
```
package android.arch.lifecycle

open class BusLiveData<T> : MutableLiveData<T>() {

    private val wrappers = mutableMapOf<Observer<T>, BusWrapper>()

    override fun observe(owner: LifecycleOwner, observer: Observer<T>) {
        val wrapper = DefaultWrapper(observer)
        wrappers[observer] = wrapper
        super.observe(owner, wrapper)
    }

    open fun observeSticky(owner: LifecycleOwner, observer: Observer<T>) {
        super.observe(owner, observer)
    }

    override fun observeForever(observer: Observer<T>) {
        val wrapper = DefaultWrapper(observer)
        wrappers[observer] = wrapper
        super.observeForever(wrapper)
    }

    fun observeStickyForever(observer: Observer<T>) {
        super.observeForever(observer)
    }

    override fun removeObserver(observer: Observer<T>) {
        val key = if (observer is BusWrapper) {
            super.removeObserver(observer)
            super.removeObserver(observer.observer)

            observer.observer
        } else {
            super.removeObserver(observer)
            observer
        }

        wrappers.remove(key)
    }

    inner class DefaultWrapper(observer: Observer<T>): BusWrapper(observer) {
        override fun onChanged(t: T?) {
            if (lastVersion >= version) {
                return
            }

            lastVersion = version
            observer.onChanged(t)
        }
    }

    abstract inner class BusWrapper(val observer: Observer<T>): Observer<T> {
        var lastVersion = version
    }
}
```
注意**包名为 android.arch.lifecycle**。因为用到了 getVersion 方法，这个在 LiveData 里是包可见：
```
int getVersion() {
    return mVersion;
}
```
在每次 observe 的时候，使用 LiveData 的 version 赋值一次，就可以解决问题了。
同理，MediatorLiveData 的改造如下：
```
@SuppressLint("RestrictedApi")
class BusMediatorLiveData<T> : BusLiveData<T>() {

    private val mSources = SafeIterableMap<BusLiveData<*>, Source<*>>()

    /**
     * Starts to listen the given `source` LiveData, `onChanged` observer will be called
     * when `source` value was changed.
     *
     *
     * `onChanged` callback will be called only when this `MediatorLiveData` is active.
     *
     *  If the given LiveData is already added as a source but with a different Observer,
     * [IllegalArgumentException] will be thrown.
     *
     * @param source    the `LiveData` to listen to
     * @param onChanged The observer that will receive the events
     * @param <S>       The type of data hold by `source` LiveData
    </S> */
    @MainThread
    fun <S> addSource(source: BusLiveData<S>, onChanged: Observer<S>) {
        val e = Source(source, onChanged)
        val existing = mSources.putIfAbsent(source, e)
        if (existing != null && existing.mObserver !== onChanged) {
            throw IllegalArgumentException(
                    "This source was already added with the different observer"
            )
        }
        if (existing != null) {
            return
        }
        if (hasActiveObservers()) {
            e.plug()
        }
    }

    override fun observe(owner: LifecycleOwner, observer: Observer<T>) {
        onActive()
        ArchTaskExecutor.getInstance().postToMainThread {
            super.observe(owner, observer)
        }
    }

    /**
     * Stops to listen the given `LiveData`.
     *
     * @param source `LiveData` to stop to listen
     * @param <S>      the type of data hold by `source` LiveData
    </S> */
    @MainThread
    fun <S> removeSource(source: BusLiveData<S>) {
        @Suppress("NAME_SHADOWING")
        val source = mSources.remove(source)
        source?.unplug()
    }

    @CallSuper
    override fun onActive() {
        for ((_, value) in mSources) {
            value.plug()
        }
    }

    @CallSuper
    override fun onInactive() {
        for ((_, value) in mSources) {
            value.unplug()
        }
    }

    private class Source<V> internal constructor(
            internal val mLiveData: BusLiveData<V>,
            internal val mObserver: Observer<V>
    ) : Observer<V> {
        internal var mVersion = mLiveData.version

        internal fun plug() {
            mLiveData.observeStickyForever(this)
        }

        internal fun unplug() {
            mLiveData.removeObserver(this)
        }

        override fun onChanged(v: V?) {
            if (mVersion != mLiveData.version) {
                mVersion = mLiveData.version
                mObserver.onChanged(v)
            }
        }
    }
}
```
这个后面会用到。
嗯，改造完成之后，将 LiveBus 里的 MutableLiveData 替换成 BusLiveData 就可以解决问题了。那么想要实现 EventBus 的 Sticky 效果便非常简单了：
```
open fun observeSticky(owner: LifecycleOwner, observer: Observer<T>) {
    super.observe(owner, observer)
}
```

### 消息合并
针对第 5 条，使用 EventBus 很容易出现如下代码：
```
//增加路线
public void onEventMainThread(RouteCreateEvent event) {
    onLoadFirst(false);
}

//删除路线
public void onEventMainThread(RouteDeleteEvent event) {
    onLoadFirst(false);
}

//更新路线
public void onEventMainThread(RouteUpdateEvent event) {
    onLoadFirst(false);
}
```
这在列表界面处理相关刷新的操作太常见了，感觉很恶心。所以，使用 LiveBus 如何改造呢？
这就要用到上面说 MediatorLiveData 了。MediatorLiveData 类就是个自定义 LiveData，可以观察其他 LiveData 对象并且回调。使用 addSource 可以添加一个 LiveData，当任何一个 LiveData 发生改变时都能进行回调。所以当多个类型的消息界面都是统样的处理时，便可以使用 MediatorLiveData 了。稍微封装一下：
```
class SameActionMediator {

    private val mediatorLiveData = BusMediatorLiveData<Boolean>()

    fun addSource(vararg source: BusLiveData<*>) {
        source.forEach {
            mediatorLiveData.addSource(it, Observer {
                mediatorLiveData.postValue(true)
            })
        }
    }

    fun observe(owner: LifecycleOwner, onChange: (Boolean?) -> Unit) {
        mediatorLiveData.observe(owner, Observer {
            onChange(it)
        })
    }
}
```
使用时：
```
val mediatorLiveData = SameActionMediator()
mediatorLiveData.addSource(LiveBus.with(String::class.java), LiveBus.with(Int::class.java))
mediatorLiveData.observe(this) {
    // do something
}
```
注意 mediatorLiveData 必须使用 postValue，使用 setValue 导致 onChange 回调多次。看下 postValue 的实现：
```
protected void postValue(T value) {
    boolean postTask;
    synchronized (mDataLock) {
        postTask = mPendingData == NOT_SET;
        mPendingData = value;
    }
    if (!postTask) {
        return;
    }
    ArchTaskExecutor.getInstance().postToMainThread(mPostValueRunnable);
}

private final Runnable mPostValueRunnable = new Runnable() {
    @Override
    public void run() {
        Object newValue;
        synchronized (mDataLock) {
            newValue = mPendingData;
            mPendingData = NOT_SET;
        }
        //noinspection unchecked
        setValue((T) newValue);
    }
};
```
可以看到，当连续多次调用 postValue 时，LiveData 只会更新 mPendingData 为最新的值，如果 postTask 为 true，就直接返回，所以 mPostValueRunnable 只会发送一次，从而避免 onChange 的多次调用。同时当 mPostValueRunnable 执行时，又会将 mPendingData 赋值为 NOT_SET，用于下次消息发送。

### observeForever
补充一下一个不常用的场景：常驻后台，当界面不可见也需要接受消息。
```
LiveBus.with(Float::class.java).observeForever {
    // do something
}
```
这种就是消息只要一发送，就可以接受到了，可用于某些特殊场景。**但是这种就有了内存泄漏的风险，当不需要时记得手动移除。**

### 小结
使用上述 4 个类：BusLiveData、BusMediatorLiveData、LiveBus、SameActionMediator，便可实现消息总线的整体功能了，同时有所优化。嗯，JetPack 真香啊~

## 更新
在项目使用过程中，当用到 observeForever 时，即使 removeObserver 了还是会收到回调，导致内存泄露。查看代码，发现是 BusLiveData 代码有问题，更新一下：
```
open class BusLiveData<T> : MutableLiveData<T>() {

    private val wrappers = mutableMapOf<Observer<in T>, BusWrapper>()

    override fun observe(owner: LifecycleOwner, observer: Observer<in T>) {
        val wrapper = DefaultWrapper(observer)
        super.observe(owner, wrapper)
    }

    open fun observeSticky(owner: LifecycleOwner, observer: Observer<T>) {
        super.observe(owner, observer)
    }

    override fun observeForever(observer: Observer<in T>) {
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
调用 observe 的绑定了生命周期的，会在 destroy 的时候自动移除掉，wrappers 不需要持有。调用 observeForever 的 wrappers 需要持有，以便在 remove 时，找到对应的 Observer 去 remove。

### 参考
1. [Android消息总线的演进之路：用LiveDataBus替代RxBus、EventBus](https://tech.meituan.com/2018/07/26/android-livedatabus.html)
2. [【译】LiveData 使用详解](https://www.jianshu.com/p/dab2ee97d680)
3. [LiveBus](https://github.com/alvminvm/LiveBus)