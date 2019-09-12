---
title: android接入微信支付SDK
date: 2016-03-18 15:04:30
tags:
 - sdk
---

本文主要讲述一下android接入微信支付SDK的步骤以及需要注意的一些Tips。

## 前期准备
接入微信支付SDK前期需要许多前期准备。
### 微信开放平台
1. 注册[微信开放平台](https://open.weixin.qq.com/)账号。
2. 登录账号，进入管理中心，创建你的App应用，创建应用的包名与签名要与你实际的应用一致。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk1.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk5.png)
3. 进入应用详情，获取``AppID``，以及申请开通微信支付能力。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk2.png)
4. 等待审核通过。

<!--more-->

### 微信商户平台
1. 注册[微信商户平台](https://pay.weixin.qq.com)账号。
2. 登录账号，在基本信息中获得``微信支付商户号``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk3.png)
3. 安装操作证书，然后进入API安全设置``秘钥``，最好使用UUID自动生成的，记住这个``秘钥``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk4.png)
OK，前期准备做完，下面进行代码接入。

## 工程接入SDK
### 新建应用工程
以AS为例，新建工程，注意包名与使用的签名要与微信开放平台申请应用时填写的一致。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk8.png)
### 引入libs
将``libammsdk.jar``放到libs文件夹下。
### 配置debug、release的签名文件
```
signingConfigs {
        debug {
            storeFile file("你的keystore路径")
            storePassword "xxx"
            keyAlias "xxx"
            keyPassword "xxx"
        }

        release {
            storeFile file("你的keystore路径")
            storePassword "xxx"
            keyAlias "xxx"
            keyPassword "xxx"
        }
    }
```
这里debug、realse我采用的是一样的签名。不论是debug，还是release都能对应上。
### AndroidManifest.xml中配置
```
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />

        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:scheme="你的AppID" />
    </intent-filter>
</activity>
```
也别忘记加入网络权限。
### 获取prepay_id
在支付之前，都需要调用微信的接口``https://api.mch.weixin.qq.com/pay/unifiedorder``来获得prepay_id。
### 支付
获取到prepay_id之后，调用``IWXAPI``的``sendReq``方法即可完成支付。
### 添加支付成功回调Activity
添加``wxapi``的包名，在这个包名下必须要有``WXPayEntryActivity``这个Activity，支付成功后会显示此界面。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk6.png)

另外，声明此 Activity 需要添加如下属性：
```
<activity
    android:name=".wxapi.WXPayEntryActivity"
    android:exported="true"
    android:launchMode="singleTop" />
```

调用接口相关参数以及返回值参考[开发者手册](https://pay.weixin.qq.com/wiki/doc/api/app/app.php?chapter=8_1)。


## Tips
下面说一下接入过程中需要注意的点。
1. 官网下的demo，第一次支付时，能成功。之后就会一直支付失败。原因是：支付的时候商户唯一订单ID是唯一的，测试的时候请不断的更换订单ID参数支付。若要继续使用demo支付，可以微信清除数据、或者退出登录重新登录。
2. 微信支付返回-1，一般是``签名``错误。这个签名有2种意思：1、Apk签名文件，debug与release最好使用同样的keystore；2、参数MD5签名生成的sign。要仔细检查是否正确。
3. 签名、包名必须跟微信开放平台申请的一致.
4. 获取prepay_id最好是在服务器完成，由服务器去跟微信服务器交互，客户端不需要参与，以免泄露重要信息。
5. 与微信接口交互时，参数都需要签名。签名方法如下图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/wechat-sdk7.png)
这里重点说一下。
 - 参数名ASCII码从小到大排序（字典序）
 - 参数名区分大小写，包括sign。
 - 需要添加商户key值，这个key即是在前期准备中，我所说的微信商户的那个``秘钥``。

若接入过程中注意到这些Tips，一步一步来，那么应该是能支付成功了。
