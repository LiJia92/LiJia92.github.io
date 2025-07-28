---
title: Retrofit初识
date: 2016-06-23 15:33:45
tags:
 - Android 进阶
---

## 前言
在这个技术日新月累的今天，各种新的轮子层出不穷。网络这块，从``HttpClient``到``android-async-http``，再到``Volley``。当下比较火的网络框架``Retrofit``也是受到了很多开发者的热爱。虽然项目中并没有使用到``Retrofit``，但抱着学习的态度，我还是打算接触一下，算是有个了解。说不定后面的开发中会用到呢？

## Retrofit概述
``Retrofit``是一个 RESTful 的 HTTP 网络请求框架的封装。注意这里并没有说它是网络请求框架，主要原因在于网络请求的工作并不是``Retrofit``来完成的。``Retrofit 2.0``开始内置``OkHttp``，前者专注于接口的封装，后者专注于网络请求的高效，二者分工协作。
我们的应用程序通过``Retrofit``请求网络，实际上是使用``Retrofit``接口层封装请求参数、Header、Url等信息，之后由``OkHttp``完成后续的请求操作，在服务端返回数据之后，``OkHttp``将原始的结果交给``Retrofit``，后者根据用户的需求对结果进行解析的过程。所谓``Retrofit``，其实就是``Retrofitting OkHttp``了。

<!-- more -->

## Hello Retrofit
废话不多说，直接撸代码。

新建项目，添加依赖：
```
compile 'com.squareup.retrofit2:retrofit:2.1.0'             //Retrofit2所需要的包
compile 'com.squareup.retrofit2:converter-scalars:2.1.0'    //ConverterFactory的String依赖包
```

我找了一个天气API，用作示例中的网络请求。
```
http://weatherapi.market.xiaomi.com/wtr-v2/temp/realtime?cityId=101010100
```
101010100代表的是北京市，这个接口会返回北京的实时天气。

OK，下面开始写请求的API了。

定义如下接口：
```
public interface RequestService {
    @GET("realtime")
    Call<String> getString(@Query("cityId") String cityId);
}
```

然后在Activity中添加代码：
```
button.setOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("http://weatherapi.market.xiaomi.com/wtr-v2/temp/")
                .addConverterFactory(ScalarsConverterFactory.create())
                .build();
        RequestService requestService = retrofit.create(RequestService.class);
        Call<String> call = requestService.getString("101010100");
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                Log.e("TAG", "成功：" + response.body().toString());
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                Log.e("TAG", "失败");
            }
        });

    }
});
```
运行代码，点击按钮。会发现Log中有如下的Log：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/retrofit1.png)

可见，网络请求成功。

## 相关说明
1. ``Retrofit``支持的协议包括``GET``/``POST``/``PUT``/``DELETE``/``HEAD``/``PATCH``，当然你也可以直接用HTTP来自定义请求,这些协议均以注解的形式进行配置。
2. 使用``ScalarsConverterFactory``可使返回值转化成String。
3. ``Retrofit``使用``@Query``来添加请求参数，示例中发送的请求实际就是``http://weatherapi.market.xiaomi.com/wtr-v2/temp/realtime?cityId=101010100``，通过``@Query``添加了``cityId``参数。
4. ``Retrofit``还有``@path``注解，直接与baseUrl整合成一个完整的请求。举个例子，采用相对路径：
```
path = "apath"，baseUrl = "http://host:port/a/b/"
那么最后发送的请求 url = "http://host:port/a/b/apath"
```

当然，``Retrofit``还有很多功能以及用法，以及背后它为什么如此受宠的原因，都有待慢慢学习。
It's just the beginning！
