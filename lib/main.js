/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2019, Steve Xu
 * @license MIT
 * @preserve
 */
// 原生模块
//文件操作
const fs = require("fs")
// 路径操作
const path = require("path")
// 解析 url
const querystring = require("querystring")
// 命令行交互
const readline = require("readline")
// 第三方依赖包
// 请求
const request = require("request")
// 解析 dom
const cheerio = require("cheerio")
// 中文编码
const iconv = require("iconv-lite")
// 代理
const Agent = require("socks5-http-client/lib/Agent")
//  提高下载并发量
const async = require("async")
const COMMON_CONFIG = require("./config")
let categoryList = {} // 所有分类
try {
  categoryList = require("../json/categoryConfig.json")
} catch (error) {
  categoryList = {}
}
let tableList = {} // 当前分类下的列表页
let parseAllCategory = false // 是否解析所有分类 解析所有分类非常慢
const log = (info, bool) => {
  // if (bool) {
  console.log(info)
  // }
}
/**
 * 基础类
 */
class BaseSpider {
  constructor(categoryIndex) {
    this.categoryIndex = categoryIndex || 0 // 当前分类索引
    this.jsonPath = "" // 列表页结果路径
    this.generateDirectory(COMMON_CONFIG.tableList)
    this.startTime = ""
    this.currentCategory = ""
  }
  startTimeCount() {
    this.startTime = +new Date()
  }
  endTimeCount() {
    let seconds = (+new Date() - this.startTime) / 1000
    log("爬取总共耗时： " + seconds + " 秒", true)
  }

  async innerRecursion(requestUrls, arrayIndex, classType) {
    let step = COMMON_CONFIG.maxDetailLinks
    let urls = requestUrls.slice(arrayIndex * step, (arrayIndex + 1) * step)
    async.mapLimit(
      urls,
      COMMON_CONFIG.connectTasks,
      async url => {
        return await this.requestPage(url)
      },
      (err, results) => {
        let repeatCount = 0
        if (!err) {
          for (let i = 0; i < results.length; i++) {
            let result = results[i]
            if (result) {
              let count = ~~this.parseHtml(result, urls[i])
              repeatCount += count
            }
          }
        }else {
          log(err)
        }
        if(!results || results.length < 1){
           log('IP 可能被封了')
        }
        if (repeatCount >= step / 2 && classType === "ParseTableList") {
          log("数据同步完成了", true)
          this.endTimeCount()
          this.endInnerRecursion()
          return false
        }
        if (urls.length < step) {
          this.endTimeCount()
          this.endInnerRecursion()
        } else {
          this.innerRecursion(requestUrls, arrayIndex + 1, classType)
        }
      }
    )
  }
  endInnerRecursion() {}
  /**
   * 递归调用
   */
  recursionExecutive() {}
  /**
   * 解析 HTML
   */
  parseHtml() {}
  /**
   * 请求失败的处理
   */
  requestFailure() {
    log("网络中断了，请重新链接！或者 IP 被封了", true)
  }
  /**
   * 更新列表结果
   */
  updateTableList() {
    let links = Object.keys(tableList)
    if (links.length < 5) {
      return
    }
    this.updateJsonFile(tableList, this.jsonPath, false)
  }
  /**
   * 更新分类列表
   */
  updateCategoryList() {
    let links = Object.keys(categoryList)
    if (links.length < 1) {
      return
    }
    this.updateJsonFile(categoryList, COMMON_CONFIG.categoryConfig, false)
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
    fs.writeFile(filePath, jsonData, err => {})
  }
  /**
   * 读取 json 文件
   * @param {String} filePath 文件路径
   */
  readJsonFile(filePath) {
    //log(filePath)
    try {
      let data = fs.readFileSync(filePath)
      data = data ? JSON.parse(data) : null
      return data
    } catch (error) {
      // log(error)
      return null
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
    } catch (err) {}
  }
  /**
   * 获取请求配置
   * @param {String} url 链接
   * @param {Boolean}} useProxy  是否使用代理
   */
  getRequestOptions(url, useProxy = true) {
    if (!url || url.startsWith("https")) {
      return false
    }
    let options = {
      url,
      headers: {
        "User-Agent": COMMON_CONFIG.userAgent
      }
    }
    if (useProxy) {
      options = Object.assign(options, {
        agentClass: Agent,
        agentOptions: COMMON_CONFIG.socks
      })
    }
    return options
  }
  /**
   * 下载文件
   * @param {String} url 请求链接
   * @param {String} filePath 文件路径
   * @param {Boolean}} useProxy  是否使用代理
   */
  downloadFile(url, filePath, useProxy = true) {
    // 防止一个请求出错，导致程序终止
    try {
      let options = this.getRequestOptions(url, useProxy)
      if (!filePath || !options) {
        return false
      }
      request.get(options).pipe(fs.createWriteStream(filePath))
    } catch (error) {
      log(error)
    }
  }
  /**
   * 下载种子链接
   * @param {String} childDir // 子目录
   * @param {String} downloadUrl  // 下载种子地址
   * @param {Boolean}} useProxy  是否使用代理
   */
  downloadTorrent(childDir, downloadUrl, useProxy = true) {
    // 防止一个请求出错，导致程序终止
    try {
      // 解析出链接的 code 值
      let code = querystring.parse(downloadUrl.split("?").pop()).ref
      // log("正在下载的种子 " + code)
      let options = this.getRequestOptions(downloadUrl, useProxy)
      if (!code || !childDir || !options) {
        return false
      }
      options.formData = {
        code
      }
      /**
       * 得到种子链接后，下载种子的网站不翻墙也可以访问的
       * 这意味着获取所有页面的种子链接后， 之后就可以不用翻墙，直接获取种子文件
       * 有了种子，图片要不要无所谓了
       * 你不看源码，我怎么告诉你啊！！！
       */
      // 发出 post 请求，然后接受文件即可
      request
        .post(options)
        .pipe(fs.createWriteStream(childDir + "/" + code + ".torrent"))
    } catch (error) {
      log(error)
    }
  }
  /**
   * 请求页面
   * @param {String} requestUrl 请求页面
   * @param {Boolean}} useProxy  是否使用代理
   */
  requestPage(requestUrl, useProxy = true) {
    try {
      return new Promise((resolve, reject) => {
        let options = this.getRequestOptions(requestUrl, useProxy)
        if (!requestUrl || !options) {
          resolve(false)
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
            resolve($, err, response, body, content)
          } catch (error) {
            console.log(error)
            resolve(null)
          }
        })
      })
    } catch (error) {
      console.log(error)
      //如果连续发出多个请求，即使某个请求失败，也不影响后面的其他请求
      Promise.resolve(null)
    }
  }
}
/**
 * 解析详情页面，获取图片和种子，万里长征最后一步
 */
