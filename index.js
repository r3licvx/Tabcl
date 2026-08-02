require('dotenv').config();
const Express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const token = process.env.BOT_TOKEN || '8928212170:AAGn6VLDQ13tkKVePqq-DOXpFFVdF23eVrQ';

// 🛑 FORCE JOIN CONFIG (EXACT GROUP ID)
const TARGET_GROUP_LINK = "https://t.me/+3Ximsihx6yYwNWE1"; 
const TARGET_CHAT_ID = "-1004497948333"; // Fixed Private Group ID Format!

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

// Track Sent Messages to Auto-Clean Chat History
const userMessageHistory = {};

app.get('/', (req, res) => res.send('⚡ Tabclbot Ultra-UI with Fixed Force-Sub Engine is Live!'));

// ----------------------------------------------------
// 🛡️ HELPER: Strict Force Join Checker
// ----------------------------------------------------
async function checkForceSub(userId) {
  try {
    const member = await bot.getChatMember(TARGET_CHAT_ID, userId);
    // Allowed status only if active in group
    if (['creator', 'administrator', 'member'].includes(member.status)) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Force Sub Check Error:", error.message);
    // Strict Lock: If not found or left group, block access
    return false; 
  }
}

// Send Force Sub Warning Block
async function sendForceSubPrompt(chatId) {
  const joinText = 
    `📢 *ACCESS RESTRICTED!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Bot ko use karne ke liye aapko hamara official group join karna compulsory hai.\n\n` +
    `🔹 Pehle niche button se group join karein.\n` +
    `🔹 Phir *Verify Membership* par click karein!\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  const joinBtn = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💬 Join Official Group", url: TARGET_GROUP_LINK }],
        [{ text: "✅ Verify Membership", callback_data: "verify_sub" }]
      ]
    }
  };

  await bot.sendMessage(chatId, joinText, { parse_mode: 'Markdown', ...joinBtn });
}

// ----------------------------------------------------
// 🧹 HELPER: Clear User Chat History
// ----------------------------------------------------
function trackMessage(userId, messageId) {
  if (!userMessageHistory[userId]) {
    userMessageHistory[userId] = [];
  }
  userMessageHistory[userId].push(messageId);
}

async function clearChatHistory(chatId, userId) {
  if (userMessageHistory[userId] && userMessageHistory[userId].length > 0) {
    for (const msgId of userMessageHistory[userId]) {
      try {
        await bot.deleteMessage(chatId, msgId);
      } catch (e) {
        // Ignore errors
      }
    }
    userMessageHistory[userId] = [];
  }
}

// ----------------------------------------------------
// 📁 HELPER: 2-Column Category Keyboard
// ----------------------------------------------------
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

// ----------------------------------------------------
// 🟢 /start Command
// ----------------------------------------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name || 'User';

  // Strict Force Sub Check
  const isJoined = await checkForceSub(userId);
  if (!isJoined) {
    return sendForceSubPrompt(chatId);
  }

  await clearChatHistory(chatId, userId);

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

  const sent = await bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown', ...keyboard });
  trackMessage(userId, sent.message_id);
});

// ----------------------------------------------------
// 📂 /categories & Menu Button Handler
// ----------------------------------------------------
bot.onText(/\/categories|📂 All Categories/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isJoined = await checkForceSub(userId);
  if (!isJoined) {
    return sendForceSubPrompt(chatId);
  }

  await clearChatHistory(chatId, userId);

  const inlineKeyboard = await getCategoryKeyboard();

  if (inlineKeyboard.length === 0) {
    const sent = await bot.sendMessage(chatId, "⚠️ *No categories found in database.*", { parse_mode: 'Markdown' });
    return trackMessage(userId, sent.message_id);
  }

  const catText = 
    `⚡ *SELECT CATEGORY*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Tap any category below to fetch direct links:`;

  const sent = await bot.sendMessage(chatId, catText, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
  trackMessage(userId, sent.message_id);
});

// ----------------------------------------------------
// 🔄 Callback Query (Category Selection & Verification)
// ----------------------------------------------------
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  // 1️⃣ Verification Handler
  if (data === 'verify_sub') {
    const isJoined = await checkForceSub(userId);
    if (isJoined) {
      await bot.answerCallbackQuery(query.id, { text: "✅ Membership Verified! Welcome!", show_alert: true });
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e){}
      
      bot.sendMessage(chatId, "🎉 *Verification Successful!* Type /start or tap menu to begin.", { parse_mode: 'Markdown' });
    } else {
      await bot.answerCallbackQuery(query.id, { text: "❌ Pehle Group Join Karein Phir Click Karein!", show_alert: true });
    }
    return;
  }

  // Check Force Sub before proceeding
  const isJoined = await checkForceSub(userId);
  if (!isJoined) {
    await bot.answerCallbackQuery(query.id, { text: "⚠️ Pehle Group Join Karo!", show_alert: true });
    return sendForceSubPrompt(chatId);
  }

  // 2️⃣ Category Clicked Handler
  if (data.startsWith('cat_')) {
    const selectedCategory = data.replace('cat_', '');

    await clearChatHistory(chatId, userId);

    const sitesRef = ref(db, 'websites');
    const snapshot = await get(sitesRef);

    if (!snapshot.exists()) {
      const sent = await bot.sendMessage(chatId, "⚠️ *Database is empty.*", { parse_mode: 'Markdown' });
      trackMessage(userId, sent.message_id);
    } else {
      let siteList = [];
      snapshot.forEach(childSnap => {
        const site = childSnap.val();
        if (site.category === selectedCategory) {
          siteList.push(site);
        }
      });

      if (siteList.length === 0) {
        const sent = await bot.sendMessage(chatId, `⚠️ No active links found under *${selectedCategory}*.`, { parse_mode: 'Markdown' });
        trackMessage(userId, sent.message_id);
      } else {
        const headerText = 
          `📂 *CATEGORY:* \`${selectedCategory.toUpperCase()}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Showing *${siteList.length}* result(s) below 👇`;

        const sentHeader = await bot.sendMessage(chatId, headerText, { parse_mode: 'Markdown' });
        trackMessage(userId, sentHeader.message_id);

        for (const site of siteList) {
          const cardText = 
            `🌐 *${site.name.toUpperCase()}*\n` +
            `🏷️ *Category:* \`${site.category}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🚀 *Click below to visit site:*`;

          const linkBtn = {
            reply_markup: {
              inline_keyboard: [
                [{ text: `🔗 Open ${site.name}`, url: site.url }]
              ]
            }
          };

          let sentCard;
          if (site.logo) {
            try {
              sentCard = await bot.sendPhoto(chatId, site.logo, { caption: cardText, parse_mode: 'Markdown', ...linkBtn });
            } catch (err) {
              sentCard = await bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown', ...linkBtn });
            }
          } else {
            sentCard = await bot.sendMessage(chatId, cardText, { parse_mode: 'Markdown', ...linkBtn });
          }
          trackMessage(userId, sentCard.message_id);
        }

        const nextNavKeyboard = await getCategoryKeyboard();
        const sentSwitch = await bot.sendMessage(chatId, `📌 *Explore Other Categories:*`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: nextNavKeyboard }
        });
        trackMessage(userId, sentSwitch.message_id);
      }
    }
  }
  bot.answerCallbackQuery(query.id);
});

// ----------------------------------------------------
// 🔗 /all Full Index Handler
// ----------------------------------------------------
bot.onText(/\/all|🔗 Show All Links/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isJoined = await checkForceSub(userId);
  if (!isJoined) {
    return sendForceSubPrompt(chatId);
  }

  await clearChatHistory(chatId, userId);

  const sitesRef = ref(db, 'websites');
  const snapshot = await get(sitesRef);

  if (!snapshot.exists()) {
    const sent = await bot.sendMessage(chatId, "⚠️ *No links registered in database.*", { parse_mode: 'Markdown' });
    return trackMessage(userId, sent.message_id);
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

  const sent = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
  trackMessage(userId, sent.message_id);
});

// ----------------------------------------------------
// Start Express Server
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 TABCLBOT STRICT FORCE-SUB ENGINE ONLINE!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`=================================`);
});
