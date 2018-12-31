
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const fm = require('front-matter')
const ejs = require('ejs')
const sd = require('showdown')
const highlight = require('showdown-highlight')
const site = require('./config')

try {
  fse.emptyDirSync(site.wwwDir)
} catch (err) {
  console.log('[ERROR] Cannot empty ' + site.wwwDir)
  process.exit(1)
}

try {
  fse.copySync(site.staticDir, path.join(site.wwwDir, 'static'))
} catch (err) {
  console.log('[ERROR] Cannot copy static files ' + err)
  process.exit(1)
}

let ps = site.pages.map((pagePath) => {
  let page = {}
  let md = fs.readFileSync(path.join(site.pagesDir, pagePath)).toString('utf8')
  let parsed = fm(md)
  Object.assign(page, parsed.attributes)
  let basepath = path.join(site.templatesDir, page.template + '.ejs')
  page.content = new sd.Converter({
    extensions: [highlight]
  }).makeHtml(parsed.body)
  page.slug = page.title.toLowerCase()
    .replace(/\W+/g, '-')
    .replace(/(^-|-$)/, '') + '.html'
  page.date = page.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  return ejs.renderFile(basepath, {page: page, site: site}, {}).then((html) => {
    page.html = html
    return Promise.resolve(page)
  })
})

Promise.all(ps).then((pages) => {
  pages = pages.sort((a, b) => {
    return a.date - b.date
  })
  pages.forEach((page) => {
    let outpath = path.join(site.wwwDir, page.slug)
    fs.writeFileSync(outpath, page.html)
  })
  let basepath = path.join(site.templatesDir, 'index.ejs')
  return ejs.renderFile(basepath, {pages: pages, site: site}, {})
}).then((html) => {
  let outpath = path.join(site.wwwDir, 'index.html')
  fs.writeFileSync(outpath, html)
}).catch((err) => {
  console.log('[ERROR] Cannot process page ' + err)
  process.exit(1)
})
