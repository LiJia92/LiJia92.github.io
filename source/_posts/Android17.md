---
title: Android 17 应用升级适配说明文档
date: 2026-07-29 18:00:00
tags:
 - Android 进阶
---

> 适用对象：计划将应用升级 / 适配到 Android 17（API 37）的 Android 开发团队
> 文档目标：明确 **所有应用** 与 **以 Android 17 为目标平台（targetSdk = 37）的应用** 各自需要完成的适配项。每个适配点按「背景 / 适用范围 / 变更内容 / 适配步骤」展开，说明**为什么要改**以及**具体怎么改**。

---

## 0. 文档导读

Android 17 的适配变更可分为两类，团队需按自身升级目标分别处理：

| 分类 | 触发条件 | 关键动作 |
| --- | --- | --- |
| **全局行为变更** | 在 Android 17 设备上**运行**（不论 targetSdk 是多少） | 明文流量弃用预告、隐式 URI 授权限制、Keystore 上限、后台音频强化、Parcel 校验、配置变更不重启等 |
| **目标平台行为变更** | **targetSdk 升级到 37（Android 17）** 时生效 | MessageQueue 无锁实现、static final 不可改、本地网络权限、BAL 强化、CT 透明度、可写原生库限制等 |

**建议升级路径**：先确保应用能在 Android 17 设备上正常安装运行（全局变更），再将 `compileSdkVersion` / `targetSdkVersion` 提升到 **37** 并验证目标平台变更。可利用系统提供的兼容性切换开关（通过 adb 管理）分阶段验证。

> 注：部分全局变更当前由 Aconfig Flag 控制、或属于「弃用预告 / 限制预告」，在 Android 17 中可能尚未完全强制生效，但建议**现在即着手迁移**，避免 Android 18 正式生效时被动改动。

<!-- more -->

---

## 一、影响所有应用的行为变更（必做）

以下变更在 **Android 17 设备上运行即生效**，无论 `targetSdkVersion` 为多少。

### 1.1 usesCleartextTraffic 弃用预告

- **背景**：`android:usesCleartextTraffic` 用于控制应用是否允许明文（HTTP）流量。平台计划在未来版本（预计 Android 18）弃用该属性，届时系统将**完全忽略**其值，明文流量被平台网络栈**默认拒绝**。官方推荐改用**网络安全配置文件（Network Security Config）**，支持域名级精细控制。
- **适用范围**：
  - 正式生效版本：预计 Android 18（以官方文档为准）
  - 受影响应用：依赖 `usesCleartextTraffic="true"` 允许 HTTP、且未配置 Network Security Config 的应用
  - 暂不受影响：`targetSdk <= 37` 的应用、已使用 Network Security Config 的应用
- **变更内容**：Android 17 中 `R.attr.usesCleartextTraffic` 已标注 `@Deprecated @FlaggedApi`，并新增 CompatChange `DEPRECATE_USES_CLEARTEXT_TRAFFIC`（当前 `@Disabled`）；两者同时启用时才强制忽略该属性。建议现在迁移，避免 Android 18 被动修改。
- **适配步骤**：
  1. **检查是否受影响**：在 `AndroidManifest.xml` 中搜索 `android:usesCleartextTraffic="true"`，若存在且未配置 `android:networkSecurityConfig`，则需要迁移。
  2. **按 `minSdkVersion` 选择迁移方案**：
     - **情况一：`minSdkVersion < 24`**（需兼容 Android 7 以下），同时保留两者：
       ```xml
       <!-- AndroidManifest.xml -->
       <application
           android:usesCleartextTraffic="true"
           android:networkSecurityConfig="@xml/network_security_config"
           ... >
       ```
       ```xml
       <!-- res/xml/network_security_config.xml -->
       <?xml version="1.0" encoding="utf-8"?>
       <network-security-config>
           <domain-config cleartextTrafficPermitted="true">
               <domain includeSubdomains="true">api.example.com</domain>
           </domain-config>
           <base-config cleartextTrafficPermitted="false" />
       </network-security-config>
       ```
     - **情况二：`minSdkVersion >= 24`**，直接使用 Network Security Config，去掉 `usesCleartextTraffic`：
       ```xml
       <application
           android:networkSecurityConfig="@xml/network_security_config"
           ... >
       ```
       ```xml
       <!-- res/xml/network_security_config.xml -->
       <network-security-config>
           <domain-config cleartextTrafficPermitted="true">
               <domain includeSubdomains="true">api.example.com</domain>
           </domain-config>
           <base-config cleartextTrafficPermitted="false" />
       </network-security-config>
       ```
  3. **验证**：在低版本（< 24）设备上确认「同时保留」方案生效；在高版本上确认明文仅对声明域名放行。

