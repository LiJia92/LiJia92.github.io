---
title: ViewModel + LiveData 初探
date: 2019-04-24 17:29:38
tags:
 - Jetpack
---
Google 已经推出 Lifecycle、ViewModel、LiveData 等一系列架构组件已经很久了，但是自己一直没尝试使用，仅仅就是了解一点点，没有紧跟技术潮流持续学习，说来十分羞愧了。最近接到一个需求，界面如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/video.png)

<!-- more -->

突发奇想：ViewModel 可以在一个界面共享数据，感觉是做这个需求的不二选择呀，于是乎便开始使用了。

## 添加依赖
```
implementation "android.arch.lifecycle:extensions:1.1.1"
```
sync 之后报错：
```
Android dependency 'android.arch.lifecycle:runtime' has different version for the compile (1.0.3) and runtime (1.1.1) classpath. You should manually set the same version via DependencyResolution
```
查看依赖，发现 support 库有依赖 runtime:1.0.3：
```
|    |    +--- com.android.support:support-v4:27.0.2
|    |    |    +--- com.android.support:support-compat:27.0.2
|    |    |    |    +--- com.android.support:support-annotations:27.0.2
|    |    |    |    \--- android.arch.lifecycle:runtime:1.0.3
```
所以如果要使用 1.1.1 的 extensions 则需要将 runtime:1.0.3 升到 1.1.1，如果降版本使用低版本的 extensions 也是可以的，但是就无法使用最新的特性以及问题修复了。
这里说下强升的几个方法：
1. 根 build.gradle 添加：
```
allprojects {
    ...
    configurations {
        all {
            resolutionStrategy {
                force "android.arch.lifecycle:runtime:1.1.1"
            }
        }
    }
}
```
2. exclude support 的依赖：
```
implementation ('com.android.support:appcompat-v7:27.1.1') {
    exclude group: 'android.arch.lifecycle'
}

api "android.arch.lifecycle:runtime:1.1.1"
```
3. implementation 改成 api：
```
api "android.arch.lifecycle:extensions:1.1.1"
```
注意：**需要注意 runtime:1.1.1 不会与 support-v4:27.0.2 产生冲突**。网上没看到有人说会不兼容，所以姑且先忽略。
> [Android Architecture Components: Gradle sync error for dependency version](https://stackoverflow.com/questions/50012822/android-architecture-components-gradle-sync-error-for-dependency-version)

## 实践
注意到设计稿里，拆分一下页面结构：
1. 顶部状态栏，可以切换视频文件夹、照片文件夹
2. ViewPager 切换视频或者照片
3. 第 x 段 RecyclerView

这里可以分为三个 Fragment，主页面一个，视频、照片各位一个，所以需要在三个 Fragment 里共享数据，方便操作。这里主页面 Fragment 称为 MainFragment，素材 Fragemnt 称为 MaterialFragent。参照官网的例子，写出的 ViewModel 如下：
```
class MaterialViewModel : ViewModel() {

    // 视频数据
    val videoData: MutableLiveData<List<MediaDataItem>> by lazy {
        MutableLiveData<List<MediaDataItem>>().also {
            MucangConfig.execute {
                it.postValue(MediaDataUtils.getMediaData(true))
            }
        }
    }

    // 视频文件夹
    val videoFolder: MutableLiveData<List<FolderItem>> by lazy {
        MutableLiveData<List<FolderItem>>().also {
            MucangConfig.execute {
                it.postValue(MediaDataUtils.getFolderData(true))
            }
        }
    }

    // 照片数据
    val pictureData: MutableLiveData<List<MediaDataItem>> by lazy {
        MutableLiveData<List<MediaDataItem>>().also {
            MucangConfig.execute {
                it.postValue(MediaDataUtils.getMediaData(false))
            }
        }
    }

    // 照片文件夹
    val pictureFolder: MutableLiveData<List<FolderItem>> by lazy {
        MutableLiveData<List<FolderItem>>().also {
            MucangConfig.execute {
                it.postValue(MediaDataUtils.getFolderData(false))
            }
        }
    }

    /**
     * 获取文件夹下的视频
     */
    fun getFolderVideo(folderItem: FolderItem) {
        MucangConfig.execute {
            videoData.postValue(MediaDataUtils.getMediaData(true, folderItem))
        }
    }

    /**
     * 获取文件夹下的照片
     */
    fun getFolderPicture(folderItem: FolderItem) {
        MucangConfig.execute {
            pictureData.postValue(MediaDataUtils.getMediaData(false, folderItem))
        }
    }
}    
```
在 MaterialFragent 里需要监听素材数据的改变，来填充列表：
```
private fun initViewModel() {
    // 因为要同页面共享数据，所以需要传 activity
    viewModel = ViewModelProviders.of(activity!!).get(MaterialViewModel::class.java)
    if (isVideo) {
        viewModel.videoData
    } else {
        viewModel.pictureData
    }.observe(this, Observer<List<MediaDataItem>> {
    	// 给 RecyclerView 的 adapter 设置数据
        setData(it)
    })
}
```
根据是否是视频，来选择不同的 LiveData 来监听。
注意到有几个操作：
1. 底部的 Rv 默认选中第一个 Item，Item 可以点击切换选择状态。当前选择的 Item 可以匹配一个素材（视频或照片）
2. 素材列表右上角的选择点击之后，则将素材与底部 Rv 当前选中的 Item 进行匹配，并且选中的素材下面出现红色条，代表当前素材已匹配到某一个 Item，若当前 Item 已匹配过素材，则进行替换，所以如果匹配过，则需要将旧的素材下面的红色条置为 GONE。同时 Rv 切换到下一个可选择素材的 Item（没有匹配过素材的 Item），最直观的感受就是绿色边框的切换。
3. 当底部 Rv 所有素材全部匹配完之后，下面的选择完成按钮变成可点击。

针对以上几点，又新增了几个 LiveData：
```
// 当前给哪个 Item 选择素材
lateinit var currentSegment: Segment

/**
 * 同一个 Item 有重复选择视频或者照片，需要记录上一次选择的位置，用于更新界面取消选中
 *
 * Pair：first->上一次选择的是否是视频，second->上一次选中的位置
 */
val changePos: MutableLiveData<Pair<Boolean, Int>> = MutableLiveData()

/**
 * 当前的 Item 选择素材之后，需要更新背景图
 */
var currentPos: MutableLiveData<Int> = MutableLiveData()
```
在匹配一个 Item 之后，ViewModel 更新数据：
```
/**
 * 填充模板 Item 选择的素材
 */
fun fillSegment(mediaDataItem: MediaDataItem) {
    if (mediaDataItem == currentSegment.mediaDataItem) {
        return
    }

    if (currentSegment.mediaDataItem == null) {
        currentSegment.mediaDataItem = mediaDataItem
        changePos.value = Pair(true, -1)
    } else {
        val currentMedia = currentSegment.mediaDataItem!!
        currentMedia.selected = false
        val index = if (currentMedia.isVideo) {
            videoData.value?.indexOf(currentMedia)
        } else {
            pictureData.value?.indexOf(currentMedia)
        }
        currentSegment.mediaDataItem = mediaDataItem
        changePos.value = Pair(currentMedia.isVideo, index ?: -1)
    }

    currentPos.value = templateData.value?.video?.segments?.indexOf(currentSegment)
}
```
在 MainFragment 里监听 currentPos 数据的变化：
```
viewModel.currentPos.observe(this, Observer {
    if (it != null && it > -1) {
        val index = (segmentRv.adapter as SegmentAdapter).cycleValidIndex(it)
        // 没有未完成的 Segment 时可点击完成
        if (index == -1) {
            chooseCompleteTv.alpha = 1F
            chooseCompleteTv.isClickable = true
        } else {
            segmentRv.smoothScrollToPosition(index)
            chooseCompleteTv.alpha = 0.3F
            chooseCompleteTv.isClickable = false
        }
    }
})
```
SegmentAdapter 的方法 cycleValidIndex 自动循环下一个需要匹配素材的的 Item，当返回 -1 时代表所有 Item 都已经匹配素材，这时可以针对单一 Item 进行素材调整，不用做 index 自动循环了。
```
/**
 * 当前选中的 index，自动切换到下一个可用的 index
 */
fun cycleValidIndex(pos: Int): Int {
    var nextIndex = -1
    run findIndex@{
        val index = pos + 1
        if (index < dataList.lastIndex) {
            for (i in index until dataList.size) {
                if (dataList[i].mediaDataItem == null) {
                    nextIndex = i
                    return@findIndex
                }
            }

            for (i in 0 until index) {
                if (dataList[i].mediaDataItem == null) {
                    nextIndex = i
                    return@findIndex
                }
            }
        } else {
            for (i in 0 until dataList.size) {
                if (dataList[i].mediaDataItem == null) {
                    nextIndex = i
                    return@findIndex
                }
            }
        }
    }

    if (nextIndex == -1) {
        notifyItemChanged(pos)
    }
    // 切换选择状态
    chooseSegment(nextIndex)
    return nextIndex
}
```
在 MaterialFragment 监听上一个需要取消红色条的 LiveData：
```
viewModel.changePos.observe(this, Observer {
    if (it != null && it.first == isVideo && it.second > -1) {
        materialRv.adapter?.notifyItemChanged(it.second)
    }
})
```
ok，实践就说到这里，基本实现需求了。

## ViewModel 原理
ViewModel 不会随着 Activity 的屏幕旋转而销毁，减少了维护状态的代码成本。另外，它可以在多个 Fragment 维护相同的数据，极大的减少了组件之间数据传递的代码成本。那么它是如何实现的呢？
在说原理之前，需要了解一个知识点：
> setRetainInstance(boolean) 是 Fragment 中的一个方法。将这个方法设置为 true 就可以使当前 Fragment 在 Activity 重建时存活下来。

现在相信已经对原理的实现有自己的思路了：**让 Activity 持有一个不可见的 Fragment(HolderFragment)，并让这个 HolderFragment 调用 setRetainInstance(boolean) 方法并持有 ViewModel ——这样当 Activity 因为屏幕的旋转销毁并重建时，该 Fragment 存储的 ViewModel 自然不会被随之销毁回收了**。
另外一个 Fragment 或者 Activity 是有可能持有多个 ViewModel 的，所以内部需要一个 HashMap 进行存储所有的 ViewModel。
```
@RestrictTo(RestrictTo.Scope.LIBRARY_GROUP)
public class HolderFragment extends Fragment implements ViewModelStoreOwner {

    private ViewModelStore mViewModelStore = new ViewModelStore();

    public HolderFragment() {
        setRetainInstance(true);
    }
}

public class ViewModelStore {

    private final HashMap<String, ViewModel> mMap = new HashMap<>();

    final void put(String key, ViewModel viewModel) {
        ViewModel oldViewModel = mMap.put(key, viewModel);
        if (oldViewModel != null) {
            oldViewModel.onCleared();
        }
    }
}
```
看到相应的代码，是不是一目了然？然后看到 ViewModel 只会有一个实例的代码：
```
@NonNull
@MainThread
public <T extends ViewModel> T get(@NonNull String key, @NonNull Class<T> modelClass) {
    ViewModel viewModel = mViewModelStore.get(key);

    if (modelClass.isInstance(viewModel)) {
        //noinspection unchecked
        return (T) viewModel;
    } else {
        //noinspection StatementWithEmptyBody
        if (viewModel != null) {
            // TODO: log a warning.
        }
    }

    viewModel = mFactory.create(modelClass);
    mViewModelStore.put(key, viewModel);
    //noinspection unchecked
    return (T) viewModel;
}
```
如果 mViewModelStore 里存有 ViewModel 实例则直接返回，没有则进行 create，然后 put 到 mViewModelStore 中，很直截了当了。

## 总结
篇幅所限，关于 LiveData 这里就不写了，核心原理是 LifeCycleOwner，这个网上的相关文章也挺多的。

参考：
1. [ViewModel OverView](https://developer.android.com/topic/libraries/architecture/viewmodel)
2. [LiveData Overview](https://developer.android.com/topic/libraries/architecture/livedata)
3. [Android官方架构组件ViewModel:从前世今生到追本溯源](https://blog.csdn.net/mq2553299/article/details/84730135)
4. [Android Architecture Component之LiveData原理解析](https://cloud.tencent.com/developer/article/1169318)