---
title: Android接入JPush（极光推送）
date: 2016-04-05 14:14:58
tags:
 - sdk
---

项目中需要有推送功能，技术负责人最后决定使用``极光推送``，活被分配给我了，于是我便接了一波，在此小记一下~

在极光推送的[官方文档](http://docs.jpush.io/guideline/android_guide/)中，已经有了较详细的说明了，这里只做一下简单的摘录。

## 三分钟快速Demo
在极光推送的官方文档中，有``三分钟快速Demo``，我也是从demo入手。
### 创建开发者账号
接过sdk的同学应该都知道，再使用第三方的服务的时候，总会需要先注册一个``开发者账号``。
要创建极光推送开发者帐号，请访问[极光推送官方网站](http://jpush.cn)。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/jpush1.png)

<!-- more -->

### 创建应用
使用注册账号登录，进入极光控制台后，点击``创建应用``。创建帐号进入极光推送后，首先显示的是创建应用的界面。填上你的应用程序的名称，以及 Android包名这二顶就可以了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/jpush2.png)

### 下载应用Example
点击``下载Android Example``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/jpush3.png)

### 启动项目
下载后得到一个Zip，可直接解压导入到Android Studio中，然后编译运行项目，安装到手机运行即可。gradle配置可能需要依据你当前开发极其做些修改。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/jpush4.png)

### 推送消息
填写要推送的内容，选择推送对象，点击发送即可推送消息了。这时手机便能接受到推送的消息了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/jpush5.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/jpush6.png)

## 接入JPush到实际项目
### 导入sdk
在官网上下载sdk，然后导入到项目中：
1. 解压缩 jpush-sdk_v2.x.y.zip 集成压缩包
2. 复制``libs/jpush-sdk-release2.x.y.jar``到工程 libs/ 目录下
3. 复制``libs/armeabi/libjpush2xy.so``到工程 libs/armeabi 目录下
4. 复制``libs/armeabi-v7a/libjpush.so``到工程 libs/armeabi-v7a 目录下
5. 复制``res/drawable-hdpi``中的资源文件到工程的 res/drawable-hdpi/ 目录下
6. 复制``res/layout``中的布局文件到工程的 res/layout/ 目录下

