# T3 Code release checker

A script to fetch the latest [pingdotgg/t3code](https://github.com/pingdotgg/t3code) stable release metadata from GitHub's [releases api](https://docs.github.com/en/rest/releases/releases#get-the-latest-release) and compares it with `last-seen-version.txt`. When the version changes, it sends a message such as `T3 Code release changed: 0.1.0 -> 0.2.0` to `DISCORD_WEBHOOK_URL` using [Discord's webhook API](https://docs.discord.com/developers/resources/webhook#execute-webhook).

## Setup

```sh
cd t3code-release-checker
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
npm run check
```
