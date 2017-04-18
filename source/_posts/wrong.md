---
title: 使用ListView多Type的错误姿势
date: 2017-04-18 19:33:01
tags:
 - 日常开发
---
项目中，有这样的一个需求：

![](http://7xryow.com1.z0.glb.clouddn.com/2017/04/18/QQ%E5%9B%BE%E7%89%8720170412161938.png)

<!-- more -->

有三种打印机类型，每种类型可以添加、删除对应类型的打印机。

按照以往，我写的Adapter是这样的:
```
public class PrinterManagerAdapter extends BaseAdapter {

    public final static int BLUETOOTH_HEADER = 0;
    public final static int BLUETOOTH_PRINTER = 1;
    public final static int NET_HEADER = 2;
    public final static int NET_PRINTER = 3;
    public final static int CLOUD_HEADER = 4;
    public final static int CLOUD_PRINTER = 5;

    private Context mContext;
    private LayoutInflater mInflater;
    private OnItemFunctionClickListener listener;

    private List<PrinterInfo> mPrinters = new ArrayList<>();
    private int blueToothCount = 0;
    private int netCount = 0;
    private int cloudCount = 0;

    public PrinterManagerAdapter(Context context, List<PrinterInfo> printers, SwipePartMenuListView listView) {
        mContext = context;
        mPrinters = printers;
        mInflater = LayoutInflater.from(context);

        getNotSwipeItem(listView);
    }

    private void getNotSwipeItem(SwipePartMenuListView listView) {
        blueToothCount = 0;
        netCount = 0;
        cloudCount = 0;

        for (PrinterInfo info : mPrinters) {
            if (info.printerType == PrinterInfo.TYPE_BLUETOOTH) {
                blueToothCount++;
            } else if (info.printerType == PrinterInfo.TYPE_NETWORK) {
                netCount++;
            } else if (info.printerType == PrinterInfo.TYPE_CLOUD) {
                cloudCount++;
            }
        }

        List<Integer> titleList = new LinkedList<>();
        titleList.add(0);
        titleList.add(1 + blueToothCount);
        titleList.add(2 + blueToothCount + netCount);
        listView.setCannotSwipePositionList(titleList);
    }

    public void setPrinters(List<PrinterInfo> printers, SwipePartMenuListView listView) {
        this.mPrinters = printers;

        getNotSwipeItem(listView);
    }

    public void setListener(OnItemFunctionClickListener listener) {
        this.listener = listener;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        PrinterManagerViewHolder holder;
        final int viewType = getItemViewType(position);
        holder = new PrinterManagerViewHolder();
        if (viewType == BLUETOOTH_HEADER || viewType == NET_HEADER || viewType == CLOUD_HEADER) {
            if (convertView == null) {
                convertView = mInflater.inflate(R.layout.item_printer_title, parent, false);
                holder.headerTitle = (TextView) convertView.findViewById(R.id.printer_category_tv);
                holder.headerIcon = (ImageView) convertView.findViewById(R.id.printer_icon_iv);
                holder.headerAdd = (ImageView) convertView.findViewById(R.id.printer_add_device_iv);
                holder.headerDivider = convertView.findViewById(R.id.printer_title_divider);
                convertView.setTag(holder);
            } else {
                holder = (PrinterManagerViewHolder) convertView.getTag();
            }
        } else {
            if (convertView == null) {
                convertView = mInflater.inflate(R.layout.item_printer_devices, parent, false);
                holder.connect = (TextView) convertView.findViewById(R.id.printer_connect_tv);
                holder.divider = convertView.findViewById(R.id.printer_last_divider);
                holder.setting = (TextView) convertView.findViewById(R.id.printer_setting_tv);
                holder.title = (TextView) convertView.findViewById(R.id.printer_title_tv);
                holder.connectIcon = (ImageView) convertView.findViewById(R.id.printer_connect_iv);
                convertView.setTag(holder);
            } else {
                holder = (PrinterManagerViewHolder) convertView.getTag();
            }
        }
        switch (viewType) {
            case BLUETOOTH_HEADER:
                holder.headerTitle.setText("蓝牙打印机");
                holder.headerAdd.setBackgroundDrawable(mContext.getResources().getDrawable(R.drawable.btn_setting_goods_add));
                holder.headerAdd.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        BlueToothPrinterActivity.navigateTo(mContext);
                    }
                });
                break;
            case NET_HEADER:
                holder.headerTitle.setText("网络打印机");
                holder.headerAdd.setBackgroundDrawable(mContext.getResources().getDrawable(R.drawable.btn_setting_goods_add));
                holder.headerAdd.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        NetPrinterActivity.navigateTo(mContext);
                    }
                });
                break;
            case CLOUD_HEADER:
                holder.headerTitle.setText("云打印机");
                holder.headerAdd.setBackgroundDrawable(mContext.getResources().getDrawable(R.drawable.btn_setting_goods_scan));
                if (position == getCount() - 1) {
                    holder.headerDivider.setVisibility(View.VISIBLE);
                }
                break;
            case BLUETOOTH_PRINTER:
                PrinterInfo printer = mPrinters.get(position - 1);
                initPrinter(holder, printer);
                break;
            case NET_PRINTER:
                PrinterInfo netPrinter = mPrinters.get(position - 2);
                initPrinter(holder, netPrinter);
                break;
            case CLOUD_PRINTER:
                if (position == getCount() - 1) {
                    holder.divider.setVisibility(View.VISIBLE);
                }
                PrinterInfo cloudPrinter = mPrinters.get(position - 3);
                initPrinter(holder, cloudPrinter);
                break;
        }
        return convertView;
    }

    private void initPrinter(PrinterManagerViewHolder holder, final PrinterInfo printerInfo) {
        boolean connected = false;
        holder.title.setText(printerInfo.name);

        HashMap<String, IPrinter> printers = PrinterManager.getInstance().getPrinterList();
        if (printers.keySet().contains(printerInfo.mac)) {
            connected = true;
            holder.connect.setText("断开");
            holder.connectIcon.setBackgroundDrawable(mContext.getResources().getDrawable(R.drawable.ic_connect));
        } else {
            holder.connect.setText("连接");
            holder.connectIcon.setBackgroundDrawable(mContext.getResources().getDrawable(R.drawable.ic_break));
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
                    listener.onConnectClicked(printerInfo, finalConnected);
                }
            }
        });
    }

    @Override
    public int getItemViewType(int position) {
        if (position == 0) {
            return BLUETOOTH_HEADER;
        } else if (position > 0 && position <= blueToothCount) {
            return BLUETOOTH_PRINTER;
        } else if (position == blueToothCount + 1) {
            return NET_HEADER;
        } else if (position > blueToothCount + 1 && position <= netCount + blueToothCount + 1) {
            return NET_PRINTER;
        } else if (position == netCount + blueToothCount + 2) {
            return CLOUD_HEADER;
        } else {
            return CLOUD_PRINTER;
        }
    }

    @Override
    public int getCount() {
        if (mPrinters != null) {
            return mPrinters.size() + 3;
        }
        return 0;
    }

    @Override
    public Object getItem(int position) {
        return null;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    private class PrinterManagerViewHolder {

        // Header
        private TextView headerTitle;
        private ImageView headerIcon;
        private ImageView headerAdd;
        private View headerDivider;
        // Printer
        private TextView connect;
        private TextView title;
        private View divider;
        private TextView setting;
        private ImageView connectIcon;
    }

    public interface OnItemFunctionClickListener {
        void onConnectClicked(PrinterInfo printer, boolean connected);
    }

}
```
我将 view 分为了6个 Type ，三种头部 Type 使用一种布局，三种打印机 Type 使用一种布局，然后总共用了一个 ViewHoloder 。
然后发现一个问题：
**当我删除一个打印机之后，刷新界面的时候崩溃了**
问题其实很简单：就是删除的打印机（BLUETOOTH_PRINTER Type）convertView 进入到缓存里面，然后下个 Item 的 Type 是 NET_HEADER Type，由于重用机制，这个 Item 会重用 convertView，此时这个 convertView 绑定的 ViewHoloder 是 Printer 部分，而自己要使用的是 Header 部分，其 view 都为 null了，导致空指针崩溃。

解决办法：添加代码
```
@Override
public int getViewTypeCount() {
    return 6;
}
```
ListView 的缓存机制是可以针对不同 Type 来进行缓存的，当不复写这个方法的时候，其默认的实现是 **返回1** ,所以导致``getItemViewType``返回的 Type 实际上是没有用的，不管是什么 Type， ListView 填充的 convertView 永远是一样的。所以，当改成 **返回6** 的时候， ListView 便会填充 6 种 convertView 了，所绑定的 ViewHoloder 具有的属性也会一样，就避免了空指针崩溃了。

当和同事讨论这点的时候，同事指出： **有几种布局，就用几种 Type，几种 ViewHoloder，一一对应才是官方推荐的行为。**

自己想了下，确实是的。当网络打印机这个 Item 要显示的时候，如果缓存中有蓝牙打印机的 convertView，我是用不了的，因为他们的 Type 不一样。这样的一个做法，就是自己把 ListView 的缓存机制整乱了。

修改后的代码如下：
```
public class PrinterManagerAdapter extends BaseAdapter {

    private final static int TYPE_HEADER = 0;
    private final static int TYPE_PRINTER = 1;

    private Context mContext;
    private LayoutInflater mInflater;
    private OnItemFunctionClickListener listener;

    private ArrayList<PrinterInfo> mPrinters;
    private int blueToothCount = 0;
    private int netCount = 0;
    private int cloudCount = 0;

    public PrinterManagerAdapter(Context context, ArrayList<PrinterInfo> printers, SwipePartMenuListView listView) {
        mContext = context;
        mPrinters = printers;
        mInflater = LayoutInflater.from(context);

        setNotSwipeItems(listView);
    }

    private void setNotSwipeItems(SwipePartMenuListView listView) {
        blueToothCount = 0;
        netCount = 0;
        cloudCount = 0;

        for (PrinterInfo info : mPrinters) {
            if (info.printerType == PrinterInfo.TYPE_BLUETOOTH) {
                blueToothCount++;
            } else if (info.printerType == PrinterInfo.TYPE_NETWORK) {
                netCount++;
            } else if (info.printerType == PrinterInfo.TYPE_CLOUD) {
                cloudCount++;
            }
        }

        List<Integer> titleList = new ArrayList<>();
        titleList.add(0);
        titleList.add(1 + blueToothCount);
        titleList.add(2 + blueToothCount + netCount);
        listView.setCannotSwipePositionList(titleList);
    }

    public void setPrinters(ArrayList<PrinterInfo> printers, SwipePartMenuListView listView) {
        this.mPrinters = printers;

        setNotSwipeItems(listView);
    }

    public void setListener(OnItemFunctionClickListener listener) {
        this.listener = listener;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        HeaderViewHolder headerHolder = null;
        PrinterViewHolder printerHolder = null;
        int viewType = getItemViewType(position);
        if (viewType == TYPE_HEADER) {
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
        } else {
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
        }
        switch (viewType) {
            case TYPE_HEADER:
                if (headerHolder != null) {
                    if (position == 0) {
                        headerHolder.headerTitle.setText("蓝牙打印机");
                        headerHolder.headerIcon.setImageResource(R.drawable.ic_printer_bluetooth);
                        headerHolder.headerAdd.setImageResource(R.drawable.btn_setting_goods_add);
                        headerHolder.headerAdd.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                BlueToothPrinterActivity.navigateTo(mContext, mPrinters);
                            }
                        });
                    } else if (position == blueToothCount + 1) {
                        headerHolder.headerTitle.setText("网络打印机");
                        headerHolder.headerIcon.setImageResource(R.drawable.ic_printer_wifi);
                        headerHolder.headerAdd.setImageResource(R.drawable.btn_setting_goods_add);
                        headerHolder.headerAdd.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
//                                NetPrinterActivity.navigateTo(mContext);
                            }
                        });
                    } else if (position == netCount + blueToothCount + 2) {
                        headerHolder.headerTitle.setText("云打印机");
                        headerHolder.headerIcon.setImageResource(R.drawable.ic_printer_cloud);
                        headerHolder.headerAdd.setImageResource(R.drawable.btn_setting_goods_scan);
                        headerHolder.headerAdd.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
//                                NetPrinterActivity.navigateTo(mContext);
                            }
                        });
                        if (position == getCount() - 1) {
                            headerHolder.headerDivider.setVisibility(View.VISIBLE);
                        } else {
                            headerHolder.headerDivider.setVisibility(View.GONE);
                        }
                    }
                }
                break;
            case TYPE_PRINTER:
                if (printerHolder != null) {
                    int index;
                    if (position > 0 && position <= blueToothCount) {
                        index = position - 1;
                    } else if (position > blueToothCount + 1 && position <= netCount + blueToothCount + 1) {
                        index = position - 2;
                    } else {
                        index = position - 3;
                        if (position == getCount() - 1) {
                            printerHolder.divider.setVisibility(View.VISIBLE);
                        } else {
                            printerHolder.divider.setVisibility(View.GONE);
                        }
                    }
                    PrinterInfo printer = mPrinters.get(index);
                    initPrinter(printerHolder, printer);
                }
                break;
            default:
                break;
        }
        return convertView;
    }

    private void initPrinter(PrinterViewHolder holder, final PrinterInfo printerInfo) {
        if (holder != null) {
            boolean connected = false;
            holder.title.setText(printerInfo.name);

            HashMap<String, IPrinter> printers = PrinterManager.getInstance().getPrinterList();
            if (printers.keySet().contains(printerInfo.mac)) {
                connected = true;
                holder.connect.setText("断开");
                holder.connectIcon.setImageResource(R.drawable.ic_connect);
            } else {
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
                        listener.onConnectClicked(printerInfo, finalConnected);
                    }
                }
            });
        }
    }

    public PrinterInfo getPrinterInfo(int position) {
        int index;
        if (position > 0 && position <= blueToothCount) {
            index = position - 1;
        } else if (position > blueToothCount + 1 && position <= netCount + blueToothCount + 1) {
            index = position - 2;
        } else {
            index = position - 3;
        }
        return mPrinters.get(index);
    }

    @Override
    public int getItemViewType(int position) {
        if (position == 0) {
            return TYPE_HEADER;
        } else if (position > 0 && position <= blueToothCount) {
            return TYPE_PRINTER;
        } else if (position == blueToothCount + 1) {
            return TYPE_HEADER;
        } else if (position > blueToothCount + 1 && position <= netCount + blueToothCount + 1) {
            return TYPE_PRINTER;
        } else if (position == netCount + blueToothCount + 2) {
            return TYPE_HEADER;
        } else {
            return TYPE_PRINTER;
        }
    }

    @Override
    public int getViewTypeCount() {
        return 2;
    }

    @Override
    public int getCount() {
        if (mPrinters != null) {
            return mPrinters.size() + 3;
        }
        return 3;
    }

    @Override
    public Object getItem(int position) {
        return null;
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
        void onConnectClicked(PrinterInfo printer, boolean connected);
    }

}
```
这样的话，结构其实会更加清晰，拆分得更具体。同理， RecyclerView 应该也是类似的。

因为自己长期以来一直是之前的那种做法，错了太多次了，却没有及时发现错误，经过这次同事的指正，总算是纠正过来了。写篇博客备忘，忘性太大了～
