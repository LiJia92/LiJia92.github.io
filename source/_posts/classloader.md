---
title: Android 中的 ClassLoader
date: 2017-10-19 19:26:14
tags:
 - code
---
今天发现了一个在对象序列化时的错误。
```
 E/Parcel: Class not found when unmarshalling: com.lijia.study.InventoryDetail
 java.lang.ClassNotFoundException: com.lijia.study.InventoryDetail
     at java.lang.Class.classForName(Native Method)
     at java.lang.Class.forName(Class.java:309)
     at android.os.Parcel.readParcelableCreator(Parcel.java:2281)
     at android.os.Parcel.readParcelable(Parcel.java:2245)
     at android.os.Parcel.readValue(Parcel.java:2152)
     at android.os.Parcel.readMapInternal(Parcel.java:2468)
     at android.os.Parcel.readHashMap(Parcel.java:1678)
     at android.os.Parcel.readParcelable(Parcel.java:2252)
     at android.os.Parcel.readValue(Parcel.java:2152)
     at android.os.Parcel.readArrayMapInternal(Parcel.java:2485)
     at android.os.BaseBundle.unparcel(BaseBundle.java:221)
     at android.os.Bundle.getParcelable(Bundle.java:755)
     at android.content.Intent.getParcelableExtra(Intent.java:5088)
     ...
  Caused by: java.lang.ClassNotFoundException: com.lijia.study.InventoryDetail
     at java.lang.Class.classForName(Native Method)
     at java.lang.BootClassLoader.findClass(ClassLoader.java:781)
     at java.lang.BootClassLoader.loadClass(ClassLoader.java:841)
     at java.lang.ClassLoader.loadClass(ClassLoader.java:469)
     at java.lang.Class.classForName(Native Method) 
     at java.lang.Class.forName(Class.java:309) 
     at android.os.Parcel.readParcelableCreator(Parcel.java:2281) 
     at android.os.Parcel.readParcelable(Parcel.java:2245) 
     at android.os.Parcel.readValue(Parcel.java:2152) 
     at android.os.Parcel.readMapInternal(Parcel.java:2468) 
     at android.os.Parcel.readHashMap(Parcel.java:1678)
     at android.os.Parcel.readParcelable(Parcel.java:2252) 
     at android.os.Parcel.readValue(Parcel.java:2152) 
     at android.os.Parcel.readArrayMapInternal(Parcel.java:2485) 
     at android.os.BaseBundle.unparcel(BaseBundle.java:221) 
     at android.os.Bundle.getParcelable(Bundle.java:755) 
     at android.content.Intent.getParcelableExtra(Intent.java:5088) 
     ...
  Caused by: java.lang.NoClassDefFoundError: Class not found using the boot class loader; no stack available
```
<!-- more -->

日志只截取了核心的部分，意思说得很明显了，无法找到类``InventoryDetail``进行序列化。最后定位错误为使用``InventoryDetail``类作为``HashMap的Value``，进行序列化失败。看下使用类：
```
public class ChooseProductItem implements Parcelable {
    public SkuBean productSkuBean;
    public Product product;
    public double stock = 0D;

    public HashMap<String, Double> chooseCountMap = new HashMap<>();
    public HashMap<String, Double> stockMap = new HashMap<>();

    // 重点
    public HashMap<String, InventoryDetail> inventoryMap = new HashMap<>();

    public HashMap<String, List<CountingTransaction>> countTransMap = new HashMap<>();

    public ArrayList<Manifest.ManifestTransaction> transactionList = new ArrayList<>();

    private String productNamePinyinFirstWords;

    public ChooseProductItem(Product product) {
        this.product = product;
    }

    @Override
    public int describeContents() {

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeParcelable(productSkuBean, flags);
        dest.writeParcelable(this.product, 0);
        dest.writeDouble(this.stock);
        dest.writeMap(chooseCountMap);
        dest.writeMap(stockMap);
        dest.writeMap(inventoryMap);
        dest.writeMap(countTransMap);
        dest.writeList(transactionList);
    }

    protected ChooseProductItem(Parcel in) {
        this.productSkuBean = in.readParcelable(SkuBean.class.getClassLoader());
        this.product = in.readParcelable(Product.class.getClassLoader());
        this.stock = in.readDouble();
        this.chooseCountMap = in.readHashMap(HashMap.class.getClassLoader());
        this.stockMap = in.readHashMap(HashMap.class.getClassLoader());
        this.inventoryMap = in.readHashMap(HashMap.class.getClassLoader());
        this.countTransMap = in.readHashMap(CountingTransaction.class.getClassLoader());
        this.transactionList = in.readArrayList(Manifest.ManifestTransaction.class.getClassLoader());
    }

    public static final Creator<ChooseProductItem> CREATOR = new Creator<ChooseProductItem>() {
        public ChooseProductItem createFromParcel(Parcel source) {
            return new ChooseProductItem(source);
        }

        public ChooseProductItem[] newArray(int size) {
            return new ChooseProductItem[size];
        }
    };
}
```
最后错误定位到：
```
this.inventoryMap = in.readHashMap(HashMap.class.getClassLoader());
```
这里在读取 HashMap 的时候找不到类，导致序列化失败。