### 1.2 限制隐式 URI 授权

- **背景**：系统此前对 `ACTION_SEND`、`ACTION_SEND_MULTIPLE`、`ACTION_IMAGE_CAPTURE` 等含 URI 的 Intent **自动授予**读写权限（隐式 URI 授权），存在越权隐患。Android 17 引入限制框架与 StrictMode 检测，**Android 18（API 38）将正式废止**隐式授权。
- **适用范围**：
  - 平台版本：Android 17（API 37）
  - StrictMode 自动检测：`targetSdk > 36`
  - 限制本身：所有应用（由 Aconfig 标志控制）
  - 当前状态：限制标志默认关闭，隐式授权仍发生；Android 18 预计正式废止
- **变更内容**：在 `Intent.migrateExtraStreamToClipData()` 中对三类 Action 添加条件分支；StrictMode 新增 CompatChange `DETECT_IMPLICIT_URI_PERMISSION_GRANT`（ID: 460838111），对 `targetSdk > 36` 自动启用。
- **适配步骤**：
  1. **发送方显式添加授权标志**（所有分享 / 拍照场景）：
     ```java
     // ACTION_SEND 修复
     Intent shareIntent = new Intent(Intent.ACTION_SEND);
     shareIntent.setType("image/jpeg");
     shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
     shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
     startActivity(Intent.createChooser(shareIntent, "分享"));

     // ACTION_IMAGE_CAPTURE 修复
     Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
     cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, outputUri);
     cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
             | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
     startActivityForResult(cameraIntent, REQUEST_IMAGE_CAPTURE);
     ```
  2. **开发期开启 StrictMode 检测**（`targetSdk > 36` 自动启用，建议显式打开便于发现）：
     ```java
     if (BuildConfig.DEBUG) {
         StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder()
                 .detectImplicitUriPermissionGrant()
                 .penaltyLog()
                 .build());
     }
     ```
  3. **接收方适配**：若接收方依赖隐式授权读取 URI，需改为在自身 `ContentProvider` 中校验调用方，或要求发送方显式授权。

### 1.3 Keystore 密钥数量限制

- **背景**：Android 17 在 keystore2 守护进程中引入**按 UID 的密钥数量上限**，防止单个应用无限制创建密钥耗尽系统资源。
- **适用范围**：
  - 平台版本：Android 17（API 37）
  - 当前状态：已生效
  - `targetSdk >= 37` 的非系统应用上限更低（50,000）且获得专属错误码
- **变更内容**：

  | 应用类型 | targetSdk | 上限 |
  | --- | --- | --- |
  | 非系统应用 | >= 37 | 50,000 个 |
  | 非系统应用 | < 37 | 200,000 个 |
  | 系统应用 | 任意 | 200,000 个 |

- **适配步骤**：
  1. **识别密钥膨胀点**：检查是否每次操作都创建独立密钥（如每次会话生成新密钥），改为复用或带有效期。
  2. **设置有效期并定期清理**：为密钥设置 `setKeyValidityEnd` 等有效期，并在过期后主动删除无用密钥（`KeyStore.deleteEntry`）。
  3. **捕获超限异常**：
     ```java
     try {
         KeyGenerator keyGen = KeyGenerator.getInstance("AES", "AndroidKeyStore");
         keyGen.init(spec);
         SecretKey key = keyGen.generateKey();
     } catch (ProviderException e) {
         Throwable cause = e.getCause();
         if (cause instanceof KeyStoreException) {
             KeyStoreException kse = (KeyStoreException) cause;
             if (kse.getNumericErrorCode() == KeyStoreException.ERROR_TOO_MANY_KEYS
                     || kse.getNumericErrorCode() == KeyStoreException.ERROR_INCORRECT_USAGE) {
                 cleanupUnusedKeys(); // 清理后重试
             }
         }
     }
     ```
  4. **升级前评估**：计划将 `targetSdk` 升到 37 前，确认现网密钥数不超过 50,000。