class parseDetailPage extends BaseSpider {
  constructor(options) {
    super(options)
    this.generateDirectory(COMMON_CONFIG.result)
  }
  endInnerRecursion() {
    if (parseAllCategory) {
      this.categoryIndex++
      this.recursionExecutive()
    }
  }
  async recursionExecutive() {
    this.startTimeCount()
    let categoryLinks = Object.keys(categoryList)
    if (this.categoryIndex >= categoryLinks.length) {
      log("全部爬取完毕！", true)
      return false
    }
    let currentCategory = categoryLinks[this.categoryIndex]
    this.currentCategory = currentCategory
    this.jsonPath =
      COMMON_CONFIG.tableList + "/" + currentCategory.split("?").pop() + ".json"
    tableList = this.readJsonFile(this.jsonPath)
    let tableLinks = []
    if (!tableList) {
      if (parseAllCategory) {
        this.categoryIndex++
        this.recursionExecutive()
      } else {
        log("该分类下暂无数据，选其他分类")
      }
      return false
    }
    let categoryTitle = categoryList[currentCategory].title
    let parentDir = COMMON_CONFIG.result + "/" + categoryTitle
    this.generateDirectory(parentDir)
    tableLinks = Object.keys(tableList)
    let totalLength = tableLinks.length
    log(`正在爬取的分类：${categoryTitle} 图片和种子,总共 ${totalLength} `)
    try {
      let requestUrls = tableLinks.map(url => COMMON_CONFIG.baseUrl + url)
      this.innerRecursion(requestUrls, 0, "parseDetailPage")
    } catch (error) {
      log(error, true)
      this.requestFailure()
    }
  }
  parseHtml($, requestUrl) {
    let seed = requestUrl.slice(COMMON_CONFIG.baseUrl.length, requestUrl.length)
    let directory =
      COMMON_CONFIG.result +
      "/" +
      categoryList[this.currentCategory].title +
      "/" +
      seed.replace(/\//gi, "_")
    let torrents = []
    /**
     * 获取页面上的每一个链接
     * 不放过任何一个种子，是不是很贴心！！
     */
    $("body a").each(function() {
      let href = $(this).attr("href")
      if (href && COMMON_CONFIG.seedSite.some(item => href.includes(item))) {
        torrents.push(href)
      }
    })
    // 去重
    torrents = [...new Set(torrents)]
    let images = []
    // 限制图片范围，否则无关图片很多
    $("#td_tpc img").each(function() {
      let src = $(this).attr("src")
      if (src && src.startsWith("http")) {
        images.push(src)
      }
    })
    images = [...new Set(images)]
    // title 字段非空，可以在下次不用爬取该页面，直接下载种子文件
    let title =
      $("#td_tpc h1")
        .eq(0)
        .text() || "已经爬取了"
    let repeat = false
    if (tableList[seed]) {
      repeat = true
    }
    // tableList[seed] = Object.assign(tableList[seed], {
    //   title,
    //   torrents,
    //   images
    // })
    // this.updateTableList()
    this.downloadResult(directory, torrents, images)
    return repeat
  }
  /**
   * 下载图片和种子
   * @param {String} filePath // 文件夹
   * @param {String} torrents // 种子链接
   * @param {String} images // 图片链接
   */
  async downloadResult(filePath, torrents = [], images = [], useProxy) {
    let directory = filePath.slice(0, -5)
    // 有种子文件才下载
    if (!this.isEmpty(torrents)) {
      // 解决文件夹不存在导致程序终止
      try {
        await this.generateDirectory(directory)
      } catch (error) {
        console.log(error)
      }
    } else {
      return false
    }
    for (let i = 0; i < torrents.length; i++) {
      await this.downloadTorrent(directory, torrents[i], useProxy)
    }
    for (let i = 0; i < images.length; i++) {
      let item = images[i]
      let imgPath = directory + "/" + i + 1 + "" + path.extname(item)
      await this.downloadFile(item, imgPath)
    }
  }
}
/**
 * 解析列表页
 */
class ParseTableList extends BaseSpider {
  constructor(options) {
    super(options)
  }
  recursionExecutive() {
    this.startTimeCount()
    log("正在爬取列表")
    let categoryLinks = Object.keys(categoryList)
    if (this.categoryIndex >= categoryLinks.length) {
      this.getDetailData()
      return false
    }
    let currentCategory = categoryLinks[this.categoryIndex]
    this.currentCategory = currentCategory
    this.jsonPath =
      COMMON_CONFIG.tableList + "/" + currentCategory.split("?").pop() + ".json"
    tableList = this.readJsonFile(this.jsonPath) || {}
    let endPage = categoryList[currentCategory].endPage
    let tableLinks = Object.keys(tableList)

    if (tableLinks.length >= +categoryList[currentCategory].theme) {
      log("该分类的列表数据已经下载了")
      this.endInnerRecursion()
      return false
    }
    log(`正在爬取的分类：${categoryList[currentCategory].title}`)
    try {
      let requestUrls = []
      for (let i = 1; i <= endPage; i++) {
        let requestUrl = COMMON_CONFIG.baseUrl + currentCategory
        if (i > 1) {
          requestUrl += "&page=" + i
        }
        requestUrls.push(requestUrl)
      }
      this.innerRecursion(requestUrls, 0, "ParseTableList")
    } catch (error) {
      log(error, true)
      this.requestFailure()
    }
  }
  endInnerRecursion() {
    if (parseAllCategory) {
      this.categoryIndex++
      this.recursionExecutive()
    } else {
      this.getDetailData()
    }
  }
  getDetailData() {
    log("正在爬取详情页", true)
    if (parseAllCategory) {
      new parseDetailPage().recursionExecutive()
    } else {
      new parseDetailPage(this.categoryIndex).recursionExecutive()
    }
  }
  parseHtml($) {
    let tableDom = $("#ajaxtable tr")
    let repeatCount = 0
    let currentCategory = this.currentCategory
    tableDom.each(function() {
      // 获取列表页分页的总页数
      let endPage = ~~$("#main .pages")
        .eq(0)
        .text()
        .trim()
        .match(/\((.+?)\)/g)[0]
        .slice(1, -1)
        .split("/")
        .pop()
      categoryList[currentCategory].endPage = Math.max(
        categoryList[currentCategory].endPage,
        endPage
      )
      // 详情页面链接
      let link = $(this)
        .find("h3")
        .eq(0)
        .find("a")
        .attr("href")
      let tdDom = $(this).find("td")
      let createTime = tdDom
        .eq(5)
        .find("a")
        .text()
        .trim()
      if (link) {
        let temp = {
          reply: ~~tdDom.eq(3).text(), // 回复
          popular: ~~tdDom.eq(4).text(), // 人气
          createTime, // 创建时间
          images: [], // 图片
          torrents: [] // 种子
        }
        if (tableList[link]) {
          tableList[link] = Object.assign(tableList[link], temp)
          repeatCount++
        } else {
          tableList[link] = temp
        }
      }
    })
    this.updateCategoryList()
    this.updateTableList()
    // 可以作为后期判断同步网站数据是否完毕的根据
    return repeatCount === tableDom.length
  }
}

/**
 * 解析分类
 */
class ParseCategory extends BaseSpider {
  constructor(options) {
    super(options)
  }
  selectCategory() {
    const instance = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    let links = Object.values(categoryList)
    let text = links.map((item, index) => {
      return index + 1 + ". " + item.title
    })
    text.push(`请输入 1~${links.length},回车或者输入非法值解析所有分类?`)
    instance.question(text.join("\n") + ":  ", answer => {
      let value = parseInt(answer)
      if (value <= links.length && value >= 1) {
        let index = value - 1
        log("解析" + links[index].title)
        parseAllCategory = false
        new ParseTableList(index).recursionExecutive()
      } else {
        log("解析所有分类")
        parseAllCategory = true
        new ParseTableList().recursionExecutive()
      }
      instance.close()
    })
  }
  recursionExecutive(isTest) {
    if (isTest === "clear") {
      this.clearTableList(0)
      return
    }
    try {
      this.requestPage(COMMON_CONFIG.baseUrl).then($ => {
        if ($) {
          this.parseHtml($, isTest)
        } else {
          this.requestFailure()
        }
      })
    } catch (error) {
      log(error)
      this.requestFailure()
    }
  }
  clearTableList(categoryIndex) {
    let categoryLinks = Object.keys(categoryList)
    if (categoryIndex >= categoryLinks.length) {
      log("清除完毕！")
      return false
    }
    let currentCategory = categoryLinks[categoryIndex]
    this.jsonPath =
      COMMON_CONFIG.tableList + "/" + currentCategory.split("?").pop() + ".json"
    tableList = this.readJsonFile(this.jsonPath) || {}
    Object.keys(tableList).forEach(key => {
      tableList[key].title = ""
      tableList[key].torrents = []
      tableList[key].images = []
    })
    this.updateTableList()
    this.clearTableList(categoryIndex + 1)
  }
  requestFailure() {
    log(
      "代理 " +
        COMMON_CONFIG.socks.socksHost +
        ":" +
        COMMON_CONFIG.socks.socksPort +
        " 不可用"
    )
    log("———————————代理配置错误，一定要配置代理!!!——————————")
  }
  requestSuccess() {
    log("———————————代理测试通过!!!———————————")
  }
  parseHtml($, isTest) {
    let categoryDom = $("#cate_3 tr")
    categoryDom.each(function() {
      let titleDom = $(this)
        .find("h3")
        .eq(0)
        .find("a")
      // path.basename 去掉链接中无用的字符
      let link = path.basename(titleDom.attr("href") || "")
      let title = titleDom.text() || "分类名为空"
      let theme = ~~$(this)
        .find("td")
        .eq(1)
        .find("span")
        .text()
      let article = ~~$(this)
        .find("td")
        .eq(2)
        .find("span")
        .text()
      // 每次启动都刷新列表，与网站保持同步
      if (link && title) {
        categoryList[link] = {
          link, // 链接
          title, // 标题
          theme, // 主题 ,即总的列表数量 判断网站更新数据了的重要依据
          article, // 文章
          endPage: ~~(theme / COMMON_CONFIG.pageSize)
        }
      }
    })
    this.updateCategoryList()
    this.requestSuccess()
    if (isTest === "test") {
      new parseDetailPage().recursionExecutive()
    } else {
      this.selectCategory()
    }
  }
}
module.exports = {
  parseDetailPage,
  ParseTableList,
  ParseCategory
}
