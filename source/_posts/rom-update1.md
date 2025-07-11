---
title: Android Launcher 升级 Rom - 续
date: 2025-07-11 16:07:30
tags:
 - 日常开发
---
[上篇文章](https://lastwarmth.win/2025/06/27/rom-update/)记录了通过 Rom 自带的固件升级功能，结合无障碍服务进行自动点击，来实现了 Rom 的自动升级。OTA 包下载完成后，若要更新，需要重启一次设备。无障碍自动点击，也会出现弹窗一闪而过的异象。另外放置在存储卡根目录的 update.zip 不太好管理，比如有多个版本的 Rom 升级等等。于是研究了 Rom 的相关源码，终于有所收获，记录一下优化方案。

<!-- more -->

在上文中，我抓到升级弹窗的包名为``android.rockchip.update.service``，于是搜索对应包名下面的类，结果令我大跌眼镜：没有任何结果。继续搜索``android.rockchip.update.service/android.rockchip.update.service.NotifyDeleteActivity``，也是没有任何结果。这就非常奇怪了，我已经下载了刷机用的 Android 系统源码了，为什么搜不到相关类呢？后面看到源码工程里，还有许多的 jar 包文件，可能就在这些 jar 包中了吧？
工程实在是太大了，50G 的空间都不够，给我电脑磁盘都干满了，申请了更换更大空间的电脑，才能继续研究。这也算是第一次完整接触一个 Android 系统源码，研究起来还是挺费劲的。还好我的目的很清晰：**找到系统 OTA 升级的代码。**
弹窗入口无法查找，就只能找可能的相关类了。于是搜索``RecoverySystem.installPackage``，此方法虽然在上文中使用失败，但是仍然可以作为一个入口进行尝试。果然找到一个类：``NonAbUpdateInstaller``。代码如下：
```
package com.android.server.devicepolicy;

import android.app.admin.DevicePolicyManager.InstallSystemUpdateCallback;
import android.app.admin.StartInstallingUpdateCallback;
import android.content.Context;
import android.os.ParcelFileDescriptor;
import android.os.RecoverySystem;
import android.util.Log;

import java.io.IOException;

/**
 * Used for installing an update for <a href="https://source.android.com/devices/tech/ota/nonab">non
 * AB</a> devices.
 */
class NonAbUpdateInstaller extends UpdateInstaller {
    NonAbUpdateInstaller(Context context,
            ParcelFileDescriptor updateFileDescriptor,
            StartInstallingUpdateCallback callback, DevicePolicyManagerService.Injector injector,
            DevicePolicyConstants constants) {
        super(context, updateFileDescriptor, callback, injector, constants);
    }

    @Override
    public void installUpdateInThread() {
        try {
            RecoverySystem.installPackage(mContext, mCopiedUpdateFile);
            notifyCallbackOnSuccess();
        } catch (IOException e) {
            Log.w(TAG, "IO error while trying to install non AB update.", e);
            notifyCallbackOnError(
                    InstallSystemUpdateCallback.UPDATE_ERROR_UNKNOWN,
                    Log.getStackTraceString(e));
        }
    }
}
```
继承自``UpdateInstaller``，代码如下：
```
package com.android.server.devicepolicy;

import android.annotation.Nullable;
import android.app.admin.DevicePolicyEventLogger;
import android.app.admin.DevicePolicyManager.InstallSystemUpdateCallback;
import android.app.admin.StartInstallingUpdateCallback;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Environment;
import android.os.FileUtils;
import android.os.ParcelFileDescriptor;
import android.os.PowerManager;
import android.os.Process;
import android.os.RemoteException;
import android.stats.devicepolicy.DevicePolicyEnums;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

abstract class UpdateInstaller {
    private StartInstallingUpdateCallback mCallback;
    private ParcelFileDescriptor mUpdateFileDescriptor;
    private DevicePolicyConstants mConstants;
    protected Context mContext;

    @Nullable protected File mCopiedUpdateFile;

    static final String TAG = "UpdateInstaller";
    private DevicePolicyManagerService.Injector mInjector;

    protected UpdateInstaller(Context context, ParcelFileDescriptor updateFileDescriptor,
            StartInstallingUpdateCallback callback, DevicePolicyManagerService.Injector injector,
            DevicePolicyConstants constants) {
        mContext = context;
        mCallback = callback;
        mUpdateFileDescriptor = updateFileDescriptor;
        mInjector = injector;
        mConstants = constants;
    }

    public abstract void installUpdateInThread();

    public void startInstallUpdate() {
        mCopiedUpdateFile = null;
        if (!isBatteryLevelSufficient()) {
            notifyCallbackOnError(
                    InstallSystemUpdateCallback.UPDATE_ERROR_BATTERY_LOW,
                    "The battery level must be above "
                            + mConstants.BATTERY_THRESHOLD_NOT_CHARGING + " while not charging or "
                            + "above " + mConstants.BATTERY_THRESHOLD_CHARGING + " while charging");
            return;
        }
        Thread thread = new Thread(() -> {
            mCopiedUpdateFile = copyUpdateFileToDataOtaPackageDir();
            if (mCopiedUpdateFile == null) {
                notifyCallbackOnError(
                        InstallSystemUpdateCallback.UPDATE_ERROR_UNKNOWN,
                        "Error while copying file.");
                return;
            }
            installUpdateInThread();
        });
        thread.setPriority(Process.THREAD_PRIORITY_BACKGROUND);
        thread.start();
    }

    private boolean isBatteryLevelSufficient() {
        Intent batteryStatus = mContext.registerReceiver(
                /* receiver= */ null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        float batteryPercentage = calculateBatteryPercentage(batteryStatus);
        boolean isBatteryPluggedIn =
                batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, /* defaultValue= */ -1) > 0;
        return isBatteryPluggedIn
                ? batteryPercentage >= mConstants.BATTERY_THRESHOLD_CHARGING
                : batteryPercentage >= mConstants.BATTERY_THRESHOLD_NOT_CHARGING;
    }

    private float calculateBatteryPercentage(Intent batteryStatus) {
        int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, /* defaultValue= */ -1);
        int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, /* defaultValue= */ -1);
        return 100 * level / (float) scale;
    }

    private File copyUpdateFileToDataOtaPackageDir() {
        try {
            File destination = createNewFileWithPermissions();
            copyToFile(destination);
            return destination;
        } catch (IOException e) {
            Log.w(TAG, "Failed to copy update file to OTA directory", e);
            notifyCallbackOnError(
                    InstallSystemUpdateCallback.UPDATE_ERROR_UNKNOWN,
                    Log.getStackTraceString(e));
            return null;
        }
    }

    private File createNewFileWithPermissions() throws IOException {
        File destination = File.createTempFile(
                "update", ".zip", new File(Environment.getDataDirectory() + "/ota_package"));
        FileUtils.setPermissions(
                /* path= */ destination,
                /* mode= */ FileUtils.S_IRWXU | FileUtils.S_IRGRP | FileUtils.S_IROTH,
                /* uid= */ -1, /* gid= */ -1);
        return destination;
    }

    private void copyToFile(File destination) throws IOException {
        try (OutputStream out = new FileOutputStream(destination);
             InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(
                     mUpdateFileDescriptor)) {
            FileUtils.copy(in, out);
        }
    }

    void cleanupUpdateFile() {
        if (mCopiedUpdateFile != null && mCopiedUpdateFile.exists()) {
            mCopiedUpdateFile.delete();
        }
    }

    protected void notifyCallbackOnError(int errorCode, String errorMessage) {
        cleanupUpdateFile();
        DevicePolicyEventLogger
                .createEvent(DevicePolicyEnums.INSTALL_SYSTEM_UPDATE_ERROR)
                .setInt(errorCode)
                .write();
        try {
            mCallback.onStartInstallingUpdateError(errorCode, errorMessage);
        } catch (RemoteException e) {
            Log.d(TAG, "Error while calling callback", e);
        }
    }

    protected void notifyCallbackOnSuccess() {
        cleanupUpdateFile();
        mInjector.powerManagerReboot(PowerManager.REBOOT_REQUESTED_BY_DEVICE_OWNER);
    }
}
```
可以看到代码非常简单：将 OTA 文件拷贝到 **/data/ota_package** 目录下，通过``File.createTempFile``生成一个 updateXXXXXX.zip 的临时文件，然后调用``RecoverySystem.installPackage``传入这个临时文件，就可以进行 OTA 升级了。
于是我也按照这个方案，重新改写了 RomUpdater 类，如下：
```
object RomUpdater {
    private const val TAG = "RomUpdater"
    private const val SP_KEY = "RomVersion"
    private const val S_IRWXU: Int = 448
    private const val S_IRGRP: Int = 32
    private const val S_IROTH: Int = 4

    /**
     * 应用 ROM 更新
     * @param context 上下文对象
     * @param updateFile 更新包文件（需确保路径可被 Recovery 访问）
     * @param versionCode 服务器返回的版本号
     */
    @SuppressLint("MissingPermission")
    fun applyUpdate(context: Context, updateFile: File, versionCode: Int) {
        Config.execute {
            kotlin.runCatching {
                // 1. 检测本地是否存在文件，存在则弹窗升级
                val model = getOTAModel(context)
                val localVersion = AppUtil.getRomVersion()
                if (localVersion != null && model != null && localVersion < model.versionCode) {
                    showInstallDialog(context, updateFile)
                    return@execute
                }

                // 2. 不存在校验更新包签名
                if (!verifySignature(updateFile)) {
                    throw Exception("更新包签名校验失败，${versionCode}")
                }

                // 3. 比较版本号，通过后拷贝文件，写入 SP
                val updateVersion = AppUtil.parseOtaPackage(updateFile.absolutePath)
                if (updateVersion != null && updateVersion == versionCode && localVersion != null && updateVersion > localVersion) {
                    val file = createNewFileWithPermissions()
                    FileUtils.copyFile(updateFile, file)
                    val text = JSON.toJSONString(OTAModel().apply {
                        this.versionCode = versionCode
                        this.path = file.absolutePath
                    })
                    SPUtils.putString(SP_KEY, text, context)
                    LogUtils.e(TAG, "设置本地路径，${text}")
                } else {
                    throw Exception("更新包版本号不匹配，realVersion=${updateVersion}，serverVersion=${versionCode}，localVersion=${localVersion}")
                }

                // 4. 弹窗提示升级
                showInstallDialog(context, updateFile)
            }.onFailure {
                LogUtils.e(TAG, "applyUpdate fail:" + it.message)
                clear(context, updateFile)
            }
        }
    }

    /**
     * 清除本地文件
     */
    fun clear(context: Context, updateFile: File?) {
        if (updateFile != null) {
            FileUtils.deleteFile(updateFile)
        }
        val model = getOTAModel(context) ?: return
        FileUtils.deleteFile(File(model.path))
        SPUtils.putString(SP_KEY, null, context)
    }

    @SuppressLint("MissingPermission")
    private fun showInstallDialog(context: Context, updateFile: File?) {
        MainThreadUtils.post {
            AlertDialog.Builder(Config.getCurrentActivity())
                .setTitle("系统升级")
                .setMessage("检测到系统升级，是否需要立即安装更新？")
                .setPositiveButton("立即安装") { _, _ ->
                    kotlin.runCatching {
                        val model = getOTAModel(context)
                        if (model != null) {
                            val file = File(model.path)
                            if (file.exists() && file.length() > 0) {
                                RecoverySystem.installPackage(context, file)
                            }
                        } else {
                            throw Exception("本地文件缺失")
                        }
                    }.onFailure {
                        LogUtils.e(TAG, "install fail:" + it.message)
                        clear(context, updateFile)
                    }
                }
                .setNegativeButton("下次再说", null)
                .create()
                .show()
        }
    }

    /**
     * 升级包放到根目录 update.zip 地址
     */
    fun getUpdateZipPath(): String {
        return "/${Environment.getExternalStorageDirectory().path}/update.zip"
    }

    /**
     * 删除 zip 地址
     */
    fun deleteZipFile() {
        File(getUpdateZipPath()).delete()
    }

    /**
     * 对比版本
     */
    fun checkRomUpdate(context: Context) {
        // 旧方案文件删除
        deleteZipFile()
        // 对比版本，若无需更新，将本地文件清除
        val romVersion = AppUtil.getRomVersion()
        val model = getOTAModel(context)
        if (romVersion == null || model == null || romVersion >= model.versionCode) {
            clear(context, null)
        }
    }

    /**
     * 校验更新包签名（简化版）
     * 实际开发中应使用设备厂商的公钥验证
     */
    private fun verifySignature(file: File): Boolean {
        return try {
            // 实际应替换为厂商公钥验证
            RecoverySystem.verifyPackage(file, null, null)
            true
        } catch (e: GeneralSecurityException) {
            LogUtils.e(TAG, "验证签名报错1:" + e.message)
            false
        } catch (e: IOException) {
            LogUtils.e(TAG, "验证签名报错2:" + e.message)
            false
        }
    }

    /**
     * 创建 ota 升级包 File
     */
    private fun createNewFileWithPermissions(): File {
        val destination = File.createTempFile(
            "update", ".zip", File(Environment.getDataDirectory().toString() + "/ota_package")
        )
        setPermissions( /* path= */
            destination.absolutePath,  /* mode= */
            S_IRWXU or S_IRGRP or S_IROTH,  /* uid= */
            -1,  /* gid= */-1
        )
        return destination
    }

    /**
     * 给权限
     */
    private fun setPermissions(path: String, mode: Int, uid: Int, gid: Int): Int {
        try {
            Os.chmod(path, mode)
        } catch (e: ErrnoException) {
            LogUtils.e(TAG, "Failed to chmod($path): $e")
            return e.errno
        }

        if (uid >= 0 || gid >= 0) {
            try {
                Os.chown(path, uid, gid)
            } catch (e: ErrnoException) {
                LogUtils.e(TAG, "Failed to chown($path): $e")
                return e.errno
            }
        }

        return 0
    }

    private fun getOTAModel(context: Context): OTAModel? {
        return JSON.parseObject(SPUtils.getString(SP_KEY, null, context), OTAModel::class.java)
    }

    class OTAModel : Serializable {
        var versionCode: Int = 0
        var path: String? = null
    }
}
```
我将代码拷贝过来，然后把 OTA 文件复制到这个 File 中，最后调用``RecoverySystem.installPackage``，竟然真的升级成功了！敢情这个方法若要能成功进行升级，还必须将 OTA 文件放到 **/data/ota_package** 目录下。
后面为了方便管理，我尝试在此目录下，通过 new File 的形式，传入固定的文件名，比如 update20250711.zip 这样，但是调试的时候发现文件拷贝的时候，每次只有 4096 个字节就停止了，导致进行升级时，出现错误。而恢复成``File.createTempFile``就一切正常，实在是摸不着头脑。
但也不影响整体，通过这样的优化方案，省去了重启设备这个多余的步骤，另外也不会出现一闪而过的弹窗，相比上文的方案要好上不少。
