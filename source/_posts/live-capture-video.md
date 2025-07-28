---
title: 【Android音视频开发】- 实时采集视频
date: 2016-10-20 10:24:19
tags:
 - Android 进阶
---

## 前言
通过我的上一篇文章，可以知道直播大致有几个步骤：音视频采集 -> 美颜/滤镜/特效处理 -> 编码 -> 封包 -> 推流 -> 分发 -> 解码/渲染/播放。那么首先便从采集开始，这里我先做的视频采集。
那么实时采集视频有哪些方案呢？

## 调研
通过各种调研，查阅文章，了解到目前Android实时采集视频大致有3种方式：
1. 通过Android Camera拍摄预览中设置setPreviewCallback实现onPreviewFrame接口，实时截取每一帧视频流数据
2. 通过通过Android的MediaRecorder，在SetoutputFile函数中绑定LocalSocket实现
3. 流媒体服务器方式，利用ffmpeg或GetStreamer等获取Camera视频

通过学习，大致了解了1，2两种方式的实现方式，但是对于第3种方式，暂时没有研究。

<!-- more -->

## spydroid
当我们在接触一个全新领域的时候，最希望的是能实实在在看到一个demo产品，通过demo产品我们更容易理解其内在的原理。在网上看到了许多的开源项目，最后选择了[spydroid](https://github.com/fyhertz/spydroid-ipcamera)，感觉它跟Android结合更紧密。更多的信息可以参考[Android视频采集方案总结](http://www.smarting.me/android-video-caputure.html)。

### 拷贝工程
通过github看到的项目是Eclipse结构，这里我把代码拷贝下来后，通过AS打开，配置一些信息后项目结构如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/10/video1.png)

[streaming](https://github.com/fyhertz/libstreaming)是作者封装的一套库。
> A solution for streaming H.264, H.263, AMR, AAC using RTP on Android

### 运行
项目拷贝到AS后，有部分错误，修复后成功运行在MI 4LTE。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/10/video2.png)
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/10/video3.png)
它可以通过http，也可以通过rtsp进行推流，打开rtsp推流的开关，首页会多了一个VLC的地址。
我在Win 10上使用Chrome接收失败，打开网站后Connect一直连不上。所以采取的VLC方式。
打开VLC输入首页提示的地址，即可看到推流成功了。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/10/video4.png)
demo跑通后，便有了一个直观的感受，接下来便是看代码了。

