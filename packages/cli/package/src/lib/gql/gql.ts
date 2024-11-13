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

import {
  getSdk as getGqlSdk,
  type OffersForMatchingQueryVariables,
  type Sdk,
} from "./gqlGenerated.js";

let sdk: Promise<Sdk> | undefined = undefined;

async function getSdk() {
  if (sdk === undefined) {
    sdk = (async () => {
      return getGqlSdk(new GraphQLClient(await getSubgraphUrl()));
    })();
  }

  return sdk;
}

export const DEFAULT_PAGE_LIMIT = 1000;

async function getAllPages<T>(getter: (skip: number) => Promise<T[]>) {
  let result: T[] = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await getter(skip);
    result = result.concat(res);

    if (res.length === DEFAULT_PAGE_LIMIT) {
      skip = skip + DEFAULT_PAGE_LIMIT;
    } else {
      hasMore = false;
    }
  }

  return result;
}

export async function getDealIdsByProviderId(providerId: string) {
  const sdk = await getSdk();

  return getAllPages(async (skip) => {
    return (
      await sdk.Deals({
        where: {
          joinedWorkers_: {
            // TODO: must be just provider_: { id: providerId.toLowerCase() }
            peer_: { provider_: { id: providerId.toLowerCase() } },
          },
        },
        skip,
        first: DEFAULT_PAGE_LIMIT,
      })
    ).deals;
  });
}

export async function getDealForMatching(dealId: string) {
  return (await getSdk()).DealForMatching({ id: dealId });
}

export async function getOffersForMatching(
  variables: OffersForMatchingQueryVariables,
) {
  return (await getSdk()).OffersForMatching(variables);
}

export async function getOffers(id_in: string[]) {
  return (await getSdk()).OfferDetails({ where: { id_in, deleted: false } });
}

export async function ccDetails(ccIds: string[]) {
  return (await getSdk()).CCDetails({ where: { id_in: ccIds } });
}
