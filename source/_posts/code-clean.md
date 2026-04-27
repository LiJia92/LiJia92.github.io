---
title: SonarQube 静态代码清理
date: 2026-04-16 10:07:58
tags:
 - Android 进阶
---
公司今年有个很大的任务，就是完成所有工程的静态代码清理。在搭建好 SonarQube 平台后，每个人都有一块责任田，各自负责静态代码清理。此文便是记录一下所处理的清理工作，后续开发工作应当避免这些问题。

<!-- more -->

## 修饰符排序
示例：
```
final static String WVJB_OVERRIDE_SCHEMA = "sp://";
```
SonarQube 提示：
```
Reorder the modifiers to comply with the Java Language Specification.
```
即``调整修饰符顺序以遵循Java语言规范。``应修改为：
```
static final String WVJB_OVERRIDE_SCHEMA = "sp://";
```
常见的修饰符推荐顺序为：
1. 访问控制符（ public / protected / private ）
2. 静态修饰符（ static ）
3. 最终修饰符（ final ）
4. 抽象修饰符（ abstract ）
5. 同步修饰符（ synchronized ）等

## 静态类构造函数
示例：
```
public class BridgeUtil {
    public static String parseFunctionName(String jsUrl) {
        // coding
    }
}
```
SonarQube 提示：
```
Add a private constructor to hide the implicit public one.
```
即``添加私有构造方法以隐藏默认的公共构造方法。``应修改为：
```
public class BridgeUtil {
    private BridgeUtil() {
    }

    public static String parseFunctionName(String jsUrl) {
        // coding
    }
}
```
工具类仅包含静态方法和常量，无需实例化，应该添加私有构造方法，以防止外部实例化。

## 自动资源管理
示例：
```
public static String assetFile2Str(Context c, String urlStr) {
    InputStream in = null;
    try {
        in = c.getAssets().open(urlStr);
        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(in));
        String line = null;
        StringBuilder sb = new StringBuilder();
        do {
            line = bufferedReader.readLine();
            if (line != null && !line.matches("^\\s*\\/\\/.*")) {
                sb.append(line);
            }
        } while (line != null);

        bufferedReader.close();
        in.close();

        return sb.toString();
    } catch (Exception e) {
        e.printStackTrace();
    } finally {
        if (in != null) {
            try {
                in.close();
            } catch (IOException e) {
            }
        }
    }
    return null;
}
```
SonarQube 提示：
```
Change this "try" to a try-with-resources. (sonar.java.source not set. Assuming 7 or greater.)
```
即``将此普通 try 语句转换为带资源的 try 语句。``应修改为：
```
public static String assetFile2Str(Context c, String urlStr) {
    try (InputStream in = c.getAssets().open(urlStr);
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(in))) {

        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = bufferedReader.readLine()) != null) {
            if (!line.matches("^\\s*\\/\\/.*")) {
                sb.append(line);
            }
        }
        return sb.toString();
    } catch (Exception e) {
        e.printStackTrace();
    }
    return null;
}
```
将传统的 try-catch-finally 资源管理方式，替换为 Java 7+ 引入的 try-with-resources 语法，以自动关闭资源并简化代码。

## 未使用的属性
示例：
```
private final String TAG = "BridgeWebView";
```
SonarQube 提示：
```
Remove this unused "TAG" private field.
```
即``删除未使用的属性。``应直接删掉。

## 命名
还是用上面的示例：
```
private final String TAG = "BridgeWebView";
```
假设需要保留 TAG 使用, SonarQube 提示：
```
Rename this field "TAG" to match the regular expression '^[a-z][a-zA-Z0-9]*$'.
```
即``命名不规范``，应该改为小写驼峰形式。

## 菱形运算符
示例：
```
Map<String, CallBackFunction> responseCallbacks = new HashMap<String, CallBackFunction>();
```
SonarQube 提示：
```
Replace the type specification in this constructor call with the diamond operator ("<>"). (sonar.java.source not set. Assuming 7 or greater.)
```
即``将此构造方法调用中的类型声明替换为菱形运算符（"<>")。``应修改为：
```
Map<String, CallBackFunction> responseCallbacks = new HashMap<>();
```

