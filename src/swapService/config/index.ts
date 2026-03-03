import * as chains from "viem/chains"
import type { RoutingConfig } from "../interface"
import defaultRoutingConfig from "./default"
import hyperevmRoutingConfig from "./hyperevm"

export const routingConfig: RoutingConfig = {
  [chains.hyperEvm.id]: hyperevmRoutingConfig,
}

export const getRoutingConfig = (chainId: number) => {
  return routingConfig[chainId] || defaultRoutingConfig
}
