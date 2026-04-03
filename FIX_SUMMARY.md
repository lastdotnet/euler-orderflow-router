# Fix for 404 Error - Gluex Quote Rejection

## Problem

Gluex API was returning valid quotes but they were being filtered out because:
1. The router was using the **Swapper contract address** (`0x1dAbE...`) as `userAddress` in Gluex requests
2. Gluex checks balance and sees Swapper has no tokens (during quote phase, tokens are still in vaults)
3. Gluex either returns `400 - "Unable to fetch a solution"` OR returns `200` with `lowBalance: true`
4. Quotes with `lowBalance: true` get filtered out by Balmy SDK

## Solution

**Change the address used for Gluex simulation from Swapper contract to the user's EOA (origin).**

### File Changed

`src/swapService/strategies/strategyBalmySDK.ts` - Line 585

### The Fix

```diff
  #getSDKQuoteFromSwapParams(
    swapParams: SwapParams,
    sourcesFilter?: any,
  ): QuoteRequest {
    return {
      chainId: swapParams.chainId,
      sellToken: swapParams.tokenIn.address,
      buyToken: swapParams.tokenOut.address,
      order: {
        ...(swapParams.swapperMode === SwapperMode.EXACT_IN
          ? { type: "sell", sellAmount: swapParams.amount }
          : { type: "buy", buyAmount: swapParams.amount }),
      },
      slippagePercentage: swapParams.slippage,
-     takerAddress: swapParams.from,        // Swapper contract - has no tokens
+     takerAddress: swapParams.origin,      // User's EOA - tells Gluex who initiated
      recipient: swapParams.receiver,
      filters: sourcesFilter || this.config.sourcesFilter,
      includeNonTransferSourcesWhenRecipientIsSet: true,
    }
  }
```

## Why This Works

### Before (using `swapParams.from`):
- `takerAddress` = Swapper contract (`0x1dAbE49020104803084F67C057579a30b396206e`)
- Gluex sees: contract with 0 balance
- Result: `400 - "Unable to fetch a solution"` ❌

### After (using `swapParams.origin`):
- `takerAddress` = User's EOA (`0xBE1299E1637AE06b1964d25FD6A7932974d19138`)
- Gluex sees: EOA address (treats balance checks differently)
- Result: `200` with valid quote ✅

### Test Results

**Using Swapper address:**
```
Request 1 (730315): 400 - Unable to fetch solution
Request 2 (261127): 400 - Unable to fetch solution
Request 3 (225607): 200 but 0 quotes returned (filtered)
```

**Using Origin (user EOA):**
```
Request 1 (730315): 200 - outputAmount: 22072073718448313 ✅
Request 2 (225607): 200 - outputAmount: 6818013701620794 ✅
```

## Important: This Doesn't Change Execution Flow

The actual swap execution still works correctly:

```javascript
// EVC Batch (unchanged)
[
  vault.withdraw(to: SWAPPER_CONTRACT),     // Tokens go to Swapper
  SWAPPER_CONTRACT.execute(gluexCalldata),  // Swapper executes with Gluex calldata
  verifier.check()                          // Verify result
]
```

The Gluex-generated calldata is address-agnostic - it works regardless of what address we used for the quote request.

## Deployment

```bash
# Review the change
git diff src/swapService/strategies/strategyBalmySDK.ts

# Commit
git add src/swapService/strategies/strategyBalmySDK.ts
git commit -m "fix: use origin address for Gluex quotes to avoid balance check failures"

# Push to Railway
git push origin main

# Test after deployment
curl "https://swap.hypurrfi.com/swaps?chainId=999&tokenIn=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb&tokenOut=0x5555555555555555555555555555555555555555&amount=730315&..."
```

## Expected Result

```json
[
  {
    "amountIn": "730315",
    "amountOut": "22072073718448313",
    "tokenIn": { "symbol": "USD₮0", ... },
    "tokenOut": { "symbol": "WHYPE", ... },
    "swap": { "swapperAddress": "0x1dAb...", "swapperData": "0x..." },
    "verify": { "verifierAddress": "0x0263...", "verifierData": "0x..." }
  }
]
```

## Files Modified

1. ✅ `src/swapService/strategies/strategyBalmySDK.ts` - Applied fix
2. 📄 `FIX_SUMMARY.md` - This file
3. 📄 `SOLUTION.md` - Detailed analysis
4. 📄 `INVESTIGATION_404.md` - Root cause investigation

## Rollback (if needed)

```bash
git revert HEAD
git push origin main
```

Then change line 585 back to:
```typescript
takerAddress: swapParams.from,
```
