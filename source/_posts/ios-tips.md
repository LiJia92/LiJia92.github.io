---
title: iOS 学习之旅
date: 2016-12-16 10:23:53
tags:
 - 日常开发
---

接触iOS也有一阵子了，也参与到项目做了有些事情，主要是从改bug入手，边学边做，下面记录一下自己在学习中遇到一些点。

## Category
Objective-C提供了一种与众不同的方式——Category，可以动态的为已经存在的类添加新的行为。这样可以保证类的原始设计规模较小，功能增加时再逐步扩展。使用Category对类进行扩展时，不需要访问其源代码，也不需要创建子类。Category使用简单的方式，实现了类的相关方法的模块化，把不同的类方法分配到不同的分类文件中。
```
SomeClass.h
@interface SomeClass : NSObject{
}
-(void) print;
@end

#import "SomeClass.h"

@interface SomeClass (Hello)
-(void)hello;
@end

#import "SomeClass+Hello.h"
@implementationSomeClass (Hello)
-(void)hello{
    NSLog (@"name：%@ ", @"Jacky");
}
@end

#import "SomeClass+Hello.h"

SomeClass * sc =[[SomeClass alloc] init];
[sc hello]
```
这里还有一个约定成俗的习惯，将声明文件和实现文件名称统一采用“原类名+Category”的方式命名。

<!-- more -->

## Protocol
Protocol，简单来说就是一系列不属于任何类的方法列表，其中声明的方法可以被任何类实现。这种模式一般称为代理（delegation）模式。你通过Protocol定义各种行为，在不同的场景采用不同的实现方式。在iOS和OS X开发中，Apple采用了大量的代理模式来实现MVC中View和Controller的解耦。
```
@protocol ProcessDataDelegate <NSObject>
@required
- (void) processSuccessful: (BOOL)success;

@optional
- (id) submitOrder: (NSNumber *) orderid;
@end

@interface TestAppDelegate : NSObject<ProcessDataDelegate>;

@end
```
@required和@optional，表示如果要实现这个协议，那么processSuccessful方法是必须要实现的，submitOrder则是可选的 如果不注明，那么方法默认是@required的，必须实现。
用尖括号（<...>）括起来的ProcessDataDelegate就是创建的Protocol。如果要采用多个Protocol，可以在尖括号内引入多个Protocol名称，并用逗号隔开即可。例如<ProcessDataDelegate,xxxDelegate>。
Protocol本身是可以继承的。
```
@protocol A
     -(void)methodA;
@end
@protocol B <A>
     -(void)methodB;
@end
```

## OC中没有方法的重载
OC中没有方法的重载！OC中没有方法的重载！OC中没有方法的重载！重要的事情说三遍~
遇到个问题一直不能理解，原来就是因为OC没有方法的重载！在Java中，可以根据参数的个数、类型来重载方法，在OC中没有这一说。
```
-(return_type) instance_method1;                              // 无参数
-(return_type) instance_method2: (int) p1;                    // 1个参数
-(return_type) instance_method3: (int) p1 andPar: (int) p2;   // 2个参数
```
看到2个参数的例子，在参数前面会有``andPar``，这个结合``instance_method3``才构成一个方法。调用的时候：
```
[obj instance_method1];
[obj instance_method2:p1];
[obj instance_method3:p1 andPar:p2];
```

## 数组
1. NSArray：不可变数组，NSArray保存的对象可以是不同的对象。但只能保存对象，int ,char,double等基本数据类型不能直接保存，需要通过转换成对象才能加入数组。 [array count] : 数组的长度。 [array objectAtIndex 0]: 传入数组脚标的id 得到数据对象。 [arrayWithObjects; ...] :向数组对象初始化赋值。这里可以写任意对象的指针,结尾必须使用nil。
2. NSMutableArray：可变数组，[NSMutableArray arrayWithCapacity:6] :初始化可变数组对象的长度，如果后面代码继续添加数组超过长度6以后NSMutableArray的长度会自动扩充，6是自己可以设置的颗粒度。 [array addObject:...] : 向可变数组尾部添加数据对象。 [array addObjectsFromArray:..] :向可变数组尾部添加一个数组对象。

