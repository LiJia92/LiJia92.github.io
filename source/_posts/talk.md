---
title: Kotlin 结合 RxJava 使用杂谈
date: 2018-01-11 17:01:36
tags:
 - 杂谈
---
相信现在越来越多的开发者都在使用 RxJava 和 Kotlin，当二者相遇，写出来的代码堪称优雅！

> 我对 Kotlin 的并没有很特别的感觉，它就类似于 Swift 相比于 OC，大量的语法糖着实能使写代码的效率变高，但是是否能左右 Android 开发的现状还未可知。

我之前写过这样一段话，在使用 Kotlin 的这段时间里，我对它的看法慢慢改变了。尤其引入 RxJava 后，结合 Lambda 表达式，写起代码简直像要飞起来！

<!-- more -->

早些时候，我们查询数据，调用网络接口都是通过 Thread + Handler，或者 Android 自己封装的 AsyncTask，再或者 CursorLoader 等等，只要涉及要到异步，代码写起来都十分繁琐。首先你得实现 AsyncTask 或 CursorLoader 的接口，然后在子线程写数据读取的逻辑，然后通过 Handler 或者发送广播来通知界面显示。噢，现在想起来就觉得头大。然后 RxJava 的出现解放了我们，引入 RxJava 后，整个操作都变得十分简单，代码逻辑也十分清晰，相信用过的人都知道。然后结合 Kotlin 的语法糖，写起代码来简直不要太爽！
举个栗子：
1. M 层封装的数据操作：
```
fun queryAllSkuValue(): Observable<List<SKUValue>> {
    return Observable
            .create(ObservableOnSubscribe<List<SKUValue>> { e ->
                read { srvMgr ->
                    e.onNext(srvMgr.skuService.queryAllSKU().toList())
                }
                e.onComplete()
            })
            .compose(applySchedulers())
}
```
2. Presenter 调用接口，获取数据，处理数据：
```
fun querySkuBean() {
    compositeDisposable.add(
            skuProvider.queryAllSkuValue()
                    .map {
                        SkuBean.newSkuBean(it)
                    }
                    .subscribe({
                        view?.showProductSkuBean(it)
                    }, {
                        view?.showError(msgOrError(it, "数据查询失败"))
                    })
    )
}
```
可以看到，RxJava 结合 Kotlin 使我们的代码异常干净，清晰。RxJava 的 map、flatMap 等等的操作符，结合起 Lambda 表达式，真的太简洁了！当然，如果仅仅是 Lambda，你使用 Java 8 也是可以的。但是 Kotlin 还提供了很多其他的特性，之前也写文章说过。我之前小看了 Kotlin，它提供的很多操作符不仅可以减少代码量，也可以提高阅读性。比如 filter 操作符：
```
// 代码1
private void searchCuisineByCategory(String sortText) {
    List<Product> productList = new ArrayList<>();
    if (CONDITION_ALL.equalsIgnoreCase(sortText)) {
        productList.addAll(getProductList());
    } else {
        for (ProductBean productBean : mCuisineBeanList) {
            String categoryName = productBean.product.type;
            if (!TextUtils.isEmpty(categoryName) && categoryName.equals(sortText)) {
                productList.add(productBean.product);
            }
        }
    }
    mSoldOutAdapter.setProductList(productList);
}

// 代码2
fun searchByCategory(sortText: String) {
    val list = ArrayList<Product>()
    if (CONDITION_ALL.equals(sortText, ignoreCase = true)) {
        list.addAll(productList)
    } else {
        productList
                .filter {
                    val categoryName = it.type
                    sortText == categoryName
                }
                .mapTo(list) { it }
    }
    view?.showProductList(list)
}
```
代码有些许调整，但是业务逻辑都是筛选。对比代码，显然``代码2``的清晰多了。``代码1``通过循环遍历列表，然后查找对应条件的数据，你必须跟入到代码内部才知道这段代码的意义。而``代码2``，当你看到 filter 就能知道：哦，这是个筛选条件，用于过滤数据，就能一下明白代码的含义。可能刚开始使用时需要先了解一下，但是当熟悉后，就能一下子读懂代码的含义了。其实说白了，Kotlin 提供那么多操作符，就是来精简代码的，让你看到这个操作符就能一下明白代码的大致意思了。
当然这仅仅是个例子，就在昨天的开发场景中，我使用了大量的 RxJava 以及 Kotlin，写代码的心情十分愉悦！但是目前对于 RxJava 还不算特别掌握，此篇文章只是随便谈一谈，后续会再专门写写 RxJava。
