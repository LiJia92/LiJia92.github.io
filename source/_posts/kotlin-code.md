---
title: Kotlin - 代码篇
date: 2017-12-21 11:15:32
tags:
 - Android 进阶
---
写过几个星期的 Kotlin 代码了，再也不用 findViewById 了，使用起来稍微简洁一点。今天小结一下，基础用法就不多说了，直接写几点我感触较深的。

## 空安全
当使用Java开发的时候，我们的代码大多是防御性的。如果我们不想遇到 NullPointerException，我们就需要在使用它之前不停地去判断它是否为 null。Kotlin，则是空安全的，我们可以通过一个安全调用操作符 (写做 ? )来明确地指定一个对象是否能为空。
```
// 这里不能通过编译. Artist 不能是 null
var notNullArtist: Artist = null
// Artist 可以是 null
var artist: Artist? = null
// 无法编译, artist可能是 null,我们需要进行处理
artist.print()
// 只要在artist != null时才会打印
artist?.print()
// 智能转换. 如果我们在之前进行了空检查,则不需要使用安全调用操作符调用
if (artist != null) {
  artist.print()
}
// 只有在确保 artist 不是 null 的情况下才能这么调用，否则它会抛出异常
artist!!.print()
// 使用 Elvis操作符 来给定一个在是 null 的情况下的替代值
val name = artist?.name ?: "empty"
```
关于 Elvis操作符 其实是三目条件运算符的简略写法。可以这样理解：
1. A ?: B 等价于 if(A == null) B
2. A?.B ?: C 等价于 if(A != null) A.B else C

<!-- more -->

