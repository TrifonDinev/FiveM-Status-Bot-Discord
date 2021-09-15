const Discord = require("discord.js");
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const axios = require("axios").default;

const players = async (type) => {
  try {
    return axios({
      url: `http://127.0.0.1/domain.com:port/${type}.json`, // Address of the server & port!
      method: "get",
      timeout: 10000,
      responseType: "json"
    })
  } catch {
    console.log("No connection to server!")
  }
}

const presence = async () => {
  let res = await players("players");
  client.user.setPresence({
    activities:
    [{
      name: `${res.data.length} players ingame `,
      type: "WATCHING"
    }],
    status:"dnd" // Do not disturb status
  })
}

client.on("ready", async () => {
  console.log(`${client.user.tag} Successfully launched.`)
  await presence();
  setInterval(async () => {
    await presence();
  }, 30000) // 30000ms = 30 seconds update / 60000ms = 60 seconds (1 min) update...
})

// Lets Login
client.login("TOKEN");