这里先讲述一下 ClassLoader。Android 中的 ClassLoader 类型分为两种类型，分别是系统 ClassLoader 和自定义 ClassLoader 。其中系统 ClassLoader 包括三种分别是 BootClassLoader、PathClassLoader 和 DexClassLoader。
1. BootClassLoader：Android 系统启动时会使用 BootClassLoader 来预加载常用类。BootClassLoader 是一个单例类，需要注意的是 BootClassLoader 的访问修饰符是默认的，只有在同一个包中才可以访问，因此我们在应用程序中是无法直接调用的。
2. PathClassLoader：Android 系统使用 PathClassLoader 来加载系统类和应用程序的类，如果是加载非系统应用程序类，则会加载data/app/目录下的dex文件以及包含dex的apk文件或jar文件，不管是加载哪种文件，最终都是要加载dex文件，在这里为了方便理解，我们将dex文件以及包含dex的apk文件或jar文件统称为dex相关文件。PathClassLoader 不建议开发直接使用。
3. DexClassLoader：DexClassLoader 可以加载dex文件以及包含dex的apk文件或jar文件，也支持从SD卡进行加载，这也就意味着 DexClassLoader 可以在应用未安装的情况下加载dex相关文件。因此，它是热修复和插件化技术的基础。

现在回过头来看之前的代码：
```
public HashMap<String, InventoryDetail> inventoryMap = new HashMap<>();

...

this.inventoryMap = in.readHashMap(HashMap.class.getClassLoader());
```
``readHashMap``传入的参数是ClassLoader，我传入的是``HashMap.class.getClassLoader()``，HashMap 作为系统自带常用类，是由``BootClassLoader``进行加载的，而我应用自己编写的类``InventoryDetail``是由``PathClassLoader``进行加载的。那么显然，在``BootClassLoader``中找由``PathClassLoader``加载的类显然是找不到的，便会报错了。可以看到``chooseCountMap、stockMap``传入的也是``HashMap.class.getClassLoader()``，因为其 Value 类型为 Double，也是系统常用类，也是由``BootClassLoader``进行加载的，所以不会有问题。以后在涉及到 ClassLoader 的时候可要细心点了。
这里简单验证一下：
```
ClassLoader classLoader1 = Double.class.getClassLoader();
ClassLoader classLoader2 = HashMap.class.getClassLoader();
ClassLoader classLoader3 = MyClass.class.getClassLoader();

Log.e("TAG", classLoader1.toString());
Log.e("TAG", classLoader2.toString());
Log.e("TAG", classLoader3.toString());

...

10-19 20:07:49.659 16333-16333/? E/TAG: java.lang.BootClassLoader@212c4b0d
10-19 20:07:49.659 16333-16333/? E/TAG: java.lang.BootClassLoader@212c4b0d
10-19 20:07:49.659 16333-16333/? E/TAG: dalvik.system.PathClassLoader[DexPathList[[zip file "/data/app/com.study.lijia.myapplication-2/base.apk"],nativeLibraryDirectories=[/vendor/lib, /system/lib]]]
```
很显然了。

另外说下，ArrayList 在序列化的时候可以直接使用：
```
this.transactionList = in.createTypedArrayList(Manifest.ManifestTransaction.CREATOR);
```
可以消除``Unchecked assignment: 'java.util.ArrayList' to 'java.util.ArrayList<xxx.Manifest.ManifestTransaction>'``的警告，只不过使用``createTypedArrayList``时 List 需要显示定义成 ArrayList。

> [Android解析ClassLoader（二）Android中的ClassLoader](https://juejin.im/post/59e73b3cf265da432e5b1b29)
