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
import { dbg } from "../dbg.js";
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

async function upload(
  multiaddr: string,
  content: Parameters<IPFSHTTPClient["add"]>[0],
): Promise<string> {
  try {
    const ipfsClient = await createIPFSClient(multiaddr);
    dbg(`created ipfs client`);

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

    dbg(`did pin ${cidString} to ${multiaddr}`);

    try {
      const pinned = ipfsClient.pin.ls({ paths: cidString, type: "all" });

      for await (const r of pinned) {
        if (r.type === "recursive") {
          dbg(`file ${cidString} pinned to ${multiaddr}`);
        } else {
          dbg(`pin result type is not recursive. ${stringifyUnknown(r)}`);
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
}

const dagUpload = async (
  multiaddr: string,
  content: Parameters<IPFSHTTPClient["dag"]["put"]>[0],
) => {
  const ipfsClient = await createIPFSClient(multiaddr);

  try {
    const cid = await ipfsClient.dag.put(content, {
      pin: true,
    });

    // eslint-disable-next-line no-restricted-syntax
    const cidString = cid.toString();

    await ipfsClient.pin.add(cidString);
    dbg(`did pin ${cidString} to ${multiaddr}`);

    try {
      const pinned = ipfsClient.pin.ls({ paths: cidString, type: "all" });

      for await (const r of pinned) {
        if (r.type === "recursive") {
          dbg(`file ${cidString} pinned to ${multiaddr}`);
        } else {
          dbg(`pin result type is not recursive. ${stringifyUnknown(r)}`);
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

export function getIpfsClient() {
  return {
    async upload(multiaddr: string, absolutePath: string) {
      dbg(`uploading ${absolutePath} to ${multiaddr}`);

      try {
        await access(absolutePath);
      } catch {
        throw new Error(
          `Failed IPFS upload to ${multiaddr}. File ${absolutePath} doesn't exist`,
        );
      }

      dbg(`reading ${absolutePath}`);
      const data = await readFile(absolutePath);
      dbg(`uploading ${absolutePath} to ${multiaddr}`);
      return upload(multiaddr, data);
    },
    async upload_string(multiaddr: string, string: string) {
      return upload(multiaddr, Buffer.from(string));
    },
    async dag_upload(multiaddr: string, absolutePath: string) {
      try {
        await access(absolutePath);
      } catch {
        throw new Error(
          `Failed IPFS upload to ${multiaddr}. File ${absolutePath} doesn't exist`,
        );
      }

      const data = await readFile(absolutePath, FS_OPTIONS);
      return dagUpload(multiaddr, data);
    },
    async dag_upload_string(multiaddr: string, string: string) {
      return dagUpload(multiaddr, string);
    },
    async id(multiaddr: string): Promise<string> {
      const ipfsClient = await createIPFSClient(multiaddr);
      const result = await ipfsClient.id();
      // eslint-disable-next-line no-restricted-syntax
      return result.id.toString();
    },
    async exists(multiaddr: string, cid: string): Promise<boolean> {
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
    async remove(multiaddr: string, cid: string): Promise<string> {
      const ipfsClient = await createIPFSClient(multiaddr);
      const { CID } = await import("ipfs-http-client");

      try {
        await ipfsClient.pin.rm(cid, { recursive: true });
      } catch {}

      try {
        const rm = ipfsClient.block.rm(CID.parse(cid), { force: true });

        for await (const r of rm) {
          if (r.error !== undefined) {
            dbg(`block rm failed. ${stringifyUnknown(r.error)}`);
          }
        }

        return "Success";
      } catch (err) {
        dbg(`remove failed. ${stringifyUnknown(err)}`);
        return "Error: remove failed";
      }
    },
  };
}

export async function doRegisterIpfsClient(): Promise<void> {
  const { registerIpfsClient } = await import(
    "../compiled-aqua/installation-spell/files.js"
  );

  registerIpfsClient(getIpfsClient());
}
