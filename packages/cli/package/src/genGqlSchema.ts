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

import { exec as callBackExec } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { SUBGRAPH_URLS } from "@fluencelabs/deal-ts-clients";

import { chainContainers } from "./lib/configs/project/chainContainers.js";
import { setTryTimeout } from "./lib/helpers/setTryTimeout.js";
import { FLUENCE_ENV } from "./lib/setupEnvironment.js";

const exec = promisify(callBackExec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

await writeFile(
  join(root, "docker-compose.yaml"),
  JSON.stringify(chainContainers, null, 2),
  "utf-8",
);

const env = process.env[FLUENCE_ENV];

if (env === "local") {
  await exec(`cd ${root}`);
  await exec("docker compose up -d");
}

const url = SUBGRAPH_URLS[env];

const res = await setTryTimeout(
  `download graphql schema from ${url}`,
  async () => {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept:
          "application/graphql-response+json, application/json, multipart/mixed",
        "Accept-Language": "en-US,en;q=0.5",
        "content-type": "application/json",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Priority: "u=0",
      },
      body: '{"query":"query IntrospectionQuery {\\n  __schema {\\n    description\\n    queryType {\\n      name\\n    }\\n    mutationType {\\n      name\\n    }\\n    subscriptionType {\\n      name\\n    }\\n    types {\\n      ...FullType\\n    }\\n    directives {\\n      name\\n      description\\n      locations\\n      args {\\n        ...InputValue\\n      }\\n    }\\n  }\\n}\\n\\nfragment FullType on __Type {\\n  kind\\n  name\\n  description\\n  fields(includeDeprecated: true) {\\n    name\\n    description\\n    args {\\n      ...InputValue\\n    }\\n    type {\\n      ...TypeRef\\n    }\\n    isDeprecated\\n    deprecationReason\\n  }\\n  inputFields {\\n    ...InputValue\\n  }\\n  interfaces {\\n    ...TypeRef\\n  }\\n  enumValues(includeDeprecated: true) {\\n    name\\n    description\\n    isDeprecated\\n    deprecationReason\\n  }\\n  possibleTypes {\\n    ...TypeRef\\n  }\\n}\\n\\nfragment InputValue on __InputValue {\\n  name\\n  description\\n  type {\\n    ...TypeRef\\n  }\\n  defaultValue\\n}\\n\\nfragment TypeRef on __Type {\\n  kind\\n  name\\n  ofType {\\n    kind\\n    name\\n    ofType {\\n      kind\\n      name\\n      ofType {\\n        kind\\n        name\\n        ofType {\\n          kind\\n          name\\n          ofType {\\n            kind\\n            name\\n            ofType {\\n              kind\\n              name\\n              ofType {\\n                kind\\n                name\\n              }\\n            }\\n          }\\n        }\\n      }\\n    }\\n  }\\n}","operationName":"IntrospectionQuery","extensions":{}}',
      method: "POST",
      mode: "cors",
    });

    const json = await res.json();

    if (typeof json !== "object" || json === null || !("data" in json)) {
      throw new Error(`Invalid response: ${JSON.stringify(json, null, 2)}`);
    }

    return json;
  },
  (error) => {
    return { error };
  },
  120_000,
  3_000,
);

if (env === "local") {
  await exec("docker compose down -v");
}

if ("error" in res) {
  throw res.error;
}

await writeFile(
  join(root, "src", "lib", "gql", "gqlSchema.json"),
  JSON.stringify(res),
  "utf-8",
);
