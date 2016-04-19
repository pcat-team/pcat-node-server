'use strict'
const express = require('express')
const request = require('request')
const fs = require('fs')
const path = require('path')

const cmsRouter = express.Router()




module.exports = function(_api){
  cmsRouter.route('/cmsapi')
            .post(function(req,res){
              console.log(req.path)
              let site = req.path.replace(/.*?\/(pc(?:auto|online|baby|lady|house|games))\/.*/ig,'$1')
              let data = req.body
              let _config = req.body
              // console.log(req.body)
              console.log('---- ------ ------- api: ' + `http://${_api.replace(/\{\{site\}\}/,site)}/admin/template/remotePreview.jsp`)
              let config = {
                  userName: _config.userName || 'moyingchao',
                  previewType: _config.previewType || 'channel',
                  channelName: _config.channelName || '软件专题', 
                  charsetName:'utf-8',
                  fromCache: _config.fromCache || 'n',
                  content : `<%@page pageEncoding="GBK" %><%@include file="/templateInclude.jsp" %>
                             ${_config.content}`
              }
              request.post({
                url:`http://${_api.replace(/\{\{site\}\}/,site)}/admin/template/remotePreview.jsp`,
                form: config
              },  (e, r, body) => {
                res.end(body)
                console.log(e,body);
              })
            })
  return cmsRouter
}