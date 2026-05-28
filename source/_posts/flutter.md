---
title: Flutter 入门之边改边学
date: 2026-05-25 16:16:07
tags:
  - Flutter
---
之前负责的 Android 项目都是原生开发，公司有基于 Flutter 开发的项目，最近分了个问题单给我来改，准备基于实际问题一边修改问题，一边学习 Flutter 相关的知识。此文便记录下学习 Flutter 的过程。

<!-- more -->

## 环境准备
一般公司内部都会有相关的文档，如何准备相应的 Flutter 环境。Android 的话，基于 Android Studio 安卓 Flutter、Dart 插件就可以了。另外需要安装 Flutter 环境，主要就是涉及到几个指令：
```bash
flutter doctor  // 检查 Flutter 环境、Android SDK、证书是否齐全登
flutter clean  // 清理 Flutter 缓存文件
flutter pub get  // 安装项目依赖
flutter pub upgrade  // 更新项目依赖
```
``pub get``是根据 ``pubspec.yaml`` 下载所有第三方库的指令。pub 是 Flutter/Dart 的 “包管理器”，相当于前端的 npm、Android 的 gradle、iOS 的 CocoaPods。
它大概长这样：
```yaml
name: demo
description: A new Flutter project.

# 版本号
version: 1.0.0+1

# 第三方依赖（你要加库都写这里）
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1  # 状态管理
  dio: ^5.4.0       # 网络请求

# 开发依赖
dev_dependencies:
  flutter_test:
    sdk: flutter
```
当各类环境准备好之后，就可以直接运行项目了。项目能正常跑起来了，就可以看问题单了。
**这里需要额外注意下下安装 Flutter 的版本，要和项目依赖的 Flutter 版本一致，最好不要自己随便下个版本就用了，否则可能会导致项目编译失败。**
```
Couldn't resolve the package 'dio' in 'package:dio/dio.dart'.

> Task :flutter_boost:compileDebugJavaWithJavac FAILED

C:\Users\a11770\AppData\Local\Pub\Cache\git\flutter_boost-88b5ac273de51019891280030a38420ba3a84ea5\android\src\main\java\com\idlefish\flutterboost\FlutterBoost.java:22: 错误: 找不到符号

import io.flutter.view.FlutterMain;
```

## 问题单
问题单描述很简单：部分页面底部图标显示不全。
截图如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/9.png)

很明显，弹出的底部按钮被截断了。考虑到这个问题是在 Android 16 的手机上出现的，在我自己的测试机（Android 14）上没有这个问题，初步怀疑是 Android 16 的 Edge-to-Edge 导致的。现在需要找到这个弹窗的代码，进行排查。
当前的 Flutter 项目不同于原生 Android 项目，它没有 Activity，没有 Fragment，没有 XML。
首先全局搜索``New Device discovered``找到这个字符串的引用。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/10.png)

搜索的时候最好勾选``All Places``，这样可以找到所有引用，否则可能会漏掉一些引用（有些引用是通过相对路径引入，Project 则搜索不到）。
就比如拿到词条对应的 key 进行搜索：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/11.png)

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/12.png)

第一个图搜索之看到定义的地方，却没有调用的地方。第二个图则能搜到在 ``local_net_can_active_alert_widget.dart`` 中调用了这个字符串，这个文件是在本地相对路径依赖的 FlutterPackages SDK（公司多个项目，都会依赖 SDK）中的。
找到文件便可以查看对应的代码了：
```
class _LocalNetCanActiveAlertWidget extends StatelessWidget {
  const _LocalNetCanActiveAlertWidget();

  @override
  Widget build(BuildContext context) {
    return _contentWidgetWrapper();
  }

  Widget _contentWidgetWrapper() {
    return BlocSelector<LocalNetSearchAlertCubit, LocalNetSearchAlertState, List<LocalNetDevice>>(
      selector: (state) {
        List<LocalNetDevice> inactiveList = state.deviceList.where((element) => element.isActivated != true).toList();
        List<String> deviceIds = LocalNetSearchAlertUtils.showedInactiveList.map((e) => e.deviceId).toList();

        /// 没有显示过的可激活设备列表
        return inactiveList.where((element) => !deviceIds.contains(element.deviceId)).toList();
      },
      builder: (context, deviceList) {
        return ConnectivityDetector(
          builder: (context, isNetworkConnected, isWifiConnected) {
            if (isWifiConnected) {
              return _contentWidget(context, deviceList);
            } else {
              return _contentWidget(context, []);
            }
          },
        );
      },
    );
  }

  Widget _contentWidget(BuildContext context, List<LocalNetDevice> itemList) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 4 / 5),
      decoration: BoxDecoration(
        color: itemList.isEmpty ? kThemeBgColorWhite : kThemeWarningBgColorLightDisabled,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(kThemeRadius_12), topRight: Radius.circular(kThemeRadius_12)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _headWidget(context),
          Flexible(child: _innerContentWidget(context, itemList)),
          _toolsWidget(context, itemList),
        ],
      ),
    );
  }
}
```
``dart``语言虽说没怎么系统学习过，但也写过这么久的代码了，稍加看一下也能看出来这个页面的内容，是顶部一个 _headWidget，中间一个 _innerContentWidget，底部一个 _toolsWidget。中间的 _innerContentWidget 是 Flexible 的 child，所以它可以自动调整高度，以适应内容。
那么为何这样的一个界面，底部按钮会被截断？以及要如何修改呢？
现在有了 AI，即使很多东西不懂，但也可以很快找到答案。
> Android 16 Edge-to-Edge 模式导致弹窗高度计算异常，可以使用 SafeArea 来解决。

