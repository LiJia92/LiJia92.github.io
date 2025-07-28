---
title: 关于混淆的一个小纰漏
date: 2017-05-09 13:37:46
tags:
 - Android 进阶
---

混淆，相信只要是上线的的应用都会运用到。这里记一下项目中因为混淆而导致的一个较难发现的问题。

问题是这样的：有一个实体类``PrintTemplate``类，当我调用一个网络接口，会从服务器获取这个类的一个 list，然后我会用 Json 转成字符串存到本地，当要用的时候根据 key 去取对应的模板字符串，然后转成类实体进行使用。当然，混淆规则中没有保持这个类不被混淆。

假设现在的版本是 V1.0，测试打出来的 Release 包是没有问题的。然后版本更新到 V1.1，单独测试也是没问题的。但是，如果是从 V1.0 升到的 V1.1，那么在``取对应的模板字符串，然后转成类实体进行使用``这一步就会出错了，无法解析到正常的类。如果没有添加异常保护，则会直接崩溃了。

<!--more-->

示例代码：
```
public static PrintTemplate getPrinterTemplate(String bookId, int templateId) {
    PrintTemplate template = null;
    String str = getString(KEY_PRINTER_TEMPLATE + "_" + bookId + "_" + templateId);
    if (!TextUtils.isEmpty(str)) {
        try {
            // 这里没有添加异常捕获，导致直接崩溃
            template = JSON.parseObject(str, PrintTemplate.class);
        } catch (Exception e) {
            template = null;
        }
    }
    return template;
}

public static void savePrinterTemplate(List<PrintTemplate> templates, String bookId) {
    List<TemplateBean> templateTypes = new ArrayList<>();
    for (PrintTemplate template : templates) {
        // 逐一保存每个模板
        String str = JSONObject.toJSONString(template);
        putString(KEY_PRINTER_TEMPLATE + "_" + bookId + "_" + template.id, str);

        TemplateBean bean = new TemplateBean();
        bean.id = template.id;
        bean.name = template.typeName;
        if (!templateTypes.contains(bean)) {
            templateTypes.add(bean);
        }
    }
    // 保存所有的业务类型
    String typeValues = JSONArray.toJSONString(templateTypes);
    putString(KEY_PRINTER_TEMPLATE_TYPE, typeValues);
}
```

问题的根源很简单，就是类被混淆了嘛。举个栗子，类的属性为 id, name，存入的字符串可能是``"{"a":1,"b":"2"}"``，a 对应 id，b 对应 name，但是当版本升级后，这个类混淆后属性可能就变成了 c 和 d，那么当拿到那个混淆后的字符串进行重新解析的时候肯定就会有问题了。但是只有版本升级的时候才会出现这个问题，平时自己的测试恰好就把这个问题给规避了。这里记录一下，还好尽早改正了，对用户的影响不大。

这里顺便贴一下混淆的一些规则，开发中要保持警惕：
1. 如果使用了Gson之类的工具要使JavaBean类即实体类不被混淆。
2. 如果使用了自定义控件那么要保证它们不参与混淆。
3. 如果使用了枚举要保证枚举不被混淆。
4. 对第三方库中的类不进行混淆。
