/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2018, Steve Xu
 * @license MIT
 * @preserve
 */

/**
 * 爬取数据有两种策略：
 * 1. 爬取所有列表页面的链接后，再去爬取详情页面 图算法广度优先
 * 2. 爬取一部分列表页面，就去爬取详情页面 图算法深度优先
 * 因为是国外网站，网络可能随时断开，所以采用第二种策略比较好
 */
import ParseCategory from "./category";

new ParseCategory();
