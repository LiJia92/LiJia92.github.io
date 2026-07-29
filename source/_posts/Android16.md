---
title: Android 16 应用升级适配说明文档
date: 2026-07-29 15:00:00
tags:
 - Android 进阶
---

> 适用对象：计划将应用升级 / 适配到 Android 16（API 36）的 Android 开发团队
> 文档目标：明确 **所有应用** 与 **以 Android 16 为目标平台（targetSdk = 36）的应用** 各自需要完成的适配项。每个适配点按「背景 / 适用范围 / 变更内容 / 适配步骤」展开，说明**为什么要改**以及**具体怎么改**。

---

## 0. 文档导读

Android 16 的适配变更可分为两类，团队需按自身升级目标分别处理：

| 分类 | 触发条件 | 关键动作 |
| --- | --- | --- |
| **全局行为变更** | 在 Android 16 设备上**运行**（不论 targetSdk 是多少） | MediaProjection 锁屏停止、Intent 重定向防护、16KB 页、ART 变更、预测性返回等 |
| **目标平台行为变更** | **targetSdk 升级到 36（Android 16）** 时生效 | Edge-to-edge 退出选项停用、健康权限细化、大屏自适应、预测性返回迁移等 |

**建议升级路径**：先确保应用能在 Android 16 设备上正常安装运行（全局变更），再将 `compileSdkVersion` / `targetSdkVersion` 提升到 **36** 并验证目标平台变更。可利用系统提供的兼容性切换开关（通过 adb 管理）分阶段验证。

<!-- more -->

---

## 一、影响所有应用的行为变更（必做）

以下变更在 **Android 16 设备上运行即生效**，无论 `targetSdkVersion` 为多少。

### 1.1 锁屏后 MediaProjection 被自动停止

- **背景**：Android 16 加强 MediaProjection（投屏 / 录屏）的隐私安全：投 / 录屏时状态栏显示醒目标志，且电源键锁屏或长时间搁置自然锁屏后，系统会**自动停止** MediaProjection，防止用户在不知情下被持续录制。
- **适用范围**：所有使用 `MediaProjection` 进行投屏 / 录屏的应用。
- **变更内容**：
  - 新增 `MediaProjectionStopController` 管控停止逻辑。
  - 息屏，或「先打电话 → 投屏 / 录屏 → 挂断电话」等场景，MediaProjection 都会被 stop。
  - 参考：https://developer.android.com/media/grow/media-projection#status_bar_chip_auto_stop
- **适配步骤**：
  1. **实现停止回调**：注册 `MediaProjection.Callback`，在 `onStop()` 中清理录屏资源、更新 UI 状态（如停止录制按钮、释放 `VirtualDisplay`）。
     ```kotlin
     mediaProjection.registerCallback(object : MediaProjection.Callback() {
         override fun onStop() {
             // 释放 VirtualDisplay、MediaRecorder，更新 UI
         }
     }, mainHandler)
     ```
  2. **重建流程**：因锁屏导致停止后，若需继续，提示用户重新授权 MediaProjection（每次重建需重新走授权）。
  3. **测试覆盖**：重点测试「投屏中按电源键锁屏」「通话中投屏挂断」两类场景，确认 `onStop()` 被触发且应用不崩溃。

### 1.2 提高了对 Intent 重定向攻击的安全性

- **背景**：Intent 重定向漏洞利用 Parcelable 嵌套 Intent 绕过安全检查，将敏感 Intent 传递给其他应用的非导出组件。Android 16 提供**默认安全防护**。
- **适用范围**：所有应用（正常启动流程兼容性影响小；嵌套 Intent 启动其他应用非导出组件会受影响）。
- **变更内容**：
  - 默认安全增强，无需额外配置即可防御大部分重定向攻击。
  - 源码变动涉及 `ActivityStarter`、`Intent`、`BaseBundle`、`ClipData` 四个类。
  - 新 API `removeLaunchSecurityProtection()` 可**主动停用**保护（仅 Android 16 SDK 及以上），但不建议调用：
    ```kotlin
    val i = intent
    val iSublevel: Intent? = i.getParcelableExtra("sub_intent")
    iSublevel?.removeLaunchSecurityProtection() // 退出加固（谨慎使用）
    iSublevel?.let { startActivity(it) }
    ```
