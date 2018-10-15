/**
 * @overview
 * @author Steve Xu <stevexugc@gmail.com>
 * @copyright Copyright (c) 2019, Steve Xu
 * @license MIT
 * @preserve
 */
const utils = require("./lib/main.js")
;(() => {
  try {
    // process.argv[2]
    new utils.ParseCategory().recursionExecutive()
  } catch (error) {
    console.log(error)
    return false
  }
  
})()
