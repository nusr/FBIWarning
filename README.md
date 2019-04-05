# FBI Warning

受到 [hardseed](https://github.com/yangyangwithgnu/hardseed)(C++) 的启发，开发的 **Node.js** 种子神器。

## 运行

- 装包:    `cnpm install` or `npm install` or `yarn` 
- 编译 ts: `npm run build`
- 运行:    `npm run start`

## 科学上网

**翻墙才可以爬取，否则爬取失败！**

仅支持 **socks** 代理，控制台输出 **代理测试通过!!!** 表示代理可用。

支持的代理软件

- [lantern](https://github.com/getlantern/lantern)
- ShadowsocksX-NG

`./src/socks.ts` 文件中配置代理，代理配置如下：

```ts
export default {
  port: 13838, // port
  host: "127.0.0.1" // host
};
```

![lantern](./images/lantern.png)

## 目录结构

```
.
├── dist // js 源码
├── json // json 文件存放爬取链接，下次加快爬取
├── result // 种子目录
└── src // ts 源码
```


