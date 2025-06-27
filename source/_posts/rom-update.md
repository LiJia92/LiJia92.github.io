---
title: Anroid Launcher 升级 Rom
date: 2025-06-27 17:21:47
tags:
 -
---
近期接到一个需求：利用 Launcher 对系统 Rom 进行升级。OTA 包由其他同事提供，Launcher 与服务器通信判断是否有新的升级包，若有升级包则下载到本地，由 Launcher 进行 Rom 升级。过程不算顺利，写下此文记录一下。

<!-- more -->

## RecoverySystem
RecoverySystem 有一个 installPackage 方法，可以直接进行 Rom 升级，只需要声明 REBOOT 权限即可。通过 AI 很快得到如下代码：
```
object RomUpdater {
    private const val TAG = "RomUpdater"

    /**
     * 应用 ROM 更新
     * @param context 上下文对象
     * @param updateFile 更新包文件（需确保路径可被 Recovery 访问）
     */
    @SuppressLint("MissingPermission")
    fun applyUpdate(context: Context, updateFile: File) {
        // 1. 校验更新包签名
        if (!verifySignature(updateFile)) {
            LogUtils.e(TAG, "更新包签名校验失败")
            return
        }

        // 2. 使用 RecoverySystem API 触发更新
        try {
            RecoverySystem.installPackage(context, updateFile)
            LogUtils.i(TAG, "已成功触发系统更新")
        } catch (e: IOException) {
            LogUtils.e(TAG, "写入 Recovery 指令失败", e)
        } catch (e: SecurityException) {
            LogUtils.e(TAG, "权限不足，需要系统签名", e)
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
            false
        } catch (e: IOException) {
            false
        }
    }
}
```
代码流程非常简单，先验证文件签名，然后进行安装。可一阵尝试下来后，每次进入系统更新界面，就会弹出来一个错误，也没有写明具体的原因。通过修改 update.zip 的文件地址，比如放到 /cache 目录，或者放到 /sdcard 根目录，都无法升级成功。更有甚者，刷机失败导致系统无限自动重启，只能断电重新刷机。无奈之下最终放弃。

