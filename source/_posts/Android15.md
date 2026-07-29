---
title: Android 15 应用升级适配说明文档
date: 2026-07-29 14:00:00
tags:
 - Android 进阶
---

> 适用对象：计划将应用升级 / 适配到 Android 15（API 35）的 Android 开发团队
> 文档目标：明确 **所有应用** 与 **以 Android 15 为目标平台（targetSdk = 35）的应用** 各自需要完成的适配项。每个适配点按「背景 / 适用范围 / 变更内容 / 适配步骤」展开，说明**为什么要改**以及**具体怎么改**。

---

## 0. 文档导读

Android 15 的适配变更可分为两类，团队需按自身升级目标分别处理：

| 分类 | 触发条件 | 关键动作 |
| --- | --- | --- |
| **全局行为变更** | 在 Android 15 设备上**运行**（不论 targetSdk 是多少） | 最低 targetSdk 24、停止状态、16KB 页、预测性返回等 |
| **目标平台行为变更** | **targetSdk 升级到 35（Android 15）** 时生效 | 媒体处理前台服务、Edge-to-edge、后台启动限制等 |

**建议升级路径**：先确保应用能在 Android 15 设备上正常安装运行（全局变更），再逐步将 `targetSdkVersion` 提升到 35 并验证目标平台变更。

<!-- more -->

---

## 一、影响所有应用的行为变更（必做）

以下变更在 **Android 15 设备上运行即生效**，无论 `targetSdkVersion` 为多少。

### 1.1 最低可安装 targetSdk 级别提升为 24

- **背景**：Android 15 继续收紧最低可安装 Target SDK 级别（Android 14 已要求最低 23，15 进一步收紧到 24），目的是淘汰长期未维护、存在安全隐患的老旧应用。
- **适用范围**：Android 15 设备上的**所有应用**（安装环节）。
- **变更内容**：
  - `targetSdk < 24` 的应用**无法安装**。
  - 安装失败时的 Logcat 报错：
    ```
    INSTALL_FAILED_DEPRECATED_SDK_VERSION: App package must target at least SDK version 24, but found 7
    ```
  - 已升级到 Android 15 的设备上，系统会**保留**原先已安装的低 targetSdk 应用，不会强制卸载。
  - 调试阶段可用豁免命令临时绕过限制：`adb install --bypass-low-target-sdk-block FILENAME.apk`
- **适配步骤**：
  1. 打开模块级 `build.gradle`，确认 `android.defaultConfig.targetSdkVersion >= 24`；若低于 24，先提升到至少 24（建议直接规划到 35）。
  2. 在 Android 15 真机 / 模拟器上重新执行 `adb install`，确认不再出现 `INSTALL_FAILED_DEPRECATED_SDK_VERSION`。
  3. 若需临时调试旧包，使用 `adb install --bypass-low-target-sdk-block` 绕过（仅调试用途，不可作为发布方案）。

### 1.2 软件包停止状态（Force-Stop）变更

- **背景**：Android 15 针对 `PendingIntent` 增强了 force-stop（强制停止）机制，避免被停止的应用通过遗留的 PendingIntent 继续后台行为。
- **适用范围**：所有应用（涉及 PendingIntent、App Widget、BOOT_COMPLETED 监听）。
- **变更内容**：
  - 应用进入**停止状态**后，系统会**取消所有 PendingIntent**，并**禁用其 App Widget**（桌面小组件灰显）。
  - 移除停止状态后，系统**不再发送** `ACTION_BOOT_COMPLETED`，但应用可**重新注册**相关组件。
  - 对比验证：Android 14 force-stop 后 AMS 仍保留 PendingIntent；Android 15 后执行 `dumpsys activity intents` **无任何记录**。
- **适配步骤**：
  1. 在需要区分「是否被强制停止过」的场景，使用 `ApplicationStartInfo#wasForceStopped()` 判断，并据此**重建 PendingIntent**（如定时提醒、通知点击跳转）。
  2. 若应用依赖 `ACTION_BOOT_COMPLETED` 自启动来注册组件，改为在用户**主动启动应用**后重新注册，不要再依赖开机广播自动恢复。
  3. 涉及 App Widget 的逻辑，在停止状态恢复后主动刷新 / 重建 Widget，避免长期灰显。

