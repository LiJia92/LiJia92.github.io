---
title: React Native For Android初探
date: 2016-01-15 17:20:02
tags:
 - hybrid开发
---

## 介绍
Facebook 在 [React.js Conf 2015](http://conf.reactjs.com/) 大会上推出了基于 JavaScript 的开源框架 [React Native](https://facebook.github.io/react-native/)。React Native 结合了 Web 应用和 Native 应用的优势，可以使用 JavaScript 来开发 iOS 和 Android 原生应用。在 JavaScript 中用 React 抽象操作系统原生的 UI 组件，代替 DOM 元素来渲染等。

>React Native enables you to build world-class application experiences on native platforms using a consistent developer experience based on JavaScript and React. The focus of React Native is on developer efficiency across all the platforms you care about — learn once, write anywhere. Facebook uses React Native in multiple production apps and will continue investing in React Native.

React Native 使你能够使用基于 JavaScript 和 React 一致的开发体验在本地平台上构建世界一流的应用程序体验。React Native 把重点放在所有开发人员关心的平台的开发效率上——开发者只需学习一种语言就能轻易为任何平台高效地编写代码。Facebook 在多个应用程序产品中使用了 React Native，并将继续为 React Native 投资。

对于不太了解React Native是什么以及Facebook为什么要创建React Native，可以先看看[这篇博客](https://code.facebook.com/posts/1014532261909640/react-native-bringing-modern-web-techniques-to-mobile/)。

Facebook 于 2015 年 9 月 15 日发布了 React Native for Android， 把 Web 和原生平台的 JavaScript 开发技术扩展到了 Google 的流行移动平台--Android。

最近项目技术负责人说可能以后我们也会使用这套框架进行App开发，所以便预先学习一下，顺便做下笔记，分享给大家。

<!--more-->

## 实践
### 安装Node.js
react native依赖Node.js，第一步便是下载Node.js。去官网下载，对应电脑系统版本。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native1.png)
我是Win 10，下载的64位。下载完成后，直接安装。

可以随意创建一个一个test.js，来测试Node.js是否安装成功。
```
var http = require("http");

http.createServer(function(req, res) {
  res.writeHead( 200 , {"Content-Type":"text/html"});
  res.write("<h1>Node.js</h1>");
  res.write("<p>Hello World</p>");
  res.end("");
}).listen(8080);
console.log("HTTP server is listening at port 8080.");
```
然后进入到响应的目录，执行cmd，键入命令：``node test.js``，然后浏览器打开"localhost:8080"，显示如下则是安装成功。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native2.png)

### 安装native环境
使用npm指令安装``react-native-cli``。打开命令行，执行指令：
```
npm install -g react-native-cli
```
``react-native-cli``是用来开发React Native的命令行工具。你需要使用npm来安装它。上面这行代码将会帮助你在terminal中安装react-native命令。这行cmd命令只需要执行一次，后面便可持续使用。

下面便可以开始创建我们的React Native项目了。

### 创建项目
创建好自己的文件夹之后，cmd命令进入文件夹，执行命令：
```
react-native init HelloWorld
```
HelloWorld便是项目名，可自己随意取。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native3.png)
执行完毕之后便会生成HelloWorld文件夹。目录结构是这样的：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native4.png)
可以看到生成的项目既包含IOS，也包含Android。因为我是Android开发，所以就暂时不管IOS了。

### 运行项目
在命令行执行完毕之后，我们会看到To run your app on Android的提示。进入到HelloWorld文件夹，执行命令：
```
react-native run-android
```
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native5.png)
图上所示便是在进行编译，准备安装了。
编译成功后，安装运行，界面如下：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native6.png)
提示不能下载JS bundle。这里我们注意一下编译时的黄色提示：``Starting the packager in a new window is not supported on Windows yet.Please start it manually using 'react-native start'.``就是说不支持在Windows上自动开启packager，需要我们自己先启动。

照着提示来，执行命令：
```
react-native start
```
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native7.png)
可以看到React packager ready.

OK，再来运行我们的程序。
此时界面变显示正常了：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native8.png)
同时React packager会打印一些信息：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native9.png)
很多东西都还不懂，暂时就先不管了，后面再慢慢了解，至少现在看起来没出什么错。

