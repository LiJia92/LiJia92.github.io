---
title: Android 实现大文件分片上传
date: 2019-07-12 15:57:19
tags:
 - 日常开发
---
项目中有视频上传的功能，但一直没做断点续传，针对大视频上传不友好，最近的版本需求将断点续传加上了，服务端采用的是 multipart/form-data 编码方式来实现，那么客户端也依照这个协议来做就好了。

## multipart/form-data
multipart/form-data 方式用于大数据 Post 请求，用做分片正好合适。它对数据有一定的格式，参照示例：
```
POST http://www.example.com HTTP/1.1
Content-Type:multipart/form-data; boundary=----WebKitFormBoundaryrGKCBY7qhFd3TrwA

------WebKitFormBoundaryrGKCBY7qhFd3TrwA
Content-Disposition: form-data; name="text"

title
------WebKitFormBoundaryrGKCBY7qhFd3TrwA
Content-Disposition: form-data; name="file"; filename="chrome.png"
Content-Type: image/png

PNG ... content of chrome.png ...
------WebKitFormBoundaryrGKCBY7qhFd3TrwA--
```
每部分都是以``--boundary``开始，紧接着是内容描述信息，然后是回车，最后是字段具体内容（文本或二进制）。如果传输的是文件，还要包含文件名和文件类型信息。消息主体最后以``--boundary--``标示结束。

<!-- more -->

