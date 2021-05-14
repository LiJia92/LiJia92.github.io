---
title: 关于「引擎」设计的小结
date: 2021-05-14 17:05:53
tags:
 - 技术思路
---
一个业务场景：科二学员考试系统，当学员做了错误的操作之后，会扣分。那么如何实现这样的一个扣分引擎呢？

1. 检测时机：很显然的我们需要一个定时检测的时机，比如每隔 100 毫秒，或者 1 秒，执行一次检测。这样的话，可以理解为，有一个死循环，持续进行检测。
2. 检测事项：每一次检测需要检测哪些数据，当数据不符合条件，就扣这个分。
3. 引擎状态：当开始考试时，需要启动引擎，进行检测。结束考试时，就停止检测。

<!-- more -->

基于这样的一个大体思路，实现一个引擎。根据具体的业务功能，先抽象出一个接口（仅仅为了展示思路，所有代码全部简化，接口只抽取信号检测）：
```
/**
 * 考试处理器
 */
public interface ExamHandler {

    /**
     * 信号处理
     *
     * @param signal 信号
     */
    void onSignal(SignalGetter signal);
}
```
为了避免检测耗时，导致 App 卡顿，所以我们的引擎需要运行在子线程，而子线程可以接受各种消息，执行相应的任务，理所当然地使用到了 HandlerThread。
```
/**
 * 考试执行器
 */
public class ExamScheduler {

    private static final int SIGNAL = 520;

    /**
     * 真正执行检测的线程
     */
    private volatile HandlerThread thread;
    private volatile Handler checkerHandler;

    /**
     * 真正执行检测的类
     */
    private volatile ExamHandler examHandler;

    public ExamScheduler(ExamHandler examHandler) {
        this.examHandler = examHandler;
        thread = new HandlerThread("EventCheckerThread");
        thread.start();
    }

    /**
     * 设置真实处理器
     */
    public void setExamHandler(ExamHandler examHandler) {
        this.examHandler = examHandler;
    }

    private Handler createCheckerHandler() {
        final HandlerThread t = thread;
        if (t == null) {
            return null;
        }
        return new Handler(t.getLooper()) {
            @Override
            public void handleMessage(@NonNull Message msg) {
                dispatchAction(msg);
            }
        };
    }

    /**
     * 开始
     */
    public boolean start() {
        if (checkerHandler == null) {
            checkerHandler = createCheckerHandler();
        }
        if (checkerHandler == null) {
            return false;
        }
        return true;
    }

    /**
     * 事件分发
     */
    private void dispatchAction(Message msg) {
        final ExamHandler eh = ExamScheduler.this.examHandler;
        if (eh == null) {
            return;
        }
        final int action = msg.arg1;
        if (action == SIGNAL) {
            if (isPause) {
                return;
            }
            SignalGetter signal = (SignalGetter) msg.obj;
            eh.onSignal(signal);
        }
    }

    /**
     * 执行事件检测
     *
     * @param signal 周期信号
     */
    public void check(SignalGetter signal) {
        if (isStop || checkerHandler == null) {
            return;
        }
        Message msg = Message.obtain();
        msg.arg1 = SIGNAL;
        msg.obj = signal;
        sendMessage(msg);
    }

    /**
     * 销毁
     */
    public void destroy() {
        isStop = true;

        final Handler handler = checkerHandler;
        checkerHandler = null;
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        final HandlerThread ht = thread;
        thread = null;
        if (ht != null) {
            ht.quit();
        }
    }

    /**
     * 发送消息
     */
    private void sendMessage(Message message) {
        final Handler h = checkerHandler;
        if (h != null) {
            h.sendMessage(message);
        }
    }
}
```
通过 ExamScheduler 发送消息，来执行具体的 ExamHandler 的动作。然后提供一个 ExamEngine，来持有 ExamScheduler。
```
/**
 * 考试引擎
 */
public class ExamEngine {

    /**
     * 信号更改回调
     */
    private final SignalCallback callback = this::doOneCheck;

    /**
     * 实际处理器
     */
    private final ExamScheduler examScheduler;
    private final ExamConfig config;
    private final ExamResultCallback examResultCallback;
    private final ExamEventCallback examEventCallback;
    private final ExamEndInterceptor endInterceptor;

    /**
     * 当前的考试数据以及相关配置数据
     */
    private ExamData currentData;

    public ExamEngine(ExamConfig config, ExamResultCallback examResultCallback, ExamEventCallback examEventCallback, ExamEndInterceptor endInterceptor) {
        this.config = config;
        this.examResultCallback = examResultCallback;
        this.examEventCallback = examEventCallback;
        currentData = config.create(null);
        this.endInterceptor = endInterceptor;
        examScheduler = new ExamScheduler(new ExamProcessor(currentData, examResultCallback, examEventCallback, this, config.continueIfError, endInterceptor));
    }

    /**
     * 开始考试
     */
    public boolean start() {
        SignalCenter.instance.addSignalCallback(callback);
        return examScheduler.start();
    }

    /**
     * 获取当前的考试配置和数据
     */
    public ExamData getExamData() {
        return currentData;
    }

    /**
     * 根据当前信号和当前步骤，做一次检测
     */
    public synchronized void doOneCheck(SignalGetter signalGetter) {
        examScheduler.check(signalGetter);
    }
}
```
然后 ExamEngine 的创建需要 ExamConfig，即考试配置。为了兼容科二、科三，这个配置还是很有必要的（科二、科三的配置不一样，但是检测逻辑一致）。 
```
/**
 * 考试配置
 */
public class ExamConfig {
    /**
     * 科目
     */
    private final KeMu keMu;
    /**
     * 事件创建
     */
    private final ExamEventCreator eventCreator;

    public ExamData create(RouteConfig routeConfig) {
        return new ExamData(keMu, routeConfig);
    }
}
```
这个类只是一些配置，重点在于 create 方法以及 ExamEventCreator 实现。
```
/**
 * 考试事件创建器
 */
public interface ExamEventCreator {
    /**
     * 创建各个步骤事件，比如直线行驶，加减挡
     */
    StepCreator stepCreator();

    /**
     * 路线配置，包括路线步骤、每个步骤里的规则、每个规则的配置三部分。这个是根据场地id或者路线id，去Configs里获取的，考试中这个是不能修改的
     */
    RouteConfig getRouteConfig();

    /**
     * 是否可以同时执行多个项目
     */
    default boolean canExeMoreThanOneStep(RouteConfig config) {
        return true;
    }

    /**
     * 创建全局事件，比如科三的安全带是否佩戴等。全局事件有个地方需要注意，
     * 是在步骤事件执行结束之后再执行的，所以要自己判断当前步骤是否全部执行完了。
     * 这是因为有的事件是在全部执行完之后还要做一次检测的，但是大部分事件是不需要的。
     */
    StepHandler createGlobalEvents(StepConfig config);

    /**
     * 一共有哪些步骤
     *
     * @return 需要检测的步骤
     */
    List<StepInfo> stepList();

    /**
     * 每一步的事件创建器
     */
    interface StepCreator {

        /**
         * 根据每一步，创建一个处理器
         *
         * @param step            根据每一个step，提供一个step handler
         * @param stepConfig      每一步的配置
         * @param allowNoStartPos 可不可以允许没有起始点
         * @return 步骤事件处理器
         */
        StepHandler createStep(StepInfo step, StepConfig stepConfig, boolean allowNoStartPos);
    }

    class StepInfo {
        /**
         * 开始点
         */
        public Location location;
        /**
         * 刹车点
         */
        public Location brakePoint;
        /**
         * 刹车距离
         */
        public double brakeDistance;

        public Step step;
    }
}
```
这个 ExamEventCreator 来负责检测事项的生成，科二、科三是不一致的。检测事项，需要按照考试项目来，根据不同的项目，生成对应的 StepHandler。
```
/**
 * 项目检测处理器
 */
public class StepHandler {
    /**
     * 开始事件
     */
    private final SubStepHandler startEvent;
    /**
     * 结束事件,这个可以为空
     */
    private final SubStepHandler endEvent;
    /**
     * 顺序执行事件
     */
    private final List<SubStepHandler> orderEvents;
    /**
     * 固定检测执行事件
     */
    private final List<SubStepHandler> fixedEvents;
    /**
     * 是哪一步
     */
    public final Step examStep;
}
```
一个项目可能会有很多个检测事项，所以定义了 SubStepHandler，代表这个项目真正需要检测的子项。
```
/**
 * 项目子项处理器
 */
public interface SubStepHandler {
    /**
     * 给这个步骤评分，检测，看是不是满足条件，满足规则
     */
    SubStepResult handle(SignalGetter signal, ExamProcessor processor, StepHandler stepEvent);

    /**
     * 主动检测的方式，是否触发了这个步骤
     *
     * @param forceStartTrigger 强制开始，每个步骤都要考虑这种情况，即这一步被强制开始了，不需要达到原先的条件。
     *                          这个参数只在start事件中才有用，当强制开始的时候，不会用到这个结果，但是方法依然执行
     */
    boolean isTrigger(SignalGetter signal, ExamProcessor processor, StepHandler stepEvent, boolean forceStartTrigger);

    /**
     * 这一步的名称
     */
    String stepName();
}
```
具体的检测，则是执行到 SubStepHandler handle 方法，结合当前车辆信号，ExamProcessor(ExamHandler 接口实现类)，以及所处的项目 StepHandler，来进行相应的评判，来返回 SubStepResult。
```
public class SubStepResult {
    /**
     * 累计扣分
     */
    public int deductScore;
    /**
     * 扣分条目
     */
    public final List<DeductInfo> deductList = new ArrayList<>();
}
```
就是累计扣的分，和需要回调出去的具体的扣分信息 DeductInfo。大多数情况下，list 的 size = 1。
因为分科二、科三，所以还需要再抽像一个 EngineManager，由它来持有 ExamEngine。这个 Manager 就只负责包装 ExamEngine 的一些方法，同时提供一些回调。科二、科三分别继承这个类，传入自身的 config，来创建相应的 ExamEngine 即可。
至此，大体的引擎设计便差不多了。

