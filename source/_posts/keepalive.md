---
title: Android 保活设置适配
date: 2019-09-06 14:39:09
tags:
 - 日常开发
---
随着 Android 开发的越来越规范，那些“黑科技”的保活手段基本没什么用了，所以只能通过引导，让用户自己去设置相关保活的选项，就像 Rom 的白名单。只不过白名单是系统帮你设置，没有白名单就得自己去引导了。保活相关的一般包含**自启动**和**防睡眠**，当然功能在各个 Rom 的描述不尽相同，不用纠结于此。
针对各大厂商，做了一些准备工作，如下。

## 三星
1. Galaxy S10+：SM-G9750，Android 9
2. Galaxy Note8：SM-N9500，Android 8.0.0
3. Galaxy Note9：SM-N9600，Android 8.1.0
4. C7：Android 8，Sumsang Experience 版本
5. S8：Android 8，Sumsang Experience 版本（没有自启动）

智能管理器->电池->未监视的应用程序->添加应用程序：添加后，应用处于后台时系统不会休眠应用
智能管理器->自动运行应用程序：打开允许后，若应用后台一段时间未使用，仍有可能自动停止

> [三星云测平台](http://samsung.smarterapps.cn/index.php?app=home&mod=Index&act=samsung)

## 小米
1. 小米 MIX2：Android 9，MIUI 10.4.2
2. 红米 NOTE7 Pro：Android 9

设置->授权管理->自启动管理->运行应用自启动
设置->电量和性能->应用配置->设置应用的省电策略为**无限制**

> [小米云测平台](http://testit.miui.com/remote)

## vivo
1. X9：Android 6.0.1，Funtouch OS_3.0
2. Y75A：Android 7.1.1，Funtouch OS_3.2
3. X21：Android 8.1.0，Funtouch OS_4.0
4. iQOO：Android 9，Funtouch OS_9
5. NEXS：Android 10，Funtouch OS_10 开发板

设置->更多设置->权限管理->权限Tab->自启动
设置->电池->后台高耗电->打开开关允许应用高耗电时继续允许

- X6A：Android 5.0.2，Funtouch OS_2.5

i 管家->软件管理->权限管理->自启动管理
i 管家->省电管理->后台高耗电->打开开关允许应用高耗电时继续允许

> [vivo 云测平台](https://vcl.vivo.com.cn/#/machine/picking)

## oppo
1. A73：Android 7.1.1，ColorOS v5.2.1

手机管家->权限隐私->自启动管理
设置->电池->应用速冻->关闭速冻开关

> oppo 云测平台需要开发者账号，还要银行卡、手持身份证等玩意，太麻烦，就没申请了，所以 oppo 看的比较少。

## 华为
1. Mate 9：Android 9，EMUI 9.1.0
2. P10：Android 9，EMUI 9.1.0

设置->应用->应用启动管理->关闭自动管理，允许自启动，后台活动
设置->电池->更多电池设置->？（云真机显示的没有应用，不确定是否有开关）

- P10 Plus：Android 8.0，EMUI 8.0

手机管家->自启管理->允许自启动
设置->电池->耗电排行->选中应用进入耗电详情->关闭高耗电提醒

- Mate 9：Android 7.0，EMUI 5.0

手机管家->自启管理->允许自启动
设置->电池->设置(右上角图标)->锁屏应用清理->关闭清理选项

> [华为云测平台](https://deveco.huawei.com/remotetest/devices/)

## 代码
只看了几个主流平台，其实还想看看一加的，但是一加没找到云测平台，也没有一加真机，无奈作罢。下面上代码：
```
object KeepCompactUtil {

    private val AUTO_START_INTENTS = arrayOf(
            // 小米
            Intent().setComponent(ComponentName("com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity")),
            // 华为
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.huawei.systemmanager/.startupmgr.ui.StartupNormalAppListActivity")),
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.huawei.systemmanager/.appcontrol.activity.StartupAppControlActivity")),

            // 魅族
            Intent().setComponent(ComponentName.unflattenFromString("com.meizu.safe/.SecurityCenterActivity")),

            // 三星
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.autorun.ui.AutoRunActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.ui.ram.AutoRunActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.ui.appmanagement.AppManagementActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.autorun.ui.AutoRunActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.ui.ram.AutoRunActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.ui.appmanagement.AppManagementActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.ui.cstyleboard.SmartManagerDashBoardActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.ui.cstyleboard.SmartManagerDashBoardActivity")),
            Intent().setComponent(ComponentName.unflattenFromString(
                    "com.samsung.android.sm_cn/.app.dashboard.SmartManagerDashBoardActivity")),
            Intent().setComponent(ComponentName.unflattenFromString(
                    "com.samsung.android.sm/.app.dashboard.SmartManagerDashBoardActivity")),

            // oppo
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.coloros.safecenter/.startupapp.StartupAppListActivity")),
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.coloros.safecenter/.permission.startupapp.StartupAppListActivity")),
            Intent().setComponent(ComponentName("com.coloros.safecenter",
                    "com.coloros.privacypermissionsentry.PermissionTopActivity")),
            Intent().setComponent(
                    ComponentName.unflattenFromString("com.oppo.safe/.permission.startup.StartupAppListActivity")),

            // vivo
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.vivo.permissionmanager/.activity.BgStartUpManagerActivity")),
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.iqoo.secure/.phoneoptimize.BgStartUpManager")),
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.vivo.permissionmanager/.activity.PurviewTabActivity")),
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.iqoo.secure/.ui.phoneoptimize.SoftwareManagerActivity")),

            // 一加
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.oneplus.security/.chainlaunch.view.ChainLaunchAppListActivity")),

            // 乐视
            Intent().setComponent(
                    ComponentName.unflattenFromString("com.letv.android.letvsafe/.AutobootManageActivity")),

            // HTC
            Intent().setComponent(
                    ComponentName.unflattenFromString("com.htc.pitroad/.landingpage.activity.LandingPageActivity"))
    )

    private val BATTERY_INTENTS = arrayOf(
            // 小米
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.miui.powerkeeper/.ui.HiddenAppsContainerManagementActivity")),

            // 华为
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.huawei.systemmanager/.power.ui.HwPowerManagerActivity")),

            // 魅族
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.meizu.safe/.SecurityCenterActivity")),

            // 三星
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.ui.battery.AppSleepListActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.ui.battery.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.ui.battery.AppSleepListActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.ui.battery.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.lool",
                    "com.samsung.android.sm.battery.ui.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.lool",
                    "com.samsung.android.sm.ui.battery.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm",
                    "com.samsung.android.sm.ui.battery.BatteryActivity")),
            Intent().setComponent(ComponentName("com.samsung.android.sm_cn",
                    "com.samsung.android.sm.ui.cstyleboard.SmartManagerDashBoardActivity")),

            // oppo
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.coloros.safecenter/.appfrozen.activity.AppFrozenSettingsActivity")),
            Intent().setComponent(ComponentName("com.coloros.oppoguardelf",
                    "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity")),
            Intent().setComponent(ComponentName("com.coloros.oppoguardelf",
                    "com.coloros.powermanager.fuelgaue.PowerSaverModeActivity")),
            Intent().setComponent(ComponentName("com.coloros.oppoguardelf",
                    "com.coloros.powermanager.fuelgaue.PowerConsumptionActivity")),
            Intent().setComponent(ComponentName
                    .unflattenFromString("com.oppo.safe/.SecureSafeMainActivity")),

            // vivo
            Intent().setComponent(ComponentName("com.vivo.abe",
                    "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity")),
            Intent().setComponent(ComponentName.unflattenFromString("com.iqoo.powersaving/.PowerSavingManagerActivity"))
    )

    var brandAliveEnumList: List<BrandAliveEnum> = object : ArrayList<BrandAliveEnum>() {
        init {
            add(BrandAliveEnum.Huawei)
            add(BrandAliveEnum.Xiaomi)
            add(BrandAliveEnum.Oppo)
            add(BrandAliveEnum.Vivo)
            add(BrandAliveEnum.Samsung)
            add(BrandAliveEnum.Meizu)
            add(BrandAliveEnum.LeEco)
            add(BrandAliveEnum.Smartisan)
            add(BrandAliveEnum.Lenovo)
            add(BrandAliveEnum.NONE)
        }
    }

    /**
     * @return 是否为三星s9 型号的手机
     */
    val isSamsungS9: Boolean
        get() = ("samsung".equals(Build.BRAND, ignoreCase = true) && StringUtils.isNotEmpty(Build.MODEL)
                && Build.MODEL.startsWith("SM-G9"))

    val deviceEnum: BrandAliveEnum
        get() {
            if ("Huawei".equals(Build.BRAND, ignoreCase = true) || "HONOR".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Huawei
            }
            if ("vivo".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Vivo
            }
            if ("OPPO".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Oppo
            }
            if ("Xiaomi".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Xiaomi
            }
            if ("Meizu".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Meizu
            }
            if ("samsung".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Samsung
            }
            if ("smartisan".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Smartisan
            }
            if ("LeEco".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.LeEco
            }
            if ("Lenovo".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Lenovo
            }
            if ("oneplus".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.Yijia
            }
            if ("Sony".equals(Build.MANUFACTURER, ignoreCase = true)) {
                return BrandAliveEnum.Sony
            }
            if ("LG".equals(Build.MANUFACTURER, ignoreCase = true)) {
                return BrandAliveEnum.LG
            }
            if ("Coolpad".equals(Build.BRAND, ignoreCase = true)) {
                return BrandAliveEnum.NONE
            }
            return if ("ZTE".equals(Build.BRAND, ignoreCase = true)) {
                BrandAliveEnum.NONE
            } else BrandAliveEnum.NONE

        }

    // 自启动
    fun daemonSet(activity: Activity): Boolean {
        for (intent in AUTO_START_INTENTS) {
            if (activity.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                try {
                    activity.startActivity(intent)
                    return true
                } catch (e: Exception) {
                    LogUtils.e("KeepCompactUtil", e.toString())
                    continue
                }
            }
        }
        return false
    }

    // 防睡眠
    fun noSleepSet(activity: Activity): Boolean {
        for (intent in BATTERY_INTENTS) {
            if (activity.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                try {
                    activity.startActivity(intent)
                    return true
                } catch (e: Exception) {
                    LogUtils.e("KeepCompactUtil", e.toString())
                    continue
                }
            }
        }
        return false
    }
}
```
直接罗列所有的 Intent，按页面相关性从大到小排列。比如，A->B->C，设置页面在 C，但是有的手机不支持打开 C 和 B，Intent 排序为 C>B>A。通过 resolveActivity 判断系统是否能处理此 Intent，跳转成功则 ok，若跳转失败则继续遍历，找到能跳转的 Intent，如果遍历完也没有找到，则返回 false 给出相应提示。

## 小结
oppo vivo 的手机有点恶心，每次安装 debug 包还要弹窗让输密码，然后还自己捣鼓了权限啥的，限制三方应用进行跳转。
vivo：
```
Permission Denial: starting Intent { flg=0x10000000 cmp=com.vivo.abe/com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity } from ProcessRecord{306679b 16047:cn.xxx.android.xxx/u0a605} (pid=16047, uid=10605) requires com.vivo.abe.permission.action.openhpactivity
```
oppo：
```
java.lang.SecurityException: Permission Denial: starting Intent { flg=0x10000000 cmp=com.coloros.safecenter/.startupapp.StartupAppListActivity } from ProcessRecord{2255367 30192:cn.xxx.android.xxx/u0a697} (pid=30192, uid=10697) requires oppo.permission.OPPO_COMPONENT_SAFE
```
然后在 AndroidManifest 中添加相关的权限也无效的，因为**只能系统应用申请，三方应用申请没用**（oppo 同学内部询问大佬给出的回答）。针对 vivo，我选择跳到上一级页面，也可以跳，只不过需要用户手动再点一下。针对 oppo，我佛了，上一级页面也跳不了，只能到最初的设置页面，这跳到设置页面大多数用户都会一脸懵逼，所以干脆不跳了，直接返回 false，同时给好相应的引导。同时，**申请了权限之后，好像 apk 安装会出问题（部分机型），反正没用，所以权限就不要加了**。
三星也值得说一下，一会是 sm，一会是 sm_cn，我也是佛了。一会是 ui.battery，一会是 battery.ui，索性直接进行排列组合搞了一波，所以三星的 Intent 就很多了。另外三星 S9 貌似是没有自启动的，所以可以考虑进行屏蔽。其实不屏蔽影响也不大，返回 false 给出提示即可，无奈老板的手机是 S9...

经过这次云测平台的使用，发现华为还是牛逼啊，三星也还不错，还支持 adb 命令（点个赞）。oppo vivo 就差太远了，小米更不用谈了，连可用的机型都没有。腾讯的 WeTest 机型倒是都有，但是要收费，这很腾讯。送的 30 分钟完全不够用好吗，而且每用一个机型至少 15 分钟，我的免费额度剩下 10 分钟就已经用不了了，无力吐槽。

## 参考
1. [Intent跳转到[自启动]页面全网最全适配机型解决方案(持续更新)](https://blog.csdn.net/u014418171/article/details/98874962)
2. [Denial permission OPPO_COMPONENT_SAFE](https://stackoverflow.com/questions/49814755/denial-permission-oppo-component-safe)
3. [backgroundable-android](https://github.com/dirkam/backgroundable-android/issues/5)
4. [How to start Power Manager of all android manufactures to enable background and push notification?](https://stackoverflow.com/questions/48166206/how-to-start-power-manager-of-all-android-manufactures-to-enable-background-and)
5. [WeTest]（https://wetest.qq.com/cloud/n/remotedevicelist?test=remote）