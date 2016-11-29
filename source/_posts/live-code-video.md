---
title: 【Android音视频开发】- 实时采集视频并编码
date: 2016-10-20 14:54:45
tags:
 - 直播
---

## 前言
通过我的上一篇文章，实时采集视频的LocalSocket方式在新的Android SDK上是跑不通的，那么便只剩下Camera了。本文将利用``Camera``来进行实时采集视频，``MediaCodec``进行硬编码来输出yuv、h264文件。

## YUV
通过Camera采集到的原始数据是YUV（NV21）格式的，何为YUV？

> YUV，分为三个分量，“Y”表示明亮度（Luminance或Luma），也就是灰度值；而“U”和“V” 表示的则是色度（Chrominance或Chroma），作用是描述影像色彩及饱和度，用于指定像素的颜色。YUV是一种颜色编码方法，主要用于电视系统以及模拟视频领域，它将亮度信息（Y）与色彩信息（UV）分离，没有UV信息一样可以显示完整的图像，只不过是黑白的，这样的设计很好地解决了彩色电视机与黑白电视的兼容问题。并且，YUV不像RGB那样要求三个独立的视频信号同时传输，所以用YUV方式传送占用极少的频宽。

YUV码流的存储格式其实与其采样的方式密切相关，主流的采样方式有三种，YUV4:4:4，YUV4:2:2，YUV4:2:0。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/10/video5.jpg)

1. YUV 4:4:4采样，每一个Y对应一组UV分量。
2. YUV 4:2:2采样，每两个Y共用一组UV分量。
3. YUV 4:2:0采样，每四个Y共用一组UV分量。

这里只抛出这样一个概念，详情请参见文末的``参考``。

<!-- more -->

## H264
H264作为当前最火热的编码方式，它有着特殊的分层结构。
> H.264 的功能分为两层：视频编码层(VCL, Video Coding Layer)和网络提取层(NAL, Network Abstraction Layer)。VCL 数据即编码处理的输出，它表示被压缩编码后的视频数据 序列。在 VCL 数据传输或存储之前,这些编码的 VCL 数据，先被映射或封装进 NAL 单元中。每个 NAL 单元包括一个原始字节序列负荷(RBSP, Raw Byte Sequence Payload)、一组对应于视频编码的 NAL 头信息。RBSP 的基本结构是：在原始编码数据的后面填加了结尾比特。一个bit“1”若干比特“0”，以便字节对齐。

在H264中，无论是SPS、PPS或者是slice data，都是由一个NAL unit所组成。
NALU头结构：NALU类型(5bit)、重要性指示位(2bit)、禁止位(1bit)。
1. NALU类型：1～12由H.264使用，24～31由H.264以外的应用使用。
2. 重要性指示：标志该NAL单元用于重建时的重要性，值越大，越重要。
3. 禁止位：网络发现NAL单元有比特错误时可设置该比特为1，以便接收方丢掉该单元。

这里依然是抛出这样一个概念，详情请参见文末的``参考``。（因为我自己也没怎么弄懂，哈哈哈~）

