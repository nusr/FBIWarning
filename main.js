/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2019, Steve Xu
 * @license MIT
 * @preserve
 */
/**
 * 爬取数据有两种策略：
 * 1. 爬取所有列表页面的链接后，再去爬取详情页面 图算法广度优先
 * 2. 爬取一部分列表页面，就去爬取详情页面 图算法深度优先
 * 因为是国外网站，网络可能随时断开，所以采用第二种策略比较好
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
// 提高下载并发量
const async = require("async")
const log = (info, tag) => {
  console.log(info)
}
const SOCKS_CONFIG = require("./socks.json")
// log(SOCKS_CONFIG)
const COMMON_CONFIG = {
  result: "./result", // 种子存放目录
  connectTasks: 8, // 最大并发量,最好不要更改，否则可能被封 IP
  baseUrl: "http://www.ac168.info/bt/", // 爬取页面,不想安装 Node.js 的，可以直接访问该网站
  categoryConfig: "./json/categoryConfig.json", // 分类列表
  tableList: "./json", // 缓存爬取的信息
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
let categoryList = {} // 所有分类
/* try {
  categoryList = require("./json/categoryConfig.json")
} catch (error) {} */

/**
 * 基础类
 * 编写其他类使用的公共方法
 */
class BaseSpider {
  constructor() {
    this.generateDirectory(COMMON_CONFIG.tableList)
    this.generateDirectory(COMMON_CONFIG.result)
    this.startTime = ""
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
   * 更新分类数据
   */
  updateCategoryList() {
    this.updateJsonFile(categoryList, COMMON_CONFIG.categoryConfig, true)
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
      // log(error)
    }
  }
  /**
   * 去掉文件路径中的空白
   * @param {String} filePath
   */
  filterIllegalPath(filePath) {
    let result = filePath.replace(/[^\da-z\u4e00-\u9fa5]/gi,"")
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
      log("下载文件失败！")
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
      // log(error)
      log("下载种子失败！")
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
          resolve(null)
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
            // log(error)
            resolve(null)
          }
        })
      })
    } catch (error) {
      // log(error)
      //如果连续发出多个请求，即使某个请求失败，也不影响后面的其他请求
      Promise.resolve(null)
    }
  }
}
/**
 * 解析列表页
 */