## 注释代码块
示例：
```
private void init() {
    this.setVerticalScrollBarEnabled(false);
    this.setHorizontalScrollBarEnabled(false);
    this.getSettings().setJavaScriptEnabled(true);
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
//            WebView.setWebContentsDebuggingEnabled(true);
//        }
    setBackgroundColor(android.R.color.transparent);
}
```
SonarQube 提示：
```
This block of commented-out lines of code should be removed.
```
即``应移除这段被注释掉的代码块。``应直接删掉。

## 空判断
示例：
```
if (list.size() == 0) {
    // code
}
```
SonarQube 提示：
```
Use isEmpty() to check whether the collection is empty or not.
```
即``使用 isEmpty() 方法检查集合是否为空。``应修改为：
```
if (list.isEmpty()) {
    // code
}
```

## 方法复杂度
示例：
```
void flushMessageQueue() {
    if (Thread.currentThread() == Looper.getMainLooper().getThread()) {
        loadUrl(BridgeUtil.JS_FETCH_QUEUE_FROM_JAVA, new CallBackFunction() {

            @Override
            public void onCallBack(String data) {
                // deserializeMessage
                List<Message> list = Message.toArrayList(data);

                if (list.size() == 0) {
                    return;
                }
                for (int i = 0; i < list.size(); i++) {
                    Message m = list.get(i);
                    String responseId = m.getResponseId();
                    // 是否是response
                    if (!TextUtils.isEmpty(responseId)) {
                        CallBackFunction function = responseCallbacks.get(responseId);
                        String responseData = m.getResponseData();
                        if (function != null) {
                            function.onCallBack(responseData);
                        }
                        responseCallbacks.remove(responseId);
                    } else {
                        CallBackFunction responseFunction = null;
                        // if had callbackId
                        final String callbackId = m.getCallbackId();
                        if (!TextUtils.isEmpty(callbackId)) {
                            responseFunction = new CallBackFunction() {
                                @Override
                                public void onCallBack(String data) {
                                    Message responseMsg = new Message();
                                    responseMsg.setResponseId(callbackId);
                                    responseMsg.setResponseData(data);
                                    queueMessage(responseMsg);
                                }
                            };
                        } else {
                            responseFunction = new CallBackFunction() {
                                @Override
                                public void onCallBack(String data) {
                                    // do nothing
                                }
                            };
                        }

                        BridgeHandler handler;
                        if (!TextUtils.isEmpty(m.getHandlerName())) {
                            String handlerName =  m.getHandlerName();
                            if (handlerName.contains("/")) {
                                handler = messageHandlers.get("requestCustomPlugin");
                                if (handler instanceof CustomPluginBridgeHandler) {
                                    ((CustomPluginBridgeHandler)handler).handler(BridgeWebView.this,handlerName, m.getData(), responseFunction);
                                }
                            } else {
                                handler = messageHandlers.get(handlerName);
                            }
                        } else {
                            handler = defaultHandler;
                        }
                        if (handler != null) {
                            handler.handler(BridgeWebView.this, m.getData(), responseFunction);
                        }
                    }
                }
            }
        });
    }
}
```
SonarQube 提示：
```
Refactor this method to reduce its Cognitive Complexity from 48 to the 15 allowed.
```
即``重构此方法以减少其认知复杂度从 48 到 15 允许的最大值。``可以修改为：
```
void flushMessageQueue() {
    if (Thread.currentThread() == Looper.getMainLooper().getThread()) {
        loadUrl(BridgeUtil.JS_FETCH_QUEUE_FROM_JAVA, this::dispatchMessage);
    }
}

/**
    * 分发消息（核心逻辑抽离，降低认知复杂度）
    */
private void dispatchMessage(String data) {
    List<Message> list = Message.toArrayList(data);
    if (list.isEmpty()) {
        return;
    }

    for (int i = 0; i < list.size(); i++) {
        Message message = list.get(i);
        handleMessage(message);
    }
}

/**
    * 处理单条消息
    */
private void handleMessage(Message message) {
    String responseId = message.getResponseId();

    // 处理响应消息
    if (!TextUtils.isEmpty(responseId)) {
        handleResponseMessage(message, responseId);
        return;
    }

    // 处理请求消息
    handleRequestMessage(message);
}

/**
    * 处理 Response 类型消息
    */
private void handleResponseMessage(Message message, String responseId) {
    CallBackFunction function = responseCallbacks.get(responseId);
    String responseData = message.getResponseData();

    if (function != null) {
        function.onCallBack(responseData);
    }
    responseCallbacks.remove(responseId);
}

/**
    * 处理 Request 类型消息
    */
private void handleRequestMessage(Message message) {
    CallBackFunction responseFunction = createResponseFunction(message);
    BridgeHandler handler = findMessageHandler(message);

    if (handler != null) {
        handler.handler(BridgeWebView.this, message.getData(), responseFunction);
    }
}

/**
    * 创建回调函数
    */
private CallBackFunction createResponseFunction(Message message) {
    final String callbackId = message.getCallbackId();

    if (!TextUtils.isEmpty(callbackId)) {
        return data -> {
            Message responseMsg = new Message();
            responseMsg.setResponseId(callbackId);
            responseMsg.setResponseData(data);
            queueMessage(responseMsg);
        };
    } else {
        return data -> {
            // do nothing
        };
    }
}

/**
    * 查找对应的 BridgeHandler
    */
private BridgeHandler findMessageHandler(Message message) {
    String handlerName = message.getHandlerName();

    if (TextUtils.isEmpty(handlerName)) {
        return defaultHandler;
    }

    if (handlerName.contains("/")) {
        BridgeHandler handler = messageHandlers.get("requestCustomPlugin");
        if (handler instanceof CustomPluginBridgeHandler) {
            ((CustomPluginBridgeHandler) handler).handler(
                    BridgeWebView.this,
                    handlerName,
                    message.getData(),
                    null
            );
        }
        return handler;
    } else {
        return messageHandlers.get(handlerName);
    }
}
```

