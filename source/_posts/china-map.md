---
title: Android 绘制中国地图
date: 2019-01-25 14:07:52
tags:
 - 日常开发
---
最近的版本有这样一个需求：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/TIM%E5%9B%BE%E7%89%8720190125141415.png)

有 3 个要素：
1. 中国地图
2. 高亮省区
3. 中心显示数字

面对这样一个需求，该如何实现呢？

<!-- more -->

## 高德地图
因为项目是基于高德地图来做的，所以很自然而然的想到了高德。但是当查阅高德地图相关 Api 后，发现并没有能够实现这样需求的方法，所以只能另寻他法了。

## 图片叠加
让设计师出图，实现第一个要素开发成本极低。至于``高亮省区``，也是继续让设计师出图，与全国地图分辨率保持一致，为每个省区设计一张高亮的图，其他地方透明，这样算下来设计师得出 35 张图。若不考虑性能，将图片无脑叠加倒也可以实现。但是作为 Android 开发都知道，这样的一张不算小的图片加载到手机里，占用的内存怕是个庞然大物，更别谈极端情况下要叠加 35 张这样的大图了。
优化下叠加方案：将高亮的省区做成小图，一个包含了省区所有区域的矩形，省区内部高亮，其他区域透明，这样图变小了，但是就得计算小图相对于全国大图的相对位置，对于每个小图都得计算一个比例。同时，绘制高亮省区时可以每次都只取2张图进行叠加，叠加完后释放一张图再加载另一张图，而不用一次性全部加载在内存中。这种方案想想是 ok 的，但是感觉依然还是很麻烦。于是继续探索~

## SVG Path
其实网上有很多文章也是有类似的需求，简单搜一下就发现了 SVG 这个解决方案了。看了一眼，便决定就是它了！
SVG：可缩放矢量图形（英语：Scalable Vector Graphics，SVG）是一种基于可扩展标记语言（XML），用于描述二维矢量图形的图形格式。**<path>**元素是 SVG 基本形状中最强大的一个，它不仅能创建其他基本形状，还能创建更多其他形状。

### SVG Path 用 Android 绘制
这里先贴一下我找的北京市的 Path 数据：
```
<svg height="475" width="565">
    <path id="Beijing" d="M421.139,189.75L420.782,186.894L419.95,184.989L425.045,182.863L425.426,181.18L424.23699999999997,176.413H422.56899999999996L415.90299999999996,172.964L412.21299999999997,176.654C412.21299999999997,176.654,411.08799999999997,183.239,411.381,181.534C411.66999999999996,179.82999999999998,407.688,185.822,407.688,185.822L407.094,190.108L407.926,192.371L412.807,191.537L416.5,192.608L418.284,190.941L421.139,189.75Z"/>
</svg>
```
这里要注意一点：**SVG Path 里的数据都是在一个固定宽高的矩形里的坐标集合，所以当 Android View 与 SVG 的宽高不一致时，需要进行缩放。**注意下面代码中的 scale 属性：
```
/**
 * 计算地图边界
 * 1.黑龙江是中国最东，最北的省份
 * 2.新疆是中国最西的省份
 * 3.海南是中国最南的省份
 */
private fun computeBounds() {
    val hljRF = RectF()
    xPaths[HEILONGJIANG_CODE]?.computeBounds(hljRF, true)

    val hnRF = RectF()
    xPaths[HAINAN_CODE]?.computeBounds(hnRF, true)

    mapWidth = hljRF.right
    mapHeight = hnRF.bottom
}

override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    super.onMeasure(widthMeasureSpec, heightMeasureSpec)
    val speSize = View.MeasureSpec.getSize(widthMeasureSpec)
    scale = speSize / mapWidth
    setMeasuredDimension(speSize, (speSize * mapHeight / mapWidth).toInt())
}

override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    // 缩放画布
    canvas.scale(scale, scale)
    ...
}
```
再来看到 Path 里有一些 M、L、Z 等字符，这些都是 Path 元素里的指令，后面紧跟的数字即是坐标。
> M x,y 移动指令，映射 Path 中的 moveTo
L x,y 画直线指令，映射 Path 中的 lineTo
H x   画水平线指令，映射 Path 中的 lineTo，不过要使用上一个坐标的 y
V y  画垂直线指令，映射 Path 中的 lineTo，不过要使用上一个坐标的 x
C x1,y1,x2,y2,x,y 三次贝塞尔曲线指令，映射 Path 中的 cubicTo
S x2,y2,x,y 跟在 C 指令后面使用，用 C 指令的结束点做控制点，映射 cubicTo
Q x1,y1,x,y 二次贝塞尔曲线指令，映射 quadTo
T x,y 跟在 Q 指令后面使用，使用 Q 的 x,y 做控制点，映射 quadTo
Z path 关闭指令，映射 close

