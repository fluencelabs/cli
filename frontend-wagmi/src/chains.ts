import { defineChain } from "viem";

export const dar = /*#__PURE__*/ defineChain({
  id: 0x8613d62c79827,
  name: "Dar",
  nativeCurrency: {
    decimals: 18,
    name: "Fluence",
    symbol: "tFLT",
  },
  rpcUrls: {
    default: { http: ["https://ipc.dar.fluence.dev"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.dar.fluence.dev/",
    },
  },
  testnet: true,
});

export const kras = /*#__PURE__*/ defineChain({
  id: 0x5c3b646050f68,
  name: "Kras",
  nativeCurrency: {
    decimals: 18,
    name: "Fluence",
    symbol: "FLT",
  },
  rpcUrls: {
    default: { http: ["https://ipc.kras.fluence.dev"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.kras.fluence.dev/",
    },
  },
});
