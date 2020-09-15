---
title: 一次 Python 工具编写的经历《一》
date: 2020-09-15 19:32:30
tags:
 - python
---
## 背景
最近的项目涉及到硬件，硬件由工厂生产，生产之后需要连接到电脑，然后执行检测程序。检测程序需要做两件事：
1. 检测硬件的可用性；
2. 从硬件获取到硬件编号，拿到编号后去服务器请求一个序列号；
3. 拿到序列号后告知标签打印机进行打印。

后面硬件装箱时，贴上此标签，通过服务器就可以知道一个序列号对应的具体硬件是哪一个了（排除人为标签贴错的情况）。那么，现在就是需要做这样的一个检测工具，运行在 windows 平台。

<!-- more -->

## 准备
工具的第一部分，已经由另一个同事做得差不多了，我只需要在基础上进行拓展就行。同事选用的语言是 python，我也是好久没碰过了，这次完善工具，浪费了颇多时间，必须记录一下。我选用的 IDE 是 PyCharm，也是由 JetBrains 出品的，与 Android Studio 一套风格，上手容易。py 文件拷入到工程，然后 import 一大堆的三方库，完毕后工程如期跑起来了。与硬件的通信也是基于串口的，采用的库是 serial。
```
import serial
import serial.tools.list_ports

# 列出所有的串口
port_list = list(serial.tools.list_ports.comports())
if len(port_list) <= 0:
    print("未发现串口")
    QMessageBox.warning(self, '警告', '未发现串口', QMessageBox.Yes)
    return
self.cb_comname.clear()
for port in port_list:
    self.com_dict["%s" % port[0]] = "%s" % port[1]
    # 添加到下拉选择框中
    self.cb_comname.addItem(port[0])

# 打开串口
serialPort = self.cb_comname.currentText()
baudRate = 115200
self.port_open(serialPort, baudRate)
self.timer_rec.start(10)

# 定义 timer_rec，每 10 毫秒读取一次数据
self.timer_rec = QTimer(self)
self.timer_rec.timeout.connect(self.read_data)

# 解析数据
def read_data(self):
    if self.openFlag == True:
        n = self.port.inWaiting()
        if n > 0:
            data1 = self.port.read(1)
            if self.bytes2hex(data1) == '0xa5':
                data2 = self.port.read(1)
                if self.bytes2hex(data2) == '0x5a':
                    zhenlength = self.port.read(1)
                    zhenType = self.port.read(1)
                    if zhenType == b'\x10' or zhenType == b'\x11':
                        data = data1 + data2 + zhenlength + zhenType + self.port.read(60)
                    if zhenType == b'\x08':
                        data = data1 + data2 + zhenlength + zhenType + self.port.read(44)
                    if self.saveFlag == True:
                        if (self.f.closed == False):
                            self.f.write(self.bytestohex(data) + '\n')
                    head = None
                    if zhenType == b'\x10':
                        head = StructConverter.encoding(data, Signal1)
                    if zhenType == b'\x11':
                        head = StructConverter.encoding(data, Signal2)
                        self.txt_show.setText(self.bytestohex(data))
                    if zhenType == b'\x08':
                        head = StructConverter.encoding(data, Signal3)
                    
                    # 解析数据搞事情
                    ...
```

## 获取硬件编号
现在需要从硬件获取到编码，通过 serial 打开的串口发送一个指令到硬件即可，指令是个 byte 数组，在 python 中可以这样写：
```
data = bytearray(b'\xff\xff\xff\xff')
self.port.write(data)
```
b 代表是 byte，后面的 \xff 是字节，根据已经定制好的协议，写入相应的数据即可。然后收到的数据进行解析得到硬件编号。
```
# 获取设备号
data = "".join(['{:x}'.format(int(i)) for i in head.carSn])
self.txt_sn.setText(data)
```
head.carSn 是个 byte 数组，通过** '{:x}'.format 转换成 hex string 进行输出 **。eg：0x33 0xff 0xda 0x5 0x52 0x53 0x36 0x35 0x43 0x39 0x10 0x43 -> 33ffda55253363543391043。
因为 App 也是需要拿到这个硬件号去做唯一匹配的，所以 App 和这个 python 工具的转换公式必须是一样，贴下 App 中如何转换：
```
StringBuilder builder = new StringBuilder();
for (int i = 0; i < 12; i++) {
    int a = data.readUnsignedByte();
    builder.append(Integer.toHexString(a));
}
```
注意 Java byte 是有符号的，需要转成无符号进行 hex 转换：
```
public final int readUnsignedByte() throws IndexOutOfBoundsException {
    return read() & 0xff;
}
```
进过测试，双端通过同一硬件转换出来的 hex string 是一致的，达到目标。

## 获取序列号
拿到硬件编号需要获取序列号，走网络请求，引入 requests 库。
```
import requests

# 发送请求获取序列号
url = "http://request.url.html"
d = {'paramA': A, 'paramB': B, 'paramC': C}
response = requests.post(url, data=d)
if response.status_code == requests.codes.ok:
    # 解析序列号
    result = response.json().get('data')
    num = result.get('serialNum')
    qrCode = result.get('qrCode')
    self.txt_number.setText(num)
    self.do_print(num, qrCode)
```
通过 post 请求，指定 data 参数，便可发送请求了。利用 .json() 便可将结果转成 json 串，然后 get 到相应的数据。

## 检测逻辑
在获取序列号之前，还需要先检测数据项是否可用，通过 key value 形式定义一个如下结构：
```
# 检查项列表
checkList = {'检测项1': 0,
             '检测项2': 0,
             '检测项3': 0,
             ...
             }

```
每次开始检测时，把数据全部置为 0，然后数据每变化一次，加1，最终只有变化次数 >= 2 的才有效。
```
# global 关键字，可在函数中改变全局变量的值
global checkList

# 检测项1
old = self.check1.toPlainText()
new = hex(head.check1)
if new != old:
    checkList['check1'] = checkList['check1'] + 1
self.check1.setText(new)

# 遍历找到不符合的值，提醒
for key in checkList:
    if checkList[key] < 2:
        self.box = QMessageBox(QMessageBox.Information, '提示', key + "未通过检测")
        jump = self.box.addButton("跳过检测", QMessageBox.YesRole)
        self.box.addButton("确定", QMessageBox.NoRole)
        self.box.exec()
        # 点击的是 jump 按钮
        if self.box.clickedButton() == jump:
        	# 强制跳过检测
            checkList[key] = 2
        print(key + "未通过检测")
        return
```

下一步便是打印了，欲知后事如何，且听下回分解。