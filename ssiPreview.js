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



                var virtual = /<!--#include\svirtual="([^"]+)"\s*-->/gim;

                content = content.replace(virtual, function(ret, src) {
                    
                        var p =  preview(src) || ret;

                        return p;

                });


                var file = /<%@\s*include\s*file="([^"]+)"\s*%>/gim;


                content = content.replace(file, function(ret, src) {

                    if (src) {

                        var p =  preview(src) || ret;

                        return p;

                    }

                });



                res.send(content);


                // next();

            }
        })


        function preview(src) {
            var data;
            var ssiDir = path.resolve(_root, "_ssi", "." + src)

            try {
                data = fs.readFileSync(ssiDir)

            } catch (err) {

                data =  "";
            }


            return data;
        }


    } else {
        next();
    }


});


module.exports = function(root) {
    _root = root;
    return router;
};