# FBI Warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed)(C++) 的启发，开发的 **Node.js** 种子神器。

## 运行

- `cnpm install` or `npm install` or `yarn` 
- `npm run dev`

## 科学上网

**翻墙才可以爬取，否则爬取失败！**

仅支持 **socks** 代理，控制台输出 **代理测试通过!!!** 表示代理可用。

支持的代理软件

- [lantern](https://github.com/getlantern/lantern)

不支持的代理软件

- [firefly-proxy](https://github.com/yinghuocho/firefly-proxy)
- shadowsocks

`./socks.json` 文件中配置代理，代理配置如下：

```json
{
  "port": 13838,
  "host": "127.0.0.1"
}
```

![lantern](./images/lantern.png)

## 教程

1. [Node.js 安装](https://www.cnblogs.com/stevexu/p/9734249.html)
2. [Node.js 种子下载器](https://www.cnblogs.com/stevexu/p/9755337.html)



