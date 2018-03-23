---
title: 关于 ConcurrentModificationException 异常
date: 2017-07-11 16:24:35
tags:
 - java
---

List、Map等这类数据结构在日常开发中的使用不可谓不多，经常会有遍历的同时进行修改的情况。例如：
```
Integer[] numbers = new Integer[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
List<Integer> list = new ArrayList<>(Arrays.asList(numbers));
for (Integer integer : list) {
    if (integer % 5 == 0) {
        list.remove(integer);
    }
}
```
这段代码在执行的时候便会抛出异常：
```
Exception in thread "main" java.util.ConcurrentModificationException
	at java.util.ArrayList$Itr.checkForComodification(ArrayList.java:901)
	at java.util.ArrayList$Itr.next(ArrayList.java:851)
	at com.example.MyClass.main(MyClass.java:16)
```
这个异常出现通常是遍历一个集合的同时，在修改这个集合。看到``next``方法：
```
public E next() {
    this.checkForComodification();
    int var1 = this.cursor;
    if(var1 >= ArrayList.this.size) {
        throw new NoSuchElementException();
    } else {
        Object[] var2 = ArrayList.this.elementData;
        if(var1 >= var2.length) {
            throw new ConcurrentModificationException();
        } else {
            this.cursor = var1 + 1;
            return var2[this.lastRet = var1];
        }
    }
}
```
然后看到``checkForComodification``：
```
final void checkForComodification() {
    if(ArrayList.this.modCount != this.expectedModCount) {
        throw new ConcurrentModificationException();
    }
}
```
即当``modCount 与 expectedModCount 不相等时，会抛 ConcurrentModificationException 异常``。其实很早之前就会碰到这个问题，使用``Iterator``进行遍历和操作就不会出现这个问题了，但是一直没有深究其原因。

<!-- more -->

之前听同事说，``for each``内部就是使用的``Iterator``。但是最近项目中就算使用了``for each``也还是出现了上面的异常。于是决心细究一番。
将上面的示例代码转成 class 文件，可以看到：
```
Integer[] numbers = new Integer[]{Integer.valueOf(1), Integer.valueOf(2), Integer.valueOf(3), Integer.valueOf(4), Integer.valueOf(5), Integer.valueOf(6), Integer.valueOf(7), Integer.valueOf(8), Integer.valueOf(9), Integer.valueOf(10)};
ArrayList list = new ArrayList(Arrays.asList(numbers));
Iterator var4 = list.iterator();

while(var4.hasNext()) {
    Integer integer = (Integer)var4.next();
    if(integer.intValue() % 5 == 0) {
        list.remove(integer);
    }
}
```
确实看到了``Iterator``的身影，但是却忽视了真正重要的一点:``remove()方法的执行者``。
将遍历代码改成如下:
```
Iterator iterator = list.iterator();
while (iterator.hasNext()) {
    Integer integer = (Integer) iterator.next();
    if (integer % 5 == 0) {
        iterator.remove();
    }
}
```
便可执行通过了。看到 class 文件如下：
```
while(iterator.hasNext()) {
    Integer integer = (Integer)iterator.next();
    if(integer.intValue() % 5 == 0) {
        iterator.remove();
    }
}
```
可以看到都是通过``Iterator``进行遍历，唯独在执行``remove``操作的时候，报错的示例执行对象是``list本身``，而正确的示例执行对象是``iterator``。那么接下来对比下二者的``remove``方法，便可找到真相了。
看到``ArrayList``自身实现的``remove``方法：
```
public boolean remove(Object var1) {
    int var2;
    if(var1 == null) {
        for(var2 = 0; var2 < this.size; ++var2) {
            if(this.elementData[var2] == null) {
                this.fastRemove(var2);
                return true;
            }
        }
    } else {
        for(var2 = 0; var2 < this.size; ++var2) {
            if(var1.equals(this.elementData[var2])) {
                this.fastRemove(var2);
                return true;
            }
        }
    }

    return false;
}

private void fastRemove(int var1) {
    ++this.modCount;
    int var2 = this.size - var1 - 1;
    if(var2 > 0) {
        System.arraycopy(this.elementData, var1 + 1, this.elementData, var1, var2);
    }

    this.elementData[--this.size] = null;
}
```
看到``ArrayList中Iterator``实现的``remove``方法：
```
public void remove() {
    if(this.lastRet < 0) {
        throw new IllegalStateException();
    } else {
        this.checkForComodification();

        try {
            ArrayList.this.remove(this.lastRet);
            this.cursor = this.lastRet;
            this.lastRet = -1;
            this.expectedModCount = ArrayList.this.modCount;
        } catch (IndexOutOfBoundsException var2) {
            throw new ConcurrentModificationException();
        }
    }
}
```
如此便一目了然了，**ArrayList 本身的 remove 方法执行完之后没有同步 modCount 与 expectedModCount，而 Iterator 有同步。在遍历的时候会 checkForComodification，当使用的非 Iterator 的 remove 方法，会造成 2 个 count 不相等，如此便会抛出异常了**。
那么细想一下：为什么 Java 集合在遍历的时候要做这样的检查呢？这里引用一下网友的想法，大家自行思考吧～
> 设置modCount和expectedModCount的目的是为了检测iterator的有效性，检测是否有其它操作对HashMap的结构进行了修改，由于这些操作不是通过当前iterator进行的，因此有可能破坏iterator的有效性。通过iterator执行remove只能删除当前iterator所在的元素，不会让iterator失效。而通过HashMap.remove()实际上可以删除任意元素，这个元素有可能正是iterator内部的next变量已经引用了的元素，造成iterator失效。

最后说 2 点题外话：
1. ``Arrays.asList``不接受 Java 基本数据类型数组作为参数。原因``asList``接受的参数为``Object``，而基本数据类型不是。但是代码``List list = Arrays.asList(new int[]{1,2,3})``不会报错，因为``int[]``是``Object``，此代码会生产一个``size = 1``的列表。
2. 通过``Arrays.asList``方法返回的``List``是不能修改的。

## 参考：
[Java遍历HashMap并修改(remove)](http://dumbee.net/archives/41)
[把Java数组转换为List时的注意事项](http://www.importnew.com/14996.html)
[Java 集合细节（二）：asList 的缺陷](http://wiki.jikexueyuan.com/project/java-enhancement/java-thirtysix.html)
