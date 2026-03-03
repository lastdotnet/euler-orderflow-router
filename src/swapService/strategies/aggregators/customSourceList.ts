import { logQuoteTime } from "@/common/utils/logs"
import { parseHrtimeToSeconds } from "@/swapService/utils"
import type {
  IFetchService,
  IProviderService,
  SourceId,
  SourceListQuoteRequest,
  SourceListQuoteResponse,
} from "@balmy/sdk"
import { LocalSourceList } from "@balmy/sdk/dist/services/quotes/source-lists/local-source-list"

import { CustomEnsoQuoteSource } from "./sources/ensoQuoteSource"
import { CustomGlueXQuoteSource } from "./sources/gluexQuoteSource"
import { CustomKyberswapQuoteSource } from "./sources/kyberswapQuoteSource"
import { CustomLiFiQuoteSource } from "./sources/lifiQuoteSource"
import { CustomPendleQuoteSource } from "./sources/pendleQuoteSource"

import pendleAggregators from "./sources/pendle/pendleAggregators.json"

type ConstructorParameters = {
  providerService: IProviderService
  fetchService: IFetchService
}

const customSources = {
  "li-fi": new CustomLiFiQuoteSource(),
  kyberswap: new CustomKyberswapQuoteSource(),
  enso: new CustomEnsoQuoteSource(),
  gluex: new CustomGlueXQuoteSource(),
}

export class CustomSourceList extends LocalSourceList {
  constructor({ providerService, fetchService }: ConstructorParameters) {
    super({ providerService, fetchService })

    const allPendleAggregators = [
      ...new Set(Object.values(pendleAggregators).flat()),
    ]
    const pendleSources = Object.fromEntries(
      allPendleAggregators.map((aggregator) => [
        `pendle-${aggregator}`,
        new CustomPendleQuoteSource(aggregator),
      ]),
    )

    const mutableThis = this as any
    mutableThis.sources = {
      ...mutableThis.sources,
      ...customSources,
      ...pendleSources,
    }
    delete mutableThis.sources.balmy

    // wrap getQuote in timer
    const getQuoteSuper = mutableThis.getQuote.bind(this)

    mutableThis.getQuote = async (
      request: SourceListQuoteRequest,
      sourceId: SourceId,
    ): Promise<SourceListQuoteResponse> => {
      const startTime = process.hrtime()
      const result = await getQuoteSuper(request, sourceId)
      const elapsedSeconds = parseHrtimeToSeconds(process.hrtime(startTime))

      logQuoteTime(request, sourceId, elapsedSeconds)

      return result
    }
  }
}
