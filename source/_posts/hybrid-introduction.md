---
title: Android Hybrid开发入门：原生Android与JS的交互
date: 2015-12-25 15:03:16
tags:
 - hybrid开发
---

## 介绍
我们知道，现在App大致分为3类：``Hybrid App``、``Web App``、``Native App``。Hybrid App兼具“Native App良好用户交互体验的优势”和“Web App跨平台开发的优势”，市面上现在也有许多Hybrid App。

最近做的项目，也会使用到Hybrid开发，之前没做过的。所以今天初步学习了一下，记录一下学习心得。

## 代码
首先，新建一个新的AS module，然后新建assets目录，至于src/main文件夹下。如下图：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2015/12/hybrid-introduction1.png)
我们再assets目录下，新建一个hello.html，编辑内容如下：
```
<html>
<head>
    <script>
    function hello() {
        document.getElementById("demo").innerHTML = "Hello Hybrid!";
    }
    </script>
</head>
<body>
<div>
    <a href="#" id="demo" onclick="window.demo.clickOnAndroid()">Click Me</a>
</div>
</body>
</html>
```
一个很简单的html页面。

<!--more-->

然后新建一个WebViewActivity。
```
public class WebViewActivity extends Activity {

    private WebView webView;
    private Context mContext;
    private Handler mHandler = new Handler();

    @SuppressLint("JavascriptInterface")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mContext = this;
        // 创建WebView对象
        webView = new WebView(this);
        // 切换到内容视图
        setContentView(webView);
        // 获取WebView配置
        WebSettings ws = webView.getSettings();
        // 启用JavaScript
        ws.setJavaScriptEnabled(true);
        // 载入assets目录下的一个页面
        webView.loadUrl("file:///android_asset/hello.html");
        // 添加交互接口
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void clickOnAndroid() {
                Toast.makeText(mContext, "Hello Hybrid.", Toast.LENGTH_SHORT).show();
                mHandler.post(new Runnable() {
                    public void run() {
                        webView.loadUrl("javascript:hello()");
                    }
                });
            }
        }, "demo");
    }
}
```
通过WebView的loadUrl，填入我们hello.html的路径，便能在App中加载这个页面了。（别忘记在AndroidManifest.xml中声明Activity）
loadUrl填入JS方法，则可调JS方法。
注意使用的handler发送消息来更新。如是直接webView.loadUrl("javascript:hello()");可能会导致如下错误：

 > <font color=red>java.lang.Throwable: A WebView method was called on thread 'JavaBridge'. All WebView methods must be called on the same thread. (Expected Looper Looper (main, tid 1) {425f48a8} called on Looper (JavaBridge, tid 92104) {426508d0}, FYI main Looper is Looper (main, tid 1) {425f48a8})

即是需要在同一个进程中进行更新，所以需要使用handler发送消息更新。

回到AS帮我们自动建好的MainActivity。修改FloatingActionButton点击事件：
```
FloatingActionButton fab = (FloatingActionButton) findViewById(R.id.fab);
        fab.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent intent = new Intent(MainActivity.this, WebViewActivity.class);
                startActivity(intent);
            }
        });
```
启动应用，看下效果：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2015/12/hybrid-introduction2.png)
可以看到，点击“click me”的时候，弹出了Toast，并且button的text改变了，这即是android与js的交互。当然，这个交互十分简单，后面还有很多的坑要踩~

## Tips
注意到代码中的clickOnAndroid方法上方的注解``@JavascriptInterface``，这个注解很关键。若没有这个注解，会在4.2以上版本的android上出现：``Uncaught TypeError: Object [object Object] has no method xxx``的错误。

对于4.2之前的版本，采用这种方式可能会被恶意JS攻击，诸如平台型App需要访问三方Html的则不建议采用这种方式实现交互。

## 更多
前面示例js调用android是通过addJavascriptInterface来进行交互的，下面再介绍2种方式。

 - 重写WebViewClient.shouldOverrideUrlLoading：
```
webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Toast.makeText(mContext, url, Toast.LENGTH_SHORT).show();
                return super.shouldOverrideUrlLoading(view, url);
            }
        });
```
当页面内的URL发生变化时，如点击链接、执行JavaScript（如location.href="xxxxxxx"）等均会触发WebViewClient.shouldOverrideUrlLoading，通过将Web调用Native的数据封装在URL，再由Native解析数据并执行响应Native方法。

例如：将前面示例中的hello.html改成如下：
```
<html>
<head>
    <script>
    function hello() {
        document.getElementById("demo").innerHTML = "Hello Hybrid!";
    }
    </script>
</head>
<body>
<div>
    <a href="hybrid.html" id="demo" onclick="window.demo.clickOnAndroid()">Click Me</a>
</div>
</body>
</html>
```
在点击“Click Me"之后，页面会跳转到hybrid.html，此时便会进入native执行shouldOverrideUrlLoading方法，再来解析Url，并执行相应的native方法。

 -  重写WebChromeClient.onJsPrompt，或onJsConfirm，或onJsAlert：
```
webView.setWebChromeClient(new WebChromeClient() {
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                Toast.makeText(mContext, url, Toast.LENGTH_SHORT).show();
                result.confirm("");
                return true;
            }
        });
```
当执行“window.prompt（“{}”）”这样的JavaScript代码时，将会触发WebChromeClient.onJsPrompt。onJsConfirm、onJsAlert也是如此。

例如：将前面示例中的hello.html改成如下：
```
<html>
<head>
    <script>
    function hello() {
        document.getElementById("demo").innerHTML = "Hello Hybrid!";
    }
    </script>
</head>
<body>
<div>
    <a href="#" id="demo" onclick="window.prompt('Hello')">Click Me</a>
</div>
</body>
</html>
```
当点击“Click Me”时，会进入native执行onJsPrompt方法，再来解析url，message，并执行相应的native方法。

## 最后
Github上找到一个开源库：[safe-java-js-webview-bridge](https://github.com/pedant/safe-java-js-webview-bridge)，便是采用的这种方式进行交互，并做了更好的封装，是个不错的选择。
