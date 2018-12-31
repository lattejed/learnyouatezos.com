
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const fm = require('front-matter')
const ejs = require('ejs')
const sd = require('showdown')
const config = require('./config')

try {
  fse.emptyDirSync(config.wwwDir)
} catch (err) {
  console.log('[ERROR] Cannot empty ' + config.wwwDir)
  process.exit(1)
}

try {
  fse.copySync(config.staticDir, path.join(config.wwwDir, 'static'))
} catch (err) {
  console.log('[ERROR] Cannot copy static files ' + err)
  process.exit(1)
}

let ps = config.pages.map((page) => {
  let context = {}
  let md = fs.readFileSync(path.join(config.pagesDir, page)).toString('utf8')
  let parsed = fm(md)
  Object.assign(context, config, {page: parsed.attributes})
  let basepath = path.join(config.templatesDir, context.page.template + '.ejs')
  context.page.content = new sd.Converter().makeHtml(parsed.body)
  context.page.slug = context.page.title.toLowerCase().replace(/\W+/g, '-') + '.html'
  context.page.date = context.page.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  return ejs.renderFile(basepath, context, {}).then((html) => {
    context.page.html = html
    return Promise.resolve(context)
  })
})

Promise.all(ps).then((pages) => {
  pages.forEach((context) => {
    let outpath = path.join(config.wwwDir, context.page.slug)
    fs.writeFileSync(outpath, context.page.html)
  })
  let context = Object.assign(config, {pages: pages})
  let basepath = path.join(config.templatesDir, 'index.ejs')
  return ejs.renderFile(basepath, context, {}).then((html) => {
    return Promise.resolve(html)
  })
}).then((index) => {
  let outpath = path.join(config.wwwDir, 'index.html')
  fs.writeFileSync(outpath, index)
}).catch((err) => {
  console.log('[ERROR] Cannot process page ' + err)
  process.exit(1)
})
