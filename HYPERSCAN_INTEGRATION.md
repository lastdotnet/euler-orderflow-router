# Hyperscan Integration

This documents the Hyperscan aggregator source wired into Euler Orderflow Router for HyperEVM.

## What Was Added

- New Balmy custom quote source: `hyperscan`
- HyperEVM routing now tries `hyperscan` first, then falls back to `gluex`
- Supports both:
  - `SwapperMode.EXACT_IN`
  - `SwapperMode.TARGET_DEBT` (via existing Balmy binary-search wrapper)

## Files

- `src/swapService/strategies/balmySDK/sources/hyperscanQuoteSource.ts`
- `src/swapService/strategies/balmySDK/customSourceList.ts`
- `src/swapService/strategies/strategyBalmySDK.ts`
- `src/swapService/config/hyperevm.ts`

## Required Env

- `HYPERSCAN_BASE_URL` (or `NEXT_PUBLIC_HYPERSCAN_BASE_URL`)
- `HYPERSCAN_API_KEY` (or `NEXT_PUBLIC_HYPERSCAN_API_KEY`)

Default base URL if unset:

- `http://64.34.94.231:3000`

## Endpoint Mapping

Source calls:

- `GET {HYPERSCAN_BASE_URL}/api/aggregator/swap`

with query params:

- `tokenIn`
- `tokenOut`
- `amountIn`
- `recipient`
- `slippageBps`
- `usePermit2=true`

Response fields consumed:

- `amountOut`
- `tx.to`
- `tx.data`
- `tx.value`
- `requiredApproval.spender` (fallbacks to `tx.to` as allowance target)