- **适配步骤**：
  1. **不要调用 `removeLaunchSecurityProtection()`**：保留系统默认加固，除非有充分理由且已评估风险。
  2. **替换嵌套 Intent 启动非导出组件**：原「通过嵌套 Intent 把 Intent 发给其他应用去启动其非导出组件」的方式在 Android 16 后失效，改为：
     - 直接在自己应用内处理，或使用**导出且经校验**的组件；
     - 通过 `Intent` 显式指定目标 `ComponentName` 并校验调用方。
  3. **回归安全逻辑**：测试跨应用跳转、分享、深链接等路径，确认未被加固拦截正常功能。

### 1.3 支持 16KB Page Size

- **背景**：Android 15 起支持 16KB 页大小；Android 16 设备将逐步采用，建议尽早适配以免常规启动失败。
- **适用范围**：所有包含 **so 库**的应用。
- **变更内容**：
  - 收益：启动时间降低 3.16%、功耗降低 4.56%、相机启动加快、系统启动缩短 1.5%。
  - 风险：含 so 库且未做 16KB 对齐的应用，在 16KB 设备上会 **crash**。
  - 参考：https://developer.android.com/guide/practices/page-sizes?hl=zh-cn
- **适配步骤**：
  1. **检查是否受影响**：用 **APK Analyzer** 检查发布包 `lib/` 下是否含 `.so`，含则受影响。
  2. **更新构建**：AGP ≥ 8.3 默认对共享库不压缩；确保生成 **16KB ELF 对齐**的 so 库；检查依赖页大小的硬编码逻辑。
  3. **测试验证**：在 **基于 16KB 的 Android 15/16 模拟器镜像** 上运行，确认无 crash，native 功能正常。

### 1.4 ART 内部变更

- **背景**：Android 16 更新了 ART 运行时，依赖 ART 内部结构的第三方库 / 自写代码可能崩溃。
- **适用范围**：所有依赖 ART 内部结构（而非公开 API）的应用，尤其是使用了特定反射黑科技的库。
- **变更内容**：
  - 典型报错：`Fatal signal 11 (SIGSEGV)`，栈中可见 `com.mob.tools`、`.cn.fly.tools` 等。
  - 已知受影响库：`HiddenApiBypass`、旧版 `FlyCore`（v2025.0224.1629 之前）。
  - `Class.java` 将 `iFields` 与 `sFields` 合并为 `fields`，反射这些私有变量会返回空指针。
  - 谷歌强调：更新库并非正确解法，应寻找公共 API。
- **适配步骤**：
  1. **排查 ART 内部依赖**：搜索代码中反射 `iFields` / `sFields` 等私有成员、或调用 `HiddenApiBypass` 的地方。
  2. **改用公开 API**：用 `Class.getDeclaredFields()` 获取字段（不受合并影响），删除对 `iFields` / `sFields` 的直接访问。
  3. **升级第三方库**：将 `HiddenApiBypass`、旧版 `FlyCore` 等更新到已兼容 Android 16 的版本；若库无更新，联系厂商或替换方案。
  4. **回归**：在 Android 16 上测试含这些库的页面，确认无 `SIGSEGV`。

### 1.5 setImportantWhileForeground 失效

- **背景**：`setImportantWhileForeground(true)` 自 API 31 废弃，Android 16 起**忽略**该调用并返回 `false`。
- **适用范围**：所有使用 `WorkManager` / `JobScheduler` 加急作业的应用。
- **变更内容**：原来的「前台期间作业重要」语义不再生效，需改用 `setExpeded(true)` 声明加急作业。
- **适配步骤**：
  1. **替换调用**：
     ```kotlin
     // 旧写法（已失效）
     builder.setImportantWhileForeground(true)
     // 新写法
     builder.setExpedited(true)
     ```
  2. **确认加急约束**：`setExpedited` 作业有执行时长上限，且需 `FOREGROUND_SERVICE` 类型权限配合；检查作业是否能在限制内完成。
  3. **回归**：验证关键后台任务（如上传、同步）在 Android 16 上仍能及时执行。

### 1.6 JobScheduler 配额优化

