const path = require('path')
const fs = require('fs')
const CWD = process.cwd()

try {
  var config = JSON.parse(fs.readFileSync(CWD + '/config.json'))
} catch (err) {
  console.log('[ERROR] Invalid configuration file ' + err)
  process.exit(1)
}

config.templatesDir = path.join(CWD, config.templatesDir)
config.pagesDir = path.join(CWD, config.pagesDir)
config.wwwDir = path.join(CWD, config.wwwDir)
config.staticDir = path.join(CWD, config.staticDir)

config.pages = fs.readdirSync(path.join(config.pagesDir))
  .filter((page) => { return /\.md$/.test(page) })

if (config.pages.length < 1) {
  console.log('[ERROR] No pages to process')
  process.exit(1)
}

module.exports = config
