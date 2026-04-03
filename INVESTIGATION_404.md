# Investigation: 404 Error on /swaps Endpoint for Chain 999 (HyperEVM)

## Request Details
```
GET https://swap.hypurrfi.com/swaps?
  chainId=999
  &tokenIn=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
  &tokenOut=0x5555555555555555555555555555555555555555
  &amount=730315
  &targetDebt=0
  &currentDebt=0
  &receiver=0xc7e7861352df6919e7152C007832C48A777f2a4c
  &vaultIn=0x0000000000000000000000000000000000000000
  &origin=0xBE1299E1637AE06b1964d25FD6A7932974d19138
  &accountIn=0xbe1299e1637ae06b1964d25fd6a7932974d19139
  &accountOut=0xbe1299e1637ae06b1964d25fd6a7932974d19139
  &slippage=0.5
  &deadline=1770141517
  &swapperMode=0
  &isRepay=false
  &dustAccount=0xBE1299E1637AE06b1964d25FD6A7932974d19138
```

### Swap Details
- **Chain**: 999 (HyperEVM / Hyperliquid)
- **Token In**: `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb` (USD₮0, 6 decimals)
- **Token Out**: `0x5555555555555555555555555555555555555555` (WHYPE, 18 decimals)
- **Amount**: 730315 = **0.730315 USD₮0** (~$0.73)
- **Mode**: Exact Input (swapperMode=0)
- **Slippage**: 0.5%

## Root Cause Analysis

### ✅ Tokens ARE Supported
Both tokens exist in the tokenlist for chain 999:
- **File**: `tokenLists/tokenList_999.json`
- **USD₮0** at line 60-65
- **WHYPE** at line 28-33

### ✅ Chain IS Configured
Chain 999 (HyperEVM) has a routing configuration:
- **File**: `src/swapService/config/hyperevm.ts`
- **Strategy**: Balmy SDK with Gluex as the only source
- **Config**: `includeSources: ["gluex"]`

### ✅ Gluex Supports Chain 999
- **File**: `src/swapService/strategies/balmySDK/sources/gluexQuoteSource.ts`
- **Line 19-20**: Chain 999 is explicitly listed in supported chains
- **Chain mapping**: `999: "hyperevm"` (line 63)

### ❌ Problem: No Quotes Returned from Gluex

The 404 error occurs because:
1. **File**: `src/swapService/runner.ts` (lines 54-60)
2. When `finalResult.quotes` is empty, it throws `ApiError(StatusCodes.NOT_FOUND, "Swap quote not found")`
3. This means Gluex API either:
   - Returned no quotes
   - Returned an error
   - Failed to find a route for this token pair

## Possible Reasons (in order of likelihood)

### 1. **Insufficient Liquidity** (MOST LIKELY)
- Swap amount: **$0.73** is very small
- Gluex may require minimum swap amounts
- Liquidity for USD₮0 <> WHYPE pair might be insufficient at this size

### 2. **Token Pair Not Supported on Gluex**
- Even though tokens are in OUR tokenlist, Gluex might not support this specific pair
- USD₮0 might be too new or not indexed by Gluex routers

### 3. **Gluex API Changes**
- Client says "yesterday this would return a valid route"
- Gluex might have:
  - Changed their API
  - Removed support for this token
  - Increased minimum swap amounts
  - Experienced downtime

### 4. **API Key / Rate Limiting**
- Rate limits exceeded
- API key issues
- Integrator ID problems

### 5. **Network/Indexing Issues**
- Gluex indexers might be behind
- Temporary service disruption
- Chain 999 support issues on Gluex side

## Debugging Steps

### Step 1: Check Gluex API Directly

Run the debug script:
```bash
# Set credentials in environment
export GLUEX_API_KEY="your_key_here"
export GLUEX_UUID="your_uuid_here"

# Run debug script
node debug-gluex.js
```

Expected responses:
- **Success**: Returns `outputAmount` and `router`
- **No route**: Returns empty or error
- **Token unsupported**: Returns error message
- **Amount too small**: Returns error or zero output