## 空方法
示例：
```
open fun initPageConfig(pageConfig: FragmentPageConfig) {

}
```
SonarQube 提示：
```
Add a nested comment explaining why this function is empty or complete the implementation.
```
即``添加注释说明为什么此函数为空或完成实现。``可以增加相应注释：
```
open fun initPageConfig(pageConfig: FragmentPageConfig) {
    // 子类覆写
    // 或者 do thing 等等
}
```

## 空代码块
示例：
```
private get() {
    var sNavBarOverride: String? = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        try {
            val c = Class.forName("android.os.SystemProperties")
            val m = c.getDeclaredMethod("get", String::class.java)
            m.isAccessible = true
            sNavBarOverride = m.invoke(null, "qemu.hw.mainkeys") as String
        } catch (e: Throwable) {
        }
    }
    return sNavBarOverride
}
```
SonarQube 提示：
```
Either remove or fill this block of code.
```
即``删除或填充此代码块。``可以修改为：
```
private get() {
    var sNavBarOverride: String? = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        try {
            val c = Class.forName("android.os.SystemProperties")
            val m = c.getDeclaredMethod("get", String::class.java)
            m.isAccessible = true
            sNavBarOverride = m.invoke(null, "qemu.hw.mainkeys") as String
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }
    return sNavBarOverride
}
```

## TODO
示例：
```
var AMIGO = "amigo" // 金立 // todo
```
SonarQube 提示：
```
Complete the task associated to this TODO comment.
```
即``完成此 TODO 注释关联的任务。``如有需要完成的任务，需要完善代码。如果已经完成，或不需要了，则直接删除。


