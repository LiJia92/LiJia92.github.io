---
title: 初识 zsh
date: 2017-06-09 10:21:18
tags:
 -linux
---
昨天写关于 git 的文章的时候，需要来回切分支，而且 bash 也看不到当前是哪个分支，得不停``git branch``来看，显得十分麻烦。于是便不得不逼着自己一把，来熟悉一波``zsh``了。

同事有用``zsh``的，而且鼎力推荐，因为目前的工作和学习与命令行的交集不是很深，所以一直没有开始用。最近发现``bash``相比``zsh``确实是难用许多，便只能硬着头皮来学习了。之所以是硬着头皮，是因为自己对 Linux 系统不是很熟悉，虽然现在是在用，但是对于 Linux 的很多特性都不是很了解，命令行、Shell 脚本算是 Linux 一大特色。

``zsh``有着强大的功能，但是其配置也是异常复杂，于是 Github 上便有了这样的一个库：[oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh)，``oh-my-zsh``是为了简化zsh的配置而提供的一个配置模板，可以更好的管理zsh的各项配置。可以看到它有 55k 的 star，可见其火爆程度。现在才来接触，显得挺惭愧的。

关于``oh-my-zsh``的安装直接照着 github 中的``README``一步一步来就好了。就提醒一点，安装完之后需要注销掉用户，重启也可以，然后再重新登录，才可以看到``zsh``。

<!-- more -->

关于``zsh``的优势，网上众说纷纭，但是我目前用的不多，体会得不深。现在就我体会到的来说几点。

## git支持
很直接的一个体现就是进入到有 git 版本控制的目录，会显示出当前所在的分支。

![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/09%E9%80%89%E5%8C%BA_006.png)

再也不同``git branch``来看当前是什么分支了。
另外，``oh-my-zsh``也配置了很多 git 命令别名，方便使用。比如``gst``代表``git status``，``gco``代表``git checkout``，还有许许多多的配置，可以参考[Plugin:git](https://github.com/robbyrussell/oh-my-zsh/wiki/Plugin:git)。

## Tab自动补全
比如我想进入到 blog 目录，我敲``cd b``然后按``Tab``，``zsh``变回把所有 b 开头的目录列出来，然后再按``Tab``，它会帮你选择目录，当选到自己想要的目录时，按回车就可以进入了，是不是非常方便！！！
![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/09GIF.gif)

## 大小写忽略
大小写切换是很常见的，在上个例子中，即使我敲成``cd B``也能找到``blog``目录。
![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/09GIF1.gif)

目前体验的到的可能就这３个我很欣赏的特性了。当然也是才刚刚开始使用，后面有别的再行补充。这里先贴一下网友的配置，后面可能用得到：
```
# ZSH的环境变量
export ZSH=/Users/dawang/.oh-my-zsh
# 主题设置
# 主题列表在 ~/.oh-my-zsh/themes/
# 如果设置为 "random", 每次开启都会是不同的主题
ZSH_THEME="agnoster"
# 如果想要大小写敏感，可以取消注释下面的一行
# CASE_SENSITIVE="true"
# 如果想要连接符不敏感，可以取消注释下面的一行。_ 和 - 将可以互换
# HYPHEN_INSENSITIVE="true"
# 如果不想要自动更新，可以取消注释下面的一行
# DISABLE_AUTO_UPDATE="true"
# 自动更新的时间间隔，单位是天，这里设置 30 天更新一次
export UPDATE_ZSH_DAYS=30
# 如果不想要 ls 命令输出带颜色，可以取消注释下面的一行
# DISABLE_LS_COLORS="true"
# 是否禁止更改终端标题,不要禁止,不然所有终端tab只显示zsh了,而不随着目录的改变而改变显示
# DISABLE_AUTO_TITLE="true"
# 自动纠正命令,不启用,不怎么好用
# ENABLE_CORRECTION="true"
# 按tab键补全命令的时候,如果没什么可补全的就会出现三个红点,更人性化显示，这里我们启用
COMPLETION_WAITING_DOTS="true"
# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# 不要在意这些细节，不需要改动
# DISABLE_UNTRACKED_FILES_DIRTY="true"
# 历史命令日期显示格式
# 有三种方式: "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"，我比较习惯最后那种
HIST_STAMPS="yyyy-mm-dd"
# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder
# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# 插件设置，如果添加太多启动速度会比较慢
plugins=(git autojump)
[[ -s ~/.autojump/etc/profile.d/autojump.zsh ]] && . ~/.autojump/etc/profile.d/autojump.zsh
# 剩下部分比较不常改动
# User configuration
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/Library/TeX/texbin"
# export MANPATH="/usr/local/man:$MANPATH"
source $ZSH/oh-my-zsh.sh
# You may need to manually set your language environment
# export LANG=en_US.UTF-8
# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi
# Compilation flags
# export ARCHFLAGS="-arch x86_64"
# ssh
# export SSH_KEY_PATH="~/.ssh/dsa_id"
# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
```

## 题外话
``Ubuntu``用了也有段时间了，但是感觉还是像用``Windows``一样在用``Ubuntu``，很多东西还是依赖图形化界面。但是作为一个开发人员，``Shell脚本``更值得去拥抱。所以决心后面多用多学，真正拥抱``Linux``。

最后安利一波 Ubuntu 下录制 Gif 的方案：
**安装 Wine，下载 GifCam.exe，然后直接运行 GifCam.exe。**

![](http://7xryow.com1.z0.glb.clouddn.com/2017/06/09%E9%80%89%E5%8C%BA_007.png)