### 1.4 旋转后恢复 IME 可见性

- **背景**：Android 17 改变旋转后 IME（输入法）恢复逻辑：不再依据旧状态 `mLastImeShown` 自动恢复，改为读取新窗口的 `requestedVisibleTypes`（默认不含 IME）。
- **适用范围**：平台版本 Android 17（API 37），由 Aconfig Flag `disable_ime_restore_on_activity_create` 控制。
- **变更内容**：Flag 关闭（旧行为）自动恢复；Flag 开启（新行为）后，**旋转后 IME 不再自动出现**，需应用显式请求。
- **适配步骤**：
  1. **声明窗口属性**（让 Activity 创建即显示输入法）：
     ```xml
     <activity android:name=".MyActivity"
         android:windowSoftInputMode="stateAlwaysVisible|adjustResize" />
     ```
  2. **代码中显式请求**（适用于动态场景）：
     ```java
     @Override
     protected void onCreate(Bundle savedInstanceState) {
         super.onCreate(savedInstanceState);
         editText.post(() -> {
             editText.requestFocus();
             InputMethodManager imm = getSystemService(InputMethodManager.class);
             imm.showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT);
         });
     }
     ```
  3. **自行处理旋转配置**（若不想重启 Activity）：
     ```xml
     <activity android:name=".MyActivity"
         android:configChanges="orientation|screenSize|screenLayout|keyboardHidden" />
     ```
     并在 `onConfigurationChanged` 中重新请求 IME。
  4. **回归**：测试「输入中旋转屏幕」「旋转后重新进入页面」两类场景，确认输入法行为与预期一致。

### 1.5 触控板指针捕获默认传递相对事件

- **背景**：Android 17 将触控板在指针捕获期间的默认行为从 `ABSOLUTE` 改为 `RELATIVE`，通过两个 Aconfig Flag 控制，不受 `targetSdkVersion` 影响。
- **适用范围**：平台版本 Android 17（API 37）；双 Flag：`pointer_capture_modes` + `relative_capture_mode_by_default`。
- **变更内容**：新增常量 `POINTER_CAPTURE_MODE_UNCAPTURED(0)` / `ABSOLUTE(1)` / `RELATIVE(2)`，以及 `requestPointerCapture(int mode)` 重载。默认进入 RELATIVE 模式。
- **适配步骤**：
  1. **评估依赖**：若应用依赖多触点绝对坐标（如绘图、精确指针定位），需显式指定 `ABSOLUTE`。
  2. **显式指定模式**：
     ```java
     if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.CINNAMON_BUN
             && com.android.hardware.input.Flags.pointerCaptureModes()) {
         view.requestPointerCapture(View.POINTER_CAPTURE_MODE_ABSOLUTE);
     } else {
         view.requestPointerCapture();
     }
     ```
  3. **测试**：在触控板设备上验证指针捕获行为符合交互预期（默认 RELATIVE 下无需改动的应用应确认无回归）。

### 1.6 后台音频操作强化（Background Audio Hardening）

