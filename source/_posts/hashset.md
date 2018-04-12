---
title: Java HashSet 的原理
date: 2018-04-12 14:49:04
tags:
 - java
---
项目里有用到 HashSet 数据结构，之前几乎没怎么用过，只是了解一点，不能存放重复的元素。但是一直没有看过代码。今天基于这个契机，看了下代码研究了下内在原理。颇有感触，在此记录一下。

<!-- more -->

当看到 HashSet 的代码时，瞅了一眼，算上注释竟然不足 400 行。可以说，整个 HashSet 最重要的便是它的构造函数了。
```
private transient HashMap<E,Object> map;


/**
 * Constructs a new, empty set; the backing <tt>HashMap</tt> instance has
 * default initial capacity (16) and load factor (0.75).
 */
public HashSet() {
    map = new HashMap<>();
}

/**
 * Constructs a new set containing the elements in the specified
 * collection.  The <tt>HashMap</tt> is created with default load factor
 * (0.75) and an initial capacity sufficient to contain the elements in
 * the specified collection.
 *
 * @param c the collection whose elements are to be placed into this set
 * @throws NullPointerException if the specified collection is null
 */
public HashSet(Collection<? extends E> c) {
    map = new HashMap<>(Math.max((int) (c.size()/.75f) + 1, 16));
    addAll(c);
}

/**
 * Constructs a new, empty set; the backing <tt>HashMap</tt> instance has
 * the specified initial capacity and the specified load factor.
 *
 * @param      initialCapacity   the initial capacity of the hash map
 * @param      loadFactor        the load factor of the hash map
 * @throws     IllegalArgumentException if the initial capacity is less
 *             than zero, or if the load factor is nonpositive
 */
public HashSet(int initialCapacity, float loadFactor) {
    map = new HashMap<>(initialCapacity, loadFactor);
}

/**
 * Constructs a new, empty set; the backing <tt>HashMap</tt> instance has
 * the specified initial capacity and default load factor (0.75).
 *
 * @param      initialCapacity   the initial capacity of the hash table
 * @throws     IllegalArgumentException if the initial capacity is less
 *             than zero
 */
public HashSet(int initialCapacity) {
    map = new HashMap<>(initialCapacity);
}

/**
 * Constructs a new, empty linked hash set.  (This package private
 * constructor is only used by LinkedHashSet.) The backing
 * HashMap instance is a LinkedHashMap with the specified initial
 * capacity and the specified load factor.
 *
 * @param      initialCapacity   the initial capacity of the hash map
 * @param      loadFactor        the load factor of the hash map
 * @param      dummy             ignored (distinguishes this
 *             constructor from other int, float constructor.)
 * @throws     IllegalArgumentException if the initial capacity is less
 *             than zero, or if the load factor is nonpositive
 */
HashSet(int initialCapacity, float loadFactor, boolean dummy) {
    map = new LinkedHashMap<>(initialCapacity, loadFactor);
}
```
怎么样，一目了然了吧？HashSet 特喵的就是用的 HashMap 来实现的。那么 HashSet 如何避免元素被重复添加呢？看下 add 方法：
```
public boolean add(E e) {
    return map.put(e, PRESENT)==null;
}
```
简短得不能再短。看下 PRESENT 是什么：
```
// Dummy value to associate with an Object in the backing Map
private static final Object PRESENT = new Object();
```
看到这就清楚了。这个 PRESENT 对象全局就只会有一个，当我们的 obejct 作为 map 的 key 时，通过 map 的 put 方法进行添加。如果 object 是一样的，那么 key 就是一样，map 通过这个 key 会找到 PRESENT 对象，这个对象和我们 add 传入的是一个对象，那么 map 就会认为元素已经存在，不再进行重复插入了。如此便实现了 Set 集合的不重复元素功能。

最后看下 HashSet 的迭代器：
```
public Iterator<E> iterator() {
    return map.keySet().iterator();
}
```
意料之中！

所以啊，在做某些东西的时候，可以先思考，如何利用现有的东西。某些构思、想法真的是很奇妙，多看源码！！！
