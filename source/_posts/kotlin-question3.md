---
title: 关于使用 kotlin 碰到的一个坑（三）
date: 2018-08-22 11:30:31
tags:
 - Android 进阶
---
近期整理代码，出现了一个空指针异常，其源头为 MapController 类的一个方法：
```
public void addOnMarkerClickListener(AMap.OnMarkerClickListener onMarkerClickListener) {
    if (onMarkerClickListener == null) {
        throw new NullPointerException("onMarkerClickListener can not null");
    }
    if (onMarkerClickListeners == null) {
        onMarkerClickListeners = new HashSet<>();
    }
    onMarkerClickListeners.add(onMarkerClickListener);
}
```

<!-- more -->

然后看到 kotlin 代码：
```
class MapControllerTest1(val mapController: MapController) {

    init {
        init()
    }

    private val onMarkClickListener = OnMarkerClickListener {
        false
    }

    private fun init() {
        // do other things ...
        mapController.addOnMarkerClickListener(onMarkClickListener)
    }
}
```
说明在执行 init 时 onMarkClickListener 为 null。编译 kotlin 代码到 Java 代码看看：
```
public final class MapControllerTest1 {
   private final OnMarkerClickListener onMarkClickListener;
   @NotNull
   private final MapController mapController;

   private final void init() {
      this.mapController.addOnMarkerClickListener(this.onMarkClickListener);
   }

   @NotNull
   public final MapController getMapController() {
      return this.mapController;
   }

   public MapControllerTest1(@NotNull MapController mapController) {
      Intrinsics.checkParameterIsNotNull(mapController, "mapController");
      super();
      this.mapController = mapController;
      this.init();
      this.onMarkClickListener = (OnMarkerClickListener)null.INSTANCE;
   }
}
```
可以看到 init 方法是在设置 onMarkClickListener 之前执行的，所以会报空指针异常。
将代码改成如下：
```
class MapControllerTest1(val mapController: MapController) {

    private val onMarkClickListener = OnMarkerClickListener {
        false
    }

    init {
        init()
    }

    private fun init() {
        // do other things ...
        mapController.addOnMarkerClickListener(onMarkClickListener)
    }
}
```
此时便不会报空指针异常了。编译到 Java 代码查看：
```
public final class MapControllerTest1 {
   private final OnMarkerClickListener onMarkClickListener;
   @NotNull
   private final MapController mapController;

   private final void init() {
      this.mapController.addOnMarkerClickListener(this.onMarkClickListener);
   }

   @NotNull
   public final MapController getMapController() {
      return this.mapController;
   }

   public MapControllerTest1(@NotNull MapController mapController) {
      Intrinsics.checkParameterIsNotNull(mapController, "mapController");
      super();
      this.mapController = mapController;
      this.onMarkClickListener = (OnMarkerClickListener)null.INSTANCE;
      this.init();
   }
}
```
先赋值 onMarkClickListener，才执行 init，很显然不会报异常了。
我们可以理解 init 为初始化代码块，若换成 Java 代码，则不论 onMarkerClickListener 在何处声明，都不会抛异常。
```
public class MapControllerTest2 {

    private MapController mapController;

    public MapControllerTest2(MapController mapController) {
        this.mapController = mapController;
        init(mapController);
    }

    private void init(MapController mapController) {
        mapController.addOnMarkerClickListener(onMarkerClickListener);
    }

    private AMap.OnMarkerClickListener onMarkerClickListener = new AMap.OnMarkerClickListener() {
        @Override
        public boolean onMarkerClick(Marker marker) {
            return false;
        }
    };
}
```
给我的感觉就是 Kotlin 初始化顺序与 Java 不同了。查看到 Koltin 文档，看到这样一段：
> 主构造函数不能包含任何的代码。初始化的代码可以放到以 init 关键字作为前缀的初始化块（initializer blocks）中。
在实例初始化期间，初始化块按照它们出现在类体中的顺序执行，与属性初始化器交织在一起：
```
class InitOrderDemo(name: String) {
    val firstProperty = "First property: $name".also(::println)

    init {
        println("First initializer block that prints ${name}")
    }

    val secondProperty = "Second property: ${name.length}".also(::println)

    init {
        println("Second initializer block that prints ${name.length}")
    }
}
```
划重点：**初始化块按照它们出现在类体中的顺序执行**。所以在 init 之后声明的变量在 init 中是调用不了的。
将代码改成如下，会直接就编译不过：
```
class MapControllerTest1(val mapController: MapController) {

    init {
        init()
        mapController.addOnMarkerClickListener(onMarkClickListener)
    }

    private val onMarkClickListener = OnMarkerClickListener {
        false
    }

    private fun init() {
        // do other things ...
    }
}
```
此时会提示：Variable 'onMarkClickListener' must be initialized。只是凑巧我将 addOnMarkerClickListener 放到了另外一个函数体里面，导致编译通过，规避了这个问题。所以在写 Kotlin 的时候要注意代码的顺序！

再摘一段比较重要的：
> 请注意，初始化块中的代码实际上会成为主构造函数的一部分。委托给主构造函数会作为次构造函数的第一条语句，因此所有初始化块中的代码都会在次构造函数体之前执行。即使该类没有主构造函数，这种委托仍会隐式发生，并且仍会执行初始化块：
```
class Constructors {
    init {
        println("Init block")
    }

    constructor(i: Int) {
        println("Constructor")
    }
}
```
执行结果：
```
Init block
Constructor
```
试了一下，将代码改成如下：
```
class MapControllerTest1(val mapController: MapController) {

    private var onMarkClickListener: OnMarkerClickListener? = null

    init {
        init()
        mapController.addOnMarkerClickListener(onMarkClickListener)
    }

    constructor(mapController: MapController, param: Int) : this(mapController) {
        onMarkClickListener = OnMarkerClickListener {
            false
        }
    }

    private fun init() {
        // do other things ...
    }
}
```
确实会抛异常。

文档很重要呀~

参考：[类与继承](https://www.kotlincn.net/docs/reference/classes.html)