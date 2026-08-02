require('dotenv').config();
const Express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const token = process.env.BOT_TOKEN || '8928212170:AAGn6VLDQ13tkKVePqq-DOXpFFVdF23eVrQ';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyADxTq7n2lazvh_lDmZb429O8jcSVPcIN0",
  authDomain: "tabcl-official.firebaseapp.com",
  databaseURL: "https://tabcl-official-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tabcl-official",
  storageBucket: "tabcl-official.firebasestorage.app",
  messagingSenderId: "61381537456",
  appId: "1:61381537456:web:b2e0db82bea800d6f65575"
};

// Initialize
const appFB = initializeApp(firebaseConfig);
const db = getDatabase(appFB);

// Telegram Bot Instance with Polling
const bot = new TelegramBot(token, { polling: true });
const app = Express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('⚡ Tabclbot is Live & Running on Railway!'));

// /start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'User';

  const welcomeText = `👋 **Welcome, ${userName}!**\n\n` +
    `Main hoon **Tabclbot**! 🤖\n` +
    `*Find links for streaming/downloading instantly!*\n\n` +
    `📜 **Commands:**\n` +
    `• /categories - All Categories\n` +
    `• /all - All Directory Links\n\n` +
    `Niche menu button daba kar direct browse kar! 👇`;

  const keyboard = {
    reply_markup: {
      keyboard: [
        [{ text: "📂 All Categories" }, { text: "🔗 Show All Links" }]
      ],
      resize_keyboard: true
    }
  };

  bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown', ...keyboard });
});

// /categories & Button Handler
bot.onText(/\/categories|📂 All Categories/, async (msg) => {
  const chatId = msg.chat.id;
  const catRef = ref(db, 'categories');
  const snapshot = await get(catRef);

  if (!snapshot.exists()) {
    return bot.sendMessage(chatId, "⚠️ Abhi koi categories add nahi hui hain.");
  }

  let inlineKeyboard = [];
  snapshot.forEach(childSnap => {
    const catName = childSnap.val();
    inlineKeyboard.push([{ text: `📁 ${catName}`, callback_data: `cat_${catName}` }]);
  });

  bot.sendMessage(chatId, "🎯 **Select a Category:**", {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// Callback Query (Category Clicked)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('cat_')) {
    const selectedCategory = data.replace('cat_', '');
    const sitesRef = ref(db, 'websites');
    const snapshot = await get(sitesRef);

    if (!snapshot.exists()) {
      bot.sendMessage(chatId, "⚠️ Iss category me koi links nahi mile.");
    } else {
      let found = false;
      snapshot.forEach(childSnap => {
        const site = childSnap.val();
        if (site.category === selectedCategory) {
          found = true;
          const caption = `🌐 **${site.name}**\n📁 Category: ${site.category}\n🔗 **Link:** ${site.url}`;

          if (site.logo) {
            bot.sendPhoto(chatId, site.logo, { caption: caption, parse_mode: 'Markdown' }).catch(() => {
              bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
            });
          } else {
            bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
          }
        }
      });

      if (!found) {
        bot.sendMessage(chatId, `⚠️ **${selectedCategory}** me koi links available nahi hain.`);
      }
    }
  }
  bot.answerCallbackQuery(query.id);
});

// /all & Show All Links Handler
bot.onText(/\/all|🔗 Show All Links/, async (msg) => {
  const chatId = msg.chat.id;
  const sitesRef = ref(db, 'websites');
  const snapshot = await get(sitesRef);

  if (!snapshot.exists()) {
    return bot.sendMessage(chatId, "⚠️ Database me koi links nahi hain.");
  }

  let text = "🌐 **All Streaming & Download Links:**\n\n";
  snapshot.forEach(childSnap => {
    const site = childSnap.val();
    text += `🔹 **[${site.name}](${site.url})** (${site.category})\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 TABCLBOT IS ONLINE ON RAILWAY!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`=================================`);
});
