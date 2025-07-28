---
title: Android Hybrid开发实战之图片的交互
date: 2016-01-14 14:32:59
tags:
 - Android 进阶
---

## 前言
最近一直在学习Hybrid开发，如何在H5页面调用Android原生接口，并返回值，以及回调。学习了一段时间，总算是有点收获，效果也做出来了。于是写下这篇博客，记录一下。

本文中我以2个接口示例，来进行讲解。第1个示例很简单，就是调用接口，返回登录Token；第2个示例是H5调用接口，弹出Android原生界面进行图片选择，选择完之后返回选择图片的Base64格式的字符串。然后H5页面接收返回的字符串，回调进行图片显示。

## Base64
首先，讲解一下Base64。图片也是一个文件，可以通过Base64返回这个文件的Base64字符串，这个字符串可以直接放到H5的img标签进行显示。

<!--more-->

下面做个示例，方便大家了解。
新建一个Html文件，编写代码如下：
```
<html>
<head>
</head>
<body>
<img src="data:image/jpg;base64,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" />
</body>
</html>
```
可以看到img标签的src属性跟一串字符。”data:image/jpg;base64“表示数据的类型，之后的一大长串就是Base64串。直接浏览器打开，显示如下：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/01/hybrid-practice1.png)
可以看到图片正常显示了。

有了这个基础之后，后面的思路就很清楚了：Android层选择好图片后，返回图片的Base64格式的String对象到H5，H5回调拿来显示即可。