- **背景**：Android 16 根据应用待机分桶（standby bucket）、顶部状态、前台服务情况调整运行时配额，限制后台资源滥用。
- **适用范围**：所有使用 `WorkManager`、`JobScheduler`、`DownloadManager` 的应用。
- **变更内容**：配额收紧影响作业运行频率；新增 `getPendingJobReasonsHistory` 便于排查作业为何未运行。
- **适配步骤**：
  1. **检查作业依赖**：梳理关键后台任务，确认其运行频率仍在配额内。
  2. **adb 覆盖测试**：用 override 命令在调试时放开配额，验证功能逻辑：
     - 例如 `OVERRIDE_QUOTA_ENFORCEMENT_TO_TOP_STARTED_JOBS` 等。
  3. **设置待机分桶调试**：`am set-standby-bucket <package> <bucket>` 模拟不同分桶下的配额表现。
  4. **优化调度**：对实时性要求高的任务改用前台服务或加急作业，而非依赖宽松的后台配额。

### 1.7 被废弃的空作业停止原因

- **背景**：`JobParameters` 被 GC 但未调用 `jobFinished` 视为「废弃」作业，Android 16 新增对应停止原因。
- **适用范围**：所有自定义 `JobService` 的应用。
- **变更内容**：新增停止原因 `STOP_REASON_TIMEOUT_ABANDONED`（WorkManager 等框架托管的作业不受影响）。
- **适配步骤**：
  1. **确保调用 `jobFinished`**：在每个 `onStopJob` / 任务结束时显式调用 `jobFinished(params, false)`，避免作业被判定为废弃。
  2. **可选检测**：在日志 / 监控中记录 `STOP_REASON_TIMEOUT_ABANDONED`，定位未正确结束的作业泄漏。

### 1.8 弃用干扰性的无障碍公告

- **背景**：`announceForAccessibility` 和 `TYPE_ANNOUNCEMENT` 会打断屏幕阅读器、产生干扰性播报，Android 16 将其废弃。
- **适用范围**：所有使用了无障碍公告 API 的应用。
- **变更内容**：需改用更语义化的无障碍 API 替代全局公告。
- **适配步骤**：
  1. **窗口 / 区域标题**：为容器设置无障碍窗格标题，屏幕阅读器在焦点进入时自动播报：
     ```kotlin
     ViewCompat.setAccessibilityPaneTitle(container, "搜索结果")
     ```
  2. **实时内容更新**：对动态变化区域设置实时区域类型：
     ```kotlin
     ViewCompat.setAccessibilityLiveRegion(textView, ViewCompat.ACCESSIBILITY_LIVE_REGION_POLITE)
     ```
  3. **错误提示**：表单校验错误等，改用错误事件（`setError`）而非 `announceForAccessibility`。
  4. **移除旧调用**：全局搜索并删除 `announceForAccessibility` 与 `TYPE_ANNOUNCEMENT` 用法。

### 1.9 有序广播优先级范围不再是全局

- **背景**：限制跨进程广播优先级滥用，防止应用通过高 priority 抢占系统 / 其他应用的广播处理顺序。
- **适用范围**：所有发送 / 接收有序广播（`sendOrderedBroadcast`）的应用。
- **变更内容**：`android:priority` 或 `setPriority()` 仅**同进程内**有效，跨进程不再保证顺序。
- **适配步骤**：
  1. **排查跨进程优先级依赖**：检查是否有依赖「高 priority 抢在别的应用前处理广播」的逻辑。
  2. **改为同进程或显式通信**：将需有序处理的逻辑收敛到同进程；跨应用协调改用 `ContentProvider` / `Bound Service` / 显式 `PendingIntent`。
  3. **回归**：测试广播接收顺序是否符合预期，不再假设跨进程优先级生效。

### 1.10 预测性返回支持三键导航

- **背景**：Android 15 已在手势导航下支持预测性返回；Android 16 扩展到**三键导航**（长按后退键触发预测动画）。
- **适用范围**：所有应用（默认系统行为）。
- **变更内容**：三键导航长按后退也会播放系统级返回预览；不适配需在 Manifest 声明 `android:enableOnBackInvokedCallback="false"`。
- **适配步骤**：
  1. **默认适配（推荐）**：在 Manifest 的 `<application>` 或 `<activity>` 设置 `android:enableOnBackInvokedCallback="true"`，并迁移到 `OnBackPressedDispatcher` / `onBackInvokedDispatcher`。
  2. **自定义返回逻辑**：用 `OnBackInvokedDispatcher.registerOnBackInvokedCallback` 注册返回回调，替换旧 `onBackPressed()` 拦截。
  3. **暂不启用时的声明**：若短期内无法适配，显式声明 `false`（但建议尽快迁移，避免未来强制）。

### 1.11 桌面窗口模式

