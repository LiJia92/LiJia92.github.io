---
title: Fragment 问题小结
date: 2019-01-10 14:49:12
tags:
 - Android 进阶
---
ViewPager 用来做多 Tab 处理已经是十分常见的了，ViewPager 需要一个 Fragment List 来生成 Adapter，这些 Fragment 有时是完全一样的，界面元素、展示风格都一致，只是数据源不一致。通过抽象的思想，很容易写出基类，类似这样：
```
abstract class BaseListFragment : BaseFragment<MyData>() {

    override fun requestHttpData(pageModel: PageModel?): MutableList<MyData> {
        return getData()
    }


    abstract fun getData(): MutableList<MyData>
}
```

<!-- more -->

然后在创建 Fragment List 时，使用匿名类实现``getData()``方法来获取数据。就像这样：
```
viewPager.adapter = object : FragmentPagerAdapter(fragmentManager) {
    override fun getItem(position: Int): BaseListFragment {
        when (position) {
            0 -> {
                if (fragment == null) {
                    fragment = object : BaseListFragment() {
                        override fun getData(): MutableList<MyData> {
                            // 获取数据
                        }
                    }
                }
                return fragment!!
            }
            
            ...
        }
    }

    ...
}
```
但是这样会编译不过：
> Fragments should be static such that they can be re-instantiated by the system, and anonymous classes are not static.

然后加上``@SuppressLint("ValidFragment")``注解，可以编译过了，但是运行的时候仍然报错。
> Fragment null must be a public static class to be  properly recreated from instance state.

异常是在``BackStackRecord.doAddOp()``抛出的，看到源码：
```
private void doAddOp(int containerViewId, Fragment fragment, String tag, int opcmd) {
    final Class fragmentClass = fragment.getClass();
    final int modifiers = fragmentClass.getModifiers();
    if (fragmentClass.isAnonymousClass() || !Modifier.isPublic(modifiers)
            || (fragmentClass.isMemberClass() && !Modifier.isStatic(modifiers))) {
        throw new IllegalStateException("Fragment " + fragmentClass.getCanonicalName()
                + " must be a public static class to be  properly recreated from"
                + " instance state.");
    }

    fragment.mFragmentManager = mManager;

    if (tag != null) {
        if (fragment.mTag != null && !tag.equals(fragment.mTag)) {
            throw new IllegalStateException("Can't change tag of fragment "
                    + fragment + ": was " + fragment.mTag
                    + " now " + tag);
        }
        fragment.mTag = tag;
    }

    if (containerViewId != 0) {
        if (containerViewId == View.NO_ID) {
            throw new IllegalArgumentException("Can't add fragment "
                    + fragment + " with tag " + tag + " to container view with no id");
        }
        if (fragment.mFragmentId != 0 && fragment.mFragmentId != containerViewId) {
            throw new IllegalStateException("Can't change container ID of fragment "
                    + fragment + ": was " + fragment.mFragmentId
                    + " now " + containerViewId);
        }
        fragment.mContainerId = fragment.mFragmentId = containerViewId;
    }

    addOp(new Op(opcmd, fragment));
}
```
抛出异常的 3 个条件：
1. 匿名类
2. 访问域不是 Public
3. 是 成员类，但是访问域不是 Static

抛出来的异常也很明显了：Fragment 必须 public static 的类，以便系统可以用初始状态重建。这也和 Fragment newIntance 使用 setArguments 不谋而合。
```
public static MyFragment newInstance() {
    MyFragment fragment = new MyFragment(String param1, String param2);
    Bundle args = new Bundle();
    args.putString(ARG_PARAM1, param1);
    args.putString(ARG_PARAM2, param2);
    fragment.setArguments(args);
    return fragment;
}
```
Fragmnet 经常会被销毁重新实例化，Android Framework 只会调用 Fragment 无参的构造函数。如果直接将参数放到构造函数里，那么 Framework 在重建 Fragment 就会丢失这些参数了。
再看下 Fragment 的实例化：
```
public static Fragment instantiate(Context context, String fname, @Nullable Bundle args) {
    try {
        Class<?> clazz = sClassMap.get(fname);
        if (clazz == null) {
            // Class not found in the cache, see if it's real, and try to add it
            clazz = context.getClassLoader().loadClass(fname);
            sClassMap.put(fname, clazz);
        }
        Fragment f = (Fragment) clazz.getConstructor().newInstance();
        if (args != null) {
            args.setClassLoader(f.getClass().getClassLoader());
            f.setArguments(args);
        }
        return f;
    } catch (ClassNotFoundException e) {
        throw new InstantiationException("Unable to instantiate fragment " + fname
                + ": make sure class name exists, is public, and has an"
                + " empty constructor that is public", e);
    } catch (java.lang.InstantiationException e) {
        throw new InstantiationException("Unable to instantiate fragment " + fname
                + ": make sure class name exists, is public, and has an"
                + " empty constructor that is public", e);
    } catch (IllegalAccessException e) {
        throw new InstantiationException("Unable to instantiate fragment " + fname
                + ": make sure class name exists, is public, and has an"
                + " empty constructor that is public", e);
    } catch (NoSuchMethodException e) {
        throw new InstantiationException("Unable to instantiate fragment " + fname
                + ": could not find Fragment constructor", e);
    } catch (InvocationTargetException e) {
        throw new InstantiationException("Unable to instantiate fragment " + fname
                + ": calling Fragment constructor caused an exception", e);
    }
}
```
看吧，很清晰了，用的反射取到默认的构造函数，然后创建实例，使用 setArguments 设置参数。
小结一下：
1. 不能使用匿名 Fragment
2. 不能使用非 public static 的 Fragment
3. 参数传递使用 setArguments

那么再回到题头：基类已经有了，怎么样减少类的创建呢？不想再写多个子类。
我的方法是：写一个通用类，在 Fragment 创建后，setAction 来设置 getData 操作。
```
class CommonListFragment : BaseFragment<MyData>() {

    private var getData: (() -> MutableList<MyData>)? = null

    override fun requestHttpData(pageModel: PageModel?): MutableList<MyData>? {
        return getData?.invoke()
    }

    fun setAction(action: () -> MutableList<MyData>) {
        getData = action
    }
}
```

## 题外话
遇到 Activity 后台被杀，然后自动重建的问题。
```
class DetailActivity : BaseActivity() {

    private var fragment: DetailFragment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.fragment_container_activity)
        try {
            val bundle = savedInstanceState ?: intent.extras
            val showShareGuide = bundle.getBoolean(KEY_SHOW_SHARE_GUIDE, false)
            fragment = DetailFragment.newInstance(showShareGuide)
            supportFragmentManager.beginTransaction().replace(R.id.container, fragment).commit()
        } catch (e: Exception) {
            ToastUtils.toast(e.message)
            finish()
        }
    }

    override fun onSaveInstanceState(outState: Bundle?) {
        super.onSaveInstanceState(fragment?.arguments)
    }
}
```
通过 setArguments 设置 KEY_SHOW_SHARE_GUIDE 参数到 DetailFragment，然后操作界面后把 KEY_SHOW_SHARE_GUIDE 从 true 置为了 false。App 进入后台被杀之后，重建回来的 KEY_SHOW_SHARE_GUIDE 会还是 true。
将 onSaveInstanceState 改为如下，问题解决。
```
override fun onSaveInstanceState(outState: Bundle?) {
    outState?.putBoolean(KEY_SHOW_SHARE_GUIDE, fragment?.arguments?.getBoolean(KEY_SHOW_SHARE_GUIDE) ?: false)
    super.onSaveInstanceState(outState)
}
```