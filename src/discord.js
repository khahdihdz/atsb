import {Client,GatewayIntentBits,Events,REST,Routes,SlashCommandBuilder,MessageFlags} from "discord.js";
import {config,normalizeLanguage,splitText} from "./config.js";
import {translateMessage} from "./translator.js";
const channelSettings=new Map();
const commands=[
  new SlashCommandBuilder().setName("translate").setDescription("Translate a message")
    .addStringOption(o=>o.setName("text").setDescription("Text to translate").setRequired(true))
    .addStringOption(o=>o.setName("language").setDescription("Target language code").setRequired(false)),
  new SlashCommandBuilder().setName("setlang").setDescription("Set this channel target language")
    .addStringOption(o=>o.setName("language").setDescription("Language code such as vi, en, ja").setRequired(true)),
  new SlashCommandBuilder().setName("auto").setDescription("Toggle automatic translation")
    .addBooleanOption(o=>o.setName("enabled").setDescription("Enable automatic translation").setRequired(true)),
  new SlashCommandBuilder().setName("privacy").setDescription("Show privacy information"),
  new SlashCommandBuilder().setName("translator-help").setDescription("Show bot commands")
].map(c=>c.toJSON());
function settingsFor(id){return channelSettings.get(id)||{language:config.defaultLanguage,enabled:true};}
async function sendReply(message,text){
  for(const chunk of splitText("🌐 "+text,1900)) await message.reply({content:chunk,allowedMentions:{repliedUser:false}});
}
export async function startDiscord(state) {
  const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
  client.once(Events.ClientReady,async ready=>{
    state.discord="online"; console.log("Discord bot connected as "+ready.user.username);
    try {
      const rest=new REST({version:"10"}).setToken(config.discordToken);
      await rest.put(Routes.applicationCommands(config.discordClientId),{body:commands});
      console.log("Discord slash commands registered.");
    } catch { console.warn("Slash command registration failed; check application permissions."); }
  });
  client.on(Events.InteractionCreate,async interaction=>{
    if(!interaction.isChatInputCommand()) return;
    try {
      if(interaction.commandName==="privacy") {
        await interaction.reply({content:"Bot không lưu nội dung tin nhắn hoặc lịch sử dịch. Nội dung được gửi tới nhà cung cấp AI để xử lý; xem /privacy trên website.",flags:MessageFlags.Ephemeral}); return;
      }
      if(interaction.commandName==="translator-help") {
        await interaction.reply({content:"Lệnh: /translate, /setlang, /auto, /privacy. Dùng mã ngôn ngữ như vi, en, ja.",flags:MessageFlags.Ephemeral}); return;
      }
      if(interaction.commandName==="setlang") {
        const language=normalizeLanguage(interaction.options.getString("language"));
        if(!language) {await interaction.reply({content:"Mã ngôn ngữ không hợp lệ.",flags:MessageFlags.Ephemeral});return;}
        const current=settingsFor(interaction.channelId);
        channelSettings.set(interaction.channelId,{...current,language});
        await interaction.reply({content:"Ngôn ngữ đích: "+language+". Thiết lập chỉ nằm trong RAM và mất khi bot restart.",flags:MessageFlags.Ephemeral});return;
      }
      if(interaction.commandName==="auto") {
        const enabled=interaction.options.getBoolean("enabled"); const current=settingsFor(interaction.channelId);
        channelSettings.set(interaction.channelId,{...current,enabled});
        await interaction.reply({content:"Tự động dịch đã "+(enabled?"bật":"tắt")+". Thiết lập chỉ nằm trong RAM.",flags:MessageFlags.Ephemeral});return;
      }
      if(interaction.commandName==="translate") {
        await interaction.deferReply();
        const text=interaction.options.getString("text",true);
        const language=normalizeLanguage(interaction.options.getString("language"))||settingsFor(interaction.channelId).language;
        const result=await translateMessage(text,language,interaction.user.id);
        if(result.status==="translated") await interaction.editReply(splitText("🌐 "+result.text,1900).join("\n"));
        else await interaction.editReply(result.status==="same_language"?"Nội dung đã ở ngôn ngữ đích.":"Không thể dịch nội dung này; kiểm tra độ dài hoặc quota API.");
      }
    } catch {
      if(interaction.deferred||interaction.replied) await interaction.editReply("Dịch thuật tạm thời không khả dụng. Vui lòng thử lại.");
      else await interaction.reply({content:"Không thể xử lý yêu cầu lúc này.",flags:MessageFlags.Ephemeral});
    }
  });
  client.on(Events.MessageCreate,async message=>{
    if(message.author.bot||message.webhookId||!message.guild) return;
    const content=message.content?.trim();
    if(!content||content.startsWith("!")) return;
    const settings=settingsFor(message.channelId); if(!settings.enabled) return;
    try {
      const result=await translateMessage(content,settings.language,message.author.id);
      if(result.status==="translated") await sendReply(message,result.text);
    } catch { console.warn("Discord translation failed; message content was not logged."); }
  });
  client.on(Events.Error,()=>console.error("Discord gateway error."));
  await client.login(config.discordToken); state.discord="connecting"; return client;
}
