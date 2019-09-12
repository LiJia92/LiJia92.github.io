---
title: Hexo-Tips
date: 2016-03-17 12:23:14
tags:
 - blog
---

本文主要讲述一下使用Hexo搭建博客的一些Tips。
## hexo基本指令
1. hexo clean 清除
2. hexo new page "menu name" 新建菜单
3. hexo g == hexo generate 生成
4. hexo d == hexo deploy 部署
5. hexo s == hexo server 启动本地
6. hexo n == hexo new 新建

## 首页文章显示
在md文件中添加``<!--more-->``，那么首页就只会显示这个标签之上的内容了，并显示一个``阅读全文``的按钮。

## 部署到Github保证README.md不被渲染
1. 在Hexo目录下的source根目录下创建README.md文件,并编辑保存。
2. 编辑Hexo目录的_config.yml文件中的“skip_render”参数。
```
skip_render: README.md
```
3. 部署到Github，然后看仓库是否有README.md。

<!--more-->

## 博客基本配置
打开hexo目录下的``_config.yml``文件。
```
# Hexo Configuration
## Docs: https://hexo.io/docs/configuration.html
## Source: https://github.com/hexojs/hexo/

# Site
title: 听雪楼 #站点名，站点左上角
subtitle: 那是一座悲欢离合聚集的楼。 #副标题，站点左上角
description: #对站点的描述
author: 最后的温存 #作者
language: zh-Hans #语言
timezone: #时区

# URL
## If your site is put in a subdirectory, set url as 'http://yoursite.com/child' and root as '/child/'
url: http://lijia92.github.io/  #站点Url
root: /
permalink: :year/:month/:day/:title/
permalink_defaults:

# Directory
source_dir: source
public_dir: public
tag_dir: tags
archive_dir: archives
category_dir: categories
code_dir: downloads/code
i18n_dir: :lang
skip_render:

# Writing
new_post_name: :title.md # File name of new posts
default_layout: post
titlecase: false # Transform title into titlecase
external_link: true # Open external links in new tab
filename_case: 0
render_drafts: false
post_asset_folder: false
relative_link: false
future: true
highlight:
  enable: true
  line_number: true
  auto_detect: false
  tab_replace:

# Category & Tag
default_category: uncategorized
category_map:
tag_map:

# Date / Time format
## Hexo uses Moment.js to parse and display date
## You can customize the date format as defined in
## http://momentjs.com/docs/#/displaying/format/
date_format: YYYY-MM-DD
time_format: HH:mm:ss

# Pagination
## Set per_page to 0 to disable pagination
per_page: 10
pagination_dir: page

# Extensions
## Plugins: https://hexo.io/plugins/
## Themes: https://hexo.io/themes/
theme: hexo-theme-next #主题插件

# Deployment
## Docs: https://hexo.io/docs/deployment.html
deploy: #部署相关信息
  type: git
  repository: https://github.com/LiJia92/LiJia92.github.io.git
  branch: master
```
## 分类与标签
1.若已存在分类或标签，则直接修改。
打开``hexo/source/tags/index.md``。修改为如下。
```
title: tags
date: 2016-03-16 15:33:44
type: "tags"
```
时间可随意修改，必须设置type字段为"tags"。
分类也如此：
```
title: categories
date: 2016-03-16 15:33:56
type: "categories"
```
2.若不存在，则直接新建，修改为1中所示即可。
```
$ hexo new page "tags"
$ hexo new page "categories"
```
index.md中不需要再额外写什么东西，它会根据你日志的分类、标签自动匹配。
```
title: Windows使用Hexo + Github Pages搭建自己的博客
date: 2016-03-17 11:30:45
tags:
 - blog
 - hexo
categories: hexo
```