## 实践
本次例子采用三方库[safe-java-js-webview-bridge](https://github.com/pedant/safe-java-js-webview-bridge)进行Android、JS互调，[PhotoPicker](https://github.com/liuling07/PhotoPicker)进行图片选择。

AS新建项目，添加gradle依赖。PhotoPicker不支持gradle依赖，直接将代码下载下来后导入library Module。
添加asserts目录，将H5页面，js、css文件添加进去。这里我直接将项目中的联调页面扔进去了，以求简便。

根据safe-java-js-webview-bridge三方库的使用说明，新建MyBridge类。这个类就是定义Android、JS互调接口的类。
```
public class MyBridge {

    private static WebViewActivity activity;

    public static void init(WebViewActivity activity) {
        MyBridge.activity = activity;
    }

    public static void send(WebView webView, JSONObject jsonObject, JsCallback jsCallback) {
        try {
            String method = jsonObject.getString("cmd");
            switch (method) {
                case "getToken":
                    String token = activity.getToken();
                    if (jsCallback != null) {
                        jsCallback.apply(token);
                    }
                    break;
                case "getPictures":
                    activity.getPictures(jsCallback);
                    break;
                default:
                    break;
            }
        } catch (JSONException e) {
            e.printStackTrace();
        } catch (JsCallback.JsCallbackException e) {
            e.printStackTrace();
        }
    }

}
```
这个类需要根据H5页面那边调用接口的格式来进行编写，示例中的接口调用是这样子的。
```
function connectWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
        callback(WebViewJavascriptBridge);
    } else {
        document.addEventListener('WebViewJavascriptBridgeReady', function() {
            callback(WebViewJavascriptBridge)
        }, false);
    }
};

$(document).ready(function() {
    connectWebViewJavascriptBridge(function(bridge) {

        $("#getTokenBtn").click(function() {
            bridge.send({
                "cmd": "getToken",
                "data":{}
            }, function responseCallback(responseData) {
                $("#logger")[0].innerHTML += responseData + "<br>";
            });
        });

        $("#addPicBtn").click(function() {
            bridge.send({
                "cmd": "getPictures",
                "data": {
                    "count": 9
                }
            }, function responseCallback(responseData) {
                var imgs = JSON.parse(responseData).data.imgs;
                for (var i = 0; i < imgs.length; i++) {
                    $('#picList').append('<li><img src="data:image/jpeg;base64,' + imgs[i] + '" alt="image" width="50" height="50"></li>');
                }
            });
        });
    });
});
```
所以我的MyBridge类只定义了一个send方法，在其内部接收Json数据，根据cmd参数判断到底要执行哪个方法。我把方法写在引用WebView的Activity中了，所以添加了一个init方法，进行初始化，保持WebViewActivity对象，以便调用。

下面编写WebViewActivity类。
```
public class WebViewActivity extends Activity {

    private WebView webView;

    public static JsCallback onceCallback; // 单次回调

    private static final int PICK_PHOTO_REQUEST = 1; // 选择图片请求码
    private static final int MAX_PHOTO_NUM = 9; // 最大选择数量
    private static boolean showCamera = true; // 是否打开相机

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MyBridge.init(this);
        webView = new WebView(this);
        // 切换到内容视图
        setContentView(webView);
        // 获取WebView配置
        WebSettings ws = webView.getSettings();
        // 启用JavaScript
        ws.setJavaScriptEnabled(true);
        webView.setWebChromeClient(new InjectedChromeClient("WebViewJavascriptBridge", MyBridge.class));
        // 载入assets目录下的一个页面
        webView.loadUrl("file:///android_asset/native-api.html");
    }

    public String getToken() {
        return "hello world";
    }

    public void getPictures(JsCallback jsCallback) {
        onceCallback = jsCallback;
        Intent intent = new Intent(this, PhotoPickerActivity.class);
        intent.putExtra(PhotoPickerActivity.EXTRA_SHOW_CAMERA, showCamera);
        intent.putExtra(PhotoPickerActivity.EXTRA_SELECT_MODE, PhotoPickerActivity.MODE_MULTI);
        intent.putExtra(PhotoPickerActivity.EXTRA_MAX_MUN, MAX_PHOTO_NUM);
        startActivityForResult(intent, PICK_PHOTO_REQUEST);

    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_PHOTO_REQUEST) {
            if (resultCode == RESULT_OK) {
                // 拼接返回Json
                ArrayList<String> result = data.getStringArrayListExtra(PhotoPickerActivity.KEY_RESULT);
                JSONObject dataJson = new JSONObject();
                JSONObject images = new JSONObject();
                JSONArray jsonArray = new JSONArray();
                for (int i = 0; i < result.size(); i++) {
                    File file = new File(result.get(i));
                    try {
                        FileInputStream fis = new FileInputStream(file);
                        byte[] dataInByte = steamToByte(fis);
                        String msg = Base64.encodeToString(dataInByte, Base64.DEFAULT);
                        // 通过Base64方式返回的String会包含许多\n，需去除掉
                        msg = msg.replaceAll("\n", "");
                        jsonArray.put(msg);
                        fis.close();
                    } catch (FileNotFoundException e) {
                        e.printStackTrace();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
                try {
                    images.put("imgs", jsonArray);
                    dataJson.put("data", images);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                // 回调
                try {
                    if (onceCallback != null) {
                        onceCallback.apply(dataJson.toString());
                    }
                } catch (JsCallback.JsCallbackException e) {
                    e.printStackTrace();
                }
            }
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    public static byte[] steamToByte(InputStream input) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        int len;
        byte[] b = new byte[1024];
        while ((len = input.read(b, 0, b.length)) != -1) {
            baos.write(b, 0, len);
        }
        byte[] buffer = baos.toByteArray();
        return buffer;
    }
}
```
可以看到MyBridge中的send方法最终会调用到WebViewActivity中的getToken方法与getPictures方法。
getToken方法很简单，仅仅是返回一个”Hello world“。getPictures方法则是打开PhotoPicker三方库中的Activity。在选完图片之后，利用onActivityResult接收返回的图片路径。然后利用Base64进行处理，得到我们需要的String对象，返回给JsCallback进行回调。

在JS中处理回调参数的代码是``var imgs = JSON.parse(responseData).data.imgs;``，所以我们返回的String对象也需要时JSON格式，并且包含data、imgs属性。类似这样：{"data":{"imgs":["string1", "string2"]}}。所以我在onActivityResult中进行了拼接处理。

最后运行程序，得到的效果大致是这样的。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/01/hybrid-practice2.png)
可以看到，在我们的H5页面确实显示了图片。

