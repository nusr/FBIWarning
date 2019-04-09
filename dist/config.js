"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */
const JSON_DIRECTORY = "./json";
const RESULT_DIRECTORY = "./result";
exports.default = {
    result: RESULT_DIRECTORY,
    connectTasks: 8,
    baseUrl: "http://www.ac168.info/bt/",
    categoryConfig: JSON_DIRECTORY + "/categoryConfig.json",
    tableList: JSON_DIRECTORY,
    pageSize: 30,
    torrent: "http://www.jandown.com/fetch.php",
    // 种子下载网站 两个网站其实是同一个
    seedSite: [
        "http://www.jandown.com",
        "http://jandown.com",
        "http://www6.mimima.com",
        "http://mimima.com"
    ],
    proxy: ['socks:', 'http:', 'https:'],
    //  请求头配置
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36",
    errorText: `
        \n请输入正确的代理配置：
        示例如下：
        node dist/index.js http://127.0.0.1:1086
        node dist/index.js socks://127.0.0.1:1086
        node dist/index.js https://127.0.0.1:1086`
};
