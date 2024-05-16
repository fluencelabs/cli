/**
 * Copyright 2024 Fluence DAO
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

export type Account = {
  address: string;
  privateKey: string;
};

export const LOCAL_NET_DEFAULT_WALLET_KEY =
  "0x2d37ee7f23fe2d916d57857b095426b54fed24840c3f61097c8fe547f3659156";

export const LOCAL_NET_DEFAULT_ACCOUNTS: Account[] = [
  {
    address: "0x96a609941fa20561B8Cf1DA7557549C29328Bf16",
    privateKey: LOCAL_NET_DEFAULT_WALLET_KEY,
  },
  {
    address: "0xf532b6512897cE489A239bB6F961BA45686220cc",
    privateKey:
      "0xf52980ab2a7f919b8d6fda7cae4a0b68d92516b32e6d1661db105e2f9962e42c",
  },
  {
    address: "0xDc0c66e89Ade8424C37B0B8cBF3d99FE94136536",
    privateKey:
      "0x66b2c5bf0b3834fbeb789511c29cecdbfa1f4c7a3f8ebb64f70bf1260bbf5950",
  },
  {
    address: "0x0dF140a5d5b862816eAb51e1252F38ee23373c64",
    privateKey:
      "0x73f59f92d583b4ca0da78db591c92ea72363345618caf56d58864295c86e8fda",
  },
];

export const LOCAL_NET_WALLET_KEYS = LOCAL_NET_DEFAULT_ACCOUNTS.map(
  ({ privateKey }) => {
    return privateKey;
  },
);