### 代码
从``SpydroidActivity``开始，会看到它连接了一个Service：
```
private ServiceConnection mRtspServiceConnection = new ServiceConnection() {

	@Override
	public void onServiceConnected(ComponentName name, IBinder service) {
		mRtspServer = (CustomRtspServer) ((RtspServer.LocalBinder)service).getService();
		mRtspServer.addCallbackListener(mRtspCallbackListener);
		mRtspServer.start();
	}

	@Override
	public void onServiceDisconnected(ComponentName name) {}

};
```
看到``RtspServer``中的start方法：
```
public void start() {
	if (!mEnabled || mRestart) stop();
	if (mEnabled && mListenerThread == null) {
		try {
			mListenerThread = new RequestListener();
		} catch (Exception e) {
			mListenerThread = null;
		}
	}
	mRestart = false;
}
```
再看到``RequestListener``：
```
class RequestListener extends Thread implements Runnable {

	private final ServerSocket mServer;

	public RequestListener() throws IOException {
		try {
			mServer = new ServerSocket(mPort);
			start();
		} catch (BindException e) {
			Log.e(TAG,"Port already in use !");
			postError(e, ERROR_BIND_FAILED);
			throw e;
		}
	}

	public void run() {
		Log.i(TAG,"RTSP server listening on port "+mServer.getLocalPort());
		while (!Thread.interrupted()) {
			try {
				new WorkerThread(mServer.accept()).start();
			} catch (SocketException e) {
				break;
			} catch (IOException e) {
				Log.e(TAG,e.getMessage());
				continue;
			}
		}
		Log.i(TAG,"RTSP server stopped !");
	}

	public void kill() {
		try {
			mServer.close();
		} catch (IOException e) {}
		try {
			this.join();
		} catch (InterruptedException ignore) {}
	}

}
```
这是一个进程类，在构造方法中直接调用了Thread.start()，那么便会执行到run()方法。可以看到，初始化了一个ServerSocket，然后当有客户端连接后（通过VLC输入地址开始播放即是连接到这个ServerSocket），便会执行``WorkerThread``线程：
```
class WorkerThread extends Thread implements Runnable {

	private final Socket mClient;
	private final OutputStream mOutput;
	private final BufferedReader mInput;

	// Each client has an associated session
	private Session mSession;

	public WorkerThread(final Socket client) throws IOException {
		mInput = new BufferedReader(new InputStreamReader(client.getInputStream()));
		mOutput = client.getOutputStream();
		mClient = client;
		mSession = new Session();
	}

	public void run() {
		Request request;
		Response response;

		Log.i(TAG, "Connection from "+mClient.getInetAddress().getHostAddress());

		while (!Thread.interrupted()) {

			request = null;
			response = null;

			// Parse the request
			try {
				request = Request.parseRequest(mInput);
			} catch (SocketException e) {
				// Client has left
				break;
			} catch (Exception e) {
				// We don't understand the request :/
				response = new Response();
				response.status = Response.STATUS_BAD_REQUEST;
			}

			// Do something accordingly like starting the streams, sending a session description
			if (request != null) {
				try {
					response = processRequest(request);
				}
				catch (Exception e) {
					// This alerts the main thread that something has gone wrong in this thread
					postError(e, ERROR_START_FAILED);
					Log.e(TAG,e.getMessage()!=null?e.getMessage():"An error occurred");
					e.printStackTrace();
					response = new Response(request);
				}
			}

			// We always send a response
			// The client will receive an "INTERNAL SERVER ERROR" if an exception has been thrown at some point
			try {
				response.send(mOutput);
			} catch (IOException e) {
				Log.e(TAG,"Response was not sent properly");
				break;
			}

		}

		// Streaming stops when client disconnects
		boolean streaming = isStreaming();
		mSession.syncStop();
		if (streaming && !isStreaming()) {
			postMessage(MESSAGE_STREAMING_STOPPED);
		}
		mSession.release();

		try {
			mClient.close();
		} catch (IOException ignore) {}

		Log.i(TAG, "Client disconnected");

	}

	public Response processRequest(Request request) throws IllegalStateException, IOException {
		Response response = new Response(request);

        //Ask for authorization unless this is an OPTIONS request
        if(!isAuthorized(request) && !request.method.equalsIgnoreCase("OPTIONS"))
        {
            response.attributes = "WWW-Authenticate: Basic realm=\""+SERVER_NAME+"\"\r\n";
            response.status = Response.STATUS_UNAUTHORIZED;
        }
        else
        {
		    /* ********************************************************************************** */
		    /* ********************************* Method DESCRIBE ******************************** */
		    /* ********************************************************************************** */
            if (request.method.equalsIgnoreCase("DESCRIBE")) {

                // Parse the requested URI and configure the session
                mSession = handleRequest(request.uri, mClient);
                mSessions.put(mSession, null);
                mSession.syncConfigure();

                String requestContent = mSession.getSessionDescription();
                String requestAttributes =
                        "Content-Base: " + mClient.getLocalAddress().getHostAddress() + ":" + mClient.getLocalPort() + "/\r\n" +
                                "Content-Type: application/sdp\r\n";

                response.attributes = requestAttributes;
                response.content = requestContent;

                // If no exception has been thrown, we reply with OK
                response.status = Response.STATUS_OK;

            }

            /* ********************************************************************************** */
            /* ********************************* Method OPTIONS ********************************* */
            /* ********************************************************************************** */
            else if (request.method.equalsIgnoreCase("OPTIONS")) {
                response.status = Response.STATUS_OK;
                response.attributes = "Public: DESCRIBE,SETUP,TEARDOWN,PLAY,PAUSE\r\n";
                response.status = Response.STATUS_OK;
            }

            /* ********************************************************************************** */
            /* ********************************** Method SETUP ********************************** */
            /* ********************************************************************************** */
            else if (request.method.equalsIgnoreCase("SETUP")) {
                Pattern p;
                Matcher m;
                int p2, p1, ssrc, trackId, src[];
                String destination;

                p = Pattern.compile("trackID=(\\w+)", Pattern.CASE_INSENSITIVE);
                m = p.matcher(request.uri);

                if (!m.find()) {
                    response.status = Response.STATUS_BAD_REQUEST;
                    return response;
                }

                trackId = Integer.parseInt(m.group(1));

                if (!mSession.trackExists(trackId)) {
                    response.status = Response.STATUS_NOT_FOUND;
                    return response;
                }

                p = Pattern.compile("client_port=(\\d+)-(\\d+)", Pattern.CASE_INSENSITIVE);
                m = p.matcher(request.headers.get("transport"));

                if (!m.find()) {
                    int[] ports = mSession.getTrack(trackId).getDestinationPorts();
                    p1 = ports[0];
                    p2 = ports[1];
                } else {
                    p1 = Integer.parseInt(m.group(1));
                    p2 = Integer.parseInt(m.group(2));
                }

                ssrc = mSession.getTrack(trackId).getSSRC();
                src = mSession.getTrack(trackId).getLocalPorts();
                destination = mSession.getDestination();

                mSession.getTrack(trackId).setDestinationPorts(p1, p2);

                boolean streaming = isStreaming();
                mSession.syncStart(trackId);
                if (!streaming && isStreaming()) {
                    postMessage(MESSAGE_STREAMING_STARTED);
                }

                response.attributes = "Transport: RTP/AVP/UDP;" + (InetAddress.getByName(destination).isMulticastAddress() ? "multicast" : "unicast") +
                        ";destination=" + mSession.getDestination() +
                        ";client_port=" + p1 + "-" + p2 +
                        ";server_port=" + src[0] + "-" + src[1] +
                        ";ssrc=" + Integer.toHexString(ssrc) +
                        ";mode=play\r\n" +
                        "Session: " + "1185d20035702ca" + "\r\n" +
                        "Cache-Control: no-cache\r\n";
                response.status = Response.STATUS_OK;

                // If no exception has been thrown, we reply with OK
                response.status = Response.STATUS_OK;

            }

            /* ********************************************************************************** */
            /* ********************************** Method PLAY *********************************** */
            /* ********************************************************************************** */
            else if (request.method.equalsIgnoreCase("PLAY")) {
                String requestAttributes = "RTP-Info: ";
                if (mSession.trackExists(0))
                    requestAttributes += "url=rtsp://" + mClient.getLocalAddress().getHostAddress() + ":" + mClient.getLocalPort() + "/trackID=" + 0 + ";seq=0,";
                if (mSession.trackExists(1))
                    requestAttributes += "url=rtsp://" + mClient.getLocalAddress().getHostAddress() + ":" + mClient.getLocalPort() + "/trackID=" + 1 + ";seq=0,";
                requestAttributes = requestAttributes.substring(0, requestAttributes.length() - 1) + "\r\nSession: 1185d20035702ca\r\n";

                response.attributes = requestAttributes;

                // If no exception has been thrown, we reply with OK
                response.status = Response.STATUS_OK;

            }

            /* ********************************************************************************** */
            /* ********************************** Method PAUSE ********************************** */
            /* ********************************************************************************** */
            else if (request.method.equalsIgnoreCase("PAUSE")) {
                response.status = Response.STATUS_OK;
            }

            /* ********************************************************************************** */
            /* ********************************* Method TEARDOWN ******************************** */
            /* ********************************************************************************** */
            else if (request.method.equalsIgnoreCase("TEARDOWN")) {
                response.status = Response.STATUS_OK;
            }

            /* ********************************************************************************** */
            /* ********************************* Unknown method ? ******************************* */
            /* ********************************************************************************** */
            else {
                Log.e(TAG, "Command unknown: " + request);
                response.status = Response.STATUS_BAD_REQUEST;
            }
        }
		return response;

	}

    /**
     * Check if the request is authorized
     * @param request
     * @return true or false
     */
    private boolean isAuthorized(Request request)
    {
        String auth = request.headers.get("authorization");
        if(mUsername == null || mPassword == null || mUsername.isEmpty())
            return true;

        if(auth != null && !auth.isEmpty())
        {
            String received = auth.substring(auth.lastIndexOf(" ")+1);
            String local = mUsername+":"+mPassword;
            String localEncoded = Base64.encodeToString(local.getBytes(),Base64.NO_WRAP);
            if(localEncoded.equals(received))
                return true;
        }

        return false;
    }
}
```
这个类比较长，但是我只需关注``采集``。看到``processRequest方法``，当有Client连接后，便会有session了，然后打印一些配置之类的信息，最后看到``mSession.syncStart(trackId)``，可以猜测这个方法便是开始采集、推流了。
```
/**
 * Starts a stream in a synchronous manner. <br />
 * Throws exceptions in addition to calling a callback.
 * @param id The id of the stream to start
 **/
public void syncStart(int id) 			
		throws CameraInUseException,
		StorageUnavailableException,
		ConfNotSupportedException,
		InvalidSurfaceException,
		UnknownHostException,
		IOException {

	Stream stream = id==0 ? mAudioStream : mVideoStream;
	if (stream!=null && !stream.isStreaming()) {
		try {
			InetAddress destination =  InetAddress.getByName(mDestination);
			stream.setTimeToLive(mTimeToLive);
			stream.setDestinationAddress(destination);
			stream.start();
			if (getTrack(1-id) == null || getTrack(1-id).isStreaming()) {
				postSessionStarted();
			}
			if (getTrack(1-id) == null || !getTrack(1-id).isStreaming()) {
				mHandler.post(mUpdateBitrate);
			}
		} catch (UnknownHostException e) {
			postError(ERROR_UNKNOWN_HOST, id, e);
			throw e;
		} catch (CameraInUseException e) {
			postError(ERROR_CAMERA_ALREADY_IN_USE , id, e);
			throw e;
		} catch (StorageUnavailableException e) {
			postError(ERROR_STORAGE_NOT_READY , id, e);
			throw e;
		} catch (ConfNotSupportedException e) {
			postError(ERROR_CONFIGURATION_NOT_SUPPORTED , id, e);
			throw e;
		} catch (InvalidSurfaceException e) {
			postError(ERROR_INVALID_SURFACE , id, e);
			throw e;
		} catch (IOException e) {
			postError(ERROR_OTHER, id, e);
			throw e;
		} catch (RuntimeException e) {
			postError(ERROR_OTHER, id, e);
			throw e;
		}
	}

}
```
参数id用来标识是音频，还是视频，最后执行到``stream.start()``，其调用的是最顶层的Stream实现类``MediaStream``的start方法。
```
/** Starts the stream. */
public synchronized void start() throws IllegalStateException, IOException {

	if (mDestination==null)
		throw new IllegalStateException("No destination ip address set for the stream !");

	if (mRtpPort<=0 || mRtcpPort<=0)
		throw new IllegalStateException("No destination ports set for the stream !");

	mPacketizer.setTimeToLive(mTTL);

	if (mMode != MODE_MEDIARECORDER_API) {
		encodeWithMediaCodec();
	} else {
		encodeWithMediaRecorder();
	}

}
```
可以看到，根据Mode选择``encodeWithMediaCodec``或是``encodeWithMediaRecorder``。
然后看到其继承类的实现方法，这里我只关注了``VideoStream``的实现。
```
/**
 * Video encoding is done by a MediaRecorder.
 */
protected void encodeWithMediaRecorder() throws IOException {

  Log.d(TAG,"Video encoded using the MediaRecorder API");

  // We need a local socket to forward data output by the camera to the packetizer
  createSockets();

  // Reopens the camera if needed
  destroyCamera();
  createCamera();

  // The camera must be unlocked before the MediaRecorder can use it
  unlockCamera();

  try {
    mMediaRecorder = new MediaRecorder();
    mMediaRecorder.setCamera(mCamera);
    mMediaRecorder.setVideoSource(MediaRecorder.VideoSource.CAMERA);
    mMediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP);
    mMediaRecorder.setVideoEncoder(mVideoEncoder);
    mMediaRecorder.setPreviewDisplay(mSurfaceView.getHolder().getSurface());
    mMediaRecorder.setVideoSize(mRequestedQuality.resX,mRequestedQuality.resY);
    mMediaRecorder.setVideoFrameRate(mRequestedQuality.framerate);

    // The bandwidth actually consumed is often above what was requested
    mMediaRecorder.setVideoEncodingBitRate((int)(mRequestedQuality.bitrate*0.8));

    // We write the ouput of the camera in a local socket instead of a file !			
    // This one little trick makes streaming feasible quiet simply: data from the camera
    // can then be manipulated at the other end of the socket
    mMediaRecorder.setOutputFile(mSender.getFileDescriptor());

    mMediaRecorder.prepare();
    mMediaRecorder.start();

  } catch (Exception e) {
    throw new ConfNotSupportedException(e.getMessage());
  }

  // This will skip the MPEG4 header if this step fails we can't stream anything :(
  InputStream is = mReceiver.getInputStream();
  try {
    byte buffer[] = new byte[4];
    // Skip all atoms preceding mdat atom
    while (!Thread.interrupted()) {
      while (is.read() != 'm');
      is.read(buffer,0,3);
      if (buffer[0] == 'd' && buffer[1] == 'a' && buffer[2] == 't') break;
    }
  } catch (IOException e) {
    Log.e(TAG,"Couldn't skip mp4 header :/");
    stop();
    throw e;
  }

  // The packetizer encapsulates the bit stream in an RTP stream and send it over the network
  mPacketizer.setDestination(mDestination, mRtpPort, mRtcpPort);
  mPacketizer.setInputStream(mReceiver.getInputStream());
  mPacketizer.start();

  mStreaming = true;

}


/**
 * Video encoding is done by a MediaCodec.
 */
protected void encodeWithMediaCodec() throws RuntimeException, IOException {
  if (mMode == MODE_MEDIACODEC_API_2) {
    // Uses the method MediaCodec.createInputSurface to feed the encoder
    encodeWithMediaCodecMethod2();
  } else {
    // Uses dequeueInputBuffer to feed the encoder
    encodeWithMediaCodecMethod1();
  }
}

/**
 * Video encoding is done by a MediaCodec.
 */
@SuppressLint("NewApi")
protected void encodeWithMediaCodecMethod1() throws RuntimeException, IOException {

  Log.d(TAG,"Video encoded using the MediaCodec API with a buffer");

  // Updates the parameters of the camera if needed
  createCamera();
  updateCamera();

  // Estimates the framerate of the camera
  measureFramerate();

  // Starts the preview if needed
  if (!mPreviewStarted) {
    try {
      mCamera.startPreview();
      mPreviewStarted = true;
    } catch (RuntimeException e) {
      destroyCamera();
      throw e;
    }
  }

  EncoderDebugger debugger = EncoderDebugger.debug(mSettings, mQuality.resX, mQuality.resY);
  final NV21Convertor convertor = debugger.getNV21Convertor();

  mMediaCodec = MediaCodec.createByCodecName(debugger.getEncoderName());
  MediaFormat mediaFormat = MediaFormat.createVideoFormat("video/avc", mQuality.resX, mQuality.resY);
  mediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, mQuality.bitrate);
  mediaFormat.setInteger(MediaFormat.KEY_FRAME_RATE, mQuality.framerate);
  mediaFormat.setInteger(MediaFormat.KEY_COLOR_FORMAT,debugger.getEncoderColorFormat());
  mediaFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
  mMediaCodec.configure(mediaFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
  mMediaCodec.start();

  Camera.PreviewCallback callback = new Camera.PreviewCallback() {
    long now = System.nanoTime()/1000, oldnow = now, i=0;
    ByteBuffer[] inputBuffers = mMediaCodec.getInputBuffers();
    @Override
    public void onPreviewFrame(byte[] data, Camera camera) {
      oldnow = now;
      now = System.nanoTime()/1000;
      if (i++>3) {
        i = 0;
        //Log.d(TAG,"Measured: "+1000000L/(now-oldnow)+" fps.");
      }
      try {
        int bufferIndex = mMediaCodec.dequeueInputBuffer(500000);
        if (bufferIndex>=0) {
          inputBuffers[bufferIndex].clear();
          convertor.convert(data, inputBuffers[bufferIndex]);
          mMediaCodec.queueInputBuffer(bufferIndex, 0, inputBuffers[bufferIndex].position(), now, 0);
        } else {
          Log.e(TAG,"No buffer available !");
        }
      } finally {
        mCamera.addCallbackBuffer(data);
      }				
    }
  };

  for (int i=0;i<10;i++) mCamera.addCallbackBuffer(new byte[convertor.getBufferSize()]);
  mCamera.setPreviewCallbackWithBuffer(callback);

  // The packetizer encapsulates the bit stream in an RTP stream and send it over the network
  mPacketizer.setDestination(mDestination, mRtpPort, mRtcpPort);
  mPacketizer.setInputStream(new MediaCodecInputStream(mMediaCodec));
  mPacketizer.start();

  mStreaming = true;

}

/**
 * Video encoding is done by a MediaCodec.
 * But here we will use the buffer-to-surface methode
 */
@SuppressLint({ "InlinedApi", "NewApi" })
protected void encodeWithMediaCodecMethod2() throws RuntimeException, IOException {

  Log.d(TAG,"Video encoded using the MediaCodec API with a surface");

  // Updates the parameters of the camera if needed
  createCamera();
  updateCamera();

  // Estimates the framerate of the camera
  measureFramerate();

  EncoderDebugger debugger = EncoderDebugger.debug(mSettings, mQuality.resX, mQuality.resY);

  mMediaCodec = MediaCodec.createByCodecName(debugger.getEncoderName());
  MediaFormat mediaFormat = MediaFormat.createVideoFormat("video/avc", mQuality.resX, mQuality.resY);
  mediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, mQuality.bitrate);
  mediaFormat.setInteger(MediaFormat.KEY_FRAME_RATE, mQuality.framerate);
  mediaFormat.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
  mediaFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
  mMediaCodec.configure(mediaFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
  Surface surface = mMediaCodec.createInputSurface();
  ((SurfaceView)mSurfaceView).addMediaCodecSurface(surface);
  mMediaCodec.start();

  // The packetizer encapsulates the bit stream in an RTP stream and send it over the network
  mPacketizer.setDestination(mDestination, mRtpPort, mRtcpPort);
  mPacketizer.setInputStream(new MediaCodecInputStream(mMediaCodec));
  mPacketizer.start();

  mStreaming = true;

}
```
可以看到，整体实现有2个方式：
1. MediaRecorder采集数据，通过绑定LocalSocket来获取数据
2. 利用Camera又分了2种方式：回调``onPreviewFrame``获取数据进行处理，或者直接输出到``Surface``