## js代码初探
下面便来研究一下显示到界面上的内容到底是怎么来的。

看到HelloWolrd文件夹下有index.android.js文件，编辑器打开，看到的代码是这样的：
```
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
import React, {
  AppRegistry,
  Component,
  StyleSheet,
  Text,
  View
} from 'react-native';

class HelloWorld extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native!
        </Text>
        <Text style={styles.instructions}>
          To get started, edit index.android.js
        </Text>
        <Text style={styles.instructions}>
          Shake or press menu button for dev menu
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('HelloWorld', () => HelloWorld);
```
此时，对着代码与界面，我们便可以大胆的猜测界面上显示的文字就是HelloWorld class中对应的3个Text标签了。下面尝试一下：

HelloWorld class代码改成如下：
```
class HelloWorld extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Hello World!
        </Text>
      </View>
    );
  }
}
```
我们把之前3个Text标签去掉，写一个显示Hello World的Text标签。那么改好之后如何看到效果呢？？？请注意，这便是React Native框架非常厉害的地方，你不需要重新编译安装apk，更新包等操作，直接虚拟机点出Menu，点击Roload JS即可实现更新：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native10.png)
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native11.png)
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native12.png)
可以看到，界面确实是变成了我们预想的样子。

下面我从官网复制了一份index.android.js代码：
```
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var React = require('react-native');
var {
  AppRegistry,
  Image,
  ListView,
  StyleSheet,
  Text,
  View,
} = React;

var API_KEY = '7waqfqbprs7pajbz28mqf6vz';
var API_URL = 'http://api.rottentomatoes.com/api/public/v1.0/lists/movies/in_theaters.json';
var PAGE_SIZE = 25;
var PARAMS = '?apikey=' + API_KEY + '&page_limit=' + PAGE_SIZE;
var REQUEST_URL = API_URL + PARAMS;

var AwesomeProject = React.createClass({
  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
      }),
      loaded: false,
    };
  },

  componentDidMount: function() {
    this.fetchData();
  },

  fetchData: function() {
    fetch(REQUEST_URL)
      .then((response) => response.json())
      .then((responseData) => {
        this.setState({
          dataSource: this.state.dataSource.cloneWithRows(responseData.movies),
          loaded: true,
        });
      })
      .done();
  },

  render: function() {
    if (!this.state.loaded) {
      return this.renderLoadingView();
    }

    return (
      <ListView
        dataSource={this.state.dataSource}
        renderRow={this.renderMovie}
        style={styles.listView}
      />
    );
  },

  renderLoadingView: function() {
    return (
      <View style={styles.container}>
        <Text>
          Loading movies...
        </Text>
      </View>
    );
  },

  renderMovie: function(movie) {
    return (
      <View style={styles.container}>
        <Image
          source={{uri: movie.posters.thumbnail}}
          style={styles.thumbnail}
        />
        <View style={styles.rightContainer}>
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.year}>{movie.year}</Text>
        </View>
      </View>
    );
  },
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  rightContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  year: {
    textAlign: 'center',
  },
  thumbnail: {
    width: 53,
    height: 81,
  },
  listView: {
    paddingTop: 20,
    backgroundColor: '#F5FCFF',
  },
});

AppRegistry.registerComponent('AwesomeProject', () => AwesomeProject);
```
然后Reload JS，界面如下：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native13.png)
呀，出错了。我们看到是在registerComponent的时候出错了。想起来我们的项目名称是HelloWorld，将最后一句代码改掉。
```
AppRegistry.registerComponent('HelloWorld', () => AwesomeProject);
```
Reload JS。
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native14.png)
加载完毕后的显示界面：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native15.png)
但是将代码改成：
```
AppRegistry.registerComponent('HelloWorld', () => HelloWorld);
```
执行又出错了：
![这里写图片描述](http://7xryow.com1.z0.glb.clouddn.com/2016/01/react-native16.png)
看来东西不能乱改呀，至于是什么原因，就放在以后慢慢去发现去解决了。另外这种JS代码的写法也是需要在实践中慢慢积累，学习，才能逐步掌握。

今天就到这里了，代码都是自动生成的，便不上传了。Have a nice weekend~