## 正则优化
示例：
```
public ROMInfo checkBuildProp(RomProperties properties) throws Exception {
    ROMInfo info = null;
    String versionName = properties.getProperty(BuildPropKeyList.Companion.getMIUI_VERSION_NANE());
    if (!TextUtils.isEmpty(versionName) && versionName.matches("[Vv]\\d+")) { // V9
        try {
            info = new ROMInfo(getRom());
            info.setBaseVersion(Integer.parseInt(versionName.substring(1)));

            String versionStr = properties.getProperty(BuildPropKeyList.Companion.getMIUI_VERSION());
            if (!TextUtils.isEmpty(versionStr)) {
                // 参考: 8.1.25 & V9.6.2.0.ODECNFD & V10.0.1.0.OAACNFH
                Matcher matcher = Pattern.compile("[Vv]?(\\d+(\\.\\d+)*)[.A-Za-z]*").matcher(versionStr);
                if (matcher.matches()) {
                    info.setVersion(matcher.group(1));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    return info;
}
```
SonarQube 提示：
```
Refactor this repetition that can lead to a stack overflow for large inputs.
```
即``重构此重复代码，以避免栈输入过大时的溢出问题。``因为代码中只用到了 group(1)，所以可以把正则表达式修改为：
```
"[Vv]?(\\d+(?:\\.\\d+)*)[.A-Za-z]*"
```
正则表达式引擎在处理重复结构时，会使用栈来跟踪匹配状态：

- 原始正则的 (\\.\\d+)* 会为每个匹配的子组创建栈帧
- 当输入超长时（如包含上百个版本号段），栈内存会被耗尽
- 非捕获组 (?:\\.\\d+)* 不会创建额外栈帧，大幅减少内存消耗

## 未使用的参数
示例：
```
private fun doGetRomType(context: Context): ROM {
    // code 没有用到 context
}
```
SonarQube 提示：
```
Remove this unused function parameter "context".
```
即``删除未使用的函数参数 "context"。``参数未使用应直接删掉。

## if 语句合并
示例：
```
if (checker.checkManufacturer(manufacturer)) {
    // 检查完 Manufacturer 后, 再核对一遍应用列表
    //if (checker.checkApplication(context))
    if (checker.checkRom()) return checker.getRom()
}
```
SonarQube 提示：
```
Merge this "if" statement with the nested one.
```
即``将此 if 语句与嵌套的 if 语句合并。``应修改为：
```
if (checker.checkManufacturer(manufacturer) && checker.checkRom()) {
    return checker.getRom()
}
```

## 方法参数过长
示例：
```
private fun loadNotificationImage(
        context: Context,
        imageUrl: String,
        @DrawableRes placeholderId: Int,
        @DrawableRes errorDrawableId: Int = placeholderId,
        notyId: Int = 0,
        notyBuilder: NotificationCompat.Builder? = null,
        roundingRadiusDp: Int = 10,
        failed: (() -> Unit)? = null,
        bitmapBlock: (bitmap: Bitmap, nId: Int, nBuilder: NotificationCompat.Builder?) -> Unit = { _, _, _ -> }
    ) {
    // code
}
```
SonarQube 提示：
```
This function has 9 parameters, which is greater than the 7 authorized.
```
即``此函数有 9 个参数，超过 7 个参数的授权。``应将参数抽取，可以修改为：
```
data class NotificationImageConfig(
        val context: Context,
        val imageUrl: String,
        @DrawableRes val placeholderId: Int,
        @DrawableRes val errorDrawableId: Int = placeholderId,
        val notyId: Int = 0,
        val notyBuilder: NotificationCompat.Builder? = null,
        val roundingRadiusDp: Int = 10,
        val failed: (() -> Unit)? = null,
        val bitmapBlock: (bitmap: Bitmap, nId: Int, nBuilder: NotificationCompat.Builder?) -> Unit = { _, _, _ -> }
    )

private fun loadNotificationImage(config: NotificationImageConfig) {
    val (context, imageUrl, placeholderId, errorDrawableId, notyId, notyBuilder, roundingRadiusDp, failed, bitmapBlock) = config
    // code
}
```
**修改方法签名一定要注意调用方**。

