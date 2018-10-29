/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */
// 请求
const request = require("request")
// 解析 dom
const cheerio = require("cheerio")
// 中文编码
const iconv = require("iconv-lite")
// 代理
const Agent = require("socks5-http-client/lib/Agent")
const querystring = require("querystring")
const path = require("path")
const fs = require("fs")
const SOCKS_CONFIG = require("../socks.json")
const COMMON_CONFIG = require("./config.js")
const log = (info, tag) => {
  console.log(info)
}
/**
 * 基础类
 * 编写其他类使用的公共方法
 */
class BaseSpider {
  constructor() {
    this.generateDirectory(COMMON_CONFIG.tableList)
    this.generateDirectory(COMMON_CONFIG.result)
    this.startTime = ""
    this.categoryList = {}
  }
  /**
   * 计时开始
   */
  startTimeCount() {
    this.startTime = +new Date()
  }
  /**
   * 计时结束
   */
  endTimeCount() {
    let seconds = (+new Date() - this.startTime) / 1000
    console.log("爬取总共耗时： " + seconds + " 秒")
  }

  /**
   * 数组去重
   * @param {Array} arr
   */
  filterRepeat(arr) {
    return [...new Set(arr)]
  }
  /**
   * 判断 js 任意类型是否为空
   * @param {Any} value
   */
  isEmpty(value) {
    return value == null || !(Object.keys(value) || value).length
  }
  /**
   * 更新 json 文件
   * @param {Object,Array} data 要更新的 json 数据
   * @param {String} filePath 文件路径
   */
  updateJsonFile(data, filePath, bool = false) {
    if (!filePath || this.isEmpty(data)) {
      return false
    }
    let jsonData = ""
    if (bool) {
      jsonData = JSON.stringify(data, null, 2)
    } else {
      jsonData = JSON.stringify(data)
    }
    fs.writeFile(filePath, jsonData, err => {
      log(err, false)
    })
  }
  /**
   * 读取 json 文件
   * @param {String} filePath 文件路径
   */
  readJsonFile(filePath) {
    try {
      let data = fs.readFileSync(filePath)
      data = data ? JSON.parse(data) : null
      return data
    } catch (error) {
      log(error, false)
    }
  }
  /**
   *生成目录
   * @param {String} dirPath 目录路径
   */
  generateDirectory(dirPath) {
    try {
      if (dirPath && !fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
      }
    } catch (err) {
      console.log(err)
    }
  }
  /**
   * 获取请求配置
   * @param {String} url 链接
   */
  getRequestOptions(url) {
    if (!url || url.startsWith("https")) {
      return false
    }
    let options = {
      url,
      headers: {
        "User-Agent": COMMON_CONFIG.userAgent
      },
      agentClass: Agent,
      agentOptions: {
        socksPort: SOCKS_CONFIG.port,
        socksHost: SOCKS_CONFIG.host
      }
    }
    return options
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
        return false
      }
      for (let torrent of torrents) {
        this.downloadTorrent(filePath, torrent)
      }
      for (let i = 0; i < images.length; i++) {
        let item = images[i]
        let imgPath = filePath + "_" + (i + 1) + "" + path.extname(item)
        this.downloadFile(item, imgPath)
      }
    } catch (error) {
      log(error)
    }
  }
  /**
   * 去掉文件路径中的空白
   * @param {String} filePath
   */
  filterIllegalPath(filePath) {
    let result = filePath.replace(/[^\da-z\u4e00-\u9fa5]/gi, "")
    return result
  }
  /**
   * 下载文件
   * @param {String} url 请求链接
   * @param {String} filePath 文件路径
   */
  downloadFile(url, filePath, useProxy = true) {
    // 防止一个请求出错，导致程序终止
    try {
      let options = this.getRequestOptions(url, useProxy)
      if (!filePath || !options) {
        return false
      }
      request
        .get(options)
        .on("error", err => {
          console.log(err)
          return
        })
        .pipe(fs.createWriteStream(filePath))
    } catch (error) {
      log(error)
    }
  }
  /**
   * 下载种子链接
   * @param {String} filePath // 文件路径
   * @param {String} downloadUrl  // 下载种子地址
   */
  downloadTorrent(filePath, downloadUrl, useProxy = true) {
    // 防止一个请求出错，导致程序终止
    try {
      // 解析出链接的 code 值
      let code = querystring.parse(downloadUrl.split("?").pop()).ref
      let options = this.getRequestOptions(COMMON_CONFIG.torrent, useProxy)
      if (!code || !filePath || !options) {
        return false
      }
      options.formData = {
        code
      }
      // 发出 post 请求，然后接受文件即可
      request
        .post(options)
        .on("error", err => {
          console.log(err)
          return
        })
        .pipe(fs.createWriteStream(filePath + "_" + code + ".torrent"))
    } catch (error) {
      log(error)
      // log("下载种子失败！")
    }
  }
  /**
   * 请求页面
   * @param {String} requestUrl 请求页面
   */
  requestPage(requestUrl, useProxy = true) {
    try {
      return new Promise((resolve, reject) => {
        let options = this.getRequestOptions(requestUrl, useProxy)
        if (!requestUrl || !options) {
          resolve(null, requestUrl)
        }
        options = Object.assign(options, {
          // 去掉编码，否则解码会乱码
          encoding: null
        })
        request.get(options, function(err, response, body) {
          // 防止解析报错
          try {
            // 统一解决中文乱码的问题
            let content = iconv.decode(body, "gbk")
            let $ = cheerio.load(content)
            resolve($, requestUrl, response, body, content)
          } catch (error) {
            // log(error)
            resolve(null, requestUrl)
          }
        })
      })
    } catch (error) {
      log(error)
      //如果连续发出多个请求，即使某个请求失败，也不影响后面的其他请求
      Promise.resolve(null, requestUrl)
    }
  }
}
module.exports = {
  BaseSpider,
  log
}
