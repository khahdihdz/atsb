import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { config, validateConfig } from "./src/config.js";
import { startDiscord } from "./src/discord.js";
import { startTelegram } from "./src/telegram.js";

const root=fileURLToPath(new URL(".",import.meta.url));
const publicDir=resolve(root,"public");
const startedAt=Date.now();
const state={discord:"disabled",telegram:"disabled"};
validateConfig();
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".png":"image/png"};

const server=createServer(async(req,res)=>{
  const url=new URL(req.url||"/","http://localhost");
  if(url.pathname==="/health"||url.pathname==="/api/status"){
    res.writeHead(200,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
    res.end(JSON.stringify({status:"online",service:"ATSB AI Translator",uptimeSeconds:Math.floor((Date.now()-startedAt)/1000),platforms:state,providers:{gemini:Boolean(config.geminiApiKey),groq:Boolean(config.groqApiKey)},privacy:"message-content-not-persisted"}));
    return;
  }
  const pathname=url.pathname==="/"?"/index.html":url.pathname;
  const filePath=resolve(publicDir,"."+pathname);
  if(!filePath.startsWith(publicDir+sep)){res.writeHead(403);res.end("Forbidden");return;}
  try{
    const data=await readFile(filePath);
    res.writeHead(200,{"content-type":mime[extname(filePath)]||"application/octet-stream","cache-control":"public, max-age=300"});
    res.end(data);
  }catch{res.writeHead(404);res.end("Not Found");}
});
server.listen(config.port,"0.0.0.0",()=>console.log("ATSB web service listening on port "+config.port));

async function boot(){
  if(config.discordToken&&config.discordClientId){
    try{await startDiscord(state);}catch{state.discord="error";console.error("Discord startup failed; check token, intents and application ID.");}
  }else console.log("Discord disabled: configure DISCORD_TOKEN and DISCORD_CLIENT_ID.");
  if(config.telegramToken){
    try{await startTelegram(state);}catch{state.telegram="error";console.error("Telegram startup failed; check TELEGRAM_BOT_TOKEN.");}
  }else console.log("Telegram disabled: configure TELEGRAM_BOT_TOKEN.");
}
boot().catch(()=>console.error("Service startup failed. Message content was not logged."));
function shutdown(signal){
  console.log("Received "+signal+"; shutting down.");
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on("SIGTERM",()=>shutdown("SIGTERM"));
process.on("SIGINT",()=>shutdown("SIGINT"));
