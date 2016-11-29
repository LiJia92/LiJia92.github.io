---
title: Android仿美团下拉刷新
date: 2016-04-18 16:07:15
tags:
 - 自定义View
---

在之前看过一篇文章[Android自定义控件之仿美团下拉刷新](http://blog.csdn.net/nugongahou110/article/details/49557875)，就是实现仿美团下拉刷新。一直对ListView等控件的下拉刷新的了解程度，可能也就停留在``用HeaderView来实现，然后重写onTouchEvent``，但是具体应该是怎样的呢？一直没有实际动手自己写过，于是抽空自己照着这篇博客自己写了一遍，以加深自己的理解。我对原博客进行摘录，重点写出一些对自己帮助大的内容。

## 刷新状态
一般下拉刷新应该都是会有三种状态：下拉刷新、松开刷新、正在刷新。
### 下拉刷新
实现思路：自定义View，通过设置进度值进行缩放。
用SeekBar来模仿一下下拉距离的进度。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/refresh-listview3.gif)

<!-- more -->

自定义View代码：
```
public class RefreshFirstView extends View {

    private Bitmap firstBitmap;
    private Bitmap endBitmap;
    private float mCurrentProgress;
    private int measuredWidth;
    private int measuredHeight;
    private Bitmap scaledBitmap;

    public RefreshFirstView(Context context) {
        super(context);
        init(context);
    }

    public RefreshFirstView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public RefreshFirstView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        firstBitmap = Bitmap.createBitmap(BitmapFactory.decodeResource(context.getResources(), R.drawable.pull_image));
        endBitmap = Bitmap.createBitmap(BitmapFactory.decodeResource(getResources(), R.drawable.pull_end_image_frame_05));
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(measureWidth(widthMeasureSpec), measureWidth(widthMeasureSpec) * endBitmap.getHeight() / endBitmap.getWidth());
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right,
                            int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        measuredWidth = getMeasuredWidth();
        measuredHeight = getMeasuredHeight();
        //根据第二阶段娃娃宽高  给椭圆形图片进行等比例的缩放
        scaledBitmap = Bitmap.createScaledBitmap(firstBitmap, measuredWidth, measuredWidth * firstBitmap.getHeight() / firstBitmap.getWidth(), true);
    }

    private int measureWidth(int widMeasureSpec) {
        int result;
        int size = MeasureSpec.getSize(widMeasureSpec);
        int mode = MeasureSpec.getMode(widMeasureSpec);
        if (mode == MeasureSpec.EXACTLY) {
            result = size;
        } else {
            result = endBitmap.getWidth();
            if (mode == MeasureSpec.AT_MOST) {
                result = Math.min(result, size);
            }
        }
        return result;
    }


    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        // 通过画布缩放，控制View缩放
        canvas.scale(mCurrentProgress, mCurrentProgress, measuredWidth / 2, measuredHeight / 2);
        canvas.drawBitmap(scaledBitmap, 0, measuredHeight / 4, null);
    }

    public void setCurrentProgress(float currentProgress) {
        this.mCurrentProgress = currentProgress;
    }

}
```
### 松开刷新
这里主要是一个帧动画。
```
<?xml version="1.0" encoding="utf-8"?>
<animation-list xmlns:android="http://schemas.android.com/apk/res/android"
    android:oneshot="true">
    <item
        android:drawable="@drawable/pull_end_image_frame_01"
        android:duration="100" />
    <item
        android:drawable="@drawable/pull_end_image_frame_02"
        android:duration="100" />
    <item
        android:drawable="@drawable/pull_end_image_frame_03"
        android:duration="100" />
    <item
        android:drawable="@drawable/pull_end_image_frame_04"
        android:duration="100" />
    <item
        android:drawable="@drawable/pull_end_image_frame_05"
        android:duration="100" />
</animation-list>
```
### 正在刷新
与松开刷新一样，也是一个帧动画，这里便不做赘述。

三种状态通过自定义View，重写onMeasure来确保三个状态的View的宽高保持一致。

