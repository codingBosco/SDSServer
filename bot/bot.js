const TelegramBot = require("node-telegram-bot-api");

const token = "YOUR_BOT_TOKEN";
const bot = new TelegramBot(token, { polling: true });

const WEB_APP_URL = "https://tuo-dominio-o-ngrok/webapp"; // Cambia con l'URL della tua mini app

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Clicca per aprire la mini app:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Apri Mini App",
            web_app: { url: WEB_APP_URL },
          },
        ],
      ],
    },
  });
});
