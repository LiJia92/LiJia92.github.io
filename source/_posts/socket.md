---
title: Android直播利用Socket传输实时数据
date: 2016-11-16 09:52:34
tags:
 - 直播
 - java
---

## 前言
通过前面一段时间的摸索，iOS的Multipeer Connectivity与Android的Wifi-Direct并不兼容，一些三方可能都是需要连接热点才能实现跨平台传输。热点是需要连接到同一个网络环境下的，那么考虑下Socket是否可行呢？理论上，应该是没问题的。为了验证，我这边便开始Android端的测试，至于跨平台就得等到iOS那边一起合作来验证了。

## Socket连接
这里分一个Client（采集实时数据），一个server（接收数据进行处理）这样的两个角色。在一个局域网下，他们要互相建立连接首先便是要能互相发现。我的方案是：Server监听一个端口，Client发送一个绑定端口的广播（UDP），广播信息包含Client的ip，Server再收到广播之后，利用收到的ip发送一个单播到Client，单播信息包含Server的ip，Client收到之后便知道Server的ip了，那么便可以建立连接了。

<!-- more -->

获取ip：
```
private static String getIP(Context application) {
    WifiManager wifiManager = (WifiManager) application.getSystemService(Context.WIFI_SERVICE);
    if (!wifiManager.isWifiEnabled()) {
        try {
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements(); ) {
                NetworkInterface intf = en.nextElement();
                for (Enumeration<InetAddress> enumIpAddr = intf.getInetAddresses(); enumIpAddr.hasMoreElements(); ) {
                    InetAddress inetAddress = enumIpAddr.nextElement();
                    if (!inetAddress.isLoopbackAddress()) {
                        return inetAddress.getHostAddress();
                    }
                }
            }
        } catch (SocketException e) {
            e.printStackTrace();
        }
    } else {
        WifiInfo wifiInfo = wifiManager.getConnectionInfo();
        int ipAddress = wifiInfo.getIpAddress();
        String ip = intToIp(ipAddress);
        return ip;
    }
    return null;
}

private static String intToIp(int i) {
    return (i & 0xFF) + "." +
            ((i >> 8) & 0xFF) + "." +
            ((i >> 16) & 0xFF) + "." +
            (i >> 24 & 0xFF);
}
```
Server监听端口：
```
public void startListening() {
    stop = false;
    mHandler.post(new Runnable() {
        @Override
        public void run() {
            try {
                byte[] buf = new byte[1024];
                DatagramSocket ds = new DatagramSocket(LISTENING_PORT);
                DatagramPacket dp = new DatagramPacket(buf, buf.length);
                String ip = getIP(MyApplication.getApplication());
                Log.e("TAG", "startListening:" + ip);
                ds.receive(dp);
                ds.close();
                StringBuffer sb = new StringBuffer();
                int i;
                for (i = 0; i < 1024; i++) {
                    if (buf[i] == 0) {
                        break;
                    }
                    sb.append((char) buf[i]);
                }
                sendIpBroadcast(sb.toString());
                setupServer();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    });
}
```
上面代码会在ds.receive(dp)阻塞，直到收到消息。
Client发送广播：
```
public void sendIpBroadcast() {
    mHandler.post(new Runnable() {
        @Override
        public void run() {
            final String message = getIP(MyApplication.getApplication());
            try {
                InetAddress adds = InetAddress.getByName(BROADCAST_IP);
                DatagramSocket ds = new DatagramSocket();
                DatagramPacket dp = new DatagramPacket(message.getBytes(),
                        message.length(), adds, LISTENING_PORT);
                ds.send(dp);
                ds.close();
                startListening();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    });
}
```
Client将自己的ip通过UDP广播发送出来，同时监听一个端口，用于接收Server发出的广播（带Server ip）。Server的ds.receive(dp)执行，获取到Client ip之后，便是发送自身的ip，以及建立ServerSocket。
```
private void setupServer() {
    mHandler.post(new Runnable() {
        @Override
        public void run() {
            try {
                mServerSocket = new ServerSocket(SERVER_PORT);
                while (!stop) {
                    Socket socket = mServerSocket.accept();
                    socketList.add(socket);
                    new Thread(new MyServerRunnable(socket)).start();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    });
}
```
mServerSocket.accept()也是个阻塞方法，直到有Client连接进来。
Client通过监听收到Server ip，之后便是建立连接了。
```
private void connect(final String serverIp) {
    mHandler.post(new Runnable() {
        @Override
        public void run() {
            try {
                socket = new Socket(serverIp, SERVER_PORT);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    });
}
```
通过``socket = new Socket(serverIp, SERVER_PORT);``即可建立连接了（也是阻塞方法）。

