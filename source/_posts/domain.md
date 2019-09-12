---
title: 博客添加域名映射
date: 2016-04-07 14:05:45
tags:
 - blog
---

利用Github搭建博客有一阵子了，每次访问都必须带上``github.io``，其实我的内心是拒绝的，于是今天打算买个自己的域名，然后映射到博客。

## 购买域名
首先第一步自然是买域名了。许多人都说是用``GoDaddy``，但是我去搜了一下，随便一个就是15刀，吓死宝宝了~
刚开始嘛，弄个便宜的尝尝鲜才是我的目的，于是我上[阿里云](https://wanwang.aliyun.com/)买了``lastwarmth.site``这个域名，首年才只收费4块钱哟~
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain9.png)

<!-- more -->

## 域名解析
登录阿里云，进入到``管理控制台``，点击``域名``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain1.png)
可以看到自己购买的域名，点击后面的``解析``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain2.png)
跳过``新手设置引导``，直接点击``进入高级设置``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain3.png)
然后点击``添加解析``。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain4.png)
可以看到记录的几种类型，因为映射到的github.io博客也是Github的域名，所以我选择的``CNAME``，主机记录配置``www``，解析线路``默认``，记录值填写自己的博客地址，我填的是``lijia92.github.io``。
填写完之后，再添加一条``@``主机记录配置。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain5.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain8.png)

## Github关联
在自己Github的github.io的仓库根目录下创建``CNAME``文件，编辑，填入你的域名。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain6.png)

## 最后
wait。

稍后便能通过域名访问博客啦。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/04/domain7.png)

## 小问题
在更新博客deploy的时候，添加的``CNAME``文件会被刷掉，导致映射不过去。所以需要将``CNAME``添加到``hexo/source``下面，然后重新部署。
