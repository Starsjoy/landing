export const prerender = false;

import type { APIRoute } from 'astro';
import { addBonusRedemption, addOrder, initDB } from '../../lib/analytics';

let dbReady = false;

const PREMIUM_SEND_CHAT_ID = import.meta.env.PREMIUM_SEND_CHAT_ID || '-1003606510579';
const PREMIUM_1_12_CHAT_ID = import.meta.env.PREMIUM_1_12_CHAT_ID || '-1003951417706';
const UZGETS_CHAT_ID = import.meta.env.UZGETS_CHAT_ID || '-1003986767336';
const PREMIUM24_CHAT_ID = import.meta.env.PREMIUM24_CHAT_ID || '-1004462532058';

interface TelegramUpdate {
  update_id?: number;
  channel_post?: {
    message_id?: number;
    chat?: { id?: number };
    text?: string;
    date?: number;
  };
}

function extractUsername(raw: string): string {
  if (!raw) return '';
  // "Oluvchi:" yoki "Username:" prefiksini olib tashlash
  let s = raw.replace(/^(?:Oluvchi|Username)\s*:\s*/i, '').trim();
  // Agar "->" bo'lsa, faqat birinchi qismini olish
  s = s.split('->')[0].trim();
  // https://t.me/username  yoki  t.me/username
  const linkMatch = s.match(/(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]+)/);
  if (linkMatch) return linkMatch[1];
  // @username  yoki  bare username
  const m = s.match(/@?([A-Za-z0-9_]+)/);
  return m ? m[1] : '';
}

function parseStarsMessage(text: string) {
  // Yangi format:
  // 🌟 Yangi Stars sotildi!
  // 📦 Order: #1797
  // 👤 Oluvchi: https://t.me/user
  // 💫 Miqdor: 50 stars
  // 💰 Summa: 12,000 so'm
  // ✅ Status: Yetkazildi
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*([^\n]+)/);
  const amountMatch = text.match(/💫\s*Miqdor:\s*(.+)/) || text.match(/⭐\s*Yuborilgan:\s*(\d+)/);
  const priceMatch = text.match(/💰\s*Summa:\s*([\d\s,.]+)\s*so['']m/i)
    || text.match(/💰\s*To['']lov summasi:\s*([\d\s,.]+)\s*so['']m/i);
  const txMatch = text.match(/📦\s*Transaction ID:\s*(\S+)/);
  const statusMatch = text.match(/✅\s*Status:\s*(.+)/);

  if (!priceMatch) return null;

  // amount: agar "50 stars" formatida bo'lsa shunday qoldiramiz, agar faqat raqam bo'lsa "X stars" qo'shamiz
  let amount = amountMatch?.[1]?.trim() || '';
  if (amount && /^\d+$/.test(amount)) amount = amount + ' stars';

  return {
    orderNumber: orderMatch?.[1] || '',
    type: 'stars' as const,
    username: extractUsername(usernameMatch?.[1] || ''),
    amount,
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: txMatch?.[1] || '',
    status: statusMatch?.[1]?.trim() || 'Yetkazildi',
  };
}

function parseGiftMessage(text: string) {
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*([^\n]+)/);
  const amountMatch = text.match(/💫\s*Miqdor:\s*(.+)/);
  const priceMatch = text.match(/💰\s*Summa:\s*([\d\s,.]+)\s*so['']m/i);
  const statusMatch = text.match(/✅\s*Status:\s*(.+)/);

  if (!priceMatch) return null;

  return {
    orderNumber: orderMatch?.[1] || '',
    type: 'gift' as const,
    username: extractUsername(usernameMatch?.[1] || ''),
    amount: amountMatch?.[1]?.trim() || '',
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: '',
    status: statusMatch?.[1]?.trim() || 'Yetkazildi',
  };
}

function parsePremiumMessage(text: string) {
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*([^\n]+)/);
  const amountMatch = text.match(/💫\s*Miqdor:\s*(.+)/);
  const priceMatch = text.match(/💰\s*Summa:\s*([\d\s,.]+)\s*so['']m/i);
  const statusMatch = text.match(/✅\s*Status:\s*(.+)/);

  if (!priceMatch) return null;

  return {
    orderNumber: orderMatch?.[1] || '',
    type: 'premium' as const,
    username: extractUsername(usernameMatch?.[1] || ''),
    amount: amountMatch?.[1]?.trim() || '',
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: '',
    status: statusMatch?.[1]?.trim() || 'Yetkazildi',
  };
}

function parsePremium112Message(text: string) {
  // Premium: 12 oy
  // Narxi: 320,000
  // Username: @Shavkatov_ff
  const monthMatch = text.match(/Premium:\s*(\d+)\s*oy/i);
  const priceMatch = text.match(/Narxi:\s*([\d\s,.]+)/i);
  const usernameMatch = text.match(/Username:\s*@?(\S+)/i);

  if (!monthMatch || !priceMatch) return null;

  return {
    orderNumber: '',
    type: 'premium_1_12' as const,
    username: usernameMatch?.[1] || '',
    amount: monthMatch[1] + ' oy',
    price: parseInt(priceMatch[1].replace(/[\s,.]/g, ''), 10),
    transactionId: '',
    status: 'Yetkazildi',
  };
}