- **背景**：Android 17 正式开启强制阻断模式，限制后台应用操作音频，防止不可见应用干扰音频输出。
- **适用范围**：平台版本 Android 17（API 37）；Flag：`hardening_strict`、`hardening_partial_volume`、`ro_foreground_audio_control`。
- **变更内容**：后台调用音量 API **静默失败**（no-op）；后台请求焦点返回 `AUDIOFOCUS_REQUEST_FAILED`；后台 `AudioTrack.write()` 等被静默。
- **适配步骤**：
  1. **识别后台音频调用**：检索所有在非前台（无可见 Activity、无前台服务）时调用音频 API 的代码。
  2. **迁移到前台执行**：
     - 在**可见 Activity** 中调用音量 / 焦点 API；
     - 或在**可见时启动的非 `SHORT_SERVICE` 前台服务**中执行播放 / 录制。
  3. **检查返回值**：请求焦点后判断 `AUDIOFOCUS_REQUEST_FAILED`，做降级处理。
  4. **本地验证**：`adb shell cmd audio set-enable-hardening 1` 开启强化，回归测试后台场景是否被静默。

### 1.7 蓝牙绑定丢失的自主重新配对

- **背景**：Android 17 引入自主重新配对机制，`ACTION_KEY_MISSING` 升级为**受保护广播**，防止伪造。
- **适用范围**：平台版本 Android 17（API 37）；Flag：`autonomous_repairing_initiation` + `bluetooth_pairing_hardening`。
- **变更内容**：系统静默恢复 bond key；`ACTION_KEY_MISSING` 变为受保护广播，第三方应用无法伪造 / 单独可靠接收。
- **适配步骤**：
  1. **不要单独依赖 `ACTION_KEY_MISSING`**：该广播现在受保护且可能不再可靠送达。
  2. **同时监听 `ACTION_BOND_STATE_CHANGED`**：
     ```java
     IntentFilter filter = new IntentFilter();
     filter.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
     filter.addAction(BluetoothDevice.ACTION_KEY_MISSING);
     registerReceiver(receiver, filter);
     ```
  3. **基于绑定状态决策**：以 `ACTION_BOND_STATE_CHANGED` 的 `EXTRA_BOND_STATE` 为主判断连接 / 重连，而非仅依赖 key missing 事件。

### 1.8 已回收 Parcel 对象的访问限制

- **背景**：Android 17 新增 `assertNotRecycled()`，检测 use-after-recycle（回收后继续访问）并直接抛 `BadParcelableException`。
- **适用范围**：平台版本 Android 17（API 37），已生效；当前仅 `readParcelable()` 路径触发。
- **变更内容**：在 `recycle()` 之后继续读取 Parcel 会抛异常，暴露原有潜在 bug。
- **适配步骤**：
  1. **调整读取顺序**：确保所有读取在 `recycle()` **之前**完成：
     ```java
     Parcel parcel = Parcel.obtain();
     parcel.setDataPosition(0);
     SomeData data = parcel.readParcelable(SomeData.class.getClassLoader());
     SomeData data2 = parcel.readParcelable(SomeData.class.getClassLoader());
     parcel.recycle(); // 全部读取完成后再回收
     ```
  2. **排查复用场景**：检查将同一 Parcel 在 recycle 后再次传入的自定义逻辑，改为重新 `obtain()`。
  3. **回归**：在低版本正常、Android 17 抛异常的路径上验证修复。

### 1.9 Parcel 序列化大小校验（failOnParcelSizeMismatch）

- **背景**：Android 17 通过 Aconfig Flag `fail_on_parcel_size_mismatch` 控制，对 `writeValue` / `readValue` 字节数不一致的情况做严格校验。
- **适用范围**：平台版本 Android 17（API 37）；Flag 默认 **ENABLED**。
- **变更内容**：`writeToParcel` 写入的字节数与 `createFromParcel` 读取的不一致时，直接抛 `BadParcelableException`。
- **适配步骤**：
  1. **保证对称**：自定义 `Parcelable` 的 `writeToParcel()` 与 `createFromParcel()` 必须严格一一对应（写入顺序、类型、数量完全一致）。
  2. **排查历史不对称**：检查旧代码中「多写少读 / 少写多读」的 `Parcelable` 实现，补齐对齐。
  3. **回归**：构造边界数据（空列表、null、超大对象）验证读写一致，无 `BadParcelableException`。

### 1.10 相关配置变更不再重启 Activity