## block
block，带有自动变量的匿名函数，回调，用``^``表示。
```
int b = 0;
void (^blo)() = ^{
    NSLog(@"Input:b=%d",b);
};
b = 3;
blo();
/**
  *    Input:b=0
  */
```
虽然在调用blo之前改变了b的值，但是输出的还是Block编译时候b的值，所以截获瞬间自动变量就是：在Block中会保存变量的值，而不会随变量的值的改变而改变。
```
int b = 0;
void (^blo)() = ^{
    b = 3;
};
```
这段代码编译出错，编译器提示的大概就是不能在Block中改变变量的值。因为在Block中截获了变量的瞬间值以后就不能再改变变量的值，如果想要在Block中改变变量的值，那么只需要在变量声明的时候加上__Block修饰符，像这样：
```
__block int b = 0;
void (^blo)() = ^{
    b = 3;
};
```
然而这样的情况又是允许的：
```
NSMutableArray *array = [[NSMutableArray alloc]init];
void (^blo)() = ^{
    [array addObject:@"Obj"];
};
```
为什么呢，因为只是对截获的变量进行了操作，而没有进行赋值，所以对于截获变量，可以进行操作而不可以进行赋值。

## self 与 _
定义个属性``a``：
```
@interface Test:NSObject  
@property int a;  
-(void) changeAValue:(int) newValue;  
@end
```
直接用属性名访问：
```
-(void) changeAValue:(int) newValue  {  
    _a = newValue;  // 默认生成的属性成员变量前面会自动加上“_”前缀  
}
```
通过self.a的形式访问：
```
-(void) changeAValue:(int) newValue  {  
    self.a = newValue;  
}  
```
这两种访问方式有区别吗？答案是肯定的。
通过第一种方式访问，其实是类似于C++的访问方式，是直接访问的实例变量并赋值。而第二种方式，并不像其表面那么直观，它其实是通过调用编译器自动生成的对于a变量的赋值函数来实现的。即：
```
-(void) changeAValue:(int) newValue  {  
    self.a = newValue; // 此处实际是调用 [self setA:newValue];  
}
```
``类的属性仅在本类中可以访问，子类无法通过_a的形式访问。但是可以通过继承父类的存取方法访问。``

## resignFirstResponder
这个方法是取消第一响应者状态的。如果对textfield使用的话，那么调用这个方法，textfield的第一响应者状态就会取消，然后键盘就消失了。

## delegate模式
类似于Android中的listener。系统提供各种interface，然后调用interface中的方法，至于具体实现，可以由我们自己定义。
Android:
```
editText.addTextChangedListener(new TextWatcher() {
    @Override
    public void beforeTextChanged(CharSequence charSequence, int i, int i1, int i2) {

    }

    @Override
    public void onTextChanged(CharSequence charSequence, int i, int i1, int i2) {

    }

    @Override
    public void afterTextChanged(Editable editable) {

    }
});
```
iOS：
```
@interface YourClass ()<UITextFieldDelegate>

UITextField *_mobileTextField;
_mobileTextField = [[UITextField alloc]init];
_mobileTextField.delegate = self;
```
UITextFieldDelegate就类比于TextWatcher，它内容如下：
```
@protocol UITextFieldDelegate <NSObject>

@optional

- (BOOL)textFieldShouldBeginEditing:(UITextField *)textField;        // return NO to disallow editing.
- (void)textFieldDidBeginEditing:(UITextField *)textField;           // became first responder
- (BOOL)textFieldShouldEndEditing:(UITextField *)textField;          // return YES to allow editing to stop and to resign first responder status. NO to disallow the editing session to end
- (void)textFieldDidEndEditing:(UITextField *)textField;             // may be called if forced even if shouldEndEditing returns NO (e.g. view removed from window) or endEditing:YES called
- (void)textFieldDidEndEditing:(UITextField *)textField reason:(UITextFieldDidEndEditingReason)reason NS_AVAILABLE_IOS(10_0); // if implemented, called in place of textFieldDidEndEditing:

- (BOOL)textField:(UITextField *)textField shouldChangeCharactersInRange:(NSRange)range replacementString:(NSString *)string;   // return NO to not change text

- (BOOL)textFieldShouldClear:(UITextField *)textField;               // called when clear button pressed. return NO to ignore (no notifications)
- (BOOL)textFieldShouldReturn:(UITextField *)textField;              // called when 'return' key pressed. return NO to ignore.

@end
```
通过_mobileTextField.delegate = self就类似于添加了listener，然后实现相应的方法，就可以做自己的事情了。

