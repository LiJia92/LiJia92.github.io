---
title: 关于 MVP 模式的一点思考（续）
date: 2017-12-22 10:04:41
tags:
 - 技术思路
---
之前有一个关于 MVP 的疑惑：**1个 Presenter 能否对应多个 View？**，在我的[这篇文章](http://lastwarmth.win/2017/04/25/mvp-1/)中有写过。现在回过头来仔细想想，感觉有点不对劲：1个 Presenter 为什么会有对应多个 View 的需求呢？那篇文章中的使用场景是：
>我有 A B C 三个页面，我有一个 Presenter，用来处理一个数据类型的增删改查，但是界面上，A界面只需要查询，B界面只需要删除，C界面只需要增和改。

我们都知道，Presenter 是用来抽离 Activity 或 Fragment 中的业务代码的，何为业务代码？就是这个页面涉及到的业务逻辑。**关于数据的增删改查，那是 M 应该做的事，而绝不是 Presenter 该去处理的。** 所以，Presenter 应当只对应一个 View，如果有界面复用 Presenter 的情况，那我们得考虑为什么会有这种情况呢？复用 Presenter 代表着业务逻辑是一致的，不同的页面理当有着不同的业务逻辑。当然，这里说的业务是简单，最小颗粒化的业务，如果一个页面十分复杂，Presenter 中集合了大量业务代码，那么在某些小的页面是有可能复用 Presenter 中的部分业务代码的。所以这种情况下，Presenter 会对应多个 View，那么这个场景使用上篇文章中的做法是可以的：**复用 Presenter，将 View 抽离，利用继承实现多个界面的定制需求**，但不会是上篇文章中的那种使用场景。

<!-- more -->

为什么会有上篇文章中的场景呢？因为目前项目中的 Presenter 做了 M 该做的事，举个栗子：
```
public class PrinterPresenter extends AbsPresenter implements IPrinterPresenter, LoaderManager.LoaderCallbacks<Cursor> {

    private IView mView;
    private AddOrUpdatePrinterTask mAddOrUpdateTask;
    private DeletePrinterTask mDeleteTask;

    public PrinterPresenter(@NonNull IView view) {
        super(view);
        this.mView = view;
    }

    @Override
    public void loadTemplates() {
        mLoaderManager.initLoader(AppConst.LOADER_ID.PRINTER_TEMPLATE, bundle, this);
    }

    @Override
    public void loadPrinters() {
        mLoaderManager.initLoader(AppConst.LOADER_ID.PRINTER_INFO, null, this);
    }

    @Override
    public void destroyLoader() {
        mLoaderManager.destroyLoader(AppConst.LOADER_ID.PRINTER_INFO);
        mLoaderManager.destroyLoader(AppConst.LOADER_ID.ALL_INVENTORY_TYPE_ID);
    }

    @Override
    public void savePrinter(PrinterInfo printerInfo) {
        mAddOrUpdateTask = new AddOrUpdatePrinterTask(mContext, printerInfo);
        mAddOrUpdateTask.execute();
    }

    @Override
    public void deletePrinter(PrinterInfo printerInfo) {
        mDeleteTask = new DeletePrinterTask(mContext, printerInfo);
        mDeleteTask.execute();
    }

    @Override
    public void onDestroyView() {
        mView = null;
        destroyLoader();
        super.onDestroyView();
    }

    @Override
    public Loader<Cursor> onCreateLoader(int id, Bundle args) {
        CursorLoader cursorLoader = null;
        if (id == AppConst.LOADER_ID.PRINTER_INFO) {
            cursorLoader = new CursorLoader(mContext, MMRContract.Printer.getContentUri(mContext.getPackageName()), null, null, null, null);
        } else if (id == AppConst.LOADER_ID.PRINTER_TEMPLATE) {
            cursorLoader = new CursorLoader(mContext, MMRContract.Printer.getTemplateContentUri(mContext.getPackageName()), null, selection, new String[]{version, logoVersion}, null);
        }
        return cursorLoader;
    }

    @Override
    public void onLoadFinished(Loader<Cursor> loader, Cursor data) {
        int id = loader.getId();
        switch (id) {
            case AppConst.LOADER_ID.PRINTER_INFO:
                if (mView != null && mView instanceof IPrinterInfoView) {
                    ((IPrinterInfoView) mView).showPrinters(printerList);
                }
                break;
            case AppConst.LOADER_ID.ALL_INVENTORY_TYPE_ID:
                if (mView != null && mView instanceof IPrinterSetView) {
                    ((IPrinterSetView) mView).showAllCategories(categories);
                }
                break;
            case AppConst.LOADER_ID.PRINTER_TEMPLATE:
                // do something
                break;
        }

    }

    @Override
    public void onLoaderReset(Loader loader) {

    }

    private class AddOrUpdatePrinterTask extends AsyncTask<Void, Void, Uri> {
        // 添加或更新打印机异步任务
    }

    private class DeletePrinterTask extends AsyncTask<Void, Void, Integer> {
        // 删除打印机异步任务
    }
}
```
代码做了精简，表达出意思即可。可以看到，Presenter 实现了 LoaderManager.LoaderCallbacks<Cursor> 接口，（项目中数据的获取大部分是采用的 CursorLoader 来实现的），然后看到对应的 ContentProvider，根据不同的 uri 进行相应的增删改查：
```
public class PrinterProviderHelper extends BaseProviderHelper {

    private UriMatcher mUriMatcher;

    private static final int CODE_PRINTER = 1;
    private static final int CODE_PRINTER_TEMPLATE = 2;
    private static final int CODE_PRINTER_ACTIVE_INFO = 3;

    public PrinterProviderHelper(Context ctx, String authority) {
        super(ctx);

        mUriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

        mUriMatcher.addURI(authority, MMRContract.Printer.PATH_PRINTER_TEMPLATE, CODE_PRINTER_TEMPLATE);
        mUriMatcher.addURI(authority, MMRContract.Printer.PATH_PRINTER, CODE_PRINTER);
    }

    @Override
    public int match(Uri uri) {
        return mUriMatcher.match(uri);
    }

    @Override
    protected Uri insert(ServiceManager serviceManager, Uri uri, ContentValues values) {
        if (serviceManager == null) {
            return null;
        }
        switch (mUriMatcher.match(uri)) {
            case CODE_PRINTER:
                // 实际添加打印机的方法
                int result = serviceManager.getPrinterInfoService().addOrUpdatePrinter(printerInfo);
                break;

            default:
                break;
        }

        return super.insert(serviceManager, uri, values);
    }

    @Override
    protected Cursor query(ServiceManager serviceManager, Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        if (serviceManager == null) {
            return null;
        }
        switch (mUriMatcher.match(uri)) {
            case CODE_PRINTER:
                // 实际查询打印机信息的方法
                PrinterInfo[] printerInfo = serviceManager.getPrinterInfoService().queryPrinterInfo();
                break;
            case CODE_PRINTER_TEMPLATE:
                // 查询打印机模板的方法
                break;

            default:
                break;
        }

        return cursor;
    }

    @Override
    protected int delete(ServiceManager serviceManager, Uri uri, String selection, String[] selectionArgs) {
        if (serviceManager == null) {
            return 0;
        }
        PrinterInfoService printerInfoService = serviceManager.getPrinterInfoService();
        switch (mUriMatcher.match(uri)) {
            case CODE_PRINTER:
                // 实际删除删除打印机的方法
                int result = serviceManager.getPrinterInfoService().deletePrinter(mac)
                return result;

            default:
                break;
        }
        return super.delete(serviceManager, uri, selection, selectionArgs);
    }
}
```
可以看到，PrinterProviderHelper 才是我们的 M 层，但是它并没有对数据的操作进行封装，仅仅提供了最底层的方法，数据操作的封装反而写到了 Presenter 里，这就是不合理的地方，导致了前面出现的场景：``A 界面只需要查询，B 界面只需要删除，C 界面只需要增和改``，而增删改查的接口都封装在了 Presenter 里面，以至于出现需要复用 Presenter 的伪需求。理论上应该由 M 封装数据操作，然后 P 持有 M 的引用，进行方法调用即可。就像这样：
```
class M {
    PrinterInfo[] getPrinterInfo(){
        // 封装获取打印机方法
    }

    int addOrUpdatePrinter(PrinterInfo info){
        // 封装添加打印机方法
    }

    int deletePrinter(String mac){
        // 封装删除打印机方法
    }

    ...
}

class P {
    private M m;

    PrinterInfo[] getPrinterInfo(){
        return m.getPrinterInfo();
    }

    int addOrUpdatePrinter(PrinterInfo info){
        return m.addOrUpdatePrinter(info);
    }

    int deletePrinter(String mac){
        return m.deletePrinter(mac);
    }
}
```
如此这般， A B C 3个界面对应各自的 P，对于数据的操作只需要持有 M 进行方法调用就好了，那么关于 View 接口的定制也是一对一的，不会出现多的 do nothing 的方法了。其实这在[Google 中的 MVP 架构演示](http://lastwarmth.win/2016/06/27/mvp/)中就已经表达出来了。只不过来到公司项目的中 Presenter 就是这样实现的，加上大多数时候程序员都是以功能优先，很少有时间真正去思考一些东西。至于数据操作涉及的异步线程的切换，使用 CursorLoader、AsyncTask 亦或是 RxJava 都是可以的，这就看项目实际情况了。
