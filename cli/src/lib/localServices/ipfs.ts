/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { access, readFile } from "node:fs/promises";

import type { IPFSHTTPClient } from "ipfs-http-client";

import { commandObj } from "../commandObj.js";
import { FS_OPTIONS } from "../const.js";
import { setTryTimeout, stringifyUnknown } from "../helpers/utils.js";

// !IMPORTANT for some reason when in tsconfig.json "moduleResolution" is set to "nodenext" - "ipfs-http-client" types all become "any"
// so when working with this module - remove "nodenext" from "moduleResolution" so you can make sure types are correct
// then set it back to "nodenext" when you are done, because without it - there are problems

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions  */

export async function createIPFSClient(multiaddrString: string) {
  const [{ multiaddr, protocols }, { create }] = await Promise.all([
    import("@multiformats/multiaddr"),
    import("ipfs-http-client"),
  ]);

  return create(
    multiaddr(multiaddrString)
      .decapsulateCode(protocols("p2p").code)
      .toOptions(),
  );
}

const upload = async (
  multiaddr: string,
  content: Parameters<IPFSHTTPClient["add"]>[0],
  log: (msg: unknown) => void,
) => {
  try {
    const ipfsClient = await createIPFSClient(multiaddr);

    const { cid } = await ipfsClient.add(content, {
      pin: true,
      cidVersion: 1,
    });

    // eslint-disable-next-line no-restricted-syntax
    const cidString = cid.toString();

    await setTryTimeout(
      "Trying to upload to IPFS",
      async () => {
        await ipfsClient.pin.add(cidString);
      },
      (err) => {
        throw err;
      },
      5000,
    );

    log(`did pin ${cidString} to ${multiaddr}`);

    try {
      const pinned = ipfsClient.pin.ls({ paths: cidString, type: "all" });

      for await (const r of pinned) {
        if (r.type === "recursive") {
          log(`file ${cidString} pinned to ${multiaddr}`);
        } else {
          log(`pin result type is not recursive. ${stringifyUnknown(r)}`);
        }
      }
    } catch (error) {
      commandObj.error(
        `file ${cidString} failed to pin ls to ${multiaddr}. ${stringifyUnknown(
          error,
        )}`,
      );
    }

    return cidString;
  } catch (error) {
    commandObj.error(
      `\n\nFailed to upload to ${multiaddr}:\n\n${stringifyUnknown(error)}`,
    );
  }
};

const dagUpload = async (
  multiaddr: string,
  content: Parameters<IPFSHTTPClient["dag"]["put"]>[0],
  log: (msg: unknown) => void,
) => {
  const ipfsClient = await createIPFSClient(multiaddr);

  try {
    const cid = await ipfsClient.dag.put(content, {
      pin: true,
    });

    // eslint-disable-next-line no-restricted-syntax
    const cidString = cid.toString();

    await ipfsClient.pin.add(cidString);
    log(`did pin ${cidString} to ${multiaddr}`);

    try {
      const pinned = ipfsClient.pin.ls({ paths: cidString, type: "all" });

      for await (const r of pinned) {
        if (r.type === "recursive") {
          log(`file ${cidString} pinned to ${multiaddr}`);
        } else {
          log(`pin result type is not recursive. ${stringifyUnknown(r)}`);
        }
      }
    } catch (error) {
      commandObj.error(
        `file ${cidString} failed to pin ls to ${multiaddr}. ${stringifyUnknown(
          error,
        )}`,
      );
    }

    return cidString;
  } catch (error) {
    commandObj.error(
      `\n\nFailed to upload to ${multiaddr}:\n\n${stringifyUnknown(error)}`,
    );
  }
};

export const doRegisterIpfsClient = async (
  offAquaLogs: boolean,
): Promise<void> => {
  const log = (msg: unknown) => {
    if (!offAquaLogs) {
      commandObj.logToStderr(`ipfs: ${stringifyUnknown(msg)}`);
    }
  };

  const { registerIpfsClient } = await import(
    "../compiled-aqua/installation-spell/files.js"
  );

  registerIpfsClient({
    async upload(multiaddr, absolutePath) {
      try {
        await access(absolutePath);
      } catch {
        throw new Error(
          `Failed IPFS upload to ${multiaddr}. File ${absolutePath} doesn't exist`,
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
          `Failed IPFS upload to ${multiaddr}. File ${absolutePath} doesn't exist`,
        );
      }

      const data = await readFile(absolutePath, FS_OPTIONS);
      return dagUpload(multiaddr, data, log);
    },
    async dag_upload_string(multiaddr, string) {
      return dagUpload(multiaddr, string, log);
    },
    async id(multiaddr): Promise<string> {
      const ipfsClient = await createIPFSClient(multiaddr);
      const result = await ipfsClient.id();
      // eslint-disable-next-line no-restricted-syntax
      return result.id.toString();
    },
    async exists(multiaddr, cid): Promise<boolean> {
      const ipfsClient = await createIPFSClient(multiaddr);

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
          `failed to check if ${cid} exists: ${stringifyUnknown(err)}`,
        );
      }
    },
    async remove(multiaddr, cid): Promise<string> {
      const ipfsClient = await createIPFSClient(multiaddr);
      const { CID } = await import("ipfs-http-client");

      try {
        await ipfsClient.pin.rm(cid, { recursive: true });
      } catch {}

      try {
        const rm = ipfsClient.block.rm(CID.parse(cid), { force: true });

        for await (const r of rm) {
          if (r.error !== undefined) {
            log(`block rm failed. ${stringifyUnknown(r.error)}`);
          }
        }

        return "Success";
      } catch (err) {
        log(`remove failed. ${stringifyUnknown(err)}`);
        return "Error: remove failed";
      }
    },
  });
};
