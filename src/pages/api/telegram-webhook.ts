export const prerender = false;

import type { APIRoute } from 'astro';
import { addOrder, initDB } from '../../lib/analytics';

let dbReady = false;

const PREMIUM_SEND_CHAT_ID = import.meta.env.PREMIUM_SEND_CHAT_ID || '-1003606510579';

interface TelegramUpdate {
  channel_post?: {
    chat?: { id?: number };
    text?: string;
    date?: number;
  };
}

function parseStarsMessage(text: string) {
  // ✨ STARS YUBORILDI
  // #684
  // 👤 Username: @k0milov_cs
  // ⭐ Yuborilgan: 50
  // 💰 To'lov summasi: 12000 so'm
  // 📦 Transaction ID: xxx
  // 🕒 3/21/2026, 6:10:17 PM
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*Username:\s*@?(\S+)/);
  const amountMatch = text.match(/⭐\s*Yuborilgan:\s*(\d+)/);
  const priceMatch = text.match(/💰\s*To['']lov summasi:\s*([\d\s,.]+)\s*so['']m/i);
  const txMatch = text.match(/📦\s*Transaction ID:\s*(\S+)/);

  if (!amountMatch || !priceMatch) return null;

  return {
    orderNumber: orderMatch?.[1] || '',
    type: 'stars' as const,
    username: usernameMatch?.[1] || '',
    amount: amountMatch[1] + ' stars',
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: txMatch?.[1] || '',
    status: 'Yuborildi',
  };
}

function parseGiftMessage(text: string) {
  // 🎁 Yangi Gift sotildi!
  // 📦 Order: #651
  // 👤 Oluvchi: k0milov_cs
  // 💫 Miqdor: 50 stars
  // 💰 Summa: 12,000 so'm
  // ✅ Status: Yetkazildi
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*Oluvchi:\s*@?(\S+)/);
  const amountMatch = text.match(/💫\s*Miqdor:\s*(.+)/);
  const priceMatch = text.match(/💰\s*Summa:\s*([\d\s,.]+)\s*so['']m/i);
  const statusMatch = text.match(/✅\s*Status:\s*(.+)/);

  if (!priceMatch) return null;

  return {
    orderNumber: orderMatch?.[1] || '',
    type: 'gift' as const,
    username: usernameMatch?.[1] || '',
    amount: amountMatch?.[1]?.trim() || '',
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: '',
    status: statusMatch?.[1]?.trim() || 'Yetkazildi',
  };
}

function parsePremiumMessage(text: string) {
  // 👑 Yangi Premium sotildi!
  // 📦 Order: #617
  // 👤 Oluvchi: Suxa_1517
  // 💫 Miqdor: 3 oy
  // 💰 Summa: 172,000 so'm
  // ✅ Status: Yetkazildi
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*Oluvchi:\s*@?(\S+)/);
  const amountMatch = text.match(/💫\s*Miqdor:\s*(.+)/);
  const priceMatch = text.match(/💰\s*Summa:\s*([\d\s,.]+)\s*so['']m/i);
  const statusMatch = text.match(/✅\s*Status:\s*(.+)/);

  if (!priceMatch) return null;

  return {
    orderNumber: orderMatch?.[1] || '',
    type: 'premium' as const,
    username: usernameMatch?.[1] || '',
    amount: amountMatch?.[1]?.trim() || '',
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: '',
    status: statusMatch?.[1]?.trim() || 'Yetkazildi',
  };
}

function parseOrderMessage(text: string) {
  if (text.includes('STARS YUBORILDI') || text.includes('✨')) {
    return parseStarsMessage(text);
  }
  if (text.includes('Gift sotildi') || text.includes('🎁')) {
    return parseGiftMessage(text);
  }
  if (text.includes('Premium sotildi') || text.includes('👑')) {
    return parsePremiumMessage(text);
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  // Verify webhook secret
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = import.meta.env.TELEGRAM_WEBHOOK_SECRET || '';

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response('forbidden', { status: 403 });
  }

  if (!dbReady) {
    try { await initDB(); dbReady = true; } catch (e) {
      console.error('DB init error:', e);
      return new Response('db error', { status: 500 });
    }
  }

  try {
    const update: TelegramUpdate = await request.json();
    const text = update.channel_post?.text;

    if (!text) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatId = String(update.channel_post?.chat?.id || '');
    const isPremiumSend = chatId === PREMIUM_SEND_CHAT_ID;
    const order = parseOrderMessage(text);

    if (!order) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no match' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Premium Send kanalidan kelgan buyurtmalar — type ni premium_send ga o'zgartirish
    if (isPremiumSend) {
      order.type = 'premium_send' as any;
    }

    const timestamp = update.channel_post?.date
      ? new Date(update.channel_post.date * 1000)
      : new Date();

    await addOrder({ ...order, timestamp });

    return new Response(JSON.stringify({ ok: true, order: order.type, number: order.orderNumber }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ ok: false, error: 'parse error' }), {
      status: 200, // Always 200 for Telegram
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