## Deprecated
示例：
```
@Deprecated("已废弃，使用PostDelay轻量级框架替代")
private var dismissPopupTimer = Timer("dismissPopupTimer_${totalNotifyCount.get()}")
```
SonarQube 提示：
```
Do not forget to remove this deprecated code someday.
```
即``此代码已废弃，应在将来移除。``需要仔细检查，确认是否有其他地方使用了此代码。若最终确认没有使用，即可删除。
另还有一种场景：
```
open operator fun <T : ShareViewModel?> get(key: String, modelClass: Class<T>): T {
    var viewModel: ShareViewModel? = childViewModelStore[key]
    if (modelClass.isInstance(viewModel)) {
        return viewModel as T
    } else {
        if (viewModel != null) {
            Log.w(baseSimpleClassName(), "viewModel not null")
        }
    }
    //noinspection TryWithIdenticalCatches
    try {
        viewModel = modelClass.newInstance()
    } catch (e: InstantiationException) {
        throw RuntimeException("Cannot create an instance of $modelClass", e)
    } catch (e: IllegalAccessException) {
        throw RuntimeException("Cannot create an instance of $modelClass", e)
    }
    childViewModelStore[key] = viewModel!!
    addCloseable(viewModel)
    return viewModel
}
```
modelClass.newInstance() 会有提示：
```
Deprecated code should not be used.
```
此场景需要寻找替代方法进行调用，不再调用已经标记为废弃的方法。

## 重复代码
示例：
```
when (info.downloadStatus) {
    download_status_running -> {
        holder.binding.tvProgress.setTextColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.sbProgress.setProgressColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.ivDownload.visibility = View.INVISIBLE
        holder.binding.tvDownloadDis.setTextColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.tvDownloadDis.text = ""
    }
    download_status_success -> {
        holder.binding.tvProgress.setTextColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.sbProgress.setProgressColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.ivDownload.visibility = View.INVISIBLE
        holder.binding.tvDownloadDis.setTextColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.tvDownloadDis.text = ""
    }
    // code
}
```
SonarQube 提示：
```
This branch's code block is the same as the block for the branch on line 52.
```
即``此分支的代码与第 52 行的代码相同。``应修改为：
```
when (info.downloadStatus) {
    download_status_running,
    download_status_success -> {
        holder.binding.tvProgress.setTextColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.sbProgress.setProgressColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.ivDownload.visibility = View.INVISIBLE
        holder.binding.tvDownloadDis.setTextColor(context.resources.getColor(R.color.download_color_item_text_selected))
        holder.binding.tvDownloadDis.text = ""
    }
    // code
}
```

## 枚举类重复字符串
示例：
```
public enum CloudNetErrorCode {
    // code
    TD7077(7077, "Exceeded the number of applications"),//一个月只能申请5次

    TD7085(7085,"The device does not exist"),//设备隔离校验,提示设备不存在
    //终端密码更改后被强制退出
    TD7088(7088, "Force to log out after the password changes"),

    //有终端ID的App 达到最大token最大数量后被强制退出最久未访问的会话
    TD7089(7089, "Exceeded the number of applications"),

    //账后注销后被强制退出
    TD7090(7090, "The account has been logged out"),

    //需要双因认证
    TD7091(7091, "Exceeded the number of applications"),

    // code
}
```
SonarQube 提示：
```
Define a constant instead of duplicating this literal "Exceeded the number of applications" 3 times.
```
即``字符串 "Exceeded the number of applications" 被重复写了 3 次，应定义一个常量来代替。``应修改为：
```
public enum CloudNetErrorCode {
    // code
    TD7077(7077, Const.MSG_EXCEEDED_APPLICATIONS),//一个月只能申请5次

    TD7085(7085,"The device does not exist"),//设备隔离校验,提示设备不存在
    //终端密码更改后被强制退出
    TD7088(7088, "Force to log out after the password changes"),

    //有终端ID的App 达到最大token最大数量后被强制退出最久未访问的会话
    TD7089(7089, Const.MSG_EXCEEDED_APPLICATIONS),

    //账后注销后被强制退出
    TD7090(7090, "The account has been logged out"),

    //需要双因认证
    TD7091(7091, Const.MSG_EXCEEDED_APPLICATIONS),

    // code

    private static class Const {
        public static final String MSG_EXCEEDED_APPLICATIONS = "Exceeded the number of applications";
    }
}
```
注意，枚举类比较特殊，若只是定义 public static final String 变量，也会报错：
```
Cannot read value of field 'MSG_EXCEEDED_APPLICATIONS' before the field's definition
```
所以需要提取到 Const 静态类中。

