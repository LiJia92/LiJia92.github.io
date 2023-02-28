---
title: 关于录屏权限的问题
date: 2023-02-28 15:17:44
tags:
 - 日常开发
---
在[Android 倍速压缩视频时长](http://lastwarmth.win/2023/02/21/video-record/)中，会先录屏然后对视频进行处理，录屏需要通过调用``MediaProjectionManager.createScreenCaptureIntent()``申请权限，这时会弹出系统的权限申请弹窗，用户可以选择同意或者拒绝，同时有不再询问的选项，就像这样：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG519.png)

<!-- more -->

在手机端这样的场景很常见，用户操作成本也比较低，大多数用户会选择同意进行后续流程。但在当前项目场景中，App 是运行在车载平板上的。App 启动后，通过语音指导用户进行教学，当然也有一些交互提供其他的功能。录屏是在练习项目开始的时候发起权限申请，在这个场景下，学员是全神贯注开着车准备练习的，若还需要他看屏幕弹窗去点击授权，这个体验会相当割裂，同时会有一定的安全隐患。

那有没有什么办法可以跳过这个权限申请，或者自动授权呢？
通过一定时间的调研，发现这个权限是跳不过去的，自从 Android 6.0 以来，系统对权限的控制便越发严格、精准，自然是不允许这种不申请权限就使用录屏功能的。否则的话随便一个 App 启动后就开始录屏，用户在干什么全都一目了然。

那么问题便只能聚焦于如何**自动授权**了。如果能模拟用户点击，或许就能实现自动授权了。
最初想到的便是**无障碍服务**，通过无障碍服务可以模拟做一些事情，但是研究后发现：**也需要申请权限，或者手动去设置页面进行设置**，这不是恶性循环了嘛，只能放弃。继续研究模拟点击，发现如下代码可以尝试：
```
Instrumentation ins = new Instrumentation();
ins.sendPointerSync(MotionEvent.obtain(SystemClock.uptimeMillis(),SystemClock.uptimeMillis(), MotionEvent.ACTION_DOWN, 200, 500, 0));
ins.sendPointerSync(MotionEvent.obtain(SystemClock.uptimeMillis(),SystemClock.uptimeMillis(), MotionEvent.ACTION_UP, 200, 500, 0));
```
尝试之后发现两点：
1. 只能在非主线程里调用；
2. 必须拥有系统权限才可以。

第一点好说，第二点，系统权限？若有所思地思考着的时候，旁边同事来了一句：用 Launcher 试试？
因为项目对接车载平板，平板都是由合作供应商生产，同时接入了自己的 Launcher，便于管理。而 Launcher 很自然的就有系统权限。
于是事情就简单了：App 将需要点击的事件封装好，通过广播发送出去。Launcher 接受广播执行点击代码即可。代码很简单：
```
/**
 * 给 launcher 发送模拟点击的事件
 */
class ClickEventModel : Serializable {
    var action: Int = 0
    var x: Float = 0f
    var y: Float = 0f

    constructor()

    constructor(action: Int, x: Float, y: Float) {
        this.action = action
        this.x = x
        this.y = y
    }
}

object LauncherBroadcastSender {

    const val action = "android.launcher.action"

    const val CLICK_EVENT = 1000 // 点击事件

    fun send(eventId: Int, model: Any) {
        val intent = Intent(action)
        intent.putExtra("data", JSON.toJSONString(model))
        intent.putExtra("package", getPackageName())
        intent.putExtra("eventId", eventId)
        MucangConfig.getContext().sendBroadcast(intent)
    }
}
```
通过截屏或者开发者选项-指针位置获取权限申请弹窗中**不再询问**、**立即开始**按钮的坐标，然后执行广播发送：
```
@JvmStatic
fun sendClickBroadCast() {
    MainScope().launch {
        delay(500)
        sendBroadcast(MotionEvent.ACTION_DOWN, 515f, 527f)
        sendBroadcast(MotionEvent.ACTION_UP, 515f, 527f)
        sendBroadcast(MotionEvent.ACTION_DOWN, 1418f, 570f)
        sendBroadcast(MotionEvent.ACTION_UP, 1418f, 570f)
    }
}

private fun sendBroadcast(action: Int, x: Float, y: Float) {
    LauncherBroadcastSender.send(
        LauncherBroadcastSender.CLICK_EVENT,
        ClickEventModel(action, x, y)
    )
}
```
delay(500) 是等着系统弹窗显示出来，不然弹窗还没出来广播就发过去，就是无效点击了。因为是定制平板，按钮的坐标点也是固定的，所以先写死了。Launcher 接受广播执行点击的代码就更简单了，参考上面``sendPointerSync()``片段。
经测试，肉眼几乎看不到权限申请的弹窗了，同时也能拥有权限进行录屏。站在 Launcher 的肩膀上，实现了“**不可能实现的任务**”。

## 题外话
``MediaProjectionManager.createScreenCaptureIntent()``方法是返回一个 Intent，然后通过 startActivityForResult 的方式进行调用，那么就会涉及到 Activity 的页面切换。若当前页面有 onResume、onPause 的处理逻辑，得考虑一下 Activity 切换可能导致的异常。
```
/**
 * Returns an Intent that <b>must</b> be passed to startActivityForResult()
 * in order to start screen capture. The activity will prompt
 * the user whether to allow screen capture.  The result of this
 * activity should be passed to getMediaProjection.
 */
public Intent createScreenCaptureIntent() {
    Intent i = new Intent();
    final ComponentName mediaProjectionPermissionDialogComponent =
            ComponentName.unflattenFromString(mContext.getResources().getString(
                    com.android.internal.R.string
                    .config_mediaProjectionPermissionDialogComponent));
    i.setComponent(mediaProjectionPermissionDialogComponent);
    return i;
}
```
这个权限申请的 Activity 是 MediaProjectionPermissionActivity。通过如下代码设置权限的：
```
private Intent getMediaProjectionIntent(int uid, String packageName)
        throws RemoteException {
    IMediaProjection projection = mService.createProjection(uid, packageName,
             MediaProjectionManager.TYPE_SCREEN_CAPTURE, false /* permanentGrant */);
    Intent intent = new Intent();
    intent.putExtra(MediaProjectionManager.EXTRA_MEDIA_PROJECTION, projection.asBinder());
    return intent;
}
```
所以其实返回的就是一个 intent，通过这个 intent 获取 MediaProjection。
在 stackoverflow 上，有针对 intent 进行 clone 保存的，这样当用户没有勾选“不再询问”时，也可以通过这个 intent 跳过权限申请，实现录屏功能。可以参考[How do I get MediaProjectionManager without disturbing the current foreground process, except to ask for permission?](https://stackoverflow.com/questions/33398211/how-do-i-get-mediaprojectionmanager-without-disturbing-the-current-foreground-pr)
