import {Telegraf} from "telegraf";
import {config,normalizeLanguage,splitText} from "./config.js";
import {translateMessage} from "./translator.js";
const chatSettings=new Map();
function settingsFor(id){return chatSettings.get(String(id))||{language:config.defaultLanguage,enabled:true};}
async function sendTranslation(ctx,text){
  for(const chunk of splitText("🌐 "+text,4000)) await ctx.reply(chunk,{reply_to_message_id:ctx.message?.message_id,allow_sending_without_reply:true});
}
export async function startTelegram(state) {
  const bot=new Telegraf(config.telegramToken);
  bot.catch(()=>console.warn("Telegram update failed. Message content was not logged."));
  bot.start(ctx=>ctx.reply("Xin chào! Tôi là ATSB AI Translator. Dùng /setlang vi hoặc /setlang en để chọn ngôn ngữ đích. Dùng /auto on|off để bật/tắt dịch tự động."));
  bot.help(ctx=>ctx.reply("Lệnh: /translate <nội dung> [mã_ngôn_ngữ], /setlang <mã>, /auto on|off, /privacy, /status."));
  bot.command("privacy",ctx=>ctx.reply("Bot không lưu nội dung tin nhắn hoặc lịch sử dịch. Nội dung được gửi tới nhà cung cấp AI để xử lý; đọc chính sách bảo mật trên website."));
  bot.command("status",ctx=>ctx.reply("ATSB AI Translator đang hoạt động. Nội dung tin nhắn không được lưu vào hệ thống bot."));
  bot.command("setlang",ctx=>{
    const language=normalizeLanguage(ctx.message.text.split(/\s+/)[1]);
    if(!language) return ctx.reply("Cú pháp: /setlang vi (hoặc en, ja, ko...).");
    const current=settingsFor(ctx.chat.id); chatSettings.set(String(ctx.chat.id),{...current,language});
    return ctx.reply("Ngôn ngữ đích: "+language+". Thiết lập chỉ nằm trong RAM và mất khi restart.");
  });
  bot.command("auto",ctx=>{
    const value=ctx.message.text.split(/\s+/)[1]?.toLowerCase();
    if(!["on","off"].includes(value)) return ctx.reply("Cú pháp: /auto on hoặc /auto off");
    const current=settingsFor(ctx.chat.id); chatSettings.set(String(ctx.chat.id),{...current,enabled:value==="on"});
    return ctx.reply("Tự động dịch đã "+(value==="on"?"bật":"tắt")+". Thiết lập chỉ nằm trong RAM.");
  });
  bot.command("translate",async ctx=>{
    const parts=ctx.message.text.split(/\s+/);
    const maybeLanguage=parts.length>2?normalizeLanguage(parts[parts.length-1]):null;
    const target=maybeLanguage||settingsFor(ctx.chat.id).language;
    const text=parts.slice(1,maybeLanguage?-1:undefined).join(" ").trim();
    if(!text) return ctx.reply("Cú pháp: /translate Hello world en");
    try {
      const result=await translateMessage(text,target,String(ctx.from.id));
      if(result.status==="translated") await ctx.reply("🌐 "+result.text);
      else await ctx.reply(result.status==="same_language"?"Nội dung đã ở ngôn ngữ đích.":"Không thể dịch nội dung này.");
    } catch { await ctx.reply("Dịch thuật tạm thời không khả dụng. Vui lòng thử lại."); }
  });
  bot.on(["text","photo","video","document"],async ctx=>{
    const message=ctx.message; const text=message.text||message.caption||"";
    if(!text.trim()||text.startsWith("/")) return;
    const settings=settingsFor(ctx.chat.id); if(!settings.enabled) return;
    try {
      const result=await translateMessage(text,settings.language,String(ctx.from?.id||ctx.chat.id));
      if(result.status==="translated") await sendTranslation(ctx,result.text);
    } catch { console.warn("Telegram translation failed; message content was not logged."); }
  });
  await bot.launch({dropPendingUpdates:true}); state.telegram="online";
  console.log("Telegram bot polling started."); return bot;
}
