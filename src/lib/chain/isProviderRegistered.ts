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

import { commandObj } from "../commandObj.js";
import { CLI_NAME } from "../const.js";
import { getDealClient } from "../dealClient.js";

export async function assertProviderIsRegistered() {
  const { dealClient, signerOrWallet } = await getDealClient();
  const market = await dealClient.getMarket();

  const initialProviderInfo = await market.getProviderInfo(
    signerOrWallet.address,
  );

  if (initialProviderInfo.name.length === 0) {
    commandObj.error(
      `You have to register as a provider first. Use '${CLI_NAME} provider register' command for that`,
    );
  }
}