## 下拉刷新的实现
先贴一下原博客的代码：
```
public class MeiTuanListView extends ListView implements AbsListView.OnScrollListener{
    private static final int DONE = 0;
    private static final int PULL_TO_REFRESH = 1;
    private static final int RELEASE_TO_REFRESH = 2;
    private static final int REFRESHING = 3;
    private static final int RATIO = 3;
    private LinearLayout headerView;
    private int headerViewHeight;
    private float startY;
    private float offsetY;
    private TextView tv_pull_to_refresh;
    private OnMeiTuanRefreshListener mOnRefreshListener;
    private int state;
    private int mFirstVisibleItem;
    private boolean isRecord;
    private boolean isEnd;
    private boolean isRefreable;
    private FrameLayout mAnimContainer;
    private Animation animation;
    private SimpleDateFormat format;
    private MeiTuanRefreshFirstStepView mFirstView;
    private MeiTuanRefreshSecondStepView mSecondView;
    private AnimationDrawable secondAnim;
    private MeiTuanRefreshThirdStepView mThirdView;
    private AnimationDrawable thirdAnim;

    public MeiTuanListView(Context context) {
        super(context);
        init(context);
    }

    public MeiTuanListView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public MeiTuanListView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    public interface OnMeiTuanRefreshListener{
        void onRefresh();
    }

    /**
     * 回调接口，想实现下拉刷新的listview实现此接口
     * @param onRefreshListener
     */
    public void setOnMeiTuanRefreshListener(OnMeiTuanRefreshListener onRefreshListener){
        mOnRefreshListener = onRefreshListener;
        isRefreable = true;
    }

    /**
     * 刷新完毕，从主线程发送过来，并且改变headerView的状态和文字动画信息
     */
    public void setOnRefreshComplete(){
        //一定要将isEnd设置为true，以便于下次的下拉刷新
        isEnd = true;
        state = DONE;

        changeHeaderByState(state);
    }

    private void init(Context context) {
        setOverScrollMode(View.OVER_SCROLL_NEVER);
        setOnScrollListener(this);

        headerView = (LinearLayout) LayoutInflater.from(context).inflate(R.layout.meituan_item, null, false);
        mFirstView = (MeiTuanRefreshFirstStepView) headerView.findViewById(R.id.first_view);
        tv_pull_to_refresh = (TextView) headerView.findViewById(R.id.tv_pull_to_refresh);
        mSecondView = (MeiTuanRefreshSecondStepView) headerView.findViewById(R.id.second_view);
        mSecondView.setBackgroundResource(R.drawable.pull_to_refresh_second_anim);
        secondAnim = (AnimationDrawable) mSecondView.getBackground();
        mThirdView = (MeiTuanRefreshThirdStepView) headerView.findViewById(R.id.third_view);
        mThirdView.setBackgroundResource(R.drawable.pull_to_refresh_third_anim);
        thirdAnim = (AnimationDrawable) mThirdView.getBackground();

        measureView(headerView);
        addHeaderView(headerView);
        headerViewHeight = headerView.getMeasuredHeight();
        headerView.setPadding(0, -headerViewHeight, 0, 0);
        Log.i("zhangqi","headerViewHeight="+headerViewHeight);

        state = DONE;
        isEnd = true;
        isRefreable = false;
    }




    @Override
    public void onScrollStateChanged(AbsListView absListView, int i) {
    }
    @Override
    public void onScroll(AbsListView absListView, int firstVisibleItem, int visibleItemCount, int totalItemCount) {
        mFirstVisibleItem = firstVisibleItem;
    }

    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        if (isEnd) {//如果现在时结束的状态，即刷新完毕了，可以再次刷新了，在onRefreshComplete中设置
            if (isRefreable) {//如果现在是可刷新状态   在setOnMeiTuanListener中设置为true
                switch (ev.getAction()){
                    //用户按下
                case MotionEvent.ACTION_DOWN:
                    //如果当前是在listview顶部并且没有记录y坐标
                    if (mFirstVisibleItem == 0 && !isRecord) {
                        //将isRecord置为true，说明现在已记录y坐标
                        isRecord = true;
                        //将当前y坐标赋值给startY起始y坐标
                        startY = ev.getY();
                    }
                    break;
                //用户滑动
                case MotionEvent.ACTION_MOVE:
                    //再次得到y坐标，用来和startY相减来计算offsetY位移值
                    float tempY = ev.getY();
                    //再起判断一下是否为listview顶部并且没有记录y坐标
                    if (mFirstVisibleItem == 0 && !isRecord) {
                        isRecord = true;
                        startY = tempY;
                    }
                    //如果当前状态不是正在刷新的状态，并且已经记录了y坐标
                    if (state!=REFRESHING && isRecord ) {
                        //计算y的偏移量
                        offsetY = tempY - startY;
                        //计算当前滑动的高度
                        float currentHeight = (-headerViewHeight+offsetY/3);
                        //用当前滑动的高度和头部headerView的总高度进行比 计算出当前滑动的百分比 0到1
                        float currentProgress = 1+currentHeight/headerViewHeight;
                        //如果当前百分比大于1了，将其设置为1，目的是让第一个状态的椭圆不再继续变大
                        if (currentProgress>=1) {
                            currentProgress = 1;
                        }
                        //如果当前的状态是放开刷新，并且已经记录y坐标
                        if (state == RELEASE_TO_REFRESH && isRecord) {
                            setSelection(0);
                            //如果当前滑动的距离小于headerView的总高度
                            if (-headerViewHeight+offsetY/RATIO<0) {
                                //将状态置为下拉刷新状态
                                state = PULL_TO_REFRESH;
                                //根据状态改变headerView，主要是更新动画和文字等信息
                                changeHeaderByState(state);
                                //如果当前y的位移值小于0，即为headerView隐藏了
                            }else if (offsetY<=0) {
                                //将状态变为done
                                state = DONE;
                                //根据状态改变headerView，主要是更新动画和文字等信息
                                changeHeaderByState(state);
                            }
                        }
                        //如果当前状态为下拉刷新并且已经记录y坐标
                        if (state == PULL_TO_REFRESH && isRecord) {
                            setSelection(0);
                            //如果下拉距离大于等于headerView的总高度
                            if (-headerViewHeight+offsetY/RATIO>=0) {
                                //将状态变为放开刷新
                                state = RELEASE_TO_REFRESH;
                                //根据状态改变headerView，主要是更新动画和文字等信息
                                changeHeaderByState(state);
                                //如果当前y的位移值小于0，即为headerView隐藏了
                            }else if (offsetY<=0) {
                                //将状态变为done
                                state = DONE;
                                //根据状态改变headerView，主要是更新动画和文字等信息
                                changeHeaderByState(state);
                            }
                        }
                        //如果当前状态为done并且已经记录y坐标
                        if (state == DONE && isRecord) {
                            //如果位移值大于0
                            if (offsetY>=0) {
                                //将状态改为下拉刷新状态
                                state = PULL_TO_REFRESH;
                            }
                        }
                        //如果为下拉刷新状态
                        if (state == PULL_TO_REFRESH) {
                            //则改变headerView的padding来实现下拉的效果
                            headerView.setPadding(0,(int)(-headerViewHeight+offsetY/RATIO) ,0,0);
                            //给第一个状态的View设置当前进度值
                            mFirstView.setCurrentProgress(currentProgress);
                            //重画
                            mFirstView.postInvalidate();
                        }
                        //如果为放开刷新状态
                        if (state == RELEASE_TO_REFRESH) {
                            //改变headerView的padding值
                            headerView.setPadding(0,(int)(-headerViewHeight+offsetY/RATIO) ,0, 0);
                            //给第一个状态的View设置当前进度值
                            mFirstView.setCurrentProgress(currentProgress);
                            //重画
                            mFirstView.postInvalidate();
                        }
                    }
                    break;
                //当用户手指抬起时
                case MotionEvent.ACTION_UP:
                    //如果当前状态为下拉刷新状态
                    if (state == PULL_TO_REFRESH) {
                        //平滑的隐藏headerView
                        this.smoothScrollBy((int)(-headerViewHeight+offsetY/RATIO)+headerViewHeight, 500);
                        //根据状态改变headerView
                        changeHeaderByState(state);
                    }
                    //如果当前状态为放开刷新
                    if (state == RELEASE_TO_REFRESH) {
                        //平滑的滑到正好显示headerView
                        this.smoothScrollBy((int)(-headerViewHeight+offsetY/RATIO), 500);
                        //将当前状态设置为正在刷新
                        state = REFRESHING;
                        //回调接口的onRefresh方法
                        mOnRefreshListener.onRefresh();
                        //根据状态改变headerView
                        changeHeaderByState(state);
                    }
                    //这一套手势执行完，一定别忘了将记录y坐标的isRecord改为false，以便于下一次手势的执行
                    isRecord = false;
                    break;
                }

            }
        }
        return super.onTouchEvent(ev);
    }

    /**
     * 根据状态改变headerView的动画和文字显示
     * @param state
     */
    private void changeHeaderByState(int state){
        switch (state) {
        case DONE://如果的隐藏的状态
            //设置headerView的padding为隐藏
            headerView.setPadding(0, -headerViewHeight, 0, 0);
            //第一状态的view显示出来
            mFirstView.setVisibility(View.VISIBLE);
            //第二状态的view隐藏起来
            mSecondView.setVisibility(View.GONE);
            //停止第二状态的动画
            secondAnim.stop();
            //第三状态的view隐藏起来
            mThirdView.setVisibility(View.GONE);
            //停止第三状态的动画
            thirdAnim.stop();
            break;
        case RELEASE_TO_REFRESH://当前状态为放开刷新
            //文字显示为放开刷新
            tv_pull_to_refresh.setText("放开刷新");
            //第一状态view隐藏起来
            mFirstView.setVisibility(View.GONE);
            //第二状态view显示出来
            mSecondView.setVisibility(View.VISIBLE);
            //播放第二状态的动画
            secondAnim.start();
            //第三状态view隐藏起来
            mThirdView.setVisibility(View.GONE);
            //停止第三状态的动画
            thirdAnim.stop();
            break;
        case PULL_TO_REFRESH://当前状态为下拉刷新
            //设置文字为下拉刷新
            tv_pull_to_refresh.setText("下拉刷新");
            //第一状态view显示出来
            mFirstView.setVisibility(View.VISIBLE);
            //第二状态view隐藏起来
            mSecondView.setVisibility(View.GONE);
            //第二状态动画停止
            secondAnim.stop();
            //第三状态view隐藏起来
            mThirdView.setVisibility(View.GONE);
            //第三状态动画停止
            thirdAnim.stop();
            break;
        case REFRESHING://当前状态为正在刷新
            //文字设置为正在刷新
            tv_pull_to_refresh.setText("正在刷新");
            //第一状态view隐藏起来
            mFirstView.setVisibility(View.GONE);
            //第三状态view显示出来
            mThirdView.setVisibility(View.VISIBLE);
            //第二状态view隐藏起来
            mSecondView.setVisibility(View.GONE);
            //停止第二状态动画
            secondAnim.stop();
            //启动第三状态view
            thirdAnim.start();
            break;
        default:
            break;
        }
    }


    private void measureView(View child) {
        ViewGroup.LayoutParams p = child.getLayoutParams();
        if (p == null) {
            p = new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT);
        }
        int childWidthSpec = ViewGroup.getChildMeasureSpec(0, 0 + 0, p.width);
        int lpHeight = p.height;
        int childHeightSpec;
        if (lpHeight > 0) {
            childHeightSpec = MeasureSpec.makeMeasureSpec(lpHeight,
                    MeasureSpec.EXACTLY);
        } else {
            childHeightSpec = MeasureSpec.makeMeasureSpec(0,
                    MeasureSpec.UNSPECIFIED);
        }
        child.measure(childWidthSpec, childHeightSpec);
    }


}
```
代码中已经有了很详细的注释了，看起来应该会比较轻松。