## 主题
hexo有许多主题可以选择，可以参考[知乎回答](https://www.zhihu.com/question/24422335)选择自己喜欢的主题。
我这里选择的是next主题。
### 下载主题
使用Git Bash进入到hexo目录。输入指令下载主题：
```
$ git clone https://github.com/iissnan/hexo-theme-next themes/next
```
### 使用主题
回到上面的_config.yml配置文件中，找到theme字段，修改成next主题：
```
# Extensions
## Plugins: https://hexo.io/plugins/
## Themes: https://hexo.io/themes/
theme: hexo-theme-next
```
## Next主题相关
### 语言
``hexo/_config.yml``的配置中，language字段若要使用中文，需使用``zh-Hans``。
### 菜单
``hexo/themes/hexo-theme-next/_config.yml``的配置中。
``menu``是设置菜单，``menu_icons``是设置菜单对应的图标。这里对应的key都必须是一样的，大小写也有区分。
```
# ---------------------------------------------------------------
# Menu Settings
# ---------------------------------------------------------------

# When running hexo in a subdirectory (e.g. domain.tld/blog)
# Remove leading slashes ( "/archives" -> "archives" )
menu:
  home: /
  categories: /categories
  archives: /archives
  tags: /tags
  # about: /about
  commonweal: /404.html


# Enable/Disable menu icons.
# Icon Mapping:
#   Map a menu item to a specific FontAwesome icon name.
#   Key is the name of menu item and value is the name of FontAwsome icon.
#   When an question mask icon presenting up means that the item has no mapping icon.
menu_icons:
  enable: true
  # Icon Mapping.
  home: home
  about: user
  categories: th
  tags: tags
  archives: archive
  commonweal: heartbeat
```
### 设置个人信息
``hexo/themes/hexo-theme-next/_config.yml``的配置中。
将图像avatar.png放在hexo/themes/hexo-theme-next/source/images目录下。
``avatar``-->个人头像，``author``-->昵称，``description``-->描述
```
avatar: /images/avatar.png

author: lastwarmth

description: 如果要飞得高，就该把地平线忘掉
```
### 社交信息
``hexo/themes/hexo-theme-next/_config.yml``的配置中。
设置社交信息与icon，与菜单一样，key值需要完全对应，区分大小写。
```
# Social links
social:
  GitHub: https://github.com/LiJia92
  Weibo: http://weibo.com/2950244271

# Social Icons
social_icons:
  enable: true
  # Icon Mappings
  GitHub: github
  Twitter: twitter
  Weibo: weibo
```
### Schemes
``hexo/themes/hexo-theme-next/_config.yml``的配置中。
Next主题有三种Scheme，可随意切换。
```
#scheme: Muse
#scheme: Mist
scheme: Pisces
```
### 网站图标
与设置个人图像类似。
```
# Place your favicon.ico to /source directory.
favicon: /images/avatar.png
```
### 集成多说
``hexo/themes/hexo-theme-next/_config.yml``的配置中。
设置``duoshuo_shortname``字段。
```
# Duoshuo ShortName
duoshuo_shortname: lastwarmth
```
这个ShortName怎么来？
进入[多说](http://duoshuo.com/create-site/)
![这里写图片描述](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/03/hexo-tipsduoshuo-create-site.png)
红色方框填写的即是ShortName

### 代码高亮
``hexo/_config.yml``的配置中。
修改``auto_detect``字段为``true``
```
highlight:
  enable: true
  line_number: true
  auto_detect: true
  tab_replace:
```
``hexo/themes/hexo-theme-next/_config.yml``的配置中。
修改``highlight_theme: normal``字段。NexT使用``Tomorrow Theme``作为代码高亮，共有5款主题供你选择，可选的值有 normal，night， night blue， night bright， night eighties。
```
# Code Highlight theme
# Available value:
#    normal | night | night eighties | night blue | night bright
# https://github.com/chriskempson/tomorrow-theme
highlight_theme: normal
```
### 问题
> 本地预览没问题，deploy后主页显示大面积空白

[点此](https://github.com/iissnan/hexo-theme-next/issues/1214)

### 更多
更多请查看[ Next ](http://theme-next.iissnan.com/getting-started.html#third-party-services)官网
