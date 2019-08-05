---
title: 高德地图 Marker 聚合
date: 2019-08-05 14:36:57
tags:
 - sdk
---
高德地图有个[官方 Demo](https://github.com/amap-demo/android-cluster-marker)用来实现 Marker 聚合，但不是在 SDK 里。项目里也有这个需求，但是比较简单，不用做到数量计算，只需要当 Marker 数量很多的的时候，只展示部分 Marker，显示了会覆盖的 Marker 则直接不显示。每次移动地图都会请求新的数据，然后来进行展示，为了避免移动地图导致频繁请求数据，可以做个简单的优化：移动后延迟一定时间再去请求数据，在延迟时间内再次移动地图，则取消上次请求的动作，重新请求。综合考虑，使用 HandlerThread 便是不二之选了，在这里记录一下，以后或许用得到。

<!-- more -->

```
class MarkerClusterController<T : MarkerItem>(val mapController: MapController, val adapter: MarkerDataAdapter<T>)
    : AMap.OnCameraChangeListener, AMap.OnMarkerClickListener {

    companion object {
        private const val TAG = "MarkerClusterController"

        private const val UPDATE_INTERVAL_TIME = 500L
        // 更新数据
        private const val MSG_CLUSTER_DATA_UPDATE = 1
        // 清空数据
        private const val MSG_CLUSTER_MARKER_CLEAR = 2
    }

    private val amap = mapController.amap

    private val clusterHandlerThread: HandlerThread = HandlerThread("MarkerClusterThread")
    private var clusterHandler: ClusterHandler

    // 更新过程中是否取消更新
    var isCanceled = false

    private val makerUpdateManger = MarkerUpdateManger()

    init {
        clusterHandlerThread.start()
        clusterHandler = ClusterHandler(clusterHandlerThread.looper)
        mapController.addCameraChangeListener(this)
        mapController.addOnMarkerClickListener(this)
    }

    override fun onCameraChangeFinish(p0: CameraPosition) {
        // 地图移动或者层级变化时更新数据
        clusterHandler.sendDataUpdateMsg()
    }

    override fun onCameraChange(p0: CameraPosition?) {
    }

    @Suppress("UNCHECKED_CAST")
    override fun onMarkerClick(marker: Marker): Boolean {
        val markerItem = marker.`object` as? MarkerItem
        return if (markerItem == null) {
            false
        } else {
            adapter.onMarkerClick(markerItem, marker)
        }
    }

    fun initData() {
        clusterHandler.sendEmptyMessage(MSG_CLUSTER_DATA_UPDATE)
    }

    /**
     * 销毁数据，移除监听
     */
    fun onDestroy() {
        isCanceled = true
        mapController.removeCameraChangeListener(this)
        mapController.removeMarkClickListener(this)
        clusterHandler.removeCallbacksAndMessages(null)
        clusterHandlerThread.quit()
        makerUpdateManger.clearMarker()
    }

    /**
     * 清除某个类型的 Marker 集合
     */
    fun clearMarkers(type: MarkType) {
        val iterator = makerUpdateManger.markerList.iterator()
        iterator.forEach {
            val markerItem = it.`object` as? MarkerItem
            if (markerItem?.type == type) {
                it.remove()
                makerUpdateManger.markerList.remove(it)
            }
        }
    }

    /**
     * 移除某个 Marker
     * 高亮的 Marker 先移除再绘制
     */
    fun removeMarker(t: T?) {
        if (t == null) {
            return
        }

        val iterator = makerUpdateManger.markerList.iterator()
        iterator.forEach {
            if (it.`object` == t) {
                it.remove()
                makerUpdateManger.markerList.remove(it)
            }
        }
    }

    fun getMarkerList(): List<Marker> {
        return makerUpdateManger.markerList
    }

    fun updateMarkerList(tempList: MutableList<T>?) {
        clusterHandler.post {
            makerUpdateManger.updateMarkerList(tempList)
        }
    }

    /**
     * Marker 更新管理
     */
    inner class MarkerUpdateManger {
        // 两个marker之间的最小距离阈值
        private val defaultDistance = DimenUtils.dp2px(40f)
        val markerList = CopyOnWriteArrayList<Marker>()

        /**
         * 获取数据计算聚合
         */
        internal fun updateClustersData() {
            isCanceled = false
            val visibleBounds = amap.projection.visibleRegion.latLngBounds
            val markerItemList = adapter.getMarkerData(visibleBounds)
            updateMarkerList(markerItemList)
        }

        /**
         * 显示 MarkerList，先清空已显示的
         */
        fun updateMarkerList(tempList: MutableList<T>?) {
            if (isCanceled) {
                return
            }
            // 还需要显示的不用移除
            val showMarkerList = mutableListOf<Marker>()
            val newDrawList = mutableListOf<MarkerItem>()
            tempList?.sortByDescending {
                it.zIndex
            }
            tempList?.let { list ->
                if (isCanceled) {
                    return
                }
                list.forEach { item ->
                    if (getCluster(item.latLng, newDrawList)) {
                        newDrawList.add(item)
                    }
                }
            }

            val repeatList = mutableListOf<MarkerItem>()
            // 循环匹配保留还需要显示的，移除不需要显示的
            markerList.forEach { marker ->
                val objectData = marker.`object` as MarkerItem
                if (newDrawList.contains(objectData)) {
                    repeatList.add(objectData)
                    showMarkerList.add(marker)
                } else {
                    marker.remove()
                }
            }
            // 剔除已绘制过的
            newDrawList.removeAll(repeatList)
            markerList.clear()
            markerList.addAll(showMarkerList)

            addMarkerList(newDrawList)
        }

        /**
         * 增加 MarkerList
         */
        private fun addMarkerList(newList: List<MarkerItem>) {
            newList.forEach {
                addMarker(it)
            }
        }

        /**
         * 增加一个 Marker
         */
        private fun addMarker(markerItem: MarkerItem) {
            val marker = markerItem.createMarker(mapController.mapView)
            marker.`object` = markerItem
            markerList.add(marker)
        }

        /**
         * 清除 Marker
         */
        internal fun clearMarker() {
            markerList.forEach {
                it.remove()
            }
            markerList.clear()
        }

        /**
         * 当前点是否会被覆盖
         *
         * @param latLng
         * @return
         */
        private fun getCluster(latLng: LatLng, markerItem: List<MarkerItem>): Boolean {
            for (item in markerItem) {
                val clusterCenterPoint = item.latLng
                val distance = AMapUtils.calculateLineDistance(latLng, clusterCenterPoint).toDouble()
                val clusterDistance = defaultDistance * amap.scalePerPixel
                if (distance < clusterDistance) {
                    return false
                }
            }

            return true
        }
    }

    /**
     * 集合Handler，保证 Marker 集合处理在同一子线程
     */
    private inner class ClusterHandler(looper: Looper) : Handler(looper) {

        private var lastUpdateTime = 0L

        override fun handleMessage(msg: Message) {
            when (msg.what) {
                MSG_CLUSTER_DATA_UPDATE -> {
                    makerUpdateManger.updateClustersData()
                }
                MSG_CLUSTER_MARKER_CLEAR -> {
                    makerUpdateManger.clearMarker()
                }
            }
        }

        fun sendDataUpdateMsg() {
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastUpdateTime < UPDATE_INTERVAL_TIME) {
                return
            }
            lastUpdateTime = currentTime
            isCanceled = true
            removeCallbacksAndMessages(null)
            sendEmptyMessageDelayed(MSG_CLUSTER_DATA_UPDATE, UPDATE_INTERVAL_TIME)
        }
    }

}

/**
 * Marker 数据获取适配器
 */
interface MarkerDataAdapter<T : MarkerItem> {

    fun getMarkerData(visibleBounds: LatLngBounds): MutableList<T>?

    fun onMarkerClick(markerItem: MarkerItem, marker: Marker): Boolean
}

abstract class MarkerItem(val type: MarkType, val latLng: LatLng, var zIndex: Float = -1F) {

    /**
     * 生成 Marker
     */
    abstract fun createMarker(mapView: MapView): Marker
}
```