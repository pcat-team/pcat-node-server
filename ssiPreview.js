'use strict'
var express = require('express');

var path = require("path");

var router = express.Router();

var _root;

var fs = require('fs')



// var tempPath = fis.project.getTempPath();

// var ssiDir = path.resolve(tempPath, "www","ssi")

router.use(function(req, res, next) {

    // ssi预览
    var ssi = req.query.ssi;

    if (ssi) {

        var request = require('request');

        var url = "http://" + (req.headers.host + req.url).replace("ssi=" + ssi, "")

        request(url, function(error, response, content) {


            if (!error && response.statusCode == 200) {

                // console.log(content)



                var fileReg = /<!--#include\svirtual="([^"]+)"\s*-->/gim;


                content = content.replace(fileReg, function(ret, src) {

                    // console.log(ret)
                    // console.log(src)

                    var data;
                    var ssiDir = path.resolve(_root, "ssi", "." + src)

                    try {
                        data = fs.readFileSync(ssiDir)

                    } catch (err) {

                      data = src + "不存在！";
                    }


                    return data;
                });

                res.send(content);


                // next();

            }
        })

    } else {
        next();
    }


});


module.exports = function(root) {
    _root = root;
    return router;
};
