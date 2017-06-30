---
title: 关于 ViewPager 的2点特性
date: 2017-06-30 09:54:26
tags:
 - 日常开发
---

新手引导是每个 App 都具备的。如果新手引导直接用 Activity 来做，可能就会比较繁杂和冗余。所以一般都是 ViewPager 来实现。那么便会有 2 个问题：
1. 不能手动滑动
2. 当前 item 跳转到下一个 item 要平滑滑动

<!-- more -->

自定义``ViewPager``可以解决这 2 个问题，下面直接上代码：
```
package android.support.v4.view;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;

/**
 * 1、禁止左右滑动
 * 2、setCurrentItem平滑切换
 */

public class NoScrollViewPager extends ViewPager {

    public NoScrollViewPager(Context context) {
        super(context);
    }

    public NoScrollViewPager(Context context, AttributeSet attr) {
        super(context, attr);
    }

    void smoothScrollTo(int x, int y, int velocity) {
        super.smoothScrollTo(x, y, 1);
    }

    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        return false;
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        return false;
    }
}
```
禁止滑动通过触摸事件返回``false``，这个很好理解了。
``setCurrentItem``及时添加第二个参数为``true``也没有平滑滑动的效果，参考[stackoverflow](https://stackoverflow.com/questions/11962268/viewpager-setcurrentitempageid-true-does-not-smoothscroll)。

## 引申
Java 有四种访问权限修饰符：

| 访问权限 | 类 | 包 | 子类 | 其他包 |
| :-----: | :-----: | :----: | :----: | :----: |
| public         | √      |   √    | √      |   √    |
| protected      | √      |   √    | √      |   ×    |
| default        | √      |   √    | ×      |   ×    |
| private        | √      |   ×    | ×      |   ×    |

通过上面的``stackoverflow``可以看到，当``Android Sdk``的某个方法是``default``时,我们是没有权限调用的，有 2 种方式来解决问题：
1. 反射
2. ``建立相同路径的包名，包访问域可以访问到default方法``
