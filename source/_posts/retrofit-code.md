---
title: Retrofit 学习小结
date: 2017-11-15 18:40:56
tags:
 - sdk
---
之前的一篇文章[Retrofit初识](http://lastwarmth.win/2016/06/23/retrofit/)尝试用了下 Retrofit。说来惭愧，到现在才写这篇文章。由于项目中没有使用的缘故，一直停留在了解的程度。最近自己学习做了个[Gank](https://github.com/LiJia92/Gank)客户端，一点点学习当前主流的技术，今天研究了下 Retrofit 的源码，颇有感触，便记录下来。

## 使用
关于正常的使用，参考之前的那篇文章。这里再写一下结合 RxJava 的使用。
1. 定义接口：
```
public interface GankService {

    @GET("day/{year}/{month}/{day}")
    Observable<GankDailyResult> getDailyData(@Path("year") int year, @Path("month") int month, @Path("day") int day);

    @GET("data/{type}/{count}/{page}")
    Observable<GankCategoryResult> getCategoryData(@Path("type") String type, @Path("count") int count, @Path("page") int page);
}
```
2. 初始化 Retrofit，生成代理对象：
```
Retrofit retrofit = new Retrofit.Builder()
        .baseUrl(BASE_GANK_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
        .client(okHttpClient.build())
        .build();

mService = retrofit.create(GankService.class);
```
3. 调用接口：
```
GankRequestManager.getInstance().getCategory(type, PAGE_SIZE, mPage)
        .subscribeOn(Schedulers.io())
        .observeOn(AndroidSchedulers.mainThread())
        .subscribe(new Consumer<GankCategoryResult>() {
            @Override
            public void accept(GankCategoryResult gankCategoryResult) throws Exception {
                mPage++;
                if (mView != null) {
                    mView.showList(type, gankCategoryResult.results);
                }
            }
        });
```

<!-- more -->

## 动态代理
在项目中我们只定义了接口，并没有实现，后面却能直接调用接口，这不得不借助 Java 的动态代理特性。Retrofit 即是使用动态代理来生成代理对象：
```
public <T> T create(final Class<T> service) {
    Utils.validateServiceInterface(service);
    if (validateEagerly) {
      eagerlyValidateMethods(service);
    }
    return (T) Proxy.newProxyInstance(service.getClassLoader(), new Class<?>[] { service },
        new InvocationHandler() {
          private final Platform platform = Platform.get();

          @Override public Object invoke(Object proxy, Method method, @Nullable Object[] args)
              throws Throwable {
            // If the method is a method from Object then defer to normal invocation.
            if (method.getDeclaringClass() == Object.class) {
              return method.invoke(this, args);
            }
            if (platform.isDefaultMethod(method)) {
              return platform.invokeDefaultMethod(method, service, proxy, args);
            }
            ServiceMethod<Object, Object> serviceMethod =
                (ServiceMethod<Object, Object>) loadServiceMethod(method);
            OkHttpCall<Object> okHttpCall = new OkHttpCall<>(serviceMethod, args);
            return serviceMethod.callAdapter.adapt(okHttpCall);
          }
        });
}
```
通过``Proxy.newProxyInstance``来生成代理对象，当调用接口时，会回调到 invoke 方法中，然后生成 OkHttpCall 对象，用于后面真正的发起网络请求。OkHttpCall 是 okhttp 的核心类，这里不做过多讲述。

## Android 通过 Handler 回调主线程
普通调用 Retrofit 的形式是这样的：
```
call.enqueue(new Callback<String>() {
    @Override
    public void onResponse(Call<String> call, Response<String> response) {

    }
    @Override
    public void onFailure(Call<String> call, Throwable t) {

    }
});
```
回调中即是在主线程，我们可以用于更新 UI，这是如何做到的呢？回到 Retrofit 的构建：
```
public Retrofit build() {
  if (baseUrl == null) {
    throw new IllegalStateException("Base URL required.");
  }

  okhttp3.Call.Factory callFactory = this.callFactory;
  if (callFactory == null) {
    callFactory = new OkHttpClient();
  }

  Executor callbackExecutor = this.callbackExecutor;
  if (callbackExecutor == null) {
    callbackExecutor = platform.defaultCallbackExecutor();
  }

  // Make a defensive copy of the adapters and add the default Call adapter.
  List<CallAdapter.Factory> adapterFactories = new ArrayList<>(this.adapterFactories);
  adapterFactories.add(platform.defaultCallAdapterFactory(callbackExecutor));

  // Make a defensive copy of the converters.
  List<Converter.Factory> converterFactories = new ArrayList<>(this.converterFactories);

  return new Retrofit(callFactory, baseUrl, converterFactories, adapterFactories,
      callbackExecutor, validateEagerly);
}
```
platform 是如何生成的呢？看到 Retrofit.Builder：
```
Builder(Platform platform) {
    this.platform = platform;
    ...
}

public Builder() {
    this(Platform.get());
}

Builder(Retrofit retrofit) {
    ...
}
```
再来看 Platform：
```
private static Platform findPlatform() {
    try {
      Class.forName("android.os.Build");
      if (Build.VERSION.SDK_INT != 0) {
        return new Android();
      }
    } catch (ClassNotFoundException ignored) {
    }
    try {
      Class.forName("java.util.Optional");
      return new Java8();
    } catch (ClassNotFoundException ignored) {
    }
    return new Platform();
}
```
显然，在 Android 中会返回 Android（）：
```
static class Android extends Platform {
    @Override public Executor defaultCallbackExecutor() {
      return new MainThreadExecutor();
    }

    @Override CallAdapter.Factory defaultCallAdapterFactory(@Nullable Executor callbackExecutor) {
      if (callbackExecutor == null) throw new AssertionError();
      return new ExecutorCallAdapterFactory(callbackExecutor);
    }s MainThreadExecutor implements Executor {
      private final Handler handler = new Handler(Looper.getMainLooper());

      @Override public void execute(Runnable r) {
        handler.post(r);
      }
    }
}
```
看到没， Android platform 会初始化一个绑定 MainLooper 的 Handler，很清晰了。
```
@Override public void enqueue(final Callback<T> callback) {
  checkNotNull(callback, "callback == null");

  delegate.enqueue(new Callback<T>() {
    @Override public void onResponse(Call<T> call, final Response<T> response) {
      callbackExecutor.execute(new Runnable() {
        @Override public void run() {
          if (delegate.isCanceled()) {
            // Emulate OkHttp's behavior of throwing/delivering an IOException on cancellation.
            callback.onFailure(ExecutorCallbackCall.this, new IOException("Canceled"));
          } else {
            callback.onResponse(ExecutorCallbackCall.this, response);
          }
        }
      });
    }

    @Override public void onFailure(Call<T> call, final Throwable t) {
      callbackExecutor.execute(new Runnable() {
        @Override public void run() {
          callback.onFailure(ExecutorCallbackCall.this, t);
        }
      });
    }
  });
}
```
回调中的 Runnable 则是由 Handler 发出的，显然是在主线程了。

## CallAdapterFactory
使用 RxJava，会有 RxJava2CallAdapter 类：
```
final class RxJava2CallAdapter<R> implements CallAdapter<R, Object> {
    private final Type responseType;
    private final @Nullable
    Scheduler scheduler;
    private final boolean isAsync;
    private final boolean isResult;
    private final boolean isBody;
    private final boolean isFlowable;
    private final boolean isSingle;
    private final boolean isMaybe;
    private final boolean isCompletable;

    RxJava2CallAdapter(Type responseType, @Nullable Scheduler scheduler, boolean isAsync,
                       boolean isResult, boolean isBody, boolean isFlowable, boolean isSingle, boolean isMaybe,
                       boolean isCompletable) {
        this.responseType = responseType;
        this.scheduler = scheduler;
        this.isAsync = isAsync;
        this.isResult = isResult;
        this.isBody = isBody;
        this.isFlowable = isFlowable;
        this.isSingle = isSingle;
        this.isMaybe = isMaybe;
        this.isCompletable = isCompletable;
    }

    @Override
    public Type responseType() {
        return responseType;
    }

    @Override
    public Object adapt(Call<R> call) {
        Observable<Response<R>> responseObservable = isAsync
                ? new CallEnqueueObservable<>(call)
                : new CallExecuteObservable<>(call);

        Observable<?> observable;
        if (isResult) {
            observable = new ResultObservable<>(responseObservable);
        } else if (isBody) {
            observable = new BodyObservable<>(responseObservable);
        } else {
            observable = responseObservable;
        }

        if (scheduler != null) {
            observable = observable.subscribeOn(scheduler);
        }

        if (isFlowable) {
            return observable.toFlowable(BackpressureStrategy.LATEST);
        }
        if (isSingle) {
            return observable.singleOrError();
        }
        if (isMaybe) {
            return observable.singleElement();
        }
        if (isCompletable) {
            return observable.ignoreElements();
        }
        return observable;
    }
}
```
通过 **adapt** 方法来生成目标的对象。使用 RxJava 则是生成 Observable。返回的 observable 只有在发生订阅关系时才会调用请求。
```
@SchedulerSupport(SchedulerSupport.NONE)
@Override
public final void subscribe(Observer<? super T> observer) {
    ObjectHelper.requireNonNull(observer, "observer is null");
    try {
        observer = RxJavaPlugins.onSubscribe(this, observer);

        ObjectHelper.requireNonNull(observer, "Plugin returned null Observer");
        // 请求真正发生的地方
        subscribeActual(observer);
    } catch (NullPointerException e) { // NOPMD
        throw e;
    } catch (Throwable e) {
        Exceptions.throwIfFatal(e);
        // can't call onError because no way to know if a Disposable has been set or not
        // can't call onSubscribe because the call might have set a Subscription already
        RxJavaPlugins.onError(e);

        NullPointerException npe = new NullPointerException("Actually not, but can't throw other exceptions due to RS");
        npe.initCause(e);
        throw npe;
    }
}
```
subscribeActual 则是请求真正发生的地方：
```
protected abstract void subscribeActual(Observer<? super T> observer);
```
通过 RxJava2CallAdapter 返回的 observable 是 CallEnqueueObservable 或 CallExecuteObservable：
```
final class CallEnqueueObservable<T> extends Observable<Response<T>> {
    private final Call<T> originalCall;

    CallEnqueueObservable(Call<T> originalCall) {
        this.originalCall = originalCall;
    }

    @Override protected void subscribeActual(Observer<? super Response<T>> observer) {
        // Since Call is a one-shot type, clone it for each new observer.
        Call<T> call = originalCall.clone();
        retrofit2.adapter.rxjava2.CallEnqueueObservable.CallCallback<T> callback = new retrofit2.adapter.rxjava2.CallEnqueueObservable.CallCallback<>(call, observer);
        observer.onSubscribe(callback);
        // 异步调用
        call.enqueue(callback);
    }

    private static final class CallCallback<T> implements Disposable, Callback<T> {
        private final Call<?> call;
        private final Observer<? super Response<T>> observer;
        boolean terminated = false;

        CallCallback(Call<?> call, Observer<? super Response<T>> observer) {
            this.call = call;
            this.observer = observer;
        }

        @Override public void onResponse(Call<T> call, Response<T> response) {
            if (call.isCanceled()) return;

            try {
                observer.onNext(response);

                if (!call.isCanceled()) {
                    terminated = true;
                    observer.onComplete();
                }
            } catch (Throwable t) {
                if (terminated) {
                    RxJavaPlugins.onError(t);
                } else if (!call.isCanceled()) {
                    try {
                        observer.onError(t);
                    } catch (Throwable inner) {
                        Exceptions.throwIfFatal(inner);
                        RxJavaPlugins.onError(new CompositeException(t, inner));
                    }
                }
            }
        }

        @Override public void onFailure(Call<T> call, Throwable t) {
            if (call.isCanceled()) return;

            try {
                observer.onError(t);
            } catch (Throwable inner) {
                Exceptions.throwIfFatal(inner);
                RxJavaPlugins.onError(new CompositeException(t, inner));
            }
        }

        @Override public void dispose() {
            call.cancel();
        }

        @Override public boolean isDisposed() {
            return call.isCanceled();
        }
    }
}


final class CallExecuteObservable<T> extends Observable<Response<T>> {
    private final Call<T> originalCall;

    CallExecuteObservable(Call<T> originalCall) {
        this.originalCall = originalCall;
    }

    @Override protected void subscribeActual(Observer<? super Response<T>> observer) {
        // Since Call is a one-shot type, clone it for each new observer.
        Call<T> call = originalCall.clone();
        observer.onSubscribe(new retrofit2.adapter.rxjava2.CallExecuteObservable.CallDisposable(call));

        boolean terminated = false;
        try {
            // 同步调用
            Response<T> response = call.execute();
            if (!call.isCanceled()) {
                observer.onNext(response);
            }
            if (!call.isCanceled()) {
                terminated = true;
                observer.onComplete();
            }
        } catch (Throwable t) {
            Exceptions.throwIfFatal(t);
            if (terminated) {
                RxJavaPlugins.onError(t);
            } else if (!call.isCanceled()) {
                try {
                    observer.onError(t);
                } catch (Throwable inner) {
                    Exceptions.throwIfFatal(inner);
                    RxJavaPlugins.onError(new CompositeException(t, inner));
                }
            }
        }
    }

    private static final class CallDisposable implements Disposable {
        private final Call<?> call;

        CallDisposable(Call<?> call) {
            this.call = call;
        }

        @Override public void dispose() {
            call.cancel();
        }

        @Override public boolean isDisposed() {
            return call.isCanceled();
        }
    }
}
```
异步调用 call.enqueue，同步调用 call.execute，这也正是 okhttp 的使用方法，所以 Retrofit 的核心仍是 okhttp，只不过做了更好的封装。

当我们不使用 RxJava 时，会有默认的 ExecutorCallAdapterFactory 类：
```
final class ExecutorCallAdapterFactory extends CallAdapter.Factory {
    final Executor callbackExecutor;

    ExecutorCallAdapterFactory(Executor callbackExecutor) {
        this.callbackExecutor = callbackExecutor;
    }

    @Override
    public CallAdapter<?, ?> get(Type returnType, Annotation[] annotations, Retrofit retrofit) {
        if (getRawType(returnType) != Call.class) {
            return null;
        }
        final Type responseType = Utils.getCallResponseType(returnType);
        return new CallAdapter<Object, Call<?>>() {
            @Override
            public Type responseType() {
                return responseType;
            }

            @Override
            public Call<Object> adapt(Call<Object> call) {
                return new ExecutorCallbackCall<>(callbackExecutor, call);
            }
        };
    }

    static final class ExecutorCallbackCall<T> implements Call<T> {
    final Executor callbackExecutor;
    final Call<T> delegate;

    ExecutorCallbackCall(Executor callbackExecutor, Call<T> delegate) {
        this.callbackExecutor = callbackExecutor;
        this.delegate = delegate;
    }

    @Override
    public void enqueue(final Callback<T> callback) {
        checkNotNull(callback, "callback == null");

        delegate.enqueue(new Callback<T>() {
            @Override
            public void onResponse(Call<T> call, final Response<T> response) {
                callbackExecutor.execute(new Runnable() {
                    @Override
                    public void run() {
                        if (delegate.isCanceled()) {
                            // Emulate OkHttp's behavior of throwing/delivering an IOException on cancellation.
                            callback.onFailure(ExecutorCallbackCall.this, new IOException("Canceled"));
                        } else {
                            callback.onResponse(ExecutorCallbackCall.this, response);
                        }
                    }
                });
            }

            @Override
            public void onFailure(Call<T> call, final Throwable t) {
                callbackExecutor.execute(new Runnable() {
                    @Override
                    public void run() {
                        callback.onFailure(ExecutorCallbackCall.this, t);
                    }
                });
            }
        });
    }
}
```
还有一个 DefaultCallAdapterFactory，只有在``callbackExecutor == null``的条件才会创建这个类：
```
final class DefaultCallAdapterFactory extends CallAdapter.Factory {
    static final CallAdapter.Factory INSTANCE = new retrofit2.DefaultCallAdapterFactory();

    @Override
    public CallAdapter<?, ?> get(Type returnType, Annotation[] annotations, Retrofit retrofit) {
        if (getRawType(returnType) != Call.class) {
            return null;
        }

        final Type responseType = Utils.getCallResponseType(returnType);
        return new CallAdapter<Object, Call<?>>() {
            @Override public Type responseType() {
                return responseType;
            }

            @Override public Call<Object> adapt(Call<Object> call) {
                return call;
            }
        };
    }
}

CallAdapter.Factory defaultCallAdapterFactory(@Nullable Executor callbackExecutor) {
    if (callbackExecutor != null) {
        return new ExecutorCallAdapterFactory(callbackExecutor);
    }
    return retrofit2.DefaultCallAdapterFactory.INSTANCE;
}
```
通过适配器模式，可是适配各种使用场景，当我们有特定的需求，自定义 CallAdapterFactory 即可。Converter 也是类似的原理。当配置多个 Converter 或者 CallAdapter 时，只有第一个生效。如下代码 RxJava2CallAdapterFactory 生效。
```
.addCallAdapterFactory(RxJava2CallAdapterFactory.create())
.addCallAdapterFactory(Java8CallAdapterFactory.create())
```

## 设计模式
Retrofit 中使用到的设计模式不可谓不多。
1. 建造者模式：这个模式相信大家都很熟悉了。Retrofit 算是比较复杂的一个类了，直接创建一个 Retrofit 将会在碰到这些用不到的方法上困惑，建造者模式提供了一个很好的思路。
2. 装饰模式：不管内部多么复杂，在使用时只需要围绕 Retrofit 类就够了。简化了开发者的学习成本，易于使用。另外封装了系统内部类的关系，对内是高内聚的，对外是松耦合的。
3. 代理模式：动态代理创建接口实现类，接口的调用都由 OkHttpCall 来执行。
4. 工厂模式：源码中可是有不少的 Factory。
5. 适配器模式：CallAdapter 通过泛型定义 adapt 方法，开发者可自定义 CallAdapter 实现 adapt 方法来返回自己想要的对象。
```
T adapt(Call<R> call);
```

当然，不止于这几种模式，只是这几种是我能直观感受到的，再一次感叹 Retrofit 设计的妙处！

设计模式的魅力便在于此，尽管它很复杂，但是开发者使用起来却很简单，也很容易拓展实现自定义需求，好的框架应当如此，努力学习吧！