## 时间对齐
对于直播这种实时传递音视频数据的需求，在传递数据的时候都是需要打上时间戳的，用于计算超时。但是在不同手机上的时钟表现是不一样的，所以需要选取一个标准，这里我选用Server的时间。那么Client的时间如何与Server的时间对齐呢？我的方案是：Client发送本身时间到Server，Server在收到请求后回复自身的时间到Client，Client记录下发送请求的时间，与收到回复的时间。记发送请求的时间为C1，收到回复的时间为C2，Server回复的时间为S1。我们假定网络是稳定的，那么便能得到如下结论：
> (C1 + C2) / 2  ==>  S1
即Client在（C1 + C2）/ 2这个时刻，Server的时间是S1.

记后续发请求的时间为C'，记此时Server的时间为S'，那么便会有如下公式：
> C' - (C1 + C2) / 2 = S' - S1 (Client与Server同时流逝的时间是一致的)
==>  S' = C' - (C1 + C2)/2 + S1  ==> S' = C' - C2 + (C2-C1) / 2 + S1

如此在Client每次发送实时音视频数据时，便可依据Client此刻的时间计算出Server端的时间，打上时间戳后传递到Server端，Server端收到后可以与Server此刻的时间对比，来进行超时的计算或其他的一些处理。
这里姑且理解``delta = (C2-C1) / 2``为Client传递数据到Server的时间。这个时间越小，对齐得便越精准。所以需要多发送几次请求，然后取最小的delta。另外发送请求的时候包上时间数据，模拟收发的数据量是一致的。

## 传递H264数据
通过我之前的文章，已经可以采集到H264的数据了，格式是byte数组，那么要如何通过Socket传递到Server呢？我之前是利用``BufferedWriter``的write(String msg)方法，new String(byte[] data)。服务端在收到后通过String.getBytes()还原byte[]，但是将这种数据传递到MediaCodec进行解码，输出不出正确的视频。所以后面干脆就直接利用DataOutputStream传递byte[]数组了。
解码代码：
```
private void initMediaDecode() {
    Log.e("TAG", "initMediaDecode");
    MediaFormat format = MediaFormat.createVideoFormat("video/avc", 1280, 720);
    try {
        decoder = MediaCodec.createDecoderByType("video/avc");
        // 直接输出到surfaceView
        decoder.configure(format, surfaceView.getHolder().getSurface(), null, 0);
        decoder.start();
    } catch (IOException e) {
        e.printStackTrace();
    }

    new DecodeThread().start();
}

private class DecodeThread extends Thread {

    MediaCodec.BufferInfo mBufferInfo;
    int mCount = 0;

    public DecodeThread() {
        mBufferInfo = new MediaCodec.BufferInfo();
    }

    @Override
    public void run() {
        while (true) {
            try {
                if (h264data.size() > 0) {
                    byte[] data = h264data.get(0);
                    h264data.remove(0);
                    Log.e("Media", "save to file data size:" + data.length);
                    // 保存数据到文件
                    // Util.save(data, 0, data.length, path, true);

                    ByteBuffer[] inputBuffers = decoder.getInputBuffers();
                    int inputBufferIndex = decoder.dequeueInputBuffer(100);
                    if (inputBufferIndex >= 0) {
                        ByteBuffer inputBuffer = inputBuffers[inputBufferIndex];
                        inputBuffer.clear();
                        inputBuffer.put(data);
                        decoder.queueInputBuffer(inputBufferIndex, 0, data.length, mCount * TIME_INTERNAL, 0);
                    }

                    // Get output buffer index
                    int outputBufferIndex = decoder.dequeueOutputBuffer(mBufferInfo, 100);
                    while (outputBufferIndex >= 0) {
                        Log.e("Media", "onFrame index:" + outputBufferIndex);
                        decoder.releaseOutputBuffer(outputBufferIndex, true);
                        outputBufferIndex = decoder.dequeueOutputBuffer(mBufferInfo, 0);
                    }
                } else {
                    sleep(TIME_INTERNAL);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```
通过此种解码，发现解码的视频花屏，但是存入到文件中再打开则是比较清晰流畅的，估计是解码有问题。


[Demo代码](https://github.com/LiJia92/SocketDemo)
