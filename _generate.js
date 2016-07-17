
var process = require('process');
var fs = require('fs');
var path = require('path');
var PAGES_DIR = 'pages';
var LINKS_BLOCK = /\[\[\s*LINKS\s*\]\]/;
var CONTENT_BLOCK = /\[\[\s*CONTENT\s*\]\]/;

function fail(err) {
    if (err !== undefined) {
        console.log('Error: ' + err);
    }
    console.log('Usage: node generate.js <template.html> <index.html> <*.page.html>');
    process.exit(1);
}

function slugify(str) {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-\.]+/g, '');
}

if (process.argv.length < 5) {
    fail();
}

try {
    var pagesDirPath = path.join(__dirname, PAGES_DIR);
    fs.mkdirSync(pagesDirPath);
} catch (e) {
    if (e.code !== 'EEXIST') {
        fail(e);
    }
}

try {
    var templatePath = path.join(__dirname, process.argv[2]); 
    var template = fs.readFileSync(templatePath, 'utf8');
    var indexPath = path.join(__dirname, process.argv[3]);
    var index = fs.readFileSync(indexPath, 'utf8'); 
    var pagePaths = process.argv.slice(4);
    pagePaths = pagePaths.sort().reverse();
    var links = [];
    for (var i=0; i<pagePaths.length; i++) {
        var pagePath = pagePaths[i];           
        var parsed = path.parse(pagePath); 
        var slug = slugify(parsed.base);
        links.push('<p><a href="'+path.join(PAGES_DIR, slug)+'">'+parsed.name+'</a></p>');
        var content = fs.readFileSync(path.join(__dirname, pagePath), 'utf8');
        var page = template.replace(CONTENT_BLOCK, content); 
        fs.writeFileSync(path.join(__dirname, PAGES_DIR, slug), page, 'utf8');
    }
    index = index.replace(LINKS_BLOCK, links.join('\n'));
    index = template.replace(CONTENT_BLOCK, index); 
    fs.writeFileSync(path.join(__dirname, 'index.html'), index, 'utf8');
} catch (e) {
    fail(e);
}

