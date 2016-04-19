'use static'
var express = require('express');
var args = process.argv.join('|');
console.log(process.argv,'||||||')
var port = /\-\-port\|(\d+)(?:\||$)/.test(args) ? ~~RegExp.$1 : 8080;
var api = /\-\-api\|(.*?)(?:\||$)/.test(args) ? RegExp.$1 : 'dev6.{{site}}.com.cn:8002';
var https = /\-\-https\|(true)(?:\||$)/.test(args) ? !!RegExp.$1 : false;
var path = require('path');
var DOCUMENT_ROOT = path.resolve(/\-\-root\|(.*?)(?:\||$)/.test(args) ? RegExp.$1 : process.cwd());
// var DOCUMENT_ROOT = path.resolve(DOCUMENT_ROOT,'dev')
var bodyParser = require('body-parser')
var serveIndex = require('serve-index')
var app = express();
var cmsRouter = require('./cms.js')(api)


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

const request = require('request')
app.use(cmsRouter)
app.use(function(req,res,next){
  'use strict'
  if(req.path === '/cmsapi')return next()
  let obj  = path.parse(req.path)
  let type = obj.ext.slice(1)
  console.log(/^[^\_]*?\_[^\_]*?\.html$/.test(obj.base),obj.base)
  if(!/^[^\_]*?\_[^\_]*?\.html$/.test(obj.base) && /^[^\_]*?\.html$/.test(obj.base)){
    let _path = obj.dir.split('/')
    let mapPath = path.join(DOCUMENT_ROOT,obj.dir.replace(/\/page\//,'/map/'),'../map.json')
    new Promise(function(resolve,reject){
      fs.readFile(mapPath,(err,data)=>{
        if(err)return reject(err);
        resolve(JSON.parse(''+data).res)
      })
    }).then(function(data){
      let _fileName = obj.name.replace(/(.*?)\_[^\_]*?\.html/,'$1')
      let _name = `${_path[4]}:page/${_fileName}/${_fileName}.html`
      return new Promise((resolve,reject) => {
        fs.readFile(path.join(DOCUMENT_ROOT,data[_name].extras.path),(err,data) => {
          console.log(err,'!!--------------------')
          if(err)return reject(err);
          res.type(type);
          // res.end(data);
          next(data)
        })
      })
    }).catch(function(err){
      // res.json({error:err}||{'error':obj})
      console.log(err)
      next();
    })
  }else{
    next('__NO_CONTENT__')
    console.log('nextn\n')
  }
  // if(type === 'html')
})
app.use(require('./p.js')(DOCUMENT_ROOT,api))
// app.use(function(req,res,next){
//   'use strict'
//     console.log('cms ---------------------')
//   let type = path.extname(req.path).slice(1)
//   console.log(req.query)
//   console.log(req.params)
//   console.log(type)
//   if(type === 'html' && req.query.cms === 'true'){

//     let content = ''+fs.readFileSync(path.join(DOCUMENT_ROOT,req.path))
//     // console.log(content.replace(/\r|\n/g,'').replace(/.*?\<\%\-\-cms_config\-\-\%\>(.*?)\<\%\-\-\/cms_config\-\-\%\>.*/gim,'$1'))
//     let config  = new Function('return '+content.replace(/\r|\n/g,'').replace(/.*?\<\%\-\-cms_config\-\-(.*?)\-\-\/cms_config\-\-\%\>.*/gim,'$1'))()
//     config.content = content
//     console.log('cms ---------------------',req.path)
//     // console.log(''+iconv.encode(, "GB2312"))
//     console.log(config)
//     // str = iconv.decode(new Buffer([0x68, 0x65, 0x6c, 0x6c, 0x6f]), 'win1251');
//     request.post({
//       url:'http://192.168.51.118:8004/remotePreview2.jsp',
//       form: config
//     },  (e, r, body) => {
//       body && res.type(type),res.end(body)
//       e && res.json(e)
//     })
//   }else{
//     next()
//   }
// })


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
  var root = path.join(DOCUMENT_ROOT,urls[0])
  var contents = []
  ext = path.extname(req.originalUrl);
  if(ext)res.type(ext.slice(1));
  files.forEach(function (file) {
      // if (fileCache.hasOwnProperty(file)) return contents.push(fileCache[file]);
      if (isMalicious(file)) return console.error('[combo] malicious file: ' + file);
      var filePath = path.join(root, file),
          content;
      try {
          content = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
          console.error('[combo] cannot read file: ' + filePath + '\n', e.stack);
          content = ''
      }
      if (content !== void 0) contents.push(content);
  })
  rs = contents.join('\n');
  if (contents.length !== files.length) {
      console.error('[combo] some files not found',files,contents);
  }
  res.send(rs);
})
app.use('/', serveIndex(DOCUMENT_ROOT))
// 静态文件输出
app.use('/', express.static(DOCUMENT_ROOT, {
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
