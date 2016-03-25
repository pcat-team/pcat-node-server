
const request = require('request')
const fs = require('fs')
const path = require('path')

module.exports = function(ROOT,api){

  function preview(lastBody,req,res,next){
    'use strict'
    let type = path.extname(req.path).slice(1)
    let noContent = lastBody === '__NO_CONTENT__'
    console.log(req.query)
    console.log(req.params)
    console.log(type)
    // if()return next();
    console.log(req.query.cms,'  -> :req.query.cms')
    if(type === 'html' && req.query.cms !== void(0)){
      let content = noContent ? (''+fs.readFileSync(path.join(ROOT,req.path))) : (''+lastBody)
      if(!content)return next();
      let _content = content.replace(/\/\/.*?[\r\n]/gmi,'').replace(/\r|\n/gm,'').replace(/.*?\<\%\-\-cms_config\-\-(.*?)\-\-\/cms_config\-\-\%\>.*/gim,'$1')
      let config = new Function('return '+_content)().preview
      // console.log(content.replace(/\r|\n/g,'').replace(/.*?\<\%\-\-cms_config\-\-\%\>(.*?)\<\%\-\-\/cms_config\-\-\%\>.*/gim,'$1'))
      // let config  = new Function('return '+content.replace(/\r|\n/g,'').replace(/.*?\<\%\-\-cms_config\-\-(.*?)\-\-\/cms_config\-\-\%\>.*/gim,'$1'))()
      config.content = content
      config.fromCache = req.query.cms === 'nocache' ? 'n' : 'y'
      config.charsetName = 'utf-8'
      console.log('cms ---------------------',req.path)
      // console.log(''+iconv.encode(, "GB2312"))
      console.log(config)
      // str = iconv.decode(new Buffer([0x68, 0x65, 0x6c, 0x6c, 0x6f]), 'win1251');
      request.post({
        url:`http://${api}/admin/template/remotePreview.jsp`,
        form: config
      },  (e, r, body) => {
        body && res.type(type),res.end(body)
        e && res.json(e)
      })
    }else{
      noContent ? next() : res.end(lastBody)
    }
  }
  return preview
}