### 1.3 资源受限时 direct / offload 音轨失效

- **背景**：Android 15 之前，仅**新创建**的音频音轨会在系统音频资源达到上限时创建失败；Android 15 起，**已经创建**的 direct / offload 模式 `AudioTrack` 在资源达限后也会**失效**。
- **适用范围**：所有应用，重点影响使用 offload 播放（硬件直出、低功耗播放）的音频类应用。
- **变更内容**：当音频资源（如并发音轨数、offload 会话数）达到系统上限，已存在的 direct / offload `AudioTrack` 会被标记为失效，继续写入会失败或无声。
- **适配步骤**：
  1. 检索代码中所有 `AudioTrack` / `AudioRecord` 的 direct、offload 用法，明确资源占用点。
  2. 监听音频资源状态变化，在音轨失效后执行**重建**（重新创建 AudioTrack）或**降级**（切回普通播放模式）逻辑，而非假设音轨长期有效。
  3. 在资源受限场景（多音轨并发、长时 offload 播放）下做回归测试，确认无声 / 崩溃不再发生。

### 1.4 支持 16KB Page Size（页大小）

- **背景**：Android 15 起系统支持 **16KB 页大小**设备，设备厂商将跟随 Google 节奏在部分机型启用。16KB 页能带来性能与功耗收益。
- **适用范围**：所有包含 **so 库**（native 动态库）的应用；纯 Java/Kotlin 应用不受影响。
- **变更内容**：
  - 收益数据：启动时间降低 **3.16%**、功耗降低 **4.56%**、相机启动加快、系统启动缩短 **1.5%**。
  - 风险：包含 so 库但未做 16KB ELF 对齐的应用，在 16KB 页设备上会 **crash**。
  - 参考：https://developer.android.com/guide/practices/page-sizes?hl=zh-cn
- **适配步骤**：
  1. **检查是否受影响**：使用 **APK Analyzer** 分析发布包，查看 `lib/` 下是否含 `.so` 文件；只要含 so 库即受影响。
  2. **更新构建配置**：
     - 使用 **AGP ≥ 8.3**（默认对共享库不压缩）；若使用 AGP 8.2 及以下，需手动处理压缩配置。
     - 确保 so 库生成 **16KB ELF 对齐**（对齐到 16KB 页边界）。
     - 检查代码中是否存在**依赖页大小**的硬编码逻辑（如按 4KB 假设内存映射），按实际页大小动态获取。
  3. **测试验证**：在 **基于 16KB 的 Android 15 模拟器镜像** 上安装并运行，确认不再 crash，且音频 / 渲染等 native 功能正常。

### 1.5 默认开启预测性返回动画（Predictive Back）

- **背景**：Android 15 全面开放预测性返回手势，并**移除开发者选项开关**，系统默认启用。目的是让用户在执行「返回」前就能看到目标预览（如返回主屏幕、返回上一页的动画）。
- **适用范围**：所有应用。
- **变更内容**：启用后，系统会拦截返回手势并先播放**系统级返回动画**（例如桌面缩略、上一页预览），再将返回事件交给应用。若应用未适配，返回动画会生硬或回退到旧行为。
- **适配步骤**：
  1. **迁移到预测性返回手势**：不再依赖旧的 `onBackPressed()` 拦截，改用 `OnBackPressedDispatcher`（或 `onBackInvokedDispatcher`）。
  2. **Fragment 转场**：为 Fragment 切换配置共享元素 / 转场动画，使返回时能正确预览上一页面。
  3. **改用 Animator 与 AndroidX 转场（Transition）**：自定义返回动画时使用 `Animator` 和 AndroidX Transition，而非已废弃的过渡方式。
  4. **使用 FragmentManager / Navigation 管理返回栈**：确保返回栈完整，系统才能正确生成「返回上一页」预览。
  - 参考：https://developer.android.google.cn/guide/navigation/custom-back/predictive-back-gesture?hl=zh-cn

