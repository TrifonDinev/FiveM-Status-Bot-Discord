const Discord = require("discord.js");
const { Client, GatewayIntentBits, ActivityType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const axios = require("axios").default;

// Create a new Discord client instance with the required intents
const client = new Discord.Client({ intents: [ GatewayIntentBits.Guilds ] });
const statusCommand = [{ name: 'status', description: 'Display the status of the FiveM server + players list' }];

// Constants for the needed things (SERVER_URL, GUILD_ID, FETCH_MAX_RETRIES, FETCH_RETRY_DELAY, STATUS_UPDATE_INTERVAL, TOKEN)
const SERVER_URL = 'http://127.0.0.1:3000/players.json'; // Ip address of your server & port or domain & port and keep /players.json at the end!
const GUILD_ID = 'Guild-ID'; // Replace with your server's guild ID
const FETCH_MAX_RETRIES = 3; // Maximum number of fetch retries
const FETCH_RETRY_DELAY = 5000; // Delay between fetch retries in milliseconds (5 seconds)
const STATUS_UPDATE_INTERVAL = 60000; // 30000 - 30 seconds, 60000 - 60 seconds and so on...
const TOKEN = 'Your Bot Token';

// Global variables to cache player data and track server status
// We will want to cache the data for status command, so it is not requested directly every time when users are using the command.
let cachedPlayerData = [];
let isServerOnline = false;

// Function to fetch player data from the server with retries
const fetchPlayers = async () => {
  for (let attempt = 1; attempt <= FETCH_MAX_RETRIES; attempt++) {
    try {
      // Make a GET request to the SERVER_URL
      const response = await axios.get(SERVER_URL, {
        timeout: 10000, // 10 seconds timeout
        responseType: "json"
      });

      // Check if response data is a valid array and filter for valid player names
      if (Array.isArray(response.data)) {
        isServerOnline = true; // Mark server as online when data is fetched successfully
        return response.data.filter(player => player.name?.trim()); // Return players with non-empty names
      } else {
        throw new Error("Response data is not a valid array");
      }
    } catch (error) {
      isServerOnline = false; // Mark server as offline on error
      console.error(`Failed to connect to server: ${error.message}. Starting retry attempt ${attempt}...`);

      if (attempt < FETCH_MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, FETCH_RETRY_DELAY)); // Wait for the delay before retrying
      } else {
        console.error("All retry attempts failed. Returning empty array.");
      }
    }
  }
  return []; // Return empty array if all retries fail
};

// Function to update the bot's presence
const updatePresence = async () => {
  try {
    const playerData = await fetchPlayers(); // Fetch players from the server
    cachedPlayerData = playerData; // Update cached player data

    const playerCount = playerData.length; // Get current player count

    await client.user.setPresence({
      activities: [{ name: `${playerCount} players ingame`, type: ActivityType.Watching }],
      status: 'dnd', // Do Not Disturb status
    });
  } catch (error) {
    console.error("Error updating presence:", error); // Log the error
  }
};

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'status') return;

  let page = 0; // Start at page 0

  const createEmbed = (serverStatus, playerNames) => {
    return new EmbedBuilder()
    .setColor(serverStatus === "Online" ? '#00FF00' : '#FF0000')
    .setTitle('Server Status')
    .addFields(
      { name: 'Status', value: serverStatus, inline: true },
      { name: 'Player Count', value: `${cachedPlayerData.length}`, inline: true },
      { name: 'Players', value: playerNames, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'FiveM Status Bot Discord', iconURL: client.user.avatarURL() });
  };

  const createButtons = (currentPage, totalPages) => {
    return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
      new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1)
    );
  };

  const replyStatus = async () => {
    try {
      const playerCount = isServerOnline ? cachedPlayerData.length : 0;
      const serverStatus = isServerOnline ? "Online" : "Offline";

      const staticText = `Server Status\nStatus: ${serverStatus}\nPlayer Count: ${playerCount}\nPlayers: `;
      // Please, keep the MAX_EMBED_LENGTH to 1500 due to Discord embed message limits!
      const MAX_EMBED_LENGTH = 1500;
      const ITEMS_PER_PAGE = Math.floor((MAX_EMBED_LENGTH - staticText.length) / 20);
      let totalPages = Math.ceil(playerCount / ITEMS_PER_PAGE);

      // Ensure valid page
      if (page >= totalPages) {
        page = totalPages > 0 ? totalPages - 1 : 0;
      }

      const playersOnPage = cachedPlayerData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
      const playerNames = playersOnPage.length
      ? playersOnPage.map(player => player.name.length > 20 ? `${player.name.slice(0, 20)}...` : player.name).join(', ')
      : 'No players currently online.';

      const fullMessage = staticText + playerNames;

      if (fullMessage.length > MAX_EMBED_LENGTH) {
        logError(`Embed length exceeded: ${fullMessage.length} characters, limit is set to ${MAX_EMBED_LENGTH}.`);
        return { embed: createEmbed(serverStatus, 'Error: Content too large to display. Administrator should see and correct this.'), buttons: null };
      }

      const embed = createEmbed(serverStatus, playerNames);
      const buttons = totalPages > 1 ? createButtons(page, totalPages) : null;

      return { embed, buttons };
    } catch (error) {
      console.error('Error in replyStatus:', error);
      return {
        embed: createEmbed("Error", "An error occurred while fetching server status."),
        buttons: null
      };
    }
  };

  try {
    const { embed, buttons } = await replyStatus();
    const replyOptions = { embeds: [embed], ephemeral: true };
    if (buttons) {
      replyOptions.components = [buttons];
    }

    const message = await interaction.reply(replyOptions);

    const filter = i => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      try {
        if (i.customId === 'next') page++;
        else if (i.customId === 'prev') page--;

        const { embed: updatedEmbed, buttons: updatedButtons } = await replyStatus();
        await i.update({ embeds: [updatedEmbed], components: updatedButtons ? [updatedButtons] : [] });
      } catch (error) {
        console.error('Error in collector collect event:', error);
      }
    });

    collector.on('end', async () => {
      try {
        const { buttons: finalButtons } = await replyStatus();
        if (finalButtons) {
          finalButtons.components.forEach(button => button.setDisabled(true));
          await interaction.editReply({ components: [finalButtons] });
        }
      } catch (error) {
        console.error('Error in collector end event:', error);
      }
    });
  } catch (error) {
    console.error('Error in interaction reply:', error);
  }
});


// Function to register the local slash status command
const registerStatusCommand = async () => {
  const guild = client.guilds.cache.get(GUILD_ID);

  try {
    await guild.commands.set(statusCommand);
    console.log("Status command is successfully registered!");
  } catch (error) {
    console.error('Failed to register status command:', error);
  }
};

// Event listener for when the bot is ready
client.on("ready", async () => {
  console.log(`${client.user.tag} successfully launched.`); // Log successful launch
  await updatePresence(); // Update presence on launch
  await registerStatusCommand(); // Register the status command
  setInterval(updatePresence, STATUS_UPDATE_INTERVAL); // Set interval to update presence every 30 seconds
});

// Let's login
client.login(TOKEN);
