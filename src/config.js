const number = (value, fallback) => { const parsed=Number(value); return Number.isFinite(parsed)&&parsed>0?parsed:fallback; };
export const config = {
  port:number(process.env.PORT,3000), defaultLanguage:process.env.DEFAULT_LANGUAGE||"vi",
  geminiApiKey:process.env.GEMINI_API_KEY||"", geminiModel:process.env.GEMINI_MODEL||"gemini-3.8-flash",
  groqApiKey:process.env.GROQ_API_KEY||"", groqModel:process.env.GROQ_MODEL||"openai/gpt-oss-20b",
  discordToken:process.env.DISCORD_TOKEN||"", discordClientId:process.env.DISCORD_CLIENT_ID||"",
  telegramToken:process.env.TELEGRAM_BOT_TOKEN||"", maxMessageLength:number(process.env.MAX_MESSAGE_LENGTH,4000),
  requestTimeoutMs:number(process.env.REQUEST_TIMEOUT_MS,18000), userCooldownMs:number(process.env.USER_COOLDOWN_MS,2500)
};
export function validateConfig() {
  if (!config.geminiApiKey&&!config.groqApiKey) console.warn("No AI provider key configured.");
  if (!config.discordToken&&!config.telegramToken) console.warn("No bot token configured.");
}
export function normalizeLanguage(value) {
  const language=String(value||"").trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(language)?language:null;
}
export function splitText(text,maxLength) {
  const chunks=[]; let rest=String(text||"");
  while(rest.length>maxLength) {
    let cut=rest.lastIndexOf("\n",maxLength);
    if(cut<Math.floor(maxLength*0.5)) cut=rest.lastIndexOf(" ",maxLength);
    if(cut<Math.floor(maxLength*0.5)) cut=maxLength;
    chunks.push(rest.slice(0,cut)); rest=rest.slice(cut).trimStart();
  }
  if(rest) chunks.push(rest);
  return chunks;
}
