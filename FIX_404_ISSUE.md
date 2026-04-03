# FIX: 404 Error on /swaps Endpoint for Chain 999

## Root Cause Identified ✅

**The Gluex API credentials (`GLUEX_API_KEY` and `GLUEX_UUID`) are NOT set in the environment**, causing the Balmy SDK to skip Gluex entirely as a quote source.

### Evidence

1. **Gluex API works perfectly** - Tested directly and returns valid quote:
   ```
   Input: 0.730315 USD₮0
   Output: 21794566416831251 (0.0218 WHYPE)
   Status: 200 OK
   ```

2. **Config validation requires credentials** - In `strategyBalmySDK.ts` line 188:
   ```typescript
   isConfigAndContextValidForQuoting(config) {
     const isValid = !!config?.apiKey && !!config?.integratorId
     return isValid  // Returns false if either is missing!
   }
   ```

3. **No .env file locally** - Credentials were not set in local development environment

4. **Production (Railway) likely has same issue** - The 404 error at `https://swap.hypurrfi.com` suggests the same missing credentials

## Solution

### For Local Development

Already fixed! Added to `.env`:
```bash
GLUEX_API_KEY="SVQkMIOLo9O2NpA0xI0pQGPV1FYIYXmk"
GLUEX_UUID="657a8d5a95d73a70a4b49319544a42ad61d689c83679fcfe6b80e8e9b51cfe2c"
```

### For Production (Railway) 🚨 REQUIRED

Set these environment variables on Railway:

```bash
railway variables --set GLUEX_API_KEY="SVQkMIOLo9O2NpA0xI0pQGPV1FYIYXmk"
railway variables --set GLUEX_UUID="657a8d5a95d73a70a4b49319544a42ad61d689c83679fcfe6b80e8e9b51cfe2c"
```

Or via Railway Dashboard:
1. Go to your project on Railway
2. Navigate to Variables tab
3. Add:
   - `GLUEX_API_KEY` = `SVQkMIOLo9O2NpA0xI0pQGPV1FYIYXmk`
   - `GLUEX_UUID` = `657a8d5a95d73a70a4b49319544a42ad61d689c83679fcfe6b80e8e9b51cfe2c`
4. Redeploy the service

**Note**: Railway might already have these set. If so, verify the values match exactly (case-sensitive).

## Testing After Fix

### Test the Original Failing Request

```bash
curl "https://swap.hypurrfi.com/swaps?chainId=999&tokenIn=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb&tokenOut=0x5555555555555555555555555555555555555555&amount=730315&targetDebt=0&currentDebt=0&receiver=0xc7e7861352df6919e7152C007832C48A777f2a4c&vaultIn=0x0000000000000000000000000000000000000000&origin=0xBE1299E1637AE06b1964d25FD6A7932974d19138&accountIn=0xbe1299e1637ae06b1964d25fd6a7932974d19139&accountOut=0xbe1299e1637ae06b1964d25fd6a7932974d19139&slippage=0.5&deadline=1770141517&swapperMode=0&isRepay=false&dustAccount=0xBE1299E1637AE06b1964d25FD6A7932974d19138"
```

**Expected Result**: HTTP 200 with swap quote array

### Verify Locally

```bash
# Start the dev server
npm run dev

# In another terminal
curl "http://localhost:3001/swaps?chainId=999&tokenIn=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb&tokenOut=0x5555555555555555555555555555555555555555&amount=730315&targetDebt=0&currentDebt=0&receiver=0xc7e7861352df6919e7152C007832C48A777f2a4c&vaultIn=0x0000000000000000000000000000000000000000&origin=0xBE1299E1637AE06b1964d25FD6A7932974d19138&accountIn=0xbe1299e1637ae06b1964d25fd6a7932974d19139&accountOut=0xbe1299e1637ae06b1964d25fd6a7932974d19139&slippage=0.5&deadline=9999999999&swapperMode=0&isRepay=false&dustAccount=0xBE1299E1637AE06b1964d25FD6A7932974d19138"
```

Check logs for:
```
[GlueX] isConfigAndContextValidForQuoting: { hasApiKey: true, hasIntegratorId: true, isValid: true }
[BalmySDK] Available sources for chain 999: [ 'gluex' ]
[BalmySDK] exactIn: received 1 quotes from sources: [ 'gluex' ]
```

## Why "Yesterday It Worked"

Possible explanations:
1. **Environment variables were recently removed/changed** on Railway
2. **Railway service was recreated** without env vars
3. **Deployment issue** where env vars weren't propagated
4. **API key rotation** - old key expired, new key not set

## Additional Notes

### Gluex Quote Characteristics (from testing)

✅ **Works for SMALL amounts**: 0.73 USD₮0 → WHYPE succeeds
❌ **Fails for LARGER amounts**: 10 USD₮0 → WHYPE fails ("Unable to fetch solution")
⚠️  **Simulation warnings**: Returns `lowBalance: true` (user doesn't have tokens)
⚠️  **Limited liquidity**: USD₮0 <> WHYPE pair has very shallow liquidity

### Environment Variable Names

The code checks MULTIPLE env var names (for flexibility):
- `GLUEX_API_KEY` or `NEXT_PUBLIC_GLUEX_API_KEY`
- `GLUEX_UUID` or `NEXT_PUBLIC_GLUEX_UUID`

Set the standard names (`GLUEX_API_KEY` and `GLUEX_UUID`) for clarity.

### Files Modified

- `.env` - Added Gluex credentials locally
- `debug-gluex.js` - Debug script for testing Gluex API directly
- `debug-gluex-tests.js` - Comprehensive test suite
- `INVESTIGATION_404.md` - Full investigation report
- `FIX_404_ISSUE.md` - This file

### Code Locations

If you need to debug further:

**Config validation**:
- `src/swapService/strategies/strategyBalmySDK.ts` line 157-165
- `src/swapService/strategies/balmySDK/sources/gluexQuoteSource.ts` line 185-201

**Pipeline execution**:
- `src/swapService/runner.ts` line 54-60 (throws 404 if no quotes)

**Gluex integration**:
- `src/swapService/strategies/balmySDK/sources/gluexQuoteSource.ts` (full implementation)

## Verification Checklist

- [ ] Credentials added to Railway environment variables
- [ ] Service redeployed on Railway
- [ ] Original failing request now returns 200 OK
- [ ] Response contains valid quote array
- [ ] Logs show Gluex is being called
- [ ] Client confirms issue is resolved

## Alternative: Add Fallback Sources

If Gluex continues to have issues, add fallback DEX sources for chain 999 in `src/swapService/config/hyperevm.ts`:

```typescript
config: {
  sourcesFilter: {
    includeSources: ["gluex", "uniswap", "oku"],  // Add fallbacks
  },
},
```

This ensures the router can find quotes even if Gluex fails.
