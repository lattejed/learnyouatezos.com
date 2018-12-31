
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
  Object.assign(context, parsed, parsed.attributes)
  context.content = new sd.Converter().makeHtml(context.body)
  let basepath = path.join(config.templatesDir, context.template + '.ejs')
  let slug = context.title.toLowerCase().replace(/\W+/g, '-') + '.html'
  return ejs.renderFile(basepath, context, {}).then((html) => {
    return Promise.resolve({html: html, slug: slug})
  })
})

Promise.all(ps).then((pages) => {
  pages.forEach((page) => {
    let outpath = path.join(config.wwwDir, page.slug)
    fs.writeFileSync(outpath, page.html)
  })

  let context = Object.assign({}, config)

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
