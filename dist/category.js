"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const config_1 = __importDefault(require("./config"));
const base_1 = require("./base");
const list_1 = __importDefault(require("./list"));
const bluebird_1 = __importDefault(require("bluebird"));
/**
 * 解析分类
 */
class ParseCategory extends base_1.BaseSpider {
    constructor() {
        super();
        this.recursionExecutive();
    }
    /**
     * 入口
     */
    recursionExecutive() {
        return __awaiter(this, void 0, void 0, function* () {
            let temp = yield this.requestPage(config_1.default.baseUrl);
            if (temp) {
                this.parseHtml(temp);
            }
            else {
                this.requestFailure();
            }
        });
    }
    /**
     * 请求测试失败！
     */
    requestFailure() {
        if (!this.proxyUrl) {
            console.log('当前网络不能访问种子网站，请配置代理！' + config_1.default.errorText);
        }
        else {
            console.log(`代理${this.proxyUrl}不可用!!!`);
        }
        process.exit();
    }
    /**
     * 代理测试成功
     */
    requestSuccess() {
        console.log("代理测试通过!!!");
    }
    /**
     * 解析分类页面
     * @param {Object} $ cheerio 对象
     */
    parseHtml($) {
        return __awaiter(this, void 0, void 0, function* () {
            let categoryDom = $("#cate_3 tr");
            let categoryList = this.categoryList;
            categoryDom.each(function () {
                let titleDom = $(this)
                    .find("h3")
                    .eq(0)
                    .find("a");
                // path.basename 去掉链接中无用的字符
                let link = path_1.default.basename(titleDom.attr("href") || "");
                let title = titleDom.text() || "分类名为空";
                let theme = ~~$(this)
                    .find("td")
                    .eq(1)
                    .find("span")
                    .text();
                let endPage = ~~(theme / config_1.default.pageSize);
                // 每次启动都刷新列表，与网站保持同步
                if (link && title) {
                    categoryList[link] = {
                        link,
                        title,
                        theme,
                        endPage,
                        childCategory: [] // 子类型
                    };
                }
            });
            this.requestSuccess();
            let links = Object.keys(categoryList);
            if (this.isEmpty(links)) {
                this.requestFailure();
                return;
            }
            bluebird_1.default.map(links, (url) => __awaiter(this, void 0, void 0, function* () {
                return yield this.requestPage(config_1.default.baseUrl + url);
            }), {
                concurrency: config_1.default.connectTasks
            }).then((results) => {
                for (let i = 0; i < links.length; i++) {
                    this.parseChildCategory(results[i], links[i]);
                }
                this.updateCategoryList();
                this.selectCategory();
            });
        });
    }
    /**
     * 更新分类数据
     */
    updateCategoryList() {
        this.updateJsonFile(this.categoryList, config_1.default.categoryConfig, true);
    }
    /**
     * 获取总页数
     */
    getEndPage($) {
        let trsLen = 0;
        try {
            let trs = $("#ajaxtable tr");
            trsLen = trs.length;
            let number = $("#main .pages")
                .eq(0)
                .text()
                .match(/[0-9/]/gi);
            let endPage = [];
            let index = number.findIndex((v) => v === "/");
            for (++index; index < number.length; index++) {
                endPage.push(number[index]);
            }
            let realPage = endPage.join("");
            // log(trsLen)
            if (trsLen > 5) {
                return ~~realPage;
            }
            else {
                return 0;
            }
        }
        catch (error) {
            return trsLen > 5;
        }
    }
    /**
     * 解析子分类
     * @param {Object} $ cheerio
     * @param {String} category  所属分类
     */
    parseChildCategory($, category) {
        if (!$) {
            return false;
        }
        let childDom = $("#ajaxtable th").find("a");
        let childCategory = [];
        let categoryList = this.categoryList || {};
        childDom.each(function () {
            let link = $(this).attr("href");
            let text = $(this).text();
            let checkLink = link && !categoryList[link] && !link.includes("notice");
            if (checkLink) {
                childCategory.push({
                    link,
                    title: text,
                    endPage: 0
                });
            }
        });
        let endPage = Math.max(config_1.default.connectTasks, ~~this.getEndPage($));
        categoryList[category] = Object.assign({}, categoryList[category], {
            endPage,
            childCategory
        });
    }
    /**
     * 选择爬取的大分类
     */
    selectCategory() {
        const instance = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let categoryList = this.categoryList;
        let links = Object.values(categoryList);
        let text = [];
        links.forEach((item, index) => {
            if (item.title) {
                text.push(index + 1 + ". >>> " + item.title);
            }
        });
        text.push(`请输入 1~${text.length},回车或者输入非法值解析所有分类?: `);
        let realText = text.join("\n");
        instance.question(realText, answer => {
            let value = parseInt(answer);
            let index = value - 1;
            instance.close();
            if (value > links.length || value < 1) {
                // log("解析所有分类")
                index = 0;
                new list_1.default(index, true, links[index].link, categoryList);
                return false;
            }
            // 页数太少，直接解析整个分类
            if (links[index].endPage <= config_1.default.connectTasks) {
                new list_1.default(index, false, links[index].link, categoryList);
            }
            else {
                this.selectChildCategory(index, links[index]);
            }
        });
    }
    /**
     * 选择子分类
     * @param {Number} parentIndex 父分类的索引
     * @param {Object} parentCategory 父分类
     */
    selectChildCategory(parentIndex, parentCategory) {
        const instance = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let categoryList = this.categoryList;
        let childCategory = parentCategory.childCategory;
        let text = childCategory.map((item, index) => {
            return index + 1 + ". >>> " + item.title;
        });
        text.push(`请输入 1~${childCategory.length},回车或者输入非法值解析整个分类?`);
        instance.question(text.join("\n") + ": ", (answer) => __awaiter(this, void 0, void 0, function* () {
            let value = parseInt(answer);
            // log(answer)
            let index = value - 1;
            instance.close();
            if (value <= childCategory.length && value >= 1) {
                let link = childCategory[index].link;
                let result = yield this.requestPage(config_1.default.baseUrl + link);
                let endPage = ~~this.getEndPage(result);
                if (endPage < 1) {
                    console.log("该子分类无数据，请选择其他子分类\n");
                    this.selectChildCategory(parentIndex, parentCategory);
                    return;
                }
                childCategory[index].endPage = endPage;
                this.updateCategoryList();
                // console.log(endPage)
                // log("解析" + childCategory[index].title)
                new list_1.default(parentIndex, false, link, categoryList);
            }
            else {
                new list_1.default(parentIndex, false, parentCategory.link, categoryList);
            }
        }));
    }
}
exports.default = ParseCategory;
