import dotenv from "dotenv"
dotenv.config()

import {
  http,
  type Chain,
  type Client,
  type Transport,
  createClient,
  defineChain,
} from "viem"

export const hyperevm = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: {
    decimals: 18,
    name: "HYPE",
    symbol: "HYPE",
  },
  blockExplorers: {
    default: {
      name: "Hyperliquid Explorer",
      url: "https://explorer.hyperliquid.xyz/",
    },
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.hyperliquid.xyz/evm"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
} as const)

export const RPC_URLS: Record<number, string> = {
  [hyperevm.id]: process.env.RPC_URL_999 || "",
} as const

export const createHttp = (chainId: number) =>
  http(RPC_URLS[chainId], {
    timeout: 120_000,
    // fetchOptions: { cache: "no-store" },
  })

export function createChainConfig(chain: Chain) {
  return createClient({
    chain,
    transport: createHttp(chain.id),
  })
}

export const createClients = (): Record<number, Client<Transport, Chain>> => ({
  [hyperevm.id]: createClient({
    chain: hyperevm,
    transport: http(RPC_URLS[hyperevm.id]),
  }),
})

export const viemClients = createClients()
