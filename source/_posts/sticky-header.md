---
title: Android 列表 Header 吸顶效果
date: 2018-07-23 15:19:58
tags:
 - Android 进阶
---
现在 Android 开发中列表 Header 吸顶效果比较常见了，针对 ListView、RecyclerView 都有多种实现方式。之前开发也碰到过，都是用的三方库或者框架。今天主要写下直接利用 Android 原生来进行实现。
页面大致如下：

![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2018/07/231.png)

<!-- more -->

针对本文的场景，相当于一个 HEADER 对应一组 Image。所以，最好是有个 Map 结构，然后每个 Image item 都能清楚的知道自己所属哪个 HEADER。
```
class MatchedImageAdapter(val map: LinkedHashMap<HEADER, List<Image>>)
    : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val dataList = ArrayList<Any>()
    private var currentKey: HEADER? = null

    init {
        map.forEach {
            dataList.add(it.key)
            dataList.addAll(it.value)
        }
    }
}

/**
 * path         图片地址
 * key          对应的 HEADER
 * date         时间
 * selected     是否选中
 */
class Image(val path: String?, var key: HEADER?, var date: Long = 0, var lat: Double = 0.0,
  			var lng: Double = 0.0, var selected: Boolean = false) : Serializable
```
然后按照这个结构，利用泛型，来实现列表多 Type 效果。
```
private val dataList = ArrayList<Any>()

override fun getItemViewType(position: Int): Int {
    return if (dataList[position] is Header) {
        TYPE_HEADER
    } else {
        TYPE_IMAGE_ITEM
    }
}
```
另外，针对图片 Item 的网格布局，直接使用 GridLayoutManager 的 spanSize 就能达到效果。
```
val layoutManager = GridLayoutManager(context, MAX_COUNT)
layoutManager.spanSizeLookup = object : GridLayoutManager.SpanSizeLookup() {
    override fun getSpanSize(position: Int): Int {
        return if (adapter!!.getItemViewType(position) == HEADER) {
            1
        } else {
            3
        }
    }
}
```
看到 Header 有个“选择”按钮是可以点击的，所以就有了本文。不用支持点击的话，可以直接使用 ItemDecoration 来达到吸顶效果了。
如果要支持点击效果，我采取的方案是：**在 RecyclerView 上面盖一层 Header，然后用过滑动监听来设置 Header 的偏移，从而达到吸顶效果。**
那么核心便是滑动的监听了：
```
matchedImageRv.addOnScrollListener(object : RecyclerView.OnScrollListener() {
    override fun onScrolled(recyclerView: RecyclerView?, dx: Int, dy: Int) {
        if (CollectionUtils.isEmpty(adapter!!.getDataList())) {
            return
        }

        // 获取到视图中第一个可见的item的position
        val firstVisiblePosition = layoutManager.findFirstVisibleItemPosition()

        if (firstVisiblePosition < 0 || firstVisiblePosition >= adapter!!.getDataList().size) {
            return
        }

        // 获取第一个 item 的 VH
        val viewHolder = matchedImageRv.findViewHolderForLayoutPosition(firstVisiblePosition) ?: return

        // 记录当前位置的数据
        currentHeader = adapter!!.getDataList()[firstVisiblePosition]

        // 是否应该平移 HEADER
        val shouldTranslationY = shouldTranslationY(firstVisiblePosition)

        // 根据高度及 top 值判断是否需要设置 translationY
        val height = autoMatchHeader.height
        if (shouldTranslationY && viewHolder.itemView.height + viewHolder.itemView.top < height) {
            val translationY = viewHolder.itemView.height + viewHolder.itemView.top - height
            autoMatchHeader.translationY = translationY.toFloat()
        } else {
            autoMatchHeader.translationY = 0f
        }

       	// 更新悬浮 Header 信息
        refreshHeader()
    }
})
```
看下 shouldTranslationY 的代码：
```
/**
 * 只有下一行数据是 Header，才应该进行平移
 */
fun shouldTranslationY(position: Int): Boolean {
    if (adapter!!.getDataList()[position] is HEADER) {
        return false
    }

    for (i in 0 until 3) {
        if (position + 1 + i < adapter!!.getDataList().size) {
            val data = adapter!!.getDataList()[position + 1 + i]
            if (data is HEADER) {
                return true
            }
        }
    }
    return false
}
```
position 是当前位置，如果当前位置是 HEADER，那么下一行数据肯定不是 HEADER，直接返回 false。如果当前位置是图片 item，那么往下数 3 个，一定能得到下一行数据的类型。中途有可能被 HEADER 类型截断，从而直接返回。然后结合高度，top 值，来判断是否需要设置 translationY，从而达到吸顶效果。
然后看下覆盖 HEADER 的点击事件设置：
```
autoMatchHeader.selectAllTv.setOnClickListener {
    val header = if (currentHeader is Image) {
        (currentHeader as Image).key
    } else {
        currentHeader
    } as HEADER

    adapter!!.onAllClick(header, adapter!!.getDataList().indexOf(header))
}
```
通过滑动获取当前位置的数据 currentHeader，然后改变这个 currentHeader 对应数据中的具体分组的数据。
写的有点乱，但是要点都写出了，over~