## 权限
> This app has crashed because it attempted to access privacy-sensitive data without a usage description. The app's Info.plist must contain an NSPhotoLibraryUsageDescription key with a string value explaining to the user how the app uses this data.

意思就是没有配置权限，需要在 info.plist 文件添加一个 NSPhotoLibraryUsageDescription的 key，然后添加一个描述。
```
<key>NSPhotoLibraryUsageDescription</key>
<string>此 App 需要您的同意才能读取媒体资料库</string>

<key>NSCameraUsageDescription</key>    
<string>cameraDesciption</string>

<key>NSContactsUsageDescription</key>    
<string>contactsDesciption</string>

<key>NSMicrophoneUsageDescription</key>    
<string>microphoneDesciption</string>
```

## dispatch_async
线程相关的语法：
```
dispatch_async(queue, ^{
　　//block具体代码
}); //异步执行block，函数立即返回

dispatch_sync(queue, ^{
　　//block具体代码
}); //同步执行block，函数不返回
```
实际运用中，一般可以用dispatch这样来写，常见的网络请求数据多线程执行模型：
```
dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
　　//子线程中开始网络请求数据
　　//更新数据模型
　　dispatch_sync(dispatch_get_main_queue(), ^{
　　　　//在主线程中更新UI代码
　　});
});
```
dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);  //获得程序进程缺省产生的并发队列，可设定优先级来选择高、中、低三个优先级队列。
dispatch_get_main_queue();                                      //获得主线程的dispatch队列。

## UITextFiled
类似Android中的EditText。可以使用leftView、rightView来实现padding效果，以及编辑状态下添加删除按钮。
```
- (BOOL)textFieldShouldBeginEditing:(UITextField *)textField {
    _titleTextField.textAlignment = NSTextAlignmentLeft;
    _titleTextField.width = (self.width -170) / 2 + 170 - 12;
    UIView *leftEmpty = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 12, 32)];
    _titleTextField.leftView = leftEmpty;
    _titleTextField.leftViewMode = UITextFieldViewModeWhileEditing;

    UIButton *rightClean = [UIButton buttonWithType:UIButtonTypeCustom];
    [rightClean setFrame:CGRectMake(0, 0, 36 , 18)];
    [rightClean setImage:[UIImage imageNamed:@"ct_x"] forState:UIControlStateNormal];
    [rightClean setTitle:@" " forState:UIControlStateNormal];
    rightClean.titleLabel.font = [UIFont systemFontOfSize:15];
    [rightClean addTarget:self action:@selector(cleanText) forControlEvents:UIControlEventTouchUpInside];
    _titleTextField.rightView = rightClean;
    _titleTextField.rightViewMode = UITextFieldViewModeWhileEditing;
    return YES;
}
```
也可以直接使用layer来实现shader：
```
_titleTextField = [[UITextField alloc]initWithFrame:CGRectMake((self.width - 170) / 2, 0, 170, self.height)];
_titleTextField.borderStyle = UITextBorderStyleNone;
_titleTextField.returnKeyType = UIReturnKeyDone;
_titleTextField.backgroundColor = UIColorByHex(0x000000);
_titleTextField.layer.cornerRadius = 15;
_titleTextField.delegate = self;
_titleTextField.textColor = [UIColor whiteColor];
_titleTextField.textAlignment = NSTextAlignmentCenter;
_titleTextField.placeholder = @"给直播写个标题吧";
_titleTextField.font = [UIFont systemFontOfSize:16];
[_titleTextField setValue:UIColorByHex(0xCCCCCC) forKeyPath:@"_placeholderLabel.textColor"];
```

## 拼接字符串
```
NSDate *  senddate=[NSDate date];
NSDateFormatter  *dateformatter=[[NSDateFormatter alloc] init];
[dateformatter setDateFormat:@"YYYY.MM.dd HH:mm:ss"];
NSString *  morelocationString=[dateformatter stringFromDate:senddate];
_titleTextField.text = [NSString stringWithFormat:@"%@ %@", [UIDevice currentDevice].name, morelocationString];
```
也可以使用``NSMutableString``。
