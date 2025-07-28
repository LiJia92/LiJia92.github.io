---
title: Android 集成讯飞语音SDK
date: 2017-09-26 16:42:29
tags:
 - 日常开发
---
项目开发需要用到``文字转语音``的功能，利用 Android 系统自带的``Text-to-Speech``可以实现``英文转语音``，但是对于中文就无能为力了。对于中文转语音需要特定引擎的支持，谷歌自带的``Pico TTS``是不支持的，我的小米手机是``度秘语音引擎``支持中文，显然我们没法去控制用户用什么手机，所以抛弃原生的``TTS``，考虑接入``讯飞语音SDK``。

## 注册开发者账号
进入[讯飞开放平台](http://passport.xfyun.cn/login)注册账号。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/09/26/%E9%80%89%E5%8C%BA_163.png)

<!-- more -->

## 创建应用
登录账号，进入``控制台``，选择``创建新应用``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/09/26/%E9%80%89%E5%8C%BA_164.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/09/26/%E9%80%89%E5%8C%BA_165.png)

## 下载SDK
点击``SDK下载``。选择下载服务、平台、应用，然后点击下载。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/09/26/%E9%80%89%E5%8C%BA_168.png)
我这里只选择了在线语音合成，免费的。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/09/26/%E9%80%89%E5%8C%BA_169.png)
然后得到SDK：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/%E9%80%89%E5%8C%BA_170.png)

## 集成SDK
首先将``对应手机CPU平台的 so 文件``导入到工程中，jar 包导入到 libs 中。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/09/26/%E9%80%89%E5%8C%BA_167.png)

在 Application 中初始化讯飞语音：
```
SpeechUtility.createUtility(this, SpeechConstant.APPID +"=xxxxxxxx");
```
在调用的地方初始化语音对象：
```
private SpeechSynthesizer mTts;

private void initMSC() {
    mTts = SpeechSynthesizer.createSynthesizer(mActivity, new InitListener() {
        @Override
        public void onInit(int code) {
            if (code == ErrorCode.SUCCESS) {
                // 设置在线合成
                mTts.setParameter(SpeechConstant.ENGINE_TYPE, SpeechConstant.TYPE_CLOUD);
                // 设置在线合成发音人
                mTts.setParameter(SpeechConstant.VOICE_NAME, "xiaoqi");
                //设置合成语速
                mTts.setParameter(SpeechConstant.SPEED, "50");
                //设置合成音调
                mTts.setParameter(SpeechConstant.PITCH, "50");
                //设置合成音量
                mTts.setParameter(SpeechConstant.VOLUME, "100");
                //设置播放器音频流类型
                mTts.setParameter(SpeechConstant.STREAM_TYPE, "3");
                // 设置播放合成音频打断音乐播放，默认为true
                mTts.setParameter(SpeechConstant.KEY_REQUEST_FOCUS, "true");
            }
        }
    });
}
```
然后调用API：
```
int code = mTts.startSpeaking("Hello 中国");
if (code != ErrorCode.SUCCESS && code != ErrorCode.ERROR_COMPONENT_NOT_INSTALLED) {
    ToastUtils.showShort(mActivity, "语音合成失败,错误码: " + code);
}
```

过程比较简单，稍微记录一下，更多详情可以参阅[官方文档](http://doc.xfyun.cn/msc_android/299547)。
