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

const appFB = initializeApp(firebaseConfig);
const db = getDatabase(appFB);
const bot = new TelegramBot(token);

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      return res.status(200).send('⚡ Tabclbot Webhook Server is Active on Vercel!');
    }

    if (req.method === 'POST') {
      const { message, callback_query } = req.body;

      // Handle Callback Query (Category Click)
      if (callback_query) {
        const chatId = callback_query.message.chat.id;
        const data = callback_query.data;

        if (data.startsWith('cat_')) {
          const selectedCategory = data.replace('cat_', '');
          const sitesRef = ref(db, 'websites');
          const snapshot = await get(sitesRef);

          if (!snapshot.exists()) {
            await bot.sendMessage(chatId, "⚠️ Iss category me koi links nahi mile.");
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
              await bot.sendMessage(chatId, `⚠️ **${selectedCategory}** me koi links available nahi hain.`);
            }
          }
        }
        return res.status(200).send('OK');
      }

      // Handle Normal Messages
      if (!message || !message.text) {
        return res.status(200).send('OK');
      }

      const chatId = message.chat.id;
      const userText = message.text;

      // /start Command
      if (userText === '/start') {
        const userName = message.from.first_name || 'User';
        const welcomeText = `👋 **Welcome, ${userName}!**\n\n` +
          `Main hoon **Tabclbot**! 🤖\n` +
          `*Find links for streaming/downloading instantly!*\n\n` +
          `📜 **Commands:**\n` +
          `• /categories - All Categories\n` +
          `• /all - All Directory Links\n\n` +
          `Niche button daba kar direct browse kar! 👇`;

        const keyboard = {
          reply_markup: {
            keyboard: [
              [{ text: "📂 All Categories" }, { text: "🔗 Show All Links" }]
            ],
            resize_keyboard: true
          }
        };

        await bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown', ...keyboard });
        return res.status(200).send('OK');
      }

      // /categories or Button Click
      if (userText === '/categories' || userText === '📂 All Categories') {
        const catRef = ref(db, 'categories');
        const snapshot = await get(catRef);

        if (!snapshot.exists()) {
          await bot.sendMessage(chatId, "⚠️ Abhi koi categories add nahi hui hain.");
        } else {
          let inlineKeyboard = [];
          snapshot.forEach(childSnap => {
            const catName = childSnap.val();
            inlineKeyboard.push([{ text: `📁 ${catName}`, callback_data: `cat_${catName}` }]);
          });

          await bot.sendMessage(chatId, "🎯 **Select a Category:**", {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          });
        }
        return res.status(200).send('OK');
      }

      // /all or Show All Links Button
      if (userText === '/all' || userText === '🔗 Show All Links') {
        const sitesRef = ref(db, 'websites');
        const snapshot = await get(sitesRef);

        if (!snapshot.exists()) {
          await bot.sendMessage(chatId, "⚠️ Database me koi links nahi hain.");
        } else {
          let text = "🌐 **All Streaming & Download Links:**\n\n";
          snapshot.forEach(childSnap => {
            const site = childSnap.val();
            text += `🔹 **[${site.name}](${site.url})** (${site.category})\n`;
          });

          await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
        }
        return res.status(200).send('OK');
      }

      return res.status(200).send('OK');
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send('Internal Server Error');
  }
};
