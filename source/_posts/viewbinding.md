---
title: viewBinding 使用小结
date: 2020-07-21 16:28:57
tags:
 - 日常开发
---
> 通过视图绑定功能，您可以更轻松地编写可与视图交互的代码。在模块中启用视图绑定之后，系统会为该模块中的每个 XML 布局文件生成一个绑定类。绑定类的实例包含对在相应布局中具有 ID 的所有视图的直接引用。
在大多数情况下，视图绑定会替代 findViewById。

## 启用
只能在 Android Studio 3.6 Canary 11 及更高版本中使用。
```
android {
    ...
    viewBinding {
        enabled = true
    }
}
```
启用后，会根据 xml 名称生成一个驼峰命名，结尾带上 Binding 的绑定类。例如：result_profile.xml，会生成 ResultProfileBinding 的绑定类，这个绑定类 getRoot 方法返回根布局，xml 中所有有 id 的 View 也能通过此类直接获取。相比于 kotlin-android-extensions，它**不会空指针，并且 id 唯一**。kotlin-android-extensions 直接获取对应 id 的 view 有可能导致空指针。另一点，如果我们很多 xml 里的 id 有一样的命名，会很难区分。且如果一个页面引用了 2 个 xml，这 2 个 xml 里是不能使用同样的 id 的，编译器会不知道要去找哪个 id 从而报错，而使用 viewBinding 这些便都解决了。

<!-- more -->

当然，或许某些时候，我们不需要生成绑定类，那么可以在布局根节点，添加``tools:viewBindingIgnore="true"``即可：
```
<LinearLayout
    ...
    tools:viewBindingIgnore="true" >
    ...
</LinearLayout>
```
在 Activity 中可以这样使用 viewBinding：
```
private lateinit var binding: ResultProfileBinding

override fun onCreate(savedInstanceState: Bundle) {
    super.onCreate(savedInstanceState)
    binding = ResultProfileBinding.inflate(layoutInflater)
    val view = binding.root
    setContentView(view)
}
```
## 封装 Base
那么基于 viewBinding 如何封装 Base 呢？写一下封装高德地图 RouteBaseMapFragment：
```
abstract class RouteBaseMapFragment<VB : ViewBinding> : BaseFragment(), DefaultLocationListener {

    protected lateinit var viewBinding: VB
    protected var needLocate = false
    private lateinit var map: AMap
    private var polyline: Polyline? = null
    private var myLocationMark: MyLocationMark? = null
    private var markerList = mutableListOf<Marker>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = initViewBinding(inflater, container)
        initViewModel()
        initView()
        myLocationMark = MyLocationMark(map)
        return view
    }

    @Suppress("UNCHECKED_CAST")
    private fun initViewBinding(inflater: LayoutInflater, container: ViewGroup?): View {
        val type = javaClass.genericSuperclass
        val clazz = (type as ParameterizedType).actualTypeArguments[0] as Class<VB>
        val method = clazz.getMethod(
            "inflate",
            LayoutInflater::class.java,
            ViewGroup::class.java,
            Boolean::class.java
        )
        viewBinding = method.invoke(null, inflater, container, false) as VB
        return viewBinding.root
    }

    abstract fun getMap(): AMap

    open fun getMapView(): MapView? {
        return null
    }

    open fun getTextureMapView(): TextureMapView? {
        return null
    }

    open fun initViewModel() {}

    open fun initView() {
        getMapView()?.onCreate(null)
        getTextureMapView()?.onCreate(null)
        map = getMap()
        map.showBuildings(false)
        map.showIndoorMap(false)
        map.showMapText(false)
        val uiSettings = map.uiSettings
        uiSettings.isTiltGesturesEnabled = false
        uiSettings.isScaleControlsEnabled = true
        uiSettings.isGestureScaleByMapCenter = true
        uiSettings.isZoomControlsEnabled = false
        map.animateCamera(CameraUpdateFactory.zoomTo(18f))
    }

    protected fun drawRouteLine(nodeList: List<RouteNode>, animate: Boolean = false) {
        polyline?.remove()
        val latLngList: MutableList<LatLng> = ArrayList()
        nodeList.forEach {
            latLngList.add(LatLng(it.lat, it.lon).toGCJPoint())
        }
        polyline = map.addPolyline(
            PolylineOptions().addAll(latLngList).width(10f).color(Color.parseColor("#FF7D3C"))
        )
        if (animate) {
            val boundsBuilder = LatLngBounds.Builder()
            latLngList.forEach {
                boundsBuilder.include(it)
            }
            val cameraUpdate = CameraUpdateFactory.newLatLngBoundsRect(
                boundsBuilder.build(),
                50, 20, 50, 20
            )
            map.animateCamera(cameraUpdate)
        }
    }

    protected fun clearMarker() {
        markerList.forEach { it.remove() }
        markerList.clear()
    }

    protected fun drawMark(node: RouteNode) {
        val view = PointMarkView(context, null)
        view.setData(node)
        val markerOptions = MarkerOptions()
        markerOptions.anchor(0.5f, 0.8f)
        markerOptions.position(LatLng(node.lat, node.lon).toGCJPoint())
        markerOptions.icon(BitmapDescriptorFactory.fromView(view))
        markerList.add(map.addMarker(markerOptions))
    }

    private fun drawMyLocation(location: Location) {
        if (needLocate) {
            myLocationMark?.onLocationChange(location)
        }
    }

    override fun onLocationChanged(location: Location) {
        drawMyLocation(location)
    }

    override fun onResume() {
        super.onResume()
        JLocationManager.addListener(this)
        getMapView()?.onResume()
        getTextureMapView()?.onResume()
    }

    override fun onPause() {
        super.onPause()
        JLocationManager.removeListener(this)
        getMapView()?.onPause()
        getTextureMapView()?.onPause()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        getMapView()?.onDestroy()
        getTextureMapView()?.onDestroy()
        myLocationMark?.onDestroy()
    }
}
```
viewBinding 生成绑定类对应的基类是 ViewBinding，所以以此写相应的泛型即可。

