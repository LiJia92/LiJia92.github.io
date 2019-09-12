---
title: Android-iOS 跨平台传输方案调研
date: 2016-10-28 16:21:48
tags:
 - 直播
---

## 现状
1. iOS：在iOS7中，引入了一个全新的框架——Multipeer Connectivity（多点连接）。利用Multipeer Connectivity框架，即使在没有连接到WiFi（WLAN）或移动网络（xG）的情况下，距离较近的Apple设备（iMac/iPad/iPhone）之间可基于蓝牙和WiFi（P2P WiFi）技术进行发现和连接实现近场通信。
2. Android：Wi-Fi peer-to-peer（P2P，对等网络），它允许具备相应硬件的Android 4.0（API level 14）或者更高版本的设备可以直接通过wifi而不需要其它中间中转节点就能直接通信（Android的Wi-Fi P2P框架符合Wi-Fi联盟的Wi-Fi Direct™直连认证标志）。使用这些API，你可以搜索并连接其它同样支持Wi-Fi P2P的设备，然后再通过一个高速的连接进行互相通信，并且这个连接的有效距离要比蓝牙连接的有效距离要长的多。这对于需要在用户之间共享数据的应用程序非常有用，例如多玩家游戏或者照片分享之类应用。

<!-- more -->

但是iOS的MC框架与Android的Wifi Direct不兼容，通过苹果开发者论坛[iOS and Wi-Fi Direct](https://forums.developer.apple.com/message/49337#49337)了解：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/10/video7.png)
关于不同技术在iOS、Android上的兼容性，如下图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/10/video8.png)

## 蓝牙
1. 经典蓝牙阶段：在蓝牙4.0（Bluetooth Low Energy）之前，也就是所谓的经典蓝牙，苹果的蓝牙拒绝接入不信任的设备。也就是说，没得连。
2. 蓝牙4.0阶段：从ios6.0开始，iPhone支持BLe以后，问题得到了改善，因为在蓝牙4.0以后不再存在经典蓝牙的那个限制。ios7.0以后，BLe在 iOS 7 技术性提升里占到的重要位置。但是Android在这方面的脚步就慢很多了。
 - Android4.3：SDK从4.3以后开始正式在官方层面支持蓝牙4.0，可以使用安卓设备建立主机。注意，这里是说可以建立主机，也就是只能是安卓建立主机，iOS设备连接才可以。安卓无法去连接iOS的主机。
 - Android L：也就是Android 5.0，从这个版本开始，谷歌正式支持主从机的建立。

[Android与IOS之间如何实现蓝牙通信数据传输？](https://www.zhihu.com/question/23246210)

## 现有产品
1. [快牙](http://www.kuaiya.cn/)
> 快牙（ZAPYA），是一款全球首创、实现跨平台文件传输的应用，能帮助智能手机用户之间实现高速海量数据传输。支持安卓（Android）、苹果（iOS）、WP、PC等多种智能终端间的互联互通。通过快牙，可以和任何人分享应用、照片、视频、音乐及其他任意格式文件。目前快牙全球用户数量已超3亿，遍及海内外178个国家和地区，在同类型的传输应用中稳居第一。

2. [茄子快传](https://www.ushareit.com/)
> 茄子快传是北京众联极享科技有限公司推出的一款跨平台、多场景的移动数字互动平台（手机内容传输工具）。通过设备间建立的数据传输通路，茄子快传实现了在没有外部WiFi网络或者数据网络的情况下的数据高速收发，过程中无需消耗数据流量。用户操作简单，没有复杂的配对配置，无需登录账户、添加好友，支持多人互传，让用户摆脱数据线、蓝牙等复杂的分享方式，用一种简单、直观的交互让用户体验到近距离线下社交中与人分享的快乐。

通过以上2款产品，可以实现跨平台数据传输。

我利用2台Android手机测试，都是需要创建``热点``进行传输。Android与iOS测试，也是需要开启``热点``的，并且在iOS下需要手动链接到对应的热点。

## 第三方
1. [AllJoyn](https://allseenalliance.org/)
> AllJoyn，由高通公司主导的高通创新中心（Qualcomm Innovation Center）所开发的开放源代码专案，主要用于近距离无线传输，透过Wifi或蓝牙技术，进行定位与点对点档案传输。

2. [FireChat](http://www.opengarden.com/)
> FireChat，是一个专门用于手机的APP，由开放花园公司开发。它能使智能手机在没有网络存取时，经由无线网状网络的蓝牙、Wi-Fi，或苹果公司的多点连线（Multipeer Connectivity）对等网络架构连线。

3. [Underdark](http://underdark.io/)
> Mobile peer-to-peer mesh networking library.Integrates into iOS and Android apps and works over Wi-Fi and Bluetooth.

目前只是知道这些三方库，至于其内部的实现原理还不了解，但应该是结合Wi-Fi与蓝牙来实现的。

## 小结
通过目前已有的技术（不做多余的工作），应该是做不到跨平台传输的。但是如果自己通过开发Wi-Fi以及蓝牙，应该是可以实现跨平台传输的。至于开发的难点以及技术点，我也不清楚。

## 其他参考
[The Sorry State of Peer to Peer iOS to Android connectivity](http://blog.moritzhaarmann.de/blog/2014/04/27/sorry-state-of-p2p/)
[Peer to peer android and iOS with Wifi direct (multipeer connectivity?)](http://stackoverflow.com/questions/28906948/peer-to-peer-android-and-ios-with-wifi-direct-multipeer-connectivity)
[Is iOS 7 Multipeer Connectivity compatible with Android Wi-Fi Direct?](http://stackoverflow.com/questions/19067794/is-ios-7-multipeer-connectivity-compatible-with-android-wi-fi-direct)
[9 of the best apps for sharing files between devices and friends](http://thenextweb.com/apps/2015/07/10/9-of-the-best-apps-for-sharing-files-between-devices-and-friends/)