---

## 二、以 Android 15 为目标平台的行为变更（targetSdk = 35 时生效）

当 `targetSdkVersion` 升级到 **35** 后，下列变更才会生效，需重点验证。

### 2.1 新的媒体处理前台服务类型 `mediaProcessing`

- **背景**：Android 15 完善前台服务类型体系，新增 `mediaProcessing` 类型，用于媒体文件处理（转码、转封装、压缩等）场景，并施加使用时长约束，防止长时间占用。
- **适用范围**：`targetSdk >= 35` 且使用前台服务处理媒体文件的应用。
- **变更内容**：
  - 新类型 `mediaProcessing`，**24 小时内累计最多 6 小时**。
  - 超时系统回调 `Service.onTimeout()`；若未在超时内停止服务，将**抛出异常**。
  - 用户将应用切到前台会**重置计时**。
  - 参考：https://developer.android.com/about/versions/15/changes/foreground-service-types#media-processing
- **适配步骤**：
  1. **声明权限与服务类型**（Manifest）：
     ```xml
     <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
     <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
     <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROCESSING" />

     <service
         android:name=".MyService"
         android:foregroundServiceType="mediaProcessing" />
     ```
  2. **实现超时处理**：在 `Service` 中重写 `onTimeout()`，及时停止服务并释放资源，避免抛异常导致崩溃。
  3. **控制使用时长**：将单次媒体处理任务切分为短时任务，或在用户交互驱动下运行，避免逼近 6 小时上限。
  4. **考虑替代方案**：若处理逻辑不强制前台，改用 `WorkManager` 调度，规避前台服务时长限制。

### 2.2 `BOOT_COMPLETED` 启动前台服务限制

- **背景**：Android 15 前已禁止开机广播启动 microphone 类型前台服务；Android 15 进一步收紧，仅允许少数必要类型在 `BOOT_COMPLETED` 时启动。
- **适用范围**：`targetSdk >= 35` 且监听 `BOOT_COMPLETED` 启动前台服务的应用。
- **变更内容**：
  - 广播接收方在开机完成后**仅可启动**以下类型前台服务：
    `LOCATION`、`CONNECTED_DEVICE`、`REMOTE_MESSAGING`、`HEALTH`、`SYSTEM_EXEMPTED`、`SPECIAL_USE`
  - 启动其他类型会抛 **`ForegroundServiceStartNotAllowedException`**。
  - 使用 `SYSTEM_ALERT_WINDOW` 悬浮窗时，需窗口**可见**（`View.getWindowVisibility()`）。
- **适配步骤**：
  1. **审查启动类型**：检查 `BOOT_COMPLETED` 接收器中启动的前台服务类型，若不属于上述白名单类型，必须移除该启动逻辑。
  2. **改用合规触发**：将后台初始化任务改为用户启动应用后执行，或用 `WorkManager` / `AlarmManager` 在合规时机调度。
  3. **悬浮窗可见性**：若使用 `TYPE_APPLICATION_OVERLAY` 悬浮窗，确保调用时窗口可见（`View.getWindowVisibility() == View.VISIBLE`），否则同样受限。

### 2.3 请求音频焦点的限制

- **背景**：Android 15 限制后台应用请求音频焦点，防止不可见应用抢占音频输出。
- **适用范围**：`targetSdk >= 35` 的所有音频应用。
- **变更内容**：
  - 必须处于**前台**，或运行**音频相关前台服务**（`mediaPlayback` / `camera` / `microphone` / `phoneCall`）才能请求音频焦点，否则返回 **`AUDIOFOCUS_REQUEST_FAILED`**。
  - 典型日志：`Focus request DENIED for uid:10301`
- **适配步骤**：
  1. **确保前台 / 前台服务**：在调用 `AudioManager.requestAudioFocus()` 前，确认应用处于前台 Activity，或已启动对应的音频相关前台服务。
  2. **调整请求时机**：将音频焦点请求移到用户交互（播放按钮）或前台服务启动之后，而非在后台广播 / Job 中请求。
  3. **处理失败返回**：对 `AUDIOFOCUS_REQUEST_FAILED` 做降级处理（如延迟请求、提示用户回到前台），避免直接忽略导致无声或异常。

