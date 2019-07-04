---
title: 记一次 ANR 寻根之旅
date: 2019-07-04 15:12:38
tags:
 - 日常开发
---
最近项目升大版本，targetSdkVersion 从 Android 6.0（version 21） 直接升到 Adnroid 9.0（version 28），跨度有点大，但是没有像升到 Android 6.0 那样工作量大。升完之后，在小米5、小米4C 2款测试机上 App 启动直接无响应了，在我的小米 MIX 上没问题。于是测试机调试之旅开始了。。。
在 SplashActivity onCreate 的方法里打断点进都进不去，有点懵，所以将目标定位到 Application 初始化了。看着 Application 相关初始化的代码，没发现什么大问题。打断点逐步调试，运行到某一行时直接就无响应了，后面的代码也不执行了，logcat 也看不到有用的信息，有点摸不着头脑。后面 Google 发现可以直接看到手机 ANR 的日志，路径为：/data/anr/traces.txt，于是很欢快的将日志导出到电脑：
```
adb pull /data/anr/traces.txt d:/test
```

<!-- more -->

然后看到 traces.txt：
```
----- pid 1928 at 2019-07-03 17:42:50 -----
Cmd line: cn.xxx.xxx.xxx
Build fingerprint: 'Xiaomi/gemini/gemini:6.0.1/MXB48T/V8.0.10.0.MAACNDH:user/release-keys'
ABI: 'arm'
Build type: optimized
Zygote loaded classes=4121 post zygote classes=1287
Intern table: 54279 strong; 161 weak
JNI: CheckJNI is on; globals=322 (plus 266 weak)
Libraries: /data/app/cn.xxx.xxx.xxx-1/lib/arm/libBDSpeechDecoder_V1.so /data/app/cn.xxx.xxx.xxx-1/lib/arm/libbd_etts.so /data/app/cn.xxx.xxx.xxx-1/lib/arm/libbdtts.so /data/app/cn.xxx.xxx.xxx-1/lib/arm/libgnustl_shared.so /data/app/cn.xxx.xxx.xxx-1/lib/arm/libtnpn.so /system/app/WebViewGoogle/WebViewGoogle.apk!/lib/armeabi-v7a/libwebviewchromium.so /system/lib/libandroid.so /system/lib/libcompiler_rt.so /system/lib/libjavacrypto.so /system/lib/libjnigraphics.so /system/lib/libmedia_jni.so /system/lib/libmiuinative.so /system/lib/libqti_performance.so /system/lib/libsechook.so /system/lib/libwebviewchromium_loader.so /system/lib/libwebviewchromium_plat_support.so libjavacore.so (17)
Heap: 24% free， 21MB/28MB; 47008 objects

...

"main" prio=5 tid=1 Waiting
  | group="main" sCount=1 dsCount=0 obj=0x744885e0 self=0xf4f76500
  | sysTid=1928 nice=-1 cgrp=bg_non_interactive sched=0/0 handle=0xf7194b34
  | state=S schedstat=( 236711085 326769009 310 ) utm=17 stm=6 core=0 HZ=100
  | stack=0xff4ef000-0xff4f1000 stackSize=8MB
  | held mutexes=
  at cn.xxx.android.core.glide.GlideProgressManager.getOkHttpClient(GlideProgressManager.java:36)
  - waiting on <0x08da7fbe> (a java.lang.Class<cn.xxx.android.core.http.XXXHttpClient>)
  at cn.xxx.android.core.glide.XXXAppGlideModule.registerComponents(XXXAppGlideModule.java:44)
  at com.bumptech.glide.GeneratedAppGlideModuleImpl.registerComponents(GeneratedAppGlideModuleImpl.java:38)
  at com.bumptech.glide.Glide.initializeGlide(Glide.java:273)
  at com.bumptech.glide.Glide.initializeGlide(Glide.java:223)
  at com.bumptech.glide.Glide.checkAndInitializeGlide(Glide.java:184)
  at com.bumptech.glide.Glide.get(Glide.java:168)
  - locked <0x02e8781f> (a java.lang.Class<com.bumptech.glide.Glide>)
  at cn.xxx.xxx.xxx.VygApplication.onTrimMemory(VygApplication.java:93)
  at android.app.ActivityThread.handleTrimMemory(ActivityThread.java:4420)
  at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1548)
  at android.os.Handler.dispatchMessage(Handler.java:102)
  at android.os.Looper.loop(Looper.java:148)
  at android.app.ActivityThread.main(ActivityThread.java:5458)
  at java.lang.reflect.Method.invoke!(Native method)
  at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:738)
  at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:628)

...

```
日志很多，Cmd line 就是当前 ANR 应用的包名，通过日志，可以得到一些有效信息：
```
main：main标识是主线程，如果是线程，那么命名成“Thread-X”的格式，x 表示线程 id，逐步递增
prio：线程优先级，默认是 5
tid：tid 不是线程的 id，是线程唯一标识 ID
group：是线程组名称
sCount：该线程被挂起的次数
dsCount：是线程被调试器挂起的次数
obj：对象地址
self：该线程 Native 的地址
sysTid：是线程号(主线程的线程号和进程号相同)
nice：是线程的调度优先级
sched：分别标志了线程的调度策略和优先级
cgrp：调度归属组
handle：线程处理函数的地址
state：是调度状态
schedstat：从 /proc/[pid]/task/[tid]/schedstat 读出，三个值分别表示线程在 cpu 上执行的时间、线程的等待时间和线程执行的时间片长度，不支持这项信息的三个值都是 0
utm：是线程用户态下使用的时间值(单位是 jiffies）
stm：是内核态下的调度时间值
core：是最后执行这个线程的 cpu 核的序号
```
找到 "main"，可以看到，在 Application 的 onTrimMemory 时调用了 Glide 的 get 方法，后面一系列操作导致的主线程变成 Waiting 状态了。
```
@Override
public void onTrimMemory(int level) {
    super.onTrimMemory(level);

    if (level == TRIM_MEMORY_UI_HIDDEN) {
        Glide.get(this).clearMemory();
    }

    Glide.get(this).trimMemory(level);
}
```
最终会调用到 GlideAppModule 的 registerComponents 方法：
```
@Override
public void registerComponents(Context context， Glide glide， Registry registry) {
    registry.replace(GlideUrl.class， InputStream.class，
            new OkHttpUrlLoader.Factory(GlideProgressManager.getOkHttpClient()));

    if (CollectionUtils.isNotEmpty(libraryGlideModuleList)) {
        int size = libraryGlideModuleList.size();
        for (int i = 0; i < size; i++) {
            libraryGlideModuleList.get(i).registerComponents(context， glide， registry);
        }
    }
}
```
然后看到 GlideProgressManager：
```
static OkHttpClient getOkHttpClient() {
    if (okHttpClient == null) {
        okHttpClient = XXXHttpClient.getDefaultHttpClient().newBuilder()
                .addNetworkInterceptor(new Interceptor() {
                    @Override
                    public Response intercept(@NonNull Chain chain) throws IOException {
                        Request request = chain.request();
                        Response response = chain.proceed(request);
                        return response.newBuilder()
                                .body(new ProgressResponseBody(request.url().toString()， response.body()， LISTENER))
                                .build();
                    }
                }).build();
    }
    return okHttpClient;
}
```
XXXHttpClient：
```
private static volatile OkHttpClient defaultHttpClient;

public static OkHttpClient getDefaultHttpClient() {
    if (defaultHttpClient == null) {
        synchronized (MucangHttpClient.class) {
            if (defaultHttpClient == null) {
                defaultHttpClient = new OkHttpClient();
            }
        }
    }
    return defaultHttpClient;
}
```
很标准的 Double-Check 单例模式，感觉没啥大问题，但是为啥会导致 ANR 呢？
因为升大版本，将绝大多数注意力都放到升级注意项了，比如 FileProvider 等等，但是正好基础库在大版本升级时，将 OkHttp 从 2.x 升到 3.x，上面的代码正时此时添加进来的，所以没升大版本一切正常。解决问题的话，将 Application 中 Glide 相关操作直接干掉就好了，Glide 内部有自己的内存控制策略，无需开发者关心了吧。
写这篇文章主要是记录一下可以**通过拉取 traces.text 日志来分析 ANR**，但是为什么这样的代码导致了 ANR 还没研究透，待我研究好了再来更新此文。