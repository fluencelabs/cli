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

import { GraphQLClient } from "graphql-request";

import { getSubgraphUrl } from "../chain/chainConfig.js";

import { getSdk as getGqlSdk, type Sdk } from "./gqlGenerated.js";

let sdk: Sdk | undefined = undefined;

async function getSdk() {
  if (sdk === undefined) {
    sdk = getGqlSdk(new GraphQLClient(await getSubgraphUrl()));
  }

  return sdk;
}

const DEFAULT_PAGE_LIMIT = 1000;

export async function getOffers(id_in: string[]) {
  const sdk = await getSdk();

  return sdk.OfferDetailsQuery({
    filters: { id_in },
    orderBy: "createdAt",
    orderType: "desc",
  });
}

export async function getDealsByProviderId(providerId: string) {
  const sdk = await getSdk();

  return (
    await sdk.DealsQuery({
      filters: {
        joinedWorkers_: {
          peer_: { provider_: { id: providerId.toLowerCase() } },
        },
      },
      offset: 0,
      limit: DEFAULT_PAGE_LIMIT,
      orderBy: "createdAt",
      orderType: "desc",
    })
  ).deals.map(({ id }) => {
    return id;
  });
}
