---
title: 一次 Python 工具编写的经历《二》
date: 2020-09-19 16:40:33
tags:
 - python
---
继[上篇文章](http://lastwarmth.win/2020/09/15/python-1/)，获取到序列号后，接下来就是得打印了。python 里使用打印，可以直接使用**PyQt5.QtPrintSupport**。

## 打印
获取打印机列表：
```
def printerList():
    printer = []
    printerInfo = QPrinterInfo()
    print('availablePrinterNames', printerInfo.availablePrinterNames())
    print('defaultPrinterName', printerInfo.defaultPrinterName())
    for item in printerInfo.availablePrinters():
        printer.append(item.printerName())
    return printer
```

<!-- more -->

打印一个文档：
```
def printing(printer, content):
    printerInfo = QPrinterInfo()
    p = QPrinter()
    for item in printerInfo.availablePrinters():
        if printer == item.printerName():
            p = QPrinter(item)
    doc = QTextDocument()
    doc.setHtml(content)
    # doc.setPageSize(QSizeF(p.logicalDpiX() * (80 / 25.4),p.logicalDpiY() * (297 / 25.4)))
    p.setOutputFormat(QPrinter.NativeFormat)
    doc.print_(p)
```
doc.setHtml 设置一个 Html 进行打印。使用此种方法，发现一个问题：**html 左右布局，但是打出来的标签是上下布局的**，找了多种方法没找到解决方案，寻到一个曲线救国的方案：**先转成图片，然后再打印。**

## Html 转图片
在网上找到的是使用[imgkit 库](https://github.com/jarrekk/imgkit)。安装有两步：
1. pip install imgkit
2. brew install wkhtmltopdf(Mac OS)

若使用 Windows，前往[wkhtmltopdf 官网](https://wkhtmltopdf.org/)下载安装。
运行后依然报错：
> Can't create pdf using python PDFKIT Error : “ No wkhtmltopdf executable found:”

在 [stactoverflow](https://stackoverflow.com/questions/27673870/cant-create-pdf-using-python-pdfkit-error-no-wkhtmltopdf-executable-found) 上找到相应解决方案(Windows)：
```
import pdfkit
path_wkhtmltopdf = r'C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe'
config = pdfkit.configuration(wkhtmltopdf=path_wkhtmltopdf)
pdfkit.from_url("http://google.com", "out.pdf", configuration=config)
```
然后就可以转成图片了。
```
def do_print(self, num, qrCode):
    # 生成图片再打印
    html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale="><style> html, body, div { margin: 0; padding: 0; } table { } table td { padding: 12px; vertical-align: middle; text-align: center; } p { margin: 8px 0; font-size: 24px; font-weight: bold; }</style><title></title></head><body><table ><tr><td><img src="' + qrCode + '" width="100" height="100"/></td><td><p>序列号</p><p>' + num + '</p></td></tr></table></body></html>'
    path = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltoimage.exe'
    config = Config(wkhtmltoimage=path)
    options = {
        'width': 350,
        'height': 140,
        'encoding': 'UTF-8'
    }
    imgkit.from_string(html, 'print.png', config=config, options=options)
```
options 是生成图片的宽高，看打印需求进行调整。代码成功执行后，本地就会生成一个 print.png 的图片了。

## 打印图片
打印图片使用 QPainter：
```
printer = "defaultPrinter"
printerInfo = QPrinterInfo()
p = QPrinter()
# p.setPaperSize(QSizeF(50,20),QPrinter.Millimeter)
# p.setPageSize(QPageSize.LetterExtra)
for item in printerInfo.availablePrinters():
    if printer == item.printerName():
        p = QPrinter(item)
img = QImage('print.png')
painter = QPainter(p)
# rect = painter.viewport()
# size = img.size()
# size.scale(rect.size(), Qt.KeepAspectRatio)
# painter.setViewport(rect.x(), rect.y(), size.width(), size.height())
# painter.setWindow(img.rect())
painter.drawImage(0, 0, img)
painter.end()
```
图片打印成功，后续要需要根据纸张大小进行调整，以达到最佳的打印效果。
下一步便是生成 Windows 可运行工具了，欲知后事如何，且听下回分解。

## 参考
[Can't create pdf using python PDFKIT Error : “ No wkhtmltopdf executable found:”](https://stackoverflow.com/questions/27673870/cant-create-pdf-using-python-pdfkit-error-no-wkhtmltopdf-executable-found)
[pythonhtml2image: imgkit 和 wkhtmltoimage的坑](https://blog.csdn.net/threegirl/article/details/81107939)
[QPainter绘制图片填充方式（正常大小、剪切大小、自适应大小、平铺）
](https://www.cnblogs.com/MakeView660/p/11225445.html)
[Qt中的打印操作](https://blog.csdn.net/amnes1a/article/details/70597506)
[Qt打印详解](https://blog.csdn.net/fanyun_01/article/details/53431786)
[Qt实现 二维码打印功能](https://www.geek-share.com/detail/2729251049.html)
[Python调用打印机参考例子](https://www.cnblogs.com/ribavnu/p/4790262.html)