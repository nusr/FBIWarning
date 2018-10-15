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
const fs = require("fs");
// 路径操作
const path = require("path");
// 解析 url
const querystring = require("querystring");
// 命令行交互
const readline = require("readline");
// 第三方依赖包
// 请求
const request = require("request");
// 解析 dom
const cheerio = require("cheerio");
// 中文编码
const iconv = require("iconv-lite");
// 代理
const Agent = require("socks5-http-client/lib/Agent");
// 提高下载并发量
const async = require("async");
const COMMON_CONFIG = require("./config");
let categoryList = {}; // 所有分类
try {
  categoryList = require("../json/categoryConfig.json");
} catch (error) {}
const log = info => {
  console.log(info);
};
/**
 * 基础类
 */
class BaseSpider {
  constructor() {
    this.generateDirectory(COMMON_CONFIG.tableList);
    this.generateDirectory(COMMON_CONFIG.result);
    this.startTime = "";
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
    log("爬取总共耗时： " + seconds + " 秒", true);
  }
  /**
   * 更新分类数据
   */
  updateCategoryList() {
    let links = Object.keys(categoryList);
    if (links.length < 1) {
      return;
    }
    this.updateJsonFile(categoryList, COMMON_CONFIG.categoryConfig, false);
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
    return value == null || !(Object.keys(value) || value).length;
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
    } else {
      jsonData = JSON.stringify(data);
    }
    fs.writeFile(filePath, jsonData, err => {});
  }
  /**
   * 读取 json 文件
   * @param {String} filePath 文件路径
   */
  readJsonFile(filePath) {
    try {
      let data = fs.readFileSync(filePath);
      data = data ? JSON.parse(data) : null;
      return data;
    } catch (error) {
      return null;
    }
  }
  /**
   *生成目录
   * @param {String} dirPath 目录路径
   */
  generateDirectory(dirPath) {
    try {
      if (dirPath && !fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
    } catch (err) {
      log(err);
    }
  }
  /**
   * 获取请求配置
   * @param {String} url 链接
   */
  getRequestOptions(url) {
    if (!url || url.startsWith("https")) {
      return false;
    }
    let options = {
      url,
      headers: {
        "User-Agent": COMMON_CONFIG.userAgent
      },
      agentClass: Agent,
      agentOptions: COMMON_CONFIG.socks
    };
    return options;
  }
  /**
   * 下载图片和种子
   * @param {String} filePath // 文件夹
   * @param {String} torrents // 种子链接
   * @param {String} images // 图片链接
   */
  async downloadResult(filePath, torrents = [], images = []) {
    let directory = filePath.slice(0, -5);
    // 有种子文件才下载
    if (this.isEmpty(torrents)) {
      return false;
    }
    try {
      await this.generateDirectory(directory);
      for (let i = 0; i < torrents.length; i++) {
        await this.downloadTorrent(directory, torrents[i]);
      }
      for (let i = 0; i < images.length; i++) {
        let item = images[i];
        let imgPath = directory + "/" + i + 1 + "" + path.extname(item);
        await this.downloadFile(item, imgPath);
      }
    } catch (error) {
      log(error);
    }
  }
  /**
   * 下载文件
   * @param {String} url 请求链接
   * @param {String} filePath 文件路径
   */
  downloadFile(url, filePath, useProxy = true) {
    // 防止一个请求出错，导致程序终止
    try {
      let options = this.getRequestOptions(url, useProxy);
      if (!filePath || !options) {
        return false;
      }
      request.get(options).pipe(fs.createWriteStream(filePath));
    } catch (error) {
      log(error);
    }
  }
  /**
   * 下载种子链接
   * @param {String} childDir // 子目录
   * @param {String} downloadUrl  // 下载种子地址
   */
  downloadTorrent(childDir, downloadUrl, useProxy = true) {
    // 防止一个请求出错，导致程序终止
    try {
      // 解析出链接的 code 值
      let code = querystring.parse(downloadUrl.split("?").pop()).ref;
      let options = this.getRequestOptions(COMMON_CONFIG.torrent, useProxy);
      if (!code || !childDir || !options) {
        return false;
      }
      options.formData = {
        code
      };
      // 发出 post 请求，然后接受文件即可
      request
        .post(options)
        .pipe(fs.createWriteStream(childDir + "/" + code + ".torrent"));
    } catch (error) {
      log(error);
    }
  }
  /**
   * 请求页面
   * @param {String} requestUrl 请求页面
   */
  requestPage(requestUrl, useProxy = true) {
    try {
      return new Promise((resolve, reject) => {
        let options = this.getRequestOptions(requestUrl, useProxy);
        if (!requestUrl || !options) {
          resolve(false);
        }
        options = Object.assign(options, {
          // 去掉编码，否则解码会乱码
          encoding: null
        });
        request.get(options, function(err, response, body) {
          // 防止解析报错
          try {
            // 统一解决中文乱码的问题
            let content = iconv.decode(body, "gbk");
            let $ = cheerio.load(content);
            resolve($, err, response, body, content);
          } catch (error) {
            // log(error)
            resolve(null);
          }
        });
      });
    } catch (error) {
      // log(error)
      //如果连续发出多个请求，即使某个请求失败，也不影响后面的其他请求
      Promise.resolve(null);
    }
  }
}
/**
 * 解析列表页
 */
