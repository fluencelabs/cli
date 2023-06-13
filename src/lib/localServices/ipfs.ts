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

import { access, readFile } from "node:fs/promises";

import { CID, create, type IPFSHTTPClient } from "ipfs-http-client";
import { Multiaddr, protocols } from "multiaddr";

import { commandObj } from "../commandObj.js";
import { registerIpfsClient } from "../compiled-aqua/installation-spell/files.js";
import { stringifyUnknown } from "../helpers/jsonStringify.js";

// !IMPORTANT for some reason when in tsconfig.json "moduleResolution" is set to "nodenext" - "ipfs-http-client" types all become "any"
// so when working with this module - remove "nodenext" from "moduleResolution" so you can make sure types are correct
// then set it back to "nodenext" when you are done, because without it - there are problems

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions  */

const createIPFSClient = (multiaddr: string) => {
  return create(
    new Multiaddr(multiaddr)
      .decapsulateCode(protocols.names["p2p"]?.code ?? 421)
      .toOptions()
  );
};

const upload = async (
  multiaddr: string,
  content: Parameters<IPFSHTTPClient["add"]>[0],
  log: (msg: unknown) => void
) => {
  const ipfsClient = createIPFSClient(multiaddr);

  try {
    const { cid } = await ipfsClient.add(content, {
      pin: true,
      cidVersion: 1,
    });

    const cidString = cid.toString();

    await ipfsClient.pin.add(cidString);
    log(`did pin ${cidString} to ${multiaddr}`);

    try {
      const pinned = ipfsClient.pin.ls({ paths: cidString, type: "all" });

      for await (const r of pinned) {
        if (r.type === "recursive") {
          log(`file ${cidString} pinned to ${multiaddr}`);
        } else {
          log(`pin result type is not recursive. ${r}`);
        }
      }
    } catch (error) {
      commandObj.error(
        `file ${cidString} failed to pin ls to ${multiaddr}. ${stringifyUnknown(
          error
        )}`
      );
    }

    return cidString;
  } catch (error) {
    commandObj.error(`failed to upload: ${stringifyUnknown(error)}`);
  }
};

const dagUpload = async (
  multiaddr: string,
  content: Parameters<IPFSHTTPClient["dag"]["put"]>[0],
  log: (msg: unknown) => void
) => {
  const ipfsClient = createIPFSClient(multiaddr);

  try {
    const cid = await ipfsClient.dag.put(content, {
      pin: true,
    });

    const cidString = cid.toString();

    await ipfsClient.pin.add(cidString);
    log(`did pin ${cidString} to ${multiaddr}`);

    try {
      const pinned = ipfsClient.pin.ls({ paths: cidString, type: "all" });

      for await (const r of pinned) {
        if (r.type === "recursive") {
          log(`file ${cidString} pinned to ${multiaddr}`);
        } else {
          log(`pin result type is not recursive. ${r}`);
        }
      }
    } catch (error) {
      commandObj.error(
        `file ${cidString} failed to pin ls to ${multiaddr}. ${stringifyUnknown(
          error
        )}`
      );
    }

    return cidString;
  } catch (error) {
    commandObj.error(`failed to upload: ${stringifyUnknown(error)}`);
  }
};

export const doRegisterIpfsClient = (offAquaLogs: boolean): void => {
  const log = (msg: unknown) => {
    if (!offAquaLogs) {
      commandObj.log(`ipfs: ${stringifyUnknown(msg)}`);
    }
  };

  registerIpfsClient({
    async upload(multiaddr, absolutePath) {
      try {
        await access(absolutePath);
      } catch {
        throw new Error(
          `Failed IPFS upload. File ${absolutePath} doesn't exist`
        );
      }

      const data = await readFile(absolutePath);
      return upload(multiaddr, data, log);
    },
    async upload_string(multiaddr, string) {
      return upload(multiaddr, Buffer.from(string), log);
    },
    async dag_upload(multiaddr, absolutePath) {
      try {
        await access(absolutePath);
      } catch {
        throw new Error(
          `Failed IPFS upload. File ${absolutePath} doesn't exist`
        );
      }

      const data = await readFile(absolutePath);
      return dagUpload(multiaddr, data, log);
    },
    async dag_upload_string(multiaddr, string) {
      return dagUpload(multiaddr, Buffer.from(string), log);
    },
    async id(multiaddr): Promise<string> {
      const ipfsClient = createIPFSClient(multiaddr);
      const result = await ipfsClient.id();
      return result.id.toString();
    },
    async exists(multiaddr, cid): Promise<boolean> {
      const ipfsClient = createIPFSClient(multiaddr);

      try {
        const results = ipfsClient.pin.ls({ paths: cid, type: "all" });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of results) {
          // iterate over all results
        }

        return true;
      } catch (err) {
        if (stringifyUnknown(err).includes(`is not pinned`)) {
          return false;
        }

        commandObj.error(
          `failed to check if ${cid} exists: ${stringifyUnknown(err)}`
        );
      }
    },
    async remove(multiaddr, cid): Promise<string> {
      const ipfsClient = createIPFSClient(multiaddr);

      try {
        await ipfsClient.pin.rm(cid, { recursive: true });
      } catch {}

      try {
        const rm = ipfsClient.block.rm(CID.parse(cid), { force: true });

        for await (const r of rm) {
          if (r.error != null) {
            log(`block rm failed. ${r.error}`);
          }
        }

        return "Success";
      } catch (err) {
        log(`remove failed. ${err}`);
        return "Error: remove failed";
      }
    },
  });
};
