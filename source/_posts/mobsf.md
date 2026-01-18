---
title: Windows 搭建 MobSF 平台
date: 2026-01-17 15:00:39
tags:
 - 开发工具
---

近期收到一个问题单，需要排查 MobSF 扫描结果中出现的字段级别问题：

> **操作步骤**：使用 MobSF 扫描 APK 文件  
> **实际结果**：扫描结果中出现非 Info 级别字段  
> **预期结果**：扫描结果中均为 Info 级别；若无法修改，需备注库名称及原因

此前对 MobSF 了解有限，为解决这个问题，需先熟悉其使用方法。本文记录在 Windows 平台搭建 MobSF 平台的过程。

<!-- more -->

[MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF)（Mobile Security Framework）是一个开源的移动安全平台，可对 Android 和 iOS 应用进行静态分析。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/5.png)

使用 [Docker](https://www.docker.com/products/docker-desktop/) 可以快速部署 MobSF。首先下载适用于 Windows 平台的 Docker Desktop。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/3.png)

下载完成后进行安装，安装过程中会自动安装 WSL 2，整个过程耗时较长，要耐心等待。安装完成后打开 Docker Desktop：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/6.png)

启动后需进行一项配置：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/7.png)

配置完成后，依次执行以下命令：

```bash
docker pull opensecurity/mobile-security-framework-mobsf:latest
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# 默认账号密码：mobsf/mobsf
```

执行成功后，通过浏览器访问 `localhost:8000` 即可看到 MobSF 的登录界面。默认账号密码为 `mobsf/mobsf`：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/8.png)

登录后的主界面如下：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/2.png)

上传待扫描文件（APK 或 .so 文件）即可开始扫描：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2026/4.png)

平台搭建完成后，可以自行编译 .so 文件并进行验证。

然而，经过多次尝试后发现：无论如何通过 NDK 编译本地 .so 文件，扫描结果中的 FORTIFY 字段始终显示为 `false warning`，无法修改。

经过多次排查，得出初步结论：

> 可能与 Bionic 和 glibc 编译方式有关。目前尚未找到单纯通过 NDK 编译 .so 库以满足 FORTIFY 要求的方法；其他能够满足 FORTIFY 要求的 .so 文件，可能是链接了使用 glibc 编译的静态库。

还有待后续验证。