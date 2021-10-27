---
title: 语音机器人交互实现
date: 2021-03-24 15:18:52
tags:
 - 日常开发

password: 605520
abstract: Welcome to my blog, enter password to read.
message: Welcome to my blog, enter password to read.
---

## 概述
嗯，先看需求：
<video src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2021/%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%8A%A8%E7%94%BB_aDTaP8af6m.mp4" width="460" height="260" controls="controls">
Your browser does not support the video tag.
</video>

整体需求是：监听麦克风，等待语音唤醒。唤醒成功后，展示弹窗，然后变成“我在听”的状态。当识别到用户说出的内容时，从服务器获取结果，并展示。整体包含了很多的动画效果，实现与之前写的 [Android 动画序列的实现](http://lastwarmth.win/2019/02/02/animation/) 类似，但还是写篇博客记录一下吧。

## 动画拆分
将视频看个好几遍，可以拆分出一些动画元素：
1. 粒子大圆环效果；
2. “我在听”文案的抖动效果；
3. 听到内容后，文字变眼睛的效果；
4. 机器人与眼睛一起缩放的效果；
5. 语音文案与答案的展示效果；
6. 底部原型按钮的效果；
拆分得差不多了，那么逐步实现即可。

## 动画 1
1 和 6 涉及到粒子效果，用原生 Android 来实现显然费时费力，而且效果不可预估，且具备很大的技术难度，基于我自身当前的技术深度，我只能先用 webp 或 gif 来实现了，让设计尽可能压缩，直接使用 Glide 加载即可。

## 动画 2
从视频中可以看出文案的抖动效果是平移，x、y 同时平移一个量，但是不能超出一个边界：
```
/**
 * "我在听"抖动动画，平移范围 [-5,5]
 */
private fun shake() {
    var random = ((Math.random() * 10) - 5).toFloat()
    var translationX = viewBinding.listenTv.translationX
    translationX += random
    if (translationX > 5) {
        translationX = 5f
    }
    if (translationX < -5) {
        translationX = -5f
    }
    random = ((Math.random() * 10) - 5).toFloat()
    var translationY = viewBinding.listenTv.translationY
    translationY += random
    if (translationY > 5) {
        translationY = 5f
    }
    if (translationY < -5) {
        translationY = -5f
    }
    viewBinding.listenTv.animate()
        .translationX(translationX)
        .translationY(translationY)
        .setInterpolator(LinearInterpolator())
        .setDuration(300L)
        .withEndAction {
            shake()
        }
        .start()
}
```

## 动画 3
文字变眼睛效果，也就是 2 个 View 的 alpha 渐变联合起来：
```
viewBinding.listenTv.animate().cancel()
viewBinding.listenTv.animate()
    .alphaBy(1f)
    .alpha(0f)
    .setDuration(alphaDuration)
    .withEndAction {
        viewBinding.eyeIv.animate()
            .alphaBy(0f)
            .alpha(1f)
            .setDuration(alphaDuration)
            .start()
    }
    .start()
```

## 动画 4
机器人的图片与眼睛要达到一个一起缩放的效果，可以考虑当成一个 View，但是视频中显然这 2 个是不同的元素，因为眼睛有单独的动画效果，所以只能当成 2 个 View。那么要实现这样的一起缩放的效果，只能设置相同的缩放点：
```
viewBinding.robotIv.pivotX = 140f
viewBinding.robotIv.pivotY = -160f
viewBinding.eyeIv.pivotX = 28f
viewBinding.eyeIv.pivotY = -250f
```
robotIv 宽度为 280，取一半为中心点，140。eyeIv 宽度为 56，取一半为 28，这样设置的 pivotX 在屏幕上是一个同一个 X，Y 同理，如此可以实现一起缩放的效果。
```
viewBinding.robotIv.animate()
    .scaleXBy(1f)
    .scaleX(0.5f)
    .scaleYBy(1f)
    .scaleY(0.5f)
    .setDuration(scaleDuration)
    .start()
viewBinding.eyeIv.animate()
    .scaleXBy(1f)
    .scaleX(0.5f)
    .scaleYBy(1f)
    .scaleY(0.5f)
    .setDuration(scaleDuration)
    .start()
```

## 动画 5
语音文案与答案的动画效果就是个简单的 alpha 渐变：
```
private fun showSpeak(speak: String) {
    viewBinding.replyTv.text = context.resources.getString(R.string.panel__wait_reply)
    viewBinding.replyTv.alpha = 0f
    viewBinding.speakTv.text = "\"$speak\""
    viewBinding.speakTv.animate()
        .alphaBy(0f)
        .alpha(1f)
        .setDuration(alphaDuration)
        .withEndAction {
            viewBinding.replyTv.animate()
                .alphaBy(0f)
                .alpha(1f)
                .setDuration(alphaDuration)
                .withEndAction {
                    showReply = true
                    showReply(reply)
                }
                .start()
        }
        .start()
}
```

## tip 切换动画
“我在听”状态时，下面有提示语，有几条特定的提示语，有一个上下切换的效果，考虑使用 TextSwitcher 实现：
```
viewBinding.tipTv.setFactory {
    TextView(context).apply {
        setTextColor(Color.parseColor("#CDE5FF"))
        textSize = 28f
    }
}
viewBinding.tipTv.setInAnimation(context, R.anim.voice__robot_tip_in)
viewBinding.tipTv.setOutAnimation(context, R.anim.voice__robot_tip_out)
```
设置好 Factory，以及出入的动画，调用 setText 方法即可有相应的上下切换效果：
```
/**
 * 2s 改变一次提示文案
 */
private val changeRunnable = object : Runnable {
    override fun run() {
        viewBinding.tipTv.setText(nextTip())
        handler.postDelayed(this, 2000L)
    }
}
```

至此，所有的动画效果实现得差不多了，稍微调下优即可。

## SDK 设计
公司内部希望将此功能作为一个单独的 Lib，那么有语音交互需求的 App 可单独集成。目前采用的是讯飞的 SDK，涉及到语音唤醒，语音听写，以及离线语音合成。讯飞 SDK 在内部是有根据 appId 来绑定 SDK 的，所以这个 Lib 无法提供具体的 SDK，SDK 必须由集成方自己去提供。所以这个 Lib 只能 compileOnly 讯飞的 SDK，以此来通过编译。
```
// 编译依赖，具体的 SDK 由集成方提供
compileOnly project(':sdkLib')
```
后续将讯飞 SDK 切换成其他的 SDK 也不是不可能，所以需要做个 SDK 隔离：
```
/**
 * 语音交互接口，隔离 SDK 实现
 */
interface VoiceInteractor {

    /**
     * 只做根据 appId 的初始化操作
     */
    fun init(context: Context)

    /**
     * 可能需要针对初始化做一些额外的参数设置
     */
    fun setParam(param: String, value: String)

    /**
     * 开始监听唤醒
     */
    fun startWakeListen()

    /**
     * 停止监听唤醒
     */
    fun stopWakeListen()

    /**
     * 开始监听语音，转文本
     */
    fun startAsrListen()

    /**
     * 停止监听语音
     */
    fun stopAsrListen()

    /**
     * 把文本读出来
     */
    fun startSpeak(text: String?, listener: TtsSpeakListener?)

    /**
     * 停止读文本
     */
    fun stopSpeak()

    /**
     * 释放资源
     */
    fun release()
}
```
然后提供一个讯飞 SDK 的实现：
```
/**
 * 讯飞实现交互
 */
class IflytekInteractor(val callback: InteractorCallback?) : VoiceInteractor {

    private val TAG = "IflytekInteractor"

    override fun init(context: Context) {
        SpeechUtility.createUtility(
            context,
            SpeechConstant.APPID + "=" + getAppId()
        )
    }

    override fun setParam(param: String, value: String) {
        SpeechUtility.getUtility().setParameter(param, value)
    }

    override fun startWakeListen() {
        if (ivw == null) {
            ivw = VoiceWakeuper.createWakeuper(MucangConfig.getContext(), null)
            // 清空参数
            ivw?.setParameter(SpeechConstant.PARAMS, null)
            // 唤醒门限值，根据资源携带的唤醒词个数按照“id:门限;id:门限”的格式传入
            ivw?.setParameter(SpeechConstant.IVW_THRESHOLD, "0:1450")
            // 设置唤醒模式，wakeup 为单次唤醒
            ivw?.setParameter(SpeechConstant.IVW_SST, "wakeup")
            // 设置持续进行唤醒
            ivw?.setParameter(SpeechConstant.KEEP_ALIVE, "1")
            // 设置闭环优化网络模式
            ivw?.setParameter(SpeechConstant.IVW_NET_MODE, "0")
            // 设置唤醒资源路径
            ivw?.setParameter(SpeechConstant.IVW_RES_PATH, getResource())
            // 设置唤醒录音保存路径，保存最近一分钟的音频
            ivw?.setParameter(
                SpeechConstant.IVW_AUDIO_PATH,
                Environment.getExternalStorageDirectory().path + "/msc/ivw.wav"
            )
            ivw?.setParameter(SpeechConstant.AUDIO_FORMAT, "wav")
        }
        ivw!!.startListening(wakeListener)
    }

    override fun stopWakeListen() {
        ivw?.stopListening()
    }

    override fun startAsrListen() {
        if (asr == null) {
            // 初始化识别无UI识别对象
            asr = SpeechRecognizer.createRecognizer(MucangConfig.getContext(), null)
            // 清空参数
            asr?.setParameter(SpeechConstant.PARAMS, null)
            // 设置引擎，此处engineType为“cloud”，使用云听写
            asr?.setParameter(SpeechConstant.ENGINE_TYPE, SpeechConstant.TYPE_CLOUD)
            // 设置返回结果格式，目前支持json,xml以及plain三种格式，其中plain为纯听写文本内容
            asr?.setParameter(SpeechConstant.RESULT_TYPE, "plain")
            // 设置语音输入语言，zh_cn为简体中文
            asr?.setParameter(SpeechConstant.LANGUAGE, "zh_cn");
            // 设置结果返回语言
            asr?.setParameter(SpeechConstant.ACCENT, "mandarin");
            // 设置语音前端点:静音超时时间，即用户多长时间不说话则当做超时处理
            asr?.setParameter(SpeechConstant.VAD_BOS, "5000")
            // 设置语音后端点:后端点静音检测时间，即用户停止说话多长时间内即认为不再输入，自动停止录音
            asr?.setParameter(SpeechConstant.VAD_EOS, "2000")
            // 设置标点符号,设置为"0"返回结果无标点，设置为"1"返回结果有标点
            asr?.setParameter(SpeechConstant.ASR_PTT, "0")
            // 设置音频保存路径，保存音频格式支持pcm、wav，设置路径为sd卡请注意WRITE_EXTERNAL_STORAGE权限
            asr?.setParameter(SpeechConstant.AUDIO_FORMAT, "wav")
            asr?.setParameter(
                SpeechConstant.ASR_AUDIO_PATH,
                Environment.getExternalStorageDirectory().toString() + "/msc/iat.wav"
            )
        }
        asr!!.startListening(recognizerListener)
    }

    override fun stopAsrListen() {
        asr?.stopListening()
    }

    override fun startSpeak(text: String?, listener: TtsSpeakListener?) {
        SpeechSynthesizer.getSynthesizer()?.startSpeaking(text, DefaultSpeakListener(listener))
    }

    override fun stopSpeak() {
        SpeechSynthesizer.getSynthesizer()?.stopSpeaking()
    }

    override fun release() {
        ivw?.destroy()
        asr?.destroy()
        ivw = null
        asr = null
    }
}
```
再提供一个 Manager 管理 Interactor：
```
object VoiceInteractionManager {

    val replyWords: Array<String> = MucangConfig.getContext().resources.getStringArray(R.array.voice__wake_up_words)

    // 语音事件回调
    var callback: VoiceInteractionCallback? = null
        private set

    // 一次会话
    private var sessionId: String? = null

    private val api = VoiceInteractionApi()

    private val innerCallback = object : InteractorCallback {

        override fun onWakeSuccess() {
            callback?.onWakeSuccess()
            // 每次唤醒，生成一次 sessionId
            sessionId = UUID.randomUUID().toString()
        }

        override fun onSpeakReturn(result: String) {
            callback?.onSpeakReturn(result)
            getReply(result)
            stopAsrListen()
        }

        override fun onTimeOut() {
            callback?.onTimeOut()
        }
    }

    private val interactor = IflytekInteractor(innerCallback)

    @JvmStatic
    fun init(context: Context, callback: VoiceInteractionCallback?) {
        interactor.init(context)
        this.callback = callback
    }

    @JvmStatic
    fun startWakeListen() {
        PermissionUtils.requestPermissions(
            Config.getCurrentActivity(), PermissionsCallback { permissions: PermissionsResult ->
                if (permissions.grantedAll) {
                    interactor.startWakeListen()
                } else {
                    MainThreadUtils.toast("需要权限")
                }
            },
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
    }

    @JvmStatic
    fun stopWakeListen() {
        interactor.stopWakeListen()
    }

    @JvmStatic
    fun startAsrListen() {
        PermissionUtils.requestPermissions(
            Config.getCurrentActivity(), PermissionsCallback { permissions: PermissionsResult ->
                if (permissions.grantedAll) {
                    interactor.startAsrListen()
                } else {
                    MainThreadUtils.toast("需要权限")
                }
            },
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
    }

    @JvmStatic
    fun stopAsrListen() {
        interactor.stopAsrListen()
    }

    @JvmStatic
    fun startSpeak(text: String?, listener: TtsSpeakListener?) {
        interactor.startSpeak(text, listener)
    }

    @JvmStatic
    fun stopSpeak() {
        interactor.stopSpeak()
    }

    @JvmStatic
    fun release() {
        interactor.release()
    }

    /**
     * 获取结果
     */
    private fun getReply(result: String) {
        if (callback == null) {
            return
        }

        // 获取 reply，然后回调
        var reply: VoiceInteractionReply
        callback?.onReplyReturn(reply)
    }
}
```
可以看到 interactor 直接是一个 IflytekInteractor 的对象，任何对 SDK 的调用统一由这个 manager 来做。这样即使后面切换 SDK，只需要将 IflytekInteractor 切换成另外一个 Interactor 即可。
另外 2 个封装的回调：
```
/**
 * 外层使用，语音交互回调
 */
interface VoiceInteractionCallback {
    /**
     * 唤醒成功
     */
    fun onWakeSuccess()

    /**
     * 识别到文本
     */
    fun onSpeakReturn(result: String)

    /**
     * 服务器返回答案
     */
    fun onReplyReturn(reply: VoiceInteractionReply)

    /**
     * 超时了还没识别到文本
     */
    fun onTimeOut()
}

/**
 * 内部 SDK 的回调
 */
interface InteractorCallback {
    /**
     * 唤醒成功
     */
    fun onWakeSuccess()

    /**
     * 识别到文本
     */
    fun onSpeakReturn(result: String)

    /**
     * 超时了还没识别到文本
     */
    fun onTimeOut()
}
```
另外，Lib 也会有部分资源文件，全部使用 voice__ 作为前缀开头，避免被集成方同名覆盖掉，产生不可预期的影响。至此，一个相对独立的 Lib 库设计基本完成，后续看需求进行迭代了。

## 后续
Lib 库提供 SNAPSHOT 版本时，集成方若要及时拉取，可以如此设置：
```
configurations.all {
    // 动态版本
    resolutionStrategy.cacheDynamicVersionsFor 10, 'minutes'
    // 变化模块
    resolutionStrategy.cacheChangingModulesFor 0, 'minutes'
}
```
动态版本即为 lastest 或者 + 表达式的版本，变化模块即为 SNAPSHOT。