function parseBonusMessage(text: string) {
  // 🎁 User bonus oldi!
  // 📦 Order: #1797
  // 👤 @user
  // 💫 50 Stars (bonus balansdan)   yoki   💫 Gift (25 ⭐) (bonus balansdan)
  const orderMatch = text.match(/#(\d+)/);
  const usernameMatch = text.match(/👤\s*([^\n]+)/);
  const starsMatch = text.match(/💫\s*(Gift\s*\()?(\d+)/);
  if (!starsMatch) return null;
  return {
    orderNumber: orderMatch?.[1] || '',
    username: extractUsername(usernameMatch?.[1] || ''),
    kind: (starsMatch[1] ? 'gift' : 'stars') as 'gift' | 'stars',
    stars: parseInt(starsMatch[2], 10),
  };
}

function parseOrderMessage(text: string, isPremium112: boolean = false) {
  // Premium 1/12 kanal — boshqa format (no emojis)
  if (isPremium112) {
    return parsePremium112Message(text);
  }
  // Stars: 🌟 Yangi Stars sotildi!  yoki  ✨ STARS YUBORILDI
  if (text.includes('Stars sotildi') || text.includes('STARS YUBORILDI') || text.includes('🌟') || text.includes('✨')) {
    return parseStarsMessage(text);
  }
  // Gift: 🎁 Yangi Gift sotildi!
  if (text.includes('Gift sotildi') || text.includes('🎁')) {
    return parseGiftMessage(text);
  }
  // Premium: 👑 Yangi Premium sotildi!
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
    const isPremium112 = chatId === PREMIUM_1_12_CHAT_ID;
    const isUzgets = chatId === UZGETS_CHAT_ID;
    const isPremium24 = chatId === PREMIUM24_CHAT_ID;

    // DEBUG: log incoming chat_id va text
    console.log('[WEBHOOK] chat_id=' + chatId + ' | premium_send=' + isPremiumSend + ' | premium_1_12=' + isPremium112 + ' | uzgets=' + isUzgets);
    console.log('[WEBHOOK] text:', JSON.stringify(text));

    const timestamp = update.channel_post?.date
      ? new Date(update.channel_post.date * 1000)
      : new Date();

    // Telegram javobni kutolmasa (timeout) o'sha update'ni qayta yuboradi.
    // chat_id + message_id — xabarning yagona identifikatori, shu kalit bo'yicha
    // takroriy yozuv DB darajasida bloklanadi.
    const messageId = update.channel_post?.message_id;
    const msgKey = chatId && messageId ? chatId + ':' + messageId : undefined;

    // Bonus yechish — chiqim: sotuvga kirmaydi, o'z loyihasining foydasidan ayiriladi
    if (text.includes('User bonus oldi') && !isPremiumSend && !isPremium112) {
      const bonus = parseBonusMessage(text);
      if (!bonus) {
        console.log('[WEBHOOK] bonus PARSE FAILED:', JSON.stringify(text));
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'bonus no match', chatId }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      await addBonusRedemption({
        ...bonus,
        source: isPremium24 ? 'premium24' : isUzgets ? 'uzgets' : 'starsjoy',
        timestamp,
        msgKey,
      });
      return new Response(JSON.stringify({ ok: true, bonus: bonus.stars, number: bonus.orderNumber }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const order = parseOrderMessage(text, isPremium112);

    if (!order) {
      console.log('[WEBHOOK] PARSE FAILED for chat_id=' + chatId);
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no match', chatId }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[WEBHOOK] parsed:', JSON.stringify(order));

    // Premium Send kanalidan kelgan buyurtmalar: Stars xabari bo'lsa 'premium_send_stars'
    // (yangi — 50 stars/15 000 so'm, foyda 2 admin o'rtasida 50/50), aks holda (Premium
    // obuna komissiyasi) eskicha 'premium_send' bo'lib qoladi.
    if (isPremiumSend) {
      order.type = (order.type === 'stars' ? 'premium_send_stars' : 'premium_send') as any;
    }

    // Uzgets kanalidan kelgan buyurtmalar — type'ga 'uzgets_' prefiks; gift qo'llab quvvatlanmaydi
    if (isUzgets) {
      if (order.type === 'gift') {
        console.log('[WEBHOOK] uzgets gift skipped');
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'uzgets has no gift', chatId }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      order.type = ('uzgets_' + order.type) as any;
    }

    // Premium24 kanalidan kelgan buyurtmalar — StarsJoy'ga aralashmasligi uchun o'z type'i bilan
    if (isPremium24) {
      order.type = ('premium24_' + order.type) as any;
    }

    await addOrder({ ...order, timestamp, msgKey });

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
