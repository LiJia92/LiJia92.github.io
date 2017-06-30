---
title: 针对ListView多Type的优化
date: 2017-05-09 10:46:58
tags:
 - 日常开发
---

在之前写过一篇多 Type 的错误使用[使用ListView多Type的错误姿势](http://lastwarmth.win/2017/04/18/wrong/)，下面写一下针对这种使用场景的优化。

<!-- more -->

可以看到之前的代码很繁杂，根据各种 Type 有各种 position 的判断，在 getView 的时候代码一坨一坨的看着很不舒服，那么有没有什么优化策略呢？
可以知道多 Type 的使用原因是界面多种展示风格，本质的原因则是数据类型的不一致，即数据源中有多种数据类型，那么就可以直接 **利用泛型来实现数据的区分，整合一个 List<Object> mDataList 里面包含所有的数据，在根据 getItem 来获取单个的 item，根据其数据类型来判断属于哪种 Type。**


根据策略，将头部的布局抽成``String``类型，将打印机的布局抽成``PrinterInfo``类型，后面获取``item``后根据类型来判断是头布局，还是打印机布局。
优化后的代码如下：
```
public class PrinterManagerAdapter extends BaseAdapter {

    private static final int TYPE_HEADER = 0;
    private static final int TYPE_PRINTER = 1;

    private static final String TITLE_BLUETOOTH_PRINTER = "蓝牙打印机";
    private static final String TITLE_NET_PRINTER = "网络打印机";
    private static final String TITLE_CLOUD_PRINTER = "云打印机";

    private Context mContext;
    private LayoutInflater mInflater;
    private OnItemFunctionClickListener listener;

    private List<Object> mDataList = new ArrayList<>();

    public PrinterManagerAdapter(Context context, ArrayList<PrinterInfo> printers, SwipePartMenuListView listView) {
        mContext = context;
        mInflater = LayoutInflater.from(context);

        initDataList(printers);
        setNotSwipeItems(listView);
    }

    private void initDataList(List<PrinterInfo> printerList) {
        mDataList.clear();
        List<PrinterInfo> bluetoothPrinterList = new ArrayList<>();
        List<PrinterInfo> netPrinterList = new ArrayList<>();
        List<PrinterInfo> cloudPrinterList = new ArrayList<>();
        for (PrinterInfo info : printerList) {
            if (info.printerType == PrinterInfo.TYPE_BLUETOOTH) {
                bluetoothPrinterList.add(info);
            } else if (info.printerType == PrinterInfo.TYPE_NETWORK) {
                netPrinterList.add(info);
            } else if (info.printerType == PrinterInfo.TYPE_CLOUD) {
                cloudPrinterList.add(info);
            }
        }

        mDataList.add(TITLE_BLUETOOTH_PRINTER);
        mDataList.addAll(bluetoothPrinterList);
        mDataList.add(TITLE_NET_PRINTER);
        mDataList.addAll(netPrinterList);
        mDataList.add(TITLE_CLOUD_PRINTER);
        mDataList.addAll(cloudPrinterList);
    }

    private void setNotSwipeItems(SwipePartMenuListView listView) {
        List<Integer> titleList = new ArrayList<>();
        for (int i = 0; i < mDataList.size(); i++) {
            if (mDataList.get(i) instanceof String) {
                titleList.add(i);
            }
        }
        listView.setCannotSwipePositionList(titleList);
    }

    public void setPrinters(ArrayList<PrinterInfo> printers, SwipePartMenuListView listView) {
        initDataList(printers);
        setNotSwipeItems(listView);
    }

    public void setListener(OnItemFunctionClickListener listener) {
        this.listener = listener;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        int viewType = getItemViewType(position);
        if (viewType == TYPE_HEADER) {
            return getTitleView(position, convertView, parent);
        } else {
            return getPrinterView(position, convertView, parent);
        }
    }

    private View getPrinterView(int position, View convertView, ViewGroup parent) {
        PrinterViewHolder printerHolder;
        if (convertView == null) {
            printerHolder = new PrinterViewHolder();
            convertView = mInflater.inflate(R.layout.item_printer_devices, parent, false);
            printerHolder.connect = (TextView) convertView.findViewById(R.id.printer_connect_tv);
            printerHolder.divider = convertView.findViewById(R.id.printer_last_divider);
            printerHolder.setting = (TextView) convertView.findViewById(R.id.printer_setting_tv);
            printerHolder.title = (TextView) convertView.findViewById(R.id.printer_title_tv);
            printerHolder.connectIcon = (ImageView) convertView.findViewById(R.id.printer_connect_iv);
            convertView.setTag(printerHolder);
        } else {
            printerHolder = (PrinterViewHolder) convertView.getTag();
        }

        PrinterInfo printer = (PrinterInfo) mDataList.get(position);

        initPrinter(printerHolder, printer);

        if (position == getCount() - 1) {
            printerHolder.divider.setVisibility(View.VISIBLE);
        } else {
            printerHolder.divider.setVisibility(View.GONE);
        }

        return convertView;
    }

    private View getTitleView(int position, View convertView, ViewGroup parent) {
        HeaderViewHolder headerHolder;
        if (convertView == null) {
            headerHolder = new HeaderViewHolder();
            convertView = mInflater.inflate(R.layout.item_printer_title, parent, false);
            headerHolder.headerTitle = (TextView) convertView.findViewById(R.id.printer_category_tv);
            headerHolder.headerIcon = (ImageView) convertView.findViewById(R.id.printer_icon_iv);
            headerHolder.headerAdd = (ImageView) convertView.findViewById(R.id.printer_add_device_iv);
            headerHolder.headerDivider = convertView.findViewById(R.id.printer_title_divider);
            convertView.setTag(headerHolder);
        } else {
            headerHolder = (HeaderViewHolder) convertView.getTag();
        }

        String title = (String) mDataList.get(position);
        headerHolder.headerTitle.setText(title);
        headerHolder.headerAdd.setOnTouchListener(new OnTouchEffectedListener());

        if (TITLE_BLUETOOTH_PRINTER.equals(title)) {
            headerHolder.headerIcon.setImageResource(R.drawable.ic_printer_bluetooth);
            headerHolder.headerAdd.setImageResource(R.drawable.btn_setting_goods_add);
            headerHolder.headerAdd.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (listener != null) {
                        listener.onRightClick(PrinterInfo.TYPE_BLUETOOTH);
                    }
                }
            });
        } else if (TITLE_NET_PRINTER.equals(title)) {
            headerHolder.headerIcon.setImageResource(R.drawable.ic_printer_wifi);
            headerHolder.headerAdd.setImageResource(R.drawable.btn_setting_goods_add);
            headerHolder.headerAdd.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (listener != null) {
                        listener.onRightClick(PrinterInfo.TYPE_NETWORK);
                    }
                }
            });
        } else if (TITLE_CLOUD_PRINTER.equals(title)) {
            headerHolder.headerIcon.setImageResource(R.drawable.ic_printer_cloud);
            headerHolder.headerAdd.setImageResource(R.drawable.btn_setting_goods_scan);
            headerHolder.headerAdd.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (listener != null) {
                        listener.onRightClick(PrinterInfo.TYPE_CLOUD);
                    }
                }
            });
        }

        if (position == getCount() - 1) {
            headerHolder.headerDivider.setVisibility(View.VISIBLE);
        } else {
            headerHolder.headerDivider.setVisibility(View.GONE);
        }

        return convertView;
    }

    private void initPrinter(PrinterViewHolder holder, final PrinterInfo printerInfo) {
        if (holder != null) {
            boolean connected = false;
            holder.title.setText(printerInfo.name);

            List<IPrinter> printers = PrinterManager.getInstance().getPrinterList();
            for (IPrinter printer : printers) {
                if (printer.getPrinterId().equals(printerInfo.mac)) {
                    connected = true;
                    holder.connect.setText("断开");
                    holder.connectIcon.setImageResource(R.drawable.ic_connect);
                    break;
                }
            }
            if (!connected) {
                holder.connect.setText("连接");
                holder.connectIcon.setImageResource(R.drawable.ic_break);
            }

            holder.setting.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    PrinterSettingActivity.navigateTo(mContext, printerInfo);
                }
            });
            final boolean finalConnected = connected;
            holder.connect.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (listener != null) {
                        listener.onConnectClick(printerInfo, finalConnected);
                    }
                }
            });
        }
    }

    @Nullable
    public PrinterInfo getPrinterInfo(int position) {
        Object o = mDataList.get(position);
        if (o instanceof PrinterInfo) {
            return (PrinterInfo) o;
        } else {
            return null;
        }
    }

    @Override
    public int getItemViewType(int position) {
        Object o = mDataList.get(position);
        if (o instanceof PrinterInfo) {
            return TYPE_PRINTER;
        } else {
            return TYPE_HEADER;
        }
    }

    @Override
    public int getViewTypeCount() {
        return 2;
    }

    @Override
    public int getCount() {
        return mDataList.size();
    }

    @Override
    public Object getItem(int position) {
        return mDataList.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    private class HeaderViewHolder {
        private TextView headerTitle;
        private ImageView headerIcon;
        private ImageView headerAdd;
        private View headerDivider;
    }

    private class PrinterViewHolder {
        private TextView connect;
        private TextView title;
        private View divider;
        private TextView setting;
        private ImageView connectIcon;
    }

    public interface OnItemFunctionClickListener {
        void onConnectClick(PrinterInfo printer, boolean connected);

        /**
         * 点击标题右侧按钮
         * @param printerType 打印机类型。例如 {@link PrinterInfo#TYPE_BLUETOOTH}
         */
        void onRightClick(int printerType);
    }

}
```
核心代码便在``initDataList``中，所有的对象都是继承自 Object 的，利用``instanceof``可以判断放入的是哪种数据类型，一种数据类型对应一种 Type。对比之前的代码，可以看到调整后的代码可读性更高，也更简洁了。