## 封装 Multi-Type ItemBinder
项目中使用了 Multi-Type，每实现一个 ItemBinder，都需要实现 2 个方法：onCreateViewHolder、onBindViewHolder。那么结合 ViewBinding 就可以考虑将 onCreateViewHolder 给抽掉：
```
@RestrictTo(RestrictTo.Scope.LIBRARY)
abstract class ViewBindingBinder<T, VB : ViewBinding> : ItemViewBinder<T, ViewBindingHolder<VB>>(),
    WithViewBinding<VB> {

    @NonNull
    override fun onCreateViewHolder(
        @NonNull inflater: LayoutInflater,
        @NonNull parent: ViewGroup
    ): ViewBindingHolder<VB> {
        val viewBinding: VB = onCreateViewBinding(javaClass, inflater, parent)
        return ViewBindingHolder(viewBinding)
    }

}

@RestrictTo(RestrictTo.Scope.LIBRARY)
class ViewBindingHolder<T : ViewBinding?>(val viewBinding: T) :
    RecyclerView.ViewHolder(viewBinding!!.root)

@RestrictTo(RestrictTo.Scope.LIBRARY)
interface WithViewBinding<VB : ViewBinding?> {
    fun onCreateViewBinding(
        clz: Class<*>,
        inflater: LayoutInflater,
        @Nullable container: ViewGroup?
    ): VB {
        return ViewBindingCreator<VB>().onCreateView(clz, inflater, container)
    }
}

@Suppress("UNCHECKED_CAST")
@RestrictTo(RestrictTo.Scope.LIBRARY)
class ViewBindingCreator<VB : ViewBinding?> {
    fun onCreateView(clz: Class<*>, inflater: LayoutInflater, container: ViewGroup?): VB {
        return try {
            val viewBindingType = getViewBindingType(clz)
            val inflateMethod: Method = viewBindingType
                .getDeclaredMethod(
                    "inflate",
                    LayoutInflater::class.java,
                    ViewGroup::class.java,
                    Boolean::class.javaPrimitiveType
                )
            inflateMethod.invoke(null, inflater, container, false) as VB
        } catch (e: Exception) {
            throw IllegalStateException("创建ViewBinding失败", e)
        }
    }

    private fun getViewBindingType(clzParam: Class<*>): Class<*> {
        var clz = clzParam
        var genericType: Type? = clz.genericSuperclass
        while (genericType !is ParameterizedType) {
            clz = clz.superclass
            if (clz == null) {
                genericType = null
                break
            }
            genericType = clz.genericSuperclass
        }
        checkNotNull(genericType) { "找不到ViewBinding Type" }
        val actualTypeArguments: Array<Type> =
            (genericType as ParameterizedType).actualTypeArguments
        if (actualTypeArguments.isNotEmpty()) {
            for (type in actualTypeArguments) {
                if (type is Class<*>) {
                    if (ViewBinding::class.java.isAssignableFrom(type)) {
                        return type
                    }
                }
            }
        }
        throw IllegalStateException("找不到ViewBinding Type")
    }
}
```
看一下 2 个 Base 封装，都是用 VB : ViewBinding 通过反射来找到相应的类，手动调用 inflate 方法即可。