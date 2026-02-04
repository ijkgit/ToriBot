import { Client, GatewayIntentBits, REST, Routes, Events } from "discord.js";
import { config } from "./src/config/env.js";
import { commands } from "./src/config/commands.js";
import { registerCommandHandlers } from "./src/handlers/commands.js";
import { state, stopCurrentProcesses } from "./src/services/player.js";
import { logger } from "./src/utils/logger.js";

// Discord 클라이언트 생성
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// 슬래시 커맨드 등록
const rest = new REST({ version: "10" }).setToken(config.discord.token);

await rest.put(Routes.applicationCommands(config.discord.clientId), {
  body: commands,
});

logger.success("커맨드", "슬래시 커맨드 등록 완료!");

// 커맨드 핸들러 등록
registerCommandHandlers(client);

// 프로세스 종료 핸들러
process.on("SIGINT", () => {
  logger.warn("시스템", "봇 종료 중...");
  stopCurrentProcesses();
  if (state.currentConnection) {
    state.currentConnection.destroy();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.warn("시스템", "봇 종료 중...");
  stopCurrentProcesses();
  if (state.currentConnection) {
    state.currentConnection.destroy();
  }
  process.exit(0);
});

// 봇 준비 완료
client.once(Events.ClientReady, () => {
  logger.success("봇", `토리봇 로그인 완료! (${client.user.tag})`);
});

// 로그인
client.login(config.discord.token);
