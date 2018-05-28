---
title: 关于重构的一些实践
date: 2018-05-07 10:11:43
tags:
 - 重构
---
关于本文即将阐述的一些东西，其实我也不知道算不算得上重构，姑且就算吧。重构，是软件开发者始终绕不过的一道坎，尤其当你接手一个“年迈”项目的时候。首先介绍下项目背景：
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/7/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180507102549.png)
Android Core 是所有 Lib、App 都有依赖的。近期 Core 做了一次大版本升级，将许多``Deprecated``标记的方法、类都删掉了，同时内部代码做了重构，有些 Api、类名都有相应的修改。那么现在作为图中的 Saturn(Lib) 这个位置，在引用新版本的 Core 之后，如何重构代码，使之能够正常工作？下面针对我碰到的几个点，做一下说明。

<!-- more -->

## 包名修改
重构针对迁移包路径的，算是改动量最小的了。直接全局搜索相应的包名，进行替换即可。
**注意：这里千万不要加上 import ，因为很有可能 Core 中自定义 View 也更换了包名，同时在 xml 中有引用，加上 import 是搜不出 xml 中的引用的。**
举个例子：cn.xxx.android.ui.framework.view.commonview.CommonViewPager -> cn.xxx.android.core.widget.CommonViewPager。
某某 xml 中：
```
<cn.xxx.android.ui.framework.view.commonview.CommonViewPager
    android:id="@+id/view_pager"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:layout_below="@+id/divider" />
```
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/7/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180507103810.png)
注意去掉图中的 import！

