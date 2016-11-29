---
title: Android实现照片墙背景
date: 2016-02-17 17:34:49
tags:
 - 自定义View
---

项目开发中，有一个这样的需求：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/02/photo-wall1.png)
在个人主页里会有12张图片的背景墙。这12张图片由服务器返回，会不定时刷新。

---
## 第一种方案
起初，自己的实现思路是：xml直接定义12个ImageView，然后在接收到图片路径后，再进行异步加载。

显然，这种方法是肯定可以的，但是却显得不“优雅”。而且后续可能会对这整个背景墙有个缩放的动画之类的，那么再实现起来便会比较复杂了。

## 第二种方案

之后，我想到了GridView，显然也是可以的，在得到图片路径后传入到Adapter中即可。比起方案一稍微“优雅”些，但是也是很难将这个背景墙当成一个整体，进行将来可能会添加的动画特效需求。

## 第三种方案

最后，我想到，既然要当成一整个整体，那么自定义View或许是个不错的办法。

<!--more-->

### 思路
思路是这样的：

 1. 首先ImageView展示初始图片；
 2. 下载图片；
 3. 所有图片下载完成后刷新View，显示下载的图片墙。

下面上代码。

### 代码
自定义ImageView：
```
public class JointImageView extends ImageView {

    private Paint mPaint;// 画笔
    private List<Bitmap> bitmaps;// 位图
    private List<Rect> rectList; // 正方形画bitmap
    private int width; // 边长
    private static int pictureInRow = 4; // 每一行显示4张图片


    public JointImageView(Context context) {
        super(context);
    }

    public JointImageView(Context context, AttributeSet attrs) {
        super(context, attrs);
        mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    }

    /**
     * 设置Bitmap数据
     *
     * @param bitmaps
     */
    public void setBitmaps(List<Bitmap> bitmaps) {
        this.bitmaps = bitmaps;
        width = getMeasuredWidth() / pictureInRow;
        createRect();
        postInvalidate(); // 在设置Bitmaps之后重绘
    }

    private void createRect() { // 计算12个矩形的坐标
        rectList = new ArrayList<>(AppConfigs.PROFILE_PICTURE_NUM);
        for (int i = 0; i < AppConfigs.PROFILE_PICTURE_NUM; i++) {
            Rect rect = new Rect((i % pictureInRow) * width, (i / pictureInRow) * width,
                    (i % pictureInRow + 1) * width, (i / pictureInRow + 1) * width);
            rectList.add(rect);
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        if (bitmaps == null) {
            super.onDraw(canvas);
        } else {
            for (int i = 0; i < bitmaps.size(); i++) {
                if (bitmaps.get(i) != null) {
                    canvas.drawBitmap(bitmaps.get(i), null, rectList.get(i), mPaint); // 画图
                }
            }
        }
    }

}

```
布局文件中使用：
```
<com.android.widget.JointImageView
    android:id="@+id/my_profile_background"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:scaleType="centerCrop"
    android:src="@drawable/background" />
```
项目中使用的Universal-Image-Loader三方库进行图片的加载。

下载图片的异步任务代码：
```
private class BitmapLoaderTask extends AsyncTask<String[], Integer, List<Bitmap>> {

    private List<Bitmap> bitmaps;

    public BitmapLoaderTask() {
        bitmaps = new ArrayList<>(AppConfigs.PROFILE_PICTURE_NUM);
    }

    @Override
    protected List<Bitmap> doInBackground(String[]... params) {
        ImageSize imageSize = new ImageSize(80, 80); // 图片压缩到80*80的大小
        for (int i = 0; i < params[0].length && i < AppConfigs.PROFILE_PICTURE_NUM; i++) {
            // 使用UIL同步下载图片的方法下载图片，存到bitmap数组
            Bitmap bitmap = ImageLoader.getInstance().loadImageSync(params[0][i], imageSize);
            bitmaps.add(bitmap);
        }
        return bitmaps;
    }

    @Override
    protected void onPostExecute(List<Bitmap> bitmaps) {
        // 全部下载完毕，通知View进行重绘
        if (bitmaps != null && bitmaps.size() == AppConfigs.PROFILE_PICTURE_NUM) {
            profileBackground.setBitmaps(bitmaps);
        }
    }

    @Override
    protected void onCancelled() {
        super.onCancelled();
    }
}
```
通过方案三，在实现当下需求的同时，也可以作为一个单独的View，在将来拓展可能的缩放等特效动画。

但是也有一个缺点：必须所有的图片下载完毕才进行刷新。

当然，也可以将刷新策略调整成下载一张刷新一次，这个就得看具体的需求了。

## 题外话
对于图片中的阴影效果，我们可以采用alpha背景来实现。也可以通过色彩矩阵在绘制的时候进行调整。

通过alpha背景实现很简单，在FrameLayout上遮罩一个View，alpha设置成相应的值即可。
```
<View
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:alpha="0.7"
    android:background="#000000" />
```
通过色彩矩阵就得不停的调整了。
```
// 生成色彩矩阵  
ColorMatrix colorMatrix = new ColorMatrix(new float[]{  
        0.5F, 0, 0, 0, 0,  
        0, 0.5F, 0, 0, 0,  
        0, 0, 0.5F, 0, 0,  
        0, 0, 0, 1, 0,  
});  
mPaint.setColorFilter(new ColorMatrixColorFilter(colorMatrix));  // 画笔设置色彩矩阵，这样再绘制的时候就会有效果了
```
