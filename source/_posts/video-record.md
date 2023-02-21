---
title: Android 倍速压缩视频时长
date: 2023-02-21 15:00:19
tags:
 - 日常开发
---
最近有个“精彩时刻”的需求，记录学员精彩练车瞬间。当学员此次项目练习过程中，没有出现任何错误，则定义为“精彩时刻”。需要将学员从项目开始到结束行走轨迹记录下来，输出一个视频。然后再将视频时长压缩到 20 秒，同时附加一个音频上去，生成最终的视频。
这个时候，写博客的好处就来了。参考之前写的几篇文章[录制仿 Keep 轨迹动画视频](http://lastwarmth.win/2018/10/18/screen-record/)、[无声视频合成音频](http://lastwarmth.win/2018/11/23/media-mix/)、[无声视频合成音频（续）](http://lastwarmth.win/2019/09/19/media-mix2/)，记录了关于录屏、合成音频的代码，可以直接参考来用。那么剩下的问题便是视频时长压缩到 20 秒了，通过调研发现了两种方式，记录一下。

<!-- more -->

## VideoProcessor
[VideoProcessor](https://github.com/yellowcath/VideoProcessor) 是在 Github 找到的一个库，通过 README 了解到对相关功能进行了高度封装，示例如下：
```
VideoProcessor.processor(context)
       .input(inputVideoPath) // .input(inputVideoUri)
       .output(outputVideoPath)
       //以下参数全部为可选
       .outWidth(width)
       .outHeight(height)
       .startTimeMs(startTimeMs)//用于剪辑视频
       .endTimeMs(endTimeMs)    //用于剪辑视频
       .speed(speed)            //改变视频速率，用于快慢放
       .changeAudioSpeed(changeAudioSpeed) //改变视频速率时，音频是否同步变化
       .bitrate(bitrate)       //输出视频比特率
       .frameRate(frameRate)   //帧率
       .iFrameInterval(iFrameInterval)  //关键帧距，为0时可输出全关键帧视频（部分机器上需为-1）
       .progressListener(listener)      //可输出视频处理进度
       .process();
```
若要进行倍速播放，直接设置一下 speed 即可，还是挺简洁的。
于是将项目 clone 下来，把 demo 跑起来，运行倍速播放出现了崩溃，后面定位问题是视频旋转角度、比特率属性拿不到，然后强转 Integer 崩溃了：
```
/**
 * 支持裁剪缩放快慢放
 */
public static void processVideo(@NotNull Context context, @NotNull Processor processor) throws Exception {

    MediaMetadataRetriever retriever = new MediaMetadataRetriever();
    processor.input.setDataSource(retriever);
    int originWidth = Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
    int originHeight = Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
    int rotationValue = Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
    int oriBitrate = Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE));
    int durationMs = Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));

    ...
}
```
因为项目用不到旋转角度，就直接写成 0 了，至于 bitRate 设置了一个默认值：
```
int rotationValue = 0;
int oriBitrate = DEFAULT_BITRATE;
String bitRate = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE);
if (bitRate != null) {
    oriBitrate = Integer.parseInt(bitRate);
}
```
开始 demo 可以跑起来了，也确实可以倍速压缩，只不过时长有点久，不过目前还没找到更快的其他方案。
后面跟进源代码，发现这个倍速压缩原理就像画画一样，本来 1 秒画一张画，现在改成 2 秒画一张，便实现了倍速播放。核心代码如下：
```
mDecoder.releaseOutputBuffer(outputBufferIndex, doRender);
if (doRender) {
    boolean errorWait = false;
    try {
        mOutputSurface.awaitNewImage();
    } catch (Exception e) {
        errorWait = true;
        CL.e(e.getMessage());
    }
    if (!errorWait) {
        if (videoStartTimeUs == -1) {
            videoStartTimeUs = info.presentationTimeUs;
            CL.i("videoStartTime:" + videoStartTimeUs / 1000);
        }
        mOutputSurface.drawImage(false);
        long presentationTimeNs = (info.presentationTimeUs - videoStartTimeUs) * 1000;
        if (mSpeed != null) {
            presentationTimeNs /= mSpeed;
        }
        CL.i("drawImage,setPresentationTimeMs:" + presentationTimeNs / 1000 / 1000);
        mInputSurface.setPresentationTime(presentationTimeNs);
        mInputSurface.swapBuffers();
        break;
    }
}
```
通过 mSpeed 改变 presentationTimeNs，改变画画的时间间隔，然后两个 surface 一个写，一个读，从而生成倍速视频。
原理还是挺简单的，而且基于原生 MediaCodec 实现，没有额外引入复杂的三方库，体积可控。

## ffmpeg
说到音视频处理，那么必然会想到 ffmpeg。只是 ffmpeg 功能过于强大，占包体积自然也更大，入手难度也更高。借着这次需求开发，也正好可以了解了解 ffmpeg。在 Github 上同样找到了编译好的库[ffmpeg-android-java](https://github.com/WritingMinds/ffmpeg-android-java)。这个库提供两个个基本方法：
```
loadBinary(FFmpegLoadBinaryResponseHandler ffmpegLoadBinaryResponseHandler) throws FFmpegNotSupportedException
execute(String cmd, FFmpegExecuteResponseHandler ffmpegExecuteResponseHandler) throws FFmpegCommandAlreadyRunningException
```
一个加载库，一个执行 ffmpeg 的指令。
将代码跑起来，可以自行输入 ffmpeg 指令，然后返回相应的结果。
调研下来最终可以执行的指令是这样的：
```
ffmpeg -i /sdcard/DCIM/intput.mp4 -threads 5 -preset medium -b:v 633k -filter:v setpts=0.5*PTS -r 33 /sdcard/DCIM/output.mp4"
```
1. -i 之后跟着的是输入路径；
2. -threads 5 是多线程数量；
3. -preset medium 是指压缩速度，有 ultrafast、superfast、fast、medium、slower、veryslow 等等一些档次，不同速度对应着不同的压缩质量，同时也会影响压缩的耗时，速度越快，视频越模糊，压缩耗时越短；
4. -b:v 633k 是设置视频轨道的比特率；
5. -filter:v setpts=0.5*PTS 是设置 2 倍速，注意不要加任何引号；
6. -r 是设置视频的帧率，放到前面设置好像没什么用，后面挪到 output path 前面就生效了。
还有很多其他的指令，可以在 [ffmpeg 官网](https://ffmpeg.org/)查询。

## 小结
通过两种方式，都实现了想要的效果，考虑到包体积大小、使用简易程度，最终还是选择了 VideoProcessor 方案。后面若有更复杂的视频需求，可能才是 ffmpeg 出马的时候。最后附上一个最终效果的视频：
<video src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/1676877341437.mp4" width="640" height="400" controls="controls">
Your browser does not support the video tag.
</video>
