# fbi-warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed)(C++) 启发的 **Node.js** 种子神器。

## 运行

- 装包:  `npm i` or `yarn` 
- 运行: `node dist/index.js [proxy_url]`


## 科学上网

**翻墙才可以爬取，否则爬取失败！**

**[proxy_url]** 支持的代理形式

1. http  `node dist/index.js http://127.0.0.1:1086`
2. https `node dist/index.js https://127.0.0.1:1086`
3. socks `node dist/index.js socks://127.0.0.1:1086`


## 目录结构

```
.
├── dist // js 源码
├── json // json 文件存放爬取链接，下次加快爬取
├── result // 种子目录
└── src // ts 源码
```


