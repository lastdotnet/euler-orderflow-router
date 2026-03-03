import type {
  BuildTxParams,
  IQuoteSource,
  QuoteParams,
  QuoteSourceMetadata,
  SourceQuoteResponse,
  SourceQuoteTransaction,
} from "@balmy/sdk/dist/services/quotes/quote-sources/types"
import {
  addQuoteSlippage,
  checksum,
  failed,
} from "@balmy/sdk/dist/services/quotes/quote-sources/utils"

const HYPERSCAN_METADATA: QuoteSourceMetadata<HyperscanSupport> = {
  name: "Hyperscan Aggregator",
  supports: {
    chains: [999],
    swapAndTransfer: true,
    buyOrders: false,
  },
  logoURI: "https://swap.euler.finance/favicon.ico",
}

type HyperscanSupport = { buyOrders: false; swapAndTransfer: true }

type HyperscanConfig = {
  baseUrl: string
  apiKey: string
}

type HyperscanData = { tx: SourceQuoteTransaction }

type HyperscanSwapResponse = {
  amountOut: string
  tx: {
    to: string
    data: string
    value: string
  }
  requiredApproval?: {
    spender?: string
  }
}

export class CustomHyperscanQuoteSource
  implements IQuoteSource<HyperscanSupport, HyperscanConfig, HyperscanData>
{
  getMetadata() {
    return HYPERSCAN_METADATA
  }

  async quote({
    components: { fetchService },
    request: {
      chainId,
      sellToken,
      buyToken,
      order,
      config: { slippagePercentage, timeout },
      accounts: { takeFrom, recipient },
    },
    config,
  }: QuoteParams<HyperscanSupport, HyperscanConfig>): Promise<
    SourceQuoteResponse<HyperscanData>
  > {
    if (order.type !== "sell") {
      failed(
        HYPERSCAN_METADATA,
        chainId,
        sellToken,
        buyToken,
        "hyperscan only supports sell orders",
      )
    }

    const recv = checksum(recipient ?? takeFrom)
    const slippageBps = Math.max(
      1,
      Math.round(Number(slippagePercentage || 0.1) * 100),
    )

    const baseUrl = config.baseUrl.replace(/\/$/, "")
    const params = new URLSearchParams({
      tokenIn: sellToken,
      tokenOut: buyToken,
      amountIn: order.sellAmount.toString(),
      recipient: recv,
      slippageBps: String(slippageBps),
      usePermit2: "true",
    })

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    }

    const response = await fetchService.fetch(
      `${baseUrl}/api/aggregator/swap?${params.toString()}`,
      {
        timeout,
        method: "GET",
        headers,
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      failed(HYPERSCAN_METADATA, chainId, sellToken, buyToken, errorText)
    }

    const body = (await response.json()) as HyperscanSwapResponse
    if (!body?.tx?.to || !body?.tx?.data || !body?.amountOut) {
      failed(
        HYPERSCAN_METADATA,
        chainId,
        sellToken,
        buyToken,
        `invalid hyperscan response: ${JSON.stringify(body)}`,
      )
    }

    const quote = {
      sellAmount: order.sellAmount,
      buyAmount: BigInt(body.amountOut),
      allowanceTarget: body.requiredApproval?.spender ?? body.tx.to,
      customData: {
        tx: {
          calldata: body.tx.data,
          to: body.tx.to,
          value: BigInt(body.tx.value || "0"),
        },
      },
    }

    return addQuoteSlippage(quote, order.type, slippagePercentage)
  }

  async buildTx({
    request,
  }: BuildTxParams<
    HyperscanConfig,
    HyperscanData
  >): Promise<SourceQuoteTransaction> {
    return request.customData.tx
  }

  isConfigAndContextValidForQuoting(
    config: Partial<HyperscanConfig> | undefined,
  ): config is HyperscanConfig {
    return !!config?.baseUrl && !!config?.apiKey
  }

  isConfigAndContextValidForTxBuilding(
    config: Partial<HyperscanConfig> | undefined,
  ): config is HyperscanConfig {
    return !!config?.baseUrl && !!config?.apiKey
  }
}