## 题外话
### 话题1
在引入PhotoPicker的时候，若在选择图片碰到很长的图片，例如微博长图，400*8000px这样的图，会导致在时容易出现OOM。
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/01/hybrid-practice3.png)
在原来库中进行压缩的inSampleSize是这样计算的：
```
private int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
    // 源图片的宽度
    int width = options.outWidth;
    int height = options.outHeight;
    int inSampleSize = 1;
    int min = Math.min(width, height);
    int maxReq = Math.max(reqWidth, reqHeight);
    if(min > maxReq) {
        inSampleSize = Math.round((float) min / (float) maxReq);
    }
    return inSampleSize;
}
```
使用这种方式，计算得到的inSampleSize值，在压缩这种长图后得到的Bitmap仍然会很大，导致OOM。
改成如下则不会OOM了，但是图片会变得模糊一些（不可避免的，总要舍弃一些东西，微信也是这样）。
```
private int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
    // 源图片的宽度
    int width = options.outWidth;
    int height = options.outHeight;
    int inSampleSize = 1;

    if (width > reqWidth || height > reqHeight) {
        int widthRadio = Math.round(width * 1.0f / reqWidth);
        int heightRadio = Math.round(height * 1.0f / reqHeight);
        inSampleSize = Math.max(widthRadio, heightRadio);
    }
    return inSampleSize;
}
```
这个问题我已经跟作者反应，并且已经改正了。

### 话题2
拼接好String字符串，准备返回给JsCallback进行回调时会出错。Log信息：
```
Log：I/chromium: [INFO:CONSOLE(1)] "Uncaught SyntaxError: Unexpected identifier", source: (1)
```
后面我看到JsCallback里的apply函数：
```
public void apply (Object... args) throws JsCallbackException {
    if (mWebViewRef.get() == null) {
        throw new JsCallbackException("the WebView related to the JsCallback has been recycled");
    }
    if (!mCouldGoOn) {
        throw new JsCallbackException("the JsCallback isn't permanent,cannot be called more than once");
    }
    StringBuilder sb = new StringBuilder();
    for (Object arg : args){
        sb.append(",");
        boolean isStrArg = arg instanceof String;
        if (isStrArg) {
            sb.append("\"");
        }
        sb.append(String.valueOf(arg));
        if (isStrArg) {
            sb.append("\"");
        }
    }
    String execJs = String.format(CALLBACK_JS_FORMAT, mInjectedName, mIndex, mIsPermanent, sb.toString());
    Log.d("JsCallBack", execJs);
    mWebViewRef.get().loadUrl(execJs);
    mCouldGoOn = mIsPermanent > 0;
}
```
他会在参数的前后加上双引号。因为返回的String对象是类似Json格式，里面也会包含双引号，这就会导致传递出错。
这个问题我也已经提了issue给作者，但目前还没有什么回应。

碰到问题需要解决，在作者回应之前只能自己改咯。
将代码下载下来，丢到工程中，不采用gradle依赖的方式了。也就三个类：InjectedChromeClient、JsCallback、JsCallJava。手动将apply中的代码改成如下：
```
public void apply (Object... args) throws JsCallbackException {
    if (mWebViewRef.get() == null) {
        throw new JsCallbackException("the WebView related to the JsCallback has been recycled");
    }
    if (!mCouldGoOn) {
        throw new JsCallbackException("the JsCallback isn't permanent,cannot be called more than once");
    }
    StringBuilder sb = new StringBuilder();
    for (Object arg : args){
        sb.append(",");
        boolean isStrArg = arg instanceof String;
        if (isStrArg) {
            sb.append("'");
        }
        sb.append(String.valueOf(arg));
        if (isStrArg) {
            sb.append("'");
        }
    }
    String execJs = String.format(CALLBACK_JS_FORMAT, mInjectedName, mIndex, mIsPermanent, sb.toString());
    Log.d("JsCallBack", execJs);
    mWebViewRef.get().loadUrl(execJs);
    mCouldGoOn = mIsPermanent > 0;
}
```
双引号改成单引号就行了。

但是只有又会引发新的问题：返回的String不能包含单引号。这确实比较蛋疼了，只能根据需求来吧，能解决当前问题的就行。延伸到既包含双引号又包含单引号的String对象又该如何传递呢？这里抛个疑问，大家可以共同探讨。

补充一点：通过Base64返回的String串来显示图片只适合小图片，太大的图片需要压缩后再返回，不然也会OOM。

## 最后
[源码下载](https://github.com/LiJia92/HybridPhotoPicker)