## 实例
下面直接结合``Camera``与``MediaCodec``来实现视频采集与编码，并且输出yuv、h264文件。
初始化MediaCodec:
```
private void initMediaCodec() {
    int degree = getDegree();
    framerate = 15;
    bitrate = 2 * width * height * framerate / 20;
    EncoderDebugger debugger = EncoderDebugger.debug(getApplicationContext(), width, height);
    mConvertor = debugger.getNV21Convertor();
    try {
        mMediaCodec = MediaCodec.createByCodecName(debugger.getEncoderName());
        MediaFormat mediaFormat;
        if (degree == 0) {
            mediaFormat = MediaFormat.createVideoFormat("video/avc", height, width);
        } else {
            mediaFormat = MediaFormat.createVideoFormat("video/avc", width, height);
        }
        mediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
        mediaFormat.setInteger(MediaFormat.KEY_FRAME_RATE, framerate);
        mediaFormat.setInteger(MediaFormat.KEY_COLOR_FORMAT,
                debugger.getEncoderColorFormat());
        mediaFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
        mMediaCodec.configure(mediaFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        mMediaCodec.start();
    } catch (IOException e) {
        e.printStackTrace();
    }
}
```
获取Camera：
```
private boolean createCamera(SurfaceHolder surfaceHolder) {
    try {
        mCamera = Camera.open(mCameraId);
        Camera.Parameters parameters = mCamera.getParameters();
        int[] max = determineMaximumSupportedFrameRate(parameters);
        Camera.CameraInfo camInfo = new Camera.CameraInfo();
        Camera.getCameraInfo(mCameraId, camInfo);
        int cameraRotationOffset = camInfo.orientation;
        int rotate = (360 + cameraRotationOffset - getDegree()) % 360;
        parameters.setRotation(rotate);
        parameters.setPreviewFormat(ImageFormat.NV21);
        parameters.setPreviewSize(width, height);
        parameters.setPreviewFpsRange(max[0], max[1]);
        mCamera.setParameters(parameters);
        mCamera.autoFocus(null);
        int displayRotation;
        displayRotation = (cameraRotationOffset - getDegree() + 360) % 360;
        mCamera.setDisplayOrientation(displayRotation);
        mCamera.setPreviewDisplay(surfaceHolder);
        return true;
    } catch (Exception e) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        String stack = sw.toString();
        Toast.makeText(this, stack, Toast.LENGTH_LONG).show();
        destroyCamera();
        e.printStackTrace();
        return false;
    }
}
```
采集并编码：
```
Camera.PreviewCallback previewCallback = new Camera.PreviewCallback() {
    byte[] mPpsSps = new byte[0];

    @Override
    public void onPreviewFrame(byte[] data, Camera camera) {
        // data即是NV21的数据
        if (data == null) {
            return;
        }
        ByteBuffer[] inputBuffers = mMediaCodec.getInputBuffers();
        ByteBuffer[] outputBuffers = mMediaCodec.getOutputBuffers();
        byte[] dst;
        Camera.Size previewSize = mCamera.getParameters().getPreviewSize();
        if (getDegree() == 0) {
            dst = Util.rotateNV21Degree90(data, previewSize.width, previewSize.height);
        } else {
            dst = data;
        }
        Util.save(data, 0, data.length, yuvPath, true);
        try {
            int bufferIndex = mMediaCodec.dequeueInputBuffer(5000000);
            if (bufferIndex >= 0) {
                inputBuffers[bufferIndex].clear();
                mConvertor.convert(dst, inputBuffers[bufferIndex]);
                mMediaCodec.queueInputBuffer(bufferIndex, 0,
                        inputBuffers[bufferIndex].position(),
                        System.nanoTime() / 1000, 0);
                MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
                int outputBufferIndex = mMediaCodec.dequeueOutputBuffer(bufferInfo, 0);
                while (outputBufferIndex >= 0) {
                    ByteBuffer outputBuffer = outputBuffers[outputBufferIndex];
                    byte[] outData = new byte[bufferInfo.size];
                    outputBuffer.get(outData);
                    //记录pps和sps
                    if (outData[0] == 0 && outData[1] == 0 && outData[2] == 0 && outData[3] == 1 && outData[4] == 103) {
                        mPpsSps = outData;
                    } else if (outData[0] == 0 && outData[1] == 0 && outData[2] == 0 && outData[3] == 1 && outData[4] == 101) {
                        //在关键帧前面加上pps和sps数据
                        byte[] frameData = new byte[mPpsSps.length + outData.length];
                        System.arraycopy(mPpsSps, 0, frameData, 0, mPpsSps.length);
                        System.arraycopy(outData, 0, frameData, mPpsSps.length, outData.length);
                        outData = frameData;
                    }
                    Util.save(outData, 0, outData.length, path, true);
                    mMediaCodec.releaseOutputBuffer(outputBufferIndex, false);
                    outputBufferIndex = mMediaCodec.dequeueOutputBuffer(bufferInfo, 0);
                }
            } else {
                Log.e("easypusher", "No buffer available !");
            }
        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            e.printStackTrace(pw);
            String stack = sw.toString();
            Log.e("save_log", stack);
            e.printStackTrace();
        } finally {
            mCamera.addCallbackBuffer(dst);
        }
    }

};
```
获取摄像头支持的分辨率代码：
```
public static void determineClosestSupportedResolution(Camera.Parameters parameters) {
    String supportedSizesStr = "Supported resolutions: ";
    List<Camera.Size> supportedSizes = parameters.getSupportedPreviewSizes();
    for (Iterator<Camera.Size> it = supportedSizes.iterator(); it.hasNext(); ) {
        Camera.Size size = it.next();
        supportedSizesStr += size.width + "x" + size.height + (it.hasNext() ? ", " : "");
    }
    Log.e("TAG", supportedSizesStr);
}
```

后面运行，点击``开始``进行录制，再次点击结束录制，会在sdcard上生成2个文件``test_1280x720.yuv``、``test_1280x720.h264``。
下载工具后进行查看文件便能看到录制的视频了。
YUV工具我是用的雷神改作的一个：[修改了一个YUV/RGB播放器](http://blog.csdn.net/leixiaohua1020/article/details/50466201)。
H264工具则是用的[VLC](http://www.videolan.org/vlc/)。

[工程代码示例](https://github.com/LiJia92/spydroid-ipcamera)

Tip：Camera采集默认是横屏，所以竖屏采集输出的图像需要旋转90度，解决方法参见``参考``即demo中的代码。

## 参考
[Camera的简单使用浅析](http://www.cnblogs.com/raomengyang/p/4852277.html)
[Android Camera原始帧格式转换 —— 获取Camera图像（一）](http://www.cnblogs.com/raomengyang/p/5426525.html)
[直播必备之YUV使用总结 —— Android常用的几种格式：NV21/NV12/YV12/YUV420P的区别](http://www.cnblogs.com/raomengyang/p/5582270.html)
[Camera](https://developer.android.com/guide/topics/media/camera.html)
[MediaCodec](https://developer.android.com/reference/android/media/MediaCodec.html)
[Video Rendering with 8-Bit YUV Formats](https://msdn.microsoft.com/en-us/library/aa904813.aspx)
[YUV420SP图像的旋转](http://www.ay27.com/2014/10/09/2014-10-09-a-simple-image-rotate-function/)
[图文详解YUV420数据格式](http://www.cnblogs.com/azraelly/archive/2013/01/01/2841269.htm)
[Android 实时视频采集—Cameara预览采集](http://www.cnblogs.com/skyseraph/archive/2012/03/26/2418665.html)
[H.264中如何判斷某一段是否為SPS(Sequence Parameter Set)或PPS(Picture Parameter Set)](http://brytsai.blogspot.jp/2010/02/h.html)
[EasyPusher安卓Android手机直播推送之MediaCodec 硬编码H264格式](http://blog.csdn.net/u013758734/article/details/50834770)
[Android屏幕直播方案](http://www.dobest.me/blog/2016/06/17/Android%E5%B1%8F%E5%B9%95%E7%9B%B4%E6%92%AD%E6%96%B9%E6%A1%88/)