- **背景**：Android 17 引入 `SKIP_ACTIVITY_RECREATION_ON_CONFIG_CHANGE`，低优先级配置变更默认不再重启 Activity，减少无谓重建。
- **适用范围**：平台版本 Android 17（API 37），对所有应用生效。
- **变更内容**：受影响配置：`keyboard`、`keyboardHidden`、`navigation`、`touchscreen`、`colorMode`、`UI_MODE`（仅离开 / 进入 Desk 模式）。新增 `android:recreateOnConfigChanges` 属性可恢复旧行为。
- **适配步骤**：
  1. **实现 `onConfigurationChanged()`**：对受影响的配置变化做资源 / 布局更新，而非依赖 Activity 重建。
  2. **或显式恢复重建**：若现有逻辑依赖重建，声明：
     ```xml
     <activity android:name=".MyActivity"
         android:recreateOnConfigChanges="keyboard|keyboardHidden|navigation|touchscreen|colorMode" />
     ```
  3. **回归**：连接 / 断开键盘、切换导航方式等场景下，确认 UI 与状态正确。

### 1.11 文件操作模式严格校验

- **背景**：Android 17 改为显式枚举合法文件模式，不在白名单中的模式直接抛 `IllegalArgumentException`。
- **适用范围**：平台版本 Android 17（API 37），已无条件生效。
- **变更内容**：合法模式白名单：`r`、`w`、`wt`、`wa`、`rw`、`rwt` 等组合；如 `"rwa"` 这类非法组合会抛异常。
- **适配步骤**：
  1. **定位非法模式**：全局搜索 `openFile` / `ParcelFileDescriptor` / `open` 等调用中的模式字符串，找出白名单外的组合（如 `"rwa"`）。
  2. **替换为合法组合**：
     - 需读写 → `"rw"`
     - 需写并追加 → `"wa"`
     - 需读写截断 → `"rwt"`
  3. **回归**：覆盖所有文件打开路径，确认不再抛 `IllegalArgumentException`。

### 1.12 线程优先级越界强制校验

- **背景**：Android 17 改为 Java 层校验线程优先级，传入越界值直接抛 `IllegalArgumentException`。
- **适用范围**：平台版本 Android 17（API 37），已生效。
- **变更内容**：合法范围 **[-20, 19]**；越界值（如 > 19 或 < -20）直接抛异常。
- **适配步骤**：
  1. **定位越界调用**：搜索 `Process.setThreadPriority(...)` / `Thread.setPriority(...)`，检查传入值来源。
  2. **钳制到合法范围**：
     ```java
     int safePriority = Math.max(-20, Math.min(Process.THREAD_PRIORITY_LOWEST, priority));
     Process.setThreadPriority(safePriority);
     ```
  3. **回归**：对来自配置 / 网络的动态优先级值做边界测试，确认不再崩溃。

---

## 二、以 Android 17 为目标平台的行为变更（targetSdk = 37 时生效）

当 `targetSdkVersion` 升级到 **37** 后，下列变更才会生效，需重点验证。

### 2.1 MessageQueue 新无锁实现

- **背景**：Android 17 引入 DeliQueue 无锁 MessageQueue 实现，提升消息调度性能。
- **适用范围**：`targetSdk >= 37`（自动激活）。
- **变更内容**：新实现下 `MessageQueue.mMessages` **恒为 null**，原有反射该字段的逻辑失效；部分测试框架需升级。
- **适配步骤**：
  1. **移除对 `mMessages` 的反射**：搜索并删除通过反射读取 `MessageQueue.mMessages` 的代码。
  2. **升级测试框架**：
     - Espresso 升至 **3.7.0+**
     - Robolectric 升至 **4.17+**
  3. **回归**：运行 UI 测试与单元测试，确认消息调度相关逻辑正常。

### 2.2 static final 字段不可修改

