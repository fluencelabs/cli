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

export async function getDealIdsByProviderId(providerId: string) {
  return (await getSdk()).Deals({
    where: {
      joinedWorkers_: {
        peer_: { provider_: { id: providerId.toLowerCase() } },
      },
    },
    skip: 0,
    first: DEFAULT_PAGE_LIMIT,
    orderBy: "createdAt",
    orderDirection: "desc",
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
  return (await getSdk()).OfferDetails({
    where: { id_in },
    orderBy: "createdAt",
    orderDirection: "desc",
  });
}

function getCCQueries<T extends "CCIds" | "CCIdsAndStatuses" | "CCDetails">(
  queryName: T,
): {
  getCCByCCId(ccIds: string[]): ReturnType<Sdk[T]>;
  getCCByHexPeerId(hexPeerIds: string[]): ReturnType<Sdk[T]>;
} {
  return {
    // @ts-expect-error Don't know how to satisfy the type system here
    async getCCByCCId(ccIds: string[]) {
      return (await getSdk())[queryName]({ where: { id_in: ccIds } });
    },
    // @ts-expect-error Don't know how to satisfy the type system here
    async getCCByHexPeerId(hexPeerIds: string[]) {
      return (await getSdk())[queryName]({ where: { peer_in: hexPeerIds } });
    },
  };
}

export const ccIds = getCCQueries("CCIds");
export const ccIdsAndStatuses = getCCQueries("CCIdsAndStatuses");
export const ccDetails = getCCQueries("CCDetails");
