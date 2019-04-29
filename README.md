# fbi-warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed) 启发，开发的 **Node.js** 种子神器。


## 运行

1. 装包:  `npm i` or `yarn` 
1. 运行: `node dist/index.js [proxy_url]`

## **[proxy_url]** 支持的代理形式

1. http  `node dist/index.js http://127.0.0.1:1086`
2. https `node dist/index.js https://127.0.0.1:1086`
3. socks `node dist/index.js socks://127.0.0.1:1086`
4. 可以直接访问种子网站，代理设置为空 `node dist/index.js`

## 科学上网

**翻墙才可以爬取，否则爬取失败！**

控制台输出 **代理测试通过!!!** ，表示代理成功。

## 代理软件

测试通过的代理软件，更多代理软件欢迎提 issue 或者 pr

1. [lantern](https://github.com/getlantern/lantern) 
1. [ShadowsocksX-NG](https://github.com/shadowsocks/ShadowsocksX-NG) 

## 目录结构

```
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