### 2.4 `elegantTextHeight` 属性默认 `true`

- **背景**：Android 15 将 `TextView` 的 `elegantTextHeight` 默认值改为 `true`，采用更宽松的字体排布。
- **适用范围**：`targetSdk >= 35`。
- **变更内容**：
  - 默认 `true`（宽松字体排版）。
  - 对**中文无影响**。
  - 显式设为 `false` 仍可，但**未来版本可能不再支持**。
- **适配步骤**：
  1. **中文应用**：无需改动，默认效果即可。
  2. **特殊脚本语言**（如部分东南亚、复杂文字）应用：在 `true` 默认值下测试文本显示，确认排布符合预期；确有需要临时回退的，显式设置 `false` 但需预留未来兼容方案。

### 2.5 Edge-to-edge（边到边）强制执行

- **背景**：Android 15 对 `targetSdk >= 35` 的应用**强制**边到边全屏布局，状态栏与导航栏区域交给应用自行处理。
- **适用范围**：`targetSdk >= 35`。
- **变更内容**：
  - 强制全屏，状态栏 / 导航栏**透明化**。
  - `setStatusBarColor()` **失效**（不再改变状态栏颜色）。
  - `setNavigationBarColor()` 仅在三键导航模式下有效，手势导航下无效。
- **适配步骤**：
  1. **非 Compose（传统 View）**：在根布局或需要处理系统栏的视图上设置 `android:fitsSystemWindows="true"`，让内容避开状态栏 / 导航栏区域。
  2. **Compose**：
     - 使用 **Material 3** 组件，系统会自动处理系统栏 padding；
     - 使用 **Material 2** 时，需自行通过 `WindowInsets` 处理 padding（如 `Modifier.windowInsetsPadding(WindowInsets.systemBars)`）。
  3. **颜色与图标**：通过 `WindowInsetsController` 设置状态栏 / 导航栏图标明暗，而非旧的颜色 API。

### 2.6 稳定的 configuration

- **背景**：Android 15 规范了 `screenWidthDp` / `screenHeightDp` 等配置字段的语义，使其**稳定包含系统栏区域**（边到边时除外）。
- **适用范围**：`targetSdk >= 35`。
- **变更内容**：
  - `screenWidthDp` / `screenHeightDp` 现在**包含系统栏区域**（边到边全屏时不包含）。
  - 同样影响 `smallestScreenWidthDp` 等依赖配置尺寸的字段。
- **适配步骤**：
  1. **停止依赖旧配置尺寸**：不要再直接用 `screenWidthDp` 等判断可用区域，尤其不要假设它等于可视区域。
  2. **改用正确 API**：通过 `ViewGroup`、`WindowInsets`、`WindowMetricsCalculator` 获取真实可视尺寸：
     ```kotlin
     val metrics = WindowMetricsCalculator.getOrCreate()
         .computeCurrentWindowMetrics(activity)
     val bounds = metrics.bounds // 真实窗口尺寸
     val insets = WindowInsetsCompat.toWindowInsetsCompat(
         activity.window.decorView.rootWindowInsets, ...
     )
     ```
  3. **回归布局**：检查所有基于 `smallestScreenWidthDp` 等资源限定符的布局，确认在边到边下显示正确。

### 2.7 限制非 SDK 接口更新

- **背景**：Android 9 起持续限制使用非 SDK（hidden / 灰名单）接口；Android 15 更新了受限名单。
- **适用范围**：所有使用了反射访问隐藏 API 的应用。
- **变更内容**：更多方法 / 字段被移入黑名单（blacklist），运行时访问会抛 `NoSuchMethodException` / `NoSuchFieldException` 或崩溃。
- **适配步骤**：
  1. **定位使用点**：根据 `Accessing hidden field` / `NoSuchMethodException` 日志，找出访问非 SDK 接口的代码。
  2. **迁移到公开 API**：用官方公开 SDK 替代（如替换 `@hide` 方法为公开等价方法）。
  3. **必要时申请新 API**：若无公开替代，评估通过官方渠道申请新公开 API。
  4. **对照最新名单**：https://dl.google.com/developers/android/vic/non-sdk/hiddenapi-flags.csv

