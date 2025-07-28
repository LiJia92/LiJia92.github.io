---
title: Java反射实现接口
date: 2015-10-28 12:00:03
tags:
 - Java
---

之前做过一个插件，综合了移动MM，移动和游戏，沃商店等一些计费SDK。将这些计费SDK提供的接口全部整合，最后由插件提供一套接口。通过后台配置，来让游戏使用某种计费SDK。游戏开发商接入计费的时候，只需要调用插件提供的一套接口即可。因为不可能保证游戏会包含所有的计费SDK的代码，所以插件内部只能利用反射来实现。通过反射来获取类，获取方法进行调用是比较简单的。

但是有个问题困扰了我很久：计费SDK都有提供回调接口，使游戏开发商在计费成功或失败进行回调，那么如何通过反射来实现这些回调接口，进行调用呢？通过一段时间的摸索，知道了一种解决方法：使用`Proxy`类与`InvocationHandler`接口。

---

下面通过一个例子进行讲解。

<!--more-->

1. 首先以计费SDK为例子写一个library工程，提供一个方法和一个回调接口：
```
package com.lastwarmth.library;

public class MyLibrary {

	public interface Callback {
		void doCallback();
	}

	public void mainMethod(Callback callback) {
		System.out.println("doing main...");
		callback.doCallback();
	}
}
```
2. 新建MyTest工程，编写类实现InvocationHandler：
```
package com.lastwarmth.demo;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

public class MyHandler implements InvocationHandler{

	@Override
	public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
		System.out.println("doing callback...");
		return null;
	}

}

```
3. MyTest工程测试代码：
```
package com.lastwarmth.demo;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class MyTest {

	public static void main(String[] args) {
		try {
			Class<?> mClass = Class.forName("com.lastwarmth.library.MyLibrary");
			Class<?> mCallback = Class.forName("com.lastwarmth.library.MyLibrary$Callback");
			MyHandler mHandler = new MyHandler();
			Object mObj = Proxy.newProxyInstance(MyTest.class.getClassLoader(), new Class[] { mCallback }, mHandler);
			Method mMethod = mClass.getDeclaredMethod("mainMethod", new Class[] { mCallback });
			mMethod.invoke(mClass.newInstance(), new Object[] { mObj });
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (NoSuchMethodException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SecurityException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IllegalAccessException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IllegalArgumentException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (InvocationTargetException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (InstantiationException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

}

```
4. 将MyLibrary打成jar包，引入到MyTest的build path中，或者直接将java代码考到MyTest工程下（若不这样做，运行会抛出异常，但不会致使程序崩溃）。然后运行，控制台输出结果：
```
doing main...
doing callback...
```
说明MyTest类通过反射获取到了MyLibrary类中的Callback接口，并实现调用。
代码比较简单，就不作过多讲述了。

---
总结：
<font color=red>java.lang.reflect.Proxy：</font>这是 Java 动态代理机制的主类，它提供了一组静态方法来为一组接口动态地生成代理类及其对象。

- static InvocationHandler getInvocationHandler(Object proxy)：该方法用于获取指定代理对象所关联的调用处理器

- static Class getProxyClass(ClassLoader loader, Class[] interfaces) ：该方法用于获取关联于指定类装载器和一组接口的动态代理类的类对象

- static boolean isProxyClass(Class cl)：该方法用于判断指定类对象是否是一个动态代理类

- static Object newProxyInstance(ClassLoader loader, Class[] interfaces, InvocationHandler h)：该方法用于为指定类装载器、一组接口及调用处理器生成动态代理类实例
文中采用第4个方法，获取到了实现接口Callback的实例。

<font color=red>java.lang.reflect.InvocationHandler：</font>这是调用处理器接口，它自定义了一个 invoke 方法，用于集中处理在动态代理类对象上的方法调用，通常在该方法中实现对委托类的代理访问。

- Object invoke(Object proxy, Method method, Object[] args)：该方法负责集中处理动态代理类上的所有方法调用。第一个参数是代理类实例，第二个参数是被调用的方法对象。第三个方法是调用参数。调用处理器根据这三个参数进行预处理或分派到委托类实例上反射执行。

在本文中，并没有代理类。直接在invoke方法中写入我们继承Callback接口需要实现的方法内容即可。
通过`Proxy`类与`InvocationHandler`接口，即可完成反射实现接口的功能了。