- **背景**：Android 16 引入桌面窗口模式（自由窗口、多窗口并行等），应用运行在可缩放的自由窗口中。
- **适用范围**：所有应用（运行在支持桌面模式的设备上）。
- **变更内容**：应用需正确响应窗口尺寸变化、多窗口状态、配置变更，否则会出现布局错乱或状态丢失。
- **适配步骤**：
  1. **支持动态尺寸**：布局使用 `ConstraintLayout` / `WindowSizeClass` 等响应式方案，避免硬编码尺寸。
  2. **正确处理配置变更**：在 `onConfigurationChanged` 中更新布局与资源，必要时保存 / 恢复状态。
  3. **多窗口测试**：在桌面模式 / 分屏下测试核心流程，确认缩放、输入、弹窗正常。

### 1.12 更新对 non-SDK API 的限制

- **背景**：Android 9 起限制非 SDK 接口，Android 16 扩充受限名单（V → W 阶段新增屏蔽 6 个 API）。
- **适用范围**：所有使用反射访问隐藏 API 的应用。
- **变更内容**：新增屏蔽如 `BluetoothLeScanner.startTruncatedScan`、`Thread` 部分方法等。
- **适配步骤**：
  1. **定位使用点**：根据 `Accessing hidden field` / `NoSuchMethodException` 日志定位访问代码。
  2. **迁移公开 API**：用官方公开等价方法替换；例如蓝牙扫描改用标准 `startScan` API。
  3. **对照最新名单**：https://dl.google.com/developers/android/vic/non-sdk/hiddenapi-flags.csv

---

## 二、以 Android 16 为目标平台的行为变更（targetSdk = 36 时生效）

当 `targetSdkVersion` 升级到 **36** 后，下列变更才会生效，需重点验证。

### 2.1 Edge-to-edge 退出选项被停用

- **背景**：Android 15 起强制边到边；Android 16 进一步**停用**退出边到边的开关，应用无法再「 opt-out 」回旧的全屏行为。
- **适用范围**：`targetSdk >= 36`。
- **变更内容**：`R.attr#windowOptOutEdgeToEdgeEnforcement` 被停用，设置无效。
- **适配步骤**：
  1. **Compose Material 3**：自动处理系统栏，无需额外操作。
  2. **Compose Material 2**：自行处理 padding，使用 `WindowInsets` 避开状态栏 / 导航栏。
  3. **传统 View**：使用 `ViewCompat.setOnApplyWindowInsetsListener` 消费窗口插图并调整内容边距，不要再用失效的 opt-out 属性。
  4. **验证**：确认状态栏 / 导航栏区域内容不被遮挡、可交互。

### 2.2 Health and fitness 权限细化

- **背景**：Android 16 将 `BODY_SENSORS` 拆分为 `android.permissions.health` 下的细粒度健康权限，提升用户隐私可控性。
- **适用范围**：`targetSdk >= 36` 且访问健康 / 体征数据的应用。
- **变更内容**：`BODY_SENSORS` 不再作为单一权限使用，需请求具体权限（如 `READ_HEART_RATE`）；后台读取需 `READ_HEALTH_DATA_IN_BACKGROUND`。
- **适配步骤**：
  1. **替换权限声明**：在 Manifest 中将 `BODY_SENSORS` 替换为具体权限，例如：
     ```xml
     <uses-permission android:name="android.permission.health.READ_HEART_RATE" />
     ```
  2. **运行时请求**：按场景向用户申请对应细粒度权限，而非一次性索取全部。
  3. **后台场景**：若需在后台读取，额外申请 `READ_HEALTH_DATA_IN_BACKGROUND` 并在前台明确告知用途。

### 2.3 大屏自适应应用

- **背景**：Android 16 强化大屏自适应，忽略方向 / 尺寸限制属性，推动应用在全场景可用。
- **适用范围**：`targetSdk >= 36`（游戏类除外）。
- **变更内容**：`screenOrientation` 等方向 / 尺寸限制属性被忽略，应用需支持横竖屏自由切换与多窗口。
- **适配步骤**：
  1. **放宽方向限制**：移除 `screenOrientation` 固定方向声明，或仅对确实不支持的方向做内容层适配。
  2. **游戏豁免**：若确为游戏且需固定方向，声明 `appCategory="game"` 以保留豁免。
  3. **opt-out（如必须）**：通过 `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` 临时退出，但需注意状态保存。
  4. **多窗口测试**：在大屏 / 折叠屏上测试布局与状态保存恢复。

