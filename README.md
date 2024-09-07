# FiveM Server Status Bot (Discord)
A simple FiveM Server Status Bot (Discord) written in NodeJS that will show how much players are ingame.
\
The bot is updating its presence status with players count and registering one local slash command /status, which displays the server status, server players count and players names with pagination buttons (Previous and Next) if the embed message is more than maximum allowed length.

## Requirements:
- NodeJS >= 16.9.0 - https://nodejs.org/en/
- NPM >= 7.20.0 - https://www.npmjs.com/
- Bot from Discord Developer Portal - https://discord.com/developers/

## Setup:
- Copy the files into some folder and type `npm install`
- Generate your Discord Bot and invite it to your server.
- Open index.js and edit:
```bash
SERVER_URL = 127.0.0.1:3000/players.json - Type the ip address of your server & port or domain & port and keep /players.json at the end!

GUILD_ID = 'Guild-ID' - Copy and paste your discord server ID (Guild ID)

FETCH_MAX_RETRIES = '3' - Maximum number of fetch retries

FETCH_RETRY_DELAY = '5000' - Delay between fetch retries in milliseconds (5 seconds)

STATUS_UPDATE_INTERVAL = 30000 - Per how much seconds to update, 30000 - 30 seconds, 60000 - 60 seconds and so on...

TOKEN = 'Your Bot Token' - Copy and paste your bot token from discord developer portal.
```
## Useful Links:
- https://discord.com/developers/docs/intro
- https://nodejs.org/en/
- https://npmjs.com/
- https://discordjs.guide/

## License:
Licensed under the [MIT License](LICENSE).
