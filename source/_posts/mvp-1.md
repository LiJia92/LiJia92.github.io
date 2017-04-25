---
title: 关于 MVP 模式的一点思考
date: 2017-04-25 15:04:41
tags:
 - 设计模式
---
针对 MVC 的解耦，目前 MVP 模式已经被很多开发者所使用，项目中所使用的便是 MVP 模式。

在我用到 MVP 模式后，我有个疑惑：**1个 Presenter 能否对应多个 View？**
这个问题，在网上已经有很多人展开讨论了：[使用 MVP 时，如何让同一个 P 服务多个 V？](https://github.com/android-cn/android-discuss/issues/468)

<!-- more -->

这个issue跟我的情况很类似。我有 A B C 三个页面，我有一个 Presenter，用来处理一个数据类型的增删改查，但是界面上，A界面只需要查询，B界面只需要删除，C界面只需要增和改。基于 Presenter与View 一一对应的情况下，很容易就写出如下的代码：
```
public interface IMyPresenter {

    void query();

    void insert();

    void update();

    void delete();
}

public interface IMyView {
    void showList();

    void showInsertResult();

    void showUpdateResult();

    void showDeleteResult();
}
```
在 IMyPresenter 的具体实现中回调 IMyView 的方法，通知界面进行展示。A B C 三个界面都实现 IMyView，然后就会有一个蛋疼的现象：**很多do nothing的方法**。比如 A 界面会这样：
```
public void showList(){
  // show something
}

public void showInsertResult(){
  // do nothing
}

public void showUpdateResult(){
  // do nothing
}

public void showDeleteResult(){
  // do nothing
}
```
因为 A 界面就没用到增删改的接口，所以自然不用实现相应的 View 接口，这看起来就很蛋疼了。

现在假设我们使用多个 Presenter,使一个 Presenter 对应一个 View，也就是写3个 Presenter,一个负责查询对应界面 A，一个负责删除对应界面 B，一个负责增和改对应界面 C。显然是没什么毛病的，但是会多许多的 Presenter，除了写起来很费事繁杂，还有一个缺点：若界面有业务交集（比如 A 界面不仅有查询，还有个删除，那么就会和 B 界面重复），就会导致 Presenter 严重冗余，几个 Presenter 里面的代码大块大块的相似。另外这个 Presenter 本是增删改查一套业务，结果硬生生拆成多个 Presenter，总感觉不合适。

所以在我的实际情况中，上述两种方案我都没有采用。这里便说下我的一些想法：
**Presenter 仍然独立处理业务，将 View 进行抽离解耦，提供一个顶层的 View 给 Presenter 使用，当要调到具体的 View 方法时，使用 instance of 判断，然后强转进行调用。**
修改后的代码大致如下：
```
public interface IMyView {

}

public interface IAView extends IMyView {
    void showList();
}

public interface IBView extends IMyView {
    void showDeleteResult();
}

public interface IAView extends IMyView {
  void showUpdateResult();

  void showInsertResult();
}
```
然后 IMyPresenter 的实现持有 IMyView 的实例，在调用的地方进行强转。
```
public void delete(){
  // do something
  if (mView != null && mView instanceof IBView) {
    ((IBView) mView).showDeleteResult();
  }
}
```
用这种方法，可以一定程度上解决一个 Presenter 对应多个 View 的问题。只能是一定程度上，是因为若 View 对应的业务场景有很复杂的交叉，那么就需要定义非常多的 View 与之对应，并且有很深的继承关系，也是不太合适。若真是碰到这种场景，我可能就会考虑 Google 所说的 MVP Clean 模式了。
