---
title: Android 串口通信小记
date: 2020-07-15 15:40:19
tags:
 - 日常开发
---
最近项目有需要用到串口通信，硬件同事通过串口给应用层发送数据，稍微记录一下。

## 串口
串口通信（Serial Communications）是指外设和计算机间，通过数据信号线 、地线、控制线等，按位进行传输数据的一种通讯方式。串口通信是计算机中非常常见的通信方式，比如一些有线鼠标、键盘、打印机等都是通过串口进行通信的。串口的通信一般使用3根线完成，分别是地线、发送线（tx）、接收线（rx）。
串口中有五个重要的参数：串口设备名、波特率、奇偶校验位、数据位、停止位。
1. 设备名称：串口的名称。
2. 波特率：传输速率的参数，波特率和传输距离成反比。
3. 校验位：在串口通信中一种简单的检错方式，有四种检错方式：偶、奇、高和低，允许无校验位。
4. 数据位：通信中实际数据位的参数
5. 停止位：用于表示单个包的最后一位。

<!-- more -->

## 接入
Google 官方有基于[串口通信的 demo](https://github.com/cepr/android-serialport-api)，部分代码可以用以借鉴。在 github 上有几个三方库，封装了串口通信，项目决定采用的是[Android-SerialPort-API](https://github.com/licheedev/Android-SerialPort-API)。
打开串口：
```
private synchronized void doOpenSerial() throws OpenSerialPortException {
    if (mSerialPort != null) {
        close();
    }
    try {
        mSerialPort = SerialPort.newBuilder("/dev/ttyMT1", 115200).build();

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
```
在打开串口后，开启一个线程循环读取数据。

## 读取与解析
```
/**
 * 默认读线程
 */
private class DefaultReadThread extends Thread {

    private final byte[] mReceiveBuffer;
    private boolean mRunning = true;
    private final byte[] buffer;

    private int index;

    DefaultReadThread() {
        // 接收收据缓存
        mReceiveBuffer = new byte[16];
        //多缓存一点，以防万一
        buffer = new byte[256];
        index = 0;
    }

    @Override
    public void run() {

        while (mRunning) {
            try {
                if (mInputStream.available() > 0) {
                    int len = mInputStream.read(mReceiveBuffer);
                    if (len > 0) {
                        System.arraycopy(mReceiveBuffer, 0, buffer, index, len);
                        index += len;
                        Arrays.fill(mReceiveBuffer, (byte) 0);
                        while (true) {
                            //查找数据头和数据尾
                            int start = -1;
                            int end = -1;
                            for (int i = 0; i < index; i++) {
                                if (buffer[i] == SerialProtocol.HEAD1 && i + 1 < index && buffer[i + 1] == SerialProtocol.HEAD2) {
                                    start = i;
                                }
                                if (start != -1 && buffer[i] == SerialProtocol.END && i + 1 < index && buffer[i + 1] == SerialProtocol.END){
                                    end = i + 1;
                                }
                                if (end != -1) {
                                    break;
                                }
                            }
                            //说明前面有脏数据，把数据前移start位
                            if (start > 0) {
                                for (int i = 0; i < buffer.length && i + start < buffer.length; i++) {
                                    buffer[i] = buffer[i + start];
                                }
                                start = 0;
                                end = end - start;
                                index -= start;
                            }
                            //如果找到了
                            if (start == 0 && end > start) {
                                //先把数据写入真实数据区域
                                byte[] data = new byte[end - start + 1];
                                System.arraycopy(buffer, start, data, 0, data.length);
                                //然后向左移动数据
                                for (int i = start; i < buffer.length; i++) {
                                    if (i + data.length < buffer.length) {
                                        buffer[i] = buffer[i + data.length];
                                    } else {
                                        buffer[i] = 0;
                                    }
                                }
                                //把index前移
                                index -= data.length;
                                //这个其实应该不会发生
                                index = Math.max(0, index);
                                ReadBytes readBytes = new ReadBytes(data, bigEndian());
                                //将数据交给处理器来处理
                                SerialProtocol protocol = new SerialProtocol(readBytes);
                                if (protocol.isValid()) {
                                    // 解析协议数据
                                    parseData(new ReadBytes(protocol.data, bigEndian()));
                                }
                            } else {
                                break;
                            }
                        }
                    }
                } else {
                    // 暂停一点时间，免得一直循环造成CPU占用率过高
                    Thread.sleep(10);
                }

            } catch (Exception e) {
                LogUtils.e(TAG, "DefaultReadThread exception: ", e);
            }
        }
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
```
一般会制定通讯协议，一个有效包需要完整包含起始、终止、以及校验位等，通过 InputStream 读取到字节数组后按照协议进行解析数据。读取有几个注意点：
1. 数据包可能有多个类型，有的包 x 个字节，有的包 y 个字节，如果底层硬件都是往一个串口发送数据，那么就要做好解析的流程。**每次读取应该是 x、y 的最大公约数**，这样不管是 x 包还是 y 包发过来，我读取 n 次之后都能组装成一个完整的包，进行解析。例如：x = 30，y = 40，那么最好就是每次读取 10 个字节，这样读3次能组装成一个 x 的包，读 4 次组装成一个 y 的包。当然也可以直接一口气读取最大的值，40。但是这样就会导致一个问题：如果我发的是 x 包，只有 30 个字节，mInputStream.read(mReceiveBuffer) 会一直读满 40 个字节才返回，那么就会出现前 30 个字节是 x 包，后 10 个字节是 y 包的一部分，这样在解析的时候反而增加了成本。所以，目前项目中采用的就是 16 作为最大公约数，依此定义最小的包 16 个字节，其他的包必须是 16 的倍数，例如 32、64、128 等等。
2. 所有的数据会先读取到一个 buffer 中，通过解析起始、结束标记位，来取出一个完整的包，再将 buffer 的剩余位左移此包的长度。例如我读取一个 64 字节的包，在读取多次后，buffer 长度正好为 70（可能有脏数据导致 buffer 长度不为 16 的倍数），假设解析到 start = 2,end = 66，start 之前的 2 个字节应该作为脏数据被抛弃掉，先将 2->66 位置的字节组装成 byte 数组抛到上层去解析。同时 buffer 左移 66 位，buffer 中就会只剩下 3 个字节了。
3. 如何从 buffer 里解析出一个完整的包呢？通过协议，找到起始的 start index，找到终止的 end index，然后就可以确定一个完成的包了。但是如果内容是不确定的，那么就有可能导致找到的 end index 会提前。例如，结束字节为固定的 OxFF，但是内容很有可能就包含了 OxFF 这个字节，所以 end index 就会小于实际值，那么取出来的包就不完整，如此便会导致后面的包持续错位，一直解析错误。现在我采取的做法很“古板”，制定的结束字节为 2 个 OxFF，那么我便会一直找连续的 OxFF，代码可以简单一点，找连续的 3 个、4 个、5 个，然后取最后一个 OxFF 的 index 作为 end index。
4. byte 数组作为通用结构，硬件层一般是 c、c++，写入的字节一般是小端序，而 Java 一般是大端序，所以需要进行转换。
```
public class ReadBytes {

    // 是否需要高低位转换
    private final boolean needHighLowCovert;
    private final byte[] data;
    private final int len;
    private int position = 0;

    public ReadBytes(byte[] data) {
        this(data, false);
    }

    public ReadBytes(byte[] data, boolean needHighLowCovert) {
        this.data = data;
        this.len = data.length;
        this.needHighLowCovert = needHighLowCovert;
    }

    public final byte read() throws IndexOutOfBoundsException {
        return data[position++];
    }

    public void reset() {
        position = 0;
    }

    /**
     * 读取无符号byte
     *
     * @return
     * @throws IndexOutOfBoundsException
     */
    public final int readUnsignedByte() throws IndexOutOfBoundsException {
        return read() & 0xff;
    }

    public final byte[] readBytes(int len) throws IndexOutOfBoundsException {
        byte[] value = Arrays.copyOfRange(data, position, position + len);
        position += len;
        return value;
    }

    public final boolean readBoolean() throws IndexOutOfBoundsException {
        byte value = read();
        return value == 1;
    }

    public final int readShort() throws IndexOutOfBoundsException {
        int value;
        if (needHighLowCovert) {
            value = (data[position++] & 0xff)
                    | ((data[position++] & 0xff) << 8);
        } else {
            value = ((data[position++] & 0xff) << 8)
                    | data[position++];
        }
        return value;
    }

    public final int readInt() throws IndexOutOfBoundsException {
        int value;
        if (needHighLowCovert) {
            value = ((data[position++] & 0xFF)
                    | ((data[position++] & 0xFF) << 8)
                    | ((data[position++] & 0xFF) << 16)
                    | ((data[position++] & 0xFF) << 24));

        } else {
            value = ((data[position++] & 0xFF) << 24)
                    | ((data[position++] & 0xFF) << 16)
                    | ((data[position++] & 0xFF) << 8)
                    | (data[position++] & 0xFF);
        }
        return value;
    }

    public final long readLong() throws IndexOutOfBoundsException {
        if (needHighLowCovert) {
            return (((long) (data[position++]) & 0xFF)
                    | ((long) (data[position++] & 0xFF) << 8)
                    | ((long) (data[position++] & 0xFF) << 16)
                    | ((long) (data[position++] & 0xFF) << 24)
                    | ((long) (data[position++] & 0xFF) << 32)
                    | ((long) (data[position++] & 0xFF) << 40)
                    | ((long) (data[position++] & 0xFF) << 48)
                    | ((long) (data[position++] & 0xFF) << 56)
            );
        } else {
            return (((long) (data[position++] & 0xFF) << 56)
                    | ((long) (data[position++] & 0xFF) << 48)
                    | ((long) (data[position++] & 0xFF) << 40)
                    | ((long) (data[position++] & 0xFF) << 32)
                    | ((long) (data[position++] & 0xFF) << 24)
                    | ((long) (data[position++] & 0xFF) << 16)
                    | ((long) (data[position++] & 0xFF) << 8)
                    | ((long) (data[position++] & 0xFF)));
        }
    }

    public final float readFloat() throws IndexOutOfBoundsException {
        return Float.intBitsToFloat(readInt());
    }

    public final double readDouble() throws IndexOutOfBoundsException {
        return Double.longBitsToDouble(readLong());
    }
}
```
5. 串口在进行调试时不太方便，需要设备连接硬件，有时候在项目初始阶段，硬件采买十分有限。串口无非是不停写入数据然后应用层解析，所以为了方便调试，可以采用 Socket 方式（例如蓝牙）连接另一个客户端（手机人人都有），进行模拟写入数据。Java 在写入数据时，可以使用**buffer.order(ByteOrder.LITTLE_ENDIAN)** 来模拟底层硬件的小端序写入，这样解析端无需进行修改。
```
private BluetoothSocket createSocket() throws IOException {
    BluetoothDevice device = BluetoothAdapter.getDefaultAdapter().getRemoteDevice(macAddress);
    BluetoothSocket socket = device.createRfcommSocketToServiceRecord(uuid);
    socket.connect();
    return socket;
}

public OutputStream connect() throws IOException {
    socket = createSocket();
    os = socket.getOutputStream();
    return os;
}

@Override
public void encode(OutputStream os) throws IOException {
    byte[] bytes = toBytes();
    os.write(bytes);
}

/**
 * 按照协议组装模拟数据
 */
public byte[] toBytes() {
    byte[] data = toData();
    ByteBuffer buffer = ByteBuffer.allocate(data.length + 9);
    buffer.order(ByteOrder.LITTLE_ENDIAN);
    // 帧头，两字节 0xA5 0x5A
    buffer.put((byte) 0xA5);
    buffer.put((byte) 0x5A);
    int length = data.length + 5;
    // 帧长 帧长不包括帧（起始+EOF）
    // len=1（帧长）+数据长度+4（校验）
    // 所以=1 + 43 + 4
    buffer.put((byte) length);
    buffer.put(data);
    // 校验4 CRC-32数据域校验结果，CRC参数见*
    buffer.putInt(0xFFFFFFFF);
    // EOF2 0xC3 0xC3
    buffer.put((byte) 0xC3);
    buffer.put((byte) 0xC3);
    return buffer.array();
}
```