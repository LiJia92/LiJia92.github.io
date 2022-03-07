---
title: 科二考试系统-续
date: 2021-07-09 09:46:31
tags:
 - 技术思路
---

[上篇文章](http://lastwarmth.win/2021/07/08/gps/)已经基本把「科二考试系统」的核心思路描述清楚了，接下来记录一下稍微具体的知识点。

## 建立世界坐标系
真实的经纬度点，通过高斯投影转化成平面坐标，需要经过一系列运算。
```
public class ProjectConverter {

    public static final String TAG = "ProjectConverter";

    /**
     * 设置经度中央经线，只能在这个经度附近使用，否则会有非常大的误差<br/>
     * 经过测试，10公里内的误差是1毫米左右，5公里内的误差是0.5毫米，3公里内的误差是0.1毫米，1公里以内误差是0.01毫米。
     * 所以科目二的误差是0.001毫米左右，科目三的误差是0.1毫米左右，不会放大Gps本身的厘米级的误差，完全满足要求.
     */
    public static ProjectConverter createWgs84(double longitude) {
        return new ProjectConverter(2, longitude, 0, 0, 0);
    }

    private double a;//'椭球体长半轴
    private double b;// '椭球体短半轴
    private double f; //'扁率
    private double e;// '第一偏心率
    private double e1; //'第二偏心率
    private double FE;//'东偏移
    private double FN;//'北偏移
    private double L0;//'中央经度
    private double W0;//'原点纬线

    private double k0;//'比例因子
    //一些计算常数
    private double e12;
    private double e14;
    private double e16;

    private double e18;
    private double e2;
    private double e4;
    private double e6;

    private double e8;

    /**
     * 说明: 用于初始化转换参数
     *
     * @param tuoqiuCanshu    枚举类型，提供北京54、西安80和WGS84三个椭球参数
     * @param centralMeridian 中央经线
     * @param OriginLatitude  原点纬度，如果是标准的分幅，则该参数是0
     * @param EastOffset      东偏移
     * @param NorthOffset     北偏移
     */
    public ProjectConverter(int tuoqiuCanshu, double centralMeridian, double OriginLatitude, double EastOffset,
                            double NorthOffset) {
        /**
         * 'Krassovsky （北京54采用） 6378245 6356863.0188
         * 'IAG 75（西安80采用） 6378140 6356755.2882
         * 'WGS 84 6378137 6356752.3142
         * 'CGC 2000 6378137 6356752.31414
         */
        if (tuoqiuCanshu == 0)//北京五四
        {
            a = 6378245;
            b = 6356863.0188;
        } else if (tuoqiuCanshu == 1)// '西安八零
        {
            a = 6378140;
            b = 6356755.2882;
        }
        if (tuoqiuCanshu == 2)//'WGS84
        {
            a = 6378137;
            b = 6356752.3142;
        }
        if (tuoqiuCanshu == 3)//'CGC2000坐标
        {
            a = 6378137;
            b = 6356752.31414;
        }
        f = (a - b) / a;//扁率
        //e = Math.sqrt(1 - MZ((b / a) ,2));//'第一偏心率
        e = Math.sqrt(2 * f - f * f);//'第一偏心率
        //eq = Math.sqrt(MZ((a / b) , 2) - 1);//'第二偏心率
        e1 = e / Math.sqrt(1 - e * e);//'第二偏心率
        L0 = centralMeridian;//中央经
        W0 = OriginLatitude;//原点纬线
        k0 = 1;//'比例因子
        FE = EastOffset;//东偏移
        FN = NorthOffset;//北偏移

        e12 = e1 * e1;
        e14 = e12 * e12;
        e16 = e14 * e12;
        e18 = e16 * e12;

        e2 = e * e;
        e4 = e2 * e2;
        e6 = e4 * e2;
        e8 = e6 * e2;
    }

    /**
     * 左手坐标系<br/>
     * 左手坐标系<br/>
     * 左手坐标系<br/>
     * 经纬度坐标转高斯投影坐标, 输出单位是厘米
     */
    public Pos gpsToGauss(Gps gps) {
        double[] xy = gpsToGauss(gps.longitude, gps.latitude);
        return new Pos(xy[1] * 100, xy[0] * 100, gps.altitude * 100);
    }

    /**
     * 左手坐标系<br/>
     * 左手坐标系<br/>
     * 左手坐标系<br/>
     * 高斯投影坐标 转为 经纬度坐标, pos的单位是厘米
     */
    public Gps gaussToGps(Pos pos) {
        double[] gps = gaussToGps(pos.y * 0.01, pos.x * 0.01);
        return new Gps(gps[1], gps[0], pos.z * 0.01);
    }

    /**
     * 经纬度坐标转高斯投影坐标,单位是米
     *
     * @param longitude 经度
     * @param latitude  纬度
     *                  把x的方向设置成和经度一致
     */
    public double[] gpsToGauss(double longitude, double latitude) {
        //'给出经纬度坐标，转换为高克投影坐标
        double[] resultP = new double[2];
        final double BR = (latitude - W0) * Math.PI / 180;//纬度弧长
        final double lo = (longitude - L0) * Math.PI / 180; //经差弧度
        double sinBR = Math.sin(BR);
        double cosBR = Math.cos(BR);
        double eSinBr = e * sinBR;
        double N = a / Math.sqrt(1 - eSinBr * eSinBr); //卯酉圈曲率半径
        //求解参数s
        double B0;
        double B2;
        double B4;
        double B6;
        double B8;
        double C = a * a / b;

        B0 = 1 - 3 * e12 / 4 + 45 * e14 / 64 - 175 * e16 / 256 + 11025 * e18 / 16384;
        B2 = B0 - 1;
        B4 = 15. / 32 * e14 - 175. / 384 * e16 + 3675. / 8192 * e18;
        B6 = 0 - 35. / 96 * e16 + 735. / 2048 * e18;
        B8 = 315. / 1024 * e18;

        double cos2 = cosBR * cosBR;
        double cos3 = cos2 * cosBR;
        double cos5 = cos2 * cos3;
        double cos7 = cos2 * cos5;
        double s = C * (B0 * BR + sinBR * (B2 * cosBR + B4 * cos3 + B6 * cos5 + B8 * cos7));
        double t = Math.tan(BR);
        double g = e1 * cosBR;

        double lo2 = lo * lo;
        double lo3 = lo2 * lo;
        double lo4 = lo2 * lo2;
        double lo5 = lo4 * lo;
        double lo6 = lo2 * lo4;

        double t2 = t * t;
        double t4 = t2 * t2;

        double g2 = g * g;
        double g4 = g2 * g2;

        final double x = s + lo2 / 2 * N * sinBR * cosBR
                + lo4 * N * sinBR * cos3 / 24 * (5 - t2 + 9 * g2
                + 4 * g4) + lo6 * N * sinBR * cos5 * (61 - 58 * t2 + t4) / 720;
        final double y = lo * N * cosBR + lo3 * N / 6 * cos3 * (1 - t2 + g2)
                + lo5 * N / 120 * cos5 * (5 - 18 * t2 + t4 + 14 * g2
                - 58 * g2 * t2);
        resultP[0] = y + FE;
        resultP[1] = x + FN;
        return resultP;
    }

    /**
     * 高斯投影坐标 转为 经纬度坐标，单位是度
     *
     * @param X 高斯投影坐标X，单位是米
     * @param Y 高斯投影坐标Y，单位是米
     * @return 第一个是经度，第二个是纬度
     */
    public double[] gaussToGps(double X, double Y) {
        //'给出高克投影坐标，转换为经纬度坐标
        double[] resultP = new double[2];

        double e_1_2 = Math.sqrt(1 - e2);
        double El1 = (1 - e_1_2) / (1 + e_1_2);
        double Mf = (Y - FN) / k0;//真实坐标值
        double Q = Mf / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));//角度

        double el2 = El1 * El1;
        double el3 = el2 * El1;
        double el4 = el3 * El1;

        double Bf = Q + (3 * El1 / 2 - 27 * el3 / 32) * Math.sin(2 * Q)
                + (21 * el2 / 16 - 55 * el4 / 32) * Math.sin(4 * Q) + (151 * el3 / 96) * Math
                .sin(6 * Q) + 1097. / 512 * el4 * Math.sin(8 * Q);
        double sinBf = Math.sin(Bf);
        double cosBf = Math.cos(Bf);

        double eSinBf = e * sinBf;
        double eSinBf2 = eSinBf * eSinBf;
        double _eSinBf2 = 1 - eSinBf2;
        double _eSinBf2_3 = _eSinBf2 * _eSinBf2 * _eSinBf2;
        double Rf = a * (1 - e2) / Math.sqrt(_eSinBf2_3);
        double Nf = a / Math.sqrt(1 - eSinBf2);//卯酉圈曲率半径
        double tanBf = Math.tan(Bf);
        double Tf = tanBf * tanBf;
        double D = (X - FE) / (k0 * Nf);
        double Cf = e12 * cosBf * cosBf;

        double D2 = D * D;
        double D3 = D2 * D;
        double D4 = D2 * D2;
        double D5 = D4 * D;
        double D6 = D4 * D2;

        double Tf2 = Tf * Tf;
        double Cf2 = Cf * Cf;

        double B = Bf - Nf * tanBf / Rf * (
                D2 / 2 - (5 + 3 * Tf + 10 * Cf - 9 * Tf * Cf - 4 * Cf2 - 9 * e12) * D4 / 24
                        + (61 + 90 * Tf + 45 * Tf2 - 256 * e12 - 3 * Cf2) * D6 / 720);
        double L = L0 * Math.PI / 180 + 1 / cosBf * (D - (1 + 2 * Tf + Cf) * D3 / 6
                + (5 - 2 * Cf + 28 * Tf - 3 * Cf2 + 8 * e12 + 24 * Tf2) * D5 / 120);
        double Bangle = B * 180 / Math.PI;
        double Langle = L * 180 / Math.PI;
        resultP[0] = Langle;//RW * 180 / Math.PI;
        resultP[1] = Bangle + W0;//RJ * 180 / Math.PI;
        return resultP;
    }
}
```
需要一个测试方法，验证数据转换的准确性：
```
/**
 * 标准测试<br/>
 * 测试方式：先定义一系列随机gps点，然后将gps点转到xy点，然后在xy平面绕中心点旋转给定角度
 * 然后再把旋转后的xy平面点转换到gps点，遍历每，计算所有点相关之间的距离关系
 */
public static void standardTest() {

    //首先给一个中心点
    Gps center = new Gps(36, 111);

    List<Gps> srcGpsList = new ArrayList<>();
    for (int i = 0; i < 10; i++) {
        srcGpsList.add(
                new Gps(center.latitude + 0.03 * (Math.random() * 0.7 + 0.3) * (Math.random() > 0.5 ? 1 : -1),
                        center.longitude + 0.03 * (Math.random() * 0.7 + 0.3) * (Math.random() > 0.5 ? 1
                                : -1)));
    }

    double longitude = 0;
    for (Gps g : srcGpsList) {
        longitude += g.longitude;
    }
    longitude /= srcGpsList.size();

    ProjectConverter converter = createWgs84(longitude);

    List<Pos> srcPosList = new ArrayList<>();
    for (int i = 0; i < srcGpsList.size(); i++) {
        srcPosList.add(converter.gpsToGauss(srcGpsList.get(i)));
    }

    double x = 0;
    double y = 0;

    for (Pos p : srcPosList) {
        x += p.x;
        y += p.y;
    }

    Pos c = new Pos(x / srcPosList.size(), y / srcPosList.size());

    List<Pos> rotatePosList = new ArrayList<>();
    final double angle = 37;
    double sinA = Math.sin(Math.toRadians(angle));
    double cosA = Math.cos(Math.toRadians(angle));
    for (Pos p : srcPosList) {
        Pos pos = new Pos(p.x, p.y);
        pos.rotate(c, cosA, sinA);
        rotatePosList.add(pos);
    }

    List<Gps> rotateGpsList = new ArrayList<>();
    for (Pos p : rotatePosList) {
        rotateGpsList.add(converter.gaussToGps(p));
    }

    for (int i = 0; i < srcGpsList.size(); i++) {
        for (int j = 0; j < srcGpsList.size(); j++) {
            if (i == j) {
                continue;
            }

            Log.e(TAG, "-----------");

            double disijGps = srcGpsList.get(i).distanceTo(srcGpsList.get(j));
            double disijGauss = srcPosList.get(i).distanceTo(srcPosList.get(j)) * 0.01;//厘米转为米
            double disijGaussR = rotatePosList.get(i).distanceTo(rotatePosList.get(j)) * 0.01;//厘米转为米
            double disijGpsR = rotateGpsList.get(i).distanceTo(rotateGpsList.get(j));

            Log.e(TAG,
                    "差值(毫米) : " + ((int) ((disijGps - disijGauss) * 100000)) / 100f + " : " +
                            ((int) ((disijGps - disijGaussR) * 100000)) / 100.f + " , " +
                            ((int) ((disijGps - disijGpsR) * 100000)) / 100.f + " , " +
                            ((int) ((disijGauss - disijGaussR) * 100000)) / 100.f + " , " +
                            ((int) ((disijGauss - disijGpsR) * 100000)) / 100.f + " , " +
                            ((int) ((disijGaussR - disijGpsR) * 100000)) / 100.f);
            Log.e(TAG, "原GPS距离 = " + disijGps +
                    " , 原高斯距离 = " + disijGauss +
                    " , 旋转后GPS距离 = " + disijGpsR +
                    " , 旋转后高斯距离 = " + disijGaussR);
        }
    }
}
```
设置一个经度子午线，后面计算出来的平面坐标误差会非常低，完全可以接受。结果乘以 100，将米转成厘米，同时转到左手坐标系。得到坐标之后，相对原点做一个偏移，就能得到这个「世界坐标系」中每个点的坐标了。
```
public class DefaultConverter implements Converter {

    /**
     * 投影
     */
    private final ProjectConverter converter;
    /**
     * 原点
     */
    private final Pos zero;
    private final Gps zeroGps;

    public Gps getZeroGps() {
        return zeroGps;
    }

    public DefaultConverter(Gps gps) {
        zeroGps = new Gps(gps);
        converter = ProjectConverter.createWgs84(gps.longitude);
        zero = converter.gpsToGauss(gps);
    }

    /**
     * 经过原点的平移
     *
     * @param gps gps坐标
     * @return
     */
    @Override
    public Pos gpsToGauss(Gps gps) {
        return converter.gpsToGauss(gps).translate(-zero.x, -zero.y);
    }

    /**
     * 经过原点平移回去
     *
     * @param pos 平面坐标
     * @return
     */
    @Override
    public Gps gaussToGps(Pos pos) {
        return converter.gaussToGps(new Pos(pos).translate(zero));
    }
}
```

## 左右手坐标系
这个概念我琢磨了好久，到现在也还没有彻底搞清楚。参考[左手坐标系 vs 右手坐标系](https://zhuanlan.zhihu.com/p/64707259)，假设 Z 轴是屏幕往内，X 轴方向保持一致时，可以看到 Y 轴是相反的。所以左右手坐标系，在相对 2D 的 场景里，会影响 Y 轴的值，右手坐标系需要取反。在科二里，某些评判是需要方向的，比如直角转弯分左直角和右直角，我们通过「世界坐标系」中直角项目的的 3 个点（3 个点，指定一个原点，剩下 2 个点分别代表 X、Y 轴的方向）建立「我的坐标系」，就有可能是左手，也有可能是右手。所以在整个场景中，尽量以左手坐标系为默认坐标系，某些特殊情况需要右手坐标系时，需要将 y 值取反。「我的坐标系」建立之后，需要将「世界坐标系」中其他的点通过矩阵变换，也转换到这个坐标系内。
```
/**
 * 左手坐标系
 */
public class Coordinate {
    /**
     * 原点
     */
    private final Pos zero;

    private final double sin;
    private final double cos;
    /**
     * 缩放系数。默认会进行归一化处理，然后调整到0-1000的范围
     */
    private final double scale;
    /**
     * 是不是左手坐标系，如果是左手坐标系，转成世界坐标系的坐标，y要取反
     */
    private final boolean isLeftHand;

    /**
     * 由起点到终点决定了x轴方向，zero是坐标原点
     *
     * @param start
     * @param end
     * @param zero
     */
    public Coordinate(Pos start, Pos end, Pos zero) {
        this(start, end, zero, 1000 / start.distanceTo(end), true);
    }

    public Coordinate(Pos start, Pos end, Pos zero, double scale, boolean isLeftHand) {
        this.zero = zero;
        this.scale = scale;
        this.isLeftHand = isLeftHand;
        double theta = start.angleTo(end);
        sin = Math.sin(theta);
        cos = Math.cos(theta);
    }

    /**
     * 世界坐标系中的点在我的坐标系中的位置。
     * <p>
     * 变换矩阵是 :
     * <p>
     * cos  sin
     * -sin cos
     *
     * @param pos
     * @return
     */
    public Pos toLocal(Pos pos) {
        double x = (pos.x - zero.x) * scale;
        double y = (pos.y - zero.y) * scale;
        Pos p = new Pos(x * cos + y * sin, -x * sin + y * cos, pos.z);
        //如果我是右手坐标系，则把y值取反，最后统一输出左手坐标系的值
        if (!isLeftHand) {
            p.y = -p.y;
        }
        return p;
    }

    /**
     * 我的坐标系中的点，转化为世界坐标系中的点
     *
     * @param pos
     * @return
     */
    public Pos toWorld(Pos pos) {
        //如果当前坐标系是右手坐标系，由于输入都是左手坐标系的，所以要取反
        double y = isLeftHand ? pos.y : -pos.y;
        return new Pos(pos.x * cos - y * sin, pos.x * sin + y * cos, pos.z).scale(1 / scale).translate(zero);
    }
}
```

## 渲染
「世界坐标系」的点要渲染到界面上，需要映射成屏幕坐标。以直角转弯为例：
```
public class ZhiJiaoSrcData implements Serializable {
    public Gps gps1;
    public Gps gps2;
    public Gps gps3;
    public Gps gps4;
    public Gps gps5;
    public Gps gps6;

    /**
     * 创建碰撞数据. 这个时候数据都是完备的，不缺失的
     */
    public ZhiJiaoCollision createCollision(Converter converter, String mapName) {

        Pos p1 = converter.gpsToGauss(gps1);
        Pos p2 = converter.gpsToGauss(gps2);
        Pos p3 = converter.gpsToGauss(gps3);
        Pos p4 = converter.gpsToGauss(gps4);
        Pos p5 = converter.gpsToGauss(gps5);
        Pos p6 = converter.gpsToGauss(gps6);

        ZhiJiaoCollision collision = new ZhiJiaoCollision();
        collision.startLine = new Line(p1, p2);
        collision.line23 = new Line(p2, p3);
        collision.line34 = new Line(p3, p4);
        collision.endLine = new Line(p4, p5);
        collision.line56 = new Line(p5, p6);
        collision.line61 = new Line(p6, p1);

        //左手坐标系
        collision.turnLeft = p2.vectorTo(p3).cross(p3.vectorTo(p4)) < 0;
        return collision;
    }
}
```
这是直角转弯的 6 个点，必须严格按照示意图进行采集。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2021/k2_caiji_zhuanwan.png)
转成世界坐标系中的模型主要以线为单位：
```
public class ZhiJiaoCollision {
    /**
     * 开始控制线
     */
    public Line startLine;
    /**
     * 结束控制线
     */
    public Line endLine;

    /************ 控制线 *************/
    public Line line23;
    public Line line34;
    public Line line56;
    public Line line61;

    /**
     * 默认左转弯
     */
    public boolean turnLeft;
}
```
然后再将 Collision 转换成渲染到界面的 Model：
```
public class ZhiJiaoRenderModel implements Serializable {
    public Line line12;
    public Line line23;
    public Line line34;
    public Line line45;
    public Line line56;
    public Line line61;
    public boolean turnLeft;

    /**
     * 从解析好的碰撞数据中得到渲染数据
     */
    public static ZhiJiaoRenderModel from(ZhiJiaoCollision collision) {
        ZhiJiaoRenderModel model = new ZhiJiaoRenderModel();
        double lineWidth = 15;
        model.turnLeft = collision.turnLeft;

        Pos s1 = collision.line61.end;
        Pos s2 = collision.line23.start;
        Pos s3 = collision.line23.end;
        Pos s4 = collision.line34.end;
        Pos s5 = collision.line56.start;
        Pos s6 = collision.line56.end;

        double distance = lineWidth * 0.5;
        Pos p1 = LineUtils.getTrimPos(s6, s2, s1, distance);
        Pos p2 = LineUtils.getTrimPos(s3, s1, s2, distance);
        Pos p3 = LineUtils.getTrimPos(s2, s4, s3, -distance);
        Pos p4 = LineUtils.getTrimPos(s5, s3, s4, distance);
        Pos p5 = LineUtils.getTrimPos(s4, s6, s5, distance);
        Pos p6 = LineUtils.getTrimPos(s1, s5, s6, distance);

        model.line12 = new Line(p1, p2, lineWidth);
        model.line23 = new Line(p2, p3, lineWidth);
        model.line34 = new Line(p3, p4, lineWidth);
        model.line45 = new Line(p4, p5, lineWidth);
        model.line56 = new Line(p5, p6, lineWidth);
        model.line61 = new Line(p6, p1, lineWidth);
        return model;
    }
}
```
因为绘制线是有宽度的，限定线宽为 15cm，采点全部采集的是内点，安卓绘制一条带宽度的线，大多都是使用 Paint 的 strokeWidth，而这个宽度，是向内外各辐射一半：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2021/20160106191715540.png)
所以我们需要根据采的内点，计算我们真实划线的点。
```
/**
 * 根据两条直线，获取调整的点
 */
public static Pos getTrimPos(Pos p1, Pos p2, Pos target, double dis) {
    return getPosFromThreePos(getPointOnExtend(p1, target, dis), target, getPointOnExtend(p2, target, dis));
}

/**
 * 在线段的延长线上根据给定距离取一个点。这个距离可以是负值，这样就是在线段内部取一点了
 */
public static Pos getPointOnExtend(Pos start, Pos end, double dis) {
    double dx = end.x - start.x;
    double dy = end.y - start.y;
    double dz = end.z - start.z;
    double a = Math.sqrt(dx * dx + dy * dy + dz * dz + 1e-100);
    double x = dis * dx / a + end.x;
    double y = dis * dy / a + end.y;
    double z = dis * dz / a + end.z;
    return new Pos(x, y, z);
}

/**
 * 根据矩形的3个点，求第四个点.这三个点是顺序的,p2是中间点
 */
public static Pos getPosFromThreePos(Pos p1, Pos p2, Pos p3) {
    double angle = p2.angleTo(p1);
    double cos = Math.cos(-angle);
    double sin = Math.sin(-angle);
    Pos p11 = new Pos(p1).rotate(p2, cos, sin);
    Pos p31 = new Pos(p3).rotate(p2, cos, sin);
    Pos pos = new Pos(p11.x, p31.y, (p11.z + p3.z) * 0.5);
    return pos.rotate(p2, cos, -sin);
}
```
这样计算后，我们得到的 6 个点如图标记所示：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2021/WechatIMG109.jpeg)
然后进行绘制：
```
/**
 * 绘制直角项目，6条线
 */
public List<MapBaseLayer> createMapLayers(MapView mapView, boolean isSelect) {
    List<MapBaseLayer> layers = new ArrayList<>();

    addLine(line12, layers, mapView, Consts.Start_Color, null, true);
    addLine(line45, layers, mapView, Consts.End_Color, null, true);

    int sideColor = isSelect ? Color.GREEN : Consts.Side_Color;
    addLine(line23, layers, mapView, sideColor, null, false);
    addLine(line34, layers, mapView, sideColor, null, false);
    addLine(line56, layers, mapView, sideColor, null, false);
    addLine(line61, layers, mapView, sideColor, null, false);

    return layers;
}

private void addLine(Line line, List<MapBaseLayer> lines, MapView mapView, int lineColor, String desc, boolean isDot) {
    Line l;
    if (turnLeft) {
        l = LineUtils.getLineAtLeft(line.start, line.end, Consts.Distance * 1.2f);
    } else {
        l = LineUtils.getLineAtRight(line.start, line.end, Consts.Distance * 1.2f);
    }
    if (isDot) {
        lines.add(new DotLineLayer(mapView, line.start, line.end,
                new DotLineLayer.Config((float) line.lineWidth, lineColor)
                        .desc(desc)
                        .dashGap(30)
                        .dashWidth(30)
                        .descPos(l.start.meanWith(l.end))));
    } else {
        lines.add(new LineLayer(mapView, line.start, line.end,
                new BaseLineLayer.Config((float) line.lineWidth, lineColor)
                        .desc(desc)
                        .descPos(l.start.meanWith(l.end))));
    }
}
```
getLineAtRight 如下：
```
/**
 * 在两点的右边构建一条平行线，给定距离
 */
public static Line getLineAtRight(Pos start, Pos end, double distance) {
    if (HardCode) {
        return getLine(start, end, distance, false);
    }
    double dx = end.x - start.x;
    double dy = end.y - start.y;

    double angle = Math.atan2(dy, dx) + Math.PI * 0.5;
    double x2 = start.x + distance * Math.cos(angle);
    double y2 = start.y + distance * Math.sin(angle);

    double x3 = x2 + dx;
    double y3 = y2 + dy;

    return new Line(new Pos(x2, y2), new Pos(x3, y3));
}

/**
 * 采用解方程的方式求平行线，时间比夹角的方式快一倍
 */
public static Line getLine(Pos start, Pos end, double distance, boolean atLeft) {
    double a = end.x - start.x;
    double b = end.y - start.y;
    double ab = Math.sqrt(a * a + b * b + 1e-100);

    double distanceAB = distance / ab;

    double y1 = start.y + a * distanceAB;
    double x1 = start.x - b * distanceAB;

    double y4 = start.y - a * distanceAB;
    double x4 = start.x + b * distanceAB;

    double x, y;
    // 根据向量叉乘检测哪一个在左边
    double cross = (end.x - start.x) * (y1 - start.y) - (end.y - start.y) * (x1 - start.x);
    if (atLeft) {
        if (cross < 0) {
            x = x1;
            y = y1;
        } else {
            x = x4;
            y = y4;
        }
    } else {
        if (cross > 0) {
            x = x1;
            y = y1;
        } else {
            x = x4;
            y = y4;
        }
    }

    return new Line(
            new Pos(x, y, start.z),
            new Pos(x + a, y + b, end.z));
}
```
直角转弯就是要画 2 条虚线，4 条实线，直接看看实线的绘制：
```
public void draw(Canvas canvas, Matrix currentMatrix) {
    canvas.save();
    float[] start = new float[]{Scale.t(pos1.x), Scale.t(pos1.y)};
    float[] end = new float[]{Scale.t(pos2.x), Scale.t(pos2.y)};
    currentMatrix.mapPoints(start);
    currentMatrix.mapPoints(end);
    paint.setColor(config.color);
    float strokeWidth = calculateValue(config.width, currentMatrix);
    paint.setStrokeWidth(strokeWidth);
    paint.setStyle(Paint.Style.STROKE);
    //给一个机会自己设置画笔
    setPaint(paint, currentMatrix);
    //画直线
    canvas.drawLine(start[0], start[1], end[0], end[1], paint);

    //画描述
    if (config.desc != null) {
        Pos descPos = config.descPos;
        if (descPos == null) {
            descPos = new Pos((start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5);
        } else {
            descPos = transform(descPos, currentMatrix);
        }
        paint.setPathEffect(null);
        paint.setStyle(Paint.Style.FILL_AND_STROKE);
        paint.setTextSize(config.textSize);
        paint.setStrokeWidth(1);
        Rect rect = new Rect();
        paint.getTextBounds(config.desc, 0, config.desc.length(), rect);
        canvas.drawText(config.desc, (float) descPos.x - rect.width() * 0.5f, (float) descPos.y + rect.height() * 0.5f, paint);
    }

    //画选中
    if (isSelect) {
        paint.setPathEffect(null);
        paint.setStrokeWidth(2);
        paint.setStyle(Paint.Style.STROKE);
        canvas.drawCircle(start[0], start[1], config.width * 2, paint);
        canvas.drawCircle(end[0], end[1], config.width * 2, paint);
        if (isValid(target)) {
            paint.setColor(COLOR_POS);
            Pos pt = transform(new Pos(target).scale(1 / Scale.SCALE), currentMatrix);
            canvas.drawCircle((float) pt.x, (float) pt.y, config.width * 2f, paint);
        }
    }

    canvas.restore();
}
```
通过 canvas、paint 进行绘制，就是普通的安卓知识了。但是还剩下一个疑问：**这个时候的线，传入的坐标都是世界坐标系里的坐标，假设 Pos(1000,1000) 这个点即是相对原点往北 10 米，往东 10 米的一个点，而安卓原点在左上角，如何映射的呢？**
再听下回分解吧~
