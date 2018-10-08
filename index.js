/**
 * @overview
 * @author Steve Xu <1161176156@qq.com>
 * @copyright Copyright (c) 2019, Steve Xu
 * @license MIT
 * @preserve
 */
const utils = require("./lib/main.js")
;(() => {
  try {
    new utils.ParseCategory().selectMaxPage()
  } catch (error) {
    console.log(error)
    return false
  }
})()
