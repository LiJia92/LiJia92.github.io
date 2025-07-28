---
title: Android仿QQ空间浏览图片
date: 2015-12-08 17:09:39
tags:
 - Android 基础
---

## 前言
最近的项目中需要用到类似QQ空间那样的图片浏览功能，于是Google了一波，发现使用ViewPager与PhotoView即可实现。有了思路便开撸了。

## 代码
首先，我们定义一个用于展示原图的Activity。
```
public class ImageBrowseActivity extends Activity {

    // ViewPager对象
    private ViewPager mViewPager;
    // 原图url路径List
    private List<String> imagePath;
    // 当前显示的位置
    private int position;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_images_view);
        // 获取参数
        this.position = getIntent().getIntExtra("position", 0);
        this.imagePath = getIntent().getStringArrayListExtra("imagePath");
        mViewPager = (ViewPager) findViewById(R.id.images_view);
        // 设置左右两列缓存的数目
        mViewPager.setOffscreenPageLimit(2);
        // 添加Adapter
        PagerAdapter adapter = new ImageBrowseAdapter(this, imagePath);
        mViewPager.setAdapter(adapter);
        mViewPager.setCurrentItem(position);
    }
}
```

<!--more-->

布局如下：
```
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000"
    android:orientation="vertical">

    <android.support.v4.view.ViewPager
        android:id="@+id/images_view"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center" />

</FrameLayout>
```
Activity比较简单，不做过多赘述。下面看看ImageBrowseAdapter怎么实现的。
ImageBrowseAdapter代码如下：
```
public class ImageBrowseAdapter extends PagerAdapter {

    PhotoViewAttacher mAttacher;
    private Context context;
    private List<String> imagePath;

    public ImageBrowseAdapter(Context context, List<String> urls) {
        this.context = context;
        this.imagePath = urls;
    }

    @Override
    public int getCount() {
        return imagePath.size();
    }

    @Override
    public boolean isViewFromObject(View view, Object o) {
        return view == o;
    }

    @Override
    public void destroyItem(ViewGroup view, int position, Object object) {
        view.removeView((View) object);
    }

    @Override
    public Object instantiateItem(ViewGroup view, int position) {
        ImageView imageView = new ImageView(context);
        new DownloadImageTask(context, imageView).execute(imagePath.get(position));
        view.addView(imageView);
        return imageView;
    }

    private class DownloadImageTask extends BaseAsyncTask<String, Void, Bitmap> {
        ImageView bmImage;

        public DownloadImageTask(Context context, ImageView bmImage) {
            super(context);
            this.bmImage = bmImage;
        }

        @Override
        protected void onPreExecute() {

        }

        protected Bitmap doInBackground(String... urls) {
            String path = urls[0];
            Bitmap result = null;
            try {
                BitmapFactory.Options options = new BitmapFactory.Options();
                //先设置为true，获取bitmap宽度、高度
                options.inJustDecodeBounds = true;
                InputStream in = new java.net.URL(path).openStream();
                result = BitmapFactory.decodeStream(in, null, options);
                in.close();
                resetOptions(options);
                //后设置为false，加载进内存显示
                options.inJustDecodeBounds = false;
                // InputStream在读取完之后就到结尾了，需要再次打开才能重新读取，否则下面的result将返回null
                in = new java.net.URL(path).openStream();
                result = BitmapFactory.decodeStream(in, null, options);
            } catch (Exception e) {
                e.printStackTrace();
            }
            return result;
        }

        protected void onPostExecute(Bitmap result) {
            if (result != null) {
                bmImage.setImageBitmap(result);
                // PhotoViewAttacher绑定ImageView
                mAttacher = new PhotoViewAttacher(bmImage);
            }
        }
    }

    /**
     * 设置inSampleSize参数
     *
     * @param options
     * @return
     */
    public void resetOptions(BitmapFactory.Options options) {
        DisplayMetrics dm = context.getResources().getDisplayMetrics();
        int width = dm.widthPixels / 2;
        int height = dm.heightPixels / 2;
        options.inSampleSize = (options.outWidth / width > options.outHeight / height) ?
                options.outWidth / width : options.outHeight / height;
    }

}
```
在Adapter中，我为了求简便，直接在instantiateItem()中新建ImageView实例，然后传入到DownloadImageTask异步任务中进行下载，下载完成后更新，然后将PhotoViewAttacher与ImageView实例绑定。示例中没有使用PhoteView这个类，主要是用到了PhotoViewAttacher这个类。

我们会有一个显示缩略图的列表，给列表的Item设置如下点击事件：
```
@Override
public void ImageClicked(ArrayList<String> imagePath, int position) {
    Intent intent = new Intent(getActivity(), ImageBrowseActivity.class);
    intent.putExtra("position", position);
    intent.putStringArrayListExtra("imagePath", imagePath);
    startActivity(intent);
}
```
imagePath是原图的路径数组，position代表当前显示第几张。
点击事件设置好之后，便能实现网络图片浏览功能了。下面上效果图：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/12/picture-view1.png)

## 小结

 - 使用ViewPager来实现大图左右滑动。
 - 使用PhotoView开源库实现图片的缩放，移动等特性，[点击传送PhotoView开源库](https://github.com/chrisbanes/PhotoView)。

## 问题

 - 在使用PhotoView与ViewPager结合进行滑动显示的时候，会打出``ImageView no longer exists. You should not use this PhotoViewAttacher any more.``的Log，算不上错误，是个Warning，网上查找的解决办法是[修改cleapUp方法](https://github.com/chrisbanes/PhotoView/issues/67)。
 - 自己手贱，传了一些手机拍摄的“高清大图”，没滑2张就OOM了。也算是个契机让自己了解下Bitmap的内存优化。故在示例中会有resetOptions()方法以及这样的代码片段：
```
...

BitmapFactory.Options options = new BitmapFactory.Options();
                //先设置为true，获取bitmap宽度、高度
                options.inJustDecodeBounds = true;
                InputStream in = new java.net.URL(path).openStream();
                result = BitmapFactory.decodeStream(in, null, options);
                in.close();
                resetOptions(options);
                //后设置为false，加载进内存显示
                options.inJustDecodeBounds = false;
                // InputStream在读取完之后就到结尾了，需要再次打开才能重新读取，否则下面的result将返回null
                in = new java.net.URL(path).openStream();
                result = BitmapFactory.decodeStream(in, null, options);

...
```
Bitmap是OOM的一大凶器，所以碰到大图我们需要压缩。压缩可以通过设置BitmapFactory.Options，来生成压缩后的图片，主要是inSampleSize参数的设置。resetOptions()方法便是进行设置inSampleSize参数的，方法内部的具体逻辑则需要根据项目业务的需求来制定了。

另外，在第二次BitmapFactory.decodeStream()时，若不进行其他处理，会返回null，后面查询原因，是InputStream流在访问后，内部指针会指到尾部，相当于是传入的in是空的。所以需要添加一句``in = new java.net.URL(path).openStream();``，重新打开in，然后再使用decodeStream方法，返回bitmap。
