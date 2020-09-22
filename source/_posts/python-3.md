---
title: 一次 Python 工具编写的经历《三》
date: 2020-09-19 17:55:59
tags:
 - python
---

将整个 python 工具写好之后，最后一步便是生成 exe 文件提供给 Windows 电脑使用了，可以使用 pyinstaller 生成。这里需要注意个坑：**MacOS 只能生成 MacOS 对应的可执行文件，所以若要生成 exe，需要切换到 Windows 平台**。
安装 [PyInstaller](https://github.com/pyinstaller/pyinstaller/)，然后进入到需要打包的 .py 文件所在文件夹，执行 cmd 指令：pyinstaller -F -w xx.py。
打包是很容易了，但是能正常运行则需要运气。使用 pyCharm 可以正常运行 py 文件，但是打成 exe 后运行直接崩溃。所以第一步：接入异常提示。

## 异常提示
```
try:
    # do something
except Exception as e:
    self.box = QMessageBox(QMessageBox.Warning, '提示',
                           "出错了!" + traceback.format_exc())
    self.box.exec()
```
获取到提示后，下一个错误就来了。

<!-- more -->

## WindowsError:[Error 6]
运行 exe 报错：WindowsError:[Error 6]，报错文件为 imgkit/config.py，里面用到了 subprocess。网上查阅相关文章，需要添加全量的参数设置。
修改前：
```
subprocess.Popen(['where', 'xvfb-run'],stdout=subprocess.PIPE).communicate()[0].strip()
```
修改后：
```
subprocess.Popen(['where', 'xvfb-run'],shell=True, stdin=subprocess.PIPE, stderr=subprocess.PIPE,stdout=subprocess.PIPE).communicate()[0].strip()
```
然后重新打包，运行成功。
PS：python 修改三方库文件，直接 pyCharm 修改保存即可，十分方便了~

## 打包指令
-F, --onefile Py代码只有一个文件
-D, --onedir Py代码放在一个目录中（默认是这个）
-K, --tk 包含TCL/TK
-d, --debug 生成debug模式的exe文件
-w, --windowed, --noconsole 窗体exe文件(WindowsOnly)
-c, --nowindowed, --console 控制台exe文件(WindowsOnly)
-X, --upx 使用upx压缩exe文件
-o DIR, --out=DIR 设置spec文件输出的目录，默认在PyInstaller同目录
-v FILE, --version=FILE 加入版本信息文件

python 工具之旅到此结束。