## UpdateEngine
通过 AI 又打开了 UpdateEngine 的思路。于是查看 UpdateEngine 代码。它位于``android.os``包下，同时被标记为``@SystemApi``，项目代码无法引用到。也是通过 AI 找到了三种方式。
### compile only
通过 compileOnly android.jar 文件，给项目提供编译环境，使项目中可以引用到 UpdateEngine。可当我如此做了之后，发现依然引用不到。最后查看 android.jar，发现这个 jar 本身就不会包含 UpdateEngine 类，应该是 android 在打包的时候，将这些不对外的 api 全部剔除掉了。于是只能使用下一种方式了。
### 反射
结合 AI 很快得到了如下反射代码：
```
import android.content.Context;
import android.util.Log;
import java.io.File;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

public class UpdateEngineReflector {

    private static final String TAG = "UpdateEngineReflector";

    public static void startOtaUpdateReflected(Context context, String otaPackageFilePath) {
        try {
            // 1. 获取 UpdateEngine 类
            Class<?> updateEngineClass = Class.forName("android.os.UpdateEngine");

            // 2. 获取 UpdateEngineCallback 接口及其方法
            Class<?> updateEngineCallbackClass = Class.forName("android.os.UpdateEngineCallback");
            // 查找 onStatusUpdate 方法
            Method onStatusUpdateMethod = updateEngineCallbackClass.getMethod("onStatusUpdate", int.class, float.class);
            // 查找 onPayloadApplicationComplete 方法
            Method onPayloadApplicationCompleteMethod = updateEngineCallbackClass.getMethod("onPayloadApplicationComplete", int.class);

            // 3. 创建 UpdateEngineCallback 的代理实例
            // Android 中的动态代理
            Object updateEngineCallbackInstance = java.lang.reflect.Proxy.newProxyInstance(
                    updateEngineCallbackClass.getClassLoader(),
                    new Class<?>[]{updateEngineCallbackClass},
                    (proxy, method, args) -> {
                        if (method.getName().equals("onStatusUpdate")) {
                            int status = (int) args[0];
                            float percent = (float) args[1];
                            Log.d(TAG, "Reflected Update Status: " + status + ", percent: " + (percent * 100) + "%");
                            // TODO: 根据 status 处理逻辑，例如触发重启
                            if (status == 5 /* UpdateEngine.UpdateStatusConstants.UPDATED_NEED_REBOOT */) {
                                // 在这里调用你的重启逻辑，同样可能需要反射或系统权限
                                // PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                                // pm.reboot("system_update");
                            }
                        } else if (method.getName().equals("onPayloadApplicationComplete")) {
                            int errorCode = (int) args[0];
                            Log.d(TAG, "Reflected Update Complete with error code: " + errorCode);
                            // TODO: 处理完成或错误
                        }
                        return null;
                    }
            );

            // 4. 获取 UpdateEngine 构造函数
            // 某些Android版本UpdateEngine构造函数是无参的，某些可能带Context
            Constructor<?> constructor;
            try {
                constructor = updateEngineClass.getConstructor(); // 尝试无参构造
            } catch (NoSuchMethodException e) {
                constructor = updateEngineClass.getConstructor(Context.class); // 尝试带Context构造
            }

            // 5. 创建 UpdateEngine 实例
            Object updateEngineInstance;
            if (constructor.getParameterCount() == 0) {
                updateEngineInstance = constructor.newInstance();
            } else {
                updateEngineInstance = constructor.newInstance(context);
            }


            // 6. 获取 bind 方法并调用
            Method bindMethod = updateEngineClass.getMethod("bind", updateEngineCallbackClass);
            bindMethod.invoke(updateEngineInstance, updateEngineCallbackInstance);

            // 7. 获取 applyPayload 方法并调用
            Method applyPayloadMethod = updateEngineClass.getMethod("applyPayload",
                    String.class, long.class, long.class, String[].class);

            File otaFile = new File(otaPackageFilePath);
            if (!otaFile.exists() || !otaFile.isFile()) {
                Log.e(TAG, "Reflected OTA package file not found or is not a file: " + otaPackageFilePath);
                return;
            }

            // 8. 调用 applyPayload
            applyPayloadMethod.invoke(updateEngineInstance,
                    "file://" + otaPackageFilePath,
                    0L, // offset for full package
                    otaFile.length(), // length for full package
                    new String[]{} // headers for full package
            );
            Log.i(TAG, "Reflected OTA update started for: " + otaPackageFilePath);

        } catch (ClassNotFoundException e) {
            Log.e(TAG, "Class not found (UpdateEngine or Callback): " + e.getMessage());
        } catch (NoSuchMethodException e) {
            Log.e(TAG, "Method not found: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Error using reflection for UpdateEngine: " + e.getMessage(), e);
        }
    }

    // 可以在 onDestroy 中添加 unbind 方法的反射调用
    public static void unbindUpdateEngineReflected(Object updateEngineInstance) {
        if (updateEngineInstance != null) {
            try {
                Class<?> updateEngineClass = Class.forName("android.os.UpdateEngine");
                Method unbindMethod = updateEngineClass.getMethod("unbind");
                unbindMethod.invoke(updateEngineInstance);
                Log.i(TAG, "Reflected UpdateEngine unbound.");
            } catch (Exception e) {
                Log.e(TAG, "Failed to unbind UpdateEngine via reflection: " + e.getMessage());
            }
        }
    }
}
```
不出意外的话很快就会有意外了，在 newProxyInstance 执行时报错：
> java.lang.IllegalArgumentException: android.os.UpdateEnginecallback is not an interface

确实，UpdateEnginecallback 这个类是一个抽象类，而不是接口，newProxyInstance 是用不了的。于是想了很多其他方案，比如自建 android.os 包，提供 UpdateEngine 类的空壳，将其抽到一个单独的 lib 中，项目 module compileOnly 这个 lib。然后通过``new UpdateEngine()``获取到 UpdateEngine 的实例，代码编译是没问题了，可是运行代码进行``mUpdateEngine.bind(mUpdateEngineCallback)``的时候仍然报错：
>java.lang.nullPointerException: Attempt to invoke interface method "boolean android.os.IupdateEngine.bind(androidos,IupdateEngineCaltback)

