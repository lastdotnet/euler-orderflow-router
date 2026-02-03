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
  calculateAllowanceTarget,
  checksum,
  failed,
} from "@balmy/sdk/dist/services/quotes/quote-sources/utils"

const GLUEX_METADATA: QuoteSourceMetadata<GlueXSupport> = {
  name: "GlueX",
  supports: {
    chains: [
      999, // hyperevm
    ],
    swapAndTransfer: true,
    buyOrders: false,
  },
  logoURI: "https://gluex.xyz/favicon.ico",
}

type GlueXSupport = { buyOrders: false; swapAndTransfer: true }
type GlueXConfig = {
  apiKey: string
  integratorId: string
}
type GlueXData = { tx: SourceQuoteTransaction }

export class CustomGlueXQuoteSource
  implements IQuoteSource<GlueXSupport, GlueXConfig, GlueXData>
{
  getMetadata() {
    return GLUEX_METADATA
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
  }: QuoteParams<GlueXSupport, GlueXConfig>): Promise<
    SourceQuoteResponse<GlueXData>
  > {
    const userAddress = checksum(takeFrom)
    const outputReceiver = checksum(recipient ?? takeFrom)

    // Map chain IDs to GlueX chain names
    const chainIdToName: Record<number, string> = {
      1: "ethereum",
      8453: "base",
      999: "hyperevm",
    }

    const chainName = chainIdToName[chainId]
    if (!chainName) {
      console.error(`[GlueX] Unsupported chain ID: ${chainId}`)
      failed(
        GLUEX_METADATA,
        chainId,
        sellToken,
        buyToken,
        `Unsupported chain ID: ${chainId}`,
      )
    }

    const requestBody = {
      chainID: chainName,
      inputToken: sellToken,
      outputToken: buyToken,
      inputAmount: order.sellAmount.toString(),
      orderType: "SELL",
      userAddress,
      outputReceiver,
      uniquePID: config.integratorId,
      slippage: slippagePercentage, // Slippage as decimal (0.5 = 0.5%)
    }

    console.log("[GlueX] Quote request:", {
      url: "https://router.gluex.xyz/v1/quote",
      body: requestBody,
      hasApiKey: !!config.apiKey,
      hasIntegratorId: !!config.integratorId,
      chainId,
      sellToken,
      buyToken,
      amount: order.sellAmount.toString(),
    })

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    }

    // Get quote with calldata
    const quoteUrl = "https://router.gluex.xyz/v1/quote"
    const response = await fetchService.fetch(quoteUrl, {
      timeout,
      headers,
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[GlueX] Quote failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        requestBody,
      })
      failed(GLUEX_METADATA, chainId, sellToken, buyToken, errorText)
    }

    const result = await response.json()
    console.log("[GlueX] Quote response:", JSON.stringify(result, null, 2))

    if (!result.result) {
      console.error("[GlueX] Unexpected response structure:", result)
      failed(
        GLUEX_METADATA,
        chainId,
        sellToken,
        buyToken,
        `Invalid response structure: ${JSON.stringify(result)}`,
      )
    }

    const {
      result: {
        outputAmount,
        router,
        calldata,
        value: txValue,
        revert,
        lowBalance,
      },
    } = result

    // Log revert/lowBalance warnings but don't fail - let frontend handle balance checks
    if (revert === true || lowBalance === true) {
      console.warn("[GlueX] Quote simulation warnings:", {
        chainId,
        sellToken,
        buyToken,
        revert,
        lowBalance,
        note: "Quote returned but transaction may revert due to balance/state",
      })
    }

    const quote = {
      sellAmount: order.sellAmount,
      buyAmount: BigInt(outputAmount),
      allowanceTarget: calculateAllowanceTarget(sellToken, router),
      customData: {
        tx: {
          calldata,
          to: router,
          value: BigInt(txValue ?? 0),
        },
      },
    }

    const quoteWithSlippage = addQuoteSlippage(
      quote,
      order.type,
      slippagePercentage,
    )
    console.log("[GlueX] Returning quote with slippage:", {
      buyAmount: quoteWithSlippage.buyAmount.toString(),
      minBuyAmount: quoteWithSlippage.minBuyAmount.toString(),
      sellAmount: quoteWithSlippage.sellAmount.toString(),
      maxSellAmount: quoteWithSlippage.maxSellAmount.toString(),
      allowanceTarget: quoteWithSlippage.allowanceTarget,
      hasTxData: !!quoteWithSlippage.customData.tx,
    })
    return quoteWithSlippage
  }

  async buildTx({
    request,
  }: BuildTxParams<GlueXConfig, GlueXData>): Promise<SourceQuoteTransaction> {
    return request.customData.tx
  }

  isConfigAndContextValidForQuoting(
    config: Partial<GlueXConfig> | undefined,
  ): config is GlueXConfig {
    const isValid = !!config?.apiKey && !!config?.integratorId
    console.log("[GlueX] isConfigAndContextValidForQuoting:", {
      hasApiKey: !!config?.apiKey,
      apiKeyValue: config?.apiKey
        ? `${config.apiKey.substring(0, 8)}...`
        : undefined,
      hasIntegratorId: !!config?.integratorId,
      integratorIdValue: config?.integratorId
        ? `${config.integratorId.substring(0, 8)}...`
        : undefined,
      isValid,
    })
    return isValid
  }

  isConfigAndContextValidForTxBuilding(
    config: Partial<GlueXConfig> | undefined,
  ): config is GlueXConfig {
    return true
  }
}
