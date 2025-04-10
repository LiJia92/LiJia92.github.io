---
title: 如何面对 AI 浪潮
date: 2025-04-10 10:29:11
tags:
 - AI
---
## 前言
自 ChatGpt 诞生以来，全世界每天都在承受 AI 的冲击。今年年初的 DeepSeek 更是让中国 AI 沸腾。作为安卓工程师还是很焦虑的。要如何面对这一波的 AI 浪潮？**只能不断学习。**
起初使用 AI 也仅仅是在 Android Studio 中装一些插件，比如 Baidu Comate。但是这玩意感觉不太好用，通过对话框来回粘贴复制代码，着实费劲。后经同事介绍，了解到了 Cline，可以自动生成文件、修改代码，无需手动粘贴复制，下面便来介绍一下 Cline 的使用。

<!-- more -->

## Cline 介绍
Cline 是 VS Code 的一款插件。它可以自动生成代码，无需粘贴复制。集成价格优惠的 DeepSeek 也相当方便。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/1.pic.jpg)

输入提示词可能需要手动操作：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/2.pic.jpg)

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/3.pic.jpg)

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/4.pic.jpg)

可以直接勾选 Auto-approve，大多数场景就可以吃瓜等着了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/5.pic.jpg)

虽然它是个 VS Code 插件，但使用过程完全不需要操心 VS Code。本文的思路便是**只用它来生成代码，然后在 Android Studio 中去运行**。

## 生成 Hello World 安卓代码
首先输入提示词：
>生成一个 Hello world 安卓程序代码，语言为 kotlin。将相应的目录结构和文件生成出来。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/6.pic.jpg)

生成了相应的 activity_main.xml，AndroidManifest.xml 等文件。等到生成 gradle 文件时，执行相关指令报错。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/7.pic.jpg)

停止任务输入新提示词：
>直接生成所有的文件，不需要执行 gradle 的指令。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/8.pic.jpg)

最终生成以上结构的一些文件。
看了一下，大差不差，不过使用的版本过高，于是输入提示词进行修改：
>将 gradle wrapper 版本改为 6.5；gradle tools 改为 4.1.0

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/9.pic.jpg)

识别指令不仅仅是修改提示词中的两个版本，而是将所有的版本进行了统一的修改，避免了不匹配的情况。
最后查看文件目录如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/10.pic.jpg)

打开 Android Studio 进行编译，报错提示：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/11.pic.jpg)

于是继续输入提示词：
>指定 java 版本为 1.8

得到如下输出：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/12.pic.jpg)

继续编译，还是报错。然后详细对比文件目录，发现少了一个 gradle/wrapper 下面少了一个 jar 包，根目录下少了 gradlew、gradle.bat 文件。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/13.pic.jpg)

于是输入提示词：
>1. gradle wrapper 目录下少了一个 jar 文件；
2. 根目录下少了 gradlew 、gradlew.bat 文件；
将以上缺失文件进行补全

这里也有个疑问：针对 jar 包这类文件，AI 会如何处理？
等待过程中发现它的思路：
>Thinking好的，我现在需要帮助用户解决Gradle Wrapper文件缺失的问题。根据用户的反馈，他们发现gradle/wrapper目录下缺少jar文件，并且根目录下缺少gradlew和gradlew.bat文件。用户已经尝试了一些命令，但似乎遇到了权限问题和类找不到的错误。 首先，我需要确认用户已经执行了哪些步骤。用户之前尝试了执行`./gradlew wrapper --gradle-version 6.5`，但遇到了权限被拒绝的问题，之后通过`chmod +x gradlew`修复了权限。但随后运行时又出现找不到GradleWrapperMain类的错误，这表明gradle-wrapper.jar文件确实缺失。 接下来，我需要确定如何正确生成这些缺失的文件。通常，Gradle Wrapper的正确生成方式是通过运行`gradle wrapper`命令，这会自动生成所需的脚本和jar文件。但用户的环境可能没有安装Gradle，或者项目配置有问题。 用户尝试使用`./gradlew`命令时出现错误，说明当前目录下的gradle-wrapper.jar不存在或损坏。这时候，手动下载并解压该文件可能是最快的解决办法。根据用户之前的建议，使用curl和unzip命令从Gradle官方下载并提取jar文件到正确的位置。 需要注意的是，用户可能不熟悉命令行操作，或者对路径处理不太熟悉，因此在建议命令时需要确保路径正确。例如，解压时使用`-d gradle/wrapper/`来指定目标目录，确保jar文件被放置在正确的位置。 另外，用户可能希望避免再次遇到权限问题，所以在下载和解压后，再次运行`chmod +x gradlew`来确保脚本可执行。 最后，验证步骤很重要，用户需要确认所有文件已正确生成，并且Gradle命令可以正常运行。建议用户运行`./gradlew tasks --stacktrace`来测试，如果还有问题，可以查看详细的错误信息。 总结来说，用户的问题在于缺失必要的Gradle Wrapper文件，解决方法是通过手动下载并配置这些文件，确保权限正确，然后验证配置是否成功。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/14.pic.jpg)

然后就是等待下载 gradle：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/15.pic.jpg)

终于快下完了：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/16.pic.jpg)

下载完之后提示这个：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/17.pic.jpg)

这里 Retry 仍然会报错，只能 Start New Task 了，输入：
>生成 gradle-wrapper.jar 文件，放到对应的目录中

