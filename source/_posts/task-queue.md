---
title: Android实现任务队列：一个入口一个出口、一个入口两个出口
date: 2016-05-27 15:11:25
tags:
 - java
---

## 前言
在我的[Android实现简易轻量下载器：单线程任务队列](http://lastwarmth.win/2016/02/23/single-thread-queue/)文章中，有提到过任务队列。当时是需要下载，实现一个简单的单线程任务队列即可。
最近项目中也需要用到任务队列，并且有2种需求：
1. 动态礼物动画：在用户送完动态礼物之后，会在界面上展现一个动画。界面上一次最多能执行1个动画，动画按顺序执行。即：``一个入口一个出口``。
2. 静态礼物动画：在用户送完静态礼物之后，会在界面上展现一个动画。界面上一次最多能并列执行2个动画，动画按顺序执行。即：``一个入口两个出口``。
同样都是任务队列，只不过一个是只有一个出口，另一个有两个出口。

<!-- more -->

## 动态礼物动画
参照着之前那篇文章，很快就写出来了。
动态礼物单体类``DynamicGiftModel``：
```
public class DynamicGiftModel implements GiftModel {

    private GifImageView gifImageView;
    private GifDrawable gifDrawable;
    private DynamicGiftListener listener;

    public DynamicGiftModel(GifDrawable gifDrawable, GifImageView gifImageView, DynamicGiftListener listener) {
        this.gifDrawable = gifDrawable;
        this.gifImageView = gifImageView;
        this.listener = listener;
    }


    @Override
    public void startAnimation(final GiftAnimationEndListener nextListener) {
        if (listener != null) {
            listener.beforeDynamicAnimation();
        }
        gifImageView.setImageDrawable(gifDrawable);
        gifDrawable.addAnimationListener(new AnimationListener() {
            @Override
            public void onAnimationCompleted(int loopNumber) {
                if (loopNumber == (gifDrawable.getLoopCount() - 1)) {
                    if (listener != null) {
                        listener.afterDynamicAnimation();
                    }
                    gifDrawable.recycle();
                    if (nextListener != null) {
                        nextListener.onGiftAnimationEnd();
                    }
                }

            }
        });
    }

    public interface DynamicGiftListener {
        void beforeDynamicAnimation();

        void afterDynamicAnimation();
    }
}
```
动态礼物队列类``DynamicGift``:
```
public class DynamicGift {

    private static DynamicGift instance = new DynamicGift();
    private DynamicGiftExecutor executor;

    public static DynamicGift getInstance() {
        if (instance == null) {
            instance = new DynamicGift();
        }

        return instance;
    }

    private DynamicGift() {
        executor = new DynamicGiftExecutor();
    }

    /**
     * 动画队列，顺序执行
     */
    class DynamicGiftExecutor implements GiftAnimationEndListener {

        final ArrayDeque<DynamicGiftModel> mTasks = new ArrayDeque<>();
        DynamicGiftModel mActive;

        public void execute(final DynamicGiftModel model) {
            mTasks.offer(model);
            if (mActive == null) {
                scheduleNext();
            }
        }

        protected synchronized void scheduleNext() {
            if ((mActive = mTasks.poll()) != null) {
                mActive.startAnimation(this);
            }
        }

        @Override
        public void onGiftAnimationEnd() {
            scheduleNext();
        }
    }

    /**
     * 往队列中添加动画对象
     *
     * @param gifImageView imageView
     * @param gifDrawable  gif图
     * @param listener     监听
     */
    public void addGifAnimation(GifImageView gifImageView, GifDrawable gifDrawable, DynamicGiftModel.DynamicGiftListener listener) {
        executor.execute(new DynamicGiftModel(gifDrawable, gifImageView, listener));
    }
}
```
说明一下：``GifImageView``就是用来播放gif的ImageView，``GifDrawable``就是gif对应的drawable，``DynamicGiftListener``就是动画执行前后的回调。
可以看到，我们通过``execute()``将一个``DynamicGiftModel``任务放入到队列中，``DynamicGiftModel``调用``startAnimation()``便能开始动画了。``DynamicGiftExecutor``与那篇博客中的类似。只不过我这里做了一些修改：下载中使用的Runnable，他是同步的，在执行完之后会自动去取一下。但是在这里，动画执行是异步的，我在调用完``startAnimation()``之后就会立即返回，所以需要一个监听（GiftAnimationEndListener）在动画执行完毕之后才去执行``scheduleNext()``操作，即取下一个任务。
GiftAnimationEndListener代码很简单：
```
public interface GiftAnimationEndListener {
    void onGiftAnimationEnd();
}
```

调用如下代码将任务添加到队列便能顺序播放动画了。
```
DynamicGift.getInstance().addGifAnimation(gifImageView, gifDrawable, listener);
```

## 静态礼物动画
静态礼物因为有两个出口，之前没思考过，所以花了一些时间。
静态礼物单体类``DynamicGiftModel``:
```
public class StaticGiftModel implements GiftModel {

    private StaticGiftListener listener;
    private PushGift gift;
    private boolean over;

    public StaticGiftModel(PushGift gift, StaticGiftListener listener) {
        this.gift = gift;
        this.listener = listener;
    }

    public boolean isOver() {
        return over;
    }

    public void setOver(boolean over) {
        this.over = over;
    }

    @Override
    public void startAnimation(final GiftAnimationEndListener nextListener) {
        if (listener != null) {
            listener.startStaticAnimation(this, gift, nextListener);
        }
    }

    public interface StaticGiftListener {
        void startStaticAnimation(StaticGiftModel giftModel, PushGift gift, GiftAnimationEndListener nextListener);
    }
}
```
静态礼物队列类``StaticGift``：
```
public class StaticGift {

    private static StaticGift instance = new StaticGift();
    private StaticGiftExecutor executor;

    public static StaticGift getInstance() {
        if (instance == null) {
            instance = new StaticGift();
        }

        return instance;
    }

    private StaticGift() {
        executor = new StaticGiftExecutor();
    }

    /**
     * 动画队列，2个出口，顺序执行
     */
    class StaticGiftExecutor implements GiftAnimationEndListener {

        final ArrayDeque<StaticGiftModel> mTasks = new ArrayDeque<>();
        StaticGiftModel mActive1;
        StaticGiftModel mActive2;

        public void execute(final StaticGiftModel model) {
            mTasks.offer(model);
            if (mActive1 == null) {
                mActive1 = mTasks.poll();
                if (mActive1 != null) {
                    mActive1.startAnimation(this);
                }
            } else if (mActive2 == null) {
                mActive2 = mTasks.poll();
                if (mActive2 != null) {
                    mActive2.startAnimation(this);
                }
            }
        }

        @Override
        public void onGiftAnimationEnd() {
            if (mActive1 != null && mActive1.isOver()) {
                mActive1 = mTasks.poll();
                if (mActive1 != null) {
                    mActive1.startAnimation(this);
                }
            }
            if (mActive2 != null && mActive2.isOver()) {
                mActive2 = mTasks.poll();
                if (mActive2 != null) {
                    mActive2.startAnimation(this);
                }
            }
        }

    }

    /**
     * 添加任务
     *
     * @param gift     推送的Gift内容
     * @param listener 回调
     */
    public void addNumAnimation(PushGift gift, StaticGiftModel.StaticGiftListener listener) {
        executor.execute(new StaticGiftModel(gift, listener));
    }
}
```
可以看到，我在``StaticGiftExecutor``中定义了2个变量``mActive1``、``mActive2``，他们即代表两个出口。在``execute``中先判断``mActive1``是否为空，是则取出元素给它，让它执行动画。否则判断``mActive2``是否为空，是则取出元素给它，让它执行动画。
因为有两个出口，队列并不知道我的下一个任务要在哪个出口执行，所以具体的播放逻辑不能写在其中，所以我将具体的播放逻辑设计在``StaticGiftListener.startStaticAnimation()``的中，由调用的用户自行实现，并且在动画结束时，我需要回调队列的接口，来通知队列某某出口的动画执行完毕了。
实现片段代码如下：
```
/**
     * 执行静态礼物动画
     *
     * @param gift
     * @param nextListener
     */
    @Override
    public void startStaticAnimation(final StaticGiftModel giftModel, PushGift gift, final GiftAnimationEndListener nextListener) {
        if (holder.staticLayout1.getVisibility() == View.GONE) {
            holder.staticLayout1.setVisibility(View.VISIBLE);
            holder.staticGiftUserNick1.setText(gift.getUserNick());
            holder.staticGiftDesc1.setText(gift.getDescription());
            showIcon(gift.getUserIcon(), holder.staticGiftUserIcon1);
            // 获取对应礼物的本地下载路径
            String fileName = CommonUtils.MD5(gift.getGiftIcon());
            File savePath = new File(GiftManager.getInstance().getDownloadDir(), fileName);
            String path = "file://" + savePath.getAbsolutePath();
            ImageLoader.getInstance().displayImage(path, holder.staticGiftIcon1);
            holder.staticGiftView1.setListener(new StaticGiftView.StaticGiftAnimationListener() {
                @Override
                public void onAnimationEnd() {
                    holder.staticLayout1.setVisibility(View.GONE);
                    giftModel.setOver(true);
                    nextListener.onGiftAnimationEnd();
                }
            });
            holder.staticGiftView1.setNum(Integer.valueOf(gift.getNum()));
        } else if (holder.staticLayout2.getVisibility() == View.GONE) {
            holder.staticLayout2.setVisibility(View.VISIBLE);
            holder.staticGiftUserNick2.setText(gift.getUserNick());
            holder.staticGiftDesc2.setText(gift.getDescription());
            showIcon(gift.getUserIcon(), holder.staticGiftUserIcon2);
            // 获取对应礼物的本地下载路径
            String fileName = CommonUtils.MD5(gift.getGiftIcon());
            File savePath = new File(GiftManager.getInstance().getDownloadDir(), fileName);
            String path = "file://" + savePath.getAbsolutePath();
            ImageLoader.getInstance().displayImage(path, holder.staticGiftIcon2);
            holder.staticGiftView2.setListener(new StaticGiftView.StaticGiftAnimationListener() {
                @Override
                public void onAnimationEnd() {
                    holder.staticLayout2.setVisibility(View.GONE);
                    giftModel.setOver(true);
                    nextListener.onGiftAnimationEnd();
                }
            });
            holder.staticGiftView2.setNum(Integer.valueOf(gift.getNum()));
        }
    }
```
静态礼物动画实现类StaticGiftView：
```
public class StaticGiftView extends TextView {

    private int current = 1;
    private int num;
    private StaticGiftAnimationListener listener;
    private Animation scaleAnimation = AnimationUtils.loadAnimation(getContext(), R.anim.gift_scale);

    public StaticGiftView(Context context) {
        super(context);
    }

    public StaticGiftView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public StaticGiftView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public void setListener(StaticGiftAnimationListener listener) {
        this.listener = listener;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
    }

    public void setNum(int num) {
        this.num = num;
        startAnimation(scaleAnimation);
    }

    @Override
    protected void onAnimationEnd() {
        super.onAnimationEnd();
        current++;
        if (current <= num) {
            setText("X " + current);
            startAnimation(scaleAnimation);
        } else {
            current = 1;
            if (listener != null) {
                listener.onAnimationEnd();
            }
        }
    }

    public interface StaticGiftAnimationListener {
        void onAnimationEnd();
    }
}
```

静态礼物是通过``StaticGiftView``的``setNum()``方法来显示动画的，就是显示一个数量递增，同时伴随着缩放的动画。
页面布局中有``staticLayout1``和``staticLayout2``，分别代表两个执行动画的布局，通过判断``getVisibility()``是否为``GONE``来决定是否将动画分发给这个布局。在动画开始时，将布局设置成VISIBLE，在动画结束后，再将布局设置成GONE。
我通过``setOver(true)``来告知队列某某出口的动画执行完毕，然后队列回调到``onGiftAnimationEnd()``中，继续取出任务分配给有空的出口。

调用如下代码将任务添加到队列便能顺序播放动画了。
```
StaticGift.getInstance().addNumAnimation(pushGift, listener);
```

## 待优化
1. 代码之间的依赖很重，任务队列直接依赖到了前端的UI组件，需要解耦。
2. 若是增加至三个、四个或是更多个出口，代码就得一直添加``mActive``了，不利于拓展。
