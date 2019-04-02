# FBI Warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed)(C++) 的启发，开发的 **Node.js** 种子神器。

## 运行

- `cnpm install` or `npm install` or `yarn` 
- `npm start`

## 科学上网

**翻墙才可以爬取，否则爬取失败！**

仅支持 **socks** 代理，控制台输出 **代理测试通过!!!** 表示代理可用。

支持的代理软件

- [lantern](https://github.com/getlantern/lantern)
- ShadowsocksX-NG

`./socks.json` 文件中配置代理，代理配置如下：

```json
{
  "port": 13838,
  "host": "127.0.0.1"
}
```

![lantern](./images/lantern.png)




