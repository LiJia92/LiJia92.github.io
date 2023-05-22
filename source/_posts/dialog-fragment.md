---
title: 记一次 DialogFragment 的错误使用
date: 2023-05-22 13:55:51
tags:
 - 日常开发
---
最近测试同学反馈一个问题：一个弹窗展示出来之后，点击按钮消失了。然后回到登录页再切回来时，这个弹窗又展示出来了。看到具体的代码：
```
public class HintDialog extends DialogFragment {

    private String content;
    private View.OnClickListener positiveClickListener;
    private String positive;

    public static HintDialog show(FragmentManager fm, String content, String positive,
                                  View.OnClickListener positiveClickListener) {
        HintDialog hintDialog = new HintDialog();
        hintDialog.content = content;
        hintDialog.positive = positive;
        hintDialog.positiveClickListener = positiveClickListener;
        hintDialog.show(fm, "HintDialog");
        return hintDialog;
    }

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        return JCommonDialog.createDialog(getActivity(), content, positive, positiveClickListener);
    }
}
```
<!-- more -->
然后看到 JCommonDialog createDialog 方法：
```
fun createDialog(context: Context, title: String, btnText: String, listener: View.OnClickListener): Dialog {
    return if (isRobot()) {
        JCommonDialog(
            context,
            DialogParams(title, "", null, null, btnText, listener, false)
        )
    } else {
        AlertDialog.Builder(context)
            .setMessage(title)
            .setCancelable(false)
            .setPositiveButton(btnText) { _: DialogInterface?, _: Int ->
                listener.onClick(null)
            }
            .create()
    }
}
```
isRobot 为 true 时，便会出现那个问题，如果是 false，使用 AlterDialog 便不会有那个问题。JCommonDialog 只是使用了一个自定义的布局，包含通用的标题、描述、左边按钮、右边按钮等元素，支持设置各种参数：
```
class JCommonDialog(context: Context, private val params: DialogParams) : Dialog(context, R.style.dialog){

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setData()
    }

    private fun setData() {
        viewBinding.titleTv.isGone = TextUtils.isEmpty(params.title)
        viewBinding.titleTv.text = params.title
        viewBinding.descTv.isGone = !TextUtils.isEmpty(params.title) && TextUtils.isEmpty(params.desc)
        viewBinding.descTv.text = params.desc
        params.rightText?.let {
            viewBinding.rightTv.visibility = View.VISIBLE
            viewBinding.rightTv.text = params.rightText
            viewBinding.rightTv.setOnClickListener {
                if (params.autoDismiss) {
                    dismiss()
                }
                params.rightClickListener?.onClick(it)
            }
        } ?: kotlin.run {
            viewBinding.rightTv.visibility = View.GONE
        }

        params.leftText?.let {
            if (viewBinding.rightTv.visibility == View.GONE) {
                viewBinding.leftTv.visibility = View.GONE
                viewBinding.rightTv.visibility = View.VISIBLE
                viewBinding.rightTv.text = params.leftText
                viewBinding.rightTv.setOnClickListener {
                    if (params.autoDismiss) {
                        dismiss()
                    }
                    params.leftClickListener?.onClick(it)
                }
            } else {
                viewBinding.leftTv.visibility = View.VISIBLE
                viewBinding.leftTv.text = params.leftText
                viewBinding.leftTv.setOnClickListener {
                    dismiss()
                    params.leftClickListener?.onClick(it)
                }
            }
        } ?: kotlin.run {
            viewBinding.leftTv.visibility = View.GONE
        }
        viewBinding.btnLl.isVisible = viewBinding.leftTv.isVisible || viewBinding.rightTv.isVisible
        viewBinding.leftTv.isSelected = params.selectedLeft
        viewBinding.rightTv.isSelected = !params.selectedLeft
        setOnDismissListener {
            params.closeClickListener?.onClick(viewBinding.closeIv)
        }
    }
}
```
场景中，autoDismiss 为 true，所以点击按钮后会调 dismiss 方法。从实际情况来看，也确实消失了。只不过在 Activity 重新 onResume 的时候，它又展示出来了。因为是继承自 DialogFragment，怀疑是虽然调了 dialog dismiss 方法，但是这个 fragment 还在。通过如下代码打印相关日志：
```
val fragment = supportFragmentManager.findFragmentByTag("HintDialog")
LogUtils.e("TAG","fragment:${fragment?.isAdded},${fragment?.isDetached},${fragment?.isInLayout}")
```
得到的结果是：
> true,false,false

而如果使用的是 AlertDialog，结果是：
> null,null,null