其中5和6，其实是可以忽略的，我导入的时候看了下，这是极光推送默认的布局，在集成的时候，项目肯定会有自己的布局，需要自己去自定义，本身的默认布局是用不到的。
### 配置AndroidManifest.xml
参考官网的示例xml中进行配置``AndroidManifest.xml``，这里贴一下官网的示例：
```
<?xml version="1.0" encoding="utf-8"?
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
     package="您应用的包名"
     android:versionCode="205"
     android:versionName="2.0.5"
     >
     <uses-sdk android:minSdkVersion="11" android:targetSdkVersion="17" />
     <!-- Required 自定义用来收发消息的相关权限 -->
     <permission
         android:name="${applicationId}.permission.JPUSH_MESSAGE"
         android:protectionLevel="signature" />

     <!-- Required 一些系统要求的权限，如访问网络等-->
     <uses-permission android:name="${applicationId}.permission.JPUSH_MESSAGE" />
     <uses-permission android:name="android.permission.RECEIVE_USER_PRESENT" />
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.WAKE_LOCK" />
     <uses-permission android:name="android.permission.READ_PHONE_STATE" />
     <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
     <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
     <uses-permission android:name="android.permission.WRITE_SETTINGS" />
     <uses-permission android:name="android.permission.VIBRATE" />
     <uses-permission android:name="android.permission.MOUNT_UNMOUNT_FILESYSTEMS" />
     <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
     <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />


     <!-- Optional for location -->
     <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
     <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
     <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
     <uses-permission android:name="android.permission.ACCESS_LOCATION_EXTRA_COMMANDS" />
     <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />


     <application
         android:icon="@drawable/ic_launcher"
         android:label="@string/app_name">


         <!-- Required SDK核心功能-->
         <activity
             android:name="cn.jpush.android.ui.PushActivity"
             android:configChanges="orientation|keyboardHidden"
             android:theme="@android:style/Theme.NoTitleBar"
             android:exported="false">
             <intent-filter>
                 <action android:name="cn.jpush.android.ui.PushActivity" />
                 <category android:name="android.intent.category.DEFAULT" />
                 <category android:name="${applicationId}" />
             </intent-filter>
         </activity>

         <!-- Required SDK核心功能-->
         <service
             android:name="cn.jpush.android.service.DownloadService"
             android:enabled="true"
             android:exported="false" >
         </service>

         <!-- Required SDK 核心功能-->
         <!-- option since 2.0.5 可配置PushService的android:process参数 将JPush服务配置为一个独立进程 -->
         <!-- 如：android:process=":remote" -->
         <service
             android:name="cn.jpush.android.service.PushService"
             android:enabled="true"
             android:exported="false">
             <intent-filter>
                 <action android:name="cn.jpush.android.intent.REGISTER" />
                 <action android:name="cn.jpush.android.intent.REPORT" />
                 <action android:name="cn.jpush.android.intent.PushService" />
                 <action android:name="cn.jpush.android.intent.PUSH_TIME" />

             </intent-filter>
         </service>

         <!-- Required SDK 核心功能 since 1.8.0 -->
         <service
             android:name="cn.jpush.android.service.DaemonService"
             android:enabled="true"
             android:exported="true">
             <intent-filter >
                 <action android:name="cn.jpush.android.intent.DaemonService" />
                 <category android:name="${applicationId}"/>
             </intent-filter>
         </service>

         <!-- Required SDK核心功能-->
         <receiver
             android:name="cn.jpush.android.service.PushReceiver"
             android:enabled="true"
             android:exported="false">
             <intent-filter android:priority="1000">
                 <action android:name="cn.jpush.android.intent.NOTIFICATION_RECEIVED_PROXY" /> <!--Required 显示通知栏 -->
                 <category android:name="${applicationId}" />
             </intent-filter>
             <intent-filter>
                 <action android:name="android.intent.action.USER_PRESENT" />
                 <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
             </intent-filter>
             <!-- Optional -->
             <intent-filter>
                 <action android:name="android.intent.action.PACKAGE_ADDED" />
                 <action android:name="android.intent.action.PACKAGE_REMOVED" />
                 <data android:scheme="package" />
             </intent-filter>
         </receiver>

         <!-- Required SDK核心功能-->
         <receiver android:name="cn.jpush.android.service.AlarmReceiver" />

         <!-- User defined. 用户自定义的广播接收器-->
         <receiver
             android:name="您自己定义的Receiver"
             android:enabled="true">
             <intent-filter>
                 <action android:name="cn.jpush.android.intent.REGISTRATION" /> <!--Required 用户注册SDK的intent-->
                 <action android:name="cn.jpush.android.intent.MESSAGE_RECEIVED" /> <!--Required 用户接收SDK消息的intent-->
                 <action android:name="cn.jpush.android.intent.NOTIFICATION_RECEIVED" /> <!--Required 用户接收SDK通知栏信息的intent-->
                 <action android:name="cn.jpush.android.intent.NOTIFICATION_OPENED" /> <!--Required 用户打开自定义通知栏的intent-->
                 <action android:name="cn.jpush.android.intent.ACTION_RICHPUSH_CALLBACK" /> <!--Optional 用户接受Rich Push Javascript 回调函数的intent-->
                 <action android:name="cn.jpush.android.intent.CONNECTION" /><!-- 接收网络变化 连接/断开 since 1.6.3 -->
                 <category android:name="${applicationId}" />
             </intent-filter>
         </receiver>

         <!-- Required . Enable it you can get statistics data with channel -->
         <meta-data android:name="JPUSH_CHANNEL" android:value="developer-default"/>
         <meta-data android:name="JPUSH_APPKEY" android:value="您应用applicationId对应的appKey" /> <!-- </>值来自开发者平台取得的AppKey-->
     </application>
</manifest>
```
其中注意：
 - 标注``Required``为必须的
 - 包名
 - AppKey

### 初始化
在Application中初始化JPush。
```
public class ExampleApplication extends Application {
    @Override
    public void onCreate() {
      super.onCreate();
      JPushInterface.setDebugMode(true);
      JPushInterface.init(this);
    }
}

```
至此，JPush便已全部集成完毕。至于自定义通知布局，以及Notification的点击响应，后面再说了。

## 问题
1. 我是小米的测试机，在接收推送消息的时候，必须要启动应用的时候才会收到推送的消息。后面才知道，是有些手机需要``允许应用自启动``。修改之后便可在没启动应用的时候也能收到推送消息了。[点这里](http://docs.jpush.io/guideline/faq/#android)传送常见问题。

## 所感
作为一款比较大众的产品，肯定是不会有很多坑的（不然也没那么多人会用它了），在其官方文档的说明上，一般都会有相应的说明。在看文档的时候，一定要``仔细``，``仔细``，``仔细``，重要的事情说三遍~
