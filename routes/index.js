const express = require('express'),
      fs = require('fs'),
      path = require('path'),
      formidable = require('formidable'),
      baseJobPath = `${appRoot}/jobs/input`,
      baseOutputPath = `${appRoot}/jobs/output`,
      child = require('child_process'),
      tree = require("directory-tree"),
      { spawn, exec, execFile } = require('child_process'),
      router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: "NOFUD" });
});

/* CALC COFUD */

router.post("/calc/:jobid", function(req, res) {
  const filters = ['id','left','top','width','height','fill'];
  let numPeople = req.body.numPeople,
      objects = req.body.canvas.objects,
      jid = req.params.jobid,
      filteredObj = [];

    // this should filter out any items we don't need from the fabric export. If we do need them, we can add them to the array up there

    for(let item of objects){
      let filtered = Object.keys(item)
        .filter(key => filters.includes(key))
        .reduce((obj, key) => {
          obj[key] = item[key];
          return obj;
        }, {});

        for (let key in filtered) {
            if(['left','top','width','height'].includes(key)){
              filtered[key] = filtered[key]/50;
            }
        }

      filteredObj.push(filtered);
    }

    //  write folder and file
    if (!fs.existsSync(path.join(baseJobPath, jid))){
      fs.mkdirSync(path.join(baseJobPath, jid));
    }

    fs.writeFile(path.join(baseJobPath, jid,'layout.json'), JSON.stringify(filteredObj), (err) => { 
      if (err) {
        throw err; 
      } else {
        console.log(`Job ${jid} created.`);
        // Add data to status endpoint
        global.jobStatus[jid] = new JobStatus(jid, Status.Creating);
        console.log(JSON.stringify(global.jobStatus));

        // This will need your attention

        child.exec(`npm run --prefix worker process -- --job ${jid} --people ${numPeople} >> worker.log`, function(error, stdout, stderr) {
          console.log(stdout);
          console.log(stderr);
        });

      }
    });

    // For testing, just sending the example output you sent
    res.json(JSON.stringify({"status": 1,"items": [{"left": 12,"top": 0,"width": 2,"height": 12,"id": "Wall"},{"left": 8,"top": 11,"width": 1,"height": 1,"id": "Person"}]}));
    // I'm not sure what to send back here yet.
    // res.json(JSON.stringify(filteredObj));
});

// Classes and endpoints for status
class JobStatus {
  constructor(jobId, status) { 
    this.jobId = jobId; 
    this.status = status; 
 }
}

const Status = Object.freeze({
  Error:   "Error",
  Creating:  "Creating",
  Started: "Started",
  Negotiating: "Negotiating",
  Sending: "Sending",
  Processing: "Processing",
  Receiving: "Receiving",
  Complete: "Complete"
});


router.get("/status", function(req, res, next) {
  try {
    res.write("Jobs:\n");
    for(let jid in global.jobStatus) {
      let lookup = global.jobStatus[jid];
      res.write(`${lookup.jobId} ${lookup.status}\n`);
    }
    res.end();

  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/status/:jobid", async function(req, res, next) {
  try {
    let jid = req.params.jobid;
    let lookup = global.jobStatus[jid];

    // set SSE headers
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    res.write('retry: 5000\n\n');

    let interValID = setInterval(() => {
        res.write(`data: ${lookup.status}\n\n`);
    }, 1500);

    res.on('close', () => {
        console.log('Closing messenger');
        clearInterval(interValID);
        res.end();
    });
    
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/results/:jobid", async function(req, res, next) {
  try {
    let jid = req.params.jobid;
    let lookup = global.jobStatus[jid];

    let outputFilename = 'layout.json';

    let downloadFile = path.join(baseOutputPath, jid, outputFilename);

    fs.readFile(downloadFile, 'utf8', function (err, data) {
      if (err) throw err;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    });

  } catch (error) {
    console.error(error)
    res.status(500).send({
      message: "Could not download the file. ",
    });
    /*
    console.error(error);
    next(error);*/
  }
});

router.post("/status/:jobid/:jobstatus", function(req, res, next) {
  try {
    let jid = req.params.jobid;
    let status = req.params.jobstatus;

    if(global.jobStatus[jid] == undefined) {
      res.status(400).send('Bad Request');
    } else {
      global.jobStatus[jid].status = status;
      res.status(200).send(`${jid} updated to ${status}`);
    }
    
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;