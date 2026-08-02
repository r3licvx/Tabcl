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

// Initialize Firebase
const appFB = initializeApp(firebaseConfig);
const db = getDatabase(appFB);

// Telegram Bot Instance
const bot = new TelegramBot(token, { polling: true });
const app = Express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('⚡ Tabclbot Ultra-UI Engine is Live & Running!'));

// Helper: 2-Column Grid Category Keyboard Generator
async function getCategoryKeyboard() {
  const catRef = ref(db, 'categories');
  const snapshot = await get(catRef);
  let inlineKeyboard = [];

  if (snapshot.exists()) {
    let row = [];
    snapshot.forEach(childSnap => {
      const catName = childSnap.val();
      row.push({ text: `📁 ${catName}`, callback_data: `cat_${catName}` });
      if (row.length === 2) {
        inlineKeyboard.push(row);
        row = [];
      }
    });
    if (row.length > 0) inlineKeyboard.push(row);
  }
  return inlineKeyboard;
}

// 🟢 /start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'User';

  const welcomeText = 
    `✨ *WELCOME TO TABCLBOT* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👋 *Hey ${userName}!*\n\n` +
    `Your high-speed directory portal for streaming, downloads, and web resources.\n\n` +
    `🎯 *Quick Control Menu:*\n` +
    `• Tap *📂 All Categories* to filter by genre.\n` +
    `• Tap *🔗 Show All Links* for complete index.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

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

// 📂 /categories & Menu Button Handler
bot.onText(/\/categories|📂 All Categories/, async (msg) => {
  const chatId = msg.chat.id;
  const inlineKeyboard = await getCategoryKeyboard();

  if (inlineKeyboard.length === 0) {
    return bot.sendMessage(chatId, "⚠️ *No categories found in database.*", { parse_mode: 'Markdown' });
  }

  const catText = 
    `⚡ *SELECT CATEGORY*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Tap any category below to fetch direct links:`;

  bot.sendMessage(chatId, catText, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// 🔄 Callback Query (Category Selection Flow)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('cat_')) {
    const selectedCategory = data.replace('cat_', '');
    const sitesRef = ref(db, 'websites');
    const snapshot = await get(sitesRef);

    if (!snapshot.exists()) {
      bot.sendMessage(chatId, "⚠️ *Database is empty.*", { parse_mode: 'Markdown' });
    } else {
      let siteList = [];
      snapshot.forEach(childSnap => {
        const site = childSnap.val();
        if (site.category === selectedCategory) {
          siteList.push(site);
        }
      });

      if (siteList.length === 0) {
        bot.sendMessage(chatId, `⚠️ No active links found under *${selectedCategory}*.`, { parse_mode: 'Markdown' });
      } else {
        // Send Modern Section Header
        const headerText = 
          `📂 *CATEGORY:* \`${selectedCategory.toUpperCase()}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Showing *${siteList.length}* result(s) below 👇`;

        await bot.sendMessage(chatId, headerText, { parse_mode: 'Markdown' });

        // Loop & Send Elegant Site Cards
        for (const site of siteList) {
          const cardText = 
            `🌐 *${site.name.toUpperCase()}*\n` +
            `🏷️ *Category:* \`${site.category}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🚀 *Click the button below to visit:*`;

          const linkBtn = {
            reply_markup: {
              inline_keyboard: [
                [{ text: `🔗 Open ${site.name}`, url: site.url }]
              ]
            }
          };

          if (site.logo) {
            await bot.sendPhoto(chatId, site.logo, { 
              caption: cardText, 
              parse_mode: 'Markdown', 
              ...linkBtn 
            }).catch(() => {
              // Fallback if image URL breaks
              bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown', ...linkBtn });
            });
          } else {
            await bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown', ...linkBtn });
          }
        }

        // Quick Category Switcher at Bottom
        const nextNavKeyboard = await getCategoryKeyboard();
        await bot.sendMessage(chatId, `📌 *Explore Other Categories:*`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: nextNavKeyboard }
        });
      }
    }
  }
  bot.answerCallbackQuery(query.id);
});

// 🔗 /all & Full Index Handler
bot.onText(/\/all|🔗 Show All Links/, async (msg) => {
  const chatId = msg.chat.id;
  const sitesRef = ref(db, 'websites');
  const snapshot = await get(sitesRef);

  if (!snapshot.exists()) {
    return bot.sendMessage(chatId, "⚠️ *No links registered in database.*", { parse_mode: 'Markdown' });
  }

  let text = 
    `🌐 *TABCL DIRECTORY INDEX*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let index = 1;
  snapshot.forEach(childSnap => {
    const site = childSnap.val();
    text += `*${index}.* 🔹 [${site.name}](${site.url})\n    └ 📁 \`${site.category}\`\n\n`;
    index++;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━\n💡 _Tap any highlighted link above to open instantly!_`;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 TABCLBOT ULTRA UI ONLINE!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`=================================`);
});