### 2.8 OpenJDK 17 变更

- **背景**：Android 15 运行时切换到 **OpenJDK 17**，部分 Java 标准库行为收紧。
- **适用范围**：`targetSdk >= 35`（实际运行在 Android 15 上即受影响）。
- **变更内容**：
  - `String.format` / `Formatter` 校验更严格：`%0` 这类写法会抛 **`IllegalFormatArgumentIndexException`**。
  - `Locale` 语言代码更新：`he` / `yi` / `id` 替代旧码 `iw` / `ji` / `in`。
  - `Random.ints()` 等序列生成方式变更（结果序列不同）。
- **适配步骤**：
  1. **修复格式化代码**：全局搜索 `String.format` / `Formatter` 中的 `%0$` 等非法索引写法，改为合法索引（如 `%1$s`）。
  2. **更新 Locale 代码**：将 `iw` / `ji` / `in` 替换为 `he` / `yi` / `id`。
  3. **校验随机逻辑**：排查依赖 `Random.ints()` 固定序列的逻辑（如测试桩、协议盐），确认行为变化不影响功能。

### 2.9 安全的后台 Activity 启动

- **背景**：Android 15 加强后台启动 Activity 的安全限制，防止不可见 / 跨 UID 应用在后台弹出界面。
- **适用范围**：`targetSdk >= 35`。
- **变更内容**：
  - `allowCrossUidActivitySwitchFromBelow = false` 阻止跨 UID 后台启动。
  - `PendingIntent` 的**创建者 / 发送者**可被授予后台启动权限。
  - 防止**不可见窗口**在后台启动 Activity。
- **适配步骤**：
  1. **梳理后台启动场景**：列出所有从通知、PendingIntent、后台服务启动 Activity 的路径（推送点击、深链接等）。
  2. **确保可见性 / 权限合规**：用户交互触发的 PendingIntent 通常具备权限；纯后台无交互的启动需改为通知或前台服务引导。
  3. **测试验证**：在 targetSdk 35 设备上实测各后台启动路径，确认不再被系统拦截（出现 `Background activity start ... blocked` 日志即需调整）。

---

## 三、适配检查清单（Checklist）

### A. 全局变更（所有应用，必做）

- [ ] `targetSdkVersion >= 24`（否则无法安装）
- [ ] 验证 force-stop 后 PendingIntent / Widget 重建逻辑（结合 `wasForceStopped()`）
- [ ] 音频类应用：处理 direct / offload 音轨资源受限失效
- [ ] 含 so 库应用：完成 **16KB ELF 对齐**并在 16KB 模拟器验证无 crash
- [ ] 接入**预测性返回手势**（Fragment / Navigation / Animator 转场）

### B. 目标平台变更（targetSdk = 35，必做）

- [ ] 媒体处理前台服务：用 `mediaProcessing` 类型 + 实现 `onTimeout`
- [ ] 移除 `BOOT_COMPLETED` 启动受限前台服务的逻辑
- [ ] 音频焦点请求确保前台 / 音频前台服务
- [ ] 特殊脚本语言文本验证 `elegantTextHeight = true`
- [ ] 完成 **Edge-to-edge** 适配（`fitsSystemWindows` / Material3）
- [ ] 尺寸获取改用 `WindowInsets` / `WindowMetricsCalculator`
- [ ] 排查并替换受限非 SDK 接口
- [ ] 修复 `%0` 等 `String.format` 写法、Locale 旧语言码
- [ ] 测试后台 Activity 启动可见性 / 权限

### C. 测试与发布

- [ ] 在 Android 15 真机 / 模拟器验证
- [ ] 在 Pixel + 16KB 模拟器验证
- [ ] 灰度发布并监控 crash / ANR 指标

---

*本文档基于 Android 15 行为变更整理，适配细节以 Android 15 正式版实际发布为准。建议在正式发布前于真机 / 模拟器完成回归验证。*
