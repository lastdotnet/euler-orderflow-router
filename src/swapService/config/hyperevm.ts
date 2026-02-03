import { type ChainRoutingConfig, SwapperMode } from "../interface"
import { StrategyBalmySDK, StrategyRepayWrapper } from "../strategies"

const hyperevmRoutingConfig: ChainRoutingConfig = [
  // WRAPPERS
  {
    strategy: StrategyRepayWrapper.name(),
    match: {
      isRepay: true,
      swapperModes: [SwapperMode.EXACT_IN],
    },
  },
  // DEFAULTS - Prioritize reliable DEXes first (Enso, Kyberswap)
  {
    strategy: StrategyBalmySDK.name(),
    config: {
      sourcesFilter: {
        includeSources: ["enso", "kyberswap", "gluex"],
      },
      timeout: "60000",
    },
    match: {
      swapperModes: [SwapperMode.EXACT_IN],
    },
  },
  // FALLBACKS
  // Binary search overswap for target debt
  {
    strategy: StrategyBalmySDK.name(),
    config: {
      sourcesFilter: {
        includeSources: ["enso", "kyberswap", "gluex"],
      },
      timeout: "60000",
    },
    match: {
      swapperModes: [SwapperMode.TARGET_DEBT],
    },
  },
]

export default hyperevmRoutingConfig
