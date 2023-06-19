---
title: Android 对视频进行切割、添加转场效果
date: 2023-06-19 17:52:19
tags:
 - 日常开发
---
在[Android 倍速压缩视频时长](http://lastwarmth.win/2023/02/21/video-record/)中，实现了针对完整视频进行倍速压缩的功能。用户反馈说，这样的一个倍速视频就和看轨迹回放一样的效果，从头到尾完整播放一遍，体现不出“牛逼”的地方。于是想着针对学员“操作”的地方进行切片，比如打方向盘、挂挡等。当出现这些操作时，对整个视频进行切割，生成若干个片段，然后再拼接到一起。片段衔接处添加转场效果，让切换看起来更丝滑。这样处理后的视频，可能就是一个富含学员“精彩操作”的视频，学员查看和分享的欲望可能就更强烈了。基于这样的一个需求场景，需要做的事情就确定了：
1. 对完整视频进行切片，分割成若干个片段；
2. 将片段结合转场效果合并到一起，生成最终视频。

<!-- more -->

## 切片
经过产品讨论，目前设定的操作切片逻辑如下：
1. 进入项目的三秒内；
2. 离开项目的三秒前；
3. 拉手刹；
4. 停车；
5. 打方向盘超过360度；
6. 侧方接触36线时。

生成的切片无非就是若干个时间片段（相对时间）。基于 VideoProcessor 的 VideoDecodeThread 类，做了相关修改：
```
public class VideoDecodeThread extends Thread {
    private MediaExtractor mExtractor;
    private MediaCodec mDecoder;
    private Integer mStartTimeMs;
    private Integer mEndTimeMs;
    private Float mSpeed;
    private AtomicBoolean mDecodeDone;
    private Exception mException;
    private int mVideoIndex;
    private IVideoEncodeThread mVideoEncodeThread;
    private InputSurface mInputSurface;
    private OutputSurface mOutputSurface;
    private Integer mDstFrameRate;
    private Integer mSrcFrameRate;
    private boolean mDropFrames;
    private FrameDropper mFrameDropper;
    private List<Pair<Long, Long>> mCutSegments;

    public VideoDecodeThread(IVideoEncodeThread videoEncodeThread, MediaExtractor extractor,
                             @Nullable Integer startTimeMs, @Nullable Integer endTimeMs,
                             @Nullable Integer srcFrameRate, @Nullable Integer dstFrameRate, @Nullable Float speed,
                             boolean dropFrames,
                             int videoIndex, AtomicBoolean decodeDone

    ) {
        this(videoEncodeThread, extractor, startTimeMs, endTimeMs, null, srcFrameRate, dstFrameRate, speed, dropFrames, videoIndex, decodeDone);
    }

    public VideoDecodeThread(IVideoEncodeThread videoEncodeThread, MediaExtractor extractor,
                             @Nullable Integer startTimeMs, @Nullable Integer endTimeMs, List<Pair<Long, Long>> cutSegments,
                             @Nullable Integer srcFrameRate, @Nullable Integer dstFrameRate, @Nullable Float speed,
                             boolean dropFrames,
                             int videoIndex, AtomicBoolean decodeDone

    ) {
        super("VideoProcessDecodeThread");
        mExtractor = extractor;
        mStartTimeMs = startTimeMs;
        mEndTimeMs = endTimeMs;
        mCutSegments = cutSegments;
        mSpeed = speed != null ? speed : 1f;
        mVideoIndex = videoIndex;
        mDecodeDone = decodeDone;
        mVideoEncodeThread = videoEncodeThread;
        mDstFrameRate = dstFrameRate;
        mSrcFrameRate = srcFrameRate;
        mDropFrames = dropFrames;
    }

    @Override
    public void run() {
        super.run();
        try {
            doDecode();
        } catch (Exception e) {
            mException = e;
            CL.e(e);
        } finally {
            if (mInputSurface != null) {
                mInputSurface.release();
            }
            if (mOutputSurface != null) {
                mOutputSurface.release();
            }
            try {
                if (mDecoder != null) {
                    mDecoder.stop();
                    mDecoder.release();
                }
            } catch (Exception e) {
                mException = mException == null ? e : mException;
                CL.e(e);
            }
        }
    }

    private void doDecode() throws IOException {
        CountDownLatch eglContextLatch = mVideoEncodeThread.getEglContextLatch();
        try {
            boolean await = eglContextLatch.await(5, TimeUnit.SECONDS);
            if (!await) {
                mException = new TimeoutException("wait eglContext timeout!");
                return;
            }
        } catch (InterruptedException e) {
            CL.e(e);
            mException = e;
            return;
        }
        Surface encodeSurface = mVideoEncodeThread.getSurface();
        mInputSurface = new InputSurface(encodeSurface);
        mInputSurface.makeCurrent();

        MediaFormat inputFormat = mExtractor.getTrackFormat(mVideoIndex);

        //初始化解码器
        mDecoder = MediaCodec.createDecoderByType(inputFormat.getString(MediaFormat.KEY_MIME));
        mOutputSurface = new OutputSurface();
        mDecoder.configure(inputFormat, mOutputSurface.getSurface(), null, 0);
        mDecoder.start();
        //丢帧判断
        int frameIndex = 0;
        if (mDropFrames && mSrcFrameRate != null && mDstFrameRate != null) {
            if (mSpeed != null) {
                mSrcFrameRate = (int) (mSrcFrameRate * mSpeed);
            }
            if (mSrcFrameRate > mDstFrameRate) {
                mFrameDropper = new FrameDropper(mSrcFrameRate, mDstFrameRate);
                CL.w("帧率过高，需要丢帧:" + mSrcFrameRate + "->" + mDstFrameRate);
            }
        }
        //开始解码
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        boolean decoderDone = false;
        boolean inputDone = false;
        long videoStartTimeUs = -1;
        int decodeTryAgainCount = 0;

        while (!decoderDone) {
            //还有帧数据，输入解码器
            if (!inputDone) {
                boolean eof = false;
                int index = mExtractor.getSampleTrackIndex();
                if (index == mVideoIndex) {
                    int inputBufIndex = mDecoder.dequeueInputBuffer(TIMEOUT_USEC);
                    if (inputBufIndex >= 0) {
                        ByteBuffer inputBuf = mDecoder.getInputBuffer(inputBufIndex);
                        int chunkSize = mExtractor.readSampleData(inputBuf, 0);
                        if (chunkSize < 0) {
                            mDecoder.queueInputBuffer(inputBufIndex, 0, 0, 0L, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                            decoderDone = true;
                        } else {
                            long sampleTime = mExtractor.getSampleTime();
                            mDecoder.queueInputBuffer(inputBufIndex, 0, chunkSize, sampleTime, 0);
                            mExtractor.advance();
                        }
                    }
                } else if (index == -1) {
                    eof = true;
                }

                if (eof) {
                    //解码输入结束
                    CL.i("inputDone");
                    int inputBufIndex = mDecoder.dequeueInputBuffer(TIMEOUT_USEC);
                    if (inputBufIndex >= 0) {
                        mDecoder.queueInputBuffer(inputBufIndex, 0, 0, 0L, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                        inputDone = true;
                    }
                }
            }
            boolean decoderOutputAvailable = !decoderDone;
            if (decoderDone) {
                CL.i("decoderOutputAvailable:" + decoderOutputAvailable);
            }
            while (decoderOutputAvailable) {
                int outputBufferIndex = mDecoder.dequeueOutputBuffer(info, TIMEOUT_USEC);
                CL.i("outputBufferIndex = " + outputBufferIndex);
                if (inputDone && outputBufferIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                    decodeTryAgainCount++;
                    if (decodeTryAgainCount > 10) {
                        //小米2上出现BUFFER_FLAG_END_OF_STREAM之后一直tryAgain的问题
                        CL.e("INFO_TRY_AGAIN_LATER 10 times,force End!");
                        decoderDone = true;
                        break;
                    }
                } else {
                    decodeTryAgainCount = 0;
                }
                if (outputBufferIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                    break;
                } else if (outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat newFormat = mDecoder.getOutputFormat();
                    CL.i("decode newFormat = " + newFormat);
                } else if (outputBufferIndex < 0) {
                    //ignore
                    CL.e("unexpected result from decoder.dequeueOutputBuffer: " + outputBufferIndex);
                } else {
                    boolean doRender = true;
                    //解码数据可用
                    if (mEndTimeMs != null && info.presentationTimeUs >= mEndTimeMs * 1000) {
                        inputDone = true;
                        decoderDone = true;
                        doRender = false;
                        info.flags |= MediaCodec.BUFFER_FLAG_END_OF_STREAM;
                    }
                    if (mStartTimeMs != null && info.presentationTimeUs < mStartTimeMs * 1000) {
                        doRender = false;
                        CL.e("drop frame startTime = " + mStartTimeMs + " present time = " + info.presentationTimeUs / 1000);
                    }
                    if (mEndTimeMs == null && mStartTimeMs == null) {
                        if (mCutSegments != null) {
                            doRender = false;
                            // 在时间片段内的才渲染
                            for (Pair<Long, Long> segment : mCutSegments) {
                                if (info.presentationTimeUs >= segment.first && info.presentationTimeUs <= segment.second) {
                                    doRender = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (info.flags == MediaCodec.BUFFER_FLAG_END_OF_STREAM) {
                        decoderDone = true;
                        mDecoder.releaseOutputBuffer(outputBufferIndex, false);
                        CL.i("decoderDone");
                        break;
                    }
                    //检查是否需要丢帧
                    if (mFrameDropper != null && mFrameDropper.checkDrop(frameIndex)) {
                        CL.w("帧率过高，丢帧:" + frameIndex);
                        doRender = false;
                    }
                    frameIndex++;
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
                            long presentationTimeNs = 0;
                            float percent = 1;
                            if (mEndTimeMs == null && mStartTimeMs == null) {
                                if (mCutSegments != null) {
                                    long gap = 0;
                                    for (int i = 0; i < mCutSegments.size(); i++) {
                                        // 计算所属时间片段
                                        Pair<Long, Long> segment = mCutSegments.get(i);
                                        if (info.presentationTimeUs >= segment.first && info.presentationTimeUs <= segment.second) {
                                            presentationTimeNs = info.presentationTimeUs - segment.first + gap;
                                            long start = info.presentationTimeUs - segment.first;
                                            long end = segment.second - info.presentationTimeUs;
                                            // 透明度百分比动画500毫秒
                                            if (start < end) {
                                                // 第一个片段的开始，不做动画
                                                percent = start / (500f * 1000 * mSpeed);
                                                if (i == 0) {
                                                    percent = 1f;
                                                }
                                            } else {
                                                percent = end / (500f * 1000 * mSpeed);
                                                // 最后一个片段的结束，不做动画
                                                if (i == mCutSegments.size() - 1) {
                                                    percent = 1f;
                                                }
                                            }
                                            if (percent > 1f) {
                                                percent = 1f;
                                            }
                                            if (percent < 0f) {
                                                percent = 0f;
                                            }
                                            break;
                                        } else {
                                            gap += segment.second - segment.first;
                                        }
                                    }
                                }
                            } else {
                                if (videoStartTimeUs == -1) {
                                    videoStartTimeUs = info.presentationTimeUs;
                                    CL.i("videoStartTime:" + videoStartTimeUs / 1000);
                                }
                                presentationTimeNs = (info.presentationTimeUs - videoStartTimeUs) * 1000;
                            }
                            presentationTimeNs /= mSpeed;
                            mVideoEncodeThread.setTime(presentationTimeNs);
                            mOutputSurface.drawImage(false, percent);
                            CL.i("drawImage,setPresentationTimeMs:" + presentationTimeNs / 1000 / 1000);
                            mInputSurface.setPresentationTime(presentationTimeNs);
                            mInputSurface.swapBuffers();
                            break;
                        }
                    }
                }
            }
        }
        CL.i("Video Decode Done!");
        mDecodeDone.set(true);
    }

    public Exception getException() {
        return mException;
    }
}
```
VideoDecodeThread 类主要做的就是将视频解码，绘制到 Surface 上。针对倍速、截取视频长短，无非就是控制绘制的逻辑。代码里有 doRender 参数的设置，为 true 时才会绘制。
添加了一个``List<Pair<Long, Long>> mCutSegments``的参数，由外部传入，就是需要切片的时间段，示例如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG597.png)
当 info.presentationTimeUs 处于时间片段内时，doRender 才设置成 true，才会执行绘制逻辑。
经过测试确实可以切片了，但是还有一个问题：视频切片的长度，并不是近似等于时间片段的总时长。使用示例数据，应该是生成 11 秒上下的视频，用两个测试视频进行测试，一个视频最终只有 9 秒，另一个视频却有 13 秒。
最终定位到问题：decode 是解码进行 Surface 绘制，但是真正写 mp4 文件的还是 encode 类，encode 时的 presentationTimeUs 不是严格对齐的。
```
public class VideoEncodeThread extends Thread implements IVideoEncodeThread {

    private MediaCodec mEncoder;
    private MediaMuxer mMuxer;
    private AtomicBoolean mDecodeDone;
    private CountDownLatch mMuxerStartLatch;
    private Exception mException;
    private int mBitrate;
    private int mResultWidth;
    private int mResultHeight;
    private int mIFrameInterval;
    private int mFrameRate;
    private MediaExtractor mExtractor;
    private int mVideoIndex;
    //    private volatile InputSurface mInputSurface;
    private volatile CountDownLatch mEglContextLatch;
    private volatile Surface mSurface;
    private VideoProgressAve mProgressAve;

    private volatile long time = -1;

    public VideoEncodeThread(MediaExtractor extractor, MediaMuxer muxer,
                             int bitrate, int resultWidth, int resultHeight, int iFrameInterval,
                             int frameRate, int videoIndex,
                             AtomicBoolean decodeDone, CountDownLatch muxerStartLatch) {
        super("VideoProcessEncodeThread");
        mMuxer = muxer;
        mDecodeDone = decodeDone;
        mMuxerStartLatch = muxerStartLatch;
        mExtractor = extractor;
        mBitrate = bitrate;
        mResultHeight = resultHeight;
        mResultWidth = resultWidth;
        mIFrameInterval = iFrameInterval;
        mVideoIndex = videoIndex;
        mFrameRate = frameRate;
        mEglContextLatch = new CountDownLatch(1);
    }

    @Override
    public void run() {
        super.run();
        try {
            doEncode();
        } catch (Exception e) {
            CL.e(e);
            mException = e;
        } finally {
            try {
                if (mEncoder != null) {
                    mEncoder.stop();
                    mEncoder.release();
                }
            } catch (Exception e) {
                mException = mException == null ? e : mException;
                CL.e(e);
            }
        }
    }

    private void doEncode() throws IOException {
        MediaFormat inputFormat = mExtractor.getTrackFormat(mVideoIndex);
        //初始化编码器
        int frameRate;
        if (mFrameRate > 0) {
            frameRate = mFrameRate;
        } else {
            frameRate = inputFormat.containsKey(MediaFormat.KEY_FRAME_RATE) ? inputFormat.getInteger(inputFormat.KEY_FRAME_RATE) : DEFAULT_FRAME_RATE;
        }
        String mimeType = VideoProcessor.OUTPUT_MIME_TYPE;
        MediaFormat outputFormat = MediaFormat.createVideoFormat(mimeType, mResultWidth, mResultHeight);
        outputFormat.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
        outputFormat.setInteger(MediaFormat.KEY_FRAME_RATE, frameRate);
        outputFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, mIFrameInterval);

        mEncoder = MediaCodec.createEncoderByType(mimeType);
        boolean supportProfileHigh = VideoUtil.trySetProfileAndLevel(mEncoder, mimeType, outputFormat,
                MediaCodecInfo.CodecProfileLevel.AVCProfileHigh,
                MediaCodecInfo.CodecProfileLevel.AVCLevel31
        );
        if (supportProfileHigh) {
            CL.i("supportProfileHigh,enable ProfileHigh");
        }
        int maxBitrate = VideoUtil.getMaxSupportBitrate(mEncoder,mimeType);
        if (maxBitrate > 0 && mBitrate > maxBitrate) {
            CL.e(mBitrate + " bitrate too large,set to:" + maxBitrate);
            mBitrate = (int) (maxBitrate * 0.8f);//直接设置最大值小米2报错
        }
        outputFormat.setInteger(MediaFormat.KEY_BIT_RATE, mBitrate);
        mEncoder.configure(outputFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        mSurface = mEncoder.createInputSurface();

//        mInputSurface = new InputSurface(encodeSurface);
//        mInputSurface.makeCurrent();
        mEncoder.start();
        mEglContextLatch.countDown();

        boolean signalEncodeEnd = false;
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        int encodeTryAgainCount = 0;
        int videoTrackIndex = -5;
        boolean detectTimeError = false;
        final int VIDEO_FRAME_TIME_US = (int) (1000 * 1000f / frameRate);
        long lastVideoFrameTimeUs = -1;
        //开始编码
        //输出
        while (true) {
            if (mDecodeDone.get() && !signalEncodeEnd) {
                signalEncodeEnd = true;
                mEncoder.signalEndOfInputStream();
            }
            int outputBufferIndex = mEncoder.dequeueOutputBuffer(info, TIMEOUT_USEC);
            CL.i("encode outputBufferIndex = " + outputBufferIndex);
            if (signalEncodeEnd && outputBufferIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                encodeTryAgainCount++;
                if (encodeTryAgainCount > 10) {
                    //三星S8上出现signalEndOfInputStream之后一直tryAgain的问题
                    CL.e("INFO_TRY_AGAIN_LATER 10 times,force End!");
                    break;
                }
            } else {
                encodeTryAgainCount = 0;
            }
            if (outputBufferIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                continue;
            } else if (outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                MediaFormat newFormat = mEncoder.getOutputFormat();
                if (videoTrackIndex == -5) {
                    videoTrackIndex = mMuxer.addTrack(newFormat);
                    mMuxer.start();
                    mMuxerStartLatch.countDown();
                }
                CL.i("encode newFormat = " + newFormat);
            } else if (outputBufferIndex < 0) {
                //ignore
                CL.e("unexpected result from decoder.dequeueOutputBuffer: " + outputBufferIndex);
            } else {
                //编码数据可用
                ByteBuffer outputBuffer = mEncoder.getOutputBuffer(outputBufferIndex);
                if (info.flags == MediaCodec.BUFFER_FLAG_END_OF_STREAM && info.presentationTimeUs < 0) {
                    info.presentationTimeUs = 0;
                }
                //写入视频
                if (!detectTimeError && lastVideoFrameTimeUs != -1 && info.presentationTimeUs < lastVideoFrameTimeUs + VIDEO_FRAME_TIME_US / 2) {
                    //某些视频帧时间会出错
                    CL.e("video 时间戳错误，lastVideoFrameTimeUs:" + lastVideoFrameTimeUs + " " +
                            "info.presentationTimeUs:" + info.presentationTimeUs + " VIDEO_FRAME_TIME_US:" + VIDEO_FRAME_TIME_US);
                    detectTimeError = true;
                }
                if (detectTimeError) {
                    info.presentationTimeUs = lastVideoFrameTimeUs + VIDEO_FRAME_TIME_US;
                    CL.e("video 时间戳错误，使用修正的时间戳:" + info.presentationTimeUs);
                    detectTimeError = false;
                }
                if (info.flags != MediaCodec.BUFFER_FLAG_CODEC_CONFIG) {
                    lastVideoFrameTimeUs = info.presentationTimeUs;
                }
                if (time != -1) {
                    info.presentationTimeUs = time;
                }
                CL.i("writeSampleData,size:" + info.size + " time:" + info.presentationTimeUs / 1000);
                mMuxer.writeSampleData(videoTrackIndex, outputBuffer, info);
                notifyProgress(info);
                mEncoder.releaseOutputBuffer(outputBufferIndex, false);
                if (info.flags == MediaCodec.BUFFER_FLAG_END_OF_STREAM) {
                    CL.i("encoderDone");
                    break;
                }
            }
        }
        CL.i("Video Encode Done!");
    }

    private void notifyProgress(MediaCodec.BufferInfo info) {
        if (mProgressAve == null) {
            return;
        }
        mProgressAve.setEncodeTimeStamp((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) > 0 ? Long.MAX_VALUE : info.presentationTimeUs);
    }

    @Override
    public Surface getSurface() {
        return mSurface;
    }

    @Override
    public CountDownLatch getEglContextLatch() {
        return mEglContextLatch;
    }

    @Override
    public void setTime(long time) {
        this.time = time;
    }

    public Exception getException() {
        return mException;
    }

    public void setProgressAve(VideoProgressAve progressAve) {
        mProgressAve = progressAve;
    }
}
```
mMuxer.writeSampleData 才是对视频文件的最终写入。所以参数 info 的 presentationTimeUs 至关重要，它会控制视频的整体时长。但是针对视频分片，只能用解码的 presentationTimeUs 进行处理，索性便将解码的 presentationTimeUs 直接传到编码这边直接用了：
```
if (time != -1) {
    info.presentationTimeUs = time;
}
```
如此操作之后，生成的视频长度便符合预期了。

## 转场
Android 对视频添加转场效果，之前没什么经验，搜索出来的都是针对两个视频添加转场效果。在当前场景中，这只能作为最下下下策方案。不然生成若干个小视频，再两两拼接，这耗时可就太久了，最好的就是在写 mp4 时直接就生成好。再搜索一番，发现可以利用 OpenGL 添加转场效果。
VideoProcessor 库实现视频编解码正好利用到了 OpenGL：
```
public void drawFrame(SurfaceTexture st, boolean invert, float percent) {
    checkGlError("onDrawFrame start");
    st.getTransformMatrix(mSTMatrix);

    if (invert) {
        mSTMatrix[5] = -mSTMatrix[5];
        mSTMatrix[13] = 1.0f - mSTMatrix[13];
    }
    vPercent[0] = percent;
    GLES20.glUseProgram(mProgram);
    checkGlError("glUseProgram");
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, mTextureID);
    mTriangleVertices.position(TRIANGLE_VERTICES_DATA_POS_OFFSET);
    GLES20.glVertexAttribPointer(maPositionHandle, 3, GLES20.GL_FLOAT, false, TRIANGLE_VERTICES_DATA_STRIDE_BYTES, mTriangleVertices);
    checkGlError("glVertexAttribPointer maPosition");
    GLES20.glEnableVertexAttribArray(maPositionHandle);
    checkGlError("glEnableVertexAttribArray maPositionHandle");
    mTriangleVertices.position(TRIANGLE_VERTICES_DATA_UV_OFFSET);
    GLES20.glVertexAttribPointer(maTextureHandle, 2, GLES20.GL_FLOAT, false, TRIANGLE_VERTICES_DATA_STRIDE_BYTES, mTriangleVertices);
    checkGlError("glVertexAttribPointer maTextureHandle");
    GLES20.glEnableVertexAttribArray(maTextureHandle);
    checkGlError("glEnableVertexAttribArray maTextureHandle");
    GLES20.glUniformMatrix4fv(muSTMatrixHandle, 1, false, mSTMatrix, 0);
    GLES20.glUniformMatrix4fv(muMVPMatrixHandle, 1, false, mMVPMatrix, 0);
    GLES20.glUniform2fv(mPercent, 1, vPercent, 0);
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
    checkGlError("glDrawArrays");
    GLES20.glFinish();
}
```
研究了若干文章，都是针对两个图片帧实现的效果。[GLTransitions](https://gl-transitions.com/)这个项目实现的效果可太酷炫了，可要怎么移植到 Android 中呢？曾经妄想能直接找到对应的着色器直接使用，毫无疑问全部失败。经过一阵无厘头的摸索之后恍然醒悟：**需要自己做动画百分比，让当前帧达到一个预想的中间态**。就和安卓中最普通的动画一样。
所以通过时间戳计算出一个 percent：
```
for (int i = 0; i < mCutSegments.size(); i++) {
    // 计算所属时间片段
    Pair<Long, Long> segment = mCutSegments.get(i);
    if (info.presentationTimeUs >= segment.first && info.presentationTimeUs <= segment.second) {
        presentationTimeNs = info.presentationTimeUs - segment.first + gap;
        long start = info.presentationTimeUs - segment.first;
        long end = segment.second - info.presentationTimeUs;
        // 透明度百分比动画500毫秒
        if (start < end) {
            // 第一个片段的开始，不做动画
            percent = start / (500f * 1000 * mSpeed);
            if (i == 0) {
                percent = 1f;
            }
        } else {
            percent = end / (500f * 1000 * mSpeed);
            // 最后一个片段的结束，不做动画
            if (i == mCutSegments.size() - 1) {
                percent = 1f;
            }
        }
        if (percent > 1f) {
            percent = 1f;
        }
        if (percent < 0f) {
            percent = 0f;
        }
        break;
    } else {
        gap += segment.second - segment.first;
    }
}
```
然后在 drawFrame 时，传入到 OpenGL 中。那么 OpenGL 如何自定义参数呢？
```
private static final String VERTEX_SHADER =
        "uniform mat4 uMVPMatrix;\n" +
                "uniform mat4 uSTMatrix;\n" +
                "attribute vec4 aPosition;\n" +
                "attribute vec4 aTextureCoord;\n" +
                "varying vec2 vTextureCoord;\n" +
                "void main() {\n" +
                "  gl_Position = uMVPMatrix * aPosition;\n" +
                "  vTextureCoord = (uSTMatrix * aTextureCoord).xy;\n" +
                "}\n";

private static final String FRAGMENT_SHADER =
        "#extension GL_OES_EGL_image_external : require\n" +
                "precision mediump float;\n" +
                "varying vec2 vTextureCoord;\n" +
                "uniform vec2 vPercent;\n" +
                "uniform samplerExternalOES sTexture;\n" +
                "void main() {\n" +
                "  vec4 c = texture2D(sTexture, vTextureCoord);\n" +
                "  gl_FragColor = vec4(c.r * vPercent[0], c.g * vPercent[0], c.b * vPercent[0], 1.0);\n" +
                "}\n";
```
参照着代码中定义的参数，定义了一个 vPercent 的参数，并在 main 方法中使用了起来：使用 rgb 乘以一个类似 alpha 的系数，那么最终的效果就是慢慢变暗，再慢慢变亮。
先定义变量：
```
private int mPercent;
private float[] vPercent = new float[2];
```
然后映射属性：
```
mPercent = GLES20.glGetUniformLocation(mProgram, "vPercent");
```
对 vPercent 进行赋值：
```
vPercent[0] = percent;
```
最终使用到 OpenGl：
```
GLES20.glUniform2fv(mPercent, 1, vPercent, 0);
```
最终实现效果如下：
<video src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/record.mp4" width="640" height="400" controls="controls">
Your browser does not support the video tag.
</video>

## 小结
通过时间戳，控制 surface 的渲染，从而实现分片。同时在绘制 surface 时，结合 OpenGL 的能力，设置透明度，从而实现最简单的转场。分片逻辑好说，比较清晰，无非就是怎么通过时间片段完善代码。但是 OpenGL 的研究真的是熬死人了，它是一个很系统化的知识点，能力也确实强大。但是又没有很宽松的时间从头开始学习，只能边研究边实现功能，很多东西都是囫囵吞枣，一撇而过。不过好在研究出来了，至少最简单的转场功能是实现了。后续若想做更酷炫的转场动画，相信也是能搞出来的！

## 参考
1. [LearnOpenGL](https://learnopengl-cn.github.io/)
2. [OpenGL ES 动效滤镜实现](https://juejin.cn/post/6860755255148969992)
3. [GLTransitions](https://gl-transitions.com/)
4. [Android 视频编辑系列-视频转场(下)](https://www.jianshu.com/p/8b545f195c12)
5. [如何使用Android中的OpenGL ES媒体效果](https://blog.csdn.net/smbroe/article/details/46311997)
6. [OpenGL ES 绘制纹理](https://blog.csdn.net/mengks1987/article/details/104082184)
7. [移动应用中使用OpenGL生成转场特效](https://www.51cto.com/article/719644.html)
8. [OpenGL ES 变量、结构体、语句、函数、精度](https://blog.csdn.net/mengks1987/article/details/104104990)
