---
title: 百度定位SDK无法定位
date: 2015-10-24 17:14:50
tags:
 - sdk
---

最近的项目中，有使用到百度定位SDK，在自己的debug环境安装apk，手机可以进行定位。但是发布release版本后安装，手机却无法定位。后面找到问题是百度配置的秘钥不对。

百度地图SDK在申请秘钥时，需要SHA1值。此值在Eclipse中在Eclipse中，可直接看到：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/10/baidu-loc1.png)
若是使用Android Studio，直接在setting中好像看不到该值。此时需要通过命令行来获取，具体操作可参考[百度开发指南](http://developer.baidu.com/map/index.php?title=androidsdk/guide/key)。

<!--more-->

通过上述方式获取到的SHA1值为debug版本的，若是在Android Studio中，采用自己的keystore生成的apk对应的SHA1值会与debug版本的值不一致，这就导致了在百度开放平台上申请到的key值不对（key值需要SHA1值与app包名）。

此时需要获得release版本对应的SHA1值。步骤如下：
1. 将自己的keystore拷贝一份到C:\Users\Administrator\.android目录下；
2. 命令行进入到.android文件夹，执行命令：
```
keytool -list -keystore keystorefile
```
keystorefile为刚刚拷贝的keystore文件。
会提示输入秘钥库口令，输入之后回车即可获取SHA1值。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/10/baidu-loc2.png)
使用该SHA1值去开放平台申请秘钥，然后替换AndroidManifest.xml中的key值。之后采用自己那个keystore进行release打包出来的apk即可正常使用百度SDK了。
