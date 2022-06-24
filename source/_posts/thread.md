---
title: 重温线程知识
date: 2022-06-24 15:24:30
tags:
 - 日常开发
---
有一个长耗时任务，需要持续性的发送数据，发送的包收到回应后，继续发送下一包，如此反复，直到数据发送完。起始时没什么好的思路，线程的知识都不太记得了，wait nofity 等方法都好久没用过了，后面看了下[廖雪峰的博客](https://www.liaoxuefeng.com/wiki/1252599548343744/1306580911915042)，把知识重新温习了一遍，便有了如下代码：

<!-- more -->

```
@WorkerThread
public static void sendPath(List<Trace> path, Callback<Boolean> callback) {

    final AtomicInteger retryCount = new AtomicInteger();
    final AtomicBoolean isError = new AtomicBoolean();
    isError.set(false);
    final Object lock = new Object();
    final AtomicInteger sendStart = new AtomicInteger();

    // 监听
    final Callback<Callback> cb = data -> {
        if (data.start == sendStart.get() && data.success) {
            // 成功
        } else {
            // 失败
            isError.set(true);
        }
        synchronized (lock) {
            lock.notifyAll();
        }
    };

    // 注册
    Tiger.register(cb, Callback.class);

    final int PackageSize = 18;
    int size = path.size();
    int index = 0;
    while (index < size) {

        if (retryCount.get() > 3) {
            //最多重试3次
            isError.set(true);
        }

        if (isError.get()) {
            break;
        }
        //开始索引
        int start = index;
        //结束索引的前一个
        int end = start + PackageSize;
        if (end > size) {
            end = size;
        }

        //是否最后一包
        final boolean isEnd = end == size;
        WriteBytes wb = new WriteBytes(true);
        // wb 添加数据
        sendStart.set(start);
        byte[] sendData = wb.toBytes();
        // 发送数据
        CommunicatorManager.getInstance().send(sendData);
        // 加锁
        synchronized (lock) {
            try {
                // 等待三秒
                long time = System.currentTimeMillis();
                lock.wait(3000);
                if (System.currentTimeMillis() - time > WaitTime - 50) {
                    // 超时了
                    if (isError.get()) {
                        // 失败了不再重试
                        break;
                    }
                    // 超时了还没失败，就重试
                    retryCount.getAndIncrement();
                    continue;
                }
                retryCount.set(0);
            } catch (InterruptedException e) {
                isError.set(true);
                break;
            }
        }
        index = end;
    }

    // 注销
    Tiger.unregister(cb, Callback.class);

    if (isError.get()) {
        callback.callback(false);
    } else {
        callback.callback(true);
    }
}
```
方法大意是：path 是一个点集合，单个包最多发送不超过 500 个字节的数据给硬件，所以按照 500 个字节的限制，将 path 分割成若干个包。先发送第一个包，硬件回复成功后，再发下一个包。硬件回复失败，或者超时没有回复，则进行重发当前包，一个包最多重试 3 次，重试 3 次还失败则整个发送行为失败。

大概知识点如下：
1. 在线程中，通过 synchronized (lock) 进行加锁，在锁代码块中，可以执行 wait()，此时线程进入等待状态，必须由其他线程唤醒后，该线程才继续执行。需要注意，wait() 可以传入一个超时时间，当超出这个时间后，并不会抛 InterruptedException 异常，所以需要自己处理超时逻辑。
2. 在发送数据消息回调中，需要使用同一个锁对象进行加锁，并调用它的 notifyAll()。使用 notifyAll() 将唤醒所有当前正在 this 锁等待的线程，而 notify() 只会唤醒其中一个（具体哪个依赖操作系统，有一定的随机性）。
3. wait() 方法执行后，会使当前线程释放锁，所以才可以让其他线程拿到锁，从而调用 notify 相关方法进行唤醒。那么 wait() 之后的代码是没有锁的，若有多线程安全相关的考量，则需要重新获取锁。本例中 wait() 方法之后的代码块使用了 Atomic 相关类，所以便没有加入重新获取锁的逻辑。Thread.sleep() 也是会暂停当前线程并让出 cpu 执行时间，但 sleep() 不会释放锁，到时候后会继续执行。
4. Atomic 相关类，内部使用无锁的方式实现的线程安全，主要原理用的 CAS：Compare and Set。简化多线程编程，适用于计数器，累加器等。