## 题外话
科三有几百个扣分项，理论上我们需要生成几百个 SubStepHandler，如果手动创建则会十分繁杂，所以使用了反射：
```
private List<SubStepHandler> fixedEvents(Step step, StepConfig config) {
    Set<Integer> deducts = config.deductConfig.keySet();
    List<SubStepHandler> fixed = new ArrayList<>();
    String stepName = step.name();
    String pureStepName = stepName.replace("K2_", "");
    String dir = pureStepName.toLowerCase();
    for (Integer i : deducts) {
        Deduct deduct = config.deductConfig.get(i);
        if (deduct == null || deduct.judgeType.notAuto()) {
            continue;
        }
        String className = "cn.xxxxxx.android.yyyyyy.examk2.rule." + dir + "." + stepName + "_" + i + "_Event";
        try {
            Class<?> clazz = Class.forName(className);
            Constructor<?>[] cs = clazz.getConstructors();
            Constructor<?> target = null;
            for (Constructor<?> c : cs) {
                Class<?>[] pt = c.getParameterTypes();
                if (pt != null && pt.length == 2) {
                    target = c;
                    break;
                }
            }
            if (target != null) {
                fixed.add((SubStepHandler) target.newInstance(config.stepConfig, deduct));
            } else {
                LogUtils.e("TAG", "扣分项构造失败:deduct = " + deduct + " , Constructor = " + target);
            }
        } catch (Exception e) {
            LogUtils.e("TAG", "固定事件扣分项构造失败:" + e.getLocalizedMessage());
        }
    }
    return fixed;
}
```
拿到具体的项目和项目的配置，通过反射生成所有的扣分项，那么这些扣分项必然需要满足同一个路径，以及命名规范了。举个例子：
```
package cn.xxxxxx.android.yyyyyy.examk2.rule.cefangtingche;

public class K2_CeFangTingChe_304100_Event extends OneDeductEvent<K2CeFangTingCheConfig>
```
可能存在性能损耗，但好在方便，使用之后发现性能影响甚微，便持续使用了。