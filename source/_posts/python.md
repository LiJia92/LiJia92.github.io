---
title: 使用 Python 分析坐标
date: 2023-11-08 14:20:10
tags:
 - 开发工具
---
项目中会用到坐标系，会有一系列的坐标点，通过这些坐标点的运算才判断某些业务。因为车子位置是移动的，所以这些坐标会不停的变化，通过日志记录下一串坐标如下：
> 1=Pos{x=-11, y=-1, z=2771}，2=Pos{x=0, y=0, z=2771}，3=Pos{x=84, y=-5, z=54}，4=Pos{x=703, y=-823, z=51}，5=Pos{x=862, y=-801, z=51}，6=Pos{x=72, y=74, z=51}，7=Pos{x=83, y=-84, z=51}，8=Pos{x=-75, y=1063, z=12}，9=Pos{x=70, y=-1084, z=11}，10=Pos{x=-59, y=392, z=51}，11=Pos{x=-122, y=442, z=51}，12=Pos{x=3, y=343, z=51}

<!-- more -->

其中 1 代表上一时刻车辆的位置，2 代表当前车辆的位置。因为坐标系使用的车身坐标系，基于车子位置实时建立坐标系，所以当前车辆的位置坐标永远是（0，0）。3 是一个教学点的 位置，6、7 是教学点延伸出来的 2 个点。8、9 是延长 10 米的点，用来判断线段是否相交。
当车子与 8、9 连线相交时，会评判一个轨迹偏移的业务。那有了这样的一组坐标，我想要直观地感受到是否相交，所以需要将这些坐标点画出来。
在项目的工程中当然可以画，但是不够灵活，编译时间也会比较慢，最后还是选取的 Python 作为工具。

## 引入 matplotlib 库
通过搜索，Python 中用来绘制坐标系的常用库是 matplotlib。于是在 PyCharm 中敲入``import matplotlib``，会有 install package 的提示，点一下就开始安装包了。但是给了一个错误提示：
> no such option: --build-dir

在 [stackoverflow](https://stackoverflow.com/questions/65085956/pycharm-venv-failed-no-such-option-build-dir) 上搜到，是 PyCharm 版本太低导致的，升一下就可以安装成功了。

## 启动黑屏
引入 matplotlib 库后，随便写点测试代码绘制，运行后发现只有一个黑屏的弹窗，啥也看不到，就像这样：
<img src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG731.png"  width=50% />
最后在 [这个论坛](https://www.qiniu.com/qfans/qnso-56013105#comments) 找到个代码：
```
import matplotlib
import platform
if platform.system() == 'Darwin':
    matplotlib.use('MacOSX')
else:
    matplotlib.use('TkAgg')
```
于是加上去（我是 MacOSX），运行后果然可以看到正常的内容绘制了。

## 坐标错乱
虽然内容可以绘制了，可还是不太对：
<img src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG732.jpg"  width=50% />
坐标没有按顺序递增，画出来的全是一条线。后面在 [这里](https://blog.csdn.net/weixin_45464159/article/details/105516537) 找到是坐标值的原因，我解析出来就是个文本，对比不了大小，需要转成数值类型。于是将 value 转成 int 类型，重新绘制：
<img src="https://images-1258496336.cos.ap-chengdu.myqcloud.com/2023/WechatIMG733.jpg"  width=50% />
如此非常一目了然了，红线与长的绿线果然是相交了，代码中的问题也暴露出来了：我以为 3、6、7 三个点是一条线，可实际不是的，需要调整策略了。

## 代码
最终代码如下：
```
import json
import platform

import matplotlib
from matplotlib import pyplot as plt

if platform.system() == 'Darwin':
    matplotlib.use('MacOSX')
else:
    matplotlib.use('TkAgg')

f = open("data/point.txt")
value = f.read()
d = value.split("，")
index_list = [0, 1, 2, 5, 6, 7, 8]  // 数组 index 对应日志里的数值需要 -1
x = []
y = []
xx = []
yy = []
for i in range(len(d)):
    if not index_list.__contains__(i):
        continue
    s = d[i]
    index = s.find("{")
    value = s[index:len(s)].replace("{", "{\"").replace("=", "\":").replace(", ", ",\"")
    p = json.loads(value)
    if i == 0 or i == 1:
        x.append(int(p['x']))
        y.append(int(p['y']))
    else:
        xx.append(int(p['x']))
        yy.append(int(p['y']))
plt.plot(x, y, c='#ff0000')
plt.plot(xx, yy, c='#00ff00')
plt.show()

```
先将日志放到一个文件里，通过``read()``得到一个字符串。通过``split(“，”)``得到单个``1=Pos{x=-11, y=-1, z=2771}``类似的串。通过 i 将不需要的数据过滤掉，直接 continue。针对想要的数据将前面的``1=Pos``给去掉得到``{x=-11, y=-1, z=2771}``这样的串，将 x、y、z 用引号包起来，等号改成冒号，这样就可以用 json 序列化了。最后使用``p['x']``的方式拿到 x、y 坐标，然后放到集合中，通过 plot 绘制出来。

## 小结
本篇文章主要记录一下，借助 Python 做一些数据分析、坐标绘制，会很方便。环境搭建好了之后，使用 matplotlib 库，绘制代码网上一搜一大把，都十分简单易懂，一分钟就能有一个能跑起来的工具。后续有其他数据分析，也可以任意改造代码，运行起来非常快，十分高效！
