---
title: 【Android音视频开发】- 实时采集音频并编码
date: 2016-10-22 09:54:26
tags:
 - 直播
---

## 前言
通过我的上一篇文章，利用Camera实时采集视频，并用MediaCodec编码，可以得到YUV、H264文件了。那么接下来便是采集音频并编码了。

## 基础概念
在音频开发中，有一些基础的概念是必须要知道的。
### 采样率（samplerate）
采样就是把模拟信号数字化的过程，不仅仅是音频需要采样，所有的模拟信号都需要通过采样转换为可以用0101来表示的数字信号，示意图如下所示：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/10/video6.png)
蓝色代表模拟音频信号，红色的点代表采样得到的量化数值。采样频率越高，红色的间隔就越密集，记录这一段音频信号所用的数据量就越大，同时音频质量也就越高。根据奈奎斯特理论，采样频率只要不低于音频信号最高频率的两倍，就可以无损失地还原原始的声音。通常人耳能听到频率范围大约在20Hz～20kHz之间的声音，为了保证声音不失真，采样频率应在40kHz以上。常用的音频采样频率有：8kHz、11.025kHz、22.05kHz、16kHz、37.8kHz、44.1kHz、48kHz、96kHz、192kHz等。

### 量化精度（位宽）
上图中，每一个红色的采样点，都需要用一个数值来表示大小，这个数值的数据类型大小可以是：4bit、8bit、16bit、32bit等等，位数越多，表示得就越精细，声音质量自然就越好，当然，数据量也会成倍增大。常见的位宽是：8bit 或者 16bit。

### 声道数（channels）
由于音频的采集和播放是可以叠加的，因此，可以同时从多个音频源采集声音，并分别输出到不同的扬声器，故声道数一般表示声音录制时的音源数量或回放时相应的扬声器数量。单声道（Mono）和双声道（Stereo）比较常见，顾名思义，前者的声道数为1，后者为2。

### 音频帧（frame）
音频数据是流式的，本身并没有明确的一帧帧的概念，在实际的应用中，为了音频算法处理/传输的方便，一般约定俗成取 2.5 ms ~ 60 ms为单位的数据量为一帧音频。 这个时间被称之为“采样时间”，其长度没有特别的标准。我们可以计算一下一帧音频帧的大小。假设某通道的音频信号是采样率为 8 kHz，位宽为16 bit，20 ms 一帧，双通道，则一帧音频数据的大小为：
```
int size = 8000 x 16bit x 0.02s  x 2 = 5120 bit = 640 byte
```

<!-- more -->

## 采集
> Android SDK 提供了两套音频采集的API，分别是：MediaRecorder 和 AudioRecord，前者是一个更加上层一点的API，它可以直接把手机麦克风录入的音频数据进行编码压缩（如AMR、MP3等）并存成文件，而后者则更接近底层，能够更加自由灵活地控制，可以得到原始的一帧帧PCM音频数据。如果想简单地做一个录音机，录制成音频文件，则推荐使用 MediaRecorder，而如果需要对音频做进一步的算法处理、或者采用第三方的编码库进行压缩、以及网络传输等应用，则建议使用 AudioRecord，其实 MediaRecorder 底层也是调用了 AudioRecord 与 Android Framework 层的 AudioFlinger 进行交互的。

由上可知，在直播中实时采集音频自然是要用``AudioRecord``了。

## 编码
通过``AudioRecord``我们可以获取到原始的PCM数据了，接下来就是利用``MediaCodec``来进行编码成AAC数据了。