注意**小写指令为使用相对坐标**，下面 2 行 Path 得到的结果是一样的：
```
M421.139,189.75L420.782,186.894
M421.139,189.75l-0.357,-2.856
```
基于 Android Path 实现不了小写指令的那种效果，所以只能使用大写指令。这里贴一下一个将 SVG Path 转成 Android Path 的工具类：
```
/**
 * 仅限大写指令转换
 */
public class SvgPathToAndroidPath {
    private int svgPathLenght = 0;
    private String svgPath = null;
    private int mIndex;
    private List<Integer> cmdPositions = new ArrayList<>();
    /**
     * M x,y
     * L x,y
     * H x
     * V y
     * C x1,y1,x2,y2,x,y
     * Q x1,y1,x,y
     * S x2,y2,x,y
     * T x,y
     * */
    public Path parser(String svgPath) {
        this.svgPath = svgPath;
        svgPathLenght = svgPath.length();
        mIndex = 0;
        Path lPath = new Path();
        lPath.setFillType(Path.FillType.WINDING);
        //记录最后一个操作点
        PointF lastPoint = new PointF();
        findCommand();
        for (int i = 0; i < cmdPositions.size(); i++) {
            Integer index = cmdPositions.get(i);
            switch (svgPath.charAt(index)) {
                case 'M': {
                    String ps[] = findPoints(i);
                    lastPoint.set(Float.parseFloat(ps[0]), Float.parseFloat(ps[1]));
                    lPath.moveTo(lastPoint.x, lastPoint.y);
                }
                break;
                case 'L': {
                    String ps[] = findPoints(i);
                    lastPoint.set(Float.parseFloat(ps[0]), Float.parseFloat(ps[1]));
                    lPath.lineTo(lastPoint.x, lastPoint.y);
                }
                break;
                case 'H': {//基于上个坐标在水平方向上划线，因此y轴不变
                    String ps[] = findPoints(i);
                    lastPoint.set(Float.parseFloat(ps[0]), lastPoint.y);
                    lPath.lineTo(lastPoint.x, lastPoint.y);
                }
                break;
                case 'V': {//基于上个坐标在水平方向上划线，因此x轴不变
                    String ps[] = findPoints(i);
                    lastPoint.set(lastPoint.x, Float.parseFloat(ps[0]));
                    lPath.lineTo(lastPoint.x, lastPoint.y);
                }
                break;
                case 'C': {//3次贝塞尔曲线
                    String ps[] = findPoints(i);
                    lastPoint.set(Float.parseFloat(ps[4]), Float.parseFloat(ps[5]));
                    lPath.cubicTo(Float.parseFloat(ps[0]), Float.parseFloat(ps[1]), Float.parseFloat(ps[2]), Float.parseFloat(ps[3]), Float.parseFloat(ps[4]), Float.parseFloat(ps[5]));
                }
                break;
                case 'S': {//一般S会跟在C或是S命令后面使用，用前一个点做起始控制点
                    String ps[] = findPoints(i);
                    lPath.cubicTo(lastPoint.x,lastPoint.y,Float.parseFloat(ps[0]), Float.parseFloat(ps[1]), Float.parseFloat(ps[2]), Float.parseFloat(ps[3]));
                    lastPoint.set(Float.parseFloat(ps[2]), Float.parseFloat(ps[3]));
                }
                break;
                case 'Q': {//二次贝塞尔曲线
                    String ps[] = findPoints(i);
                    lastPoint.set(Float.parseFloat(ps[2]), Float.parseFloat(ps[3]));
                    lPath.quadTo(Float.parseFloat(ps[0]), Float.parseFloat(ps[1]), Float.parseFloat(ps[2]), Float.parseFloat(ps[3]));
                }
                break;
                case 'T': {//T命令会跟在Q后面使用，用Q的结束点做起始点
                    String ps[] = findPoints(i);
                    lPath.quadTo(lastPoint.x,lastPoint.y,Float.parseFloat(ps[0]), Float.parseFloat(ps[1]));
                    lastPoint.set(Float.parseFloat(ps[0]), Float.parseFloat(ps[1]));
                }
                break;
                break;
                case 'Z': {//结束
                    lPath.close();
                }
                break;
            }
        }
        return lPath;
    }

    private String[] findPoints(int cmdIndexInPosition) {
        int cmdIndex = cmdPositions.get(cmdIndexInPosition);
        String pointString = svgPath.substring(cmdIndex + 1, cmdPositions.get(cmdIndexInPosition + 1));
        return pointString.split(",");
    }

    private void findCommand() {
        cmdPositions.clear();
        while (mIndex < svgPathLenght) {
            char c = svgPath.charAt(mIndex);
            if ('A' <= c && c <= 'Z') {
                cmdPositions.add(mIndex);
            }else if ('a' <= c && c <= 'z') {
                cmdPositions.add(mIndex);
            }
            ++mIndex;
        }
    }
}
```
### 实现
1. 利用工具类获取每个省区的 Android Path，全部绘制一遍，即可绘制出全国地图（优化：高亮的省区这一步不绘制，避免绘制两次）。
2. 针对高亮省区，调整画笔颜色再绘制一遍即可。
3. 显示数量：这个目前没想到什么好方法，只能让**设计师参照地图宽高比**标出每个中心点的位置，就像这样：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/TIM%E5%9B%BE%E7%89%8720190125155849.png)
然后手动算出每个点的横纵坐标占比，再进行绘制。绘制数量计算坐标时仍要考虑 scale 属性。

## 参考
1. [Android 上绘制中国省份地图](https://www.jianshu.com/p/69d76d02a872)
2. [SVG <path> 转 Android Canvas Path](https://www.jianshu.com/p/c9b283adf550)