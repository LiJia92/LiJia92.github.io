---
title: Android事件分发机制学习小记
date: 2015-11-14 01:15:22
tags:
 - 事件分发
---

Android事件分发机制有三类：Activity、View、ViewGroup，其调用顺序是Activity->ViewGroup->View，考虑到实际开发中Activity的事件分发很少用到，这里便不作赘述。想要了解的可自行百度、谷歌。
下面，我从View的事件分发开始。

---
## View的事件分发
我们知道，任何触摸事件都是从dispatchTouchEvent函数开始。在View的dispatchTouchEvent函数中，会看到这样的代码块：
```
...
if (onFilterTouchEventForSecurity(event)) {
            //noinspection SimplifiableIfStatement
            ListenerInfo li = mListenerInfo;
            if (li != null && li.mOnTouchListener != null
                    && (mViewFlags & ENABLED_MASK) == ENABLED
                    && li.mOnTouchListener.onTouch(this, event)) {
                result = true;
            }

            if (!result && onTouchEvent(event)) {
                result = true;
            }
        }
...
```
说明View若要进行事件分发，那么会优先分发给onTouch()，若onTouch()返回true，则直接返回true，不会进入到onTouchEvent()中。否则，进入到onTouchEvent()。

<!--more-->

onTouch()与onTouchEvent()都是View中用户处理触摸事件的方法。onTouch是OnTouchListener接口中的函数，OnTouchListener接口是暴露给用户，让用户自己处理触摸事件。onTouchEvent()是View自带的接口，Android系统提供了默认的实现，当然，也可以重载该方法。

在onTouchEvent()函数中，会看到这样的代码块：
```
...
if (((viewFlags & CLICKABLE) == CLICKABLE ||
                (viewFlags & LONG_CLICKABLE) == LONG_CLICKABLE) ||
                (viewFlags & CONTEXT_CLICKABLE) == CONTEXT_CLICKABLE) {
                ...
                return true;
                ...
}
return false;
...
```
即若View可点击，则返回true；若不可点击，则返回false。

在if内部，若是ACTION_UP事件，条件符合的情况下会执行performClick()方法，该方法会执行mOnClickListener.onClick()，即View的onClick事件，是在onTouchEvent()方法的ACTION_UP分支中进行调用的。

下面我做了一个测试：

- 分别定义一个Button与TextView，设置OnTouchListener。
```
button.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                Log.d("TAG", "onTouch execute, action " + event.getAction());
                return false;
            }
        });

textView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                Log.d("TAG", "onTouch execute, action " + event.getAction());
                return false;
            }
        });
```
点击Button，log如下：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/touch-event2.png)
点击ImageView，log如下：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/touch-event3.png)
可以看到Button的所有事件都执行了，而TextView只执行了ACTION_DOWN事件。针对ACTION_DOWN事件，Button的dispatchTouchEvent()返回的是true（onTouch返回false后会继续执行onTouchEvent，由于可点击，所以返回true），而TextView返回false。

- 修改textView的onTouch如下：
```
@Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        return false;
                    case MotionEvent.ACTION_UP:
                        return false;
                    default:
                        break;
                }
                Log.d("TAG", "onTouch execute, action " + event.getAction());
                return false;
            }
```
会发现ACTION_DOWN、ACTION_MOVE（手指点击不精确，会造成移动）、ACTION_UP都会执行。后面我对这三个事件的返回值进行组合，后面发现<font color=red>只有在ACTION_DOWN事件触发，dispatchTouchEvent返回true时，后面的ACTION_MOVE、ACTION_UP才会执行。</font>暂时还不知道原因，姑且理解为：ACTION_DOWN是触摸事件的起点，连消费开头的能力都不具备，那么后面的事件就免谈了？这里暂时留一个疑问。

下面我们来看看ViewGroup。

---
## ViewGroup的事件分发
ViewGroup继承于View，它中对触摸事件的处理，很多都继承于View。但是，ViewGroup又有自己对触摸事件的特定处理：

 - ViewGroup重载了dispatchTouchEvent()方法。
 - ViewGroup新增了onInterceptTouchEvent()方法。

onInterceptTouchEvent()是用来判断ViewGroup是否拦截事件。默认返回false，即不拦截。
在dispatchTouchEvent()中，会通过onInterceptTouchEvent()判断ViewGroup是否拦截事件，若返回true，则没有后续。若返回false，则ViewGroup会尝试分发事件给自己的子View。在分发时，会有这么一个判断：
```
if (!canceled && !intercepted) {
            if (actionMasked == MotionEvent.ACTION_DOWN
                    || (split && actionMasked == MotionEvent.ACTION_POINTER_DOWN)
                    || actionMasked == MotionEvent.ACTION_HOVER_MOVE) {
                ...

        }
```
即只有在ACTION_DOWN的时候，ViewGroup才会尝试着将事件分发给子View，这便是疑问的答案。在ACTION_DOWN之后，传递ACTION_MOVE或ACTION_UP时，ViewGroup不会再执行上面的if，而是直接遍历子View链表，查找之前接受ACTION_DOWN的子View，并将触摸事件分配给这些子View。

---
## 小结

 - View事件分发，会先将事件分配给onTouch()进行处理，然后才分配给onTouchEvent()进行处理。
 - onTouchEvent()的返回值与View是否可点击有关。
 -  ViewGroup中的dispatchTouchEvent()会将触摸事件进行递归遍历传递。ViewGroup会遍历它的所有孩子，对每个孩子都递归的调用dispatchTouchEvent()来分发触摸事件。
 -  若ViewGroup的某个孩子没有接受(消费或者拦截)ACTION_DOWN事件；那么，ACTION_MOVE和ACTION_UP等事件也一定不会分发给这个孩子。
 -  ViewGroup的onInterceptTouchEvent()默认返回false。

下面贴一张总结图：
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2015/11/touch-event1.png)
<font color=red>注：文中源码的if判断都是以一般情况为前提，提取我们比较关注的点进行判断来得出的结论。</font>

---
## 参考文章
http://blog.csdn.net/guolin_blog/article/details/9097463
http://blog.csdn.net/guolin_blog/article/details/9153747
http://wangkuiwu.github.io/2015/01/03/TouchEvent-View/
http://wangkuiwu.github.io/2015/01/04/TouchEvent-ViewGroup/
