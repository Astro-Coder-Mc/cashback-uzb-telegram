import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Telegraf, Context } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Vite dev server compatibility
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Juda ko\'p so\'rov yuborildi, iltimos birozdan so\'ng urinib ko\'ring.',
});
app.use('/api/', limiter);

// Telegram Bot Setup
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminId = process.env.ADMIN_TELEGRAM_ID;
let bot: Telegraf<Context> | null = null;

// Simple in-memory session for registration
const userSessions: Record<number, { step: string; phone?: string; username?: string }> = {};

if (botToken) {
  bot = new Telegraf(botToken);

  bot.start((ctx) => {
    const chatId = ctx.chat.id;
    userSessions[chatId] = { step: 'START' };
    
    ctx.reply(`Assalomu alaykum! Cashback botimizga xush kelibsiz. 🌟\n\nRo'yxatdan o'tish uchun pastdagi tugmani bosing.`, {
      reply_markup: {
        keyboard: [
          [{ text: "📱 Telefon raqamni yuborish", request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  });

  bot.command('balance', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = userSessions[chatId];
    if (session && session.step === 'COMPLETED') {
      // In a real app, we would fetch from Firestore using the phone or username
      // For now, we'll show a placeholder or use the session if we stored it
      ctx.reply(`Sizning balansingiz: 0 UZS 💰\n\nBatafsil ma'lumot uchun ilovani oching.`);
    } else {
      ctx.reply("Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini bosing.");
    }
  });

  bot.help((ctx) => {
    ctx.reply(
      "Bot buyruqlari:\n" +
      "/start - Botni ishga tushirish\n" +
      "/me - Mening ma'lumotlarim\n" +
      "/balance - Balansni tekshirish\n" +
      "/help - Yordam\n" +
      "/app - Ilovani ochish"
    );
  });

  bot.command('app', (ctx) => {
    ctx.reply("Ilovani ochish uchun pastdagi tugmani bosing:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Ilovani ochish", web_app: { url: process.env.APP_URL || '' } }]
        ]
      }
    });
  });

  bot.on('contact', (ctx) => {
    const chatId = ctx.chat.id;
    const contact = ctx.message.contact;
    
    if (userSessions[chatId]) {
      userSessions[chatId].phone = contact.phone_number;
      userSessions[chatId].step = 'ASK_USERNAME';
      
      ctx.reply(`Rahmat! Endi iltimos, foydalanuvchi nomingizni (username) kiriting:`, {
        reply_markup: { remove_keyboard: true }
      });
    }
  });

  bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    const session = userSessions[chatId];

    if (session && session.step === 'ASK_USERNAME') {
      // Basic validation for username
      if (text.length < 3) {
        return ctx.reply("Username kamida 3 ta belgidan iborat bo'lishi kerak. Qaytadan urinib ko'ring:");
      }

      session.username = text.startsWith('@') ? text : `@${text}`;
      session.step = 'COMPLETED';

      ctx.reply(`Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz. ✅\n\nIlovani ochish va cashbacklaringizni ko'rish uchun pastdagi tugmani bosing.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Ilovani ochish", web_app: { url: process.env.APP_URL || '' } }]
          ]
        }
      });

      // Notify Admin
      if (adminId) {
        try {
          await ctx.telegram.sendMessage(adminId, 
            `🆕 Yangi foydalanuvchi ro'yxatdan o'tdi!\n\n` +
            `👤 Ism: ${ctx.from.first_name}\n` +
            `📞 Tel: ${session.phone}\n` +
            `🆔 Username: ${session.username}\n` +
            `🔗 Telegram: @${ctx.from.username || 'mavjud emas'}`
          );
        } catch (err) {
          console.error("Adminni xabardor qilishda xatolik:", err);
        }
      }
    } else if (text === '💰 My Balance') {
      ctx.reply('Sizning balansingiz: 0 UZS');
    } else if (text === '/me') {
      const chatId = ctx.chat.id;
      const session = userSessions[chatId];
      if (session && session.step === 'COMPLETED') {
        ctx.reply(`Sizning ma'lumotlaringiz:\n\n👤 Ism: ${ctx.from.first_name}\n📞 Tel: ${session.phone}\n🆔 Username: ${session.username}\n\nIlovaga kirish uchun pastdagi tugmani bosing.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Ilovani ochish", web_app: { url: process.env.APP_URL || '' } }]
            ]
          }
        });
      } else {
        ctx.reply("Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini bosing.");
      }
    }
  });

  bot.launch().then(() => {
    console.log('Telegram Bot is running...');
  }).catch(err => {
    console.error('Failed to launch bot:', err);
  });
} else {
  console.warn('TELEGRAM_BOT_TOKEN not found in environment variables. Bot is disabled.');
}

async function startServer() {
  // API Routes
  app.get('/api/bot-status', (req, res) => {
    res.json({ 
      status: botToken ? 'active' : 'missing_token',
      botName: 'CashbackerBot'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

// Enable graceful stop
process.once('SIGINT', () => bot?.stop('SIGINT'));
process.once('SIGTERM', () => bot?.stop('SIGTERM'));