- **背景**：Android 17 的 ART 禁止运行时修改 `static final` 字段，消除对常量语义的破坏。
- **适用范围**：`targetSdk >= 37`。
- **变更内容**：通过反射修改 `static final` 会抛异常，JNI 层修改直接崩溃。
- **适配步骤**：
  1. **移除修改逻辑**：删除所有通过反射（或 JNI）修改 `static final` 字段的代码（常见于某些 mock / 缓存 hack）。
  2. **升级 Mockito**：使用与 Android 17 兼容的 Mockito 版本（其已适配不可修改 final）。
  3. **避免 PowerMock**：PowerMock 依赖修改 final / 静态，建议迁移到 Mockito + `mockito-inline` 或真实测试替身。

### 2.3 通知自定义视图大小限制

- **背景**：Android 17 在 SystemUI 层对超限的通知自定义视图做降级，避免畸形通知占用过多空间。
- **适用范围**：`targetSdk >= 37` 使用自定义通知视图（`RemoteViews`）的应用。
- **变更内容**：自定义视图超过尺寸阈值时，SystemUI 将其降级为标准通知模板。
- **适配步骤**：
  1. **图片降采样**：通知内图片压缩到合理尺寸（如 ≤ 256dp 宽），避免过大。
  2. **使用 DecoratedCustomViewStyle**：
     ```java
     NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
         .setSmallIcon(R.drawable.ic_notify)
         .setCustomContentView(collapsedView)
         .setCustomBigContentView(expandedView)
         .setStyle(new NotificationCompat.DecoratedCustomViewStyle());
     ```
  3. **简化层级**：减少自定义视图嵌套层级与高度，控制在系统阈值内。

### 2.4 NPU 直接访问需声明硬件功能

- **背景**：Android 17 要求显式声明 NPU（神经网络处理单元）硬件功能，未声明者直接访问被拒绝。
- **适用范围**：`targetSdk >= 37` 且直接访问 NPU 的应用（如自研推理引擎）。
- **变更内容**：未在 Manifest 声明 `android.hardware.npu` 的 NPU 直接访问被拒绝。
- **适配步骤**：
  1. **声明硬件功能**（设为非必须，避免过滤设备）：
     ```xml
     <uses-feature android:name="android.hardware.npu" android:required="false" />
     ```
  2. **运行时检测**：用 `PackageManager.hasSystemFeature(FEATURE_NPU)` 判断可用性，不可用时回退 CPU / GPU 推理。
  3. **回归**：在具备 / 不具备 NPU 的设备上验证推理路径正确回退。

### 2.5 复杂 IME 实体键盘输入的无障碍支持

- **背景**：Android 17 新增文本变更类型 API，便于实体键盘输入法（如 CJK IME）向无障碍服务传递候选词等状态。
- **适用范围**：`targetSdk >= 37`（可选增强）。
- **变更内容**：新增文本变更类型 API，IME 可上报候选词 / 组合串状态。
- **适配步骤**：
  1. **（输入法开发者）上报状态**：在 IME 中调用新 API 传递候选词 / 组合串变化。
  2. **（普通应用）按需接入**：若应用需读取输入法候选状态做无障碍增强，注册对应监听器。
  3. **验证**：确认屏幕阅读器能正确播报复杂输入过程（中文 / 日文等）。

### 2.6 机会性启用 ECH（加密客户端 Hello）

- **背景**：Android 17 对 `targetSdk >= 37` 默认以 OPPORTUNISTIC 模式启用 ECH（Encrypted Client Hello），增强 TLS 握手隐私。
- **适用范围**：`targetSdk >= 37`。
- **变更内容**：默认 OPPORTUNISTIC（服务器支持则启用，不支持则回退），应用通常无需修改。
- **适配步骤**：
  1. **默认无需改动**：确认网络请求在 ECH 启用 / 回退下均正常工作。
  2. **企业网络例外**：若企业网络需禁用 ECH，通过 Network Security Config 配置（按需）。
  3. **回归**：在支持 / 不支持 ECH 的服务器上测试 HTTPS 连通性。

### 2.7 访问本地网络需要权限