通过日志印证了猜测，因为场景中并没有用到 DialogFragment 的任何特性，于是直接改成了正常的 Dialog。修改之后问题便没有再出现了。但仍然有个问题困扰着我：都是使用 DialogFragment 的方式，**为什么 JCommonDialog 会有问题，而系统的 AlertDialog 则不会有问题呢**？
起初怀疑 AlterDialog dismiss 有自己的逻辑，但是看到的源码中并没有覆写 dismiss 方法，最终调用的都是 Dialog 的 dismiss 方法，将 JCommonDialog 改成继承自 AlertDialog 问题依然存在。有没有可能是 style 引起的？可惜去掉 style 问题依然存在。然后看到 AlertDialog 的其他源码，使用的都是  AlertController 类，看到源码也没啥特别的逻辑：
```
private final View.OnClickListener mButtonHandler = new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        final Message m;
        if (v == mButtonPositive && mButtonPositiveMessage != null) {
            m = Message.obtain(mButtonPositiveMessage);
        } else if (v == mButtonNegative && mButtonNegativeMessage != null) {
            m = Message.obtain(mButtonNegativeMessage);
        } else if (v == mButtonNeutral && mButtonNeutralMessage != null) {
            m = Message.obtain(mButtonNeutralMessage);
        } else {
            m = null;
        }

        if (m != null) {
            m.sendToTarget();
        }

        // Post a message so we dismiss after the above handlers are executed
        mHandler.obtainMessage(ButtonHandler.MSG_DISMISS_DIALOG, mDialogInterface)
                .sendToTarget();
    }
};

private static final class ButtonHandler extends Handler {
    // Button clicks have Message.what as the BUTTON{1,2,3} constant
    private static final int MSG_DISMISS_DIALOG = 1;

    private WeakReference<DialogInterface> mDialog;

    public ButtonHandler(DialogInterface dialog) {
        mDialog = new WeakReference<>(dialog);
    }

    @Override
    public void handleMessage(Message msg) {
        switch (msg.what) {

            case DialogInterface.BUTTON_POSITIVE:
            case DialogInterface.BUTTON_NEGATIVE:
            case DialogInterface.BUTTON_NEUTRAL:
                ((DialogInterface.OnClickListener) msg.obj).onClick(mDialog.get(), msg.what);
                break;

            case MSG_DISMISS_DIALOG:
                ((DialogInterface) msg.obj).dismiss();
        }
    }
}
```
点击一个按钮后，会执行相应的逻辑，然后立马就发一个 dismiss 的 message，执行的也是 Dialog 自身的 dismiss 方法，问题应该不在 AlterDialog。于是尝试屏蔽 JCommonDialog 的代码，不停尝试。最终发现：**去掉 setOnDismissListener 之后问题便不出现了**。于是怀疑是这个代码导致的，给 AlterDialog 也设置了 setOnDismissListener 对比测试一下，结果弹窗消失了，但压根没回调 onDismiss。突然转念一想，这不是用的 DialogFragment 嘛，为什么一直停留在 AlertDialog 上去寻找问题呢？于是看了看 DialogFragment 代码，一下子就清晰了：
```
private void prepareDialog(@Nullable Bundle savedInstanceState) {
    if (!mShowsDialog) {
        return;
    }

    if (!mDialogCreated) {
        try {
            mCreatingDialog = true;
            mDialog = onCreateDialog(savedInstanceState);
            // mShowsDialog might have changed in onCreateDialog, so we should only proceed
            // with setting up the dialog if mShowsDialog is still true
            if (mShowsDialog) {
                setupDialog(mDialog, mStyle);
                final Context context = getContext();
                if (context instanceof Activity) {
                    mDialog.setOwnerActivity((Activity) context);
                }
                mDialog.setCancelable(mCancelable);
                mDialog.setOnCancelListener(mOnCancelListener);
                mDialog.setOnDismissListener(mOnDismissListener);
                mDialogCreated = true;
            } else {
                // Ensure that when mShowsDialog is set to false in onCreateDialog
                // that getDialog() returns null
                mDialog = null;
            }
        } finally {
            mCreatingDialog = false;
        }
    }
}
```
DialogFragment 中的 prepareDialog 方法，会将创建出来的 Dialog 的 setCancelable、setOnCancelListener、setOnDismissListener 改成 DialogFragment 自己的 listener：
```
private DialogInterface.OnCancelListener mOnCancelListener =
        new DialogInterface.OnCancelListener() {
    @SuppressLint("SyntheticAccessor")
    @Override
    public void onCancel(@Nullable DialogInterface dialog) {
        if (mDialog != null) {
            DialogFragment.this.onCancel(mDialog);
        }
    }
};

private DialogInterface.OnDismissListener mOnDismissListener =
        new DialogInterface.OnDismissListener() {
    @SuppressLint("SyntheticAccessor")
    @Override
    public void onDismiss(@Nullable DialogInterface dialog) {
        if (mDialog != null) {
            DialogFragment.this.onDismiss(mDialog);
        }
    }
};
```
使用 AlertDialog 的方式，因为是在 Builder 里调用 setOnDismissListener，这个监听在 DialogFragment 创建出 Dialog 之后，马上就进行覆盖了。而使用 JCommonDialog 的方式，是在 Dialog 的 onCreate 方法进行设置的，而这个方法很显然是在 DialogFragment 设置监听之后。**也就是 DialogFragment 设置的监听，后面被 Dialog onCreate 方法里自己设置的监听给覆盖掉了，导致``DialogFragment.this.onDismiss(mDialog)``压根没有得到调用，那么 Fragment 相关的逻辑自然就丢失了。**这也印证了前面去掉 setOnDismissListener 问题便不再出现了。
因为解决问题的思路没搞对，所以排查起来浪费了不少时间，值得记录一下。**后续使用 DialogFragment 时，一定要注意 setCancelable、setOnCancelListener、setOnDismissListener 几个方法的使用！**
