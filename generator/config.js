const path = require('path')
const fs = require('fs')
const CWD = process.cwd()

try {
  var config = JSON.parse(fs.readFileSync(CWD + '/config.json'))
  if (!config.templatesDir || !config.pagesDir) {
    throw 'Bad config file'
  }
} catch (err) {
  console.log('[ERROR] Invalid configuration file')
  process.exit(1)
}

const templatesDir = path.join(CWD, config.templatesDir)
const pagesDir = path.join(CWD, config.pagesDir)

let pages = fs.readdirSync(path.join(pagesDir))
  .filter((page) => { return /\.md$/.test(page) })

if (pages.length < 1) {
  console.log('[ERROR] No pages to process')
  process.exit(1)
}

module.exports = {
  templatesDir: templatesDir,
  pagesDir: pagesDir,
  pages: pages
}
