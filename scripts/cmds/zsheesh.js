module.exports = {
  config: {
    name: "sheesh",
    version: "1.0",
    author: "XyryllPanget",
    countDown: 5,
    role: 0,
    shortDescription: "auto reply 😎",
    longDescription: "auto reply 😎",
    category: "reply",
  },
  onStart: async function () {},
  onChat: async function ({ event, message, getLang, api }) {
    const sheeshRegex = /^(shesh|sheesh|sheeesh|sheeeesh|sheeeeesh|sheeeeeesh|sheeeeeeesh)$/i;
    if (event.body && sheeshRegex.test(event.body)) {
      await api.sendMessage("😎", event.threadID, event.messageID);
    }
  },
};