## 改进
写完之后运行，发现有2个地方可以改进。
### 下拉白块
在下拉刷新的时候，若下拉的高度很高，那么松开刷新后，再次下拉，会出现很大的一个空白块，影响视觉。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/refresh-listview4.gif)
导致该问题的原因是在``RELEASE_TO_REFRESH``状态下``ACTION_UP``时，只是利用smoothScrollBy滑动到headerView的显示位置。但是此时，headerView的paddingTop属性依然是``ACTION_MOVE``中设置的``headerView.setPadding(0,(int)(-headerViewHeight+offsetY/RATIO) ,0, 0);``，其值跟offsetY有关，offsetY越大，那么paddingTop值就会越大，导致再次下拉会出现很大的空白块。

改进办法：利用Scroller滑动辅助类替换smoothScrollBy，在滑动的过程中不停设置headerView的paddingTop值。当滑动结束时，headerView的paddingTop正好等于0，即刚刚好显示。
### 刷新结束后立刻消失
刷新结束后，会直接设置headerView的paddingTop为-headerViewHeight，导致headerView立刻不可见，会显得比较突兀。

改进办法：依然是利用Scroller类滑动辅助类，通过滑动动画使headerView不可见。
改进后，我的代码是这样的:
```
public class RefreshListView extends ListView implements ListView.OnScrollListener {
    /**
     * 刷新四种状态
     */
    public final static int DONE = 0; // 刷新完成
    public final static int PULL_TO_REFRESH = 1; // 下拉刷新
    public final static int RELEASE_TO_REFRESH = 2; // 松开刷新
    public final static int REFRESHING = 3; // 正在刷新

    private static final int RATIO = 3; // 滑动的比例值
    private int state; // 当前的状态
    private boolean isRefreshable; // 是否可刷新
    private boolean isRecord; // 是否开始准备下拉刷新
    private boolean refreshEnd; // 是否刷新结束
    private int mFirstVisibleItem; // 当前第一个可见Item
    private LinearLayout headerView; // 头布局
    private TextView refreshText; // 刷新文字说明
    private RefreshFirstView firstView; // 下拉刷新
    private RefreshSecondView secondView; // 松开刷新
    private RefreshThirdView thirdView; // 正在刷新
    private AnimationDrawable secondAnim; // secondView对应的动画
    private AnimationDrawable thirdAnim; // thirdView对应的动画
    private int headerViewHeight; // 头布局的高度
    private float startY; // 起始Y坐标
    private float offsetY; // Y坐标上的偏移量
    private OnRefreshListener refreshListener; // 回调接口
    // 滑动类
    private Scroller mScroller = null;

    public RefreshListView(Context context) {
        super(context);
        init(context);
    }

    public RefreshListView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public RefreshListView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    public void setRefreshListener(OnRefreshListener refreshListener) {
        this.refreshListener = refreshListener;
        isRefreshable = true;
    }

    /**
     * 初始化
     *
     * @param context
     */
    private void init(Context context) {
        setOverScrollMode(View.OVER_SCROLL_NEVER);
        setOnScrollListener(this);

        mScroller = new Scroller(context);

        headerView = (LinearLayout) LayoutInflater.from(context).inflate(R.layout.list_header, this, false);
        refreshText = (TextView) headerView.findViewById(R.id.pull_to_refresh);
        firstView = (RefreshFirstView) headerView.findViewById(R.id.first_view);
        secondView = (RefreshSecondView) headerView.findViewById(R.id.second_view);
        thirdView = (RefreshThirdView) headerView.findViewById(R.id.third_view);
        secondAnim = (AnimationDrawable) secondView.getBackground();
        thirdAnim = (AnimationDrawable) thirdView.getBackground();

        measureView(headerView);
        addHeaderView(headerView);
        headerViewHeight = headerView.getMeasuredHeight();
        headerView.setPadding(0, -headerViewHeight, 0, 0); // 全局通过设置headerView的paddingTop来控制内部View的显示

        state = DONE;
        isRefreshable = false;
        isRecord = false;
    }

    @Override
    public void computeScroll() {
        if (mScroller.computeScrollOffset()) {
            setPaddingTop(mScroller.getCurrY());
        }
    }

    private void setPaddingTop(int paddingTop) {
        headerView.setPadding(0, paddingTop, 0, 0);
        headerView.postInvalidate();
    }

    @Override
    public void onScrollStateChanged(AbsListView view, int scrollState) {

    }

    @Override
    public void onScroll(AbsListView view, int firstVisibleItem, int visibleItemCount, int totalItemCount) {
        mFirstVisibleItem = firstVisibleItem;
    }

    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        if (isRefreshable) {//如果现在是可刷新状态   在setOnMeiTuanListener中设置为true
            switch (ev.getAction()) {
                //用户按下
                case MotionEvent.ACTION_DOWN:
                    if (mFirstVisibleItem == 0 && !isRecord) {
                        //将isRecord置为true，说明现在已记录y坐标
                        isRecord = true;
                        startY = ev.getY();
                    }
                    break;
                //用户滑动
                case MotionEvent.ACTION_MOVE:
                    //再次得到y坐标，用来和startY相减来计算offsetY位移值
                    float tempY = ev.getY();
                    //再判断一次
                    if (mFirstVisibleItem == 0 && !isRecord) {
                        isRecord = true;
                        startY = tempY;
                    }
                    //如果当前状态不是正在刷新的状态，并且已经记录了y坐标
                    if (state != REFRESHING && isRecord) {
                        //计算y的偏移量
                        offsetY = tempY - startY;
                        //计算当前滑动的高度
                        float currentHeight = (-headerViewHeight + offsetY / 3);
                        //用当前滑动的高度和头部headerView的总高度进行比 计算出当前滑动的百分比 0到1
                        float currentProgress = 1 + currentHeight / headerViewHeight;
                        //如果当前百分比大于1了，将其设置为1，目的是让第一个状态的椭圆不再继续变大
                        if (currentProgress >= 1) {
                            currentProgress = 1;
                        }
                        //如果当前的状态是放开刷新，并且已经记录y坐标
                        if (state == RELEASE_TO_REFRESH && isRecord) {
                            setSelection(0);
                            //如果当前滑动的距离小于headerView的总高度
                            if (-headerViewHeight + offsetY / RATIO < 0) {
                                //将状态置为下拉刷新状态
                                state = PULL_TO_REFRESH;
                                changeHeaderByState(state);
                                //如果当前y的位移值小于0，即为headerView隐藏了
                            } else if (offsetY <= 0) {
                                //将状态变为done
                                state = DONE;
                                changeHeaderByState(state);
                            }
                        }
                        //如果当前状态为下拉刷新并且已经记录y坐标
                        if (state == PULL_TO_REFRESH && isRecord) {
                            setSelection(0);
                            //如果下拉距离大于等于headerView的总高度
                            if (-headerViewHeight + offsetY / RATIO >= 0) {
                                //将状态变为放开刷新
                                state = RELEASE_TO_REFRESH;
                                changeHeaderByState(state);
                                //如果当前y的位移值小于0，即为headerView隐藏了
                            } else if (offsetY <= 0) {
                                //将状态变为done
                                state = DONE;
                                changeHeaderByState(state);
                            }
                        }
                        //如果当前状态为done并且已经记录y坐标
                        if (state == DONE && isRecord) {
                            //如果位移值大于0
                            if (offsetY >= 0) {
                                //将状态改为下拉刷新状态
                                state = PULL_TO_REFRESH;
                            }
                        }
                        //如果为下拉刷新状态
                        if (state == PULL_TO_REFRESH) {
                            //则改变headerView的padding来实现下拉的效果
                            headerView.setPadding(0, (int) (-headerViewHeight + offsetY / RATIO), 0, 0);
                            //给第一个状态的View设置当前进度值
                            firstView.setCurrentProgress(currentProgress);
                            //重画
                            firstView.postInvalidate();
                        }
                        //如果为放开刷新状态
                        if (state == RELEASE_TO_REFRESH) {
                            //改变headerView的padding值
                            headerView.setPadding(0, (int) (-headerViewHeight + offsetY / RATIO), 0, 0);
                            //给第一个状态的View设置当前进度值
                            firstView.setCurrentProgress(currentProgress);
                            //重画
                            firstView.postInvalidate();
                        }
                    }
                    break;
                default:
                    //如果当前状态为下拉刷新状态
                    if (state == PULL_TO_REFRESH) {
                        //平滑的隐藏headerView
                        this.smoothScrollBy((int) (-headerViewHeight + offsetY / RATIO) + headerViewHeight, 500);
                        changeHeaderByState(state);
                    }
                    //如果当前状态为放开刷新
                    if (state == RELEASE_TO_REFRESH) {
                        //平滑的滑到正好显示headerView
//                        this.smoothScrollBy((int) (-headerViewHeight + offsetY / RATIO), 500);
                        mScroller.startScroll(0, (int) (-headerViewHeight + offsetY / RATIO), 0, (int) (headerViewHeight - offsetY / RATIO), 500);
                        //将当前状态设置为正在刷新
                        state = REFRESHING;
                        //回调接口的onRefresh方法
                        changeHeaderByState(state);
                        if (refreshListener != null) {
                            refreshListener.onRefresh();
                        }
                    }
                    //一套操作执行完，重置状态
                    isRecord = false;
                    break;
            }

        }
        return super.onTouchEvent(ev);
    }

    /**
     * 根据state改变HeaderView
     *
     * @param state
     */
    private void changeHeaderByState(int state) {
        switch (state) {
            case DONE:
                if (refreshEnd) { // 如果是刷新结束，则慢慢滚动消失
                    mScroller.startScroll(0, 0, 0, -headerViewHeight, 500);
                    refreshEnd = false;
                } else {
                    headerView.setPadding(0, -headerViewHeight, 0, 0);
                }
                firstView.setVisibility(VISIBLE);
                secondView.setVisibility(GONE);
                secondAnim.stop();
                thirdView.setVisibility(GONE);
                thirdAnim.stop();
                break;
            case PULL_TO_REFRESH:
                refreshText.setText("下拉刷新");
                firstView.setVisibility(View.VISIBLE);
                secondView.setVisibility(View.GONE);
                secondAnim.stop();
                thirdView.setVisibility(View.GONE);
                thirdAnim.stop();
                break;
            case RELEASE_TO_REFRESH:
                refreshText.setText("放开刷新");
                firstView.setVisibility(View.GONE);
                secondView.setVisibility(View.VISIBLE);
                secondAnim.start();
                thirdView.setVisibility(View.GONE);
                thirdAnim.stop();
                break;
            case REFRESHING:
                refreshText.setText("正在刷新");
                firstView.setVisibility(View.GONE);
                thirdView.setVisibility(View.VISIBLE);
                secondView.setVisibility(View.GONE);
                secondAnim.stop();
                thirdAnim.start();
                break;
            default:
                break;

        }
    }

    /**
     * 在init时View尚未绘制，为了获取HeaderView的高度，需要此方法提前绘制
     *
     * @param child
     */
    private void measureView(View child) {
        ViewGroup.LayoutParams p = child.getLayoutParams();
        if (p == null) {
            p = new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT);
        }
        int childWidthSpec = ViewGroup.getChildMeasureSpec(0, 0 + 0, p.width);
        int lpHeight = p.height;
        int childHeightSpec;
        if (lpHeight > 0) {
            childHeightSpec = MeasureSpec.makeMeasureSpec(lpHeight,
                    MeasureSpec.EXACTLY);
        } else {
            childHeightSpec = MeasureSpec.makeMeasureSpec(0,
                    MeasureSpec.UNSPECIFIED);
        }
        child.measure(childWidthSpec, childHeightSpec);
    }

    /**
     * 刷新结束后的回调，重置状态
     */
    public void setOnRefreshComplete() {
        state = DONE;
        refreshEnd = true;
        changeHeaderByState(state);
    }

    /**
     * 刷新回调接口
     */
    public interface OnRefreshListener {
        void onRefresh();
    }
}
```

