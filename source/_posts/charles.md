---
title: 使用 Charles 进行手机抓包
date: 2018-05-03 16:41:22
tags:
 - 奇技淫巧
---
开发中，我们经常会有抓包的需求。通过抓包，能一目了然请求的参数以及返回的数据是否符合预期，在定位问题的时候有很大的帮助作用。这里便写一下自己认为还不错的一个抓包工具``Charles``。

## 下载
这个根据系统版本自行谷歌、百度吧。

<!-- more -->

## 连接
1. 运行 Charles，点击 Proxy -> Proxy Settings，设置代理端口（一般默认8888），然后勾选 Enable 的选项，点击 OK 结束设置。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163742.png)

2. 运行 cmd 输入指令查看电脑 ip。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503165110.png)

3. 打开手机 Wlan 设置，将 Wifi 的代理设置成步骤 2 中的 ip 地址，及步骤 1 中的端口。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503170651.jpg)

确定之后，电脑 Charles 就会弹出对话框，询问是否允许代理，勾选 Allow。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163751.png)

有些情况下，可能我们设置手机 Wlan 代理之后，一直不弹对话框。可能是 ip 已经存在导致的。点击 Proxy -> Access Control Settings，可以进行连接设备的设置。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503165430.png)

确认连接 OK 之后，手机上的网络请求都会走代理，到电脑的 Charles 上了，然后通过 Charles 就能看到具体的网络请求信息了。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163753.png)

## 断点
可能某些情况下，我们需要手动修改 Request 或 Reponse 的值，这就需要断点了。
1. 打开 Charles 调试开关。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503171900.png)

2. 右键需要断点的请求，勾选 Breakpoints。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163637.png)

可能这个请求带有 sign 这样的唯一参数，导致后面所有的请求都会不太一样，这时可以编辑断点，去掉相应的参数。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163716.png)
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163719.png)
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163724.png)

3. 手机执行请求，Charles 会先拦截到 Request，这时可以修改请求的参数等等。修改结束之后点击下面的 Execute 发送请求。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163729.png)
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163732.png)
图中实例的请求没有传递什么参数，所以没什么数据。

4. 请求返回成功之后会自动拦截返回的 Reponse，这时可以查看请求的内容，以及返回的具体 Reponse，也可进行相应的修改。
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163735.png)
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163737.png)
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/3/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180503163739.png)

## 小结
整个工具使用起来比较简单方便，也能实现基本的手机抓包需求，推荐使用。
就是如果不注册的话，会经常在启动也暂停几秒到十几秒不等，可以购买支持一下，当然网上也有免费的激活账号，可以自行查阅。