## 变量
所有的变量都需要由 val 或 var 来修饰，val 代表不可变变量，初始化后无法被修改，而 var 代表可变变量，后面允许被修改。在 Kotlin 中，一个非抽象的属性在构造函数执行完之前需要被赋值，如果声明的时候带上了 ? 表示可以为空，那么之后使用时就得各种``?``或``!!``操作符了，极其不便。很多时候，我们的赋值肯定不为空，但是依赖 Activity 或 Fragment 等 Android 组件的生命周期，无法直接赋值。这个时候有 2 种做法：
1. 使用 **lazyinit**：
```
private lateinit var tableRegionAdapter: CommonMetaAdapter

onCreate(){
  ...
  // 进行初始化
  tableRegionAdapter = CommonMetaAdapter(mActivity)
}
```
``lateinit``修饰符所修饰的属性必须是非空类型，而且不能是原生类型（Int、Float、Char等），而且该修饰符只能用于类体中，不能在主构造函数中，也不能修饰局部变量，并且只可用于 var 类型变量。
2. **by lazy**：
```
private val menus: Array<String> by lazy { arrayOf(MENU_PRINT_MANAGE) }
```
``by lazy``是使用了属性委托的方式，来实现懒初始化，用于修饰 val 变量。只会在第一次调用的时候进行初始化，后续调用时直接返回同样的值。当变量仅仅初始化一次并且全局共享，且更多的是内部使用时应该使用这种模式。属性委托中还有一种声明非空属性的方法：
```
private val menus by Delegates.notNull<Array<String>>()
```
利用``Delegates.notNull``可直接声明非空变量，并在其他地方进行初始化。关于属性委托的更多信息，请参考[委托属性](https://www.kotlincn.net/docs/reference/delegated-properties.html)。
**注意：val 修饰的变量并不代表就是常量**，具体请参考[Kotlin中常量的探究](http://droidyue.com/blog/2017/11/05/dive-into-kotlin-constants/index.html)。

## 静态方法
之前的 Java 代码使用 Activity 跳转的时候经常在目标 Activity 中定义 navigateTo 方法，就像这样：
```
public class DeliverActivity extends AppBarActivity {

    public static final String EXTRA_KEY_MANIFEST = "extra.manifest";

    public static void navigateToForResult(Fragment fragment, int requestCode, Manifest manifest) {
        Intent intent = new Intent(fragment.getActivity(), DeliverActivity.class);
        intent.putExtra(EXTRA_KEY_MANIFEST, manifest);
        fragment.startActivityForResult(intent, requestCode);
    }
}
```
这样我们定义的 EXTRA_KEY_MANIFEST 设为 private，只有 DeliverActivity 类能使用，避免定义成 public 影响到其他类。所有的变量都是内部消化，跳转时不用进行拷贝。
而 Kotlin 中没有静态方法这一说，可以使用 伴生对象 来实现静态：
> Kotlin允许我们去定义一些行为与静态对象一样的对象。尽管这些对象可以用众所周知的模式来实现，比如容易实现的单例模式。我们需要一个类里面有一些静态的属性、常量或者函数，我们可以使用 companion object。这个对象被这个类的所有对象所共享，就像Java中的静态属性或者方法。

使用起来就是这样：
```
class ChooseDiningTableActivity : AppBarActivity() {

    companion object StaticDiningTable {

        val EXTRA_RESULT = "extra.result"
        private val EXTRA_TABLE_LIST = "extra.tableList"
        private val EXTRA_TABLE_REGION_LIST = "extra.tableRegionList"
        private val EXTRA_PEOPLE_COUNT = "extra.peopleCount"

        fun navigateTo(fragment: BaseFragment, requestCode: Int, tableList: ArrayList<DiningTable>, tableTypeList: ArrayList<TableRegion>, peopleCount: Int) {
            val intent = Intent(fragment.context, ChooseDiningTableActivity::class.java)
            intent.putExtra(EXTRA_TABLE_LIST, tableList)
            intent.putExtra(EXTRA_TABLE_REGION_LIST, tableTypeList)
            intent.putExtra(EXTRA_PEOPLE_COUNT, peopleCount)
            fragment.startActivityForResult(intent, requestCode)
        }
    }
}

// 使用跟 Java 调用静态方法一样
ChooseDiningTableActivity.navigateTo(this, REQUEST_CODE_FOR_CHOOSE_TABLE, diningTableList, tableTypeList, item.customerNumber)
```

## 高阶函数
高阶函数是将函数用作参数或返回值的函数，就有点像 c++ 中的函数指针。当你提供一个方法，方法执行完之后接收一个回调，然后执行回调中的方法，这种场景想必大家都遇到过。一般就是定义一个接口，然后传入一个接口实现类进去，就像 setOnClickListener 一样。但是高阶函数就省去了接口这一步，直接传入一个函数作为参数，进行回调。举个栗子：
```
public inline fun <T, R, C : MutableCollection<in R>> Iterable<T>.mapTo(destination: C, transform: (T) -> R): C {
    for (item in this)
        destination.add(transform(item))
    return destination
}
```
使用时：
```
override fun showTableRegions(tableRegionList: MutableList<TableRegion>) {
    val allRegion = CommonMetaBean()
    allRegion.name = ALL_TABLE_REGION

    val list = ArrayList<CommonMetaBean>()
    list.add(allRegion)

    tableRegionList.mapTo(list) { CommonMetaBean(it.regionID, it.regionName) }
    tableRegionAdapter.setDataList(list)
    tableRegionAdapter.notifyDataSetChanged()
}
```
集合操作符 mapTo 接收一个函数 transform 作为参数，将自身的 item 转化为另外一个对象，然后 add 到 destination 目标集合中。
一个有用的约定：**如果函数字面值只有一个参数， 那么它的声明可以省略（连同 ->），其名称是 it。** 就像我实例中的代码一样。
再举个很实用的例子：列表定义 Adapter，如果有点击事件，我们一般会在 Adapter 中定义一个接口，然后在 Adapter 初始化的时候传入接口的实现类，就像这样：
```
class Adapter extends BaseAdapter {

    public Adapter(Context context, OnFunctionClickListener listener) {
        mListener = listener;
    }

    public View getView(int position, View convertView, ViewGroup parent) {
        holder.moreIv.setOnClickListener(v -> {
            if (mListener != null) {
                mListener.onFunctionClick(data);
            }
        });
    }

    public interface OnFunctionClickListener {
        onFunctionClick(Object obj);
    }
}
```
当使用 Kotlin 之后，我们可以直接忽略接口的定义，直接传入一个匿名函数，就可以实现这样的功能了，简单很多，就像这样：
```
class LogTimeAdapter(private val context: Context, dataList: ArrayList<TimeBean>, private val onClick: (TimeBean) -> Unit)
    : RecyclerView.Adapter<LogTimeAdapter.ViewHolder>() {

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val timeBean = dataList[position]
        val timeDesc = DateUtils.getDateString(timeBean.beginTime.toInt()) + " 至 " + DateUtils.getDateString(timeBean.endTime.toInt())
        with(holder.itemView) {
            // 注意这里，onClick 是在构造函数中直接传入的匿名函数，省去了接口的定义
            setOnClickListener {
                onClick(timeBean)
            }
        }
    }

    override fun getItemCount(): Int = dataList.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView)
}
```

## lambda
Kotlin 的使用是离不开 lambda 表达式的。最典型的例子：
```
view.setOnClickListener() { toast("Hello world!") }
```
请注意，如果 lambda 是该调用的唯一参数，则调用中的圆括号可以完全省略：
```
view.setOnClickListener { toast("Hello world!") }
```
如果 lambda 表达式的参数未使用，那么可以用下划线取代其名称：
```
map.forEach { _, value -> println("$value!") }
```
关于 lambda 一个简短的概述：
1. lambda 表达式总是被大括号括着；
2. 其参数（如果有的话）在 -> 之前声明（参数类型可以省略）；
3. 函数体（如果存在的话）在 -> 后面。

如果推断出的该 lambda 的返回类型不是 Unit，那么该 lambda 主体中的最后一个（或可能是单个）表达式会视为返回值。因此，下两个片段是等价的：
```
ints.filter {
    val shouldFilter = it > 0
    shouldFilter
}

ints.filter {
    val shouldFilter = it > 0
    return@filter shouldFilter
}
```

## 其他
1. 默认任何类都是基础继承自 Any (与java中的 Object 类似)，但是我们可以继承其它类。所有的类默认都是不可继承的(final)，所以我们只能继承那些明确声明 open 或者 abstract 的类:
```
open class Animal(name: String)
class Person(name: String, surname: String) : Animal(name)
```
2. 拓展函数：
```
fun Fragment.toast(message: CharSequence, duration: Int = Toast.LENGTH_SHORT) {
    Toast.makeText(getActivity(), message, duration).show()
}

fragment.toast("Hello world!")
```
扩展函数并不是真正地修改了原来的类，它是以静态导入的方式来实现的。扩展函数可以被声明在任何文件中，因此有个通用的实践是把一系列有关的函数放在一个新建的文件里。
3. 集合操作符：forEach、max、filter、mapTo等等，Kotlin 中的集合为我们提供了很多的操作符，但是你大可不必去背它。当我们用 Java 写出一些集合操作的代码时， Android Studio 会智能识别我们的代码，然后提示可以被哪些操作符给替代，这个时候转一下就好了。
4. 其他操作符：Kotlin 还提供了很多其他的操作符，let、with、apply等等，这些操作符都可以简化我们的代码。
