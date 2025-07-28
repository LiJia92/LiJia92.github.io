---
title: Android AlarmManager使用小记
date: 2016-08-18 16:20:03
tags:
 - Android 进阶
---

现在应用大多数都会使用一些三方推送的服务，例如极光、个推等，但是其到达率并不是很高，尤其是Android机型，各大手机厂商定制rom，系统拦截。那么要如何提高消息达到率呢？

Android中提供了``AlarmManager``可以用来做这个事情。顾名思义，它是一个闹钟管理类，它向系统注册一个事件，时间到了之后，便会触发事件，然后我们便能做一些事情了。

<!-- more -->

## 定义接收器
首先定义一个BroadcastReceiver，在收到消息后，在onReceive里弹出一个Notification，示例代码如下：
```
public class OneShotAlarm extends BroadcastReceiver {

    private final static int NOTIFICATION_ID = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(context)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("title")
                .setContentText("context");
        NotificationManager mNotifyMgr = (NotificationManager) context.getSystemService(Activity.NOTIFICATION_SERVICE);
        mNotifyMgr.notify(NOTIFICATION_ID, mBuilder.build());
        Toast.makeText(context, "OneShotAlarm onReceive", Toast.LENGTH_SHORT).show();
        Log.e("TAG", "OneShotAlarm onReceive");
    }
}
```
记得在AndroidManifest.xml中注册：
```
<receiver
    android:name=".OneShotAlarm"
    android:process=":remote" />
<receiver
```
在此讨论一下process属性，它规定了组件(activity, service, receiver等)所在的进程。
通常情况下，没有指定这个属性，一个应用所有的组件都运行在应用的默认进程中，进程的名字和应用的包名一致，比如manifest的package="com.example.helloalarm"，则默认进程名就是com.example.helloalarm。
process属性可以为全部的组件设置一个不同的默认进程，组件可以override这个默认的进程设置，这样你的应用就可以是多进程的。
如果你的process属性以一个冒号开头，进程名会在原来的进程名之后附加冒号之后的字符串作为新的进程名。当组件需要时，会自动创建这个进程，这个进程是应用私有的进程。
如果process属性以小写字母开头，将会直接以属性中的这个名字作为进程名，这是一个全局进程，这样的进程可以被多个不同应用中的组件共享。

## 开启闹钟
```
public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Intent intent = new Intent(MainActivity.this, OneShotAlarm.class);
        PendingIntent sender = PendingIntent.getBroadcast(
                MainActivity.this, 0, intent, 0);

        // We want the alarm to go off 10 seconds from now.
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(System.currentTimeMillis());
        calendar.add(Calendar.SECOND, 30);

        AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
        am.set(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), sender);
    }
}
```
启动Activity之后30秒我们便能看到Toast，以及打出的Log和Notification了。
通过这种方式，我们可以定时的发送通知，这样应该能改善推送到达率低的问题。

## AlarmManager
常用方法有三个：
1. set(int type，long startTime，PendingIntent pi)；
该方法用于设置一次性闹钟，第一个参数表示闹钟类型，第二个参数表示闹钟执行时间，第三个参数表示闹钟响应动作。
2. setRepeating(int type，long startTime，long intervalTime，PendingIntent pi)；
该方法用于设置重复闹钟，第一个参数表示闹钟类型，第二个参数表示闹钟首次执行时间，第三个参数表示闹钟两次执行的间隔时间，第三个参数表示闹钟响应动作。
3. setInexactRepeating（int type，long startTime，long intervalTime，PendingIntent pi）；
该方法也用于设置重复闹钟，与第二个方法相似，不过其两个闹钟执行的间隔时间不是固定的而已。

三个方法中都有type、PendingIntent参数，type分为以下几类：
1. AlarmManager.ELAPSED_REALTIME：表示闹钟在手机睡眠状态下不可用，该状态下闹钟使用相对时间（相对于系统启动开始），状态值为3
2. AlarmManager.ELAPSED_REALTIME_WAKEUP：表示闹钟在睡眠状态下会唤醒系统并执行提示功能，该状态下闹钟也使用相对时间，状态值为2
3. AlarmManager.RTC：表示闹钟在睡眠状态下不可用，该状态下闹钟使用绝对时间，即当前系统时间，状态值为1
4. AlarmManager.RTC_WAKEUP：表示闹钟在睡眠状态下会唤醒系统并执行提示功能，该状态下闹钟使用绝对时间，状态值为0
5. AlarmManager.POWER_OFF_WAKEUP：表示闹钟在手机关机状态下也能正常进行提示功能，所以是5个状态中用的最多的状态之一，该状态下闹钟也是用绝对时间，状态值为4；不过本状态好像受SDK版本影响，某些版本并不支持

PendingIntent为设置接收消息类的参数，一般通过如下代码生成：
```
PendingIntent sender = PendingIntent.getBroadcast(MainActivity.this, 0, intent, 0);
```
注意第二个参数为``requestCode``，该参数是闹钟的标识，如果不停设置闹钟，这个参数都一样，那么后设置的闹钟会覆盖之前的闹钟。所以如果需要多个闹钟，则需要将这个参数设为唯一。

若要取消闹钟，则直接调用cancel即可，官方是这样说的：

>void cancel (PendingIntent operation)
Remove any alarms with a matching Intent. Any alarm, of any type, whose Intent matches this one (as defined by filterEquals(Intent)), will be canceled.

只有符合filterEquals的intent才会被取消。
```
public boolean filterEquals(Intent other) {
    if (other == null) {
        return false;
    }
    if (!Objects.equals(this.mAction, other.mAction)) return false;
    if (!Objects.equals(this.mData, other.mData)) return false;
    if (!Objects.equals(this.mType, other.mType)) return false;
    if (!Objects.equals(this.mPackage, other.mPackage)) return false;
    if (!Objects.equals(this.mComponent, other.mComponent)) return false;
    if (!Objects.equals(this.mCategories, other.mCategories)) return false;

    return true;
}
```

## 问题
对于即时性比较强的应用，比如直播类，闹钟定的时间要与正在直播的推送分开，不然用户就有可能收到2次通知了，所以闹钟就要定提前一点：XXX即将开始直播，类似这样。那么就会有一个问题：用户看到闹钟的这个通知后，进入应用，但是XXX是没有直播的（即将开始直播），所以对于用户当前是没有正确信息来显示的，这种体验可能不太好。如果将闹钟设置退后，XXX已经开始直播，又会显得非常怪异。
我的心情：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/seekbar3.jpg)
求同学们支招~
