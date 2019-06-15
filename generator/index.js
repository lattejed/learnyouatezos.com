const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const util = require('util')
const fm = require('front-matter')
const ejs = require('ejs')
const sd = require('showdown')
const highlight = require('showdown-highlight')
const site = require('./config')
const sectionRe = /^##[^#]+/

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

site.pages.sort()
site.indexPath = 'index.html'
site.tocPath = 'toc.html'

let pages = site.pages.map((pagePath) => {
  let page = {}
  let mdpath = path.join(site.pagesDir, pagePath)
  let stats = fs.statSync(mdpath)
  var md = fs.readFileSync(mdpath).toString('utf8')
  let sectionHeaders = md.split('\n').map((line) => {
    let m = line.match(sectionRe)
    if (m && m.length) {
      return m[0].trim()
    }
    return null
  }).filter((el) => !!el)
  sectionHeaders.forEach((section) => {
    let title = section.replace('##', '')
    let slug = title.toLowerCase().replace(/\W+/g, '-')
    md = md.replace(section, '<h2 id="' + slug + '">' + title + '</h2>')
  })
  let parsed = fm(md)
  Object.assign(page, parsed.attributes)
  page.content = new sd.Converter({
    extensions: [highlight]
  }).makeHtml(parsed.body)
  page.path = pagePath
  page.slug = page.title.toLowerCase()
    .replace(/\W+/g, '-')
    .replace(/(^-|-$)/, '') + '.html'
  let mtime = new Date(util.inspect(stats.mtime))
  page.updatedAt = mtime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  page.sections = sectionHeaders.map((section) => {
    let title = section.replace('##', '')
    let slug = title.toLowerCase().replace(/\W+/g, '-')
    return {slug: slug, title: title}
  })
  return page
})

if (pages.length) {
  site.firstPageSlug = pages[0].slug
  site.firstPageTitle = pages[0].title
}

let ps = pages.map((page, i) => {

  if (i > 0) {
    page.prevSlug = pages[i - 1].slug
    page.prevTitle = pages[i - 1].title
  }

  if (i < pages.length - 1) {
    page.nextSlug = pages[i + 1].slug
    page.nextTitle = pages[i + 1].title
  }

  let basepath = path.join(site.templatesDir, page.template + '.ejs')
  return ejs.renderFile(basepath, {page: page, site: site}, {}).then((html) => {
    page.html = html
    return Promise.resolve(page)
  })

})

Promise.all(ps).then((pages) => {

  pages.forEach((page) => {
    let outpath = path.join(site.wwwDir, page.slug)
    fs.writeFileSync(outpath, page.html)
  })

  let tocPath = path.join(site.templatesDir, 'toc.ejs')
  let indexPath = path.join(site.templatesDir, 'index.ejs')
  return Promise.all([
    ejs.renderFile(tocPath, {pages: pages, site: site}, {}),
    ejs.renderFile(indexPath, {pages: pages, site: site}, {})
  ])

}).then((html) => {

  fs.writeFileSync(path.join(site.wwwDir, site.tocPath), html[0])
  fs.writeFileSync(path.join(site.wwwDir, site.indexPath), html[1])

}).catch((err) => {

  console.log('[ERROR] Cannot process page ' + err)
  process.exit(1)

})
