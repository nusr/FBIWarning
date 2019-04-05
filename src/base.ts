/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */
// 请求
import request from "request";
// 解析 dom
import cheerio from "cheerio";
// 中文编码
import iconvLite from "iconv-lite";
// 代理
import * as socksHttp from "socks5-http-client";

import querystring from "querystring";
import path from "path";
import fs from "fs";
import SOCKS_CONFIG from "./socks";
import COMMON_CONFIG from "./config";

export interface CategoryItem {
    link: string;
    title: string;
    endPage: number;
}

interface RequestOptions {
    url: string;
    headers: object;
    agentClass?: any;
    agentOptions?: object;
    formData?: object;
}

export function log(info: string) {
    console.log(info);
}

/**
 * 基础类
 * 编写其他类使用的公共方法
 */
export class BaseSpider {
    startTime: number = 0;
    categoryList: object = {};

    constructor() {
        this.generateDirectory(COMMON_CONFIG.tableList);
        this.generateDirectory(COMMON_CONFIG.result);
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
    filterRepeat(arr: string[]): string[] {
        return [...new Set(arr)];
    }

    /**
     * 判断 js 任意类型是否为空
     * @param {Any} value
     */
    isEmpty(value: any): boolean {
        return !value || !(Object.keys(value) || value).length;
    }

    /**
     * 更新 json 文件
     * @param {Object,Array} data 要更新的 json 数据
     * @param {String} filePath 文件路径
     */
    updateJsonFile(data: object, filePath: string, bool: boolean = false) {
        if (!filePath || this.isEmpty(data)) {
            return false;
        }
        let jsonData = "";
        if (bool) {
            jsonData = JSON.stringify(data, null, 2);
        } else {
            jsonData = JSON.stringify(data);
        }
        fs.writeFile(filePath, jsonData, err => {
            log(String(err));
        });
    }

    /**
     * 读取 json 文件
     * @param {String} filePath 文件路径
     */
    readJsonFile(filePath: string) {
        try {
            let data: any = fs.readFileSync(filePath);
            data = data ? JSON.parse(data) : null;
            return data;
        } catch (error) {
            log(error);
            return null;
        }
    }

    /**
     *生成目录
     * @param {String} dirPath 目录路径
     */
    generateDirectory(dirPath: string) {
        try {
            if (dirPath && !fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 获取请求配置
     * @param {String} url 链接
     * @param {Boolean} useProxy 是否使用代理
     */
    getRequestOptions(url: string, useProxy: boolean = false) {
        if (!url || url.startsWith("https")) {
            return null;
        }
        let options: RequestOptions = {
            url,
            headers: {
                "User-Agent": COMMON_CONFIG.userAgent
            }
        };
        if (useProxy) {
            options.agentClass = socksHttp.Agent;
            options.agentOptions = {
                socksPort: SOCKS_CONFIG.port,
                socksHost: SOCKS_CONFIG.host
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
    downloadResult(
        filePath: string,
        torrents: string[] = [],
        images: string[] = []
    ) {
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
                let imgPath = filePath + "_" + (i + 1) + "" + path.extname(item);
                this.downloadFile(item, imgPath);
            }
        } catch (error) {
            log(error);
        }
    }

    /**
     * 去掉文件路径中的空白
     * @param {String} filePath
     */
    filterIllegalPath(filePath: string): string {
        let result = filePath.replace(/[^\da-z\u4e00-\u9fa5]/gi, "");
        return result;
    }

    /**
     * 下载文件
     * @param {String} url 请求链接
     * @param {String} filePath 文件路径
     */
    downloadFile(url: string, filePath: string) {
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
                .pipe(fs.createWriteStream(filePath));
        } catch (error) {
            log(error);
        }
    }

    /**
     * 下载种子链接
     * @param {String} filePath // 文件路径
     * @param {String} downloadUrl  // 下载种子地址
     */
    downloadTorrent(filePath: string, downloadUrl: string) {
        // 防止一个请求出错，导致程序终止
        try {
            // 解析出链接的 code 值
            let code = querystring.parse(downloadUrl.split("?").pop()).ref;
            // 种子网站国内可以访问，无须翻墙
            let options = this.getRequestOptions(COMMON_CONFIG.torrent,false);
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
                .pipe(fs.createWriteStream(filePath + "_" + code + ".torrent"));
        } catch (error) {
            log(error);
            // log("下载种子失败！")
        }
    }

    /**
     * 请求页面
     * @param {String} requestUrl 请求页面
     */
    requestPage(requestUrl: string) {
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
                request.get(options, function (err: object, response: object, body) {
                    // 防止解析报错
                    try {
                        // 统一解决中文乱码的问题
                        let content = iconvLite.decode(body, "gbk");
                        let $ = cheerio.load(content);
                        resolve($);
                    } catch (error) {
                        // log(error)
                        resolve(null);
                    }
                });
            });
        } catch (error) {
            log(error);
            //如果连续发出多个请求，即使某个请求失败，也不影响后面的其他请求
            Promise.resolve(null);
        }
    }
}
