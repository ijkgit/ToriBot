import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
} from "discord.js";

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import { google } from "googleapis";
import { spawn } from "child_process";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// 환경변수 확인
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error("❌ .env 파일에 DISCORD_TOKEN과 CLIENT_ID가 필요해요!");
  process.exit(1);
}

/* ===============================
   🐿️ 토리봇 기본 설정
================================ */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const player = createAudioPlayer();

// 쿠키 파일 확인
const hasCookies = fs.existsSync("./cookies.txt");
if (hasCookies) {
  console.log("✅ cookies.txt 발견!");
} else {
  console.log("⚠️ cookies.txt 없음 - YouTube 차단될 수 있어요!");
}

/* ===============================
   🌰 슬래시 커맨드 등록
================================ */
const commands = [
  new SlashCommandBuilder()
    .setName("재생")
    .setDescription("🐿️ 도토리로 노래를 틀어줘요!")
    .addStringOption((option) =>
      option
        .setName("노래")
        .setDescription("유튜브 노래 제목 또는 URL")
        .setRequired(true),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("정지")
    .setDescription("🐿️ 재생을 멈춰요!")
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
  body: commands,
});

console.log("🌰 토리봇 슬래시 커맨드 등록 완료!");

/* ===============================
   🎵 YouTube API
================================ */
const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

/* ===============================
   🎵 음악 재생 로직
================================ */
function createYouTubeStream(videoUrl) {
  console.log("🎧 [createYouTubeStream] 스트림 생성 시작");

  // yt-dlp 옵션
  const ytdlpArgs = ["-f", "bestaudio", "-o", "-"];

  // 쿠키가 있으면 추가
  if (hasCookies) {
    ytdlpArgs.push("--cookies", "./cookies.txt");
  }

  ytdlpArgs.push(videoUrl);

  console.log("📝 [yt-dlp] 명령:", ytdlpArgs.join(" "));

  const ytdlp = spawn("yt-dlp", ytdlpArgs);

  const ffmpeg = spawn("ffmpeg", [
    "-i",
    "pipe:0",
    "-analyzeduration",
    "0",
    "-loglevel",
    "error",
    "-f",
    "opus",
    "-ar",
    "48000",
    "-ac",
    "2",
    "pipe:1",
  ]);

  ytdlp.stdout.pipe(ffmpeg.stdin);

  ytdlp.on("error", (error) => {
    console.error("❌ [yt-dlp] 프로세스 에러:", error);
  });

  ffmpeg.on("error", (error) => {
    console.error("❌ [FFmpeg] 프로세스 에러:", error);
  });

  ytdlp.stderr.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("ERROR")) {
      console.error("❌ [yt-dlp]:", msg);
    }
  });

  ffmpeg.stderr.on("data", (data) => {
    console.error("❌ [FFmpeg]:", data.toString());
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      console.log(`⚠️ [yt-dlp] 종료, 코드: ${code}`);
    }
  });

  ffmpeg.on("close", (code) => {
    if (code !== 0) {
      console.log(`⚠️ [FFmpeg] 종료, 코드: ${code}`);
    }
  });

  console.log("✅ [createYouTubeStream] 스트림 생성 완료");
  return ffmpeg.stdout;
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // 🛑 정지 커맨드
  if (interaction.commandName === "정지") {
    player.stop();
    return interaction.reply("⏹️ 재생을 멈췄어요!");
  }

  // 🎵 재생 커맨드
  if (interaction.commandName === "재생") {
    const query = interaction.options.getString("노래");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "🐿️ 음성 채널에 먼저 들어가야 도토리를 틀 수 있어!",
        ephemeral: true,
      });
    }

    await interaction.reply("🌰 토리봇이 도토리 주워오는 중...");

    try {
      let videoUrl;

      // URL 직접 입력 체크
      if (query.includes("youtube.com") || query.includes("youtu.be")) {
        videoUrl = query;
      } else {
        // YouTube API 검색
        const res = await youtube.search.list({
          part: ["snippet"],
          q: query,
          maxResults: 1,
          type: ["video"],
        });

        if (!res.data.items || res.data.items.length === 0) {
          return interaction.editReply("❌ 도토리를 못 찾았어...");
        }

        const videoId = res.data.items[0].id?.videoId;

        if (!videoId) {
          return interaction.editReply("❌ 도토리를 못 찾았어...");
        }

        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }

      // 음성 채널 연결
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      // 스트림 생성 및 재생
      const stream = createYouTubeStream(videoUrl);
      const resource = createAudioResource(stream);

      player.play(resource);
      connection.subscribe(player);

      player.once(AudioPlayerStatus.Playing, () => {
        interaction.editReply(`🎶 **${query}** 재생 시작! 냠냠 🌰`);
      });

      player.on("error", (error) => {
        console.error("❌ [플레이어] 에러:", error);
        interaction.followUp("💥 재생 중 문제가 생겼어...");
      });
    } catch (err) {
      console.error("❌ [재생] 에러:", err);
      interaction.editReply("💥 도토리 떨어뜨렸어... 다시 시도해줘!");
    }
  }
});

/* ===============================
   🤖 봇 준비 완료
================================ */
client.once(Events.ClientReady, () => {
  console.log(`🐿️ 토리봇 로그인 완료! (${client.user.tag})`);
});

client.login(process.env.DISCORD_TOKEN);
