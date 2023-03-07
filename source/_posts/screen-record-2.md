---
title: 录屏权限 clone 使用
date: 2023-03-07 15:55:21
tags:
 - 日常开发
---
在[关于录屏权限的问题](http://lastwarmth.win/2023/02/28/screen-record-1/)一文中，通过与 Launcher 的结合，实现了权限无感自动申请的功能。这没过几天，就有反馈说有问题：**开始录屏的时候会有权限申请弹窗一闪而过**。
最初怀疑是平板性能差，会打开一个 activity，然后马上消失，由于性能问题导致这样的“一闪而过”。但研究下来发现这个怀疑不成立。通过调试知道了``MediaProjectionManager.createScreenCaptureIntent()``返回的 intent 对应的 activity 是 MediaProjectionPermissionActivity。于是查看其代码，在 onCreate 方法中有这样的片段：

<!-- more -->

```
try {
    if (mService.hasProjectionPermission(mUid, mPackageName)) {
        setResult(RESULT_OK, getMediaProjectionIntent(mUid, mPackageName));
        finish();
        return;
    }
} catch (RemoteException e) {
    Log.e(TAG, "Error checking projection permissions", e);
    finish();
    return;
}
```
即如果有权限，则直接设置 RESULT_OK 并且 finish 掉。
如果没权限，则走到下面了：
```
View dialogTitleView = View.inflate(this, R.layout.media_projection_dialog_title, null);
TextView titleText = (TextView) dialogTitleView.findViewById(R.id.dialog_title);
titleText.setText(dialogTitle);

mDialog = new AlertDialog.Builder(this)
        .setCustomTitle(dialogTitleView)
        .setMessage(dialogText)
        .setPositiveButton(R.string.media_projection_action_text, this)
        .setNegativeButton(android.R.string.cancel, this)
        .setOnCancelListener(this)
        .create();

mDialog.create();
mDialog.getButton(DialogInterface.BUTTON_POSITIVE).setFilterTouchesWhenObscured(true);

final Window w = mDialog.getWindow();
w.setType(WindowManager.LayoutParams.TYPE_SYSTEM_ALERT);
w.addSystemFlags(SYSTEM_FLAG_HIDE_NON_SYSTEM_OVERLAY_WINDOWS);

mDialog.show();
```
会展示一个弹窗，这个弹窗便是权限申请的弹窗。并且这个弹窗默认是**可以外部点击消失**的。
所以这个逻辑便是这样的：如果有权限则直接返回结果，是不会弹窗的。如果弹窗了，则一定是判断没权限。
那为什么这个弹窗出来后马上就消失了？起初怀疑发送模拟点击坐标不对，导致点到了外面的部分，弹窗便消失了。可后面检查代码，压根就没有发送模拟点击的广播（只会在启屏的时候发送一次广播，真正录制的时候不会发送）。可这个弹窗为什么就消失了呢？
排查了很久也没找到原因，而且办公室无法复现，这就很尴尬了，可问题还是需要解决的。
由上面的分析可知，肯定是打开了权限申请的 activity 才会导致弹窗展示出来。那如果我不申请权限了呢？利用上文末尾说到的 clone 的方式。于是改造了一下代码，在启屏页申请权限，然后将 intent 保存起来，真正要录屏时再使用 clone 方法重新生成一个 intent 传入进去。
```
public void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (resultCode == Activity.RESULT_OK) {
        Manager.setMediaProjectionCloneData(data);
    }
}

fun startRecord() {
    if (Manager.mediaProjectionCloneData == null) {
        // 正常申请权限...
    } else {
        realStart(Manager.mediaProjectionCloneData!!.clone() as Intent)
    }
}

private fun realStart(data: Intent) {
    mp?.stop()
    mp = mediaProjectionManager!!.getMediaProjection(Activity.RESULT_OK, data)
    virtualDisplay = mp?.createVirtualDisplay(
        "ScreenCapture", videoWidth, videoHeight, metrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, mediaRecorder?.surface, null, null
    )
    mediaRecorder?.start()
}
```
注意每次 mp 的创建，使用完之后一定要注意调用 stop 方法，不然下次再使用时会导致崩溃：
```
java.lang.IllegalStateException: Cannot start already started MediaProjection
    at android.os.Parcel.readException(Parcel.java:1692)
    at android.os.Parcel.readException(Parcel.java:1637)
    at android.media.projection.IMediaProjection$Stub$Proxy.start(IMediaProjection.java:140)
    at android.media.projection.MediaProjection.<init>(MediaProjection.java:59)
    at android.media.projection.MediaProjectionManager.getMediaProjection(MediaProjectionManager.java:102)
```
字面意思很明显了，所以用完一定要记得 stop，下次才能继续 clone 进行使用。这种方式需要至少同意一次录屏权限，如果没有 Launcher 的帮助，做不到自动授权的情况下，在 App 启动的时候只申请一次问题应该也不大，后续使用就利用 clone 的方式即可。