## 示例代码
变量声明：
```
private static final int DEFAULT_SOURCE = MediaRecorder.AudioSource.MIC;            // 麦克风
private static final int DEFAULT_SAMPLE_RATE = 44100;                               // 44.1KHz采样率
private static final int DEFAULT_CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_STEREO;    // 立体声
private static final int DEFAULT_AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;     // 16位宽
private static final int DEFAULT_BIT_RATE = 32000;                                  // 比特率
private static final String AAC_MIME = "audio/mp4a-latm";                           // AAC编码
```
初始化AudioRecord：
```
/**
 * 初始化AudioRecord
 *
 * @return
 */
private boolean initAudioRecord() {
    if (mIsCaptureStarted) {
        Log.e(TAG, "Capture already started !");
        return false;
    }

    mMinBufferSize = AudioRecord.getMinBufferSize(DEFAULT_SAMPLE_RATE, DEFAULT_CHANNEL_CONFIG, DEFAULT_AUDIO_FORMAT);
    if (mMinBufferSize == AudioRecord.ERROR_BAD_VALUE) {
        Log.e(TAG, "Invalid parameter !");
        return false;
    }
    Log.d(TAG, "getMinBufferSize = " + mMinBufferSize + " bytes !");

    mAudioRecord = new AudioRecord(DEFAULT_SOURCE, DEFAULT_SAMPLE_RATE, DEFAULT_CHANNEL_CONFIG, DEFAULT_AUDIO_FORMAT, mMinBufferSize);
    if (mAudioRecord.getState() == AudioRecord.STATE_UNINITIALIZED) {
        Log.e(TAG, "AudioRecord initialize fail !");
        return false;
    }
    return true;
}
```
初始化MediaCodec：
```
/**
 * 初始化MediaCodec
 */
private void initMediaCodec() {
    try {
        mMediaCodec = MediaCodec.createEncoderByType(AAC_MIME);
    } catch (IOException e) {
        e.printStackTrace();
    }
    MediaFormat format = new MediaFormat();
    format.setString(MediaFormat.KEY_MIME, AAC_MIME);
    format.setInteger(MediaFormat.KEY_BIT_RATE, DEFAULT_BIT_RATE);
    format.setInteger(MediaFormat.KEY_CHANNEL_COUNT, 2);
    format.setInteger(MediaFormat.KEY_SAMPLE_RATE, DEFAULT_SAMPLE_RATE);
    format.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
    format.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, mMinBufferSize * 2);
    mMediaCodec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
    mAudioRecord.startRecording();
    mMediaCodec.start();
}
```
调用``mAudioRecord.startRecording()``开始采集，并启动线程从AudioRecord获取数据，最后调用``mAudioRecord.stop();``停止采集。
```
private class AudioCaptureRunnable implements Runnable {
    @Override
    public void run() {
        while (!mIsLoopExit) {
            byte[] buffer = new byte[mMinBufferSize];
            int ret = mAudioRecord.read(buffer, 0, mMinBufferSize);
            if (ret == AudioRecord.ERROR_INVALID_OPERATION) {
                Log.e(TAG, "Error ERROR_INVALID_OPERATION");
            } else if (ret == AudioRecord.ERROR_BAD_VALUE) {
                Log.e(TAG, "Error ERROR_BAD_VALUE");
            } else {
                Log.d(TAG, "OK, Captured " + ret + " bytes !");
                Util.save(buffer, 0, buffer.length, pcmPath, true);
                ByteBuffer[] inputBuffers = mMediaCodec.getInputBuffers();
                ByteBuffer[] outputBuffers = mMediaCodec.getOutputBuffers();
                int inputBufferIndex = mMediaCodec.dequeueInputBuffer(-1);
                if (inputBufferIndex >= 0) {
                    ByteBuffer inputBuffer = inputBuffers[inputBufferIndex];
                    inputBuffer.clear();
                    inputBuffer.put(buffer);
                    mMediaCodec.queueInputBuffer(inputBufferIndex, 0, buffer.length,
                            System.nanoTime(), 0);
                }
                MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
                int outputBufferIndex = mMediaCodec.dequeueOutputBuffer(bufferInfo, 0);
                while (outputBufferIndex >= 0) {
                    ByteBuffer outputBuffer = outputBuffers[outputBufferIndex];

                    outputBuffer.position(bufferInfo.offset);
                    outputBuffer.limit(bufferInfo.offset + bufferInfo.size);

                    byte[] outData = new byte[bufferInfo.size + 7];

                    addADTStoPacket(outData, bufferInfo.size + 7);

                    outputBuffer.get(outData, 7, bufferInfo.size);

                    outputBuffer.position(bufferInfo.offset);


                    Util.save(outData, 0, outData.length, aacPath, true);

                    mMediaCodec.releaseOutputBuffer(outputBufferIndex, false);
                    outputBufferIndex = mMediaCodec.dequeueOutputBuffer(bufferInfo, 0);
                }
            }
        }
    }
}
```
核心代码便是这些了，运行程序后最后会生成PCM、AAC文件，将AAC文件用VLC打开也是可以播放的。

[工程代码示例](https://github.com/LiJia92/spydroid-ipcamera)

## ADTS
可以看到上述代码中有``addADTStoPacket``这个方法：
```
/**
 * Add ADTS header at the beginning of each and every AAC packet.
 * This is needed as MediaCodec encoder generates a packet of raw
 * AAC data.
 * <p>
 * Note the packetLen must count in the ADTS header itself.
 **/
private void addADTStoPacket(byte[] packet, int packetLen) {
    int profile = 2;  //AAC LC
    //39=MediaCodecInfo.CodecProfileLevel.AACObjectELD;
    int freqIdx = 4;  //44.1KHz
    int chanCfg = 2;  //CPE

    // fill in ADTS data
    packet[0] = (byte) 0xFF;
    packet[1] = (byte) 0xF9;
    packet[2] = (byte) (((profile - 1) << 6) + (freqIdx << 2) + (chanCfg >> 2));
    packet[3] = (byte) (((chanCfg & 3) << 6) + (packetLen >> 11));
    packet[4] = (byte) ((packetLen & 0x7FF) >> 3);
    packet[5] = (byte) (((packetLen & 7) << 5) + 0x1F);
    packet[6] = (byte) 0xFC;
}
```
ADTS头中相对有用的信息 采样率、声道数、帧长度。想想也是，我要是解码器的话，你给我一堆得AAC音频ES流我也解不出来。每一个带ADTS头信息的AAC流会清晰的告送解码器他需要的这些信息。更多信息请参见``参考``。

## 参考
[Android音频开发（1）：基础知识](http://ticktick.blog.51cto.com/823160/1748506)
[Android音频开发（2）：如何采集一帧音频](http://ticktick.blog.51cto.com/823160/1749719)
[Android音频开发之AudioRecord录音实现](http://www.cnblogs.com/whoislcj/p/5477216.html)
[多媒体封装格式详解--- AAC ADTS格式分析](http://blog.csdn.net/tx3344/article/details/7414543)
[How to generate the AAC ADTS elementary stream with Android MediaCodec](http://stackoverflow.com/questions/18862715/how-to-generate-the-aac-adts-elementary-stream-with-android-mediacodec)
