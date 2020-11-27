---
title: Android 连接 USB 设备
date: 2020-11-27 14:38:15
tags:
 - 日常开发
---
最近项目中有需要连接 USB 设备，App 运行在平板之上，只有一个 type-c 接口，只能通过 type-c 转串口进行连接，所以 App 直接接触的是 USB 设备。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/WechatIMG60.png)
使用 USB 设备遵照[Google 官方文档](https://developer.android.com/guide/topics/connectivity/usb/host?hl=zh-cn#java)开发即可。

<!-- more -->

## 配置清单
```
<manifest ...>
    <uses-feature android:name="android.hardware.usb.host" />
    <uses-sdk android:minSdkVersion="12" />
    ...
    <application>
        <activity ...>
            ...
            <intent-filter>
                <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
            </intent-filter>

            <meta-data android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
                android:resource="@xml/device_filter" />
        </activity>
    </application>
</manifest>
```
device_filter 可过滤具有指定属性的所有 USB 设备：
```
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <usb-device vendor-id="1234" product-id="5678" class="255" subclass="66" protocol="1" />
</resources>
```

## 使用设备
1. 发现连接的 USB 设备，具体方法是使用 Intent 过滤器在用户连接 USB 设备时接收通知，或者枚举已连接的 USB 设备。
2. 请求用户授予连接到 USB 设备的权限（如果尚未获得权限）。
3. 通过在适当的接口端点读取和写入数据来与 USB 设备通信。

```
object UsbDeviceManager {

    private const val ACTION_USB_PERMISSION = "com.android.example.USB_PERMISSION"
    private var usbManager: UsbManager? = null
    private var serial: UsbSerialDevice? = null
    private var listener: OnDeviceConnectListener? = null

    @JvmStatic
    fun open(context: Context, listener: OnDeviceConnectListener) {
        this.listener = listener
        usbManager = context.getSystemService(USB_SERVICE) as? UsbManager
        usbManager?.let {
            for (device in it.deviceList.values) {
                if (UsbSerialDevice.isSupported(device)) {
                    if (it.hasPermission(device)) {
                        connect(device)
                    } else {
                        val filter = IntentFilter(ACTION_USB_PERMISSION)
                        context.registerReceiver(usbReceiver, filter)
                        val permissionIntent = PendingIntent.getBroadcast(
                            context,
                            0,
                            Intent(ACTION_USB_PERMISSION),
                            0
                        )
                        it.requestPermission(device, permissionIntent)
                    }
                }
            }
        }
    }

    private fun connect(device: UsbDevice?) {
        device?.let {
            val connect = usbManager?.openDevice(device)
            serial = UsbSerialDevice.createUsbSerialDevice(device, connect)
            serial?.syncOpen()
            serial?.setBaudRate(115200)
            serial?.let {
                listener?.onDeviceConnect(it)
            }
        }
    }

    private val usbReceiver: BroadcastReceiver = object : BroadcastReceiver() {

        override fun onReceive(context: Context, intent: Intent) {
            val action = intent.action
            if (ACTION_USB_PERMISSION == action) {
                val device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE) as? UsbDevice
                if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                    connect(device)
                } else {
                    LogUtils.e(
                        "UsbDeviceManager",
                        "permission denied for device $device"
                    )
                }
            }
        }
    }

    interface OnDeviceConnectListener {
        fun onDeviceConnect(serial: UsbSerialDevice)
    }
}
```

## 封装
USB 有多种芯片，针对不同的芯片可能需要做识别，在 Github 上找到一个库[UsbSerial](https://github.com/felHR85/UsbSerial)，针对 USB 设备做了许多的封装，硬件同事提供的转串口工具为 CH34X 系列，该库也支持。参照文档使用起来很方便。
```
public class UsbDeviceCommunicator extends BaseCommunicator {

    private static final int BufferSize = 32;

    private UsbSerialDevice usbDevice;

    @Override
    public void open() {
        UsbDeviceManager.open(MucangConfig.getContext(), new UsbDeviceManager.OnDeviceConnectListener() {
            @Override
            public void onDeviceConnect(@NotNull UsbSerialDevice serial) {
                usbDevice = serial;
                // Usb 串口读取 byte[] 是读满才返回，把 bufferSize 搞小点
                mInputStream = new BufferedInputStream(serial.getInputStream(), BufferSize);
                mOutputStream = new BufferedOutputStream(serial.getOutputStream());
                startReadThread();
            }
        });
    }

    @Override
    public void close() {
        super.close();
        if (usbDevice != null) {
            usbDevice.syncClose();
        }
    }
}
```

## 抽象
因为串口的不一致性，项目中有 3 中流传输方式：蓝牙、串口、USB。数据读取解析方式完全一致，所以抽象出 Communicator：
```
public interface Communicator {

    /**
     * 打开串口
     */
    void open() throws Exception;

    /**
     * 发送数据
     */
    @WorkerThread
    void send(SendData sendData);

    /**
     * 处理接收的数据
     *
     * @param readBytes 只包含数据域数据
     */
    void parseData(ReadBytes readBytes);

    /**
     * 关闭串口
     */
    void close();

    /**
     * 释放资源
     */
    void release();

    /**
     * 大小端
     *
     * @return
     */
    boolean littleEndian();

    /**
     * 串口是否可用
     */
    boolean isAvailable();
}
```
BaseCommunicator：
```
public abstract class BaseCommunicator implements Communicator {

    private static final String TAG = "BaseCommunicator";

    private static final long SEND_INTERVAL = 10;   // 避免多线程发送粘包，添加延时

    protected BufferedInputStream mInputStream;     // 输入流，子类进行初始化
    protected BufferedOutputStream mOutputStream;   // 输出流，子类进行初始化

    private DefaultReadThread mReadThread;          // 读线程
    private final SignalHandler signalHandler;      // 消息分发 handler
    private long lastSendTime;                      // 上一次发包的时间

    public BaseCommunicator() {
        this.signalHandler = new SignalHandler();
    }

    @WorkerThread
    @Override
    public synchronized void send(SendData sendData) {
        if (!isAvailable()) {
            return;
        }
        if (interceptMessage(sendData.toBytes())) {
            return;
        }
        try {
            byte[] finalData = SerialProtocol.createProtocol(sendData.toBytes());
            if (mOutputStream != null) {
                long curTime = SystemClock.elapsedRealtime();
                if (curTime - lastSendTime >= SEND_INTERVAL) {
                    lastSendTime = curTime;
                } else {
                    long delta = SEND_INTERVAL - (curTime - lastSendTime);
                    SystemClock.sleep(delta);
                    lastSendTime = SystemClock.elapsedRealtime();
                }
                mOutputStream.write(finalData, 0, finalData.length);
                mOutputStream.flush();
            }
        } catch (Throwable e) {
            LogUtils.e(TAG, "sendData() error", e);
        }
    }

    @Override
    public void parseData(ReadBytes readBytes) {
        readBytes.reset();
        int msgType = readBytes.readUnsignedByte();
        signalHandler.dispatchHandler(msgType, readBytes);
    }


    /**
     * 当ota正在升级的时候不下发其他业务消息,ota升级优先级最高
     */
    private boolean interceptMessage(byte[] bytes) {
        // 升级过程中
        if (CommunicateManager.getInstance().isNeedInterceptor()) {
            // 解析指令类型
            int order = bytes[0] & 0xff;
            // 只放行 ota 指令
            boolean isOtaOrder = SingleFirmwareUpgradeProcessor.isOtaOrder(order);
            return !isOtaOrder;
        }
        return false;
    }

    @Override
    public synchronized void close() {
        if (mReadThread != null && mReadThread.isAlive()) {
            mReadThread.close();
            mReadThread = null;
        }
        IOUtils.close(mInputStream);
        IOUtils.close(mOutputStream);
        lastSendTime = 0;
    }

    @Override
    public synchronized void release() {
        close();
    }

    @Override
    public boolean isAvailable() {
        if (mReadThread == null || !mReadThread.isAlive()) {
            return false;
        }
        return true;
    }

    @Override
    public boolean littleEndian() {
        return true;
    }

    /**
     * 启动串口读线程
     */
    protected void startReadThread() {
        mReadThread = new DefaultReadThread();
        mReadThread.start();
        LiveBus.post(new CommunicatorOpenSuccess());
    }

    /**
     * 读满一个数组
     */
    private static void readFully(InputStream in, byte[] array, int off, int len) throws IOException {
        if (len < 0)
            throw new IndexOutOfBoundsException();
        int n = 0;
        while (n < len) {
            int count = in.read(array, off + n, len - n);
            if (count < 0)
                throw new EOFException();
            n += count;
        }
    }

    private static void readFully(InputStream in, byte[] array) throws IOException {
        readFully(in, array, 0, array.length);
    }

    private static long crc(byte[] data) {
        CRC32 crc = new CRC32();
        crc.update(data);
        return crc.getValue();
    }

    /**
     * 默认读线程
     */
    private class DefaultReadThread extends Thread {

        private volatile boolean mRunning = true;

        DefaultReadThread() {
        }

        /**
         * 读取一帧数据
         */
        private byte[] readFrame() throws IOException {
            //header识别，一直识别到一帧为止，否则一直等待
            byte h1, h2 = 0;
            while (mRunning) {
                h1 = (byte) mInputStream.read();
                if (h2 == SerialProtocol.HEAD1 && h1 == SerialProtocol.HEAD2) {
                    break;
                }
                h2 = (byte) mInputStream.read();
                if (h1 == SerialProtocol.HEAD1 && h2 == SerialProtocol.HEAD2) {
                    break;
                }
            }

            //帧长
            int length = mInputStream.read();

            //数据
            byte[] data = new byte[length - 5];
            readFully(mInputStream, data);

            //校验数据
            byte[] crcArray = new byte[4];
            readFully(mInputStream, crcArray);
            ReadBytes readCrc = new ReadBytes(crcArray, littleEndian());
            int crc = readCrc.readInt();

            //结束数据
            byte[] eof = new byte[2];
            readFully(mInputStream, eof);

            //crc校验
            if (!(true || crc(data) == crc)) {
                return null;
            }
            //结束符校验,其实这个要不要都无所谓,双重校验了
            if (!(eof[0] == SerialProtocol.END && eof[1] == SerialProtocol.END)) {
                return null;
            }
            return data;
        }


        @Override
        public void run() {
            while (mRunning) {
                try {
                    if (mInputStream == null) {
                        // 暂停一点时间，免得一直循环造成CPU占用率过高
                        Thread.sleep(10);
                        continue;
                    }
                    byte[] data = readFrame();
                    if (data != null) {
                        parseData(new ReadBytes(data, littleEndian()));
                    }
                } catch (Exception e) {
                    LogUtils.e(TAG, "DefaultReadThread exception: ", e);
                    if (e instanceof IOException) {
                        mRunning = false;
                        reconnect();
                        LiveBus.post(new CommunicatorError());
                        break;
                    }
                }
            }
        }

        /**
         * 重连
         */
        private void reconnect() {
            CommunicateManager.getInstance().release();
            MainThreadUtils.postDelayed(new Runnable() {
                @Override
                public void run() {
                    CommunicateManager.getInstance().start();
                }
            }, 1500);
        }

        /**
         * 关闭读线程
         */
        void close() {
            mRunning = false;
            try {
                this.interrupt();
            } catch (Exception e) {
                LogUtils.e(TAG, "DefaultReadThread close: ", e);
            }
        }
    }
}
```
另外 2 个子类：
```
public class SerialBoxCommunicator extends BaseCommunicator {

    private int mBaudRate;              // 串口波特率
    private String mDevicePath;         // 串口地址
    private SerialPort mSerialPort;     // 串口

    public SerialBoxCommunicator(String devicePath, int baudRate) {
        this.mDevicePath = devicePath;
        this.mBaudRate = baudRate;
    }

    @Override
    public void open() throws OpenSerialPortException {
        if (mSerialPort != null) {
            close();
        }
        try {
            if (TextUtils.isEmpty(mDevicePath) || mBaudRate == 0) {
                throw new RuntimeException("SerialPort hasn't been configured! (device="
                        + mDevicePath + ",baudRate=" + mBaudRate);
            }
            mSerialPort = SerialPort.newBuilder(mDevicePath, mBaudRate).build();
            SystemClock.sleep(100);
            mInputStream = new BufferedInputStream(mSerialPort.getInputStream());
            mOutputStream = new BufferedOutputStream(mSerialPort.getOutputStream());
            startReadThread();
        } catch (Exception e) {
            // 清理数据
            close();
            // 抛出异常
            throw new OpenSerialPortException(e);
        }
    }

    @Override
    public boolean isAvailable() {
        if (mSerialPort == null) {
            return false;
        }
        return super.isAvailable();
    }
}

class BluetoothCommunicator extends BaseCommunicator implements BTDataReceiver.InputStreamChangedListener {

    private final BTDataReceiver receiver = new BTDataReceiver(MucangConfig.getContext(), this);

    @Override
    public void open() {
        receiver.start();
        startReadThread();
    }

    @Override
    public void send(SendData sendData) {
        // 蓝牙模拟，只接收数据，不发送
    }

    @Override
    public void close() {
        super.close();
        receiver.destroy();
    }

    @Override
    public void onInputStreamChanged(InputStream inputStream) {
        this.mInputStream = new BufferedInputStream(inputStream);
    }
}
```

## 小坑
UsbDeviceCommunicator 中，获取 mInputStream 时，包装 BufferedInputStream 使用的 bufferSize 设置为 32。三方库封装的 SerialInputStream 读取数据都是通过 usbConnection.bulkTransfer 来实现的：
```
/**
 * Performs a bulk transaction on the given endpoint.
 * The direction of the transfer is determined by the direction of the endpoint.
 *
 * @param endpoint the endpoint for this transaction
 * @param buffer buffer for data to send or receive
 * @param offset the index of the first byte in the buffer to send or receive
 * @param length the length of the data to send or receive. Before
 *               {@value Build.VERSION_CODES#P}, a value larger than 16384 bytes
 *               would be truncated down to 16384. In API {@value Build.VERSION_CODES#P}
 *               and after, any value of length is valid.
 * @param timeout in milliseconds, 0 is infinite
 * @return length of data transferred (or zero) for success,
 * or negative value for failure
 */
public int bulkTransfer(UsbEndpoint endpoint,
        byte[] buffer, int offset, int length, int timeout) {
    checkBounds(buffer, offset, length);
    if (mContext.getApplicationInfo().targetSdkVersion < Build.VERSION_CODES.P
            && length > UsbRequest.MAX_USBFS_BUFFER_SIZE) {
        length = UsbRequest.MAX_USBFS_BUFFER_SIZE;
    }
    return native_bulk_request(endpoint.getAddress(), buffer, offset, length, timeout);
}
```
**length 代表的读取数据的长度，会堵塞，直到读满 buffer。**而 FileInputStream 的 read 方法为：
```
/*
 * @param      b     the buffer into which the data is read.
 * @param      off   the start offset in array <code>b</code>
 *                   at which the data is written.
 * @param      len   the maximum number of bytes to read.
 * @return     the total number of bytes read into the buffer, or
 *             <code>-1</code> if there is no more data because the end of
 *             the stream has been reached.
 * @exception  IOException If the first byte cannot be read for any reason
 * other than end of file, or if the input stream has been closed, or if
 * some other I/O error occurs.
 * @exception  NullPointerException If <code>b</code> is <code>null</code>.
 * @exception  IndexOutOfBoundsException If <code>off</code> is negative,
 * <code>len</code> is negative, or <code>len</code> is greater than
 * <code>b.length - off</code>
 * @see        java.io.InputStream#read()
 */
public int read(byte b[], int off, int len) throws IOException {
    if (b == null) {
        throw new NullPointerException();
    } else if (off < 0 || len < 0 || len > b.length - off) {
        throw new IndexOutOfBoundsException();
    } else if (len == 0) {
        return 0;
    }

    int c = read();
    if (c == -1) {
        return -1;
    }
    b[off] = (byte)c;

    int i = 1;
    try {
        for (; i < len ; i++) {
            c = read();
            if (c == -1) {
                break;
            }
            b[off + i] = (byte)c;
        }
    } catch (IOException ee) {
    }
    return i;
}
```
**len 代表最大可读取的字节数，不会一直堵塞，直到读满 buffer。** 所以需要将 BufferedInputStream 的 bufferSize 设置小一点（默认8192），否则使用默认值一直读满 8192 个字节会等待较久的时间，不符合每 200ms 发送一次 64 byte 的实际场景。
另外，当没有 DevicePermission 时会弹窗，如果一直弹不太合适，所以有一个[绕过弹窗验证的思路](https://juejin.cn/post/6844903870368317447)，可以参考一下，待验证。