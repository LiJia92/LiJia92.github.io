---
title: 科二考试系统-评判
date: 2021-07-14 16:10:06
tags:
 - 技术思路
---
继[上篇文章](http://lastwarmth.win/2021/07/09/gps-3/#more)，通过高精度数据可以知道当前车辆的位置，结合考试地图建立好坐标系。那么车辆在这个地图中的一切行为轨迹都将是可以计算的，可以想象成一张蜘蛛网中蜘蛛的移动。那么接下来就是要利用这些数据来做评判了：判断当前车辆是否压线，以及打灯的时长是否足够等等。

<!-- more -->

## 信号评判
信号评判是通过车辆信号来做条件评判，看是否需要扣分。举个栗子：
```
/**
 * 进入直角转弯项目后，未关闭转向灯
 */
public class K2_ZhiJiaoZhuanWan_305100_Event extends OneDeductEvent<K2ZhiJiaoZhuanWanConfig> {

    @Override
    protected boolean handleSuccess(SignalGetter signal, ExamProcessor processor, StepHandler stepEvent) {
        ZhiJiaoStateData data = stepEvent.getStepData();
        setDoNotExecute(true);
        if (data.checker.isTurnLeft && signal.getCar().isLightOn(Light.TurnLeftLight)) {
            return false;
        }
        if (!data.checker.isTurnLeft && signal.getCar().isLightOn(Light.TurnRightLight)) {
            return false;
        }
        return true;
    }
}
```
当项目开始后，检测项开始检测是否需要扣分。如果是左转弯，进项目时不能打右转灯；如果是右转弯，进项目是时不能打左转灯。根据产品需求，需要写很多这样类似的评判，覆盖到方方面面。

## 碰撞评判
信号只是最基础的一类评判，在科二考试系统中还有个最重要的一种评判就是「碰撞评判」，通俗解释就是车子是否压线，这个线可以是实际考场中的一条线，也可以是产品需求定义的一条虚拟的线。前面的多篇文章，获取高精度数据就是为了实现「碰撞评判」。
通过建立坐标系，将整个地图绘制成各种类型的线（包括曲线），同时将车子建模，可以近似当成一个矩形。那么压线就可以抽象成一个数学题了：矩形是否与线段（或直线）相交。
于是便有了很多的数学模型及工具类方法：
```
/**
 * 坐标系中的点，基本对象
 */
public class Pos implements Serializable {
    public double x;
    public double y;
    /**
     * z坐标表示高度，只是用来暂存高度，不会做处理
     */
    public double z;

    public Pos() {
    }

    public Pos(double x, double y) {
        this(x, y, 0);
    }

    public Pos(double x, double y, double z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public Pos(Pos pos) {
        this(pos.x, pos.y, pos.z);
    }

    /**
     * 平移
     */
    public Pos translate(double dx, double dy) {
        x += dx;
        y += dy;
        return this;
    }

    /**
     * 从这个点指向pos的向量，返回一个新的Pos
     */
    public Pos vectorTo(Pos pos) {
        Pos vec = new Pos(pos);
        vec.translate(-x, -y);
        return vec;
    }

    /**
     * 缩放
     */
    public Pos scale(double scale) {
        x *= scale;
        y *= scale;
        return this;
    }

    /**
     * 点乘另一个向量，都表示以原点为起点的向量。
     * 点乘的数学意义是，对于向量a、b:
     * a.dot(b) = distance(a,0)*distance(b,0)*cos(ab)
     * 即点乘等于a的模乘以b的模乘以a和b的夹角的cos
     * 进一步的：dot = a.dot(b),
     * 1、当dot>0，说明a和b的夹角绝对值小于90度
     * 2、当dot=0，说明a和b垂直
     * 3、当dot<0，说明a和b的夹角的绝对值大于90度，小于180度
     *
     * @param b 另一个向量
     * @return 内积，点乘
     */
    public double dot(Pos b) {
        return x * b.x + y * b.y;
    }

    /**
     * 叉乘一个向量，都表示以原点为起点的向量。
     * 叉乘的数学意义是，axb : 根据右手螺旋法则从a向量转向b向量，形成的一个法向量，其模为：
     * |a×b|=|a||b|sin< a, b>
     * 进一步的，在右手坐标系中， c = a.cross(b)
     * 1.当c>0时，b在a的左边
     * 2.当c=0时，a和b共线
     * 3.当c<0时，b在a的右边
     *
     * @param b 向量b
     * @return 返回一个标量，这其实是一个z轴上的一个向量
     */
    public double cross(Pos b) {
        return x * b.y - y * b.x;
    }

    /**
     * 到另一个点的距离：二维欧式距离
     */
    public double distanceTo(Pos pos) {
        double dx = x - pos.x;
        double dy = y - pos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 到另一个点的角度, 返回弧度
     */
    public double angleTo(Pos pos) {
        return Math.atan2(pos.y - y, pos.x - x);
    }

    /**
     * 和新的点求平均值
     */
    public Pos meanWith(Pos pos) {
        x = (x + pos.x) * 0.5;
        y = (y + pos.y) * 0.5;
        z = (z + pos.z) * 0.5;
        return this;
    }

    /**
     * 坐标旋转
     */
    public Pos rotate(double cosA, double sinA) {
        double sx = x;
        double sy = y;
        this.x = sx * cosA - sy * sinA;
        this.y = sx * sinA + sy * cosA;
        return this;
    }

    /**
     * 以 center 为中心旋转A度
     */
    public Pos rotate(Pos center, double cosA, double sinA) {
        // 先平移到0点
        double sx = x - center.x;
        double sy = y - center.y;
        // 然后旋转
        double nx = sx * cosA - sy * sinA;
        double ny = sx * sinA + sy * cosA;
        // 然后再平移回来
        this.x = nx + center.x;
        this.y = ny + center.y;
        return this;
    }

    /**
     * 二维的模
     */
    public double model() {
        return Math.sqrt(x * x + y * y);
    }

    /**
     * 两个向量的夹角，当前pos和vector都表示向量。返回弧度。可以减少一个sqrt运算
     */
    public double vectorAngle(Pos vector) {
        return Math.acos(dot(vector) / (Math.sqrt((x * x + y * y) * (vector.x * vector.x + vector.y * vector.y))));
    }
}
```
线：
```
/**
 * 直线
 */
public class Line implements Serializable {
    /**
     * 起点
     */
    public Pos start;
    /**
     * 结束点
     */
    public Pos end;
    /**
     * 线宽
     */
    public double lineWidth;
}

/**
 * 基于左手坐标系，线段的工具类
 */
public class LineUtils {

    /**
     * 硬编码，速度可以快一倍。明确坐标系
     */
    private static final boolean HardCode = true;

    public static final double THRESHOLD = 0.45 * 100;

    /**
     * 计算平均值
     */
    public static Pos calMiddle(List<Pos> posList) {
        Pos middle = new Pos();
        for (Pos p : posList) {
            middle.x += p.x;
            middle.y += p.y;
            middle.z += p.z;
        }
        middle.x /= posList.size();
        middle.y /= posList.size();
        middle.z /= posList.size();
        return middle;
    }

    /**
     * 求两条直线的交点.如果两直线共线，则返回null
     */
    public static Pos getCrossPoint(Pos p11, Pos p12, Pos p21, Pos p22) {
        // 直线方程是 A * x + B * y + C = 0;
        double A1 = p12.y - p11.y;
        double B1 = p11.x - p12.x;
        double C1 = (p12.x - p11.x) * p11.y - (p12.y - p11.y) * p11.x;

        double A2 = p22.y - p21.y;
        double B2 = p21.x - p22.x;
        double C2 = (p22.x - p21.x) * p21.y - (p22.y - p21.y) * p21.x;

        // 法向量的叉乘
        double D = A1 * B2 - A2 * B1;
        // 说明共线
        if (Math.abs(D) < 1e-20) {
            return null;
        }
        double x = (B1 * C2 - B2 * C1) / D;
        double y = (C1 * A2 - C2 * A1) / D;
        double z;

        double dx = p12.x - p11.x;
        double dy = p12.y - p11.y;
        if (Math.abs(dx) > 1e-8) {
            z = (x - p11.x) / dx * (p12.z - p11.z) + p11.z;
        } else {
            z = (y - p11.y) / dy * (p12.z - p11.z) + p11.z;
        }
        return new Pos(x, y, z);
    }

    public static Pos getCrossPoint(Line line1, Line line2) {
        return getCrossPoint(line1.start, line1.end, line2.start, line2.end);
    }

    /**
     * 根据两条直线，获取调整的点
     */
    public static Pos getTrimPos(Pos p1, Pos p2, Pos target, double distance) {
        return getPosFromThreePos(getPointOnExtend(p1, target, distance), target, getPointOnExtend(p2, target, distance));
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

    /**
     * 点在两点所在直线之间
     */
    public static boolean isBetweenTwoPoint(Pos pos, Pos start, Pos end) {
        return (start.x - pos.x) * (pos.x - end.x) >= 0 && (start.y - pos.y) * (pos.y - end.y) >= 0;
    }

    public static boolean isBetweenTwoPoint(double x, double y, Pos start, Pos end) {
        return (start.x - x) * (x - end.x) >= 0 && (start.y - y) * (y - end.y) >= 0;
    }

    /**
     * 点是否在直线上,单位都是厘米
     */
    public static boolean isOnLine(Pos point, Pos pos1, Pos pos2, Pos target, Matrix matrix) {

        double threshold = Scale.t(THRESHOLD);
        float[] values = new float[9];
        matrix.getValues(values);
        threshold *= 1 / Math.sqrt(values[0] * values[0] + values[1] * values[1]);

        // 如果离第1个点近
        if (point.distanceTo(pos1) < threshold * 1.5) {
            target.setPos(pos1);
            return true;
        }

        // 如果离第2个点近
        if (point.distanceTo(pos2) < threshold * 1.5) {
            target.setPos(pos2);
            return true;
        }
        // 如果垂足在两个点之间，并且离直线很近
        Pos footer = getFooter(point, pos1, pos2);
        if (footer.x <= pos2.x && footer.x >= pos1.x
                || footer.x <= pos1.x && footer.x >= pos2.x) {
            double distance = footer.distanceTo(point);
            Log.e("TAG", "distance is " + distance + " , threshold : " + threshold);
            return distance <= threshold;
        }

        return false;
    }

    /**
     * 点击点是距离线的距离,单位都是厘米
     *
     * @param target 点击位置，如果距离端点很近，默认为端点；如果很远，且在线段之间，默认为触摸点
     */
    public static double clickDistanceToLine(Pos point, Pos pos1, Pos pos2, Pos target, double threshold) {
        // 如果离第1个点近
        double distance = point.distanceTo(pos1);
        if (distance <= threshold) {
            target.setPos(pos1);
            return distance;
        }

        // 如果离第2个点近
        distance = point.distanceTo(pos2);
        if (distance <= threshold) {
            target.setPos(pos2);
            return distance;
        }
        // 如果垂足在两个点之间，并且离直线很近
        Pos footer = getFooter(point, pos1, pos2);
        if ((footer.x - pos1.x) * (pos2.x - footer.x) >= 0
                && (footer.y - pos1.y) * (pos2.y - footer.y) >= 0) {
            distance = footer.distanceTo(point);
            if (distance <= threshold) {
                target.setPos(point);
                return distance;
            }
        }

        return 100000000000.;
    }

    /**
     * 计算点到其他两点所在直线的垂足坐标
     *
     * @param pt      要计算的点
     * @param beginPt 直线点1
     * @param endPt   直线点2
     */
    public static Pos getFooter(Pos pt, Pos beginPt, Pos endPt) {
        double dx = beginPt.x - endPt.x;
        double dy = beginPt.y - endPt.y;

        // 如果两点离得非常近
        if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
            return new Pos(beginPt);
        }

        double u = (pt.x - beginPt.x) * (beginPt.x - endPt
                .x) + (pt.y - beginPt.y) * (beginPt.y - endPt.y);
        u = u / (dx * dx + dy * dy);
        double x = beginPt.x + u * dx;
        double y = beginPt.y + u * dy;
        double z;
        if (Math.abs(dx) > 1e-8) {
            z = (beginPt.x - x) / dx * (endPt.z - beginPt.z) + beginPt.z;
        } else {
            z = (beginPt.y - y) / dy * (endPt.z - beginPt.z) + beginPt.z;
        }
        return new Pos(x, y, z);
    }

    /**
     * 垂点在两点之间
     */
    public static boolean footerIsOnLine(Pos pt, Pos beginPt, Pos endPt, Pos footer) {
        double dx = beginPt.x - endPt.x;
        double dy = beginPt.y - endPt.y;

        // 如果两点离得非常近
        if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
            return false;
        }

        double u = (pt.x - beginPt.x) * (beginPt.x - endPt
                .x) + (pt.y - beginPt.y) * (beginPt.y - endPt.y);
        u = u / (dx * dx + dy * dy);
        double x = beginPt.x + u * dx;
        double y = beginPt.y + u * dy;
        // 如果要向外传垂足，则设置垂足位置
        if (footer != null) {
            footer.setPos(x, y);
        }
        return (beginPt.x - x) * (x - endPt.x) >= 0 && (beginPt.y - y) * (y - endPt.y) >= 0;
    }

    /**
     * 计算点到直线的距离
     */
    public static double getDistanceToLine(Pos pt, Pos beginPt, Pos endPt) {
        // 先求垂点坐标
        double dx = beginPt.x - endPt.x;
        double dy = beginPt.y - endPt.y;

        // 如果两点离得非常近
        if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
            return pt.distanceTo(beginPt);
        }

        double u = (pt.x - beginPt.x) * (beginPt.x - endPt
                .x) + (pt.y - beginPt.y) * (beginPt.y - endPt.y);
        u = u / (dx * dx + dy * dy);
        double x = beginPt.x + u * dx;
        double y = beginPt.y + u * dy;

        dx = x - pt.x;
        dy = y - pt.y;

        // 然后计算两个点的距离
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 计算点到直线的距离的平方，这样用来比较的时候不用开方，只需要外部被比较的做个平方就行，可以极大减小计算量
     */
    public static double getDistanceToLineSquare(Pos pt, Pos beginPt, Pos endPt, double[] xy) {
        // 先求垂点坐标
        double dx = beginPt.x - endPt.x;
        double dy = beginPt.y - endPt.y;

        // 如果两点离得非常近
        if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
            dx = pt.x - beginPt.x;
            dy = pt.y - beginPt.y;
            xy[0] = beginPt.x + dx * 0.5;
            xy[1] = beginPt.y + dy * 0.5;
            return dx * dx + dy * dy;
        }

        double u = (pt.x - beginPt.x) * (beginPt.x - endPt
                .x) + (pt.y - beginPt.y) * (beginPt.y - endPt.y);
        u = u / (dx * dx + dy * dy);
        double x = beginPt.x + u * dx;
        double y = beginPt.y + u * dy;

        dx = x - pt.x;
        dy = y - pt.y;

        xy[0] = x;
        xy[1] = y;

        // 然后计算两个点的距离
        return dx * dx + dy * dy;
    }

    /**
     * 点到线的距离的平方
     */
    public static double getDistanceToLineSquare(Pos pt, Pos beginPt, Pos endPt) {
        // 先求垂点坐标
        double dx = beginPt.x - endPt.x;
        double dy = beginPt.y - endPt.y;

        // 如果两点离得非常近
        if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
            dx = pt.x - beginPt.x;
            dy = pt.y - beginPt.y;
            return dx * dx + dy * dy;
        }

        double u = (pt.x - beginPt.x) * (beginPt.x - endPt
                .x) + (pt.y - beginPt.y) * (beginPt.y - endPt.y);
        u = u / (dx * dx + dy * dy);
        double x = beginPt.x + u * dx;
        double y = beginPt.y + u * dy;

        dx = x - pt.x;
        dy = y - pt.y;

        // 然后计算两个点的距离
        return dx * dx + dy * dy;
    }

    /**
     * 在线段的延长线上根据给定距离取一个点。这个距离可以是负值，这样就是在线段内部取一点了
     * 只保证水平距离，垂直的不考虑
     */
    public static Pos getPointOnExtend(Pos start, Pos end, double distance) {
        double dx = end.x - start.x;
        double dy = end.y - start.y;
        double dz = end.z - start.z;
        double a = Math.sqrt(dx * dx + dy * dy + 1e-100);
        double x = distance * dx / a + end.x;
        double y = distance * dy / a + end.y;
        double z = distance * dz / a + end.z;
        return new Pos(x, y, z);
    }

    /**
     * 两点之间取一个点
     * 只保证水平距离，垂直的不考虑
     */
    public static Pos getPointOnLine(Pos start, Pos end, double distance) {
        double dx = end.x - start.x;
        double dy = end.y - start.y;
        double dz = end.z - start.z;
        double a = Math.sqrt(dx * dx + dy * dy + 1e-100);
        double x = distance * dx / a + start.x;
        double y = distance * dy / a + start.y;
        double z = distance * dz / a + start.z;
        return new Pos(x, y, z);
    }

    /**
     * 两条曲线是否相交,都是不闭合的曲线
     */
    public static boolean isCurveCross(List<Pos> posList1, List<Pos> posList2) {
        // 先判断边界是否相交
        Bound bound1 = bounds(posList1);
        Bound bound2 = bounds(posList2);
        if (bound1.isNotCross(bound2)) {
            return false;
        }
        for (int i = 0; i < posList1.size() - 1; i++) {
            Pos p1 = posList1.get(i);
            Pos p2 = posList1.get(i + 1);
            for (int j = 0; j < posList2.size() - 1; j++) {
                if (isLineCross(p1, p2, posList2.get(j), posList2.get(j + 1))) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 求曲线边界：xy的最大最小值，结果是：minX,minY,maxX,maxY
     */
    public static Bound bounds(List<Pos> posList) {
        double minX = Double.MAX_VALUE, minY = Double.MAX_VALUE, maxX = -Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (Pos p : posList) {
            if (minX > p.x) {
                minX = p.x;
            }
            if (minY > p.y) {
                minY = p.y;
            }
            if (maxX < p.x) {
                maxX = p.x;
            }
            if (maxY < p.y) {
                maxY = p.y;
            }
        }
        return new Bound(minX, minY, maxX, maxY);
    }

    public static Bound bound(Line line) {
        double minX = line.start.x, minY = line.start.y, maxX = line.start.x, maxY = line.start.y;
        Pos p = line.end;
        if (minX > p.x) {
            minX = p.x;
        }
        if (minY > p.y) {
            minY = p.y;
        }
        if (maxX < p.x) {
            maxX = p.x;
        }
        if (maxY < p.y) {
            maxY = p.y;
        }
        return new Bound(minX, minY, maxX, maxY);
    }

    /**
     * 判断两线段是否相交
     */
    public static boolean isLineCross(Pos p11, Pos p12, Pos p21, Pos p22) {
        if (p11 == null || p12 == null || p21 == null || p22 == null) {
            return false;
        }
        if (Math.max(p21.x, p22.x) <
                Math.min(p11.x, p12.x)) {
            return false;
        }
        if (Math.max(p11.x, p12.x) <
                Math.min(p21.x, p22.x)) {
            return false;
        }
        if (Math.max(p21.y, p22.y) <
                Math.min(p11.y, p12.y)) {
            return false;
        }
        if (Math.max(p11.y, p12.y) <
                Math.min(p21.y, p22.y)) {
            return false;
        }
        double y2221 = p22.y - p21.y;
        double x2211 = p22.x - p11.x;
        double y2211 = p22.y - p11.y;
        double x2212 = p22.x - p12.x;
        double y2212 = p22.y - p12.y;
        double x2221 = p22.x - p21.x;
        if ((x2211 * y2221 - y2211 * x2221) * (x2212 * y2221 - y2212 * x2221) > 0) {
            return false;
        }
        double x2111 = p21.x - p11.x;
        double y1211 = p12.y - p11.y;
        double y2111 = p21.y - p11.y;
        double x1211 = p12.x - p11.x;
        if ((x2111 * y1211 - y2111 * x1211) * (x2211 * y1211 - y2211 * x1211) > 0) {
            return false;
        }
        return true;
    }

    /**
     * 判断两线段是否相交
     */
    public static boolean isLineCross(double p11_x, double p11_y,
                                      double p12_x, double p12_y,
                                      double p21_x, double p21_y,
                                      double p22_x, double p22_y) {

        if (Math.max(p21_x, p22_x) <
                Math.min(p11_x, p12_x)) {
            return false;
        }
        if (Math.max(p11_x, p12_x) <
                Math.min(p21_x, p22_x)) {
            return false;
        }
        if (Math.max(p21_y, p22_y) <
                Math.min(p11_y, p12_y)) {
            return false;
        }
        if (Math.max(p11_y, p12_y) <
                Math.min(p21_y, p22_y)) {
            return false;
        }
        double y2221 = p22_y - p21_y;
        double x2211 = p22_x - p11_x;
        double y2211 = p22_y - p11_y;
        double x2212 = p22_x - p12_x;
        double y2212 = p22_y - p12_y;
        double x2221 = p22_x - p21_x;
        if ((x2211 * y2221 - y2211 * x2221) * (x2212 * y2221 - y2212 * x2221) > 0) {
            return false;
        }
        double x2111 = p21_x - p11_x;
        double y1211 = p12_y - p11_y;
        double y2111 = p21_y - p11_y;
        double x1211 = p12_x - p11_x;
        if ((x2111 * y1211 - y2111 * x1211) * (x2211 * y1211 - y2211 * x1211) > 0) {
            return false;
        }
        return true;
    }

    /**
     * 线段是否和曲线(由一系列点构成的曲线)相交，曲线是否闭合
     */
    public static boolean isCurveCross(Pos p1, Pos p2, List<Pos> path, boolean pathIsClose) {
        for (int i = 0; i < path.size() - 1; i++) {
            if (isLineCross(p1, p2, path.get(i), path.get(i + 1))) {
                return true;
            }
        }
        // 如果路线是闭合的，则再算一次第一个点和最后一个点的连线
        if (pathIsClose) {
            return isLineCross(p1, p2, path.get(0), path.get(path.size() - 1));
        }
        return false;
    }

    /**
     * 根据两点和线宽，得到4个点:从p1到p2，得到一个矩形，矩形的长是p1到p2，宽是width，垂直于直线p1p2
     * 为直线准备
     */
    public static Rectangle getRectWithLineCenter(Pos p1, Pos p2, double width) {

        double h = width * 0.5;
        double a = p2.x - p1.x;
        double b = p2.y - p1.y;
        double ab = Math.sqrt(a * a + b * b + 1e-100);

        double ah = a * h / ab;
        double bh = b * h / ab;

        double y1 = p1.y + ah;
        double x1 = p1.x - bh;

        double y4 = p1.y - ah;
        double x4 = p1.x + bh;

        double y2 = y1 + b;
        double x2 = x1 + a;

        double y3 = y4 + b;
        double x3 = x4 + a;

        return new Rectangle(
                new Pos(x1, y1),
                new Pos(x2, y2),
                new Pos(x3, y3),
                new Pos(x4, y4));
    }

    /**
     * 在两点的右边构建一个矩形
     * 根据两点和线宽，得到4个点：以start为起点，end为结束点，start-end为一边，在右边构建一个另一边为width的矩形
     */
    public static Rectangle getRectWithLineRight(Pos start, Pos end, double width) {

        if (HardCode) {
            Line pingxing = getLineAtRight(start, end, width);
            return new Rectangle(new Pos(start), pingxing.start, pingxing.end, new Pos(end));
        }

        double dx = end.x - start.x;
        double dy = end.y - start.y;

        double angle = Math.atan2(dy, dx) + Math.PI * 0.5;
        double x2 = start.x + width * Math.cos(angle);
        double y2 = start.y + width * Math.sin(angle);

        double x3 = x2 + dx;
        double y3 = y2 + dy;

        return new Rectangle(new Pos(start), new Pos(x2, y2), new Pos(x3, y3), new Pos(end));
    }

    /**
     * 在两点的左边构建一个矩形
     * 根据两点和线宽，得到4个点：以start为起点，end为结束点，start-end为一边，在左边构建一个另一边为width的矩形
     */
    public static Rectangle getRectWithLineLeft(Pos start, Pos end, double width) {

        if (HardCode) {
            Line pingxing = getLineAtLeft(start, end, width);
            return new Rectangle(new Pos(start), pingxing.start, pingxing.end, new Pos(end));
        }

        double dx = end.x - start.x;
        double dy = end.y - start.y;

        double angle = Math.atan2(dy, dx) - Math.PI * 0.5;
        double x2 = start.x + width * Math.cos(angle);
        double y2 = start.y + width * Math.sin(angle);

        double x3 = x2 + dx;
        double y3 = y2 + dy;

        return new Rectangle(new Pos(start), new Pos(x2, y2), new Pos(x3, y3), new Pos(end));
    }

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
     * 简单的将曲线向右或向左移动，只取中点，不考虑微小变形
     */
    public static List<Pos> moveLines(List<Pos> list, double distance, boolean atLeft) {
        List<Pos> result = new ArrayList<>();
        for (int i = 0; i < list.size() - 1; i++) {
            Line line = LineUtils.getLine(list.get(i), list.get(i + 1), distance, atLeft);
            if (i == 0) {
                result.add(line.start);
            } else {
                // 简单处理，只求均值，不求交点，因为曲线一般弯曲程度不大
                Pos last = result.get(result.size() - 1);
                last.meanWith(line.start);
            }
            result.add(line.end);
        }
        return result;
    }

    /**
     * 在两点的左边构建一个平行线，给定距离
     */
    public static Line getLineAtLeft(Pos start, Pos end, double distance) {

        if (HardCode) {
            return getLine(start, end, distance, true);
        }

        double dx = end.x - start.x;
        double dy = end.y - start.y;

        double angle = Math.atan2(dy, dx) - Math.PI * 0.5;
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

    /**
     * 获取右边的rect
     */
    public static Rectangle getRectAtRight(Pos start, Pos end, double width) {

        double a = end.x - start.x;
        double b = end.y - start.y;
        double ab = Math.sqrt(a * a + b * b + 1e-100);

        double y1 = start.y + a * width / ab;
        double x1 = start.x - b * width / ab;

        double y4 = start.y - a * width / ab;
        double x4 = start.x + b * width / ab;

        double x, y;
        // 根据向量叉乘检测哪一个在右边
        if ((end.x - start.x) * (y1 - start.y) - (end.y - start.y) * (x1 - start.x) > 0) {
            x = x1;
            y = y1;
        } else {
            x = x4;
            y = y4;
        }

        return new Rectangle(
                new Pos(start),
                new Pos(x, y),
                new Pos(x + a, y + b),
                new Pos(end));
    }

    /**
     * 求两个向量的外积。这两个向量是:p1-p2,p1-p。结果的正负号表示从p1-p2到p1-p的相对关系（左边，右边，还是共线）
     */
    public static double getCross(Pos p1, Pos p2, Pos p) {
        return (p2.x - p1.x) * (p.y - p1.y) - (p.x - p1.x) * (p2.y - p1.y);
    }

    /**
     * 在角平分线上取一个点，可以是负数，负数表示在外面
     */
    public static Pos createPosAtMean(Pos start, Pos middle, Pos end, double distance) {
        if (start == null || end == null || middle == null) {
            return null;
        }
        double angle1 = middle.angleTo(start);
        double angle2 = middle.angleTo(end);
        double angle = Math.atan2(Math.sin(angle1) + Math.sin(angle2), Math.cos(angle1) + Math.cos(angle2));
        return new Pos(middle.x + distance * Math.cos(angle), middle.y + distance * Math.sin(angle), (start.z + end.z) * 0.5);
    }
}
```
三角形：
```
/**
 * 三角形
 */
public class Triangle {

    public final Pos p1;
    public final Pos p2;
    public final Pos p3;

    public final List<Pos> posList;

    /**
     * 外心
     */
    public final Pos center;
    /**
     * 外接圆半径
     */
    public final float radius;

    public Triangle(Pos p1, Pos p2, Pos p3) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        posList = new ArrayList<>();
        posList.add(p1);
        posList.add(p2);
        posList.add(p3);

        center = calculateCenter();
        radius = (float) Math.max(center.distanceTo(p1), Math.max(center.distanceTo(p2), center.distanceTo(p3)));
    }

    private Pos calculateCenter() {
        double fm = 2 * ((p3.y - p2.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p2.x));
        if (fm == 0) {
            //这样就用中心来模拟
            return new Pos((p1.x + p2.x + p3.x) / 3, (p1.y + p2.y + p3.y) / 3);
        } else {
            double m1 = p1.x * p1.x + p1.y * p1.y;
            double m2 = p2.x * p2.x + p2.y * p2.y;
            double m3 = p3.x * p3.x + p3.y * p3.y;
            double d1 = m2 - m1;
            double d2 = m3 - m2;
            double x = (p3.y - p2.y) * d1 - (p2.y - p1.y) * d2;
            double y = (p2.x - p1.x) * d2 - (p3.x - p2.x) * d1;
            return new Pos(x / fm, y / fm);
        }
    }

    /**
     * 某个点是否在里面
     */
    public boolean contains(Pos pos) {
        return RectangleUtils.pnpoly(pos, posList);
    }

    /**
     * 是否相交
     */
    public boolean trigger(CarPos car) {
        //距离大于两个外切圆，则必定不相交
        if (center.distanceTo(car.center) > radius + car.carRect.maxRadius + 1) {
            return false;
        }
        if (cross(car.carRect.pos2, car.carRect.pos3)) {
            return true;
        }
        if (cross(car.carRect.pos3, car.carRect.pos4)) {
            return true;
        }
        if (cross(car.carRect.pos4, car.carRect.pos1)) {
            return true;
        }
        if (cross(car.carRect.pos1, car.carRect.pos2)) {
            return true;
        }
        if (RectangleUtils.contains(car.carRect, center)) {
            return true;
        }
        if (contains(car.center)) {
            return true;
        }
        return false;
    }

    /**
     * 是否和直线相交
     */
    public boolean cross(Pos pos1, Pos pos2) {
        ///如果外心到线的距离超过半径，则不会相交
        if (LineUtils.getDistanceToLine(center, pos1, pos2) > radius) {
            return false;
        }

        if (contains(pos1)) {
            return true;
        }
        if (contains(pos2)) {
            return true;
        }

        if (LineUtils.isLineCross(p1, p2, pos1, pos2)) {
            return true;
        }

        if (LineUtils.isLineCross(p2, p3, pos1, pos2)) {
            return true;
        }

        if (LineUtils.isLineCross(p3, p1, pos1, pos2)) {
            return true;
        }

        return false;
    }
}
```
矩形：
```
/**
 * 矩形:由四个顺序点决定的矩形
 */
public class Rectangle {

    public final Pos pos1;
    public final Pos pos2;
    public final Pos pos3;
    public final Pos pos4;

    public final Bound bound;

    public double maxRadius;

    public double minDistance;

    public final List<Pos> posList;

    public final Pos center;

    public Rectangle(Pos pos1, Pos pos2, Pos pos3, Pos pos4) {
        this.pos1 = pos1;
        this.pos2 = pos2;
        this.pos3 = pos3;
        this.pos4 = pos4;

        posList = new ArrayList<>();
        posList.add(pos1);
        posList.add(pos2);
        posList.add(pos3);
        posList.add(pos4);

        bound = bounds(posList);

        maxRadius = Math.max(pos1.distanceTo(pos3), pos2.distanceTo(pos4)) * 0.5;

        minDistance = Math.min(pos1.distanceTo(pos2), pos2.distanceTo(pos3)) * 0.5;

        center = new Pos(pos1).meanWith(pos3);
    }

    public void reset(Pos pos1, Pos pos2, Pos pos3, Pos pos4) {
        this.pos1.setPos(pos1);
        this.pos2.setPos(pos2);
        this.pos3.setPos(pos3);
        this.pos4.setPos(pos4);
        bound.set(bounds(posList));
        maxRadius = Math.max(pos1.distanceTo(pos3), pos2.distanceTo(pos4)) * 0.5;
        minDistance = Math.min(pos1.distanceTo(pos2), pos2.distanceTo(pos3)) * 0.5;
        center.setPos(new Pos(pos1).meanWith(pos3));
    }

    /**
     * 求这个矩形的中心点:求1、3的中点或者2、4的中点都可以
     */
    public Pos center() {
        return center;
    }

    /**
     * 求曲线边界：xy的最大最小值，结果是：minX,minY,maxX,maxY
     */
    public static Bound bounds(List<Pos> posList) {
        double minX = Double.MAX_VALUE, minY = Double.MAX_VALUE, maxX = -Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (Pos p : posList) {
            if (minX > p.x) {
                minX = p.x;
            }
            if (minY > p.y) {
                minY = p.y;
            }
            if (maxX < p.x) {
                maxX = p.x;
            }
            if (maxY < p.y) {
                maxY = p.y;
            }
        }
        return new Bound(minX, minY, maxX, maxY);
    }
}

/**
 * 矩形计算工具类
 */
public class RectangleUtils {

    /**
     * 两个矩形是否相交:有一条边相交，或者包含
     */
    public static boolean isCross(Rectangle self, Rectangle rect) {
        if (contains(self, rect.center())) {
            return true;
        }
        if (contains(rect, self.center())) {
            return true;
        }

        Pos[] me = {self.pos1, self.pos2, self.pos3, self.pos4};
        Pos[] other = {rect.pos1, rect.pos2, rect.pos3, rect.pos4};

        for (int i = 0; i < me.length; i++) {
            Pos p1 = me[i];
            Pos p2;
            if (i == me.length - 1) {
                p2 = me[0];
            } else {
                p2 = me[i + 1];
            }
            for (int j = 0; j < other.length; j++) {
                Pos p21 = other[j];
                Pos p22;
                if (j == other.length - 1) {
                    p22 = other[0];
                } else {
                    p22 = other[j + 1];
                }
                if (LineUtils.isLineCross(p1, p2, p21, p22)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 是否和曲线相交,计算矩形的每一条边是否和曲线相交
     *
     * @param path        曲线
     * @param pathIsClose 曲线是否闭合，比如车身是闭合的，一般的曲线是不闭合的
     */
    public static boolean isCross(Rectangle self, List<Pos> path, boolean pathIsClose) {
        if (LineUtils.isCurveCross(self.pos1, self.pos2, path, pathIsClose)) {
            return true;
        }
        if (LineUtils.isCurveCross(self.pos2, self.pos3, path, pathIsClose)) {
            return true;
        }
        if (LineUtils.isCurveCross(self.pos3, self.pos4, path, pathIsClose)) {
            return true;
        }
        return LineUtils.isCurveCross(self.pos4, self.pos1, path, pathIsClose);
    }

    /**
     * 是否和线段相交:有一条边相交,或者包含了其中的一个点
     */
    public static boolean isCross(Rectangle self, Pos p1, Pos p2) {

        double minX = Math.min(p1.x, p2.x);
        double minY = Math.min(p1.y, p2.y);
        double maxX = Math.max(p1.x, p2.x);
        double maxY = Math.max(p1.y, p2.y);

        if (minX > self.bound.maxX) {
            return false;
        }
        if (minY > self.bound.maxY) {
            return false;
        }
        if (maxX < self.bound.minX) {
            return false;
        }
        if (maxY < self.bound.minY) {
            return false;
        }
        if (contains(self, p1)) {
            return true;
        }
        if (contains(self, p2)) {
            return true;
        }
        if (LineUtils.isLineCross(self.pos1, self.pos2, p1, p2)) {
            return true;
        }
        if (LineUtils.isLineCross(self.pos2, self.pos3, p1, p2)) {
            return true;
        }
        if (LineUtils.isLineCross(self.pos3, self.pos4, p1, p2)) {
            return true;
        }
        if (LineUtils.isLineCross(self.pos4, self.pos1, p1, p2)) {
            return true;
        }
        return false;
    }

    /**
     * 矩形是否包含某个点
     */
    public static boolean contains(Rectangle self, Pos p) {
        return LineUtils.getCross(self.pos1, self.pos2, p) * LineUtils.getCross(self.pos3, self.pos4, p) >= 0
                && LineUtils.getCross(self.pos2, self.pos3, p) * LineUtils.getCross(self.pos4, self.pos1, p) >= 0;
    }

    /**
     * 矩形是否包含某个点，并且点不在边线上
     */
    public static boolean containsFull(Rectangle self, Pos p) {
        return LineUtils.getCross(self.pos1, self.pos2, p) * LineUtils.getCross(self.pos3, self.pos4, p) > 0
                && LineUtils.getCross(self.pos2, self.pos3, p) * LineUtils.getCross(self.pos4, self.pos1, p) > 0;
    }

    /**
     * 判断一个点是否在多边形内部（PNPOLY算法）
     * <p>
     * int pnpoly(int n, float pos_x, float pos_y, float (*vert)[2])
     * {
     * int i, j, c = 0;
     * <p>
     * for (i = 0, j = n - 1; i < n; j = i++)
     * {
     * if (((vert[i][1] > pos_y) != (vert[j][1] > pos_y)) &&
     * (pos_x < (vert[j][0] - vert[i][0]) * (pos_y - vert[i][1]) / (vert[j][1] - vert[i][1]) + vert[i][0]))
     * {
     * c = !c;
     * }
     * }
     * <p>
     * return c;
     * }
     */
    public static boolean pnpoly(Pos pos, List<Pos> posList) {
        int i, j;
        boolean contains = false;
        double pos_x = pos.x;
        double pos_y = pos.y;
        int n = posList.size();
        for (i = 0, j = n - 1; i < n; j = i++) {
            Pos pos_i = posList.get(i);
            Pos pos_j = posList.get(j);
            if (((pos_i.y > pos_y) != (pos_j.y > pos_y)) &&
                    (pos_x < (pos_j.x - pos_i.x) * (pos_y - pos_i.y) / (pos_j.y - pos_i.y) + pos_i.x)) {
                contains = !contains;
            }
        }

        return contains;
    }

    /**
     * 求点距离矩形的最近距离
     */
    public static double distanceToPos(Rectangle rectangle, Pos centerPos) {

        if (contains(rectangle, centerPos)) {
            return -1;
        }

        double min = Math.min(LineUtils.getDistanceToLine(centerPos, rectangle.pos1, rectangle.pos2),
                LineUtils.getDistanceToLine(centerPos, rectangle.pos2, rectangle.pos3));
        min = Math.min(min, LineUtils.getDistanceToLine(centerPos, rectangle.pos3, rectangle.pos4));
        min = Math.min(min, LineUtils.getDistanceToLine(centerPos, rectangle.pos4, rectangle.pos1));
        return min;
    }

    /**
     * 根据两条线段的两个端点来组成一个矩形，跟两个端点的顺序无关
     */
    public static Rectangle createRect(Pos line1Pos1, Pos line1Pos2, Pos line2Pos1, Pos line2Pos2) {
        if (LineUtils.isLineCross(line1Pos1, line2Pos2, line1Pos2, line2Pos1)) {
            return new Rectangle(line1Pos1, line1Pos2, line2Pos2, line2Pos1);
        }
        return new Rectangle(line1Pos1, line1Pos2, line2Pos1, line2Pos2);
    }
}
```
将车子抽象成一个类：
```
/**
 * 车子的实时位置数据
 */
public class CarPos implements Serializable {
    /**
     * 车子周身的若干个点
     */
    public List<Pos> carPoints;
    /**
     * 前定位点
     */
    public Pos front;
    /**
     * 后定位点
     */
    public Pos back;

    /**
     * 航向角，角度
     */
    public double degree;
    /**
     * 左前轮
     */
    public Pos wheelLeftFront;
    /**
     * 左后轮
     */
    public Pos wheelLeftBack;
    /**
     * 右前轮
     */
    public Pos wheelRightFront;
    /**
     * 右后轮
     */
    public Pos wheelRightBack;
    /**
     * 上一次的左前轮
     */
    public Pos wheelLeftFrontLast;
    /**
     * 上一次的左后轮
     */
    public Pos wheelLeftBackLast;
    /**
     * 上一次的右前轮
     */
    public Pos wheelRightFrontLast;
    /**
     * 上一次的右后轮
     */
    public Pos wheelRightBackLast;

    /**
     * 前点,车头最靠近中间的点
     */
    public Pos headerPoint;
    /**
     * 尾点，车位最靠近中间的点
     */
    public Pos tailPoint;

    /**
     * 车子的中心点,这个算起来估计有点麻烦
     */
    public Pos center;

    /**
     * 上一次的中心点
     */
    public Pos lastCenter;

    /**
     * 车子的俯仰角
     */
    public double pitch;

    /**
     * 车子的最小外包矩形：二维渲染的时候要用，三维不需要
     * <p>
     * p1,p2,p3,p4的结构是:<br/>
     * <p>
     * p4*******************************p3<br/>
     * 车尾*****back*******front*******车头<br/>
     * p1*******************************p2<br/>
     */
    public Rectangle carRect;

    /**
     * 边界矩形,用来初步判断是否相交
     */
    public Bound bound;

    /**
     * 外扩后的边界矩形,用来初步判断是否相交
     */
    public Bound bigBound;
}
```
然后车子碰撞的工具类：
```
/**
 * 车辆碰撞工具
 */
public class CarPosUtils {

    private static final int DefaultLineWidthSquare = 15 * 15;

    /**
     * 车子是否和曲线接触
     */
    public static boolean carTouchPath(CarPos car, List<Pos> path) {
        return carTouchPath(car, path, 1);
    }

    /**
     * 和曲线相交的时候，可以选择步长，不用每个点都测试，因为曲线在很短的距离内，可以认为近似直线
     */
    public static boolean carTouchPath(CarPos car, List<Pos> path, int step) {
        if (CollectionUtils.isEmpty(path)) {
            return false;
        }
        for (int i = 0; i < path.size() - step; i += step) {
            Pos p1 = path.get(i);
            int next = i + step;
            next = Math.min(next, path.size() - 1);
            Pos p2 = path.get(next);
            double minX = Math.min(p1.x, p2.x);
            double maxX = Math.max(p1.x, p2.x);
            double minY = Math.min(p1.y, p2.y);
            double maxY = Math.max(p1.y, p2.y);
            if (maxX < car.bound.getMinX()) {
                continue;
            }
            if (minX > car.bound.getMaxX()) {
                continue;
            }
            if (minY > car.bound.getMaxY()) {
                continue;
            }
            if (maxY < car.bound.getMinY()) {
                continue;
            }
            // 如果不和矩形接触，也不检查
            if (!RectangleUtils.isCross(car.carRect, p1, p2)) {
                continue;
            }
            if (carTouchLine(car, p1, p2)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 轮子是否和曲线触碰
     */
    public static boolean wheelTriggerPath(CarPos carPos, List<Pos> path) {
        for (int i = 0; i < path.size() - 1; i++) {
            if (LineUtils.isLineCross(carPos.wheelLeftFront, carPos.wheelRightFront, path.get(i), path.get(i + 1))
                    || LineUtils.isLineCross(carPos.wheelLeftBack, carPos.wheelRightBack, path.get(i), path.get(i + 1))) {
                return true;
            }
        }
        return false;
    }

    /**
     * 前轮是否触线
     */
    public static boolean frontWheelTriggerLine(CarPos carPos, Line line) {
        return wheelTriggerLine(carPos.wheelLeftFront, carPos.wheelLeftFrontLast, carPos.wheelRightFront, carPos.wheelRightFrontLast, line.start, line.end);
    }

    /**
     * 后轮是否触线
     */
    public static boolean backWheelTriggerLine(CarPos carPos, Line line) {
        return wheelTriggerLine(carPos.wheelRightBack, carPos.wheelRightBackLast, carPos.wheelLeftBack, carPos.wheelLeftBackLast, line.start, line.end);
    }

    /**
     * 指定的轮子是否碰线
     */
    public static boolean wheelTouchLine(Wheel wheel, CarPos carPos, Line line) {
        if (wheel == Wheel.LeftBack) {
            return LineUtils.isLineCross(carPos.wheelLeftBack, carPos.wheelLeftBackLast, line.start, line.end);
        } else if (wheel == Wheel.LeftFront) {
            return LineUtils.isLineCross(carPos.wheelLeftFront, carPos.wheelLeftFrontLast, line.start, line.end);
        } else if (wheel == Wheel.RightFront) {
            return LineUtils.isLineCross(carPos.wheelRightFront, carPos.wheelRightFrontLast, line.start, line.end);
        } else {
            return LineUtils.isLineCross(carPos.wheelRightBack, carPos.wheelRightBackLast, line.start, line.end);
        }
    }

    private static boolean wheelTriggerLine(Pos p11, Pos p12, Pos p21, Pos p22, Pos start, Pos end) {
        if (LineUtils.isLineCross(p11, p12, start, end)) {
            return true;
        }

        if (LineUtils.isLineCross(p21, p22, start, end)) {
            return true;
        }
        return false;
    }

    /**
     * 碰到这根线的是哪个轮子.轮子和线的距离必须小于一定值
     */
    public static Wheel touchLineWheel(CarPos carPos, Line line) {
        return touchLineWheel(carPos, line.start, line.end);
    }

    private static void set(Pos src, Pos dst) {
        dst.x = (int) src.x;
        dst.y = (int) src.y;
        dst.z = (int) src.z;
    }

    private static class ThreadPos {

        private ThreadLocal<Pos> posRef = new ThreadLocal<>();

        Pos get() {
            Pos pos = posRef.get();
            if (pos == null) {
                pos = new Pos();
                posRef.set(pos);
            }
            return pos;
        }
    }

    /**
     * 点的缓存
     */
    private static final ThreadPos ref1 = new ThreadPos();
    private static final ThreadPos ref2 = new ThreadPos();
    private static final ThreadPos ref3 = new ThreadPos();
    private static final ThreadPos ref4 = new ThreadPos();

    public static Wheel touchLineWheel(CarPos carPos, Pos start, Pos end) {

        // 精确到整数
        Pos p11 = ref1.get();
        Pos p12 = ref2.get();
        Pos p21 = ref3.get();
        Pos p22 = ref4.get();

        set(start, p21);
        set(end, p22);

        set(carPos.wheelLeftFront, p11);
        set(carPos.wheelLeftFrontLast, p12);
        // 碰到前轮了
        if (LineUtils.isLineCross(p11, p12, p21, p22)) {
            return Wheel.LeftFront;
        }
        set(carPos.wheelRightFront, p11);
        set(carPos.wheelRightFrontLast, p12);
        if (LineUtils.isLineCross(p11, p12, p21, p22)) {
            return Wheel.RightFront;
        }
        set(carPos.wheelRightBack, p11);
        set(carPos.wheelRightBackLast, p12);
        if (LineUtils.isLineCross(p11, p12, p21, p22)) {
            return Wheel.RightBack;
        }
        set(carPos.wheelLeftBack, p11);
        set(carPos.wheelLeftBackLast, p12);
        if (LineUtils.isLineCross(p11, p12, p21, p22)) {
            return Wheel.LeftBack;
        }

        set(carPos.wheelLeftFront, p11);
        set(carPos.wheelRightFront, p12);
        if (LineUtils.isLineCross(p11, p12, p21, p22)) {
            double leftDistance = LineUtils.getDistanceToLineSquare(carPos.wheelLeftFront, start, end);
            double rightDistance = LineUtils.getDistanceToLineSquare(carPos.wheelRightFront, start, end);
            if (leftDistance > rightDistance && rightDistance < DefaultLineWidthSquare) {
                return Wheel.RightFront;
            } else if (leftDistance < DefaultLineWidthSquare) {
                return Wheel.LeftFront;
            }
        }
        set(carPos.wheelLeftBack, p11);
        set(carPos.wheelRightBack, p12);
        if (LineUtils.isLineCross(p11, p12, p21, p22)) {
            double leftDistance = LineUtils.getDistanceToLineSquare(carPos.wheelLeftBack, start, end);
            double rightDistance = LineUtils.getDistanceToLineSquare(carPos.wheelRightBack, start, end);
            if (leftDistance > rightDistance && rightDistance < DefaultLineWidthSquare) {
                return Wheel.RightBack;
            } else if (leftDistance < DefaultLineWidthSquare) {
                return Wheel.LeftBack;
            }
        }
        return Wheel.None;
    }

    /**
     * 轮子是否触碰曲线
     */
    public static Wheel touchPathWheel(CarPos carPos, List<Pos> posList) {
        for (int i = 0; i < posList.size() - 1; i++) {
            Wheel wheel = touchLineWheel(carPos, posList.get(i), posList.get(i + 1));
            if (wheel != Wheel.None) {
                return wheel;
            }
        }
        return Wheel.None;
    }

    /**
     * 车子和四边形是否重合
     */
    public static boolean carIsCrossWithRectangle(CarPos carPos, Rectangle rect) {

        if (carPos.bound.isNotCross(rect.bound)) {
            return false;
        }

        Pos rectCenter = rect.center();

        /*
         * 如果中心距离大于两个半径之和，必然不会相交
         */
        if (carPos.center.distanceTo(rectCenter) > rect.maxRadius + carPos.carRect.maxRadius + 0.01) {
            return false;
        }

        // 外包矩形必然相交，否则不会相交
        if (!RectangleUtils.isCross(carPos.carRect, rect)) {
            return false;
        }

        if (RectangleUtils.contains(rect, carPos.center)) {
            return true;
        }
        // 依次判断每个点，是否相连
        for (int i = 0; i < carPos.carPoints.size(); i++) {
            Pos p1 = carPos.carPoints.get(i);
            Pos p2;
            if (i == carPos.carPoints.size() - 1) {
                p2 = carPos.carPoints.get(0);
            } else {
                p2 = carPos.carPoints.get(i + 1);
            }
            if (LineUtils.getDistanceToLine(rectCenter, p1, p2) > rect.maxRadius) {
                continue;
            }
            if (RectangleUtils.contains(rect, p1)) {
                return true;
            }
            final List<Pos> posList = rect.posList;
            for (int k = 0; k < posList.size(); k++) {
                Pos p11 = posList.get(k);
                Pos p12;
                if (k == posList.size() - 1) {
                    p12 = posList.get(0);
                } else {
                    p12 = posList.get(k + 1);
                }
                if (LineUtils.isLineCross(p11, p12, p1, p2)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 车子是否完全在矩形内，没有边重合
     */
    public static boolean carIsInRectangleFull(CarPos carPos, Rectangle rect) {
        if (carPos.bound.isNotCross(rect.bound)) {
            return false;
        }
        /*
         * 如果中心距离大于矩形最大半径，必然不会相交
         */
        if (carPos.center.distanceTo(rect.center()) > rect.maxRadius + carPos.carRect.maxRadius) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.center)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.wheelLeftBack)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.wheelLeftFront)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.wheelRightBack)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.wheelRightFront)) {
            return false;
        }
        // 如果车子的外包矩形完全在矩形内，也可以
        if (rectIsInRectangleFull(carPos.carRect, rect)) {
            return true;
        }
        for (Pos p : carPos.carPoints) {
            if (!RectangleUtils.containsFull(rect, p)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 一个矩形完全在另一个矩形里面
     */
    public static boolean rectIsInRectangleFull(Rectangle carPos, Rectangle rect) {
        if (carPos.bound.isNotCross(rect.bound)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.pos1)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.pos2)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.pos3)) {
            return false;
        }
        if (!RectangleUtils.containsFull(rect, carPos.pos4)) {
            return false;
        }
        return true;
    }

    /**
     * 车身是否触线，在做这个检测之前，会先检测bound是否相交
     */
    public static boolean carBodyTouchLine(CarPos carPos, Line line) {
        return carBodyTouchLine(carPos, line.start, line.end);
    }

    /**
     * 车身是否触线，在做这个检测之前，会先检测bound是否相交
     */
    public static boolean carBodyTouchLine(CarPos carPos, Pos start, Pos end) {
        if (!RectangleUtils.isCross(carPos.carRect, start, end)) {
            return false;
        }
        return LineUtils.isCurveCross(start, end, carPos.carPoints, true);
    }

    /**
     * 车子包含轮子是否触线，在做这个检测之前，会先检测bound是否相交
     */
    public static boolean carTouchLine(CarPos carPos, Pos start, Pos end) {
        if (LineUtils.isLineCross(carPos.wheelLeftBack, carPos.wheelRightBack, start, end)) {
            return true;
        }
        if (LineUtils.isLineCross(carPos.wheelLeftFront, carPos.wheelRightFront, start, end)) {
            return true;
        }
        if (LineUtils.isLineCross(carPos.wheelLeftBack, carPos.wheelRightFront, start, end)) {
            return true;
        }
        if (LineUtils.isLineCross(carPos.wheelLeftFront, carPos.wheelRightBack, start, end)) {
            return true;
        }
        return carBodyTouchLine(carPos, start, end);
    }

    /**
     * 车身距离某条直线的距离:将车身数据旋转，然后求最小值
     * 当线和车身相交时，会返回负值
     */
    public static double distanceToLine(CarPos carPos, Line line) {
        return distanceToLine(carPos, line.start, line.end);
    }

    /**
     * 车身距离某条直线的距离:将车身数据旋转，然后求最小值。
     * 当线和车身相交时，会返回负值
     * 点的顺序无关
     * 点的顺序无关
     * 点的顺序无关
     */
    public static double distanceToLine(CarPos carPos, Pos start, Pos end) {
        // 先绕直线上任一点旋转
        Pos center = new Pos(start).meanWith(end);
        double theta = start.angleTo(end);
        // 反方向旋转,使直线和x轴平行
        double sinA = Math.sin(-theta);
        double cosA = Math.cos(-theta);
        double distanceMin = Double.MAX_VALUE;
        double distanceMax = -Double.MAX_VALUE;

        // 然后计算y轴的差值
        for (Pos p : carPos.carPoints) {
            Pos pos = new Pos(p).rotate(center, cosA, sinA);
            double dis = (pos.y - center.y);
            if (dis < distanceMin) {
                distanceMin = dis;
            }
            if (dis > distanceMax) {
                distanceMax = dis;
            }
        }
        // 都大于0
        if (distanceMax >= 0 && distanceMin >= 0) {
            return distanceMin;
        }
        // 都小于0
        if (distanceMax <= 0 && distanceMin <= 0) {
            return Math.abs(distanceMax);
        }
        // 压线了,取绝对值小的那个,并且是负值
        return -(Math.min(Math.abs(distanceMax), Math.abs(distanceMin)));
    }

    /**
     * car距离点的最近距离
     *
     * @return 等于-1 代表在车身里面
     */
    public static double carDistancePos(List<Pos> carPoints, Pos pos) {
        boolean pnpoly = RectangleUtils.pnpoly(pos, carPoints);
        if (!pnpoly) {
            double distance = 0;
            for (Pos carPoint : carPoints) {
                double value = carPoint.distanceTo(pos);
                if (value < distance) {
                    distance = value;
                }
            }
            return distance;
        }
        return -1;
    }


    /**
     * 车子是否在远离点
     */
    public static boolean isFarawayPos(CarPos carPos, Pos center) {
        //  上一刻的点存在，则使用当前点与上一刻的点的向量，点乘当前的点到 center 的向量，大于 0 说明在远离
        if (carPos.wheelLeftFrontLast != null && carPos.wheelRightFrontLast != null) {
            Pos last = new Pos(carPos.wheelLeftFrontLast).meanWith(carPos.wheelRightFrontLast);
            Pos current = new Pos(carPos.wheelLeftFront).meanWith(carPos.wheelRightFront);
            return current.vectorTo(last).dot(current.vectorTo(center)) > 0;
        }
        return carPos.back.vectorTo(carPos.front).dot(carPos.back.vectorTo(center)) < 0;
    }

    /**
     * 车子是否在靠近点
     */
    public static boolean isNearToPos(CarPos carPos, Pos center) {
        return carPos.back.vectorTo(carPos.front).dot(carPos.back.vectorTo(center)) > 0;
    }

    /**
     * 车子是否在靠近进入点
     */
    public static boolean isNearEnterToPos(CarPos carPos, Pos startLineCenter, Pos center) {
        return carPos.back.vectorTo(carPos.front).dot(startLineCenter.vectorTo(center)) > 0 &&
                carPos.back.vectorTo(carPos.front).dot(carPos.back.vectorTo(center)) > 0;
    }

    /**
     * 车子是否在倒退的靠近点
     */
    public static boolean isBackNearToPos(CarPos carPos, Pos center) {
        return carPos.front.vectorTo(carPos.back).dot(carPos.front.vectorTo(center)) > 0;
    }

    /**
     * 一种非常简单的相交判断，看车身中线是否和线相交，在有些地方需要用
     */
    public static boolean simpleCrossWithLine(CarPos carPos, Pos p1, Pos p2) {
        Pos back = new Pos(carPos.carRect.pos1).meanWith(carPos.carRect.pos4);
        Pos front = new Pos(carPos.carRect.pos2).meanWith(carPos.carRect.pos3);
        return LineUtils.isLineCross(back, front, p1, p2);
    }

    /**
     * 根据前轮转角，预测倒车时后轮的轨迹。预测n秒轨迹
     *
     * @param n 预测的时间，单位秒
     */
    public static BackWheelTrackModel calculateTrack(SignalGetter signal, int n) {
        CarPos carPos = signal.getCarPos();
        // 前轮转向角度，一般0-33度，向右为正，向左为负
        double wheelAngle = signal.getCar().wheelAngel;
        // 如果小于这个值
        if (Math.abs(wheelAngle) < 1e-5) {
            wheelAngle = 1e-5 * (wheelAngle >= 0 ? 1 : -1);
        }
        final double radius = Math.toRadians(wheelAngle);
        // 前后轮间距
        final double L = (carPos.wheelRightBack.distanceTo(carPos.wheelRightFront) + carPos.wheelLeftBack.distanceTo(carPos.wheelLeftFront)) * 0.5;
        // 轮子的宽度，以爱丽舍的为标准，相差几厘米关系不大
        final double WheelDis = 18.5;
        // 后轮轮距
        final double W = carPos.wheelLeftBack.distanceTo(carPos.wheelRightBack) - WheelDis;
        // 转弯半径，以前后轮轴心计算，用绝对值
        final double R = Math.abs(L / Math.tan(radius));
        // 左后轮半径
        final double RL = R + W * 0.5 * (wheelAngle >= 0 ? 1 : -1);
        // 右后轮半径
        final double RR = R - W * 0.5 * (wheelAngle >= 0 ? 1 : -1);
        // 圆心指向后轮轴心的角度
        double theta = carPos.degree + 90 * (wheelAngle > 0 ? -1 : 1);
        theta = Math.toRadians(theta);
        // 后轮轴心坐标
        final Pos backCenter = new Pos(carPos.wheelLeftBack).meanWith(carPos.wheelRightBack);
        // 圆心坐标
        final Pos center = new Pos(backCenter.x + R * Math.sin(-theta), backCenter.y + R * Math.cos(-theta), backCenter.z);
        // 预测时间间隔，0.2秒
        final double time = 0.2;
        // 一秒采集5次，一共采集5秒，也可以用距离来计算
        final int size = (int) (n / time);
        BackWheelTrackModel track = new BackWheelTrackModel();
        track.leftTracks = new ArrayList<>();
        track.rightTracks = new ArrayList<>();
        // 当前速度,厘米/秒
        final double speed = signal.getCar().gpsSpeed * 100 / 3.6;
        double t = 0;
        for (int i = 0; i < size; i++) {
            // 当前时间
            t += time;
            // 在坐标系里的角度
            double thetaI = theta - speed * t / R;
            double cos = Math.cos(thetaI);
            double sin = Math.sin(thetaI);
            // 将轨迹添加进去
            track.leftTracks.add(new Pos(center.x + RL * sin, center.y + RL * cos, center.z));
            track.rightTracks.add(new Pos(center.x + RR * sin, center.y + RR * cos, center.z));
        }
        return track;
    }
}
```
主要就是一些数学概念：坐标系、点、向量、线、三角形、矩形，然后勾股定理，向量的点乘、叉乘等方法。方法非常多，也不是一下子就写完的，都是业务需求一点点完善，发展到现在这个样子，很多方法还没深入研究它的原理。毕业之后数学便丢得差不多了，现在要捡起来还得费点工夫。
依赖上述那些便可以做「碰撞评判」了：
```
/**
 * 车身出线
 */
public class K2_ZhiJiaoZhuanWan_305108_Event extends OneDeductEvent<K2ZhiJiaoZhuanWanConfig> {

    @Override
    protected boolean handleSuccess(SignalGetter signal, ExamProcessor processor, StepHandler stepEvent) {
        ZhiJiaoStateData data = stepEvent.getStepData();
        if (data.checker.bodyIsTriggerLine) {
            return false;
        }
        return true;
    }
}

//检查车身触线
bodyIsTriggerLine = CarPosUtils.carBodyTouchLine(carPos, currentData.line23)
        || CarPosUtils.carBodyTouchLine(carPos, currentData.line34)
        || CarPosUtils.carBodyTouchLine(carPos, currentData.line56)
        || CarPosUtils.carBodyTouchLine(carPos, currentData.line61);
```

## 总结
科二考试系统这个系列文章算是写完了，主要根据项目经验做的一点总结，代码几乎都是些工具类方法，主要还是核心思想。系列文章链接来一波：
1. [关于「引擎」设计的小结](http://lastwarmth.win/2021/05/14/engine/)
2. [科二考试系统](http://lastwarmth.win/2021/07/08/gps/)
3. [科二考试系统-续](http://lastwarmth.win/2021/07/09/gps-2/)
4. [科二考试系统-矩阵](http://lastwarmth.win/2021/07/13/gps-3/)
