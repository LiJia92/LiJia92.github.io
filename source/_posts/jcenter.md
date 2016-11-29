---
title: Android Studio发布项目到JCenter
date: 2016-09-12 16:40:48
tags:
 - android studio
---

在我的上一篇文章中，尝试将弧形seekbar抽成了一个三方库，这篇文章便以该库为例，将其上传至JCenter。

<!-- more -->

## 注册Binatry
到[Binatry官网](https://bintray.com)注册账号。
然后到``Your Profile``点击``Edit``，在下面会看到``API Key``，记录下这个Key备用。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/jcenter2.png)

## 配置gradle
我是使用的``gradle-bintray-plugin``插件来上传项目的，在项目的``build.gradle``下添加如下配置:
```
apply plugin: 'com.android.library'

apply plugin: 'com.github.dcendents.android-maven'
apply plugin: 'com.jfrog.bintray'
//提交到仓库中的版本号
version = "1.0.0"

android {
    compileSdkVersion 23
    buildToolsVersion "23.0.3"

    defaultConfig {
        minSdkVersion 16
        targetSdkVersion 23
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    compile fileTree(dir: 'libs', include: ['*.jar'])
    testCompile 'junit:junit:4.12'
    compile 'com.android.support:appcompat-v7:23.2.1'
}

def siteUrl = 'https://github.com/LiJia92/CustomArcSeekBar'         // 项目的主页
def gitUrl = 'https://github.com/LiJia92/CustomArcSeekBar'          // Git仓库的url
group = "com.android.lovesixgod.customarcseekbar"                   // Maven Group ID for the artifact，一般填你唯一的包名
install {
    repositories.mavenInstaller {
        // This generates POM.xml with proper parameters
        pom {
            project {
                packaging 'aar'
                // Add your description here
                name 'Custom arc seek bar' 	//项目描述
                url siteUrl
                // Set your license
                licenses {
                    license {
                        name 'The Apache Software License, Version 2.0'
                        url 'http://www.apache.org/licenses/LICENSE-2.0.txt'
                    }
                }
                developers {
                    developer {
                        id 'lijia92'		//填写的一些基本信息
                        name 'lastwarmth'
                        email '243244898@qq.com'
                    }
                }
                scm {
                    connection gitUrl
                    developerConnection gitUrl
                    url siteUrl
                }
            }
        }
    }
}
task sourcesJar(type: Jar) {
    from android.sourceSets.main.java.srcDirs
    classifier = 'sources'
}
task javadoc(type: Javadoc) {
    source = android.sourceSets.main.java.srcDirs
    classpath += project.files(android.getBootClasspath().join(File.pathSeparator))
}
task javadocJar(type: Jar, dependsOn: javadoc) {
    classifier = 'javadoc'
    from javadoc.destinationDir
}
artifacts {
    archives javadocJar
    archives sourcesJar
}
Properties properties = new Properties()
properties.load(project.rootProject.file('local.properties').newDataInputStream())
bintray {
    user = properties.getProperty("bintray.user")
    key = properties.getProperty("bintray.apikey")
    configurations = ['archives']
    pkg {
        repo = "maven"
        name = "arcseekbar"	        //发布到JCenter上的项目名字
        websiteUrl = siteUrl
        vcsUrl = gitUrl
        licenses = ["Apache-2.0"]
        publish = true
    }
}

// 解决GBK乱码
javadoc {
    options{
        encoding "UTF-8"
        charSet 'UTF-8'
        author true
        version true
        links "http://docs.oracle.com/javase/7/docs/api"
    }
}
```

## 配置name&key
在``local.propertis``里配置binatry的名称与api key：
```
bintray.user=username
bintray.apikey=key
```
user即是你注册的名称，key则是第一步中保存的值。

## 上传
首先Sync Gradle File，当build成功后，打开Terminal，执行指令：
```
gradlew install
```
build成功后在执行指令：
```
gradlew bintrayUpload
```
成功后便能在binatry上看到自己上传的项目了。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/jcenter3.png)

## 同步到JCenter
点开自己的项目，有一个``Add to JCenter``，点击后填写描述即可提交申请给binatry了。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/jcenter4.png)
最后便是等待审核了，审核通过后会收到如下的消息：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/jcenter5.png)
然后我们进入到项目详情页，会看到``Add to JCenter``按钮消失了，说明审核已经通过。
点到Gradle便能看到gradle依赖的代码：
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/jcenter6.png)
迫不及待的在AS中试了一下，真的可以用了，成就感十足，哈哈。

## 问题
1. 看[Hongyang大神的博客](http://blog.csdn.net/lmj623565791/article/details/51148825)，打算使用``bintray-release``插件来进行上传的，但是出现了GBK中文编码乱码的问题，除了将代码中的中文全部换成英文之外，没找到其他好的方法，便放弃了这个方法，采用的``gradle-bintray-plugin``插件可通过配置javadoc的编码来解决这个问题。
2. 包名非常不好看，以后得起个好点的包名。而且不能瞎用“com.android....”，这是google android团队的。
![](http://7xryow.com1.z0.glb.clouddn.com/2016/09/jcenter7.png)
3. 出现如下的错误：
```
Execution failed for task ':library:bintrayUpload'.
> Could not create package 'lijia92/maven/CustomArcSeekBar': HTTP/1.1 404 Not Found [message:Repo 'maven' was not found]
```
说是maven不存在，于是我在binatry下创建了一个名为``maven``的仓库，然后重新上传便成功了。（非常坑，找了半天的原因，看的好多博客都没说这个，可能是他们账号下面本身就已经存在maven仓库了）
