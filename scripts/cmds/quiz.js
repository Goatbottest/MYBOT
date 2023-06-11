const axios = require("axios");
const { getStreamFromURL } = global.utils;
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();


async function getSenderName(senderID) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("database/data/data.sqlite");

    db.get(`SELECT name FROM users WHERE userID = ?`, senderID, (err, row) => {
      db.close();

      if (err) {
        console.error(`Error getting sender name for userID: ${senderID}`, err);
        reject(err);
      } else {
        const senderName = row ? row.name : "Unknown User";
        resolve(senderName);
      }
    });
  });
}

module.exports = {
  config: {
    name: "quiz",
    version: "1.0",
    author: "JV Barcenas",
    countDown: 18,
    role: 0,
    shortDescription: {
      vi: "trò chơi câu hỏi",
      en: "quiz game"
    },
    longDescription: {
      vi: "chơi trò chơi câu hỏi",
      en: "play quiz game"
    },
    category: "game",
    guide: {
      en: "{pn} <topic>"
    },
    envConfig: {
      reward: 1000
    }
  },

  langs: {
    vi: {
      reply: "Hãy reply tin nhắn này với câu trả lời",
      correct: "🎉 Chúc mừng bạn đã trả lời đúng và nhận được %1$",
      wrong: "⚠️ Bạn đã trả lời sai",
      invalidTopic: "Chủ đề câu hỏi không hợp lệ.",
      notPlayer: "Bạn không phải là người chơi.",
      timeout: "Oops timeout!!",
      guide: "{pn} <topic>"
    },
    en: {
      reply: "Please reply this message with the answer",
      flag: "Please reply this message with the answer (word/s)\n-⌛15s",
      correct: "🎉 Congratulations you have answered correctly and received %1$",
      wrong: "⚠️ You have answered incorrectly",
      invalidTopic: "Invalid quiz topic.",
      notPlayer: "You are not a player.",
      timeout: "Oops timeout!!",
      guide: "{pn} <topic>",
      top: "- ͙۪۪̥˚┊❛ SHOW TOP: {pn} top  - ͙۪۪̥˚┊❛ ,"
    }
  },

  onStart: async function ({ message, event, commandName, getLang, args }) {
    const topic = args[0]; // Assumes the topic is passed as the first argument
  
    if (!topic) {
      const availableTopics = getAvailableTopics();
      const tutorialMessage = `Here are some available topics:\n\n${availableTopics}\n\n- ͙۪۪̥˚┊❛ TUTORIAL: ${getLang("guide")} - ͙۪۪̥˚┊❛ \n\n${getLang("top")}`;
      return message.reply(tutorialMessage);
    }
  
    if (topic === "top") {
      const topPlayers = getTopPlayers(10); // Get top 10 players
      const topPlayersMessage = formatTopPlayersMessage(topPlayers, getLang);
      return message.reply(topPlayersMessage);
    }
  
    let quizData;
    let prompt;
    if (topic === "flag") {
      prompt = getLang("flag"); // Prompt for the correct words
    } else {
      prompt = `${getLang("reply")} (letters)\n-⌛15s`; // Prompt for letters
    }
  
    if (topic === "physics") {
      quizData = require(path.join(__dirname, "quiz/physics/physics.json"));
    } else if (topic === "geography") {
      quizData = require(path.join(__dirname, "quiz/geography/geography.json"));
    } else if (topic === "chemistry") {
      quizData = require(path.join(__dirname, "quiz/chemistry/chemistry.json"));
    } else if (topic === "history") {
      quizData = require(path.join(__dirname, "quiz/history/history.json"));
    } else if (topic === "math") {
      quizData = require(path.join(__dirname, "quiz/math/math.json"));
    } else if (topic === "astronomy") {
      quizData = require(path.join(__dirname, "quiz/astronomy/astronomy.json"));
    } else if (topic === "exobiology") {
      quizData = require(path.join(__dirname, "quiz/exobiology/exobiology.json"));
    } else if (topic === "zoology") {
      quizData = require(path.join(__dirname, "quiz/zoology/zoology.json"));
    } else if (topic === "biology") {
      quizData = require(path.join(__dirname, "quiz/biology/biology.json"));
    } else if (topic === "flag") {
      quizData = require(path.join(__dirname, "quiz/flag/flag.json"));
    } else {
      // Handle invalid topic
      return message.reply(getLang("invalidTopic"));
    }
  
    const question = getRandomQuestion(quizData);
    const { question: questionText } = question;
  
    const replyMessage = `${prompt}\n\n${questionText}`;
  
    message.reply({
      body: replyMessage
    }, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName,
        messageID: info.messageID,
        author: event.senderID,
        question,
        playerData: {}
      });

      // Set a timeout of 20 seconds
      setTimeout(() => {
        const replyData = global.GoatBot.onReply.get(info.messageID);
        if (replyData) {
          const { messageID, question } = replyData;
          global.GoatBot.onReply.delete(messageID);
          message.unsend(messageID);
        }
      }, 15000); // 20 seconds in milliseconds
    });
  },


  onReply: async ({ message, Reply, event, getLang, usersData, envCommands, commandName }) => {
    const { author, question, messageID, playerData } = Reply;
    if (event.senderID != author)
      return message.reply(getLang("notPlayer"));
  
    const userAnswer = formatText(event.body);
    const correctAnswer = formatText(question.answer); // Normalize the correct answer
  
    if (userAnswer === correctAnswer) { // Compare the normalized answers
      global.GoatBot.onReply.delete(messageID);
  
      // Add money to the bank.json file
      const bankData = JSON.parse(fs.readFileSync("bank.json"));
      const userId = event.senderID.toString();
      if (!bankData[userId]) {
        bankData[userId] = {
          bank: 0,
          lastInterestClaimed: Date.now()
        };
      }
      bankData[userId].bank += envCommands[commandName].reward;
      fs.writeFileSync("bank.json", JSON.stringify(bankData));
  
      message.reply(getLang("correct", envCommands[commandName].reward));
  
      // Store user data with name
      const quiztopPath = path.join(__dirname, "quiztop.json");
      let quiztopData = [];
      try {
        quiztopData = JSON.parse(fs.readFileSync(quiztopPath));
      } catch (error) {
        console.error("Error reading quiztop.json:", error);
      }
  
      const senderName = await getSenderName(event.senderID); // Retrieve sender's name from SQLite database
      const playerIndex = quiztopData.findIndex(player => player.uid === event.senderID);
      if (playerIndex !== -1) {
        quiztopData[playerIndex].name = senderName; // Replace user ID with name in quiztop.json
        quiztopData[playerIndex].correct++;
      } else {
        quiztopData.push({ uid: event.senderID, name: senderName, correct: 1 });
      }
      fs.writeFileSync(quiztopPath, JSON.stringify(quiztopData));
    } else {
      message.reply(getLang("wrong"));
      if (!playerData[event.senderID]) {
        playerData[event.senderID] = { wrong: 0 };
      }
      playerData[event.senderID].wrong++;
    }
  
    message.unsend(event.messageReply.messageID);
  }
};

function getRandomQuestion(quizData) {
  const { questions } = quizData;
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

function formatText(text) {
  return text.normalize("NFD").toUpperCase();
}

function getAvailableTopics() {
  const quizPath = path.join(__dirname, "quiz");
  const topics = fs.readdirSync(quizPath);
  return topics.map(topic => topic.replace(".json", "")).join("\n");
}

function getTopPlayers(count) {
  const quiztopPath = path.join(__dirname, "quiztop.json");
  const quiztopData = JSON.parse(fs.readFileSync(quiztopPath));
  const sortedData = quiztopData.sort((a, b) => b.correct - a.correct);
  return sortedData.slice(0, count);
}

function formatTopPlayersMessage(players, getLang) {
  let message = "🏆 Quiz Top Players 🏆\n\n";
  players.forEach((player, index) => {
    const { name, correct } = player;
    message += `${index + 1}. ${name} - ${correct}\n`;
  });
  return message;
}