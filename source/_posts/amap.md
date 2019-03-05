---
title: Android 高德地图 SDK 使用小记
date: 2018-12-21 13:47:30
tags:
 - sdk
---
最近的项目是基于高德地图 SDK 来实现的，使用中有一些值得记录的 Tip，便有了这篇博客。

## Logo
使用高德地图 SDK，是不能去掉「高德地图」 Logo的，只能设置它显示的位置。
```
mapView.getMap().getUiSettings().setLogoPosition(position);
```
position：位置参数。屏幕左下角：AMapOptions.LOGO_POSITION_BOTTOM_LEFT；底部居中：AMapOptions.LOGO_POSITION_BOTTOM_CENTER；右下：AMapOptions.LOGO_MARGIN_RIGHT。
如果想要隐藏 Logo，可以使用如下代码：
```
mapView.getMap().getUiSettings().setLogoBottomMargin(-50);
```
设置负值可以让 Logo 显示在屏幕之外。

<!-- more -->

## 刻度尺
显示刻度尺：
```
mapView.getMap().getUiSettings().setScaleControlsEnabled(true);
```
刻度尺的位置是在「高德地图」 Logo 的上面的，可以通过设置 Logo 来改变刻度尺的位置，也可以通过如下代码来设置刻度尺的位置：
```
/**
 * 调整地图比例尺的位置
 *
 * @param translationX 正数往右移，负数往左移
 * @param translationY 正数往下移，负数往上移
 */
public void changeScaleControlsPosition(float translationX, float translationY) {
    View mapViewChild = mapView.getChildAt(0);
    if (mapViewChild instanceof ViewGroup) {
        View scaleView = ((ViewGroup) mapViewChild).getChildAt(3);
        scaleView.setTranslationX(translationX);
        scaleView.setTranslationY(translationY);
    }
}
```
代码中的**0**、**3**都是硬编码，升级 SDK 时需要兼容测试。

## Polyline 与底图之间加蒙层
需求是这样的：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/%E6%88%AA%E5%9B%BE%20%281%29.png)
绘制的 Ployline、Marker 与底图之间有个蒙层，如何来实现？翻到[一篇文章](https://www.jianshu.com/p/4c851ddc78a3?tdsourcetag=s_pctim_aiomsg)写了高德地图覆盖物的层级压盖关系：
> 1、基础底图（包括底图、底图道路、卫星图等）；
2、地形图图层（GroundOverlay）；
3、热力图图层（HeatMap）；
4、实时路况图图层（BaiduMap.setTrafficEnabled(true);）；
5、百度城市热力图（BaiduMap.setBaiduHeatMapEnabled(true);）；
6、底图标注（指的是底图上面自带的那些POI元素）；
7、几何图形图层（点、折线、弧线、圆、多边形）；
8、标注图层（Marker），文字绘制图层（Text）；
9、指南针图层（当地图发生旋转和视角变化时，默认出现在左上角的指南针）；
10、定位图层（BaiduMap.setMyLocationEnabled(true);）；
11、弹出窗图层（InfoWindow）；
12、自定义View（MapView.addView(View);）；

所以，在底图和几何图层图层、标注图层之间，还可以使用``GroundOverlay``。所以可以使用如下代码添加中间图层以达到某些显示效果：
```
val view = View(context)
view.layoutParams = FrameLayout.LayoutParams(1, 1)
view.setBackgroundColor(Color.parseColor("#C1000000"))
val options = GroundOverlayOptions()
options.image(BitmapDescriptorFactory.fromView(view))
options.positionFromBounds(aMap.projection.visibleRegion.latLngBounds)
options.zIndex(1F)
aMap.addGroundOverlay(options)
```

## 地图显示所有的元素
地图默认显示北京，当我们绘制了 Polyline 或者 Marker，想让地图全部显示全的时候，可以使用如下代码：
```
val boundsBuilder = LatLngBounds.Builder()
for (i in 0 until markers.size()) {
    boundsBuilder.include(markers.get(i).getPosition())
}
aMap.animateCamera(CameraUpdateFactory.newLatLngBounds(boundsBuilder.build(), 15)) // 第二个参数为四周留空宽度
```
也可以使用``newLatLngBoundsRect(LatLngBounds latlngbounds, int paddingLeft, int paddingRight, int paddingTop, int paddingBottom)``方法，分别来设置四周的留空宽度。

## 多"InfoWindow"展示
高德地图 Marker 可绑定一个 Infowindow，但是全局只能有一个 Infowindow 显示，所以如果要展示多个 Infowindow，只能使用其他方式。
给 Marker 设置 icon，有个工厂类``BitmapDescriptorFactory``来提供。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/%E6%88%AA%E5%9B%BE%20%282%29.png)
所以可以自己填充 View，然后通过 fromView 设置到 Marker 上。看到 fromView 的源码：
```
public static BitmapDescriptor fromView(View var0) {
    try {
        Context var1 = s.a;
        if (var1 != null) {
            FrameLayout var2 = new FrameLayout(var1);
            var2.addView(var0);
            var2.setDrawingCacheEnabled(true);
            Bitmap var3 = ev.a(var2);
            BitmapDescriptor var4 = fromBitmap(var3);
            return var4;
        } else {
            return null;
        }
    } catch (Throwable var5) {
        return null;
    }
}

public static Bitmap a(View var0) {
    try {
        b(var0);
        var0.destroyDrawingCache();
        var0.measure(MeasureSpec.makeMeasureSpec(0, 0), MeasureSpec.makeMeasureSpec(0, 0));
        var0.layout(0, 0, var0.getMeasuredWidth(), var0.getMeasuredHeight());
        Bitmap var1 = var0.getDrawingCache();
        return var1 != null ? var1.copy(Config.ARGB_8888, false) : null;
    } catch (Throwable var2) {
        he.c(var2, "Utils", "getBitmapFromView");
        var2.printStackTrace();
        return null;
    }
}
```
可以看到是生成一个 FrameLayout 添加我们自定义的 View，然后利用 drawingCache 来生成 bitmap，最后设置到 Marker 上。所以一旦 View 设置到 Marker 上，这个 View 便“死”了，如果要改变 Marker 的样式，则只能重新生成 View 然后再次设置。**所以，对于有样式修改需求的 Marker，要记录生成 View 的参数。**

## 屏幕位置、地图位置映射
贴一下文档说明：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/%E6%88%AA%E5%9B%BE%20%283%29.png)

## Marker 覆盖点击
多个 Marker 覆盖显示在地图上，点击 Marker 覆盖重叠的部分，并不是视觉上最上层的 Marker 在响应（Marker 的 zIndex 值一致），一直是最后绘制的 Marker 在响应。**通过设置 Marker 的 zIndex 可以解决这个问题。**
```
private var zIndex = 0F
    get() {
        field++
        return field
    }

override fun onMarkerClick(marker: Marker): Boolean {
    marker.zIndex = zIndex
    // do something...
    return true
}
```

参考文档：
[Android地图SDK简介](https://lbs.amap.com/api/android-sdk/summary)
[参考手册](http://a.amap.com/lbs/static/unzip/Android_Map_Doc/index.html)