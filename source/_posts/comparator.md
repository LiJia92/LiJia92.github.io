---
title: Java 中的 Comparator
date: 2017-12-20 16:04:13
tags:
 - java
---
最近写过一个界面，涉及到排序。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2017/12/20/%E9%80%89%E5%8C%BA_293.png)
用到了 Collections 中的 sort 方法：
```
Collections.sort(mData, new Comparator<BookMemberReport>() {
    @Override
    public int compare(BookMemberReport lhs, BookMemberReport rhs) {
        if (sortFlag == SORT_FLAG_SALE_DESCENDING) {
            return (int) (rhs.saleAmount - lhs.saleAmount);
        } else if (sortFlag == SORT_FLAG_SALE_ASCENDING) {
            return (int) (lhs.saleAmount - rhs.saleAmount);
        } else if (sortFlag == SORT_FLAG_COUNT_DESCENDING) {
            return rhs.orderCount - lhs.orderCount;
        } else if (sortFlag == SORT_FLAG_COUNT_ASCENDING) {
            return lhs.orderCount - rhs.orderCount;
        }
        return 0;
    }
});
```
Collections 根据传入的 Comparator 进行排序。刚开始写的时候通过不停的试，把正确的结果给试出来了。但是对于其原理却不是很清晰，今天便稍微扒一扒其源码。

<!-- more -->

```
public static <T> void sort(List<T> list, Comparator<? super T> c) {
    if (list.getClass() == ArrayList.class) {
        Arrays.sort(((ArrayList) list).elementData, 0, list.size(), (Comparator) c);
        return;
    }

    Object[] a = list.toArray();
    Arrays.sort(a, (Comparator)c);
    ListIterator<T> i = list.listIterator();
    for (int j=0; j<a.length; j++) {
        i.next();
        i.set((T)a[j]);
    }
}
```
跟到 Arrays.sort() 方法：
```
public static <T> void sort(T[] a, Comparator<? super T> c) {
    if (c == null) {
        sort(a);
    } else {
        if (LegacyMergeSort.userRequested)
            legacyMergeSort(a, c);
        else
            TimSort.sort(a, 0, a.length, c, null, 0, 0);
    }
}
```
在 else 分支中还有一个分支，看到 userRequested：
```
/**
 * Old merge sort implementation can be selected (for
 * compatibility with broken comparators) using a system property.
 * Cannot be a static boolean in the enclosing class due to
 * circular dependencies. To be removed in a future release.
 */
static final class LegacyMergeSort {
    // Android-changed: Never use circular merge sort.
    private static final boolean userRequested = false;
}
```
所以所有的排序应该都是走的 TimSort 分支。但是这不影响研究 Comparator 接口的原理，进入到 legacyMergeSort：
```
/** To be removed in a future release. */
private static <T> void legacyMergeSort(T[] a, Comparator<? super T> c) {
    T[] aux = a.clone();
    if (c==null)
        mergeSort(aux, a, 0, a.length, 0);
    else
        mergeSort(aux, a, 0, a.length, 0, c);
}
```
继续跟进：
```
/**
 * Src is the source array that starts at index 0
 * Dest is the (possibly larger) array destination with a possible offset
 * low is the index in dest to start sorting
 * high is the end index in dest to end sorting
 * off is the offset into src corresponding to low in dest
 * To be removed in a future release.
 */
private static void mergeSort(Object[] src,
                              Object[] dest,
                              int low, int high, int off,
                              Comparator c) {
    int length = high - low;

    // Insertion sort on smallest arrays
    if (length < INSERTIONSORT_THRESHOLD) {
        for (int i=low; i<high; i++)
            for (int j=i; j>low && c.compare(dest[j-1], dest[j])>0; j--)
                swap(dest, j, j-1);
        return;
    }

    // Recursively sort halves of dest into src
    int destLow  = low;
    int destHigh = high;
    low  += off;
    high += off;
    int mid = (low + high) >>> 1;
    mergeSort(dest, src, low, mid, -off, c);
    mergeSort(dest, src, mid, high, -off, c);

    // If list is already sorted, just copy from src to dest.  This is an
    // optimization that results in faster sorts for nearly ordered lists.
    if (c.compare(src[mid-1], src[mid]) <= 0) {
       System.arraycopy(src, low, dest, destLow, length);
       return;
    }

    // Merge sorted halves (now in src) into dest
    for(int i = destLow, p = low, q = mid; i < destHigh; i++) {
        if (q >= high || p < mid && c.compare(src[p], src[q]) <= 0)
            dest[i] = src[p++];
        else
            dest[i] = src[q++];
    }
}
```
看到第一个 if 语句，看到 INSERTIONSORT_THRESHOLD 变量：
```
/**
 * Tuning parameter: list size at or below which insertion sort will be
 * used in preference to mergesort.
 * To be removed in a future release.
 */
private static final int INSERTIONSORT_THRESHOLD = 7;
```
即只要是数组个数小于 7 的，直接走 if 语句进行排序，然后返回。重点：
```
for (int i=low; i<high; i++)
    for (int j=i; j>low && c.compare(dest[j-1], dest[j])>0; j--)
        swap(dest, j, j-1);
return;
```
即第 j-1 个元素跟 j 进行比较，通过 compare 返回的值，如果大于 0，则进行交换。看到 compare 接口：
```
/**
 * @param o1 the first object to be compared.
 * @param o2 the second object to be compared.
 * @return a negative integer, zero, or a positive integer as the
 *         first argument is less than, equal to, or greater than the
 *         second.
 * @throws NullPointerException if an argument is null and this
 *         comparator does not permit null arguments
 * @throws ClassCastException if the arguments' types prevent them from
 *         being compared by this comparator.
 */
int compare(T o1, T o2);
```
所以很清晰了，**如果 compare 返回的值大于 0，那么就会将这 2 个元素交换，即将大元素放在前面进行降序，反之则是正序。**
文中代码基于 Android-25，Android-26 中已经剔除 LegacyMergeSort。
```
public static <T> void sort(T[] a, Comparator<? super T> c) {
    if (c == null) {
        sort(a);
    } else {
        // Android-changed: LegacyMergeSort is no longer supported
        // if (LegacyMergeSort.userRequested)
        //     legacyMergeSort(a, c);
        // else
            TimSort.sort(a, 0, a.length, c, null, 0, 0);
    }
}
```
虽然分析选取的代码并不会执行，但是丝毫不影响研究 Comparator 的原理。无论源码怎么变化，只要 Comparator 接口不变，那么它的原理便会始终是这样的。抛弃复杂的，选取简单的，使源码阅读起来更为快捷。好了，简单的阅读完了，可以阅读一下复杂的 TimSort.sort 了。