修改成这样就好了：
```
  Widget _contentWidget(BuildContext context, List<LocalNetDevice> itemList) {
    return Container(
        constraints: BoxConstraints(maxHeight: MediaQuery
            .of(context)
            .size
            .height * 4 / 5),
        decoration: BoxDecoration(
          color: itemList.isEmpty ? kThemeBgColorWhite : kThemeWarningBgColorLightDisabled,
          borderRadius: BorderRadius.only(topLeft: Radius.circular(kThemeRadius_12), topRight: Radius.circular(kThemeRadius_12)),
        ),
        child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _headWidget(context),
                Flexible(child: _innerContentWidget(context, itemList)),
                _toolsWidget(context, itemList),
              ],
            )
        )
    );
  }
```
修改是把 child 使用 SafeArea 包裹起来， top 为 false，可以看下 SafeArea 的内容：
```
const SafeArea({
  super.key,
  this.left = true,
  this.top = true,
  this.right = true,
  this.bottom = true,
  this.minimum = EdgeInsets.zero,
  this.maintainBottomViewPadding = false,
  required this.child,
});
```
它可以支持四个方向的 padding，以及是否维护底部视图的 padding。默认是 true，所以会维护视图四个方向的 padding。问题中的这个弹窗是基于底部的，所以 top 可以设置成 false。
看，虽然咱不懂 Flutter，但经过一段时间的摸索，也可以把这个问题给解决了。

## assets 引用
在排查问题时，也有个弹窗有类似的问题，就是底部图标显示不全。最终跟进到代码是这样的：
```
  /// 操作栏
  Widget _operationWidget(BuildContext context) {
    if (isSimpleStyle) {
      return const SizedBox.shrink();
    }
    if (!device.isActivated) {
      return const SizedBox.shrink();
    }
    if (device.bizInfo.devUpgradeState == 2) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: EdgeInsets.only(top: kThemeSpacing_12, left: 63, right: 63),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _operationItemWidget(context, 'assets/images/themes/default/localNetSearch/operation_live.png', () {
            context.read<LocalNetSearchCubit>().onGoLive(device);
          }),
          _operationItemWidget(context, 'assets/images/themes/default/localNetSearch/operation_playback.png', () {
            context.read<LocalNetSearchCubit>().onGoPlayback(device);
          }),
          _dynamicItemWidget(context),
          _operationItemWidget(context, 'assets/images/themes/default/localNetSearch/operation_more.png', () {
            context.read<LocalNetSearchCubit>().onOpenMoreDeviceOperation(device);
          }),
        ],
      ),
    );
  }
```
截图是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/13.png)

是在点击更多按钮后弹出来的弹窗。
这里发现关于图标的使用，是通过 assets 引用的。`assets/images/themes/default/localNetSearch/operation_more.png` 就是更多按钮的图标。而关于图标的引入，是在 `pubspec.yaml` 中添加的。
```
  assets:
    - assets/
    - assets/langs/
    - assets/audio/
    - assets/flavorFiles/
    - assets/configs/
    - assets/machine/
    - assets/customize/
    - assets/images/
    - assets/images/themes/
    - assets/images/themes/default/
    - assets/images/themes/default/common/
    - assets/images/themes/default/tabBar/
```
对应的文件地址在：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/15.png)

