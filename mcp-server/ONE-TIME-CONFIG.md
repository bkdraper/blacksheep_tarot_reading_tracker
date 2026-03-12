# Security Setup - ALMOST DONE

## ✅ Lambda Concurrency Limit - DONE
Reserved concurrency set to 5 concurrent executions.

## ⏳ Budget Alert - DO THIS NOW (2 minutes)

**Easiest: AWS Console**
1. Go to: https://console.aws.amazon.com/billing/home#/budgets
2. Click "Create budget" → "Customize (advanced)" → "Cost budget"
3. Name: "BedrockMonthlyLimit", Amount: $10/month
4. Add alert at 80% ($8) with your email
5. Add alert at 100% ($10) with your email
6. Create

**Or: AWS CLI**
1. Edit `budget-notifications.json` - replace YOUR_EMAIL@example.com (2 places)
2. Run:
```bash
aws budgets create-budget --account-id 944012085152 --budget file://budget-config.json --notifications-with-subscribers file://budget-notifications.json
```

## What's Protected

✅ **Concurrency cap** - Max 5 simultaneous requests
⏳ **Budget alerts** - Email at $8 and $10
✅ **Code cleaned** - Removed weak rate limiting

## How It Works

- Max 5 requests run at once (6th gets throttled)
- With 5-10 sec Bedrock response = ~30-50 req/min max
- Budget alerts before bills get crazy
- Normal usage: $2-3/month
- Under attack: $8-10/month (then alert fires)