- **背景**：Android 17 引入危险权限 `ACCESS_LOCAL_NETWORK`，访问本地网络（如局域网设备发现、本地服务调用）需显式授权。
- **适用范围**：`targetSdk >= 37` 访问本地网络地址的应用（如 IoT 控制、局域网投屏）。
- **变更内容**：未声明 / 未授予该权限时，访问本地网络地址会被拒绝。
- **适配步骤**：
  1. **声明权限**：
     ```xml
     <uses-permission android:name="android.permission.ACCESS_LOCAL_NETWORK" />
     ```
  2. **运行时请求**：在需要访问本地网络前，向用户请求该危险权限，并解释用途。
  3. **优雅降级**：未授予时提示用户开启，或提供云端替代方案。
  4. **回归**：在授予 / 拒绝两种状态下测试局域网功能。

### 2.8 实体设备隐藏密码

- **背景**：Android 17 将 `TEXT_SHOW_PASSWORD_PHYSICAL` 默认值改为 0，实体键盘输入默认隐藏密码。
- **适用范围**：`targetSdk >= 37`。
- **变更内容**：实体键盘输入密码时默认不打码（显示掩码），由系统统一处理。
- **适配步骤**：
  1. **通常无需改动**：系统自动处理密码隐藏，确认密码输入框在无 `textVisiblePassword` 时行为符合预期。
  2. **回归**：在实体键盘设备上验证密码字段默认隐藏。

### 2.9 短信 OTP 保护

- **背景**：Android 17 强化短信 OTP 保护，OTP 短信仅受信任应用可接收，防止其他应用窃取值守码。
- **适用范围**：`targetSdk >= 37` 读取短信验证码的应用。
- **变更内容**：非受信任应用无法通过 `RECEIVE_SMS` 等读取 OTP 短信。
- **适配步骤**：
  1. **迁移到 SMS Retriever API**（推荐，无需短信权限）：
     ```java
     SmsRetriever.getClient(context).startSmsRetriever();
     // 注册广播监听 SMS_RETRIEVED_ACTION，从 Intent 提取 11 位以内的 OTP
     ```
  2. **或 SMS User Consent API**（需用户确认）：用于非本应用发起的验证短信。
  3. **移除 `RECEIVE_SMS` 依赖**：不再依赖裸短信接收读取 OTP，避免被拦截。

### 2.10 活动安全性增强（BAL 强化）

- **背景**：Android 17 强化后台启动限制（Background Activity Launch），防止应用从后台弹出 Activity。
- **适用范围**：`targetSdk >= 37`。
- **变更内容**：旧 BAL 常量废弃；`IntentSender` 不再豁免后台启动限制；StrictMode 自动检测违规。
- **适配步骤**：
  1. **替换废弃常量**：将代码中引用的旧 BAL 常量替换为当前官方常量。
  2. **显式指定 BAL 模式**：在需要后台启动时，按场景显式声明允许的 BAL 模式，而非依赖 `IntentSender` 豁免。
  3. **迁移到通知 / 前台引导**：后台需用户操作的场景改为发通知，由用户点击进入。
  4. **StrictMode 检测**：开启相关 VmPolicy 检测，发现并修复违规启动。

### 2.11 CT 证书透明度默认启用

- **背景**：Android 17 对 `targetSdk >= 37` 默认开启证书透明度（Certificate Transparency），提升 TLS 证书可信度。
- **适用范围**：`targetSdk >= 37` 发起 HTTPS 请求的应用。
- **变更内容**：默认开启 CT 校验；所用证书未提交到 CT 日志时，连接可能被拒。
- **适配步骤**：
  1. **确认证书合规**：确保服务端证书已提交到公开 CT 日志（主流 CA 通常已默认提交）。
  2. **自签名 / 私有 CA 场景**：在 Network Security Config 中按需关闭 CT 或添加例外。
  3. **回归**：在生产环境验证 HTTPS 连接正常，无 CT 相关证书错误。

### 2.12 加载可写原生库抛 UnsatisfiedLinkError

