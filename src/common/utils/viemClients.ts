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
import * as chains from "viem/chains"

export const unichain = defineChain({
  id: 130,
  name: "Unichain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://mainnet.unichain.org/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://uniscan.xyz",
      apiUrl: "https://api.uniscan.xyz/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 0,
    },
  },
})

export const berachain = defineChain({
  id: 80094,
  name: "Berachain",
  nativeCurrency: {
    decimals: 18,
    name: "Bera",
    symbol: "BERA",
  },
  blockExplorers: {
    default: {
      name: "berascan",
      url: "https://berascan.com/",
    },
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.berachain.com"],
    },
  },
})

export const tac = defineChain({
  id: 239,
  name: "TAC",
  nativeCurrency: {
    decimals: 18,
    name: "TAC",
    symbol: "TAC",
  },
  blockExplorers: {
    default: {
      name: "TAC Explorer",
      url: "https://explorer.tac.build/",
    },
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.tac.xyz"],
    },
  },
} as const)

export const plasma = defineChain({
  id: 9745,
  name: "Plasma",
  nativeCurrency: {
    decimals: 18,
    name: "XPL",
    symbol: "XPL",
  },
  blockExplorers: {
    default: {
      name: "Plasma Explorer",
      url: "https://plasmascan.to/",
    },
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.plasma.to"],
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
} as const)

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
  [chains.mainnet.id]: process.env.RPC_URL_1 || "",
  [chains.arbitrum.id]: process.env.RPC_URL_42161 || "",
  [chains.base.id]: process.env.RPC_URL_8453 || "",
  [chains.berachain.id]: process.env.RPC_URL_80094 || "",
  [chains.avalanche.id]: process.env.RPC_URL_43114 || "",
  [chains.bsc.id]: process.env.RPC_URL_56 || "",
  [chains.linea.id]: process.env.RPC_URL_59144 || "",
  [chains.sonic.id]: process.env.RPC_URL_146 || "",
  [chains.unichain.id]: process.env.RPC_URL_130 || "",
  [chains.tac.id]: process.env.RPC_URL_239 || "",
  [chains.plasma.id]: process.env.RPC_URL_9745 || "",
  [chains.bob.id]: process.env.RPC_URL_60808 || "",
  [chains.swellchain.id]: process.env.RPC_URL_1923 || "",
  [chains.monad.id]: process.env.RPC_URL_143 || "",
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
  [chains.mainnet.id]: createChainConfig(chains.mainnet),
  [chains.arbitrum.id]: createChainConfig(chains.arbitrum),
  [chains.base.id]: createChainConfig(chains.base),
  [chains.sonic.id]: createChainConfig(chains.sonic),
  [chains.berachain.id]: createChainConfig(chains.berachain),
  [chains.bsc.id]: createChainConfig(chains.bsc),
  [chains.avalanche.id]: createChainConfig(chains.avalanche),
  [chains.unichain.id]: createChainConfig(chains.unichain),
  [chains.tac.id]: createChainConfig(chains.tac),
  [chains.plasma.id]: createChainConfig(chains.plasma),
  [chains.linea.id]: createChainConfig(chains.linea),
  [hyperevm.id]: createClient({
    chain: hyperevm,
    transport: http(RPC_URLS[hyperevm.id]),
  }),
})

export const viemClients = createClients()