这与之前说到的不谋而合。

## 问题
通过绑定LocalSocket的方式，我在运行（MI 4LTE Android 6.0.1）的时候出现了``MediaRecorder: start failed -38``的错误。经过Google，后面找到[解决方案](http://stackoverflow.com/questions/26990816/mediarecorder-issue-on-android-lollipop/27118142#27118142)，setOutputFile时使用``ParcelFileDescriptor``。作者也在[spydroid libstreaming](https://github.com/fyhertz/libstreaming)中提到了，并进行了修正。于是我拷贝最新的``libstreaming``到工程中，运行的依然出错：MediaRecorder: start failed -2147483648，这下我没招了QAQ。
后面想到``github issues``或许也有别人用的时候有这个问题呢，于是我便去看看。但是很不幸，说是在Android 5.0之后不能用MediaRecorder绑定LocalSocket的方式了==>[issues#227](https://github.com/fyhertz/libstreaming/issues/227)、[issues208](https://github.com/fyhertz/libstreaming/issues/208)、[issues#155](https://github.com/fyhertz/libstreaming/issues/155)。
毕竟是好几年前的库了，之前Android都没出到5、6呢，后面作者也没有进行维护了，不过我在OPPA A31（Android 4.4.4）的环境下通过此种方式确实可以运行。

## 参考
[Android 实时视频采集/编码/传输/解码/播放—方案调研（初）](http://www.cnblogs.com/skyseraph/archive/2012/03/23/2415018.html)
[Android 实时视频采集—MediaRecoder录制](http://www.cnblogs.com/skyseraph/archive/2012/03/31/2427593.html)
[libstreaming](https://github.com/fyhertz/libstreaming)
[spydroid-ipcamera](https://github.com/fyhertz/spydroid-ipcamera)
[libstreaming-examples](https://github.com/fyhertz/libstreaming-examples)
