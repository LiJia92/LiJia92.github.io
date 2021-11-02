---
title: Flow 初识
date: 2021-10-27 11:11:20
tags:
 - Kotlin
---
继[上一篇文章](http://lastwarmth.win/2021/10/15/corutines/)，协程里有一个很大的特性就是 Flow。经过一阵尝试、学习，可能有一点点的收获，还是记录一下吧。
「流」这个词，相信现在越来越多的开发者都接触并喜欢这个概念了。当 RxJava 风靡全球时，就有了「流」这个概念。基于 Kotlin，我们可以流式的写并发代码；基于 Flow，我们也可以流式的处理数据。面对复杂的数据逻辑，写出来的代码也可以像流淌的溪水一样干净，漂亮。

<!-- more -->

## 依赖
使用 Flow，需要添加依赖：
```
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-core:版本号'
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:版本号'
```
我们使用 lifecycle-runtime 或者 viewmodel 的 kotlin 扩展时，本身就会依赖此库。如果使用的 api 依赖，便可以直接使用 Flow。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2021/WechatIMG182.png)

## 简单使用
创建数据流:
```
private fun count(): Flow<Int> = flow {
    var x = 0
    while (true) {
        if (x > 20) {
            break
        }
        emit(x)
        x = x.plus(1)
    }
}
```
监听数据流：
```
GlobalScope.launch {
    count().map {
        "${it / 0}"
    }.catch { ex ->
        ex.printStackTrace()
        Log.d("Coroutine", ex.toString())
        emit("-1")
    }.collect {
        Log.d("Coroutine", it)
    }
}
```
> 1. flow 构建器函数会创建数据流；emit 函数发送新值至数据流；map 函数修改数据流；collect 函数收集数据流；catch 函数捕获异常。
2. map 等属于中间运算符，可在应用于数据流时，设置一系列暂不执行的链式运算，留待将来使用值时执行。仅将一个中间运算符应用于数据流不会启动数据流收集。
3. collect 等终端运算符可触发数据流开始监听值。由于 collect 是挂起函数，因此需要在协程中执行。
4. catch 函数只能捕获上游的异常，无法捕获下游的异常。
5. catch 函数捕获到异常后，collect 函数无法执行。可以考虑通过 catch 函数执行 emit 操作处理后续逻辑。

## callbackFlow
callbackFlow 可以将基于回调的 API 转换为数据流。以文本框输入监听为例，结合上面的网络请求示例。
```
private fun TextView.textWatcherFlow(): Flow<String> = callbackFlow<String> {
    val textWatcher = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
        }

        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
        }

        override fun afterTextChanged(s: Editable?) {
            offer(s.toString())  // 发送值
        }
    }
    addTextChangedListener(textWatcher)
    awaitClose { removeTextChangedListener(textWatcher) }
}.buffer(Channel.CONFLATED)
    .debounce(300L)
```
采集数据流：
```
lifecycleScope.launchWhenStarted {
    mBinding.etSearch.textWatcherFlow().collect {
        viewModel.getArticles(it)
    }
}
```
这个写法看起来就很舒服了，可以将 listener 的注册与注销，与生命周期进行绑定，写一个拓展方法即可。同时数据转成 Flow 发出来，可以做后续的各种处理，非常奈斯~

## 冷流、热流
> 冷流是按需创建的，并且会在它们被观察时发送数据；热流则总是活跃，无论是否被观察，它们都能发送数据。

直接通过 flow{} 构造出来的流，是冷流。StateFlow、SharedFlow 则是热流（1.4.0 版本才引入）。
```
class LatestNewsViewModel(
    private val newsRepository: NewsRepository
) : ViewModel() {

    // Backing property to avoid state updates from other classes
    private val _uiState = MutableStateFlow(LatestNewsUiState.Success(emptyList()))
    // The UI collects from this StateFlow to get its state updates
    val uiState: StateFlow<LatestNewsUiState> = _uiState

    init {
        viewModelScope.launch {
            newsRepository.favoriteLatestNews
                // Update View with the latest favorite news
                // Writes to the value property of MutableStateFlow,
                // adding a new element to the flow and updating all
                // of its collectors
                .collect { favoriteNews ->
                    _uiState.value = LatestNewsUiState.Success(favoriteNews)
                }
        }
    }
}

// Represents different states for the LatestNews screen
sealed class LatestNewsUiState {
    data class Success(news: List<ArticleHeadline>): LatestNewsUiState()
    data class Error(exception: Throwable): LatestNewsUiState()
}
```
采集数据流：
```
class LatestNewsActivity : AppCompatActivity() {
    private val latestNewsViewModel = // getViewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        ...
        // Start a coroutine in the lifecycle scope
        lifecycleScope.launch {
            // repeatOnLifecycle launches the block in a new coroutine every time the
            // lifecycle is in the STARTED state (or above) and cancels it when it's STOPPED.
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                // Trigger the flow and start listening for values.
                // Note that this happens when lifecycle is STARTED and stops
                // collecting when the lifecycle is STOPPED
                latestNewsViewModel.uiState.collect { uiState ->
                    // New value received
                    when (uiState) {
                        is LatestNewsUiState.Success -> showFavoriteNews(uiState.news)
                        is LatestNewsUiState.Error -> showError(uiState.exception)
                    }
                }
            }
        }
    }
}
```
这些看起来和 LiveData 类似：
1. StateFlow 需要将初始状态传递给构造函数，而 LiveData 不需要。
2. 当 View 进入 STOPPED 状态时，LiveData.observe() 会自动取消注册使用方，而从 StateFlow 或任何其他数据流收集数据的操作并不会自动停止。如需实现相同的行为，您需要从 Lifecycle.repeatOnLifecycle 块收集数据流。