class ParseTableList extends BaseSpider {
  constructor(categoryIndex, parseAllCategory, parseListUrl, currentCategory) {
    super();
    this.tableList = {}; // 当前分类下的列表页
    this.parseAllCategory = parseAllCategory || false; // 是否解析所有分类
    this.parseListUrl = parseListUrl || ""; // 是否解析子分类
    this.categoryIndex = categoryIndex || 0; // 解析的 url
    this.jsonPath = ""; // 列表页结果路径
    this.currentCategory = currentCategory || ""; //当前分类
    this.currentPage = 1; //当前页数
  }
  /**
   * 入口
   */
  recursionExecutive() {
    if (this.categoryIndex >= Object.keys(categoryList).length) {
      log("全部爬取完毕！");
      return false;
    }
    this.parseListUrl = this.parseListUrl || this.currentCategory;
    this.jsonPath =
      COMMON_CONFIG.tableList +
      "/" +
      this.parseListUrl.match(/[a-zA-Z0-9]/gi).join("") +
      ".json";
    this.tableList = this.readJsonFile(this.jsonPath) || {};
    let parentDir =
      COMMON_CONFIG.result + "/" + categoryList[this.currentCategory].title;
    this.generateDirectory(parentDir);
    this.innerRecursion();
  }
  /**
   * 获取列表页面的结束页面
   */
  getEndPage() {
    let parseListUrl = this.parseListUrl;
    if (categoryList[parseListUrl]) {
      return categoryList[this.currentCategory].endPage;
    } else {
      let childCategory = categoryList[this.currentCategory].childCategory;
      let item = childCategory.find(item => item.link === parseListUrl);
      return Math.max(item.endPage, COMMON_CONFIG.connectTasks);
    }
  }
  /**
   * 列表页面请求
   */
  async innerRecursion() {
    this.startTimeCount();
    log("爬取列表中...");
    let connectTasks = COMMON_CONFIG.connectTasks;
    let endPage = ~~this.getEndPage();

    let currentPage = this.currentPage;
    if (this.currentPage >= endPage) {
      this.endInnerRecursion();
      return false;
    }
    let pageLimit = Math.min(endPage, currentPage + connectTasks);
    let requestUrls = [];
    for (let i = currentPage; i <= pageLimit; i++) {
      let requestUrl = COMMON_CONFIG.baseUrl + this.parseListUrl;
      if (i > 1) {
        requestUrl += "&page=" + i;
      }
      requestUrls.push(requestUrl);
    }
    try {
      // 并发请求
      async.mapLimit(
        requestUrls,
        COMMON_CONFIG.connectTasks,
        async url => {
          return this.requestPage(url);
        },
        (err, results) => {
          let detailLinks = [];
          if (!err) {
            for (let result of results) {
              if (result) {
                let links = this.parseHtml(result);
                detailLinks = [...detailLinks, ...links];
              }
            }
          } else {
            log(err);
          }
          detailLinks = this.filterRepeat(detailLinks);
          this.getDetailPage(detailLinks);
        }
      );
    } catch (error) {
      log(error);
      this.currentPage += COMMON_CONFIG.connectTasks;
      this.innerRecursion();
    }
  }
  /**
   * 请求详情页面
   * async 配合 await 会将同步变成异步过程
   * @param {Array} detailLinks 详情页面链接
   */
  async getDetailPage(detailLinks) {
    log("爬取种子中...");
    try {
      let tableList = this.tableList;
      let requestUrls = [];
      let getDirectory = link => {
        return (
          COMMON_CONFIG.result +
          "/" +
          categoryList[this.currentCategory].title +
          "/" +
          link.replace(/\//gi, "_")
        );
      };
      for (let link of detailLinks) {
        let directory = getDirectory(link);
        // 详情页已经爬取了,直接下载种子
        if (tableList[link] && tableList[link].title) {
          // log(tableList[link].torrents);
          await this.downloadResult(
            directory,
            tableList[link].torrents,
            tableList[link].images
          );
        } else {
          requestUrls.push(link);
        }
      }
      // 并发请求
      async.mapLimit(
        requestUrls,
        COMMON_CONFIG.connectTasks,
        async url => {
          return this.requestPage(COMMON_CONFIG.baseUrl + url);
        },
        (err, results) => {
          if (!err) {
            for (let i = 0; i < results.length; i++) {
              let result = results[i];
              let link = requestUrls[i];
              if (result) {
                this.parseDetailHtml(result, link, getDirectory(link));
              }
            }
          } else {
            log(err);
          }
          this.currentPage += COMMON_CONFIG.connectTasks;
          this.endTimeCount();
          this.innerRecursion();
        }
      );
    } catch (error) {
      log(error);
      this.currentPage += COMMON_CONFIG.connectTasks;
      this.endTimeCount();
      this.innerRecursion();
    }
  }
  /**
   * 判断是否爬取所有分类的列表页面
   */
  endInnerRecursion() {
    if (this.parseAllCategory) {
      this.currentPage = 1;
      this.categoryIndex++;
      this.currentCategory = Object.keys(categoryList)[this.categoryIndex];
      this.recursionExecutive();
    } else {
      log("爬取完毕！");
    }
  }
  /**
   * 解析列表页面
   * @param {Object} $   cheerio 对象
   */
  parseHtml($) {
    let tableDom = $("#ajaxtable tr");
    let detailLinks = [];
    let tableList = this.tableList;
    tableDom.each(function() {
      // 详情页面链接
      let link = $(this)
        .find("h3")
        .eq(0)
        .find("a")
        .attr("href");
      let tdDom = $(this).find("td");
      let createTime = tdDom
        .eq(5)
        .find("a")
        .text()
        .trim();
      if (link) {
        let temp = {
          reply: ~~tdDom.eq(3).text(), // 回复
          popular: ~~tdDom.eq(4).text(), // 人气
          createTime, // 创建时间
          images: [],
          torrents: []
        };
        detailLinks.push(link);
        tableList[link] = temp;
      }
    });
    this.updateTableList();
    return detailLinks;
  }
  /**
   * 解析详情页面
   * @param {Object} $ cheerio 对象
   * @param {String} seed  详情页链接
   * @param {String} directory  种子保存文件夹
   */
  parseDetailHtml($, seed, directory) {
    let torrents = [];
    /**
     * 获取页面上的每一个链接
     * 不放过任何一个种子，是不是很贴心！！
     */
    $("body a").each(function() {
      let href = $(this).attr("href");
      if (href && COMMON_CONFIG.seedSite.some(item => href.includes(item))) {
        torrents.push(href);
      }
    });
    // 去重
    torrents = this.filterRepeat(torrents);
    let images = [];
    // 限制图片范围，否则无关图片很多
    $("#td_tpc img").each(function() {
      let src = $(this).attr("src");
      if (src && src.startsWith("http")) {
        images.push(src);
      }
    });
    images = this.filterRepeat(images);
    // title 字段非空，可以在下次不用爬取该页面，直接下载种子文件
    let title =
      $("#td_tpc h1")
        .eq(0)
        .text() || "已经爬取了";
    // 存放爬取结果，下次直接下载种子文件
    this.tableList[seed] = Object.assign(this.tableList[seed], {
      title,
      torrents,
      images
    });
    this.updateTableList();
    this.downloadResult(directory, torrents, images);
  }
  /**
   * 更新列表数据
   */
  updateTableList() {
    let links = Object.keys(this.tableList);
    if (links.length < 5) {
      return;
    }
    this.updateJsonFile(this.tableList, this.jsonPath, false);
  }
}

/**
 * 解析分类
 */
class ParseCategory extends BaseSpider {
  constructor() {
    super();
  }
  /**
   * 入口
   */
  recursionExecutive() {
    try {
      this.requestPage(COMMON_CONFIG.baseUrl).then($ => {
        if ($) {
          this.parseHtml($);
        } else {
          this.requestFailure();
        }
      });
    } catch (error) {
      log(error);
      this.requestFailure();
    }
  }
  /**
   * 请求测试失败！
   */
  requestFailure() {
    let socks = COMMON_CONFIG.socks;
    let text = `
    ------------------------------------------------------------\n
    ------------代理${socks.socksHost} : ${
      socks.socksPort
    }不可用!!!-----------------\n
    ------------代理配置错误，一定要配置代理!!!-----------------\n
    -----------------------------------------------------------`;

    log(text);
  }
  /**
   * 代理测试成功
   */
  requestSuccess() {
    log("代理测试通过!!!");
  }
  /**
   * 解析分类页面
   * @param {Object} $ cheerio 对象
   */
  parseHtml($) {
    let categoryDom = $("#cate_3 tr");
    categoryDom.each(function() {
      let titleDom = $(this)
        .find("h3")
        .eq(0)
        .find("a");
      // path.basename 去掉链接中无用的字符
      let link = path.basename(titleDom.attr("href") || "");
      let title = titleDom.text() || "分类名为空";
      let theme = ~~$(this)
        .find("td")
        .eq(1)
        .find("span")
        .text();
      let article = ~~$(this)
        .find("td")
        .eq(2)
        .find("span")
        .text();
      // 每次启动都刷新列表，与网站保持同步
      if (link && title) {
        categoryList[link] = {
          link, // 链接
          title, // 标题
          theme, // 主题 ,即总的列表数量 判断网站更新数据了的重要依据
          article, // 文章
          endPage: ~~(theme / COMMON_CONFIG.pageSize),
          childCategory: [] // 子类型
        };
      }
    });

    this.requestSuccess();
    let links = Object.keys(categoryList);
    async.mapLimit(
      links,
      COMMON_CONFIG.connectTasks,
      async url => {
        return this.requestPage(COMMON_CONFIG.baseUrl + url);
      },
      (err, results) => {
        if (!err) {
          for (let i = 0; i < results.length; i++) {
            let result = results[i];
            let link = links[i];
            if (result) {
              this.parseChildCategory(result, link);
            }
          }
        } else {
          log(err);
        }
        this.updateCategoryList();
        this.selectCategory();
      }
    );
  }
  /**
   * 获取总页数
   */
  getEndPage($) {
    let trsLen = 0;
    try {
      let trs = $("#ajaxtable tr");
      trsLen = trs.length;
      let nums = $("#main .pages")
        .eq(0)
        .text()
        .match(/[0-9/]/gi);
      let endPage = [];
      let index = nums.findIndex(item => item === "/");
      for (++index; index < nums.length; index++) {
        endPage.push(nums[index]);
      }
      endPage = endPage.join("");
      // log(endPage);
      return ~~endPage;
    } catch (error) {
      return trsLen > 0;
    }
  }
  parseChildCategory($, currentCategory) {
    let childDom = $("#ajaxtable th").find("a");
    let childCategory = [];
    // 获取列表页分页的总页数
    let endPage = ~~this.getEndPage($);

    childDom.each(function() {
      let link = $(this).attr("href");
      let text = $(this).text();
      if (link && !categoryList[link] && !link.includes("notice")) {
        childCategory.push({
          link,
          title: text,
          endPage: COMMON_CONFIG.connectTasks
        });
      }
    });
    categoryList[currentCategory].endPage = Math.max(
      categoryList[currentCategory].endPage,
      endPage
    );
    categoryList[currentCategory].childCategory = childCategory;
  }
  /**
   * 选择爬取的大分类
   */
  selectCategory() {
    const instance = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let links = Object.values(categoryList);
    let text = links.map((item, index) => {
      return index + 1 + ". " + item.title;
    });
    text.push(`请输入 1~${links.length},回车或者输入非法值解析所有分类?`);
    instance.question(text.join("\n") + ":  ", answer => {
      let value = parseInt(answer);
      let index = value - 1;
      if (value <= links.length && value >= 1) {
        instance.close();
        this.selectChildCategory(index, links[index]);
      } else {
        log("解析所有分类");
        index = 0;
        new ParseTableList(
          index,
          true,
          links[index].link,
          links[index].link
        ).recursionExecutive();
        instance.close();
      }
      instance.close();
    });
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
    });
    let childCategory = parentCategory.childCategory;
    let text = childCategory.map((item, index) => {
      return index + 1 + ". " + item.title;
    });
    text.push(
      `请输入 1~${childCategory.length},回车或者输入非法值解析整个分类?`
    );
    instance.question(text.join("\n") + ":  ", answer => {
      let value = parseInt(answer);
      log(answer);
      let index = value - 1;
      if (value <= childCategory.length && value >= 1) {
        log("解析" + childCategory[index].title);
        let link = childCategory[index].link;
        this.requestPage(COMMON_CONFIG.baseUrl + link)
          .then($ => {
            let endPage = ~~this.getEndPage($);
            if (endPage < 1) {
              log("该子分类无数据，请选择其他子分类\n");
              instance.close();
              this.selectChildCategory(parentIndex, parentCategory);
            } else {
              childCategory[index].endPage = endPage;
              this.updateCategoryList();
              log(endPage);
              instance.close();
              new ParseTableList(
                parentIndex,
                false,
                link,
                parentCategory.link
              ).recursionExecutive();
            }
          })
          .catch(error => {
            log(error);
            log("该子分类无数据，请选择其他子分类\n");
            instance.close();
            this.selectChildCategory(parentIndex, parentCategory);
          });
      } else {
        log("解析整个分类");
        new ParseTableList(
          parentIndex,
          false,
          parentCategory.link,
          parentCategory.link
        ).recursionExecutive();
        instance.close();
      }
      instance.close();
    });
  }
}
module.exports = {
  ParseTableList,
  ParseCategory
};