## @Deprecated 类或方法删除
一般我们标记一个类或者方法为 @Deprecated 时，都会指出它的替代方案，就像这样：
![](http://7xryow.com1.z0.glb.clouddn.com/2018/5/7/1.png)
这种情况就很简单了，根据替代方案进行相应修改即可。
但是这个比较依赖人工注释，如若有同事忘记写这个了，那么就很头疼了：你不知道用什么方法来替代它。若能询问到标记 @Deprecated 的同事那也还好，万一同事离职了或他自己都忘记了，那如何处理呢？
1. 读懂代码，自己寻找替代方案
2. 从 Core 中 copy 一份到自己的代码中

方案一只有在业务简单，逻辑清晰的情况下适用，当业务十分复杂，逻辑阅读起来也比较费力时，方案一的工作量就很庞大了。这个时候选择方案二合适点，后续有空再来优化。当然，这个``后续有空``可能就和``明天``一样，哈哈哈...

## 功能模块整个删除
Core 之前有一套网络请求模块，在升级后，使用了另外一套，两套是完全不同的东西。但是在 Saturn 中很多网络请求仍然使用着旧的那套东西。碰到这种情况，目前想到的就只有 copy 了。其实对这种升级，我是很厌烦的，因为它完全不考虑兼容，强制所有用到 Core 的都进行整改，也不考虑其他同事的工作量，虽然它已经标记为 @Deprecated 很久了。

## 自定义 View
碰到自定义 View 也给删除的，若没有替代方案，也只能 copy 代码了。但是自定义 View 的 copy 要多一步：资源文件。很多自定义 View 有自定义的属性或者样式之类的，这就要求你在 copy 代码同时，也要 copy 相应的资源文件。
**这里有个坑：Saturn 作为一个 Lib，如果原封不动的直接将文件 copy 过来，那么考虑一下 Venus。Venus 在兼容 Core 升级的时候，很有可能和 Saturn 采用同样的做法，那么两份相同的资源文件就会导致冲突了。这个冲突不是 Saturn 自身能测试得到的，只有在 Mercury App 进行集成的时候才会暴露出来。所以最好提前考虑一下，针对资源文件加上独有的前缀。**
比如：
```
<declare-styleable name="RoundCornerButton">
    <attr name="round_button_radius" format="dimension" />
    <attr name="round_button_radius_lt" format="dimension" />
    <attr name="round_button_radius_rt" format="dimension" />
    <attr name="round_button_radius_lb" format="dimension" />
    <attr name="round_button_radius_rb" format="dimension" />
    <attr name="round_button_bg_color" format="color" />
    <attr name="round_button_elevation" format="dimension" />
    <attr name="round_button_stroke_color" format="color" />
    <attr name="round_button_stroke_width" format="dimension" />
</declare-styleable>

<!-- 改成如下 -->
<declare-styleable name="saturn__RoundCornerButton">
    <attr name="saturn__radius" format="dimension" />
    <attr name="saturn__radius_lt" format="dimension" />
    <attr name="saturn__radius_rt" format="dimension" />
    <attr name="saturn__radius_lb" format="dimension" />
    <attr name="saturn__radius_rb" format="dimension" />
    <attr name="saturn__bg_color" format="color" />
    <attr name="saturn__elevation" format="dimension" />
    <attr name="saturn__stroke_color" format="color" />
    <attr name="saturn__stroke_width" format="dimension" />
</declare-styleable>
```
为了完全避免冲突，最好样式名、自定义属性名都加上前缀，如果过长可适当删减，同时记得修改自定义 View 中的引用。
```
public RoundCornerButton(Context context, AttributeSet attrs, int defStyleAttr) {
    super(context, attrs, defStyleAttr);
    // 获取自定义的属性,设置相应背景
    TypedArray typedArray = context.obtainStyledAttributes(attrs, R.styleable.saturn__RoundCornerButton);
    try {
        float allRadius = typedArray.getDimension(R.styleable.saturn__RoundCornerButton_saturn__radius, 0);
        float ltRadius = typedArray.getDimension(R.styleable.saturn__RoundCornerButton_saturn__radius_lt, 0);
        float rtRadius = typedArray.getDimension(R.styleable.saturn__RoundCornerButton_saturn__radius_rt, 0);
        float lbRadius = typedArray.getDimension(R.styleable.saturn__RoundCornerButton_saturn__radius_lb, 0);
        float rbRadius = typedArray.getDimension(R.styleable.saturn__RoundCornerButton_saturn__radius_rb, 0);
        int color = typedArray.getColor(R.styleable.saturn__RoundCornerButton_saturn__bg_color, 0);
        int strokeColor = typedArray.getColor(R.styleable.saturn__RoundCornerButton_saturn__stroke_color, 0);
        int strokeWidth = typedArray.getDimensionPixelOffset(R.styleable.
                saturn__RoundCornerButton_saturn__stroke_width, 0);
        float elevation = typedArray.getDimension(R.styleable.saturn__RoundCornerButton_saturn__elevation, 0);
        drawable = new GradientDrawable();
        drawable.setColor(color);
        if (allRadius == 0) {
            drawable.setCornerRadii(new float[]{ltRadius, ltRadius, rtRadius, rtRadius,
                    rbRadius, rbRadius, lbRadius, lbRadius});
        } else {
            drawable.setCornerRadius(allRadius);
        }
        if (strokeColor != 0) {
            drawable.setStroke(strokeWidth, strokeColor);
        }
        ViewCompat.setBackground(this, drawable);
        changeElevation(elevation);
    } catch (Exception e) {
        LogUtils.d("exception", e);
    } finally {
        typedArray.recycle();
    }
}
```

## 小结
针对这种重构，小结一下：
1. 有替代方案直接上替代方案。
2. 没有替代方案，在时间充足的情况下，可尝试读懂代码，自己寻找替代方案；若时间不充足则只能 copy 代码了。
3. 注意自定义 View 相关内容。
4. 在开发过程中，碰到 @Deprecated 标记的类或者方法尽早整改吧，不然万一哪天版本升级这个类或者方法没了，在量大的情况下，就很蛋疼了。
5. Saturn 作为一个 Lib，在对外提供 SDK 的情况下，最好不要删除、改变现有方法，尽量提供新的方法保证兼容。