### Step 2: Enable Verbose Logging

The code has extensive logging. Check server logs for:
```
[BalmySDK] findSwap called
[BalmySDK] Available sources for chain 999
[BalmySDK] exactIn: fetching quotes...
[BalmySDK] exactIn: received X quotes
[GlueX] Quote request
[GlueX] Quote response
[GlueX] Quote failed
```

### Step 3: Test with Larger Amount

Try the same swap with a larger amount:
```
amount=10000000  (10 USD₮0 = ~$10)
```

If this works, it confirms minimum swap amount issue.

### Step 4: Test Reverse Swap

Try swapping WHYPE -> USD₮0:
```
tokenIn=0x5555555555555555555555555555555555555555
tokenOut=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
amount=1000000000000000000  (1 WHYPE)
```

### Step 5: Test Different Token Pairs

Test with known liquid pairs on HyperEVM:
- WHYPE <> USDC
- WHYPE <> USDH

If these work, it confirms USD₮0 specifically is the problem.

## Code Locations for Investigation

### Request Validation
- **File**: `src/api/routes/swap/swapRouter.ts`
- **Lines 136-156**: Token validation (both tokens pass here)

### Pipeline Execution
- **File**: `src/swapService/runner.ts`
- **Lines 36-46**: Pipeline execution loop
- **Line 45**: Breaks on first successful quote
- **Lines 54-60**: Throws 404 if no quotes found

### Gluex Integration
- **File**: `src/swapService/strategies/balmySDK/sources/gluexQuoteSource.ts`
- **Lines 42-177**: Quote request logic
- **Lines 90-99**: Request logging
- **Lines 115-124**: Error handling
- **Lines 127-138**: Response validation

### Balmy SDK Strategy
- **File**: `src/swapService/strategies/strategyBalmySDK.ts`
- **Lines 209-255**: Main findSwap method
- **Lines 257-268**: Exact input handling
- **Lines 505-539**: getAllQuotesWithTxs method

## Quick Fixes to Try

### 1. Add Fallback Sources
Edit `src/swapService/config/hyperevm.ts`:
```typescript
config: {
  sourcesFilter: {
    includeSources: ["gluex", "uniswap"],  // Add Uniswap as fallback
  },
},
```

### 2. Increase Timeout
Edit `src/swapService/strategies/strategyBalmySDK.ts` line 47:
```typescript
const DEFAULT_TIMEOUT = "60000"  // Increase from 30s to 60s
```

### 3. Add Better Error Logging
Edit `src/swapService/runner.ts` line 54-60:
```typescript
if (!finalResult.quotes || finalResult.quotes.length === 0) {
  console.error('[RUNNER] No quotes found. All results:', JSON.stringify(allResults, null, 2));
  throw new ApiError(
    StatusCodes.NOT_FOUND,
    "Swap quote not found",
    allResults,
  )
}
```

## External API Test

Test Gluex API manually:
```bash
curl -X POST https://router.gluex.xyz/v1/quote \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "chainID": "hyperevm",
    "inputToken": "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    "outputToken": "0x5555555555555555555555555555555555555555",
    "inputAmount": "730315",
    "orderType": "SELL",
    "userAddress": "0xc7e7861352df6919e7152C007832C48A777f2a4c",
    "outputReceiver": "0xc7e7861352df6919e7152C007832C48A777f2a4c",
    "uniquePID": "YOUR_UUID",
    "slippage": 0.5
  }'
```

## Next Steps

1. **Immediate**: Run Gluex API test to see exact error
2. **Short-term**: Add verbose logging and test with different amounts
3. **Medium-term**: Add fallback DEX sources for chain 999
4. **Long-term**: Implement minimum swap amount validation

## Contact Points

- **Gluex Support**: Check if USD₮0 is supported
- **Liquidity Providers**: Confirm USD₮0 <> WHYPE pool exists
- **Client**: Confirm what changed between "yesterday" and today
