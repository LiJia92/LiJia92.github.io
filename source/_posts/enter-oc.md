---
title: Objective-C 基本语法
date: 2016-12-07 11:05:24
tags:
 - iOS
---

最近的一段时间都是在学习OC语法，然后看代码，改项目中的bug。OC基本语法是比较固定的，网上的文章都大同小异，这里摘录一下方便后面回顾。

## 基础
Objective-C扩展了ANSI C，是C的超集，也就是说：
 - 任何C源程序，不经修改，即可通过Objective-C编译器成功编译。
 - Objective-C源程序中可以直接使用任何C语言代码。
注意以下几点：
1. OC中头文件后缀为.h，实现文件为.m，类似于c++中的.h于.cpp。
2. 在OC语言中混合使用C或者C++代码，包含有C语言或者C++语言时，文件的后缀使用.mm。同时一般如果是纯粹的C++文件，源代码文件后缀为.cpp，头文件使用.hpp为后缀。
3. import和include的功能是一样的，都是将引入的文件原封不动拷贝到当前位置。import的优点：会自动防止重复拷贝，同时兼容C语言的引入。
4. “ ”优先在当前文件路径查找， < >优先在系统环境查找。

<!-- more -->

## 字符串
相比Java，OC的字符串需要在前面加上“@”符号，否则编译器会理解为c语言中的字符串，导致一些莫名错误。
```
NSString title = @"Hello";
if(title == @"hello") {}
```

## 函数调用
不带参数：
```
[obj method];
```
带1个参数：
```
[counter increase:1];
```
带多个参数：
```
- (void) setColorToRed: (float)red Green: (float)green Blue:(float)blue {...} //定义方法
[myObj setColorToRed: 1.0 Green: 0.8 Blue: 0.2]; //调用方法
```

## 类
### 接口和实现
Objective-C的类分为接口定义和实现两个部分。接口定义（Interface）放在头文件中，文件扩展名是.h，实现（implementation）放在实现文件中，文件扩展名是.m。

> 接口定义也可以写在.m文件中，但最好不要这么干。

需要注意的是，与Objective-C的interface概念最接近的是C和C++里的头文件，它与implementation是成双成对出现的，作用是声明类的成员变量和方法。它与Java的interface概念完全不同：
 - Objective-C里，interface有且只有一个实现，Java的interface可以有0-N个实现。
 - Objective-C里，interface可以定义成员属性，Java里不可以。

在Objective-C里，和Java的Interface概念相似的是``Protocol``。
定义：
```
@interface MyClass {
    int memberVar1;
    id  memberVar2;
}

-(return_type) instance_method1;
-(return_type) instance_method2: (int) p1;
-(return_type) instance_method3: (int) p1 andPar: (int) p2;
@end
```
实现：
```
@implementation MyClass {
    int memberVar3;
}

-(return_type) instance_method1 {
    ....
}
-(return_type) instance_method2: (int) p1 {
    ....
}
-(return_type) instance_method3: (int) p1 andPar: (int) p2 {
    ....
}
@end
```
接口和实现以@interface、@implementation开头，都以@end结束。“@”符号在Objective-C中是个很神奇的符号。

### 方法
写在.h头文件里的方法都是公开的，Objective-C里没有私有方法的概念。
1. 类方法：类似于Android的静态方法，是属于类的，不需要实例化对象就可以进行调用，用"+"来表示。
定义：
```
@interface MyClass
    +(void) sayHello;
@end


@implementation MyClass

+(void) sayHello {
    NSLog(@"Hello, World");
}
@end
```
使用：
```
[MyClass sayHello];
```

2. 实例方法：这就跟Android中的费静态方法类似，需要实例化对象才能进行调用，用"-"来表示。
定义：
```
@interface MyClass : NSObject
-(void) sayHello;
@end


@implementation MyClass

-(void) sayHello {
    NSLog(@"Hello, World");
}
@end
```
使用：
```
mycls = [MyClass new];
[mycls sayHello];
```

### 属性
可以使用``@property``来声明属性。
```
#import <Foundation/Foundation.h>

@interface Car : NSObject

@property(nonatomic,strong) NSString *carName;
@property(nonatomic,strong) NSString *carType;
- (NSString *)carInfo;

@end
```
它会自动生成getter、setter。当然你也可以复写getter、setter，添加一些额外的功能。
它也有一些关键字，具有特殊的作用。
1. 原子性：
  - atomic（默认）：atomic意为操作是原子的，意味着只有一个线程访问实例变量。atomic是线程安全的，至少在当前的存取器上是安全的。它是一个默认的特性，但是很少使用，因为比较影响效率，这跟ARM平台和内部锁机制有关。
  - nonatomic：nonatomic跟atomic刚好相反。表示非原子的，可以被多个线程访问。它的效率比atomic快。但不能保证在多线程环境下的安全性，在单线程和明确只有一个线程访问的情况下广泛使用。

2. 存取器控制：
  - readwrite（默认）：表示该属性同时拥有setter和getter。
  - readonly：readonly表示只有getter没有setter。  
有时候为了语意更明确可能需要自定义访问器的名字：
```
@property (nonatomic, setter = mySetter:,getter = myGetter ) NSString *name;
```
3. 内存管理：
  - assign（默认）：assign用于值类型，如int、float、double和NSInteger，CGFloat等表示单纯的复制。还包括不存在所有权关系的对象，比如常见的delegate。
  - retain：在setter方法中，需要对传入的对象进行引用计数加1的操作。简单来说，就是对传入的对象拥有所有权，只要对该对象拥有所有权，该对象就不会被释放。
  - strong：strong是在iOS引入ARC的时候引入的关键字，是retain的一个可选的替代。表示实例变量对传入的对象要有所有权关系，即强引用。strong跟retain的意思相同并产生相同的代码，但是语意上更好更能体现对象的关系。
  - weak：在setter方法中，需要对传入的对象不进行引用计数加1的操作。简单来说，就是对传入的对象没有所有权，当该对象引用计数为0时，即该对象被释放后，用weak声明的实例变量指向nil，即实例变量的值为0。
  - copy：与strong类似，但区别在于实例变量是对传入对象的副本拥有所有权，而非对象本身。
