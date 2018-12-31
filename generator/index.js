
const path = require('path')
const fs = require('fs')
const {
  pages,
  templatesDir,
  pagesDir
} = require('./config')

pages.forEach((page) => {
  processPage(page)
})

function processPage(page) {
  let md = fs.readFileSync(path.join(pagesDir, page)).toString('utf8')
  try {
    var fmAndC = md.match(/^<!--#([^]+?)-->([^]*)/)
    var fm = JSON.parse(fmAndC[1])
    var content = fmAndC[2] // markdown
    if (!fm.title || !fm.date || !fm.template) {
      throw 'Bad front matter'
    }
  } catch (err) {
    console.log(`[ERROR] Invalid front matter: ${page}`)
    process.exit(1)
  }
  processCommands(fm.template)
}

function processCommands(template) {
  let html = fs.readFileSync(path.join(templatesDir, template)).toString('utf8')
  let cmds = html.match(/<!--#.+?-->/g).map((m) => {
    return {
      slug: m,
      command: m.match(/<!--#(.+?)-->/)[1].trim()
    }
  })
  cmds.forEach((c) => {
    let k = c.command.split(' ')[0]
    let v = c.command.split(' ')[1]
    switch (k) {
      case 'uses':
        console.log('Uses: ' + c.slug)
        processCommands(v)
        break
      case 'include':
        console.log('Include: ' + c.slug)
        break
      default:
    }
  })
}

function uses(template, context) {
  let t = fs.readFileSync(path.join(templatesDir, template)).toString('utf8')
  context['uses'] = t
}

function include(key, context) {

}