又开始进行了很多的 gradle 指令，环境不对，各类报错：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/18.pic.jpg)

最终放弃，手动完善了 Gradle 环境，并升到了 7.2，可以编译通过了。
然后 AndroidManifest.xml 中定义的 mipmap、style 都是缺失的，程序肯定是运行不了的。继续通过提示词进行完善：
>AndroidManifest 中引入了不存在的 mipmap，请加入相关文件
@style/AppTheme 缺失，进行补全

执行过程如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/19.pic.jpg)

继续回到 Android Studio 运行 App，报错：
>Unable to make field private final java.lang.String java.io.File.path accessible: module java.base does not "opens java.io" to unnamed module @3671927e

继续塞给 cline 看如何解决。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/20.pic.jpg)

一顿操作猛如虎，改了一些配置文件，运行也还是很多报错，主要是版本匹配问题。（已经快没耐心了）
最后给出如下指令：
>gradle wrapper：gradle-6.5-bin
build tool：4.1.0
compileSdkVersion 29
buildToolsVersion "29.0.3"
minSdkVersion 22
targetSdkVersion 31
java版本 1.8
请按照如上配置，修改所有的配置信息，并执行指令 ./gradlew app:assembleDebug。
若运行出错，请解决对应错误，并重新运行指令。

结果运行一段时间来了个：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/21.pic.jpg)

至此已经彻底放弃使用 Cline 通过提示词来生成一个可以运行的 Hello World 安卓程序了。

## 实现简易计算器
手动改造安卓程序环境，能正常运行 App 了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/22.pic.jpg)

回到 Cline 输入提示词：
>当前目录是一个安卓程序，运行后会展示一个 "hello world"的文案，给它添加一个点击事件，达到如下效果：
1.打开一个新页面，这个页面展示简易计算器的相关 UI，展示0～9的数字、加减符号等等;
2.可以执行简易计算器的加减乘除功能，并展示结果。
使用 java 语言开发。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/23.pic.jpg)

这个思路看起来是没问题的。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/24.pic.jpg)

等待任务结束，回到 AS 查看修改文件。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/25.pic.jpg)

运行。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/26.pic.jpg)

界面有点不太显眼。
先输入提示词，提交代码：
>将当前代码进行 git 提交

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/27.pic.jpg)

继续输入提示词：
>计算器页面过于丑陋，请基于横向屏幕重新设计，不要引入额外的库

执行完毕后运行：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/28.pic.jpg)

界面确实好看一些了，而且是基于横屏显示，但是缺失了一些按钮和符号。
继续输入提示词：
>计算器界面风格不错，但是缺失了其他数字和符号，比如“1”、“2”、“+”等。
保持这个界面风格的基础上，完善其他的数字、操作符号。

完成后运行：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/29.pic.jpg)
简易计算器的 UI 元素完整了，但是数字和操作符分隔开了。
继续输入提示词：
>数字和操作符布局分隔开了，调整一下，使符号按钮在一块，数字按钮在一块。

完成任务后运行：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/30.pic.jpg)
这样看着界面就舒服多了。操作几番得到的结果也都是准确的。
继续输入提示词：
>在计算器界面增加一个功能：实时渲染输入的表达式。

完成任务后运行：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/31.pic.jpg)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/32.pic.jpg)

还有点小毛病，但基本完成了。全程没写一行代码，完成了一个简易计算器的界面。

## 其他错误
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/33.pic.jpg)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/34.pic.jpg)

## 题外 Tip
使用 Cline 有访问本地文件的能力，那就可以做一些本地文件的处理了。
正好电脑提示磁盘不足，本地 gradle 版本太多，准备删掉一些，这个时候也可以用 AI 来进行排查筛选。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/35.pic.jpg)

输入提示词：
>遍历本地 mucang 文件夹，查找所有的 gradle-wrapper.properties 文件，查出 distributionUrl 字段的值。将其去重后，按项目个数进行倒序排序，且需要展示项目名称，以列表形式进行展示。

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/36.pic.jpg)
>将上述结果以一个 html 进行展示

本地就会生成一个 html，打开后就能很直观看到了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2025/4/37.pic.jpg)

## 小结
整体使用下来，个人感觉 Cline 有以下几个优点：
1. 虽然它是个 VS Code 插件，但使用过程可以全程与 VS Code 无关，减少了学习成本；
2. 直接在对应目录下生成文件，无需自行粘贴复制；
3. 使用 Auto-approve 可以跳过大多数中间的操作确认，可以边嗑瓜子边等任务完成；
4. 给了访问本地文件的权限，那就可以帮忙做很多事情了；
5. 依赖提示词，可以直接生成固定格式的文本代码；
6. 集成其他大模型很方便，简单设置一下即可。

对应的当然也有些缺点：
1. 对于 Android 环境的搭建，还是不太行。它不会明确告诉你“做不到”。它一定会给出一个“答案”，即使最后运行的时候你发现它是错的。依赖它进行问题自查并解决，在现阶段还是比较困难的；
2. 无法生成图片、jar 包这类文件；
3. 运行过程耗时不确定，有时候很快，有时候要等很久，也不知道是哪里卡住了；
4. 一个 Task 过长很容易提示 token 超出了，只能重新创建 Task，不知道这时候是否还具备相应的上下文。

总而言之，作为一名“技术”，面对 AI 浪潮，只能拥抱它。
保持学习吧！