class ParseTableList extends BaseSpider {
  constructor(categoryIndex, parseAllCategory, parseListUrl) {
    super()
    this.tableList = {} // 当前分类下的列表页
    this.parseAllCategory = parseAllCategory || false // 是否解析所有分类
    this.parseListUrl = parseListUrl || "" //  当前解析的 url
    this.categoryIndex = categoryIndex || 0 // 当前爬取的分类
    this.jsonPath = "" // 列表页结果路径
    this.currentPage = 1 //当前页数
  }
  /**
   * 入口
   */
  recursionExecutive() {
    if (this.categoryIndex >= Object.keys(categoryList).length) {
      console.log("全部爬取完毕！")
      return false
    }
    let currentCategory = this.getCurrentCategory()
    this.parseListUrl = this.parseListUrl || currentCategory
    this.jsonPath =
      COMMON_CONFIG.tableList + "/" + currentCategory.split("?").pop() + ".json"
    this.tableList = this.readJsonFile(this.jsonPath) || {}
    this.generateDirectory(this.getParentDirectory())
    this.innerRecursion()
  }
  /**
   * 获取列表页面的结束页面
   */
  getEndPage() {
    let parseListUrl = this.parseListUrl
    let currentCategory = this.getCurrentCategory()
    if (categoryList[parseListUrl]) {
      return categoryList[currentCategory].endPage
    } else {
      let childCategory = categoryList[currentCategory].childCategory
      let item = childCategory.find(item => item.link === parseListUrl)
      return Math.max(item.endPage, COMMON_CONFIG.connectTasks)
    }
  }
  /**
   * 获取父文件夹路径
   *
   */
  getParentDirectory() {
    let parseListUrl = this.parseListUrl
    let temp = ""
    let currentCategory = this.getCurrentCategory()
    if (!categoryList[parseListUrl]) {
      let childCategory = categoryList[currentCategory].childCategory
      let item = childCategory.find(item => item.link === parseListUrl) || {}
      temp = "_" + item.title
    }
    return (
      COMMON_CONFIG.result + "/" + categoryList[currentCategory].title + temp
    )
  }
  /**
   * 列表页面请求
   */
  innerRecursion() {
    this.startTimeCount()
    console.log("爬取列表中...")
    let connectTasks = COMMON_CONFIG.connectTasks
    let endPage = ~~this.getEndPage()

    let currentPage = this.currentPage
    if (this.currentPage >= endPage) {
      this.endInnerRecursion()
      return false
    }
    console.log(currentPage)
    let pageLimit = Math.min(endPage, currentPage + connectTasks)
    let requestUrls = []
    for (let i = currentPage; i <= pageLimit; i++) {
      let requestUrl = COMMON_CONFIG.baseUrl + this.parseListUrl
      if (i > 1) {
        requestUrl += "&page=" + i
      }
      requestUrls.push(requestUrl)
    }
    try {
      // 并发请求
      async.mapLimit(
        requestUrls,
        COMMON_CONFIG.connectTasks,
        async url => {
          return this.requestPage(url)
        },
        (err, results) => {
          let detailLinks = []
          let repeatCount = 0
          if (err) {
            log(err)
          }
          for (let result of results) {
            if (result) {
              let { links, repeat } = this.parseHtml(result)
              repeatCount = repeatCount + ~~repeat
              detailLinks = [...detailLinks, ...links]
            }
          }
          detailLinks = this.filterRepeat(detailLinks)
          let isRepeat =
            repeatCount >
            (COMMON_CONFIG.connectTasks * COMMON_CONFIG.pageSize) / 2
          this.getDetailPage(detailLinks, isRepeat)
        }
      )
    } catch (error) {
      log(error)
      this.currentPage += COMMON_CONFIG.connectTasks
      this.innerRecursion()
    }
  }
  /**
   * 请求详情页面
   * async 配合 await 会将同步变成异步过程
   * @param {Array} detailLinks 详情页面链接
   */
  async getDetailPage(detailLinks, isRepeat) {
    console.log("爬取种子中...")
    try {
      let tableList = this.tableList
      for (let link of detailLinks) {
        // 详情页已经爬取了,直接下载种子
        if (tableList[link] && tableList[link].title) {
          let directory =
            this.getParentDirectory() +
            "/" +
            this.filterIllegalPath(tableList[link].title)
          await this.downloadResult(
            directory,
            tableList[link].torrents,
            tableList[link].images
          )
        } else {
          let $ = await this.requestPage(COMMON_CONFIG.baseUrl + link)
          this.parseDetailHtml($, link)
        }
      }
      if (isRepeat) {
        this.currentPage += COMMON_CONFIG.connectTasks
      } else {
        // 根据已经爬取的数据 更新爬取的页数
        this.currentPage = this.getTotalCount()
      }
      this.endTimeCount()
      this.innerRecursion()
    } catch (error) {
      log(error)
      this.currentPage += COMMON_CONFIG.connectTasks
      this.endTimeCount()
      this.innerRecursion()
    }
  }
  /**
   * 获取已经爬取的页数
   */
  getTotalCount() {
    let parseListUrl = this.parseListUrl
    let lists = Object.keys(categoryList)
    let totalLen = 0
    let tableList = this.tableList
    if (!lists.includes(parseListUrl)) {
      for (let key in tableList) {
        if (tableList[key].category === parseListUrl) {
          totalLen++
        }
      }
      console.log("根据已有数据更新页数", totalLen)
    } else {
      totalLen = Object.keys(tableList).length
    }
    return ~~(totalLen / COMMON_CONFIG.pageSize)
  }
  /**
   * 获取当前的分类
   */
  getCurrentCategory() {
    return Object.keys(categoryList)[this.categoryIndex]
  }
  /**
   * 判断是否爬取所有分类的列表页面
   */
  endInnerRecursion() {
    if (this.parseAllCategory) {
      this.currentPage = 1
      this.categoryIndex++
      this.parseListUrl = this.getCurrentCategory()
      this.recursionExecutive()
    } else {
      console.log("爬取完毕！")
    }
  }
  /**
   * 解析列表页面
   * @param {Object} $   cheerio 对象
   */
  parseHtml($) {
    let trDoms = $("#ajaxtable tr")
    let detailLinks = []
    let repeatCount = 0
    let tableList = this.tableList
    let category = this.parseListUrl
    trDoms.each(function() {
      // 详情页面链接
      let link = $(this)
        .find("h3")
        .eq(0)
        .find("a")
        .attr("href")
      if (link && tableList[link]) {
        repeatCount++
      }
      if (link) {
        detailLinks.push(link)
        tableList[link] = {
          category,
          images: [],
          torrents: []
        }
      }
    })
    this.updateTableList()
    return {
      links: detailLinks,
      repeat: repeatCount === trDoms.length
    }
  }
  /**
   * 解析详情页面
   * @param {Object} $ cheerio 对象
   * @param {String} seed  详情页链接
   */
  parseDetailHtml($, seed) {
    if (!$) {
      return
    }
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
    torrents = this.filterRepeat(torrents)
    let images = []
    $("#td_tpc img").each(function() {
      let src = $(this).attr("src")
      let extName = path.extname(src)
      const extList = [".jpg", ".png", ".jpeg", ".gif", ".bmp"]
      // 去掉无效的图片下载链接
      if (src && src.startsWith("http") && extList.includes(extName)) {
        images.push(src)
      }
    })
    images = this.filterRepeat(images)
    // title 字段非空，可以在下次不用爬取该页面，直接下载种子文件
    let title =
      $("#td_tpc h1")
        .eq(0)
        .text() || "已经爬取了该详情页" + ~~(Math.random() * 1e5)
    // 存放爬取结果，下次直接下载种子文件
    let tableList = this.tableList
    tableList[seed] = Object.assign(tableList[seed], {
      title,
      torrents,
      images
    })
    this.updateTableList()
    let directory = this.getParentDirectory() + "/" + this.filterIllegalPath(title)
    this.downloadResult(directory, torrents, images)
  }
  /**
   * 更新列表数据
   */
  updateTableList() {
    this.updateJsonFile(this.tableList, this.jsonPath, false)
  }
}

