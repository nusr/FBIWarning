"use strict";
/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 爬取数据有两种策略：
 * 1. 爬取所有列表页面的链接后，再去爬取详情页面 图算法广度优先
 * 2. 爬取一部分列表页面，就去爬取详情页面 图算法深度优先
 * 因为是国外网站，网络可能随时断开，所以采用第二种策略比较好
 */
const category_1 = __importDefault(require("./category"));
new category_1.default();
//# sourceMappingURL=index.js.map