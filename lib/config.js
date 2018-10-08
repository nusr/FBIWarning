/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2019, Steve Xu
 * @license MIT
 * @preserve
 */
"use strict"
module.exports = {
  socks: {
    socksPort: 13838, // 代理端口
    socksHost: "127.0.0.1" // 代理 Host
  },
  defaultPage: 8, // 默认每个分类最多爬取多少页
  connectTasks: 8 ,// 最大并发量,最好不要更改，否则可能被封 IP
  maxDetailLinks: 200, // 爬取详情页的最大数量，否则可能爆栈 
  baseUrl: "http://www.ac168.info/bt/", // 爬取页面
  categoryConfig: "./json/categoryConfig.json", // 分类列表
  tableList: "./json", // 分类具体列表
  result: "./result", // 种子存放目录
  log: "./json/log.txt", // 请求页面的 log
  pageSize: 30, // 每页30条，这是网站规定的
  alwaysYes: 'yes', // 不用输入任何东西
  torrent: "http://www.jandown.com/fetch.php", // 种子下载地址
  // 两个网站其实是同一个
  seedSite: [
    "http://www.jandown.com",
    "http://jandown.com",
    "http://www6.mimima.com",
    "http://mimima.com"
  ],
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
}