## 原生实现
如果使用 Android 原生 HttpUrlConnection 来拼接数据，参照[从原理角度解析Android （Java） http 文件上传](https://blog.csdn.net/lmj623565791/article/details/23781773)贴出部分代码：
```
private static final String BOUNDARY = "----WebKitFormBoundaryT1HoybnYeFOGFlBR";
 
/**
 * 
 * @param params
 *            传递的普通参数
 * @param uploadFile
 *            需要上传的文件名
 * @param fileFormName
 *            需要上传文件表单中的名字
 * @param newFileName
 *            上传的文件名称，不填写将为uploadFile的名称
 * @param urlStr
 *            上传的服务器的路径
 * @throws IOException
 */
public void uploadForm(Map<String, String> params, String fileFormName,
		File uploadFile, String newFileName, String urlStr)
		throws IOException {
	if (newFileName == null || newFileName.trim().equals("")) {
		newFileName = uploadFile.getName();
	}

	StringBuilder sb = new StringBuilder();
	/**
	 * 普通的表单数据
	 */
	for (String key : params.keySet()) {
		sb.append("--" + BOUNDARY + "\r\n");
		sb.append("Content-Disposition: form-data; name=\"" + key + "\""
				+ "\r\n");
		sb.append("\r\n");
		sb.append(params.get(key) + "\r\n");
	}
	/**
	 * 上传文件的头
	 */
	sb.append("--" + BOUNDARY + "\r\n");
	sb.append("Content-Disposition: form-data; name=\"" + fileFormName
			+ "\"; filename=\"" + newFileName + "\"" + "\r\n");
	sb.append("Content-Type: image/jpeg" + "\r\n");// 如果服务器端有文件类型的校验，必须明确指定ContentType
	sb.append("\r\n");

	byte[] headerInfo = sb.toString().getBytes("UTF-8");
	byte[] endInfo = ("\r\n--" + BOUNDARY + "--\r\n").getBytes("UTF-8");
	System.out.println(sb.toString());
	URL url = new URL(urlStr);
	HttpURLConnection conn = (HttpURLConnection) url.openConnection();
	conn.setRequestMethod("POST");
	conn.setRequestProperty("Content-Type",
			"multipart/form-data; boundary=" + BOUNDARY);
	conn.setRequestProperty("Content-Length", String
			.valueOf(headerInfo.length + uploadFile.length()
					+ endInfo.length));
	conn.setDoOutput(true);

	OutputStream out = conn.getOutputStream();
	InputStream in = new FileInputStream(uploadFile);
	out.write(headerInfo);

	byte[] buf = new byte[1024];
	int len;
	while ((len = in.read(buf)) != -1)
		out.write(buf, 0, len);

	out.write(endInfo);
	in.close();
	out.close();
	if (conn.getResponseCode() == 200) {
		System.out.println("上传成功");
	}

}
```
拼接好字符串之后，转成 byte 数组，然后写入到 http connection 中即可。

## OkHttp 实现
项目中有基于 OkHttp 封装网络请求，但是不支持 multipart/form-data，那么便根据 OkHttp 自己实现一个吧。
```
// Http 请求 Client
private val client: OkHttpClient = OkHttpClient().newBuilder()
        .connectTimeout(0, TimeUnit.MILLISECONDS)
        .writeTimeout(60 * 1000, TimeUnit.MILLISECONDS)
        .readTimeout(60 * 1000, TimeUnit.MILLISECONDS)
        .build()

/**
 * 分片上传，采用 OkHttp MultipartBody
 */
fun uploadPart(data: ByteArray, uploadId: String, key: String, partNumber: Int, progressListener: ProgressListener?):
        String? {
    val requestBody = VideoUploadRequestBody.create(MediaType.parse("video/mp4"), data, progressListener)
    val multipartBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("filename", key, requestBody)
            .addFormDataPart("uploadId", uploadId)
            .addFormDataPart("key", key)
            .addFormDataPart("partNumber", partNumber.toString())
            .addFormDataPart("partSize", data.size.toString())
            .build()
    val url = RequestUtils.buildFullUrl(apiHost, "/api/open/upload/part.htm", signKey, extraParams)

    val request = Request.Builder()
            .url(url)
            .post(multipartBody)
            .build()

    val response = client.newCall(request).execute()
    return response.body()?.string()
}
```
利用 MultipartBody.addFormDataPart 可以很方便的添加参数，而不用自己拼接了。``MultipartBody.FORM``即对应``multipart/form-data``：
```
public static final MediaType FORM = MediaType.get("multipart/form-data")
```
针对 client 返回的 response，想要获取数据只需要调用：
```
response.body()?.string()
```
但是**此方法只能调用一次，调用之后 client 会关闭通道**，这让我在调试返回结果的时候浪费不少时间。
data 作为数据来源，可以从 File 中读取：
```
/**
 * 获取某一片对应的二进制数据
 * PART_SIZE：每一片的大小
 *
 * @param partSize 当前第几片
 * @param file 文件对象
 *
 * @return 对应片段的二进制数据流
 */
private fun getPartData(partSize: Int, file: File): ByteArray? {
    val result = ByteArray(PART_SIZE)
    var accessFile: RandomAccessFile? = null
    try {
        accessFile = RandomAccessFile(file, "r")
        accessFile.seek((partSize - 1L) * PART_SIZE)
        return when (val readSize = accessFile.read(result)) {
            -1 -> null
            PART_SIZE -> result
            else -> {
                val tempArray = ByteArray(readSize)
                System.arraycopy(result, 0, tempArray, 0, readSize)
                tempArray
            }
        }
    } catch (e: IOException) {
        LogUtils.e(TAG, e.toString())
    } finally {
        IOUtils.close(accessFile)
    }
    return null
}
```
至此，数据便能使用 multipart/form-data Post 到服务器了。

## 进度监听
看到上述示例中的 VideoUploadRequestBody：
```
class VideoUploadRequestBody(val contentType: MediaType?, val data: ByteArray, val listener: ProgressListener?)
    : RequestBody() {

    companion object {
        @JvmStatic
        fun create(contentType: MediaType?, data: ByteArray, listener: ProgressListener?): RequestBody {
            return VideoUploadRequestBody(contentType, data, listener)
        }
    }

    override fun contentType(): MediaType? {
        return contentType
    }

    @Throws(IOException::class)
    override fun contentLength(): Long {
        return data.size.toLong()
    }

    @Throws(IOException::class)
    override fun writeTo(sink: BufferedSink) {
        var localSink = sink
        if (listener != null) {
            localSink = Okio.buffer(CountSink(localSink))
        }

        localSink.writeAll(Okio.source(ByteArrayInputStream(data)))
        // 必须添加 flush，不然最后一片会上传失败
        localSink.flush()
    }

    private inner class CountSink(delegate: Sink) : ForwardingSink(delegate) {

        internal var bytesWritten = 0L
        internal var contentLength = 0L

        @Throws(IOException::class)
        override fun write(source: Buffer, byteCount: Long) {
            super.write(source, byteCount)
            if (contentLength == 0L) {
                contentLength = contentLength()
            }
            bytesWritten += byteCount

            listener?.onProgress(bytesWritten, contentLength, bytesWritten == contentLength)
        }
    }
}
```
继承 RequestBody，在每一次 write 的时候回调一下，BufferedSink writeAll 方法内部会每次写入 8192 字节。
```
@Override
public long writeAll(Source source) throws IOException {
    if (source == null) { throw new IllegalArgumentException("source == null"); }
    long totalBytesRead = 0;
    for (long readCount; (readCount = source.read(buffer, Segment.SIZE)) != -1; ) {
        totalBytesRead += readCount;
        emitCompleteSegments();
    }
    return totalBytesRead;
}

final class Segment {
  /** The size of all segments in bytes. */
  static final int SIZE = 8192;
}
```
所以每写入 8192 字节会回调一次，对于进度监听有特殊需求的，可自行修改 writeTo 方法。
这个回调只是针对单片的，还需要一个针对整个文件的回调：
```
// 当前上传的是第几片
private var currentPart = 0
// 上传文件的 size
private var size = 0L

override fun onProgress(currentLength: Long, contentLength: Long, complete: Boolean) {
    val progress = (currentPart - 1) * PART_SIZE + currentLength
    listener?.onProgress(progress, size, progress == size)
}
```
如此，整个文件上传的进度监听即实现了。
注：要实现断点续传，则需要在每个分片上传完之后保存到本地数据库，然后续传的时候根据数据库保存的最新片段取出数据进行上传。

## 参考
[四种常见的 POST 提交数据方式](https://imququ.com/post/four-ways-to-post-data-in-http.html)
[从原理角度解析Android （Java） http 文件上传](https://blog.csdn.net/lmj623565791/article/details/23781773)
[OkHttp踩坑记：为何 response.body().string() 只能调用一次？](https://juejin.im/post/5a524eef518825732c536025)