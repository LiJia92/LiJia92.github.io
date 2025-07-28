---
title: Android使用VideoView进行视频播放
date: 2016-04-01 15:07:19
tags:
 - Android 基础
---

最近在做一个主播类的App，里面涉及到视频播放，之前没有接触过，在探索一阵后能够播放基本视频了。特此写下小记，方便日后查看。

首先，确定使用``VideoView``进行视频播放。

步骤：
1. 在界面布局文件中定义VideoView组件，或在程序中创建VideoView组件。
2. 调用VideoView的如下两个方法来加载指定的视频:
 - setVidePath(String path)：加载path文件代表的视频
 - setVideoURI(Uri uri)：加载uri所对应的视频
3. 调用VideoView的start()、stop()、psuse()等方法来控制视频的播放。

若要显示进度条，可结合``MediaController``一起使用。

<!--more -->

下面代码进行说明。

布局文件：
```
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <VideoView
        android:id="@+id/video_view"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</RelativeLayout>
```
Activity：
```
public class VideoPlayActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_video_play);

        VideoView videoView = (VideoView) this.findViewById(R.id.video_view);
        videoView.setMediaController(new MediaController(this)); // 添加MediaController
        videoView.setVideoPath("你的视频路径"); // 设置路径
        videoView.requestFocus(); // 获取焦点
        videoView.start(); // 播放
        videoView.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
            @Override
            public void onCompletion(MediaPlayer mp) {
                finish(); // 播放结束回调
            }
        });
    }
}
```
因为视频播放一般是全屏，直接使用系统的FullScreen会提示需要使用AppCompat主题，所以我给Activity设置了一个style。
```
<style name="NoTitleFullscreen" parent="AppTheme">
    <item name="android:windowNoTitle">true</item>
    <item name="windowActionBar">false</item>
    <item name="android:windowFullscreen">true</item>
    <item name="android:windowContentOverlay">@null</item>
</style>
```
```
<activity
    android:name=".ui.VideoPlayActivity"
    android:screenOrientation="portrait"
    android:theme="@style/NoTitleFullscreen">
</activity>
```

实际效果：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/video_vieweffect.gif)

因为是虚拟机，效果看起来可能不太满意，但是至少视频是能播放了。
后续可能还有屏幕视频适配的问题，现在就不多说了，后面解决了再来更新。

问题：VideoView加载资源需要一定的耗时, 会造成短暂的黑屏现象。
如何避免播放前的黑屏现象呢？可以给videoview设置加载的监听，在加载前给一个遮罩，等资源加载完成后隐藏遮罩。
```
<FrameLayout  
  android:id="@+id/frameLayout1"  
  android:layout_width="fill_parent"  
  android:layout_height="fill_parent"  
  android:layout_gravity="center"  
  android:layout_marginTop="50dip" >  

  <VideoView  
    android:id="@+id/geoloc_anim"  
    android:layout_width="fill_parent"  
    android:layout_height="172dip" android:layout_gravity="top|center" android:visibility="visible"/>  

  <FrameLayout  
      android:id="@+id/placeholder"  
      android:layout_width="fill_parent"  
      android:layout_height="fill_parent" android:background="@drawable/fondvert_anim">  
  </FrameLayout>
</FrameLayout>
```
设置监听：
```
videoView.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {  
    @Override  
    public void onPrepared(MediaPlayer mediaPlayer) {  
        //Called when the video is ready to play  
        View placeholder = findViewById(R.id.placeholder);  

        placeholder.setVisibility(View.GONE);  
    }  
});  
```

今天是愚人节，节日快乐哦~
