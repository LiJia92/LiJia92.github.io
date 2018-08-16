---
title: Android 保活实践
date: 2018-08-16 13:55:56
tags:
 - 日常开发
---
作为 Android 开发者，当提到“保活”时，心中的滋味可谓是五味杂陈。互联网上也有各种“黑科技”来达到相应的目的。若是普通的应用，我是十分拒绝进行保活的，当用户不需要你了，还要偷偷地活着，做一些事情。最近参与开发的一款 App 是跟地图相关的，有着「录轨迹」的功能，当用户开启录制功能后，即使退出应用到后台，也是期望能够继续录制的，所以便研究了一番保活，并实践了一下，最后效果也还不错。
说下总体方案：**1 像素 Activity 、音频播放、前台服务**。

<!-- more -->

首先，监听锁屏相关的广播：
```
public class ScreenReceiver {
    private static final String TAG = "ScreenReceiver";

    private Context mContext;
    // 锁屏亮屏广播接收器
    private ScreenBroadcastReceiver mScreenReceiver;
    // 屏幕状态改变回调接口
    private ScreenStateListener mStateReceiverListener;

    public ScreenReceiver(Context mContext) {
        this.mContext = mContext;
    }

    public void register(ScreenStateListener mStateReceiverListener) {
        this.mStateReceiverListener = mStateReceiverListener;
        // 动态启动广播接收器
        this.mScreenReceiver = new ScreenBroadcastReceiver();
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        mContext.registerReceiver(mScreenReceiver, filter);
    }

    public void unRegister() {
        mContext.unregisterReceiver(mScreenReceiver);
    }

    public class ScreenBroadcastReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            LogUtils.e(TAG, "ScreenBroadcastReceiver onReceive() action: " + action);
            if (mStateReceiverListener == null) {
                return;
            }
            if (Intent.ACTION_SCREEN_ON.equals(action)) {
                // 亮屏
                mStateReceiverListener.onScreenOn();
            } else if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                // 息屏
                mStateReceiverListener.onScreenOff();
            } else if (Intent.ACTION_USER_PRESENT.equals(action)) {
                // 解锁
                mStateReceiverListener.onUserPresent();
            }
        }
    }

    public interface ScreenStateListener {
        /**
         * 屏幕亮屏
         */
        void onScreenOn();

        /**
         * 屏幕息屏
         */
        void onScreenOff();

        /**
         * 用户解锁
         */
        void onUserPresent();
    }
}
```
保活管理类：
```
public class KeepAliveManager {

    public static final String BUSINESS_NAME_RECORD = "BUSINESS_NAME_RECORD";

    @StringDef({BUSINESS_NAME_RECORD})
    @Retention(RetentionPolicy.SOURCE)
    public @interface KeepAliveName {}

    private static KeepAliveManager keepAliveManager = new KeepAliveManager();

    private ScreenReceiver screenReceiver;

    private MediaPlayer mMediaPlayer;

    /**
     * 记录需要保活的业务功能名称
     * 优点:
     * 1、不同业务的生命周期不同，避免不同业务之间需要通知当前状态、状态变更
     * 2、当没有业务需要保活app时，自动关闭保活
     * 3、用HashSet是因为它不允许add相同元素，如果添加相同元素也只会保存一份
     */
    private Set<String> needAliveBusinessName = new HashSet<>();

    private KeepAliveManager() {
    }

    public static KeepAliveManager getInstance() {
        return keepAliveManager;
    }


    /**
     * 在需要保活的业务启动时 开启
     */
    public void start(@KeepAliveName String businessName) {

        needAliveBusinessName.add(businessName);

        if (screenReceiver != null) {
            //不需要重复保活
            return;
        }

        screenReceiver = new ScreenReceiver(MucangConfig.getContext());
        screenReceiver.register(new ScreenReceiver.ScreenStateListener() {
            @Override
            public void onScreenOn() {
                ScreenManager.getInstance().finishActivity();
            }

            @Override
            public void onScreenOff() {
                ScreenManager.getInstance().startActivity();
                playMusic();
            }

            @Override
            public void onUserPresent() {
                if (mMediaPlayer != null) {
                    mMediaPlayer.stop();
                }
            }
        });

    }

    public void stop(@KeepAliveName String businessName) {
        needAliveBusinessName.remove(businessName);

        // 当没有业务功能需要保活时，需要退出保活监听
        if (needAliveBusinessName.size() == 0) {

            if (screenReceiver != null) {
                screenReceiver.unRegister();
                screenReceiver = null;
            }
        }
    }

    private void playMusic() {
        mMediaPlayer = MediaPlayer.create(MucangConfig.getContext(), R.raw.silent);
        mMediaPlayer.setLooping(true);
        mMediaPlayer.start();
    }

}
```
很简单的一个单例类，调用 start 方法传入对应的业务启动保活，保活只会在锁屏时开启。当没有处于需要保活的业务场景时，则不会启动保活。
然后看到 ScreenManager：
```
public class ScreenManager {
    private static final String TAG = "ScreenManager";
    private Context mContext;
    private static ScreenManager mScreenManager;
    private WeakReference<Activity> mActivityRef;

    private ScreenManager() {
        mContext = MucangConfig.getContext();
    }

    public static ScreenManager getInstance() {
        if (mScreenManager == null) {
            mScreenManager = new ScreenManager();
        }
        return mScreenManager;
    }

    public void setSingleActivity(Activity mActivity) {
        mActivityRef = new WeakReference<>(mActivity);
    }

    public void startActivity() {
        LogUtils.e(TAG, "start LockScreenActivity...");
        Intent intent = new Intent(mContext, LockScreenActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        mContext.startActivity(intent);
    }

    public void finishActivity() {
        LogUtils.e(TAG, "finish LockScreenActivity...");
        if (mActivityRef != null) {
            Activity mActivity = mActivityRef.get();
            if (mActivity != null) {
                mActivity.finish();
            }
        }
    }
}
```
主要功能就是启动、关闭一个 1 像素的 Activity。
看下 LockScreenActivity：
```
/**
 * 自定义锁屏activity
 * 注:
 * 1、锁屏时启动，用于将可能处于后台的进程拉到前台，降低被 Low Memory Killer 清理的概率
 * 2、若此时本应用的进程已经处于前台进程，再加强一下也有利于保活
 */
public class LockScreenActivity extends FragmentActivity {

    private static final String TAG = "LockScreenActivity";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LogUtils.e(TAG, "LockScreenActivity onCreate()");

        Window mWindow = getWindow();
        mWindow.setGravity(Gravity.LEFT | Gravity.TOP);
        WindowManager.LayoutParams attrParams = mWindow.getAttributes();
        attrParams.x = 0;
        attrParams.y = 0;
        attrParams.height = 1;
        attrParams.width = 1;
        mWindow.setAttributes(attrParams);

        ScreenManager.getInstance().setSingleActivity(this);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        LogUtils.e(TAG, "LockScreenActivity onDestroy()");
    }
}
```
同时，录制轨迹的服务使用 startForeground 方式。
```
public class RecordService extends Service {

    @Override
    public void onCreate() {
        super.onCreate();
        startForeground(1, createNotification("记录轨迹中", "正在后台记录轨迹"));
    }
}
```
结合以上代码，可以达到不错的保活效果了。可以看到，代码比较克制，只在特定需要保活的业务场景才开启保活，绝不会在后台不经用户同意做一些“恶心”的事情。另外，锁屏播放无声音乐会比较耗电，需要优化，可以在一段时间内播放一次。同时播放音乐可能会与有些音乐、视频 App 的播放冲突，从而达不到保活效果，这些都是可优化的方向。

参考：[Android 进程保活招式大全](https://segmentfault.com/a/1190000006251859)