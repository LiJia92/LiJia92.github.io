---
title: Android实现简易轻量下载器：单线程任务队列
date: 2016-02-23 11:40:10
tags:
 - 日常开发
---

最近的项目是一个与音乐相关的App，其中有一个功能：收藏喜欢的歌曲，在wifi的环境下自动下载。

考虑到音乐歌曲都是3、4Mb的小文件，断点下载的功能便不需要了。因此只需要实现一个特别轻量、简单的下载管理类，进行管理即可。

最初的思路便是任务队列，单线程顺序执行，一个文件接着一个文件进行下载。

之前看过AsyncTask的部分源码，其设计与我的想法类似，于是便借鉴着AsyncTask的源码，实现了一个特别简单、轻量的下载管理类。

<!--more-->

源码如下：
```
public class MyDownloadManager {

    private static final String TAG = "MyDownloadManager";
    private File downloadDir; // 文件保存路径
    private static MyDownloadManager instance; // 单例

    // 单线程任务队列
    public static Executor executor;
    private static final ThreadFactory sThreadFactory = new ThreadFactory() {
        private final AtomicInteger mCount = new AtomicInteger(1);

        public Thread newThread(Runnable r) {
            return new Thread(r, "MyDownloadManager #" + mCount.getAndIncrement());
        }
    };
    private static final BlockingQueue<Runnable> sPoolWorkQueue = new LinkedBlockingQueue<>(128);
    public static final Executor THREAD_POOL_EXECUTOR = new ThreadPoolExecutor(1, 1, 1,
            TimeUnit.SECONDS, sPoolWorkQueue, sThreadFactory);


    private MyDownloadManager() {
        // 初始化下载路径
        downloadDir = new File(AndroidCacheUtils.getCacheDirFile(MiaApplication.getInstance()), "download");
        if (!downloadDir.exists()) {
            downloadDir.mkdirs();
        }
        executor = new SerialExecutor();
    }

    /**
     * 顺序执行下载任务
     */
    private static class SerialExecutor implements Executor {
        final ArrayDeque<Runnable> mTasks = new ArrayDeque<Runnable>();
        Runnable mActive;

        public synchronized void execute(final Runnable r) {
            mTasks.offer(new Runnable() {
                public void run() {
                    try {
                        r.run();
                    } finally {
                        scheduleNext();
                    }
                }
            });
            if (mActive == null) {
                scheduleNext();
            }
        }

        protected synchronized void scheduleNext() {
            if ((mActive = mTasks.poll()) != null) {
                THREAD_POOL_EXECUTOR.execute(mActive);
            }
        }
    }

    /**
     * 获取单例对象
     *
     * @return
     */
    public static MyDownloadManager getInstance() {
        if (instance == null) {
            instance = new MyDownloadManager();
        }
        return instance;
    }

    /**
     * 添加下载任务
     *
     * @param path
     */
    public void addDownloadTask(final String path) {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                download(path);
            }
        });
    }

    /**
     * 下载文件
     *
     * @param path
     */
    private void download(String path) {
        String fileName = AndroidMD5.MD5(path);
        File savePath = new File(downloadDir, fileName); // 下载文件路径
        File finallyPath = new File(downloadDir, fileName + ".mp3"); // 下载完成后加入.mp3后缀
        if (finallyPath.exists()) { // 文件存在则已下载
            Log.i(TAG, "file is existed");
            return;
        }
        if (AndroidNetWorkUtils.isWifiDataEnable(MiaApplication.getInstance())) { // 如果是Wifi则开始下载
            if (savePath.exists() && savePath.delete()) { // 如果之前存在文件，证明没有下载完成，删掉重新创建
                savePath = new File(downloadDir, fileName);
            }
            Log.i(TAG, "download start");
            try {
                byte[] bs = new byte[1024];
                int len;
                URL url = new URL(path);
                InputStream is = url.openStream();
                OutputStream os = new FileOutputStream(savePath);
                while ((len = is.read(bs)) != -1) {
                    os.write(bs, 0, len);
                }
                os.close();
                is.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
            if (savePath.renameTo(finallyPath)) { // 下载完成后重命名为.mp3文件
                Log.i(TAG, "download end");
                EventBus.getDefault().post(new DownloadDoneEvent(path));
            }
        } else { // 不是wifi则不下载
            Log.i(TAG, "not wifi net, stop download");
        }

    }

    /**
     * 添加删除任务
     *
     * @param path
     */
    public void addDeleteTask(final String path) {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                delete(path);
            }
        });
    }

    /**
     * 删除本地文件
     *
     * @param path
     */
    private void delete(String path) {
        String fileName = AndroidMD5.MD5(path);
        File savePath = new File(downloadDir, fileName + ".mp3");
        Log.i(TAG, savePath.getPath());
        if (savePath.exists()) {
            if (savePath.delete()) {
                Log.i(TAG, "file is deleted");
            }
        }
    }

    /**
     * 返回下载路径
     *
     * @return
     */
    public File getDownloadDir() {
        return downloadDir;
    }
}
```
我们看到``public static final Executor THREAD_POOL_EXECUTOR = new ThreadPoolExecutor(1, 1, 1,TimeUnit.SECONDS, sPoolWorkQueue, sThreadFactory);``，这句代码便是创建一个线程池。其方法源码及参数说明：
```
/**
     * Creates a new {@code ThreadPoolExecutor} with the given initial
     * parameters and default rejected execution handler.
     *
     * @param corePoolSize the number of threads to keep in the pool, even
     *        if they are idle, unless {@code allowCoreThreadTimeOut} is set
     * @param maximumPoolSize the maximum number of threads to allow in the
     *        pool
     * @param keepAliveTime when the number of threads is greater than
     *        the core, this is the maximum time that excess idle threads
     *        will wait for new tasks before terminating.
     * @param unit the time unit for the {@code keepAliveTime} argument
     * @param workQueue the queue to use for holding tasks before they are
     *        executed.  This queue will hold only the {@code Runnable}
     *        tasks submitted by the {@code execute} method.
     * @param threadFactory the factory to use when the executor
     *        creates a new thread
     * @throws IllegalArgumentException if one of the following holds:<br>
     *         {@code corePoolSize < 0}<br>
     *         {@code keepAliveTime < 0}<br>
     *         {@code maximumPoolSize <= 0}<br>
     *         {@code maximumPoolSize < corePoolSize}
     * @throws NullPointerException if {@code workQueue}
     *         or {@code threadFactory} is null
     */
    public ThreadPoolExecutor(int corePoolSize,
                              int maximumPoolSize,
                              long keepAliveTime,
                              TimeUnit unit,
                              BlockingQueue<Runnable> workQueue,
                              ThreadFactory threadFactory) {
        this(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue,
             threadFactory, defaultHandler);
    }
```
这里我前三个参数传的都是1，既是最多只有1个线程。sPoolWorkQueue参数则是一个容量为128的任务队列，既最多能存放128个任务。

下面我们看到``SerialExecutor``的代码，它有一个Runnable队列mTasks ，不断的接受Runnable对象，并通过poll操作，每次取出顶部的Runnable进行执行。结合创建的单一线程池，便实现了我需要的简易、轻量的下载器。
