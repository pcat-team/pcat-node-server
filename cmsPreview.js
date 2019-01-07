'use strict'
var express = require('express');

var router = express.Router();

router.use(function(req, res, next) {

    // cms预览
    var cms = req.query.cms;

    if (cms) {

        var request = require('request');

        var url = "http://" + (req.headers.host + req.url).replace("cms=" + cms, "")

        request(url, function(error, response, content) {


            if (!error && response.statusCode == 200) {

                if (/.*?\<\%\-\-cms_config\-\-(.*?)\-\-\/cms_config\-\-\%\>.*/gim.test(content.replace(/\/\/.*?[\r\n]/gmi, '').replace(/\r|\n/gm, ''))) {

                    var config = new Function('return ' + RegExp.$1)().preview

                    config.content = content
                    config.fromCache = (cms === 'nocache') ? 'n' : 'y'

                    // 获取或匹配网站名
                    // url格式：/dev/page/pcauto，此方式不严谨，要求通过cms参数指定
                    var site = config.site || req.url.split("/")[3];


                    console.log(req.url)
                    console.log(req.url.split("/"))
                    console.log(site)

                    let subDomain = (site == "geeknev") ? `${site}.com` : `${site}.com.cn`;

                    request.post({
                        url: `http://cms.${subDomain}/admin/template/remotePreview.jsp`,
                        form: config
                    }, (e, r, body) => {
                        // body && res.type(type), res.end(body)
                        res.send(body);
                        // next()
                    })
                } else {
                    next();
                }

            }
        })

    } else {
        next();
    }


});


module.exports = router;