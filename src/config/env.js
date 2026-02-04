import dotenv from "dotenv";

dotenv.config();

// 환경변수 확인
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error("❌ .env 파일에 DISCORD_TOKEN과 CLIENT_ID가 필요해요!");
  process.exit(1);
}

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
  },
};
