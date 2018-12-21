---
title: 无声视频合成音频
date: 2018-11-23 10:02:03
tags:
 - 日常开发
---
上篇文章，通过 MediaProjectionManager 结合 MediaRecorder 进行录屏并生成视频文件。新版本需求产品提了个：视频增加背景音乐，音频文件内置在 Apk 中。那么，怎么生成带音频的视频呢？
通过调研发现，在用 MediaPlayer 进行录屏时，可以添加音频源，但是基本是使用麦克风录音，无法指定音频文件。代码如下：
```
/**
 * 初始化 MediaRecorder
 */
@RequiresApi(Build.VERSION_CODES.LOLLIPOP)
private fun initRecorder() {
    mSaveFile = File(DirUtils.getPublicMediaPath(), "$saveName.tmp")
    if (mSaveFile!!.exists()) {
        mSaveFile!!.delete()
    }
    mMediaRecorder = MediaRecorder()
    mMediaRecorder?.setVideoSource(MediaRecorder.VideoSource.SURFACE)
    // 使用麦克风录音
    mMediaRecorder?.setAudioSource(MediaRecorder.AudioSource.MIC)
    mMediaRecorder?.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
    mMediaRecorder?.setOutputFile(mSaveFile!!.absolutePath)
    mMediaRecorder?.setVideoSize(mVideoWidth, mVideoHeight)
    mMediaRecorder?.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
    mMediaRecorder?.setVideoEncodingBitRate(VIDEO_BIT_RATE)
    mMediaRecorder?.setVideoFrameRate(VIDEO_FRAME_RATE)
    try {
        mMediaRecorder?.prepare()
    } catch (e: IOException) {
        LogUtils.e(TAG, e.toString())
    }
}	
```

<!-- more -->

使用此种方案，通过代码``mMediaRecorder?.setAudioSource(MediaRecorder.AudioSource.MIC)``指定麦克风音频源。可以在录屏开始时，使用 MediaPlayer 进行音乐播放，那么麦克风就可以录入音频了，可是如果此时背景很嘈杂，或者有人说话也会给录进去，需求是只能包含音频文件里的音频，不能有其他的声音，所以此种方案不可行。
所以换个思路：将无声视频与音频进行合成，生成一个有声视频。
调研了一波，发现了可用的代码，整理如下：
```
/**
 * 无声视频添加音频
 * 参考代码：https://stackoverflow.com/questions/31572067/android-how-to-mux-audio-file-and-video-file
 *
 * audioTrack 的 mime type 只支持：
 * MediaFormat.MIMETYPE_AUDIO_AMR_NB,
 * MediaFormat.MIMETYPE_AUDIO_AMR_WB,
 * MediaFormat.MIMETYPE_AUDIO_AAC
 */
private fun muxing(musicName: String) {
    val saveFile = File(DirUtils.getPublicMediaPath(), "$saveName.mp4")
    if (saveFile.exists()) {
        saveFile.delete()
    }
    try {
        saveFile.createNewFile()

        val videoExtractor = MediaExtractor()
        videoExtractor.setDataSource(mSaveFile!!.absolutePath)

        val audioExtractor = MediaExtractor()
        val afdd = MucangConfig.getContext().assets.openFd(musicName)
        audioExtractor.setDataSource(afdd.fileDescriptor, afdd.startOffset, afdd.length)

        val muxer = MediaMuxer(saveFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

        videoExtractor.selectTrack(0)
        val videoFormat = videoExtractor.getTrackFormat(0)
        val videoTrack = muxer.addTrack(videoFormat)

        audioExtractor.selectTrack(0)
        val audioFormat = audioExtractor.getTrackFormat(0)
        val audioTrack = muxer.addTrack(audioFormat)

        var sawEOS = false
        var frameCount = 0
        val offset = 100
        val sampleSize = 1000 * 1024
        val videoBuf = ByteBuffer.allocate(sampleSize)
        val audioBuf = ByteBuffer.allocate(sampleSize)
        val videoBufferInfo = MediaCodec.BufferInfo()
        val audioBufferInfo = MediaCodec.BufferInfo()

        videoExtractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
        audioExtractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

        muxer.start()

        // 每秒多少帧
        val frameRate = videoFormat.getInteger(MediaFormat.KEY_FRAME_RATE)
        // 得出平均每一帧间隔多少微妙
        val videoSampleTime = 1000 * 1000 / frameRate

        while (!sawEOS) {
            videoBufferInfo.offset = offset
            videoBufferInfo.size = videoExtractor.readSampleData(videoBuf, offset)

            if (videoBufferInfo.size < 0) {
                sawEOS = true
                videoBufferInfo.size = 0

            } else {
                videoBufferInfo.presentationTimeUs += videoSampleTime
                videoBufferInfo.flags = videoExtractor.sampleFlags
                muxer.writeSampleData(videoTrack, videoBuf, videoBufferInfo)
                videoExtractor.advance()
                frameCount++
            }
        }

        var sawEOS2 = false
        var frameCount2 = 0
        while (!sawEOS2) {
            frameCount2++

            audioBufferInfo.offset = offset
            audioBufferInfo.size = audioExtractor.readSampleData(audioBuf, offset)

            if (audioBufferInfo.size < 0) {
                sawEOS2 = true
                audioBufferInfo.size = 0
            } else {
                audioBufferInfo.presentationTimeUs = audioExtractor.sampleTime
                audioBufferInfo.flags = audioExtractor.sampleFlags
                muxer.writeSampleData(audioTrack, audioBuf, audioBufferInfo)
                audioExtractor.advance()
            }
        }

        muxer.stop()
        muxer.release()
        videoExtractor.release()
        audioExtractor.release()
        afdd.close()

        // 删除无声视频文件
        mSaveFile?.delete()

    } catch (e: Exception) {

        LogUtils.e(TAG, "Mixer Error:" + e.message)
        // 视频添加音频合成失败，直接保存视频
        mSaveFile?.renameTo(saveFile)

    } finally {
        MainThreadUtils.post {
            listener?.finishRecord()

            if (mSaveFile != null) {
                val intent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                intent.data = Uri.fromFile(saveFile)
                MucangConfig.getContext().sendBroadcast(intent)
                ToastUtils.toast("已保存到相册")
            }

            mSaveFile = null
        }
    }
}
```
注意代码中的**videoSampleTime**，如果不加这个，代码在部分机型上会合成失败。
> 这里重点关注下
bufferInfo.presentationTimeUs = mediaExtractor.getSampleTime()
因为mediaExtractor的提取顺序应该是dts的顺序不是pts的顺序，如果视频中存在b帧则getSampleTime不可能递增的，所以bufferInfo.presentationTimeUs=mediaExtractor.getSampleTime()可能会报错，前面说了这个值必须递增。如果不存在b帧，pts==dts，使用没问题。

参考：
1. [android - How to mux audio file and video file?](https://stackoverflow.com/questions/31572067/android-how-to-mux-audio-file-and-video-file)
2. [MediaMuxer和MediaExtractor](https://blog.csdn.net/u012098794/article/details/55511623)