/**
 * 解析分类
 */
class ParseCategory extends BaseSpider {
  constructor() {
    super()
  }
  /**
   * 入口
   */
  async recursionExecutive() {
    try {
      let $ = await this.requestPage(COMMON_CONFIG.baseUrl)
      if ($) {
        this.parseHtml($)
      } else {
        this.requestFailure()
      }
    } catch (error) {
      // log(error)
      this.requestFailure()
    }
  }
  /**
   * 请求测试失败！
   */
  requestFailure() {
    let text = `
    ------------------------------------------------------------\n
    ------------代理${SOCKS_CONFIG.host} : ${
      SOCKS_CONFIG.port
    }不可用!!!-----------------\n
    ------------代理配置错误，一定要配置代理!!!-----------------\n
    -----------------------------------------------------------`
    console.log(text)
  }
  /**
   * 代理测试成功
   */
  requestSuccess() {
    console.log("代理测试通过!!!")
  }
  /**
   * 解析分类页面
   * @param {Object} $ cheerio 对象
   */
  parseHtml($) {
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
      let endPage = ~~(theme / COMMON_CONFIG.pageSize)
      // 每次启动都刷新列表，与网站保持同步
      if (link && title) {
        categoryList[link] = {
          link, // 链接
          title, // 标题
          theme, // 主题 ,即总的列表数量 判断网站更新数据了的重要依据
          endPage,
          childCategory: [] // 子类型
        }
      }
    })

    this.requestSuccess()
    let links = Object.keys(categoryList)
    async.mapLimit(
      links,
      COMMON_CONFIG.connectTasks,
      async url => {
        return this.requestPage(COMMON_CONFIG.baseUrl + url)
      },
      (err, results) => {
        for (let i = 0; i < results.length; i++) {
          this.parseChildCategory(results[i], links[i])
        }
        this.updateCategoryList()
        this.selectCategory()
      }
    )
  }
  /**
   * 获取总页数
   */
  getEndPage($) {
    let trsLen = 0
    try {
      let trs = $("#ajaxtable tr")
      trsLen = trs.length
      let number = $("#main .pages")
        .eq(0)
        .text()
        .match(/[0-9/]/gi)
      let endPage = []
      let index = number.findIndex(item => item === "/")
      for (++index; index < number.length; index++) {
        endPage.push(number[index])
      }
      endPage = endPage.join("")
      // log(endPage);
      return ~~endPage
    } catch (error) {
      return trsLen > 0
    }
  }
  /**
   * 解析子分类
   * @param {Object} $ cheerio
   * @param {String} category  所属分类
   */
  parseChildCategory($, category) {
    if (!$) {
      return false
    }
    let childDom = $("#ajaxtable th").find("a")
    let childCategory = []
    childDom.each(function() {
      let link = $(this).attr("href")
      let text = $(this).text()
      let checkLink = link && !categoryList[link] && !link.includes("notice")
      if (checkLink) {
        childCategory.push({
          link,
          title: text,
          endPage: 0
        })
      }
    })
    let endPage = Math.max(COMMON_CONFIG.connectTasks, ~~this.getEndPage($))
    categoryList[category] = Object.assign(categoryList[category], {
      endPage,
      childCategory
    })
  }
  /**
   * 选择爬取的大分类
   */
  selectCategory() {
    const instance = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    let links = Object.values(categoryList)
    let text = links.map((item, index) => {
      return index + 1 + ". " + item.title
    })
    text.push(`请输入 1~${links.length},回车或者输入非法值解析所有分类?: `)
    text = text.join("\n")
    instance.question(text, answer => {
      let value = parseInt(answer)
      let index = value - 1
      instance.close()
      if (value > links.length || value < 1) {
        // log("解析所有分类")
        index = 0
        new ParseTableList(index, true, links[index].link).recursionExecutive()
        return false
      }
      // 页数太少，直接解析整个分类
      if (links[index].endPage <= COMMON_CONFIG.connectTasks) {
        new ParseTableList(index, false, links[index].link).recursionExecutive()
      } else {
        this.selectChildCategory(index, links[index])
      }
    })
  }
  /**
   * 选择子分类
   * @param {Number} parentIndex 父分类的索引
   * @param {Object} parentCategory 父分类
   */
  selectChildCategory(parentIndex, parentCategory) {
    const instance = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    let childCategory = parentCategory.childCategory
    let text = childCategory.map((item, index) => {
      return index + 1 + ". " + item.title
    })
    text.push(
      `请输入 1~${childCategory.length},回车或者输入非法值解析整个分类?`
    )
    instance.question(text.join("\n") + ": ", async answer => {
      let value = parseInt(answer)
      log(answer)
      let index = value - 1
      instance.close()
      try {
        if (value <= childCategory.length && value >= 1) {
          let link = childCategory[index].link
          let $ = await this.requestPage(COMMON_CONFIG.baseUrl + link)
          let endPage = ~~this.getEndPage($)
          if (endPage < 1) {
            throw new Error("failure!")
          }
          childCategory[index].endPage = endPage
          this.updateCategoryList()
          console.log(endPage)
          // log("解析" + childCategory[index].title)
          new ParseTableList(parentIndex, false, link).recursionExecutive()
          return false
        } else {
          new ParseTableList(
            parentIndex,
            false,
            parentCategory.link
          ).recursionExecutive()
        }
        // log("解析" + parentCategory.title)F
      } catch (error) {
        console.log(error)
        console.log("该子分类无数据，请选择其他子分类\n")
        this.selectChildCategory(parentIndex, parentCategory)
      }
    })
  }
}
module.exports = {
  ParseCategory
}
