var express = require('express');
var args = process.argv.join('|');
var port = /\-\-port\|(\d+)(?:\||$)/.test(args) ? ~~RegExp.$1 : 8080;
var https = /\-\-https\|(true)(?:\||$)/.test(args) ? !!RegExp.$1 : false;
var path = require('path');
var DOCUMENT_ROOT = path.resolve(/\-\-root\|(.*?)(?:\||$)/.test(args) ? RegExp.$1 : process.cwd());
var DEV_ROOT = path.resolve(DOCUMENT_ROOT,'dev')
var bodyParser = require('body-parser')
var serveIndex = require('serve-index')
var app = express();

// logger
app.use(require('morgan')('short'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// server.conf 功能
// 支持 test/ 目录下面 .js js 脚本功能和 json 预览功能。
// 注意这里面的.js，不是一般的.js 文件，而是相当于 express 的 route.
app.use(require('yog-devtools')({
    view_path: '',    // 避免报错。
    rewrite_file: path.join(DOCUMENT_ROOT, 'config', 'server.conf'),
    data_path: path.join(DOCUMENT_ROOT, 'test')
}));
//combo
var fileCache = {}
var isMalicious = function(filepath) {
    var ext = path.extname(filepath);
    return ext !== '.css' && ext !== '.js' || filepath.indexOf('../') !== -1;
}
app.use('/',function(req,res,next){
  if(!~req.originalUrl.indexOf('??'))return next();
  var urls = req.originalUrl.split('??')
  var files = urls[1].replace(/\&.*/,'').split(',')
  var root = path.join(DEV_ROOT,urls[0])
  var contents = []
  ext = path.extname(req.originalUrl);
  if(ext)res.type(ext.slice(1));
  files.forEach(function (file) {
      if (fileCache.hasOwnProperty(file)) return contents.push(fileCache[file]);
      if (isMalicious(file)) return console.error('[combo] malicious file: ' + file);
      var filePath = path.join(root, file),
          content;
      try {
          content = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
          console.error('[combo] cannot read file: ' + filePath + '\n', e.stack);
      }
      if (content !== void 0) contents.push(fileCache[file] = content);
  })
  rs = contents.join('\n');
  if (contents.length !== files.length) {
      console.error('[combo] some files not found',files,contents);
  }
  res.send(rs);
})
app.use('/', serveIndex(DEV_ROOT))
// 静态文件输出
app.use('/', express.static(DEV_ROOT, {
    index: ['index.html', 'index.htm', 'default.html', 'default.htm'],
    extensions: ['html', 'htm']
}));

// 静态文件列表。
// app.use((function() {
//     var url = require('url');
//     var fs = require('fs');

//     return function(req, res, next) {
//         var pathname = url.parse(req.url).pathname;
//         var fullpath = path.join(DOCUMENT_ROOT, pathname);

//         if (/\/$/.test(pathname) && fs.existsSync(fullpath)) {
//             var stat = fs.statSync(fullpath);

//             if (stat.isDirectory()) {
//                 var html = '';

//                 var files = fs.readdirSync(fullpath);

//                 html = '<!doctype html>';
//                 html += '<html>';
//                 html += '<head>';
//                 html += '<title>' + pathname + '</title>';
//                 html += '</head>';
//                 html += '<body>';
//                 html += '<h1> - ' + pathname + '</h1>';
//                 html += '<div id="file-list">';
//                 html += '<ul>';

//                 if(pathname != '/'){
//                     html += '<li><a href="' + pathname + '..">..</a></li>';
//                 }

//                 files.forEach(function(item) {
//                     var s_url = path.join(pathname, item);
//                     html += '<li><a href="' + s_url + '">'+ item + '</a></li>';
//                 });

//                 html += '</ul>';
//                 html += '</div>';
//                 html += '</body>';
//                 html += '</html>';

//                 res.send(html);
//                 return;
//             }
//         }

//         next();
//     };
// })());

// utf8 support
app.use(function(req, res, next) {

    // attach utf-8 encoding header to text files.
    if (/\.(?:js|json|text|css)$/i.test(req.path)) {
        res.charset = 'utf-8';
    }

    next();
});

// 错误捕获。
app.use(function(err, req, res, next) {
    console.log(err);
});

// Bind to a port
var fs = require('fs');
var path = require('path');
var server;

if (https) {
  server = require('https').createServer({
    key: fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8'),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'), 'utf8'),
  }, app);
} else {
  server = require('http').createServer(app);
}

server.listen(port, '0.0.0.0', function() {
    console.log(' Listening on ' + (https ? 'https' : 'http') + '://127.0.0.1:%d', port);
});

// 在接收到关闭信号的时候，关闭所有的 socket 连接。
(function() {
    var sockets = [];

    server.on('connection', function (socket) {
        sockets.push(socket);

        socket.on('close', function() {
            var idx = sockets.indexOf(socket);
            ~idx && sockets.splice(idx, 1);
        });
    });

    var finalize = function() {
        // Disconnect from cluster master
        process.disconnect && process.disconnect();
        process.exit(0);
    }

    // 关掉服务。
    process.on('SIGTERM', function() {
        console.log(' Recive quit signal in worker %s.', process.pid);
        sockets.length ? sockets.forEach(function(socket) {
            socket.destroy();
            finalize();
        }): server.close(finalize);
    });
})(server);
