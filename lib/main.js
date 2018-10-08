/**
 * @overview
 * @author Steve Xu <1161176156@qq.com>
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
let parseAllCategory = true // 是否解析所有分类 解析所有分类非常慢
let MAX_END_PAGE = COMMON_CONFIG.defaultPage
const log = (info, bool) => {
  console.log(info)
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
  }
  startTimeCount() {
    this.startTime = +new Date()
  }
  endTimeCount() {
    let seconds = (+new Date() - this.startTime) / 1000
    log("爬取总共耗时： " + seconds + " 秒", true)
  }
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
    this.updateJsonFile(tableList, this.jsonPath, false)
  }
  /**
   * 更新分类列表
   */
  updateCategoryList() {
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
    if (!filePath) {
      return false
    }
    if (this.isEmpty(data)) {
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
    if (!dirPath) {
      return
    }
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
      }
    } catch (err) {}
  }
  /**
   * 下载文件
   * @param {String} url 请求链接
   * @param {String} filePath 文件路径
   */
  downloadFile(url, filePath) {
    // 防止一个请求出错，导致程序终止
    try {
      if (!url || !filePath) {
        return false
      }
      if (url.startsWith("https")) {
        return
      }
      request
        .get({
          url,
          agentClass: Agent,
          agentOptions: COMMON_CONFIG.socks,
          headers: {
            headers: {
              "User-Agent": COMMON_CONFIG.userAgent
            }
          }
        })
        .pipe(fs.createWriteStream(filePath))
    } catch (error) {
      log(error)
    }
  }
  /**
   * 下载种子链接
   * @param {String} childDir // 子目录
   * @param {String} downloadUrl  // 下载种子地址
   */
  downloadTorrent(childDir, downloadUrl) {
    // 防止一个请求出错，导致程序终止
    try {
      // 解析出链接的 code 值
      let code = querystring.parse(downloadUrl.split("?").pop()).ref
      // log("正在下载的种子 " + code)
      if (!code || !childDir) {
        return false
      }
      if (downloadUrl.startsWith("https")) {
        return false
      }
      // 发出 post 请求，然后接受文件即可
      request
        .post({
          url: COMMON_CONFIG.torrent,
          agentClass: Agent,
          agentOptions: COMMON_CONFIG.socks,
          headers: {
            "User-Agent": COMMON_CONFIG.userAgent
          },
          formData: {
            code
          }
        })
        .pipe(fs.createWriteStream(childDir + "/" + code + ".torrent"))
    } catch (error) {
      log(error)
    }
  }
  /**
   * 请求页面
   * @param {String} requestUrl 请求页面
   */
  requestPage(requestUrl) {
    try {
      return new Promise((resolve, reject) => {
        if (!requestUrl) {
          log("请求链接不能为空！")
          resolve(false)
        }
        if (requestUrl.startsWith("https")) {
          resolve(false)
        }
        request.get(
          {
            url: requestUrl,
            agentClass: Agent,
            agentOptions: COMMON_CONFIG.socks,
            headers: {
              "User-Agent": COMMON_CONFIG.userAgent
            },
            // 去掉编码，否则解码会乱码
            encoding: null
          },
          function(err, response, body) {
            // 防止解析报错
            try {
              // 统一解决中文乱码的问题
              let content = iconv.decode(body, "gbk")
              let $ = cheerio.load(content)
              resolve($, err, response, body, content)
            } catch (error) {
              // log(error)
              resolve(null)
            }
          }
        )
      })
    } catch (error) {
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
  recursionExecutive() {
    this.startTimeCount()
    let categoryLinks = Object.keys(categoryList)
    if (this.categoryIndex >= categoryLinks.length) {
      log("全部爬取完毕！")
      return false
    }
    let currentCategory = categoryLinks[this.categoryIndex]
    this.jsonPath =
      COMMON_CONFIG.tableList + "/" + currentCategory.split("?").pop() + ".json"
    tableList = this.readJsonFile(this.jsonPath)
    let tableLinks = []
    if (!tableList) {
      if (parseAllCategory) {
        this.categoryIndex++
        this.recursionExecutive()
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
      let step = COMMON_CONFIG.maxDetailLinks
      /**
       * 递归请求，防止返回的数据太多，爆栈
       * 这是因为 async 返回的结果，都会放在 results 数组中
       * 而且每个返回的结果，是一个 html 文件，当返回的文件非常多时，内存占满了
       * 使用递归可以解决这个问题
       * 列表页面的递归请求是一样的
       */
      // 重新赋值 this 否则递归函数找不到 this
      let _this = this
      function innerRecursion(arrayIndex) {
        // log("内部递归调用")
        let urls = requestUrls.slice(arrayIndex * step, (arrayIndex + 1) * step)
        async.mapLimit(
          urls,
          COMMON_CONFIG.connectTasks,
          async url => {
            return await _this.requestPage(url)
          },
          (err, results) => {
            if (!err) {
              for (let i = 0; i < results.length; i++) {
                let seed = tableLinks[i + arrayIndex * step]
                let result = results[i]
                let directory = parentDir + "/" + seed.replace(/\//gi, "_")
                if (result) {
                  _this.parseHtml(result, seed, directory)
                }
              }
            }

            if (urls.length < step) {
              _this.endTimeCount()
              if (parseAllCategory) {
                _this.categoryIndex++
                _this.recursionExecutive()
              }
            } else {
              innerRecursion(arrayIndex + 1)
            }
          }
        )
      }
      innerRecursion(0)
    } catch (error) {
      log(error, true)
      this.requestFailure()
    }
  }

  parseHtml($, seed, directory) {
    let torrents = []
    /**
     * 获取页面上的每一个图片链接和地址链接
     * 不放过任何一个图片和种子，是不是很贴心！！
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
    $("body img").each(function() {
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
    if (this.isEmpty(tableList[seed])) {
      tableList[seed] = temp
    } else {
      tableList[seed].title = title
      tableList[seed].torrents = [...tableList[seed].torrents, ...torrents]
      tableList[seed].images = [...tableList[seed].images, ...images]
    }
    this.updateTableList()
    this.downloadResult(directory, torrents, images)
  }
  /**
   * 下载图片和种子
   * @param {String} filePath // 文件夹
   * @param {String} torrents // 种子链接
   * @param {String} images // 图片链接
   */
  async downloadResult(filePath, torrents = [], images = []) {
    let directory = filePath.slice(0, -5)
    // 有种子文件才下载
    if (!this.isEmpty(torrents)) {
      // 解决文件夹不存在导致程序终止
      try {
        await this.generateDirectory(directory)
      } catch (error) {}
    } else {
      return
    }
    for (let i = 0; i < torrents.length; i++) {
      this.downloadTorrent(directory, torrents[i])
    }
    for (let i = 0; i < images.length; i++) {
      let item = images[i]
      let imgPath = directory + "/" + i + 1 + "" + path.extname(item)
      this.downloadFile(item, imgPath)
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
    let categoryLinks = Object.keys(categoryList)
    if (this.categoryIndex >= categoryLinks.length) {
      this.getDetailData()
      return false
    }
    let currentCategory = categoryLinks[this.categoryIndex]
    this.jsonPath =
      COMMON_CONFIG.tableList + "/" + currentCategory.split("?").pop() + ".json"
    tableList = this.readJsonFile(this.jsonPath) || {}
    let tableLinks = Object.keys(tableList)
    let startPage = ~~(tableLinks.length / COMMON_CONFIG.pageSize) || 1
    let endPage = Math.min(categoryList[currentCategory].endPage, MAX_END_PAGE)
    log(
      `正在爬取的分类：${categoryList[currentCategory].title} 总共 ${endPage} `
    )
    try {
      let requestUrls = []
      for (let i = startPage; i <= endPage; i++) {
        let requestUrl = COMMON_CONFIG.baseUrl + currentCategory
        if (i > 1) {
          requestUrl += "&page=" + i
        }
        requestUrls.push(requestUrl)
      }
      let step = COMMON_CONFIG.maxDetailLinks
      // 递归请求，防止返回的数据太多，爆栈

      let _this = this
      function innerRecursion(arrayIndex) {
        let urls = requestUrls.slice(arrayIndex * step, (arrayIndex + 1) * step)
        async.mapLimit(
          urls,
          COMMON_CONFIG.connectTasks,
          async url => {
            return await _this.requestPage(url)
          },
          (err, results) => {
            if (!err) {
              for (let result of results) {
                if (result) {
                  _this.parseHtml(result, currentCategory)
                }
              }
            }
            if (urls.length < step) {
              _this.endTimeCount()
              if (parseAllCategory) {
                _this.categoryIndex++
                _this.recursionExecutive()
              } else {
                _this.getDetailData()
              }
            } else {
              innerRecursion(arrayIndex + 1)
            }
          }
        )
      }
      innerRecursion(0)
    } catch (error) {
      log(error, true)
      this.requestFailure()
    }
  }
  getDetailData() {
    log("正在爬取详情页")
    if (parseAllCategory) {
      new parseDetailPage().recursionExecutive()
    } else {
      new parseDetailPage(this.categoryIndex).recursionExecutive()
    }
  }
  parseHtml($, currentCategory) {
    let tableDom = $("#ajaxtable tr")
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
        } else {
          tableList[link] = temp
        }
      }
    })
    this.updateCategoryList()
    this.updateTableList()
  }
}

/**
 * 解析分类
 */
class ParseCategory extends BaseSpider {
  constructor(options) {
    super(options)
  }
  selectMaxPage(always) {
    if (always === COMMON_CONFIG.alwaysYes) {
      this.recursionExecutive(always)
      return
    }
    const instance = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    let text = `请输入每个分类爬取的最大页数,如设置值超过真实的总页面，则取真实的总页面（默认每个分类爬取${
      COMMON_CONFIG.defaultPage
    }页，设定页面不宜过大，否则爬取非常慢,回车使用默认值）:  `

    instance.question(text, answer => {
      MAX_END_PAGE = parseInt(answer) || MAX_END_PAGE
      log("最大页数：" + MAX_END_PAGE)
      this.recursionExecutive(true)
      instance.close()
    })
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
    text.push(
      `请输入 1~${
        links.length
      },回车或者输入超过范围的值解析所有分类（爬取所有分类较慢）?`
    )
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
  recursionExecutive(bool) {
    try {
      this.requestPage(COMMON_CONFIG.baseUrl).then($ => {
        if ($) {
          this.parseHtml($, bool)
        } else {
          this.requestFailure()
        }
      })
    } catch (error) {
      log(error)
      this.requestFailure()
    }
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
  parseHtml($, bool) {
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
          theme, // 主题 ,即总的列表数量
          article, // 文章
          endPage: ~~(theme / COMMON_CONFIG.pageSize)
        }
      }
    })
    this.updateCategoryList()
    // 测试不调用命令行交互
    if (bool === COMMON_CONFIG.alwaysYes) {
      new ParseTableList().recursionExecutive()
    } else if (bool) {
      this.selectCategory()
    }else {
      this.requestSuccess()
    }
  }
}
module.exports = {
  parseDetailPage,
  ParseTableList,
  ParseCategory
}
