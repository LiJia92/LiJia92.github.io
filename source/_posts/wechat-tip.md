---
title: 记录微信分享的一个坑
date: 2019-03-05 17:47:01
tags:
 - 日常开发
---
今天碰到一个问题，社区里帖子有的可以分享到微信，有的不行，单独调试获取分享的数据，发现并无不同。生成分享数据的代码如下：
```
WXMediaMessage mediaMessage = new WXMediaMessage(programObject);
mediaMessage.title = shareData.getTitle();
mediaMessage.description = shareData.getContent();
mediaMessage.thumbData = Utils.readMiniProgramThumbImageFileData(shareData.getShareImagePath());
//发送请求
SendMessageToWX.Req req = new SendMessageToWX.Req();
req.transaction = String.valueOf(listenerId);
req.message = mediaMessage;
// 目前支持会话
req.scene = SendMessageToWX.Req.WXSceneSession;
doSendReq(req);
```
shareData 是客户端单独组织的一个 Model。起初怀疑是 thumbData 太大导致的，结果后面可以分享的帖子生成的 thumbData 所占的字节还要大一些。。。
然后试着分享到微博、QQ 等其他平台，发现也可以分享成功，唯独微信分享给朋友或朋友圈不行。偶然的发现一个帖子分享到微博也会失败，而微博客户端给出了“内容不符合规范”类似大意的提示，于是猜测可能是 description 导致。于是分别调试了不同帖子的数据，发现不能分享的帖子生成的 description length 都是 2000+，而可以分享的帖子生成的才 1000+，没有超过 2000，于是预测是 description 超长导致的。最后调试进行截取，超长的则取前 100 个字符，发现问题解决。
问题比较简单，但是调试的时候很坑，因为分享失败的帖子竟然连 WxEntryActivity 里的 onResp 都不回调，所以压根无法知道失败的原因，只能对比数据靠猜测，于是便记录一下，以后碰到这类问题便知道如何解决了。
总结一下：**微信分享传的 description 参数不能过长（测试 1800 以下是可以分享的），否则会分享失败，而且回调里的 onResp 都不会调用。**