/**
 * Copyright 2023 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import Dockerode, { type ContainerInfo } from "dockerode";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
const docker = new Dockerode();

async function getNoxContainerIds(): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
  const containers: ContainerInfo[] = await docker.listContainers();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return containers
    .filter((containerInfo: Dockerode.ContainerInfo) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      return containerInfo.Image.includes("nox");
    })
    .map((containerInfo) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      return containerInfo.Id;
    });
}

async function getContainerLogs(
  containerId: string,
  substring: string,
): Promise<string[]> {
  const linseBeforeTarget = 10;
  const linesAfterTarget = 10;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const container: Dockerode.Container = docker.getContainer(containerId);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const logs: Buffer = await container.logs({ stdout: true, stderr: true });
  const logsString: string = logs.toString("utf8");

  const logsLines = logsString.split("\n");
  const substringRegExp = new RegExp(`.+${substring}.+`, "g");

  let resultLines: string[] = [];

  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < logsLines.length; index++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (substringRegExp.test(logsLines[index]!)) {
      const start = Math.max(0, index - linseBeforeTarget);
      const end = Math.min(logsLines.length, index + linesAfterTarget + 1);
      const matchedLines = logsLines.slice(start, end);
      resultLines = resultLines.concat(matchedLines, ["<  ...  >"]);
    }
  }

  return removeNonPrintableCharacters(resultLines);
}

function removeNonPrintableCharacters(lines: string[]): string[] {
  const ansiEscapeSeq = new RegExp(
    // eslint-disable-next-line no-control-regex
    "\x1B[[(?);]*([0-9]{1,2}(;[0-9]{1,2})?[ABCDEFGHJKSTfmsu]|OP|7|8)",
    "g",
  );

  // eslint-disable-next-line no-control-regex
  const nonPrintable = new RegExp("[^\x20-\x7E\x0A\x0D]", "g");

  return lines.map((line) => {
    return line.replace(ansiEscapeSeq, "").replace(nonPrintable, "");
  });
}

export async function printNoxContainerLogs(substring: string): Promise<void> {
  const containerIds = await getNoxContainerIds();

  assert(containerIds.length > 0, "No containers found");

  const logsPromises = containerIds.map(async (id) => {
    const logLines = await getContainerLogs(id, substring);
    console.log(`\nLogs for container ${id}:`, logLines);
  });

  await Promise.all(logsPromises);
}

export async function saveFullContainerLogs(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const containers: ContainerInfo[] = await docker.listContainers();

  assert(containers.length > 0, "No containers found");

  const logsPromises = containers.map(async (containerInfo: ContainerInfo) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const container: Dockerode.Container = docker.getContainer(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      containerInfo.Id,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const logs: Buffer = await container.logs({ stdout: true, stderr: true });
    const logsString = logs.toString("utf8");
    const logLines = logsString.split("\n");

    const resultLines = removeNonPrintableCharacters(logLines);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const containerName =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      containerInfo.Names[0] === undefined
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          containerInfo.Image
        : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          containerInfo.Names[0];

    const logFilePath = `tmp/logs/${containerName.replaceAll("/", "")}.log`;
    await mkdir(dirname(logFilePath), { recursive: true });

    await writeFile(logFilePath, resultLines.join("\n"));
  });

  await Promise.all(logsPromises);
}
