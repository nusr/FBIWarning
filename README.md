# FBI Warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed)(C++) 的启发，开发的 **Node.js** 种子神器。

## 运行

- 装包:  `cnpm install` or `npm install` or `yarn` 
- 运行: `proxy_url=socks://127.0.0.1:1086 node ./dist/index.js`

## 科学上网

**翻墙才可以爬取，否则爬取失败！**

支持的代理形式

1. http  `http://127.0.0.1:1086`
2. https `https://127.0.0.1:1086`
3. socks `socks://127.0.0.1:1086`


## 目录结构

```
.
├── dist // js 源码
├── json // json 文件存放爬取链接，下次加快爬取
├── result // 种子目录
└── src // ts 源码
```