只要是这样引入之后，就可以在代码中直接使用了。我问下了 AI，这类路径的重复问题，应该是可以去掉的，``assets/images/`` 应该就可以覆盖到下面的几个文件夹路径了，这个后面有时间再验证下。除了 image，其他的资源文件（比如本地 html，json 文件，raw 文件等），也可以这样引入。

## 状态传递
继续接上面的问题，关于状态传递，代码是通过 Cubit 来实现的。可以看到点击``更多按钮``后，执行的代码是``onOpenMoreDeviceOperation``：
```
  /// 显示或收起操作弹窗
  void onShowOrHideOperationMenu(bool show, {LocalNetDevice? device}) {
    if (show) {
      List<OperationMenuItem> itemList = [];
      if (device != null) {
        itemList = _generateOperationItems(device);
      }
      emit(state.copyWith(
        showOperationMenu: true,
        operationMenuItemList: itemList,
        currentOperateDevice: device,
      ));
    } else {
      emit(state.copyWith(showOperationMenu: false, currentOperateDevice: null));
    }
  }
```
可以看到，最终是 ``emit`` 了一个新的状态，包含了操作弹窗的显示状态，操作项列表，当前操作的设备。这个有点像 Kotlin 的 flow，发送一个状态出去了。
那么这个 ``emit`` 出去的状态，是怎么样被处理的呢？
查看代码有这样的一个类：
```
@freezed
class LocalNetSearchState with _$LocalNetSearchState {
  const factory LocalNetSearchState({
    /// 设备列表
    @Default([]) List<LocalNetDevice> deviceList,

    /// 是否显示更多菜单
    @Default(false) bool showOperationMenu,

    /// 当前弹窗操作对应的设备
    LocalNetDevice? currentOperateDevice,
  }) = _LocalNetSearchState;
}
```
这个 state 类，可以理解为一个状态类，包含了当前页面的所有状态（及数据）。就有点像原生 Android 中的 ViewModel，它所持有的各类数据 LiveData，外部界面通过监听 LiveData 来处理数据。同样的，这里搜索 showOperationMenu 的使用，可以发现唯一一个使用的地方（freezed 文件是 flutter 自动生成，无需关注）：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/14.png)

它的代码如下：
```
class OperationMenuWidget extends StatelessWidget {
  const OperationMenuWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocSelector<LocalNetSearchCubit, LocalNetSearchState, bool>(
      selector: (state) {
        return state.showOperationMenu;
      },
      builder: (context, state) {
        return CommonModalBottomSheetContainer(
          show: state,
          onMask: () {
            context.read<LocalNetSearchCubit>().onShowOrHideOperationMenu(false);
          },
          child: _contentWidgetWrapper(),
        );
      },
    );
  }
}
```
即 OperationMenuWidget 是一个监听 showOperationMenu 状态变化的组件，当 showOperationMenu 变化时，会根据状态值来显示或收起操作弹窗。这样一个状态传递机制，就实现了操作弹窗的显示和收起。

## Flutter Cubit
> Cubit 是 Flutter 官方主流状态管理库 ``flutter_bloc`` 中的轻量化状态管理方案，适用于绝大多数常规业务场景。其核心设计思想为UI 与业务逻辑分层解耦，通过统一管理页面数据、交互状态与业务逻辑，替代传统页面堆砌代码的开发方式，有效精简代码结构、提升项目可维护性与状态稳定性。Cubit 整体架构由三个核心概念构成，各司其职、单向联动：State 统一存储页面所有可变数据与交互状态，是唯一的数据源；Cubit 逻辑处理器集中封装所有业务逻辑、网络请求与状态更新行为，不依赖视图层；UI 视图层只负责监听状态变化并渲染界面，仅触发交互行为、不处理业务逻辑。所有状态更新均通过 emit 推送新 State 完成，以状态驱动界面自动刷新，实现逻辑、数据、视图完全分离，代码结构更规范、状态流转更可控。

这个咱们做安卓开发的应该也很熟悉了，MVVM 模式嘛。基于上面的问题，代码中对应的文件是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/16.png)

Cubit 就是处理逻辑（及数据）的地方，当数据处理完毕后，修改 State 再通过 emit 发送出去，而 Widget 作为 UI 层，监听数据的变化，来做界面的刷新。