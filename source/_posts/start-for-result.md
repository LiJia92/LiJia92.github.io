---
title: startActivityForResult 的封装使用
date: 2018-10-10 16:59:25
tags:
 - 日常开发
---
StartActivityForResult 相信大家都用过，调用和返回结果是分散开的，使用起来最好还是封装一下比较好。这里利用一个空的 Fragment 进行封装，代码比较简单。
封装的回调类 StartForResultListener：
```
public interface StartForResultListener {

    /**
     * StartActivityForResult回调，同{@link android.app.Activity#onActivityResult(int, int, Intent)}
     */
    void onActivityResult(int requestCode, int resultCode, Intent data);

}
```

<!-- more -->

接收回调的 Fragment：
```
public class StartForResultFragment extends Fragment {

    private StartForResultListener mListener;

    public void setListener(StartForResultListener listener) {
        mListener = listener;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (mListener != null) {
            mListener.onActivityResult(requestCode, resultCode, data);
            mListener = null;
        }
    }
}
```
封装入口类 StartForResult：
```
public class StartForResult {

    private static final String TAG = "StartForResult";

    private static final String FRAG_TAG = "__start_for_result";

    private StartForResultFragment mFragment;

    public static StartForResult from(Activity activity) {
        return new StartForResult(activity);
    }

    private StartForResult(Activity activity) {
        if (!isActivityValid(activity)) {
            LogUtils.e(TAG, "Activity is null or has finished");
            return;
        }
        mFragment = (StartForResultFragment) activity.getFragmentManager().findFragmentByTag(FRAG_TAG);
        if (mFragment == null) {
            mFragment = new StartForResultFragment();
            activity.getFragmentManager()
                    .beginTransaction()
                    .add(mFragment, FRAG_TAG)
                    .commitAllowingStateLoss();
            activity.getFragmentManager().executePendingTransactions();
        }
    }

    public void startForResult(Intent intent, int requestCode, StartForResultListener listener) {
        if (requestCode <= 0 || listener == null) {
            LogUtils.w(TAG, "RequestCode should in >0 and listener should not be null");
        }
        if (mFragment == null) {
            LogUtils.w(TAG, "Please check you activity state");
            return;
        }
        mFragment.setListener(listener);
        mFragment.startActivityForResult(intent, requestCode);
    }


    @SuppressWarnings("RedundantIfStatement")
    private static boolean isActivityValid(Activity activity) {
        if (activity == null || activity.isFinishing()) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && activity.isDestroyed()) {
            return false;
        }
        return true;
    }
}
```
使用时，仅需要传入一个 Activity：
```
StartForResult.from(activity).startForResult(intent, REQUEST_CODE_FOR_PIC) { requestCode, resultCode, data ->
	//  处理返回的结果
}
```
这样，逻辑不在分散，在哪里调用在哪里处理结果，不用再跳来跳去了~