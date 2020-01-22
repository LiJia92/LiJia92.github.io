---
title: 记一次电信一键登录的“BUG”
date: 2020-01-22 16:34:56
tags:
 - 日常开发
---
马上就要过年了，这几天公司的人越来越少，而我打算坚守到最后一天，虽然事情比较少，但也能稍微自己看点东西，充充电。然而，项目发布的 App 在华为渠道被拒了，原因是：在登录页的隐私协议，不能默认勾选上。然后我看到了这样的代码：
```
<CheckBox
    android:id="@+id/check_box"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:button="@null"
    android:checked="true"
    android:drawableLeft="@drawable/account__protocol_agree"
    android:drawablePadding="7dp"
    android:enabled="false"
    android:text="同意"
    android:textColor="#333333"
    android:textSize="12dp" />
```

<!-- more -->

登录页的 CheckBox 被禁用了，肯定也是点不了的。然后改一下，默认不选中，并添加相应的逻辑判断。
```
<CheckBox
    android:id="@+id/check_box"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:button="@drawable/account__login_protocol_agree_bg"
    android:text="  同意"
    android:textColor="#333333"
    android:textSize="12dp" />

final boolean isChecked = protocolCb.isChecked();
if (!isChecked) {
    MainThreadUtils.toast("请先勾选同意《用户使用协议》和《隐私协议》");
    return;
}
```
一切都很顺利，直到电信一键登录。电信一键登录调起的页面是由 sdk 提供的，但是开发者可以提供布局，项目中的如下：
```
<LinearLayout
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_alignParentBottom="true"
    android:layout_centerHorizontal="true"
    android:layout_marginBottom="35dp"
    android:orientation="vertical">

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center_horizontal"
        android:orientation="horizontal">

        <CheckBox
            android:id="@+id/check_box"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:button="@null"
            android:checked="true"
            android:drawableLeft="@drawable/account__protocol_agree"
            android:drawablePadding="7dp"
            android:enabled="false"
            android:text=""
            android:textColor="#333333"
            android:textSize="12dp" />

        <!-- 底部隐私协议文本配置说明：
      1、SDK默认配置：
            a、文案的前面部分"登录即同意《天翼账号服务与隐私协议》"不可修改，
            b、《天翼账号服务与隐私协议》的色值通过android:tag属性设置，点击事件由SDK处理
        -->
        <TextView
            android:id="@+id/reg_china_mobile_agreement"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="登录即同意《天翼账号服务与隐私协议》"
            android:textSize="12dp"
            android:textColor="#333333"
            android:tag="#1DACF9"/>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="和"
            android:textColor="#333333"
            android:textSize="12dp" />

    </LinearLayout>

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center_horizontal"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/reg_user_agreement"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="《用户使用协议》"
            android:textColor="#1DACF9"
            android:textSize="12dp" />

        <TextView
            android:id="@+id/reg_user_privacy_agreement"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="《隐私协议》"
            android:textColor="#1DACF9"
            android:textSize="12dp" />
    </LinearLayout>
</LinearLayout>
```
调用代码如下：
```
public void openQuickLoginActivity(Context context, QuickLoginModel quickLoginModel) {
    AccountAssistUtils.onEvent("电信sdk-一键登录页");
    AuthPageConfig.Builder configBuilder = new AuthPageConfig.Builder()
            //设置“登录界面”的布局文件ID
            .setAuthActivityLayoutId(R.layout.account__activity_quick_login_china_telecom)
            //设置“登录界面”的控件ID
            .setAuthActivityViewIds(R.id.title_bar_left, //导航栏返回按钮ID
                    R.id.phone_number, //脱敏号码文本控件ID
                    R.id.ct_account_brand_view, //品牌标识文本控件ID
                    R.id.ct_account_login_btn, //登录按钮控件ID
                    R.id.ct_account_login_loading, //登录加载中控件ID（必须为ImageView控件）
                    R.id.btn_one_key_login, //登录按钮文本控件ID
                    R.id.btn_normal_login, //其他登录方式控件ID
                    R.id.check_box, //隐私协议勾选框控件ID
                    R.id.reg_china_mobile_agreement)  //“服务与隐私协议”文本控件ID;
            //设置隐私协议WebviewActivity的布局文件ID
            .setWebviewActivityLayoutId(R.layout.account__activity_quick_login_china_telecom_argument)
            //设置隐私协议界面的控件ID
            .setWebviewActivityViewIds(R.id.ct_account_webview_goback, //导航栏返回按钮ID
                    R.id.ct_account_progressbar_gradient, //进度条控件ID（ProgressBar控件）
                    R.id.ct_account_webview) //协议内容WebView控件ID
            .setExtendView1(R.id.reg_user_agreement,
                    v -> AccountAssistUtils.toUserAgreement(MucangConfig.getCurrentActivity()))
            .setExtendView2(R.id.reg_user_privacy_agreement, v -> {
                AccountAssistUtils.toUserPrivacyAgreement(MucangConfig.getCurrentActivity());
            });
    AuthPageConfig authPageConfig = configBuilder.build();
    CtAuth.getInstance().openAuthActivity(context, authPageConfig, new ResultListener() {
        @Override
        public void onResult(String json) {
            onGetResult(context, json, quickLoginModel);
        }
    });
}
```
然后我将 CheckBox 也类似的改了一下，结果崩溃了：
```
2020-01-21 16:49:13.087 32472-32472/? E/AndroidRuntime: FATAL EXCEPTION: main
    Process: com.xxx.xxx.android, PID: 32472
    android.content.res.Resources$NotFoundException: Resource ID #0x0
        at android.content.res.ResourcesImpl.getValue(ResourcesImpl.java:299)
        at android.content.res.Resources.loadXmlResourceParser(Resources.java:2398)
        at android.content.res.Resources.getLayout(Resources.java:1292)
        at android.view.LayoutInflater.inflate(LayoutInflater.java:534)
        at android.view.LayoutInflater.inflate(LayoutInflater.java:483)
        at com.android.internal.policy.PhoneWindow.setContentView(PhoneWindow.java:520)
        at com.android.internal.policy.HwPhoneWindow.setContentView(HwPhoneWindow.java:328)
        at android.app.Dialog.setContentView(Dialog.java:735)
        at cn.com.chinatelecom.account.sdk.ui.a.onCreate(Unknown Source:29)
        at android.app.Dialog.dispatchOnCreate(Dialog.java:579)
        at android.app.Dialog.show(Dialog.java:397)
        at cn.com.chinatelecom.account.sdk.ui.a.a(Unknown Source:2)
        at cn.com.chinatelecom.account.sdk.ui.b.b(Unknown Source:14)
        at cn.com.chinatelecom.account.sdk.ui.b.onClick(Unknown Source:18)
        at android.view.View.performClick(View.java:7192)
        at android.view.View.performClickInternal(View.java:7166)
        at android.view.View.access$3500(View.java:824)
        at android.view.View$PerformClick.run(View.java:27592)
        at android.os.Handler.handleCallback(Handler.java:888)
        at android.os.Handler.dispatchMessage(Handler.java:100)
        at android.os.Looper.loop(Looper.java:213)
        at android.app.ActivityThread.main(ActivityThread.java:8169)
        at java.lang.reflect.Method.invoke(Native Method)
        at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:513)
        at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1101)
```
说找不到资源文件，很懵逼，然后去查看 demo、相关文档，也没找到详细的说明。来来回回试了很多次，浪费了很多时间，也没找到问题所在，只要一改 CheckBox，必然崩溃。然后临近下班了，同事说帮我看看。然后定位异常，看到：
```
cn.com.chinatelecom.account.sdk.ui.a.onCreate
```
于是找到相关的包，尽管混淆了，但是也能看。
```
package cn.com.chinatelecom.account.sdk.ui;

public class a extends Dialog {
    private cn.com.chinatelecom.account.sdk.ui.a.a a;
    private Context b;
    private AuthPageConfig c;
    private AuthViewConfig d;
    private TextView e;
    private View f;
    private View g;

    public a(Context var1, int var2) {
        super(var1, var2);
        this.b = var1;
    }

    protected void onCreate(Bundle var1) {
        super.onCreate(var1);
        this.c = cn.com.chinatelecom.account.sdk.a.d.a().b();
        this.d = cn.com.chinatelecom.account.sdk.a.d.a().c();
        this.setContentView(this.c.k());
        this.setCanceledOnTouchOutside(false);
        this.a();
        if (this.d != null) {
            this.c();
        }

    }

    ...
}
```
然后异常报的找不到资源文件，那么可以合理猜测为 setContentView 时传入的参数无效，然后看到参数为 c.k。c 是 AuthPageConfig。然后再来看到 AuthPageConfig 的 k 参数是什么：
```
public static class Builder {
    private int a;
    private int b;
    private int c;
    private int d;
    private int e;
    private int f;
    private int g;
    private int h;
    private int i;
    private int j;
    private int k;
    private int l;
    private int m;
    private int n;
    private int o;
    private int p;
    private int q;
    private int r;
    private int s;
    private int t;
    private int u;
    private OnClickListener v;
    private OnClickListener w;
    private OnClickListener x;
    private boolean y;
    private boolean z;
    private int A;
    private int B;
    private int C;
    private int D;

    public AuthPageConfig.Builder setAuthActivityLayoutId(int var1) {
        this.a = var1;
        return this;
    }

    public AuthPageConfig.Builder setAuthActivityViewIds(int var1, int var2, int var3, int var4, int var5, int var6, int var7, int var8, int var9) {
        this.b = var1;
        this.c = var2;
        this.d = var3;
        this.e = var4;
        this.f = var5;
        this.g = var6;
        this.h = var7;
        this.i = var8;
        this.j = var9;
        return this;
    }

    public AuthPageConfig.Builder setPrivacyDialogLayoutId(int var1) {
        this.k = var1;
        return this;
    }

    ...
}
```
即通过``setPrivacyDialogLayoutId``方法来设置一个 Dialog 的布局。那么为什么会需要一个 Dialog 呢？而且是在改过 CheckBox 之后才会蹦。这个时候合理猜测：CheckBox 默认不勾选之后，登录需要提醒用户，sdk 内部则是使用 Dialog 来提醒用户。感觉完全说得通啊！于是再详细看 demo、文档：
```
private AuthPageConfig getAuthPageConfig(){
    AuthPageConfig.Builder configBuilder = new AuthPageConfig.Builder()
            //设置“登录界面”的布局文件ID
            .setAuthActivityLayoutId(R.layout.ct_account_auth_activity)
            //设置“登录界面”的控件ID
            .setAuthActivityViewIds(R.id.ct_account_nav_goback , //导航栏返回按钮ID
                    R.id.ct_account_desensphone , //脱敏号码文本控件ID
                    R.id.ct_account_brand_view, //品牌标识文本控件ID
                    R.id.ct_account_login_btn , //登录按钮控件ID
                    R.id.ct_account_login_loading , //登录加载中控件ID（必须为ImageView控件）
                    R.id.ct_account_login_text , //登录按钮文本控件ID
                    R.id.ct_account_other_login_way , //其他登录方式控件ID
                    R.id.ct_auth_privacy_checkbox , //隐私协议勾选框控件ID
                    R.id.ct_auth_privacy_text   //“服务与隐私协议”文本控件ID
            )

            //设置隐私协议对话框的布局文件ID
            .setPrivacyDialogLayoutId(R.layout.ct_account_privacy_dialog)
            //设置隐私协议对话框的控件ID
            .setPrivacyDialogViewIds(R.id.ct_account_dialog_privacy , //“服务与隐私协议”文本控件ID
                    R.id.ct_account_dialog_cancel , // 返回按钮控件ID
                    R.id.ct_account_dialog_confirm) //确认按钮控件ID
            //设置隐私协议WebviewActivity的布局文件ID
            .setWebviewActivityLayoutId(R.layout.ct_account_privacy_webview_activity)
            //设置隐私协议界面的控件ID
            .setWebviewActivityViewIds(R.id.ct_account_webview_goback , //导航栏返回按钮ID
                    R.id.ct_account_progressbar_gradient , //进度条控件ID（ProgressBar控件）
                    R.id.ct_account_webview); //协议内容WebView控件ID
    //扩展一：添加View及点击事件 （可选）
            //.setExtendView1(view1 ,onClickListener1)
            //.setExtendView1(view2 ,onClickListener2)
            //.setExtendView1(view2 ,onClickListener2)
    //扩展二：配置登录Activity进入动画和退出动画 （可选）
            //.setStartActivityTransition(enterAnim ,exitAnim)
            //.setFinishActivityTransition(enterAnim ,exitAnim)

    AuthPageConfig authPageConfig = configBuilder.build();
    return authPageConfig;
}
```
也看到了 setPrivacyDialogLayoutId、setPrivacyDialogViewIds 方法的调用，感觉猜测很合理，于是在调用的地方也加入了相应的代码：
```
//设置隐私协议对话框的布局文件ID
.setPrivacyDialogLayoutId(R.layout.account__dialog_privacy_agree)
//设置隐私协议对话框的控件ID
.setPrivacyDialogViewIds(R.id.account_dialog_privacy,
        R.id.account_dialog_cancel,
        R.id.account_dialog_confirm)
```
然后果然没蹦了，当不勾选 CheckBox 的时候，会弹出 Dialog 来提醒用户。至此，问题解决。

## 反思
很尴尬，反过头来看问题其实很简单，但是自己却没有找出来，同事耐着性子查看混淆的代码，顺藤摸瓜找到根源，也就不到一小时时间。而我却花费大量时间在表面上，完全瞎猜，觉得没道理。在编译、打包的期间也没有做更多的思考，看到混淆的代码也没跟进去，十分肤浅！写下这边文章倒不是真的因为这个 BUG 有多么难解，而是记录下自己的“狼狈”状态，以后一定要改进，凡事多跟进，多思考，耐着性子解决问题。