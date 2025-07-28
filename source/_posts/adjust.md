---
title: 博客图片迁移
date: 2019-09-12 16:05:05
tags:
 - 博客
---
早期博客图床使用的七牛图床，七牛图床被黄图给搞了，所以现在测试域名都只有一个月的使用期限，早些阵子就已经过期回收了，所以之前的测试域名绑定的图片全部失效了，2018-10-10 之前的博客图片全部看不了了，阿西吧~![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh118.gif)若要继续使用七牛图床，需要自己绑定加速域名，重新迁移才行。而绑定加速域名是需要已经备案过的，备案又需要实名制，而我的域名还没有实名制QAQ，不巧的是阿里域名根据工信部的条款，关闭了 .win 域名后缀的实名制认证，这就很尴尬了![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh132.gif)。然后一直等阿里云开放域名实名认证，等到现在也还没开放，今天下定决心把图片都迁移一下，不用七牛了。
图片所在的旧 Bucket 测试域名被回收之后，就彻底看不到图片资源了，也下载不了，只能借助七牛官方工具 [qshell](https://github.com/qiniu/qshell) 来进行相关操作。

<!-- more -->

### qshell
下载好相应平台的 qshell 工具，所用电脑为 Win7，所以以下示例均为 Windows 平台。
设置用户名及 key：
```
qshell account <AK> <SK> <Name>
```

### 获取所有图片的文件名
要从旧的的 Bucket 获取所有的文件名：
```
qshell listbucket blog-images -o list.txt
```
blog-images 为 Bucket 的名称，list.txt 为输出文件。list.txt 内容是个表格，具有多列属性，第一列为名称，是我需要的，其他所有列都不需要，需要删除。因为 Windows 命令行很不好用，我的文件数量也比较少，就直接用的很傻的办法，Android Studio 多行编辑手动删除了![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh124.gif)，然后得到一个只包含文件名的文件：name.txt。

### 迁移到新的 Bucket
新建一个 Bucket（last-backup） 会有一个月限期的测试域名，所以这一步，需要将测试域名过期的旧 Bucket 里的所有文件迁移到新的 Bucket（所属区域需要一致，华东、华南等）。
```
qshell batchcopy blog-images last-backup -i name.txt -s success.txt -e fail.txt
```
使用 batchcopy 指令，将旧 Bucket 的文件复制到新的 Bucket，-s 指定复制成功的输出文件，-e 指定复制失败的输出文件。最好指定一下，方便后面看哪些文件有问题，需要手动调整的。

### 从新 Bucket 下载文件
此时，新的 Bucket 已经有了所有的资源了（可能会有少许文件复制失败，只能手动校对了），并且有可用的域名，所以此时所有的资源都是可以访问到的。将所有文件下载下来：
```
qshell qdownload -c 10 config.txt
```
-c 指定同时下载的文件个数，config.txt 为下载的设置：
```
{
  "dest_dir": "D:\\blog_images",		   // 下载文件到哪里
  "bucket": "last-backup",				   // bucket 名称
  "cdn_domain": "pxp8xxx5.bkt.clouddn.com" // bucket 域名
}
```

### 上传到新的图床
一般的图床都会保留文件上传时的文件名，对于带路径的也是一样，我这里选择的是[腾讯云](https://console.cloud.tencent.com/cos5/bucket)。从七牛下载下来的文件，会按照上传时添加的前缀，生成对应的文件夹，好在腾讯也是支持文件夹的，将所有的文件按照对应的路径上传到腾讯云这步就 ok 了。

### 替换域名
之前 md 文件里写的旧的七牛的域名，替换成新的腾讯云的域名。直接 Sublime Text 全局搜索，替换就行。因为腾讯云支持文件夹上传，所以域名之后的路径其实都是一致的，只需要替换下域名即可，后面图片的路径保持不动即可，可以节约不少时间。部分图片会有问题，把所有文章过一遍，找到有问题的，手动修复一下就行了。

博客所有的图片终于都能看见了，虽然现在来看，早期的文章写得不怎么样，但这也是我成长的痕迹了。心里的一块石头终于落地了![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/mh121.gif)。