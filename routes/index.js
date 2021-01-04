const express = require('express'),
      fs = require('fs'),
      path = require('path'),
      formidable = require('formidable'),
      baseJobPath = `${appRoot}/jobs/input`,
      child = require('child_process'),
      tree = require("directory-tree"),
      { spawn, exec, execFile } = require('child_process'),
      config = `{
          "images":[],
          "actions":[]
      }`;
      router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: "NOFUD" });
});

/* CALC COFUD */

router.post("/calc", function(req, res) {
  const filters = ['id','left','top','width','height','fill'];
  let numPeople = req.body.numPeople,
      objects = req.body.canvas.objects,
      filteredObj = [];

    // this should filter out any items we don't need from the fabric export. If we do need them, we can add them to the array up there

    for(let item of objects){
      let filtered = Object.keys(item)
        .filter(key => filters.includes(key))
        .reduce((obj, key) => {
          obj[key] = item[key];
          return obj;
        }, {});

      filteredObj.push(filtered);
    }

    res.json(JSON.stringify(req.body.canvas.objects));
    // res.json(JSON.stringify(filteredObj)); //if you want to minify it a bit
});

module.exports = router;