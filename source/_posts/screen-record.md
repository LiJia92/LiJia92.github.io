---
title: 录制仿 Keep 轨迹动画视频
date: 2018-10-18 17:01:32
tags:
 - 日常开发
---
最近 Keep 更新了一个轨迹动画的分享，可以生成一个看起来高大上的视频。项目产品也提出了一样的需求，便参照着实现了一波。效果如下（虚拟机跑动画就已经很卡了，然后还要录 gif 就更卡了，凑合看~）：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/trackAnimation.gif)

<!-- more -->

整体思路就是：
1. Android 原生播放动画（基于高德地图实现）
2. 录制屏幕生成视频

播放动画无非就是一次画一条线，连起来就像一个点一直在往前面爬的效果了。然后请求录制屏幕，输出到一个文件，最后保存为视频即可。
Android 录屏核心思路是使用系统 Api MediaProjectionManager，需要 Android 5.0 以上才可以使用。鉴于目前市场 Android 5.0 的手机已经很少了，所以便直接使用 MediaProjectionManager 了。
使用步骤：
1. mMediaProjectionManager.createScreenCaptureIntent() 申请录屏权限（因为要保存文件所以需要申请 WRITE_EXTERNAL_STORAGE 权限）
2. 用户同意之后，初始化 VirtualDisplay
3. 创建 MediaRecorder，设置好相关参数，核心设置视频源为 SURFACE： setVideoSource(MediaRecorder.VideoSource.SURFACE)
4. 录制结束后释放资源，保存文件

具体代码如下：
```
/**
 * 录屏帮助类，仅限 Android 5.0 及以上使用
 */
class ScreenRecorder(val activity: Activity, val listener: VideoRecordListener?, private val saveName: String) {

    private val REQUEST_MEDIA_PROJECTION_CODE = 1000

    /**
     * 录制视频的分辨率、比特率、帧率
     */
    private var mVideoWidth: Int
    private var mVideoHeight: Int
    private val VIDEO_BIT_RATE = 12 * 1024 * 1024
    private val VIDEO_FRAME_RATE = 60

    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private var mMediaProjectionManager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager

    private var mMediaRecorder: MediaRecorder? = null
    private var mVirtualDisplay: VirtualDisplay? = null
    private var mMetrics = DisplayMetrics()
    private var mSaveFile: File? = null

    init {
        activity.windowManager.defaultDisplay.getMetrics(mMetrics)
        mVideoWidth = mMetrics.widthPixels
        mVideoHeight = mMetrics.heightPixels
    }

    /**
     * 开始录制
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    fun startRecord() {
        PermissionUtils.requestPermissions(activity, PermissionsCallback {
            if (it.grantedAll) {
                listener?.beforeRecord()

                StartForResult.from(activity).startForResult(mMediaProjectionManager!!.createScreenCaptureIntent(),
                        REQUEST_MEDIA_PROJECTION_CODE) { requestCode, resultCode, data ->

                    if (requestCode == REQUEST_MEDIA_PROJECTION_CODE && resultCode == Activity.RESULT_OK) {
                        initRecorder()

                        MainThreadUtils.postDelayed({
                            val mp = mMediaProjectionManager!!.getMediaProjection(resultCode, data)
                            mVirtualDisplay = mp.createVirtualDisplay("ScreenCapture", mVideoWidth, mVideoHeight, mMetrics.densityDpi,
                                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, mMediaRecorder?.surface, null, null)
                            mMediaRecorder?.start()

                            listener?.startRecord()
                        }, 300)
                    } else {
                        listener?.cancelRecord()
                    }
                }
            } else {
                ToastUtils.toast("录屏需要写存储权限")
            }
        }, Manifest.permission.WRITE_EXTERNAL_STORAGE)
    }

    /**
     * 录制中断，删除视频文件
     */
    fun interruptRecord() {
        releaseRecorder()
        if (mSaveFile != null) {
            ToastUtils.toast("视频保存失败")
        }
        mSaveFile?.delete()
        mSaveFile = null
    }

    /**
     * 结束录制
     */
    fun finishRecord() {
        releaseRecorder()
        if (mSaveFile != null) {

            val newFile = File(DirUtils.getPublicMediaPath(), "$saveName.mp4")

            // 录制结束后修改后缀为 mp4
            mSaveFile!!.renameTo(newFile)

            val intent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
            intent.data = Uri.fromFile(newFile)
            MucangConfig.getContext().sendBroadcast(intent)

            ToastUtils.toast("已保存到相册")
        }
        mSaveFile = null
    }

    /**
     * 释放资源
     */
    private fun releaseRecorder() {
        mMediaRecorder?.stop()
        mMediaRecorder?.release()
        mMediaRecorder = null

        mVirtualDisplay?.release()
        mVirtualDisplay = null
    }

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
        mMediaRecorder?.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        mMediaRecorder?.setOutputFile(mSaveFile!!.absolutePath)
        mMediaRecorder?.setVideoSize(mVideoWidth, mVideoHeight)
        mMediaRecorder?.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
        mMediaRecorder?.setVideoEncodingBitRate(VIDEO_BIT_RATE)
        mMediaRecorder?.setVideoFrameRate(VIDEO_FRAME_RATE)
        try {
            mMediaRecorder?.prepare()
        } catch (e: IOException) {
            LogUtils.e("ScreenRecorder", e.toString())
        }
    }

    interface VideoRecordListener {
        /**
         * 录制开始时隐藏不必要的UI
         */
        fun beforeRecord()

        /**
         * 开始录制
         */
        fun startRecord()

        /**
         * 取消录制
         */
        fun cancelRecord()
    }
}
```