## public 类变量
示例：
```
public abstract class CheckedExpandableGroup extends ExpandableGroup {
    public boolean[] selectedChildren;
    // code
}
```
SonarQube 提示：
```
Make selectedChildren a static final constant or non-public and provide accessors if needed.
```
即``selectedChildren 应该是一个静态最终常量，或者是一个非公共变量，提供访问器。``确认代码使用后，应把 public 修饰符修改为 private。
公共可变字段会违反了面向对象的封装原则，外部代码可以直接修改数组内容而不通过类的控制逻辑，可能导致状态不一致或不可预测的行为。若有对外提供的场景，需要使用 getter、setter 方法来访问和修改数组内容。若调用处太多，则修改会比较繁杂，需谨慎修改。

## 抽象类构造方法
示例：
```
public abstract class CheckedExpandableGroup extends ExpandableGroup {

    protected CheckedExpandableGroup(String title, List items) {
        super(title, items);
        // code
    }
}
```
SonarQube 提示：
```
Change the visibility of this constructor to "protected".
```
即``构造方法的可见性应为 protected。``确认代码使用后，应把 public 修饰符修改为 protected。
抽象类的公共构造函数可能被直接调用，但抽象类本身不能被实例化。将构造函数设为 protected 可以强制子类继承，符合抽象类的设计意图。

## 泛型命名
示例：
```
public abstract class CheckableChildRecyclerViewAdapter<GVH extends GroupViewHolder, CCVH extends CheckableChildViewHolder>
    extends ExpandableRecyclerViewAdapter<GVH, CCVH> {
    // code
}
```
SonarQube 提示：
```
Rename this generic name to match the regular expression '^[A-Z][0-9]?$'.
```
即``泛型参数的命名应符合大写字母开头，后面可以跟数字或空字符串。``可修改为：
```
public abstract class CheckableChildRecyclerViewAdapter<G extends GroupViewHolder, C extends CheckableChildViewHolder>
    extends ExpandableRecyclerViewAdapter<G, C> {
    // code
}
```

## 指定泛型
示例：
```
public void onSaveInstanceState(Bundle outState) {
    outState.putParcelableArrayList(CHECKED_STATE_MAP, new ArrayList(expandableList.groups));
    super.onSaveInstanceState(outState);
}
```
SonarQube 提示：
```
Provide the parametrized type for this generic.

```
即``给这个泛型提供参数化类型（指定泛型类型）。``可修改为：
```
public void onSaveInstanceState(Bundle outState) {
    outState.putParcelableArrayList(CHECKED_STATE_MAP, new ArrayList<>(expandableList.groups));
    super.onSaveInstanceState(outState);
}
```

## 异常
示例：
```
public ExpandableListPosition getUnflattenedPosition(int flPos) {
    // code
    throw new RuntimeException("Unknown state");
}
```
SonarQube 提示：
```
Define and throw a dedicated exception instead of using a generic one.
```
即``定义并抛专用异常而不是使用通用的异常。``可修改为：
```
throw new IllegalStateException("Unknown state");
```
## switch、if 语句
示例：
```
public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {
    ExpandableListPosition listPos = expandableList.getUnflattenedPosition(position);
    ExpandableGroup group = expandableList.getExpandableGroup(listPos);
    switch (listPos.type) {
        case ExpandableListPosition.GROUP:
        onBindGroupViewHolder((G) holder, position, group);
        break;
        case ExpandableListPosition.CHILD:
        onBindChildViewHolder((C) holder, position, group, listPos.childPos);
        break;
    }
}
```
SonarQube 提示：
```
Replace this "switch" statement by "if" statements to increase readability.
```
即``把 switch 改成 if/else，让代码可读性更高。``可修改为：
```
public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {
    ExpandableListPosition listPos = expandableList.getUnflattenedPosition(position);
    ExpandableGroup group = expandableList.getExpandableGroup(listPos);

    // 把 switch 改成 if else
    if (listPos.type == ExpandableListPosition.GROUP) {
        onBindGroupViewHolder((G) holder, position, group);
    } else if (listPos.type == ExpandableListPosition.CHILD) {
        onBindChildViewHolder((C) holder, position, group, listPos.childPos);
    }
}
```

（持续更新...）