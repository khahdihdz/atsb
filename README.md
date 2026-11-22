# ATSB — AI Translator Bot

Bot dịch tự động đa nền tảng cho **Discord** và **Telegram**, dùng chung translation engine.

## Tính năng
- Tự nhận diện ngôn ngữ nguồn và dịch sang ngôn ngữ đích.
- Dịch tự động trong Discord channel và Telegram group/private chat.
- Lệnh dịch thủ công, đặt ngôn ngữ, bật/tắt tự động.
- Gemini API chính; Groq dự phòng.
- Không database, không lưu lịch sử, không ghi nội dung tin nhắn/prompt/response vào log.
- Landing page, health endpoint, chính sách bảo mật và điều khoản.
- GitHub Actions kiểm tra cú pháp, unit test và tùy chọn kích hoạt Render deploy hook.

## Kiến trúc
Node.js 22+ chạy một tiến trình lâu dài: Discord Gateway + Telegram long polling + HTTP health/landing server. Hai nền tảng dùng chung src/translator.js và src/providers.js.

## Cấu hình
Sao chép .env.example thành .env khi chạy local, hoặc nhập biến trong Render.

| Biến | Mô tả |
|---|---|
| DISCORD_TOKEN | Token bot Discord |
| DISCORD_CLIENT_ID | Application ID |
| TELEGRAM_BOT_TOKEN | Token từ BotFather |
| GEMINI_API_KEY | Gemini API key |
| GROQ_API_KEY | Groq API key dự phòng |
| DEFAULT_LANGUAGE | Mặc định vi |
| GEMINI_MODEL | Mặc định gemini-3.8-flash |
| GROQ_MODEL | Mặc định openai/gpt-oss-20b |

Tạo API key tại Google AI Studio và Groq Console. Quota, model và điều kiện miễn phí có thể thay đổi; hãy kiểm tra điều khoản nhà cung cấp trước khi sử dụng.

## Thiết lập Discord
1. Tạo application và bot tại Discord Developer Portal.
2. Bật **Message Content Intent** trong Bot settings.
3. Cấp quyền View Channels, Send Messages, Read Message History và Use Application Commands.
4. Mời bot bằng OAuth2 URL Generator với scopes bot và applications.commands.
5. Đặt DISCORD_TOKEN và DISCORD_CLIENT_ID.

Lệnh: /translate, /setlang, /auto, /privacy, /translator-help.

## Thiết lập Telegram
1. Tạo bot bằng @BotFather và lấy token.
2. Đặt TELEGRAM_BOT_TOKEN.
3. Trong group, tắt Privacy Mode bằng BotFather nếu muốn bot nhận mọi tin nhắn văn bản. Chỉ cấp quyền cần thiết.

Lệnh: /translate, /setlang, /auto, /privacy, /status, /help.

## Chạy local
~~~bash
npm install
cp .env.example .env
npm run check
npm test
npm start
~~~

Trang web: http://localhost:3000 · Health: /health.

## Deploy Render
1. Tạo Web Service từ repo khahdihdz/atsb.
2. Chọn Node runtime; Render có thể đọc render.yaml.
3. Nhập secret trong Environment.
4. Deploy và kiểm tra /health.

Gói Render Free có thể sleep khi không có HTTP request, không phù hợp cam kết bot 24/7. Muốn bot luôn kết nối Gateway/long polling, dùng instance luôn hoạt động hoặc VPS. Không dùng ping giả để né giới hạn gói miễn phí.

Để GitHub Actions kích hoạt deploy, thêm secret RENDER_DEPLOY_HOOK lấy từ Render. Không có secret thì workflow chỉ chạy CI.

## Quyền riêng tư và giới hạn
ATSB không ghi nội dung hội thoại vào log và không lưu tin nhắn/bản dịch trong database, file hoặc cache bền vững. Thiết lập channel/group chỉ tồn tại trong RAM và mất khi tiến trình restart.

**Quan trọng:** Tin nhắn được gửi đến Gemini/Groq để xử lý. Chính sách nhà cung cấp có thể cho phép lưu giữ hoặc sử dụng dữ liệu tùy gói và cài đặt. ATSB không thể kiểm soát việc xử lý sau khi dữ liệu rời máy chủ. Không gửi thông tin nhạy cảm.

## Kiểm thử
~~~bash
npm run check
npm test
~~~

Repository: https://github.com/khahdihdz/atsb
