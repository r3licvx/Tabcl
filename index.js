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

app.get('/', (req, res) => res.send('⚡ Tabclbot is Live & Running with Premium UI!'));

// Helper: Custom Inline Category Menu Generator
async function getCategoryKeyboard() {
  const catRef = ref(db, 'categories');
  const snapshot = await get(catRef);
  let inlineKeyboard = [];

  if (snapshot.exists()) {
    let row = [];
    snapshot.forEach(childSnap => {
      const catName = childSnap.val();
      row.push({ text: `📁 ${catName}`, callback_data: `cat_${catName}` });
      if (row.length === 2) { // 2 categories per row for clean look
        inlineKeyboard.push(row);
        row = [];
      }
    });
    if (row.length > 0) inlineKeyboard.push(row);
  }
  return inlineKeyboard;
}

// /start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'User';

  const welcomeText = 
    `✨ *WELCOME TO TABCLBOT* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👋 Hey *${userName}*!\n\n` +
    `Your ultimate portal for streaming & downloading directory links.\n\n` +
    `🚀 *Quick Actions:*\n` +
    `• Click *📂 Categories* to browse by topic.\n` +
    `• Click *🔗 All Links* to view everything.\n` +
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

// /categories & Button Handler
bot.onText(/\/categories|📂 All Categories/, async (msg) => {
  const chatId = msg.chat.id;
  const inlineKeyboard = await getCategoryKeyboard();

  if (inlineKeyboard.length === 0) {
    return bot.sendMessage(chatId, "⚠️ *No categories found in database.*", { parse_mode: 'Markdown' });
  }

  const catText = 
    `🎯 *SELECT A CATEGORY*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Choose a category below to explore streaming links:`;

  bot.sendMessage(chatId, catText, {
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
      bot.sendMessage(chatId, "⚠️ *No links available right now.*", { parse_mode: 'Markdown' });
    } else {
      let found = false;
      let siteList = [];

      snapshot.forEach(childSnap => {
        const site = childSnap.val();
        if (site.category === selectedCategory) {
          found = true;
          siteList.push(site);
        }
      });

      if (!found) {
        bot.sendMessage(chatId, `⚠️ No links found under *${selectedCategory}*.`, { parse_mode: 'Markdown' });
      } else {
        // Send Header Banner for Category
        const headerMsg = 
          `📂 *CATEGORY:* \`${selectedCategory.toUpperCase()}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Found *${siteList.length}* link(s) in this section 👇`;

        await bot.sendMessage(chatId, headerMsg, { parse_mode: 'Markdown' });

        // Send Stylish Cards for Each Site
        for (const site of siteList) {
          const cardText = 
            `🌐 *${site.name.toUpperCase()}*\n` +
            `🏷️ *Category:* \`${site.category}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚡ *Click below to visit site directly:*`;

          const linkButton = {
            reply_markup: {
              inline_keyboard: [
                [{ text: `🚀 Open ${site.name}`, url: site.url }]
              ]
            }
          };

          if (site.logo) {
            await bot.sendPhoto(chatId, site.logo, { 
              caption: cardText, 
              parse_mode: 'Markdown', 
              ...linkButton 
            }).catch(() => {
              bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown', ...linkButton });
            });
          } else {
            await bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown', ...linkButton });
          }
        }

        // Quick Category Switcher at Bottom (Prevents Mess)
        const nextNavKeyboard = await getCategoryKeyboard();
        await bot.sendMessage(chatId, `📌 *Want to explore another category?*`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: nextNavKeyboard }
        });
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
    return bot.sendMessage(chatId, "⚠️ *Database is completely empty!*", { parse_mode: 'Markdown' });
  }

  let text = 
    `🌐 *ALL STREAMING DIRECTORY LINKS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let count = 1;
  snapshot.forEach(childSnap => {
    const site = childSnap.val();
    text += `${count}. 🔹 *[${site.name}](${site.url})*\n   └ 📁 \`${site.category}\`\n\n`;
    count++;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━\n💡 _Tap any link above to open instantly!_`;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 TABCLBOT STYLISH UI ONLINE!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`=================================`);
});
