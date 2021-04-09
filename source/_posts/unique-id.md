---
title: 一个关于“唯一 ID”的问题
date: 2021-04-09 16:03:03
tags:
 - 日常开发
---
一般涉及到硬件出厂的，都会有一个唯一 ID 来标记这个硬件，最近项目也涉及到了这块。硬件的同事会通过串口，给我们一串字节（12 个 byte），他们可以保证这 12 个 byte 的序列是唯一的，所以在 App 层面，我们使用这串字节，转成相应的十六进制的字符串，作为业务层的唯一 ID。转换代码如下：
```
StringBuilder builder = new StringBuilder();
for (int i = 0; i < 12; i++) {
    int a = data.readUnsignedByte();
    builder.append(Integer.toHexString(a));
}
sn = builder.toString();
```

<!-- more -->

data 就是 byte 数组，readUnsignedByte 就是将 byte 转成对应的 int：
```
public final int readUnsignedByte() throws IndexOutOfBoundsException {
    return read() & 0xff;
}
```
就是 & 一下 0xff，然后通过 Integer.toHexString 转成相应的十六进制字符串，最后拼接起来。
如果不 & 0xff，那么 byte 直接转 int，会出现负数，当出现负数时，得到的结果会多很多位：
```
0xff -> ffffffff
0xd8 -> ffffffd8
```

然后...
问题就来了。

> 即使是 & 0xff 的 int 值，Integer.toHexString 返回的值，并不是固定的 2 位数，若是小于 10 的值，前面的 0 会被省略。比如 0x08，会返回 8。

那么就会导致 12 个 byte 输出的十六进制字符串，不一定是固定的 24 位了。比如：
```
33 ff d8 55 64 23 63 54 42 71 00 43
33 ff d8 55 64 23 63 54 42 07 10 43
33 ff d8 55 64 23 63 54 04 27 10 43
```
这 3 个硬件层的唯一 ID 通过转化，都会映射到同一个业务 ID：
```
33ffd855642363544271043
```
导致的后果显而易见：**多台设备映射到了同一个业务 ID，这多台设备会共用数据，导致数据混乱。并且随着硬件出厂的数量越来越多，导致多台设备映射到同一个 ID 的几率会越来越大。**
那么如何在兼容已有旧数据的前提下，来解决这个问题呢？
通过讨论，再生成一个固定 24 位的新 ID，连同之前的旧 ID，一同传到服务器（数据尽可能详细，区域、登录的用户等等），由服务器建表进行关联映射。当这个表出现了一个旧 ID 对应到了多个新 ID 的时候，说明有设备重复了。这个时候，只能由人工介入，结合一些基本信息，对这多台新 ID 的设备进行确认，然后手动修复 ID。当迭代几个版本，没有少于 24 位的 ID 生成时，即可将所有数据进行清洗了。
新 ID 的生成方式就是手动补“0”，确保一定会是 24 位的串：
```
for (int i = 0; i < 12; i++) {
    String hex = sn24[i];
    if (hex.length() == 1) {
        hex = "0" + hex;
    }
    builder.append(hex);
}
```
好了，下面就是研究 Integer.toHexString 这个方法了。