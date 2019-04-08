#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */
// 请求
const request_1 = __importDefault(require("request"));
// 解析 dom
const cheerio_1 = __importDefault(require("cheerio"));
// 中文编码
const iconv_lite_1 = __importDefault(require("iconv-lite"));
// http https 代理
const global_tunnel_ng_1 = __importDefault(require("global-tunnel-ng"));
// socks 代理 http
const httpAgent = require('socks5-http-client/lib/Agent');
// socks 代理 https
const httpsAgent = require('socks5-https-client/lib/Agent');
const url_1 = __importDefault(require("url"));
const querystring_1 = __importDefault(require("querystring"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("./config"));
const request = request_1.default.defaults({
    headers: { "User-Agent": config_1.default.userAgent },
});
function log(info) {
    if (process.env.debug_mode) {
        console.log(info);
    }
}
exports.log = log;
/**
 * 基础类
 * 编写其他类使用的公共方法
 */
class BaseSpider {
    constructor() {
        this.startTime = 0;
        this.categoryList = {};
        this.isSocksProxy = false;
        let [, , proxy_url] = process.argv;
        this.proxyUrl = proxy_url;
        this.startProxy(this.proxyUrl);
        this.generateDirectory(config_1.default.tableList);
        this.generateDirectory(config_1.default.result);
    }
    startProxy(proxy) {
        log(proxy);
        let errorText = `
        请输入正确的代理配置：\n
        示例如下：
        node dist/index.js http://127.0.0.1:1086
        node dist/index.js socks://127.0.0.1:1086
        node dist/index.js https://127.0.0.1:1086`;
        if (!proxy) {
            console.log('请配置代理！');
            console.log(errorText);
            process.exit();
            return;
        }
        let proxyConfig = url_1.default.parse(proxy);
        const { port, hostname, protocol } = proxyConfig;
        if (config_1.default.proxy.includes(protocol)) {
            if (proxyConfig.protocol === config_1.default.proxy[0]) {
                this.isSocksProxy = true;
            }
            else {
                global_tunnel_ng_1.default.initialize({
                    connect: 'both',
                    host: hostname,
                    port,
                    protocol
                });
            }
        }
        else {
            console.log('代理配置错误！');
            console.log(errorText);
            process.exit();
        }
    }
    /**
     * 计时开始
     */
    startTimeCount() {
        this.startTime = +new Date();
    }
    /**
     * 计时结束
     */
    endTimeCount() {
        let seconds = (+new Date() - this.startTime) / 1000;
        console.log("爬取总共耗时： " + seconds + " 秒");
    }
    /**
     * 数组去重
     * @param {Array} arr
     */
    filterRepeat(arr) {
        return [...new Set(arr)];
    }
    /**
     * 判断 js 任意类型是否为空
     * @param {Any} value
     */
    isEmpty(value) {
        return !value || !(Object.keys(value) || value).length;
    }
    /**
     * 更新 json 文件
     * @param {Object,Array} data 要更新的 json 数据
     * @param {String} filePath 文件路径
     */
    updateJsonFile(data, filePath, bool = false) {
        if (!filePath || this.isEmpty(data)) {
            return false;
        }
        let jsonData = "";
        if (bool) {
            jsonData = JSON.stringify(data, null, 2);
        }
        else {
            jsonData = JSON.stringify(data);
        }
        fs_1.default.writeFile(filePath, jsonData, err => {
            log(String(err));
        });
    }
    /**
     * 读取 json 文件
     * @param {String} filePath 文件路径
     */
    readJsonFile(filePath) {
        try {
            let data = fs_1.default.readFileSync(filePath);
            data = data ? JSON.parse(data) : null;
            return data;
        }
        catch (error) {
            log(error);
            return null;
        }
    }
    /**
     *生成目录
     * @param {String} dirPath 目录路径
     */
    generateDirectory(dirPath) {
        try {
            if (dirPath && !fs_1.default.existsSync(dirPath)) {
                fs_1.default.mkdirSync(dirPath);
            }
        }
        catch (err) {
            console.log(err);
        }
    }
    /**
     * 获取请求配置
     * @param {String} url 链接
     * @param {Boolean} useProxy 是否使用代理
     */
    getRequestOptions(url, useProxy = false) {
        if (!url || !url.startsWith("http")) {
            return null;
        }
        let options = {
            url
        };
        if (useProxy && this.isSocksProxy) {
            let proxyConfig = url_1.default.parse(this.proxyUrl);
            options.agentClass = url.startsWith("https") ? httpsAgent : httpAgent;
            options.agentOptions = {
                socksPort: proxyConfig.port,
                socksHost: proxyConfig.hostname
            };
        }
        return options;
    }
    /**
     * 下载图片和种子
     * @param {String} filePath // 文件路径
     * @param {String} torrents // 种子链接
     * @param {String} images // 图片链接
     */
    downloadResult(filePath, torrents = [], images = []) {
        try {
            // 有种子文件才下载
            if (this.isEmpty(torrents)) {
                return false;
            }
            for (let torrent of torrents) {
                this.downloadTorrent(filePath, torrent);
            }
            for (let i = 0; i < images.length; i++) {
                let item = images[i];
                let imgPath = filePath + "_" + (i + 1) + "" + path_1.default.extname(item);
                this.downloadFile(item, imgPath);
            }
        }
        catch (error) {
            log(error);
        }
    }
    /**
     * 去掉文件路径中的空白
     * @param {String} filePath
     */
    filterIllegalPath(filePath) {
        let result = filePath.replace(/[^\da-z\u4e00-\u9fa5]/gi, "");
        return result;
    }
    /**
     * 下载文件
     * @param {String} url 请求链接
     * @param {String} filePath 文件路径
     */
    downloadFile(url, filePath) {
        // 防止一个请求出错，导致程序终止
        try {
            let options = this.getRequestOptions(url, true);
            if (!filePath || !options) {
                return;
            }
            request
                .get(options)
                .on("error", err => {
                if (err) {
                    console.log(err);
                }
                return;
            })
                .pipe(fs_1.default.createWriteStream(filePath));
        }
        catch (error) {
            log(error);
        }
    }
    /**
     * 下载种子链接
     * @param {String} filePath // 文件路径
     * @param {String} downloadUrl  // 下载种子地址
     */
    downloadTorrent(filePath, downloadUrl) {
        // 防止一个请求出错，导致程序终止
        try {
            // 解析出链接的 code 值
            let code = querystring_1.default.parse(downloadUrl.split("?").pop()).ref;
            // 种子网站国内可以访问，无须翻墙
            let options = this.getRequestOptions(config_1.default.torrent, false);
            if (!code || !filePath || !options) {
                return false;
            }
            options.formData = {
                code
            };
            // 发出 post 请求，然后接受文件即可
            request
                .post(options)
                .on("error", err => {
                if (err) {
                    console.log(err);
                }
                return;
            })
                .pipe(fs_1.default.createWriteStream(filePath + "_" + code + ".torrent"));
        }
        catch (error) {
            log(error);
            // log("下载种子失败！")
        }
    }
    /**
     * 请求页面
     * @param {String} requestUrl 请求页面
     */
    requestPage(requestUrl) {
        try {
            return new Promise(resolve => {
                let options = this.getRequestOptions(requestUrl, true);
                if (!requestUrl || !options) {
                    resolve(null);
                }
                options = Object.assign(options, {
                    // 去掉编码，否则解码会乱码
                    encoding: null
                });
                request.get(options, function (err, response, body) {
                    // 防止解析报错
                    try {
                        // 统一解决中文乱码的问题
                        let content = iconv_lite_1.default.decode(body, "gbk");
                        let $ = cheerio_1.default.load(content);
                        resolve($);
                    }
                    catch (error) {
                        log(error);
                        resolve(null);
                    }
                });
            });
        }
        catch (error) {
            log(error);
            //如果连续发出多个请求，即使某个请求失败，也不影响后面的其他请求
            Promise.resolve(null);
        }
    }
}
exports.BaseSpider = BaseSpider;
