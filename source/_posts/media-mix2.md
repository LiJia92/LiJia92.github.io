---
title: 无声视频合成音频（续）
date: 2019-09-19 16:30:39
tags:
 - 日常开发
---
之前有一个音视频合成的需求，还写了一篇文章[无声视频合成音频](http://lastwarmth.win/2018/11/23/media-mix/)。之前的需求是，视频整体时间控制在 10s（便于发布到朋友圈），现在朋友圈的限制改为 15s 了，所以产品决定不再限制视频的时长为 10s 了，改为最长 40s，若有发布到朋友圈的需求，则自己裁剪。大部分情况下，生成的视频长度会小于 15s，也不需要裁剪。需求调整后，之前文章里的音视频合成的方案就需要略作修改了。

说下之前的方案：利用录屏生成 10s 的无声视频，与正好 10s 的音频 aac 文件进行合成。之前的代码最终生成的文件长度为音视频文件的最大值（若视频为 10s，音频为 15s，则会生成 15s 的视频，视频最后 5s 一直展示视频的最后一帧，同时播放音乐）。现在调整视频时长后，产品定的需求是视频时长增加，然后音频循环播放。所以可能就是 24s 的无声视频合成 10s 的音频。所以之前的代码就得调整了：

<!-- more -->

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
private fun muxing(musicName: String, showToast: Boolean = true) {
    val saveFile = File(DirUtils.getPublicMediaPath(), "$saveName.mp4")
    if (saveFile.exists()) {
        saveFile.delete()
        PhotoHelper.sendMediaScannerBroadcast(saveFile)
    }
    try {
        val duration = getVideoDuration(mSaveFile!!.absolutePath)

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
            }
        }

        var sawEOS2 = false
        var sampleTime = 0L
        while (!sawEOS2) {

            audioBufferInfo.offset = offset
            audioBufferInfo.size = audioExtractor.readSampleData(audioBuf, offset)

            // 判断如果写满时长，则直接返回
            if (audioBufferInfo.presentationTimeUs >= duration) {
                sawEOS2 = true
                audioBufferInfo.size = 0
            } else {
            	// 判断没有写满时长，且已经写完当前 Track，则重置到开始状态，同时累加 presentationTimeUs
                if (audioBufferInfo.size < 0) {
                    sampleTime = audioBufferInfo.presentationTimeUs
                    audioExtractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
                    continue
                }
            }
            audioBufferInfo.presentationTimeUs = audioExtractor.sampleTime + sampleTime
            audioBufferInfo.flags = audioExtractor.sampleFlags
            muxer.writeSampleData(audioTrack, audioBuf, audioBufferInfo)
            audioExtractor.advance()
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
            if (activity.isDestroyed) {
                return@post
            }
            if (mSaveFile != null) {

                if (needInsertMediaDB) {
                    PhotoHelper.sendMediaScannerBroadcast(saveFile)
                }

                if (showToast) {
                    ToastUtils.toast("已保存到相册")
                }
            }

            listener?.finishRecord(saveFile.absolutePath)

            mSaveFile = null
        }
    }
}

/**
 * 获取视频的时长，微秒
 */
private fun getVideoDuration(videoPath: String): Long {
    val mmr = MediaMetadataRetriever()
    try {
        mmr.setDataSource(videoPath)
        return java.lang.Long.parseLong(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)) * 1000L
    } catch (e: Exception) {
        LogUtils.e(TAG, e.toString())
    } finally {
        try {
            mmr.release()
        } catch (e: Throwable) {
            LogUtils.e(TAG, e.toString())
        }
    }

    return 0L
}
```
整体思路是这样的：先获取无声视频的长度，假设为 24s，然后 muxer.writeSampleData 写入所有的 videoTrack 数据，然后开始写入 audioTrack 的数据。当写完 10s 后，audioTrack 便结束了，但是此时才写入 10s，不足 24s，所以重新 seek 到初始位置，再继续写入。写到 20s 后，再写入 4s，判断满足视频时长 24s 了，则直接退出。
需要多说一下的是：生成视频的音频轨道 audioExtractor 获取到的 presentationTimeUs 正好就是音频播放的长度，而视频轨道由于有关键帧、非关键帧导致 videoExtractor presentationTimeUs 只能是递增，但却不能保证是播放长度。所以在写入音频数据时，可以根据 presentationTimeUs 来判断当前写入了多少秒，若已经达到视频长度，则可以直接退出，从而保证写入音频的时长与视频的时长是一致的。另外，当 audioExtractor 读完后，返回的 size 为 -1，判断此时时长不足，则直接 seek 到初始位置，同时需要累加 presentationTimeUs，所以代码里用到了 sampleTime 来记录 presentationTimeUs 的值。**muxer.writeSampleData 时 presentationTimeUs 必须是递增的**。

在 stackoverflow 上也搜到了同样的问题 [How to mux (merge) video&audio, so that the audio will loop in the output video in case it's too short in duration?](https://stackoverflow.com/questions/54769976/how-to-mux-merge-videoaudio-so-that-the-audio-will-loop-in-the-output-video/58004741#58004741)，但是没有回答，于是舔着脸强行回答了一波，欢迎来点赞~