- **背景**：Android 17 禁止加载**可写**的 `.so` 原生库，防止恶意篡改的动态库被执行。
- **适用范围**：`targetSdk >= 37` 通过代码动态加载 `.so`（如 `System.load` 指定路径）的应用。
- **变更内容**：加载可写权限的 `.so` 会抛 `UnsatisfiedLinkError`。
- **适配步骤**：
  1. **加载前设为不可写**：
     ```java
     nativeLibFile.setWritable(false);
     System.load(nativeLibFile.getAbsolutePath());
     ```
  2. **优先使用系统加载**：尽量将 `.so` 放入 `lib/` 由系统按 ABI 加载，避免手动 `System.load`。
  3. **回归**：在 Android 17 上验证动态加载的原生库可正常加载，无 `UnsatisfiedLinkError`。

### 2.13 大屏设备忽略屏幕方向和尺寸调整限制

- **背景**：Android 17 对 `targetSdk >= 37` 封堵方向 / 尺寸限制的 opt-out，推动大屏全场景适配。
- **适用范围**：`targetSdk >= 37` 的大屏 / 折叠屏设备。
- **变更内容**：`PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` 等 opt-out 失效，应用需支持横竖屏自由切换与多窗口。
- **适配步骤**：
  1. **放宽方向限制**：移除固定的 `screenOrientation`，让应用支持自由旋转。
  2. **游戏豁免**：确为游戏且需固定方向的，声明 `appCategory="game"`。
  3. **响应式布局**：用 `WindowSizeClass` / `ConstraintLayout` 适配不同窗口尺寸。
  4. **回归**：在大屏 / 折叠屏的展开 / 折叠、横竖切换下测试布局与状态保存。

---

## 三、适配检查清单（Checklist）

### A. 全局变更（所有应用，必做）

- [ ] 迁移明文流量到 Network Security Config（弃用 `usesCleartextTraffic`）
- [ ] 分享 / 拍照 Intent 显式添加 `FLAG_GRANT_READ/WRITE_URI_PERMISSION`
- [ ] Keystore 密钥设置有效期并定期清理，确认不超过 50,000（targetSdk 37）
- [ ] 旋转场景显式请求 IME 显示
- [ ] 触控板指针捕获按需求指定 `POINTER_CAPTURE_MODE_ABSOLUTE`
- [ ] 后台音频在可见 / 前台服务中调用并校验返回值
- [ ] 蓝牙同时监听 `ACTION_BOND_STATE_CHANGED` 与 `ACTION_KEY_MISSING`
- [ ] 在 `recycle()` 前完成 Parcel 全部读取
- [ ] 自定义 Parcelable 的 write / read 严格对称
- [ ] 实现 `onConfigurationChanged` 或声明 `recreateOnConfigChanges`
- [ ] 文件模式使用白名单组合（移除 `"rwa"` 等）
- [ ] 线程优先级钳制到 [-20, 19]

### B. 目标平台变更（targetSdk = 37，必做）

- [ ] 移除对 `MessageQueue.mMessages` 的反射；升级 Espresso 3.7.0+ / Robolectric 4.17+
- [ ] 移除运行时修改 `static final` 字段；升级 Mockito，弃用 PowerMock
- [ ] 通知自定义视图降采样 / 使用 `DecoratedCustomViewStyle`
- [ ] NPU 访问声明 `android.hardware.npu`
- [ ] 访问本地网络声明并请求 `ACCESS_LOCAL_NETWORK`
- [ ] OTP 短信迁移到 SMS Retriever / User Consent API
- [ ] 替换废弃 BAL 常量，显式指定 BAL 模式
- [ ] 确认证书已提交 CT 日志（或 NSC 关闭）
- [ ] 加载原生库前 `setWritable(false)`
- [ ] 大屏 / 多窗口放宽方向限制（游戏用 `appCategory="game"` 豁免）

### C. 测试与发布

- [ ] 在 Android 17 真机 / 模拟器验证
- [ ] 验证后台音频、Keystore 上限、Parcel 校验等边界场景
- [ ] 灰度发布并监控 crash / ANR 指标

---

*本文档基于 Android 17 行为变更整理，部分变更为「弃用 / 限制预告」，预计在 Android 18 正式生效。适配细节以 Android 17 正式版实际发布为准，建议在正式发布前于真机 / 模拟器完成回归验证。*
