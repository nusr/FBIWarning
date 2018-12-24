/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */
"use strict"
const JSON_DIRECTORY = "./json"
const RESULT_DIRECTORY = "./result"
module.exports = {
  result: RESULT_DIRECTORY, // 种子存放目录
  connectTasks: 8, // 最大并发量,最好不要更改，否则可能被封 IP
  baseUrl: "http://www.ac168.info/bt/", // 爬取页面,不想安装 Node.js 的，可以直接访问该网站
  categoryConfig: JSON_DIRECTORY + "/categoryConfig.json", // 分类列表
  tableList: JSON_DIRECTORY, // 缓存爬取的信息
  pageSize: 30, // 每页30条，这是网站规定的
  torrent: "http://www.jandown.com/fetch.php", // 种子下载地址
  // 种子下载网站 两个网站其实是同一个
  seedSite: [
    "http://www.jandown.com",
    "http://jandown.com",
    "http://www6.mimima.com",
    "http://mimima.com"
  ],
  //  请求头配置
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
}
