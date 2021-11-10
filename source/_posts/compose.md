---
title: Compose 初识
date: 2021-11-10 17:14:27
tags:
 - Kotlin
---
最近对 Kotlin 的协程、Flow 简单了解一下，也在实际开发中尝试使用了，还是挺香的。凯哥也出了 Compose 的课程，我同学买了课，群里发个群收款，想看的就付个款，免费的大家就不会看了，手忍不住地就付了。确实是因为付了钱，所以觉得不看就亏了，然后下班回家还硬着头皮看了两节课，这可是我少有的在下班时间研究技术了，金钱的魔力呀。
因为暂且可能还不会用 Compose，好记性不如烂笔头，就简单记录一下。

## 什么是 Compose
> Jetpack Compose 是用于构建原生 Android 界面的新工具包。它可简化并加快 Android 上的界面开发，使用更少的代码、强大的工具和直观的 Kotlin API，快速让应用生动而精彩。

简单来说，就是一套 UI 框架，可以编写 Kotlin 代码来替代原先的 xml 工作，这样就不用 xml 与 Java/Kotlin 代码间来回切换了。

<!-- more -->

## 声明式 UI
Compose 的核心就是「声明式 UI」。何为「声明式 UI」？
> 所谓的「声明式 UI」：你只要声明界面是什么样子，不用手动去更新，因为界面会自动更新。而传统的写法里，数据发生了改变，我们得手动用 Java 代码或者 Kotlin 代码去把新数据更新到界面。你给出详细的步骤，去命令界面进行更新，这就是所谓的「命令式 UI」。

这个就有点像 DataBinding 做到的事情，只处理数据，页面自动刷新。但：
> Data Binding （不管是这个库还是这种编程模式）并不能做到「声明式 UI」，或者说，声明式 UI 是一种比数据绑定更强的数据绑定。

接下来就有个我认为更加牛逼的特性：**你可以通过数据，来控制整个 View 的渲染。**
举个例子：
```
var show = xxx
Column {
  if (show) {
    Text()
  }
  Button()
}
```
> 注意，当 show 先是 true 然后又变成 false 的时候，**不是设置了一个 setVisibility(GONE) 这样的做法，而是直接上面的 Text() 在界面中消失了**。每次数据改变所导致的界面更新，看起来就跟**界面关闭又重启、并用新的数据重新初始化了一遍一样**。这，才叫声明式 UI，这是数据绑定做不到的。而且 **Compose 并不是真的把界面重启了，它只会刷新那些需要刷新的部分**，这样的话就能保证，它自动的更新界面跟我们手动更新一样高效。比如上面这里 show 的值从 true 变成 false 了，if 里面的 Text() 会被重新调用一次，但是外面的 Column() 和里面的 Text() 却不会被重新调用。很神奇吧？怎么做到的？靠的 code>@Composable 关键字，或者说靠的 Compose 的编译器插件，这个插件通过对编译过程的干预，把代码的逻辑拆到了我们看不到的细粒度，让这种看起来是连续的代码可以做到互相独立地执行。

结合收费课程自我理解一下：Compose 是一套独立的 View 系统，区别于我们熟悉的 View、ViewGroup 那一套。之前的父 View、子 View 的改变会互相影响，而 Compose 会将所有 View 独立，这样在数据改变时只需要改变对应的 View 即可，而其他的 View 纹丝不动。可以想象一下：这样的话，View 层级对渲染性能的影响将消失，界面刷新的效率也会更高，我们开发者能做的事情也是可以无限想象了，但我们可能得重新学习 Compose 中 View、ViewGroup 的相关知识（触摸事件传递等）了(ಥ_ಥ)。

## 简单使用
通过 AndoirdStudio 建立一个 Compose 工程，编译通过可以看到是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2021/WechatIMG191.png)
可以看到，不需要 xml，仅仅通过 Compose 相关函数，就可以看到一个基本的页面。左边 Kotlin 代码，通过 Preview 注解在右边实时预览 Compose 函数生成的 UI 长什么样子。
看了凯哥的第一课 「两小时写一个微信界面」之后，我大概了解 Compose 写代码要怎么写了，但是这个就和刚开始学习安卓写 xml 布局类似，需要边写边学。写代码的方式与当前的 Flutter 等都类似，声明式声明式，感觉未来就是声明式的天下了！

## 小结
1. 去掉 xml，单纯 Kotlin 代码写一切，基于 Kotlin 语言的各种方法糖，更自由更方便。之前是先写 xml，然后再写逻辑。使用 Compose 的话，就是 UI、逻辑一块写了，更加一气呵成。
2. 声明式 UI，动态更新只需要更新的 View，其他 View 不会改变。代码更少，更直观，更快，更强！

## 参考
[使用 Jetpack Compose 更快地打造
更出色的应用](https://developer.android.google.cn/jetpack/compose)
[谷歌开发者大会扔物线演讲原稿整理：Jetpack Compose](https://rengwuxian.com/jetpack-compose-1/)
[声明式 UI？Android 官方怒推的 Jetpack Compose 到底是什么](https://rengwuxian.com/jetpack-compose-3/)