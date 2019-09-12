---
title: Xcode的基本使用
date: 2016-12-07 14:36:05
tags:
 - iOS
---
要开发iOS，Xcode是少不了的，这里摘录一下Xcode的基本使用。

## 基本
![图片转自http://blog.csdn.net/phunxm/article/details/17044337](http://img.blog.csdn.net/20141014195328609?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvcGh1bnht/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)
导航区：导航作用，可以查看项目总体结构。
编辑区：用于编写代码的区域。
调试区：用于输出和显示调试信息的区域。
实用区：用于显示属性和提供xib类库的区域。
工具栏：可以选择运行的设备等。

<!-- more -->

## 快捷键
1. 全局查找：command + 3（command + shift + F，可以直接输入关键字进行查找）
2. 查看断点：command + 7
3. 查看文件目录：command + 1
4. 查看下一处：command + G
5. 跳转到指定行：command + L
6. 快速定位当前类在文件中的位置：command + shift + J
7. 上下位移代码：command+option + 【（】）
8. 以调试的形式运行程序：command + Y
9. 搜索类：command + shift + O
10. 清空控制台信息：command + K
11. 模拟器回到Home：command + shift + H
12. 模拟器旋转屏幕：command + 左右箭头
13. 删除光标之前的代码：command + delete
14. 注释代码：command + /
15. 到行首（尾）：cmd + 左（右）
15. .m 与.h文件之间切换：command + control + 上/下
16. 清除工程：command + shift + K

## 调试
可以和Android studio一样点击左侧栏，设置断点。右键断点，可以弹出断点设置。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/11/6.png)
F6单步调试、F7跳入，F8继续。
在调试时，也可以看下面的调试栏进行操作。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/11/7.png)
可以直接拖拽断点到编辑区就能删除断点了，类似QQ的消息数目提示。

## 代码块管理
利用``#pragma``注释，管理代码块。如下图，可以很清晰知道代码块内的方法。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/115.png)
