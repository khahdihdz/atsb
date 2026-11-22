const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_CLIENT_ID;
if (!token || !appId) throw new Error("Set DISCORD_TOKEN and DISCORD_CLIENT_ID.");
const commands = [
  {
    name: "translate", description: "Translate text to a language",
    type: 1,
    options: [
      { name: "text", description: "Text to translate", type: 3, required: true },
      { name: "language", description: "Target language code (vi, en, ja...)", type: 3, required: false }
    ]
  },
  { name: "translate-message", type: 3 }
];
const response = await fetch("https://discord.com/api/v10/applications/" + appId + "/commands", {
  method: "PUT", headers: { authorization: "Bot " + token, "content-type": "application/json" },
  body: JSON.stringify(commands)
});
if (!response.ok) throw new Error("Discord command registration failed: HTTP " + response.status);
console.log("Registered /translate and Translate message context command.");
