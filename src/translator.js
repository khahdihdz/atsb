import { config } from "./config.js";
import { translateWithProviders } from "./providers.js";
const recentRequests=new Map();
function allowed(userId) {
  const now=Date.now(); const previous=recentRequests.get(userId)||0;
  if(now-previous<config.userCooldownMs) return false;
  recentRequests.set(userId,now);
  if(recentRequests.size>5000) for(const [key,time] of recentRequests) if(now-time>config.userCooldownMs*4) recentRequests.delete(key);
  return true;
}
export async function translateMessage(text,targetLanguage,userId) {
  const input=String(text||"").trim();
  if(!input) return {status:"empty"};
  if(input.length>config.maxMessageLength) return {status:"too_long"};
  if(!allowed(String(userId||"unknown"))) return {status:"cooldown"};
  const result=await translateWithProviders(input,targetLanguage||config.defaultLanguage);
  if(result.text.trim()==="__SAME_LANGUAGE__") return {status:"same_language"};
  return {status:"translated",text:result.text,provider:result.provider};
}
