---
title: HashMap 序列化小结
date: 2023-09-13 16:45:45
tags:
 - 日常开发
---
本地有一个 HashMap 的对象，有序列化的需求，直接使用 SharedPreferences 进行存储：
```
private val map = HashMap<Byte, MutableList<BrakeModel>>()

PreUtils.setString(KEY, JSON.toJSONString(map))
```
然后将 String 反序列化时，报错了：
```
java.lang.ClassCastException: com.alibaba.fastjson.JSONObject cannot be cast to BrakeModel
```

<!-- more -->

项目中使用的 fastjson，使用的 TypeReference 将 String 转成 Map。将场景复刻，写了一个测试用例：
```
@Test
fun addition_isCorrect() {
    val text = "{1:[{xxx}]}"
    val newCaches = JSON.parseObject(text, object : TypeReference<Map<Byte, List<BrakeModel>>>() {})
    if (newCaches != null) {
        println(newCaches.size)
//            val list = newCaches.get(1)
//            val any = list?.firstOrNull()
//            println(any?.javaClass?.simpleName)
    } else {
        println("newCaches is null")
    }
}
```
此时测试用例运行通过，输出：1。当时写代码也是因为这个大意了，以为测试用例通过就没问题了。但其实打上断点看看 newCaches 的内容就会发现：它是一个 HashMap 对象，Key 是 Byte，但 Value 却是 JSONArray，其 Item 是 JSONObject 对象。若是不涉及到 Value Item 的读取，仅仅调用 newCaches.size 是不会有问题的。但凡涉及到 Value Item 的读取，就会报 ClassCastException 的错误，**因为这个 Map 指定的泛型是 BrakeModel，但反序列化得到的实际对象却是 JSONObject**。
测试一下，将注释代码放开，测试用例则会在 val any 那一行就报错了。
刚开始方向跑偏了，发现 List 接口是 Kotlin 自实现的，并没有继承 Serializable 接口，于是认为是 List 的原因。将 List 修改成 ArrayList、MutableList、java.util.ArrayList 都通通没效果。后面回过头发觉：这特喵的不是个 Map 吗？看到 Kotlin 实现的 Map 接口也没有继承 Serializable 接口。于是仅仅将 Map 改成 HashMap 之后，测试用例便通过了，Value Item 也可以正常访问了。改成 HashMap 之后无论是 List、ArrayList、MutableList 等等，得到的结构都是 ArrayList，没什么区别。
