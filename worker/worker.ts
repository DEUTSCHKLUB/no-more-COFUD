import path from "path";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Engine, Task, utils, vm, WorkContext } from "yajsapi";
import { program } from "commander";
import fs from "fs";
import * as child from 'child_process';
import tree from 'directory-tree';
import "reflect-metadata"
import { Type, plainToClass, classToPlain } from 'class-transformer'

dayjs.extend(duration);

const { asyncWith, logUtils, range } = utils;

enum Status {
  Error = "Error",
  Creating = "Creating",
  Started = "Started",
  Negotiating = "Negotiating",
  Sending = "Sending",
  Processing = "Processing",
  Receiving = "Receiving",
  Complete = "Complete"
}

function updateStatus(jobid: string, status: Status) {
  child.exec(`curl -X POST http://localhost:3003/status/${jobid}/${status}`);
}

async function main(subnetTag: string, hash: string, job: string, cpu?: number, memory?: number, storage?:number) {
  // Increasing default requirements to remove some slower nodes
  if (cpu == undefined || Number.isNaN(cpu)) {
    cpu = 4;
  }

  if (memory == undefined || Number.isNaN(memory)) {
    memory = 4;
  }

  if (storage == undefined || Number.isNaN(storage)) {
    storage = 2;
  }

  console.log("subnet=", subnetTag);
  console.log("hash=", hash);
  console.log("job=", job);
  console.log("cpu=", cpu);
  console.log("memory=", memory);
  console.log("storage=", storage);

  let jobRootFolder = `${__dirname}/../jobs`;
  let jobScript = `${__dirname}/cofud_solver.py`;
  let jobInputFolder: string = `${jobRootFolder}/input/${job}`;
  let jobPackage: string = `${jobInputFolder}/layout.json`;
  let jobOutputFolder: string = `${jobRootFolder}/output/${job}`;
  let jobOutputFile: string = `${jobOutputFolder}/layout.json`;

  updateStatus(job, Status.Started);

  const _package = await vm.repo(hash, memory, storage, cpu);

  let workDefinition = async function* worker(ctx: WorkContext, tasks) {
    let scriptTarget = "/golem/work/cofud_solver.py";
    let sentPackageFile = "/golem/work/input.json";
    let outputFile = "/golem/output/output.json";

    updateStatus(job, Status.Sending);

    ctx.send_file(jobScript, scriptTarget);
    ctx.send_file(jobPackage, sentPackageFile);

    // updateStatus(job, Status.Processing);

    for await (let task of tasks) {
      let taskDat: any = task.data();

      let commands = [
        "-c",
        `cd /golem/work/;
        python3 /golem/work/cofud_solver.py 4 ${sentPackageFile} ${outputFile} > /golem/output/output.log;
        ls -lahR /golem >> /golem/output/output.log;`
      ]

      ctx.run("/bin/sh", commands);

      updateStatus(job, Status.Processing); // Should be Receiving

      ctx.download_file(
        '/golem/output/output.log', //outputFile,
        `${jobOutputFolder}/output.log` //jobResults
      );
      
      ctx.download_file(
        outputFile, //outputFile,
        jobOutputFile //jobResults
      );

      yield ctx.commit();

      updateStatus(job, Status.Complete);

      // TODO: Check
      // job results are valid // and reject by:
      // task.reject_task(msg = 'invalid file')
      task.accept_task(jobOutputFile);
    }

    ctx.log("no more rooms to process");
    return;
  }
  
  let taskGetter = function getTasks(): any[] {
    return [0];
  }
    
  let timeout: number = dayjs.duration({ minutes: 10 }).asMilliseconds();
  let workers: number = 1;

  console.log("task getter=", taskGetter);
  console.log("tasks=", taskGetter());
  console.log("timeout=", timeout);
  console.log("work def=", workDefinition);
  console.log("workers=", workers);

  updateStatus(job, Status.Negotiating);

  await asyncWith(
    await new Engine(
      _package,
      workers,
      timeout,
      "10.0", // Budget
      undefined,
      subnetTag,
      logUtils.logSummary()
    ),
    async (engine: Engine): Promise<void> => {
      for await (let task of engine.map(
        workDefinition,
        taskGetter().map((frame) => new Task(frame))
      )) {
        console.log("result=", task.output());
      }
    }
  );
  return;
}

function parseIntParam(value: string) {
  return parseInt(value);
}

console.log(process.argv);

program
  .option('--subnet-tag <subnet>', 'set subnet name', 'community.3')
  .option('-d, --debug', 'output extra debugging')
  .requiredOption('-h, --hash <hash>', 'golem VM image hash', '8b71496574f9824d72c09e85f63aa578cbdf1f42bb2ad95b93556f7a')
  .requiredOption('-j, --job <string>', 'ID of job to process')
  .option('-c, --cpu <number>', '# of cores required', parseIntParam)
  .option('-m, --memory <number>', 'GB of memory required', parseIntParam)
  .option('-s, --storage <number>', 'GB of storage required', parseIntParam);
program.parse(process.argv);
if (program.debug) {
  utils.changeLogLevel("debug");
}
console.log(`Using subnet: ${program.subnetTag}`);
main(program.subnetTag, program.hash, program.job, program.cpu, program.memory, program.storage);