说白了就是数据一直在产生，LiveData observe 的时候本身就是在可见时，才进行回调。而 collect 会一直回调，需要结合 repeatOnLifecycle 一块使用。
关于冷流、热流的概念，现在还很模糊，只能后面边用边摸索了~

总的来说，Flow 非常强大，能做的事情也很多。所以网上也有说法：出了 Flow 就可以废弃 LiveData 了。这个可以看一下凯哥的视频[LiveData：还没普及就让我去世？我去你的 Kotlin 协程](https://www.bilibili.com/video/BV1WL411E7ry?zw)。简而言之，我们可以有很多种技术来实现某一些特定的场景，并不一定就得是 A 技术替换 B 技术。萝卜白菜，各有所爱。当然我们还是得依据自身场景，尽量使用主流的技术。

## 续一把
正好就用到 Flow 来做了一把倒计时的需求：
```
private fun exitCountDown() {
    lifecycleScope.launch {
        flow {
            for (i in 5 downTo 1) {
                emit(i)
                delay(1000)
            }
        }.onStart {
            viewBinding.countDownCl.visibility = View.VISIBLE
            viewBinding.appVersionTv.text = "Version${SystemUtils.getVersionName()}"
        }.onCompletion {
            exit()
        }.collect {
            viewBinding.countDownTv.text = it.toString()
        }
    }
}
```
看起来可太简单了，整个流程就在这一个方法里。如果不用 Flow，大概率就是 handler.postDelay，或者 Timer 了，逻辑就会分散在各处，不方便查看。香，真香！
嗯，然后又做了一个网络监听的需求，封装了一个类：
```
object GlobalNetWorkMonitor {

    private val context = MucangConfig.getContext()
    private var listeners = mutableListOf<WeakReference<NetWorkChangeListener?>>()

    private val connect = callbackFlow {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                offer(NetworkUtils.isNetworkConnected())
            }
        }
        val filter = IntentFilter()
        filter.addAction(ConnectivityManager.CONNECTIVITY_ACTION)
        context.registerReceiver(receiver, filter)
    }

    init {
        MainScope().launch {
            connect.collect {
                if (it) {
                    listeners.forEach { item ->
                        item.get()?.onNetworkConnected()
                        item.clear()
                    }
                }
            }
        }
    }

    @JvmStatic
    fun addListener(listener: NetWorkChangeListener?) {
        listeners.forEach {
            if (it.get() == listener) {
                return
            }
        }
        listeners.add(WeakReference(listener))
    }

    @JvmStatic
    fun removeListener(listener: NetWorkChangeListener?) {
        listeners.forEach {
            if (it.get() == listener) {
                it.clear()
                return
            }
        }
    }

    interface NetWorkChangeListener {
        fun onNetworkConnected()
    }
}
```
信心满满的跑了一把，结果网络一发生变化就崩溃了：ClosedSendChannelException: Channel was closed。
后面找到原因：Reason is that callbackFlow block closes the (hidden under the hood) channel, as soon, as everything within
```
callbackFlow {
...
}
```
也就是当括号里的代码执行完了之后， callbackFlow 自动就 close 了，这个时候还去 offer 就会报错，需要添加 awaitClose。于是改成：
```
private val connect = callbackFlow {
    val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            offer(NetworkUtils.isNetworkConnected())
        }
    }
    val filter = IntentFilter()
    filter.addAction(ConnectivityManager.CONNECTIVITY_ACTION)
    context.registerReceiver(receiver, filter)
    // 这句是重点，使 flow 一直 active
    awaitClose { context.unregisterReceiver(receiver) }
}
```

## 参考
[Kotlin Flow场景化学习](https://zhuanlan.zhihu.com/p/347785851)
[[正确]的使用Kotlin Flow进行搜索优化](https://juejin.cn/post/6925304772383735822)
[Android 上的 Kotlin 数据流](https://developer.android.com/kotlin/flow)
[ClosedSendChannelException for callbackFlow](https://github.com/Kotlin/kotlinx.coroutines/issues/1770)

