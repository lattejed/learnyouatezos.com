const path = require('path')
const fs = require('fs')
const CWD = process.cwd()

try {
  var config = JSON.parse(fs.readFileSync(CWD + '/config.json'))
  if (!config.templatesDir || !config.pagesDir
    || !config.wwwDir || !config.staticDir) {
    throw 'Bad config file'
  }
} catch (err) {
  console.log('[ERROR] Invalid configuration file ' + err)
  process.exit(1)
}

const templatesDir = path.join(CWD, config.templatesDir)
const pagesDir = path.join(CWD, config.pagesDir)
const wwwDir = path.join(CWD, config.wwwDir)
const staticDir = path.join(CWD, config.staticDir)

let pages = fs.readdirSync(path.join(pagesDir))
  .filter((page) => { return /\.md$/.test(page) })

if (pages.length < 1) {
  console.log('[ERROR] No pages to process')
  process.exit(1)
}

module.exports = {
  templatesDir: templatesDir,
  pagesDir: pagesDir,
  wwwDir: wwwDir,
  staticDir: staticDir,
  pages: pages
}