## 讨论
在原博客中有这样的讨论：setOnRefreshComplete没必要暴露，隐藏在ListView里面更好。

个人觉得也确实是这样，我们使用下拉刷新只会关心onRefresh，对于setOnRefreshComplete是不关心的。
但是setOnRefreshComplete是必须要在onRefresh执行完之后才会执行，对于ListView它是不知道onRefresh在何时结束的，所以如果非要隐藏setOnRefreshComplete，我暂时没想到好的实现方案。

后面我找了一下下拉刷新相关的库，都有类似setOnRefreshComplete的方法。
XListView：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/refresh-listview1.png)
SwipeRefreshLayout:
![](http://7xryow.com1.z0.glb.clouddn.com/2016/04/refresh-listview2.png)
希望有想法的大神不吝赐教~

## 感受
1. 对于自己记忆中模棱两可的知识一定要自己动手做一遍，以加深印象。
2. 可以通过缩放canvas，来实现自定义view的缩放。
3. 通过设置paddingTop值来控制headerView的显示。
4. 在查看XListView相关源码的时候，发现它是这样在View还没显示的时候获取高度的：
```
mHeaderView.getViewTreeObserver().addOnGlobalLayoutListener(
		new OnGlobalLayoutListener() {
		@Override
		public void onGlobalLayout() {
			mHeaderViewHeight = mHeaderViewContent.getHeight();
			getViewTreeObserver().removeGlobalOnLayoutListener(this);
		}
});
```
5. onTouchEvent里的事件处理是非常繁杂的，当时自己写滑动删除的ListView时也重写过onTouchEvent，一定要细心。

## 我的代码
代码已上传至[我的Github](https://github.com/LiJia92/MyRefreshListView)。

## 参考文章
[Android自定义控件之仿美团下拉刷新](http://blog.csdn.net/nugongahou110/article/details/49557875)