### 2.4 Fixed rate 定时任务调度优化

- **背景**：Android 16 优化 `scheduleAtFixedRate` 的补偿调度，避免后台任务被滥用持续追赶。
- **适用范围**：`targetSdk >= 36` 使用 `ScheduledExecutorService.scheduleAtFixedRate` 的应用。
- **变更内容**：`scheduleAtFixedRate` 最多**补发一次**错过的周期，不再无限追赶。
- **适配步骤**：
  1. **主动计算错过周期**：不要依赖框架自动补齐，在任务中根据当前时间计算应处理的周期数。
  2. **或换定时器**：对精确周期要求高的场景，改用 `Handler` / `AlarmManager` 精确调度。
  3. **回归**：验证长时间后台后任务不会突增，也不会遗漏关键处理。

### 2.5 迁移到或停用预测性返回

- **背景**：Android 16 默认 `enableOnBackInvokedCallback = true`；未声明时，`onBackPressed()` **不再回调**，旧返回拦截失效。
- **适用范围**：`targetSdk >= 36`。
- **变更内容**：默认开启预测性返回；若仍用 `onBackPressed()` 且未声明回调启用，返回键将直接结束 Activity 而不进入自定义逻辑。
- **适配步骤**：
  1. **Manifest 声明**：在 `<application>` 或 `<activity>` 设置 `android:enableOnBackInvokedCallback="true"`。
  2. **迁移返回逻辑**：用 `OnBackPressedDispatcher.addCallback` 或 `onBackInvokedDispatcher.registerOnBackInvokedCallback` 接管返回（同 1.10）。
  3. **删除旧拦截**：移除对 `onBackPressed()` 的依赖，避免逻辑失效。

### 2.6 ElegantTextHeight 属性废弃

- **背景**：Android 16 将 `elegantTextHeight` 属性废弃并**忽略**，统一字体排布行为。
- **适用范围**：`targetSdk >= 36`。
- **变更内容**：属性废弃且被忽略，影响部分亚洲语言（如泰语等复杂文字）的排布。
- **适配步骤**：
  1. **汉语应用**：无影响，无需处理。
  2. **其他亚洲语言**：默认沿用 Android 15 的显示效果；确认复杂文字在该效果下排布可接受，无需显式设置该属性。

---

## 三、适配检查清单（Checklist）

### A. 全局变更（所有应用，必做）

- [ ] 投 / 录屏：实现 `MediaProjection.Callback.onStop()` 响应锁屏自动停止
- [ ] 排查嵌套 Intent 启动非导出组件，改用公共方式
- [ ] 含 so 库应用：完成 **16KB ELF 对齐**并在 16KB 模拟器验证无 crash
- [ ] 反射代码改用 `getDeclaredFields()`，移除对 ART 内部结构的依赖
- [ ] 前台加急作业改用 `setExpedited(true)` 替代 `setImportantWhileForeground`
- [ ] 验证 JobScheduler / WorkManager 配额行为
- [ ] 用 `setAccessibilityPaneTitle` / `setAccessibilityLiveRegion` 替换无障碍公告
- [ ] 不依赖跨进程有序广播优先级
- [ ] 接入**预测性返回**（含三键导航长按返回）
- [ ] 适配桌面窗口 / 多窗口场景
- [ ] 排查并替换受限 non-SDK 接口

### B. 目标平台变更（targetSdk = 36，必做）

- [ ] 完成 **Edge-to-edge** 适配（Compose M3 / M2 padding / ViewCompat 窗口插图）
- [ ] 健康权限迁移到 `android.permissions.health` 细粒度权限
- [ ] 大屏 / 多窗口：处理 `screenOrientation` 被忽略的场景
- [ ] `scheduleAtFixedRate` 周期任务处理补发限制
- [ ] 确认 `enableOnBackInvokedCallback` 配置与返回逻辑迁移
- [ ] 验证 `elegantTextHeight` 对其他亚洲语言排布的影响

### C. 测试与发布

- [ ] 在 Android 16 真机 / 模拟器验证
- [ ] 在 16KB 模拟器验证含 so 库应用无 crash
- [ ] 灰度发布并监控 crash / ANR 指标

---

*本文档基于 Android 16 行为变更整理，适配细节以 Android 16 正式版实际发布为准。建议在正式发布前于真机 / 模拟器完成回归验证。*