查看代码 new UpdateEngine() 时，内部会创建一个 mUpdateEngine：
```
public UpdateEngine() {
    mUpdateEngine = IUpdateEngine.Stub.asInterface(
            ServiceManager.getService(UPDATE_ENGINE_SERVICE));
}
```
通过此种方式 new 出来的，这个 mUpdateEngine 对象是 null。折腾了好久还是无法成功调用，无奈只能放弃了。

### AOSP 源码构建环境
这个方案应该是流程最简单、逻辑最清晰的，都直接改源码编译了。但可执行性不高，也非常复杂，不到最后不会花费大力气做这个事情。

## 系统原生升级
通过 AI 获取的 RecoverySystem、UpdateEngine 方式全部失败后，我对 AI 丧失了一些信心。在验证 update.zip 是否能正常对系统更新时，发现了一个当前系统原生升级的逻辑：**当把 update.zip 放到 /sdcard 根目录时，设备重启后，会自动弹窗发现一个升级文件，询问是否需要进行升级。** 点击安装按钮后，系统会进入更新，且能更新成功。
就像这样：
于是有了一个新思路：**将 OTA 包下载后放到 /sdcard 根目录，然后重启设备，这个时候系统会弹窗是否进行升级，然后结合 Launcher 的系统能力，做自动点击，就可以走系统原生的升级了。**
系统升级成功后，会有一个弹窗提醒删掉 OTA 文件，这个时候自动点击确认删除，即可完成系统升级。
通过这个方案，就只剩下**自动点击**需要额外代码实现了，结合 AI 加不断的调试，最终得到如下代码：
```
class SystemUpdateService : AccessibilityService() {

    private val TAG = "SystemUpdateService"
    private val updatePkg = "android.rockchip.update.service"

    //------- 安装固件，一个标题，一个按钮，升级系统---------
    private val updateTitle = "固件升级"
    private val installText = "安装"
    private val cancelText = "放弃"

    //------- 安装成功后，一个标题，一个按钮，删除文件---------
    private val successTitle = "系统升级"
    private val yesText = "是"

    // 服务配置参数
    override fun onServiceConnected() {
        LogUtils.e(TAG, "onServiceConnected")
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
        }
        serviceInfo = info
    }

    // 事件处理核心逻辑
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> handleWindowChange(event)
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> handleContentChange(event)
        }
    }

    override fun onInterrupt() {

    }

    private fun handleWindowChange(event: AccessibilityEvent) {
        handleEvent(event)
    }

    private fun handleContentChange(event: AccessibilityEvent) {
        handleEvent(event)
    }

    private fun handleEvent(event: AccessibilityEvent) {
        kotlin.runCatching {
            event.source?.let { source ->
                if (source.packageName == updatePkg) {
                    findAndClickInstallButton(source)
                }
            }
        }.onFailure {
            LogUtils.e(TAG, it.message)
        }
    }

    // 核心点击逻辑
    private fun findAndClickInstallButton(rootNode: AccessibilityNodeInfo) {
        try {
            val startTime = System.currentTimeMillis()
            val upgradeTitle = rootNode.findAccessibilityNodeInfosByText(updateTitle)
            if (upgradeTitle.isNotEmpty()) {
                val installButtons = rootNode.findAccessibilityNodeInfosByText(installText)
                if (installButtons.isNotEmpty()) {
                    val localVersion = AppUtil.getRomVersion()
                    ThreadConfig.execute {
                        val updateVersion = AppUtil.parseOtaPackage(RomUpdater.getUpdateZipPath())
                        MainThreadUtils.post {
                            if (localVersion != null && updateVersion != null && localVersion < updateVersion) {
                                performClick(installButtons)
                            } else {
                                val cancelButtons = rootNode.findAccessibilityNodeInfosByText(cancelText)
                                if (cancelButtons.isNotEmpty()) {
                                    performClick(cancelButtons)
                                    RomUpdater.deleteZipFile()
                                }
                            }
                        }
                    }
                }
            } else {
                val successTitle = rootNode.findAccessibilityNodeInfosByText(successTitle)
                if (successTitle.isNotEmpty()) {
                    val yesButtons = rootNode.findAccessibilityNodeInfosByText(yesText)
                    if (yesButtons.isNotEmpty()) {
                        performClick(yesButtons)
                    }
                }
            }
        } finally {
            rootNode.recycle()
        }
    }

    private fun performClick(nodes: List<AccessibilityNodeInfo>) {
        nodes.forEach { node ->
            if (node.isClickable) {
                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                node.recycle()
            }
        }
    }
}
```
在点击安装时，先判断一下版本。
```
fun getRomVersion(): Int? {
    LogUtils.e(TAG, "display:" + Build.DISPLAY + ",fingerprint:" + Build.FINGERPRINT)
    val input = Build.DISPLAY
    val regex = Regex("${ROM_PREFIX}(.*?)A1")
    val matchedPart = regex.find(input)?.groupValues?.get(1) ?: return null
    val digitsOnly = matchedPart.filter { it.isDigit() }
    return digitsOnly.toIntOrNull()
}

fun parseOtaPackage(otaPath: String): Int? {
    var result: Int? = null
    try {
        val zipInputStream = ZipInputStream(FileInputStream(otaPath))
        var entry: ZipEntry?
        while (zipInputStream.nextEntry.also { entry = it } != null) {
            if (entry?.name == "META-INF/com/android/metadata") {
                val reader = BufferedReader(InputStreamReader(zipInputStream))
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    if (line?.startsWith(POST_BUILD) == true && line?.contains(ROM_PREFIX) == true) {
                        LogUtils.e(TAG, line)
                        val input = line ?: ""
                        val regex = Regex("${ROM_PREFIX}(.*?)A1")
                        val matchedPart = regex.find(input)?.groupValues?.get(1)
                        val digitsOnly = matchedPart?.filter { it.isDigit() }
                        result = digitsOnly?.toIntOrNull()
                        if (result != null) {
                            break
                        }
                    }
                }
                reader.close()
                if (result != null) {
                    break
                }
            }
        }
        zipInputStream.close()
    } catch (e: IOException) {
        e.printStackTrace()
    }
    return result
}
```
我们系统的版本号是这样的格式：ROM_PREFIX.250627.001.A1 这样的格式。只需要解析出 250627001 作为版本号即可。OTA 包中，通过解析 zip 包获取 ZipEntry，通过** META-INF/com/android/metadata** 的 entry name 拿到** post_build** 字段，来分析出对应的版本号，然后进行对比，本地版本低才进行升级。
在 AndroidManifest.xml 中如下声明：
```
<service
    android:name="cn.packageName.launcher.ui.SystemUpdateService"
    android:exported="true"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/accessibility_service_config" />
</service>
```
在 res 目录下创建 xml 文件夹，accessibility_service_config 如下：
```
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:canRequestFilterKeyEvents="true"
    android:canRequestTouchExplorationMode="true"
    android:canRetrieveWindowContent="true"
    android:description="@string/system_update"
    android:notificationTimeout="100" />
```
在 Application 启动时，默认启动无障碍服务：
```
Settings.Secure.putString(
    contentResolver,
    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
    "cn.packageName.launcher/cn.packageName.launcher.ui.SystemUpdateService"
)
Settings.Secure.putInt(
    contentResolver,
    Settings.Secure.ACCESSIBILITY_ENABLED, 1
)
```
**这个代码需要系统级 App 才行，不然得到设置页专门打开无障碍服务。**
至此，基本代码全部完成，运行后也符合预期，系统能升级成功。升级成功后，也能自动点击，删掉 OTA 文件。只是设备会多重启一次，体验略差，后续为了优化体验，准备研究刷机 Rom 的源码了。
在调试最终方案的过程中，也有一些小插曲。
