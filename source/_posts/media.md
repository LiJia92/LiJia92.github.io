---
title: Android 获取手机媒体数据那些事
date: 2019-05-09 19:06:56
tags:
 - 日常开发
---
在上一篇文章 [ViewModel + LiveData 初探](http://lastwarmth.win/2019/04/24/jetpack/) 中的场景中，有获取手机媒体数据的操作，界面上也要展示横竖屏，展示规则很简单：宽度不小于高度则定义为横屏，否则未竖屏。在我的小米 MIX2 上，不论手机如何拍照，返回的分辨率都是 4000:3000（根据相机设置中的画幅比例），不论你是横着拍还是竖着拍。所以当拿到 4000:3000 后就全部定义成横屏了，与实际不符。所以着手解决了一下，顺便整理下获取手机媒体数据的相关代码，方便日后使用。整体代码如下：

<!-- more -->

```
object MediaDataUtils {

    private const val TAG = "MediaDataUtils"

    private val QUERY_URI = MediaStore.Files.getContentUri("external")

    //=============================== 查询系统相册中的视频、图片 ================================
    private const val ORDER_BY = MediaStore.MediaColumns.DATE_MODIFIED + " DESC"

    private const val SELECTION_MEDIA_TYPE_WITHOUT_FOLDER = (
            MediaStore.Files.FileColumns.MEDIA_TYPE + "=?"
                    + " AND " + MediaStore.MediaColumns.SIZE + ">0")

    private const val SELECTION_MEDIA_TYPE_WITH_FOLDER = (
            MediaStore.Files.FileColumns.MEDIA_TYPE + "=?"
                    + " AND "
                    + " bucket_id=?"
                    + " AND " + MediaStore.MediaColumns.SIZE + ">0")

    private val PROJECTION = arrayOf(
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.DATA,
            MediaStore.MediaColumns.DATE_MODIFIED,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.WIDTH,
            MediaStore.MediaColumns.HEIGHT,
            "duration")


    //=============================== 查询系统文件夹 ==================================
    private const val SELECTION_MEDIA_TYPE_FOLDER = (
            MediaStore.Files.FileColumns.MEDIA_TYPE + "=?"
                    + " AND " + MediaStore.MediaColumns.SIZE + ">0"
                    + ") GROUP BY (bucket_id")

    private const val BUCKET_ORDER_BY = "datetaken DESC"

    private val FOLDER_PROJECTION = arrayOf(
            MediaStore.Files.FileColumns._ID,
            "bucket_id",
            "bucket_display_name",
            MediaStore.MediaColumns.DATA,
            "COUNT(*) AS $COLUMN_COUNT")

    /**
     * 获取具体文件
     */
    @WorkerThread
    @JvmStatic
    fun getMediaData(isVideo: Boolean, folderItem: FolderItem? = null): List<MediaDataItem>? {
        if (!PermissionUtils.checkPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            return null
        }

        val data = mutableListOf<MediaDataItem>()
        val pair = getQueryArgs(false, isVideo, folderItem)
        val cursor = MucangConfig.getContext().contentResolver.query(
                QUERY_URI, PROJECTION, pair.first, pair.second, ORDER_BY)
        if (cursor != null) {
            try {
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                    val pathIndex = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                    val modifyIndex = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
                    val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                    val widthIndex = cursor.getColumnIndex(MediaStore.MediaColumns.WIDTH)
                    val heightIndex = cursor.getColumnIndex(MediaStore.MediaColumns.HEIGHT)
                    val durationIndex = cursor.getColumnIndex("duration")
                    do {
                        val file = MediaDataItem()
                        file.isVideo = isVideo
                        file.name = cursor.getString(nameIndex)
                        file.path = cursor.getString(pathIndex)
                        file.date = cursor.getLong(modifyIndex)
                        file.size = cursor.getLong(sizeIndex)
                        file.width = cursor.getInt(widthIndex)
                        file.height = cursor.getInt(heightIndex)
                        if (isVideo) {
                            if (file.width == 0 || file.height == 0) {
                                val widthHeight = readVideoPixel(file.path)
                                if (widthHeight != null) {
                                    file.width = widthHeight.first
                                    file.height = widthHeight.second
                                }
                            }
                        } else {
                            val widthHeight = readImagePixel(file.path)
                            if (widthHeight != null) {
                                file.width = widthHeight.first
                                file.height = widthHeight.second
                            }
                        }
                        if (durationIndex > -1) {
                            file.duration = (cursor.getLong(durationIndex) / 1000F + 0.5).toLong()
                        }
                        data.add(file)
                    } while (cursor.moveToNext())
                }
            } catch (e: Exception) {
                LogUtils.e(TAG, e.toString())
            } finally {
                cursor.close()
            }
        }
        return data
    }

    /**
     * 获取文件夹
     */
    @WorkerThread
    @JvmStatic
    fun getFolderData(isVideo: Boolean): List<FolderItem>? {
        if (!PermissionUtils.checkPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            return null
        }

        val data = mutableListOf<FolderItem>()
        val pair = getQueryArgs(true, isVideo)
        val cursor = MucangConfig.getContext().contentResolver.query(
                QUERY_URI, FOLDER_PROJECTION, pair.first, pair.second, BUCKET_ORDER_BY)
        if (cursor != null) {
            try {
                if (cursor.moveToFirst()) {
                    // 全部文件夹
                    val allFolder = FolderItem()
                    allFolder.id = ALL_FOLDER_ID
                    if (isVideo) {
                        allFolder.name = "全部视频"
                    } else {
                        allFolder.name = "全部照片"
                    }
                    allFolder.selected = true
                    data.add(allFolder)

                    var count = 0
                    val idIndex = cursor.getColumnIndex("bucket_id")
                    val pathIndex = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                    val nameIndex = cursor.getColumnIndex("bucket_display_name")
                    val countIndex = cursor.getColumnIndex(AlbumLoader.COLUMN_COUNT)
                    do {
                        val folder = FolderItem()
                        folder.id = cursor.getString(idIndex)
                        folder.path = cursor.getString(pathIndex)
                        folder.name = cursor.getString(nameIndex)
                        folder.count = cursor.getInt(countIndex)
                        data.add(folder)
                        count += folder.count

                        if (StringUtils.isEmpty(allFolder.path)) {
                            allFolder.path = folder.path
                        }

                    } while (cursor.moveToNext())
                    data.first().count = count
                }
            } catch (e: Exception) {
                LogUtils.e(TAG, e.toString())
            } finally {
                cursor.close()
            }
        }
        return data
    }

    /**
     * getMediaData 时调用，根据是否视频、是否查询文件夹返回查询参数
     *
     * @return Pair：first->selection，second->args
     */
    private fun getQueryArgs(isQueryFolder: Boolean, isVideo: Boolean, folderItem: FolderItem? = null): Pair<String, Array<String>> {
        if (isQueryFolder) {
            return if (isVideo) {
                Pair(SELECTION_MEDIA_TYPE_FOLDER, arrayOf(MEDIA_TYPE_VIDEO.toString()))
            } else {
                Pair(SELECTION_MEDIA_TYPE_FOLDER, arrayOf(MEDIA_TYPE_IMAGE.toString()))
            }
        }

        if (folderItem?.id != null && !folderItem.isAll()) {
            return if (isVideo) {
                Pair(SELECTION_MEDIA_TYPE_WITH_FOLDER, arrayOf(MEDIA_TYPE_VIDEO.toString(), folderItem.id!!))
            } else {
                Pair(SELECTION_MEDIA_TYPE_WITH_FOLDER, arrayOf(MEDIA_TYPE_IMAGE.toString(), folderItem.id!!))
            }
        }

        return if (isVideo) {
            Pair(SELECTION_MEDIA_TYPE_WITHOUT_FOLDER, arrayOf(MEDIA_TYPE_VIDEO.toString()))
        } else {
            Pair(SELECTION_MEDIA_TYPE_WITHOUT_FOLDER, arrayOf(MEDIA_TYPE_IMAGE.toString()))
        }
    }
}
```
利用我的小米 MIX2 使用 18:9 画幅比例竖屏拍摄的一张照片，在我的 Rom 里显示的是 4000:2000，将这张照片放到同事的华为手机里，显示的分辨率则是另外一个数，但是华为 Rom 里获取的高宽比例是一致的，宽：高 = 1 : 2，所以在我的手机里识别成横屏照片，在华为手机里识别为竖屏照片。所以仅仅使用 MediaStore.MediaColumns.WIDTH、MediaStore.MediaColumns.HEIGHT 获取的宽高是不准确的，需要一个更好的方案：
```
/**
 * 读取图片的宽高信息，系统多媒体数据库保存的宽高信息是通过读取图片 ExifInterface 数据
 * 某些手机拍照生成的 exif 数据不准，此处使用 BitmapDecode 的方式获取，经测试耗时可忽略不计
 */
@JvmStatic
private fun readImagePixel(filePath: String?): Pair<Int, Int>? {
    if (!FileUtils.exists(filePath)) {
        return null
    }
    try {
        val options = BitmapFactory.Options()
        options.inJustDecodeBounds = true
        BitmapFactory.decodeFile(filePath, options)
        val width = options.outWidth
        val height = options.outHeight
        if (width > 0 && height > 0) {
            val exifInterface = ExifInterface(filePath)
            val orientation = exifInterface.getAttributeInt(ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL)
            // 如果图片的旋转角度为 90 或者 270，则宽高互换
            if (orientation == ExifInterface.ORIENTATION_ROTATE_90
                    || orientation == ExifInterface.ORIENTATION_ROTATE_270) {
                return Pair(height, width)
            }
            return Pair(width, height)
        }

    } catch (e: Exception) {
        LogUtils.e(TAG, e.message)
    }
    return null
}
```
当照片数量很多（我的手机 2200+ 张照片）时，遍历完耗时大概在 3 ~ 4 秒，在接受范围内吧。
另外对于小米 MIX2 拍摄的视频数据，获取的宽高会是 0，所以也需要一种方案获取比例：
```
/**
 * 读取视频的宽高数据
 * 需要根据拍摄方向进行转换，有点耗时平均五六十毫秒
 */
@JvmStatic
private fun readVideoPixel(filePath: String?): Pair<Int, Int>? {
    if (!FileUtils.exists(filePath)) {
        return null
    }
    val mmr = MediaMetadataRetriever()
    try {
        mmr.setDataSource(filePath)
        val width = mmr.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toInt()
                ?: 0
        val height = mmr.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toInt()
                ?: 0
        val orientation = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION).toInt()
        if (width > 0 && height > 0) {
            if (orientation == 90 || orientation == 270) {
                return Pair(height, width)
            }
            return Pair(width, height)
        }
    } catch (e: Exception) {
        LogUtils.e(TAG, e.message)
    } finally {
        try {
            mmr.release()
        } catch (e: Throwable) {
            LogUtils.e(TAG, e.message)
        }
    }
    return null
}
```
视频数量一般比较少，耗时问题暂时可以不考虑。使用此种方案后，照片、视频的横竖问题基本准确。Over~