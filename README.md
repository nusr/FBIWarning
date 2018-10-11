# FBI Warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed)(C++) 的启发，开发的 Node.js 种子神器。

## 运行

- `npm install` or `cnpm install` or `yarn` // 安装依赖包
- `npm run dev` // 运行

## 依赖包

- `cheerio` // 解析 DOM
- `iconv-lite` // 解决中文乱码的问题
- `request` // http 请求
- `socks5-http-client` // socks 代理

## 科学上网

翻墙才可以爬取，否则爬取失败！

目前只支持 socks 代理，http(s) 代理方式不支持！

我使用的是 [lantern](https://github.com/getlantern/lantern)。更多翻墙方式，[ssr](https://github.com/shadowsocksr-backup/shadowsocks-rss) 或者 [科学上网传送门](https://github.com/search?o=desc&q=%E7%A7%91%E5%AD%A6%E4%B8%8A%E7%BD%91&s=stars&type=Repositories)

项目会自动测试代理是否可用的。

![lantern](./images/lantern.png)

代理配置如下：

```js
module.exports = {
  socks: {
    socksPort: 13838, // socks 代理端口
    socksHost: "127.0.0.1" // socks 代理 Host
  }
}
```

## 教程

1. [Node.js 安装](https://www.cnblogs.com/stevexu/p/9734249.html)
2. [Node.js 种子下载器](https://www.cnblogs.com/stevexu/p/9755337.html)

## 爬取策略

1. 爬取所有列表页面的链接后，再去爬取所有详情页面，下载种子文件。
1. 爬取一部分列表页面，就去爬取详情页面，下载种子文件。然后再去爬取列表页面，爬取详情页面，循环进行。
1. 因为是国外网站，网络可能随时断开，所以采用第二种策略比较好。同时，能很快得到种子文件。

## changelog

1. **[2018-10-12,v0.3.0]** 该爬取策略，加快种子下载速度
2. **[2018-10-04,v0.2.0]** 使用 ES6 Class 改写整个代码
3. **[2018-10-01,v0.1.0]** 完成分类链接获取、列表页链接获取以及下载种子的功能
  
## 下载

本应用最终只能得到种子文件(Torrent 文件)。请使用迅雷解析种子文件，下载视频，下载视频无需翻墙！！！

## Node.js

- Node.js v8.12.0，尽量安装最新稳定版本，否则可能运行报错。
- 支持 Windows, Linux, Mac

## LICENSE

[MIT](./LICENSE)

**小撸怡情，大撸伤身！**
