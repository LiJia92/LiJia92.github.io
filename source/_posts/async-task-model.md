---
title: 异步任务的原生实现
date: 2018-03-28 17:14:56
tags:
---
现在谈到异步任务，相信大多数开发者都会直接选择 RxJava，但是仍然会有不用 RxJava 的项目。这种情况下如何来做异步任务呢？

其实不论是 RxJava 抑或是 Android 自带的 AysncTask，内部实现原理都是 Thread + Handler。如果线程想要返回 Result，那么只能使用 Callable来实现子线程，AsyncTask 便是使用的 Callable。

下面说下项目中的使用场景：
一个界面由一个列表构成，但列表的构成十分复杂，item type 很多，需要请求多个网络接口来返回所需要的数据。网络接口请求互相独立，没有依赖关系，可使用多线程进行请求。如果使用 Android 提供的 AsyncTask，则在 doInBackground 依次执行网络接口，就丧失了多线程的优势，当然你也可以在 doInBackground 再起子线程执行网络请求，然后在返回的时候使用阻塞，等到所有接口执行完毕才返回，原理其实是一样的。

<!-- more -->

下面说下项目中的做法：
1. 创建一个全局的线程池，用来执行异步任务。
```
private static ExecutorService es;
es = Executors.newFixedThreadPool(10);
```
2. 封装一个任务队列类：
```
public class BatchTask {

    private List<Future> futureList;

    private TaskCallback callback;

    public BatchTask(TaskCallback callback) {
        futureList = new LinkedList<>();
        this.callback = callback;
    }

    public BatchTask addTask(Callable task) {
        if (task != null) {
            futureList.add(es.submit(task));
        }
        return this;
    }

    public void getResult() {
        for (Future future : futureList) {
            try {
                if (callback != null) {
                    callback.onCallback(future.get());
                }
            } catch (Exception e) {
                LogUtils.d(BatchTask.class.getSimpleName(), e);
            }
        }
    }

    public interface TaskCallback {
        void onCallback(Object object);
    }

    public static class MyTaskCallback implements TaskCallback {

        private List<Object> dataList;

        public MyTaskCallback() {
            this.dataList = new ArrayList<>();
        }

        @Override
        public void onCallback(Object object) {
            if (object == null) {
                return;
            }

            if (object instanceof List) {
                List list = (List) object;
                if (CollectionUtils.isNotEmpty(list)) {
                    dataList.addAll(list);
                }
            } else {
                dataList.add(object);
            }
        }

        public List<Object> getDataList() {
            return dataList;
        }
    }
}
```
3. 添加任务：
```
batchTask = new BatchTask();
batchTask.addTask(task1);
batchTask.addTask(task2);

...

batchTask.getResult();
callback.getDataList();
```
使用的时候，先创建一个子线程，然后调用 addTask，线程池就会去执行这个任务了，但是当要获取 Result 时，由于 **future.get() 是一个阻塞方法，它会一直等待任务执行结束才会返回结果**，所以返回的数据顺序和我们 addTask 的顺序一致。同时使用一个 dataList 来接受这些返回的结果，这样的话在拿到数据之后不用再手动进行排序了。然后利用 Handler 将数据发送到主线程进行展示即可。可以看出来，就和 AsyncTask 差不多！

其实就和开头说的一样，异步任务的实质就是 Thread + Handler。只不过目前有一些封装的异步任务库，导致对其底层实现的原理不是很清晰。现在这个项目里，就是使用原生的一些东西，看起来就更加明朗、深刻了。当然了，原生的或者 AsyncTask 写起来确确实实不如 RxJava 来得简洁方便了，尤其涉及到多任务、数据变换的时候。所以，能用 RxJava 就还是用 RxJava 吧。
