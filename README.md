# fbi-warning

[![Build Status](https://travis-ci.org/nusr/FBIWarning.svg?branch=master)](https://travis-ci.org/nusr/FBIWarning)

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed) 启发，开发的 **Node.js** 种子神器。

## 运行

1. 装包: `npm i` or `yarn`
1. 运行: `node dist/index.js proxy_url`

## **proxy_url** 支持的代理形式

| 支持协议       | 示例                                        |
| -------------- | ------------------------------------------- |
| http           | `node dist/index.js http://127.0.0.1:1086`  |
| https          | `node dist/index.js https://127.0.0.1:1086` |
| socks          | `node dist/index.js socks://127.0.0.1:1086` |
| 可直接访问爱城 | `node dist/index.js`                        |

## 科学上网

**翻墙才可以爬取，否则爬取失败！**

控制台输出 **代理测试通过!!!** ，表示代理成功。

## 说明

**最新帖子下的种子文件为空。**

解决方法是指定下载的起始页面，例如指定起始下载页面为 20 :

```bash
START_PAGE=20 node ./dist/index.js socks://127.0.0.1:1086
```

## 代理软件

测试通过的代理软件，更多代理软件欢迎提 issue 或者 pull request

1. [lantern](https://github.com/getlantern/lantern)
2. [ShadowsocksX-NG](https://github.com/shadowsocks/ShadowsocksX-NG)

## 目录结构

```bash
.
├── dist // js 源码
├── json // json 文件存放爬取链接，下次加快爬取
├── result // 种子目录
└── src // ts 源码
```

## TODO

多个代理同时爬取，不知道该怎么做。

暂时的解决方法是开启多个命令行，使用不同的代理爬取种子。

**小撸怡情，大撸伤身！**
