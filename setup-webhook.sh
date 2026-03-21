#!/bin/bash
# Telegram bot webhook sozlash scripti
# Ishlatish: bash setup-webhook.sh <BOT_TOKEN> <WEBHOOK_SECRET>

BOT_TOKEN=$1
SECRET=$2

if [ -z "$BOT_TOKEN" ] || [ -z "$SECRET" ]; then
  echo "Ishlatish: bash setup-webhook.sh <BOT_TOKEN> <WEBHOOK_SECRET>"
  echo ""
  echo "Qadamlar:"
  echo "1. @BotFather dan yangi bot yarating"
  echo "2. Bot tokenini oling"
  echo "3. Botni orders kanaliga admin qilib qo'shing"
  echo "4. Webhook secret o'ylab toping (masalan: mysecret123)"
  echo "5. Vercel env ga qo'shing:"
  echo "   TELEGRAM_BOT_TOKEN=<token>"
  echo "   TELEGRAM_WEBHOOK_SECRET=<secret>"
  echo "6. Shu scriptni ishga tushiring"
  exit 1
fi

WEBHOOK_URL="https://starsjoy.uz/api/telegram-webhook?secret=${SECRET}"

echo "Webhook o'rnatilmoqda..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}" | python3 -m json.tool

echo ""
echo "Webhook holati:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool
