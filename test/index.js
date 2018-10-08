/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2019, Steve Xu
 * @license MIT
 * @preserve
 */
const utils = require("../lib/main.js")
;(() => {
  try {
    new utils.ParseCategory().recursionExecutive()
  } catch (error) {
    console.log("代理配置错误，一定要配置代理！！！")
    return false
  }
})()
