---
title: 快速画 UML 图
date: 2018-05-08 13:57:45
tags:
 - 奇技淫巧
---
这几天有个内部的技术分享，是公司要求的一个流程，需要针对某个功能模块进行讲解。在制作 PPT 的过程中，需要画 UML 图。起初使用的[ProcessOn](https://www.processon.com/)，画出来之后感觉没啥效果，类之间的关系不能明确表现出来，而且制作很麻烦，得自己一天天敲文字，调位置。后面接触到[PlantUML](http://plantuml.com/)，可以直接使用类似 Markdown 的模式进行编辑，然后直接渲染成一张图片，简直不要太舒服，所以很想分享给大家！

<!-- more -->

看下两个软件作图的比较：
ProcessOn：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/5/8/2.png)
PlantUML：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/5/8/1.png)
高下立判啊！当然，在用 PlantUML 绘图时又重新仔细思考了下类的结构，所以两张图在结构上不一样。
使用 PlantUML，后续若需要维护，修改起来十分方便！**但是貌似有个缺点：不能表示内部类,或者是我还没找到使用的方式。**

顺道帖下 UML 图推荐的几种类关系。
### 继承
指的是一个类（称为子类、子接口）继承另外的一个类（称为父类、父接口）的功能，并可以增加它自己的新功能的能力，继承是类与类或者接口与接口之间最常见的关系；在Java中此类关系通过关键字extends明确标识，在设计时一般没有争议性；

### 实现
指的是一个class类实现interface接口（可以是多个）的功能；实现是类与接口之间最常见的关系；在Java中此类关系通过关键字implements明确标识，在设计时一般没有争议性；

### 依赖
可以简单的理解，就是一个类A使用到了另一个类B，而这种使用关系是具有偶然性的、、临时性的、非常弱的，但是B类的变化会影响到A；比如某人要过河，需要借用一条船，此时人与船之间的关系就是依赖；表现在代码层面，为类B作为参数被类A在某个method方法中使用；

### 关联
他体现的是两个类、或者类与接口之间语义级别的一种强依赖关系，比如我和我的朋友；这种关系比依赖更强、不存在依赖关系的偶然性、关系也不是临时性的，一般是长期性的，而且双方的关系一般是平等的、关联可以是单向、双向的；表现在代码层面，为被关联类B以类属性的形式出现在关联类A中，也可能是关联类A引用了一个类型为被关联类B的全局变量；

### 聚合
聚合是关联关系的一种特例，他体现的是整体与部分、拥有的关系，即has-a的关系，此时整体与部分之间是可分离的，他们可以具有各自的生命周期，部分可以属于多个整体对象，也可以为多个整体对象共享；比如计算机与CPU、公司与员工的关系等；表现在代码层面，和关联关系是一致的，只能从语义级别来区分；

### 组合
组合也是关联关系的一种特例，他体现的是一种contains-a的关系，这种关系比聚合更强，也称为强聚合；他同样体现整体与部分间的关系，但此时整体与部分是不可分的，整体的生命周期结束也就意味着部分的生命周期结束；比如你和你的大脑；表现在代码层面，和关联关系是一致的，只能从语义级别来区分；

对于继承、实现这两种关系没多少疑问，他们体现的是一种类与类、或者类与接口间的纵向关系；其他的四者关系则体现的是类与类、或者类与接口间的引用、横向关系，是比较难区分的，有很多事物间的关系要想准备定位是很难的，前面也提到，这几种关系都是语义级别的，所以从代码层面并不能完全区分各种关系；但总的来说，后几种关系所表现的强弱程度依次为：组合>聚合>关联>依赖。

## 参考
[Markdown 绘制 UML 图 -- PlantUML + Gravizo](https://www.heqiangfly.com/2017/07/08/development-tool-markdown-plant-uml/)
[PlantUML 在线作图网址](http://www.plantuml.com/plantuml/uml/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000)
[UML中几种类间关系](https://blog.csdn.net/sfdev/article/details/3906243)
