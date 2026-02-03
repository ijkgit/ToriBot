import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  EmbedBuilder,
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
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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

// 현재 실행 중인 프로세스 추적
let currentProcesses = {
  ytdlp: null,
  ffmpeg: null,
};

// 현재 재생 중인 노래 정보
let nowPlaying = {
  title: null,
  artist: null,
  videoUrl: null,
  guildId: null,
};

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

  new SlashCommandBuilder()
    .setName("가사")
    .setDescription("🐿️ 현재 재생 중인 노래의 가사를 보여줘요!")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("현재곡")
    .setDescription("🐿️ 현재 재생 중인 노래 정보를 보여줘요!")
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
   🎵 가사 검색 - Genius.com
================================ */
function cleanSongTitle(title) {
  let cleaned = title
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/【.*?】/g, "")
    .replace(/MV|Official|Video|Audio|Lyric|Lyrics|HD|4K|M\/V/gi, "")
    .replace(/ㅣ.*$/g, "")
    .replace(/\|.*$/g, "")
    .replace(/#.*$/g, "")
    .replace(/➡.*$/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

function parseSongInfo(title) {
  const cleaned = cleanSongTitle(title);
  let artist = "";
  let songTitle = cleaned;

  const patterns = [/^(.+?)\s*-\s*(.+)$/, /^(.+?)\s*–\s*(.+)$/];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      artist = match[1].trim();
      songTitle = match[2].trim();
      break;
    }
  }

  return { artist, title: songTitle };
}

async function searchGeniusLyrics(artist, title) {
  try {
    const searchQuery = artist ? `${artist} ${title}` : title;
    const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(searchQuery)}`;

    console.log("🔍 [Genius] 검색:", searchQuery);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const searchData = await searchResponse.json();

    // 검색 결과에서 첫 번째 곡 찾기
    const songHits = searchData.response?.sections?.find(
      (s) => s.type === "song",
    )?.hits;
    if (!songHits || songHits.length === 0) {
      console.log("❌ [Genius] 검색 결과 없음");
      return null;
    }

    const songUrl = songHits[0].result.url;
    console.log("🔗 [Genius] 곡 페이지:", songUrl);

    // 가사 페이지 가져오기
    const lyricsResponse = await fetch(songUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await lyricsResponse.text();
    const $ = cheerio.load(html);

    // Genius의 가사 컨테이너 선택자들
    let lyrics = "";
    const lyricsSelectors = [
      'div[data-lyrics-container="true"]',
      'div[class^="Lyrics__Container"]',
      "div.lyrics",
    ];

    for (const selector of lyricsSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((i, elem) => {
          // <br> 태그를 줄바꿈으로 변환
          $(elem).find("br").replaceWith("\n");
          // 텍스트 추출
          lyrics += $(elem).text() + "\n\n";
        });
        break;
      }
    }

    lyrics = lyrics.trim();

    if (lyrics && lyrics.length > 50) {
      console.log("✅ [Genius] 가사 찾음");
      return lyrics;
    }

    console.log("❌ [Genius] 가사 추출 실패");
    return null;
  } catch (error) {
    console.error("❌ [Genius] 에러:", error.message);
    return null;
  }
}

async function searchLyrics(songInfo) {
  const { artist, title } = parseSongInfo(songInfo);

  console.log("🔍 [searchLyrics] 가사 검색:", { artist, title });

  // 1. 아티스트와 제목으로 검색
  let lyrics = await searchGeniusLyrics(artist, title);
  if (lyrics) return lyrics;

  // 2. 제목만으로 검색
  lyrics = await searchGeniusLyrics("", title);
  if (lyrics) return lyrics;

  // 3. 전체 제목으로 검색
  lyrics = await searchGeniusLyrics("", cleanSongTitle(songInfo));
  if (lyrics) return lyrics;

  console.log("❌ [searchLyrics] 모든 시도 실패");
  return null;
}

/* ===============================
   🎵 음악 재생 로직
================================ */
function stopCurrentProcesses() {
  console.log("🛑 [stopCurrentProcesses] 기존 프로세스 정리 시작");

  if (player.state.status !== AudioPlayerStatus.Idle) {
    console.log("🛑 [stopCurrentProcesses] 플레이어 정지");
    player.stop(true);
  }

  if (currentProcesses.ytdlp && !currentProcesses.ytdlp.killed) {
    console.log("🛑 [stopCurrentProcesses] yt-dlp 종료");
    try {
      currentProcesses.ytdlp.kill("SIGKILL");
    } catch (err) {
      console.log("⚠️ [stopCurrentProcesses] yt-dlp 종료 실패:", err.message);
    }
    currentProcesses.ytdlp = null;
  }

  if (currentProcesses.ffmpeg && !currentProcesses.ffmpeg.killed) {
    console.log("🛑 [stopCurrentProcesses] FFmpeg 종료");
    try {
      currentProcesses.ffmpeg.kill("SIGKILL");
    } catch (err) {
      console.log("⚠️ [stopCurrentProcesses] FFmpeg 종료 실패:", err.message);
    }
    currentProcesses.ffmpeg = null;
  }

  console.log("✅ [stopCurrentProcesses] 정리 완료");
}

function createYouTubeStream(videoUrl) {
  console.log("🎧 [createYouTubeStream] 스트림 생성 시작");

  stopCurrentProcesses();

  return new Promise((resolve) => {
    setTimeout(() => {
      const ytdlpArgs = ["-f", "bestaudio", "-o", "-"];

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

      currentProcesses.ytdlp = ytdlp;
      currentProcesses.ffmpeg = ffmpeg;

      ytdlp.stdout.pipe(ffmpeg.stdin);

      ytdlp.on("error", (error) => {
        if (error.code !== "EPIPE") {
          console.error("❌ [yt-dlp] 프로세스 에러:", error);
        }
      });

      ffmpeg.on("error", (error) => {
        if (error.code !== "EPIPE") {
          console.error("❌ [FFmpeg] 프로세스 에러:", error);
        }
      });

      ytdlp.stderr.on("data", (data) => {
        const msg = data.toString();
        if (msg.includes("ERROR")) {
          console.error("❌ [yt-dlp]:", msg);
        }
      });

      ffmpeg.stderr.on("data", (data) => {
        const msg = data.toString();
        if (msg.includes("Error")) {
          console.error("❌ [FFmpeg]:", msg);
        }
      });

      ytdlp.on("close", (code) => {
        if (code !== 0 && code !== null) {
          console.log(`⚠️ [yt-dlp] 종료, 코드: ${code}`);
        }
        if (currentProcesses.ytdlp === ytdlp) {
          currentProcesses.ytdlp = null;
        }
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0 && code !== null) {
          console.log(`⚠️ [FFmpeg] 종료, 코드: ${code}`);
        }
        if (currentProcesses.ffmpeg === ffmpeg) {
          currentProcesses.ffmpeg = null;
        }
      });

      ytdlp.stdout.on("error", (err) => {
        if (err.code !== "EPIPE") {
          console.error("❌ [yt-dlp stdout]:", err);
        }
      });

      ffmpeg.stdin.on("error", (err) => {
        if (err.code !== "EPIPE") {
          console.error("❌ [FFmpeg stdin]:", err);
        }
      });

      console.log("✅ [createYouTubeStream] 스트림 생성 완료");
      resolve(ffmpeg.stdout);
    }, 200);
  });
}

player.on("error", (error) => {
  console.error("❌ [플레이어] 에러:", error);
  stopCurrentProcesses();
});

// ✅ Idle 이벤트에서 nowPlaying 초기화 제거
player.on(AudioPlayerStatus.Idle, () => {
  console.log("🔚 [플레이어] 재생 종료");
  // nowPlaying은 정지 명령어나 다음 곡 재생 시에만 업데이트
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "정지") {
    stopCurrentProcesses();
    nowPlaying.title = null;
    nowPlaying.artist = null;
    nowPlaying.videoUrl = null;
    nowPlaying.guildId = null;
    return interaction.reply("⏹️ 재생을 멈췄어요!");
  }

  if (interaction.commandName === "현재곡") {
    if (!nowPlaying.title || nowPlaying.guildId !== interaction.guildId) {
      return interaction.reply({
        content: "🐿️ 지금은 아무 노래도 안 틀고 있어요!",
        flags: 64,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xf59e42)
      .setTitle("🎵 현재 재생 중")
      .setDescription(`**${nowPlaying.title}**`)
      .setURL(nowPlaying.videoUrl)
      .setFooter({ text: "토리봇 🐿️🌰" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "가사") {
    if (!nowPlaying.title || nowPlaying.guildId !== interaction.guildId) {
      return interaction.reply({
        content: "🐿️ 지금은 아무 노래도 안 틀고 있어요!",
        flags: 64,
      });
    }

    await interaction.reply("🔍 Genius에서 가사를 찾고 있어요...");

    const lyrics = await searchLyrics(nowPlaying.title);

    if (!lyrics) {
      const { artist, title } = parseSongInfo(nowPlaying.title);
      return interaction.editReply(
        `❌ 가사를 찾을 수 없어요... 😢\n\n` +
          `**검색한 정보:**\n` +
          `아티스트: ${artist || "없음"}\n` +
          `곡명: ${title}\n\n` +
          `💡 영어 노래나 유명한 곡은 더 잘 찾을 수 있어요!`,
      );
    }

    const maxLength = 4000;

    if (lyrics.length <= maxLength) {
      const embed = new EmbedBuilder()
        .setColor(0xf59e42)
        .setTitle(`🎤 ${cleanSongTitle(nowPlaying.title)}`)
        .setDescription(lyrics.substring(0, 4096))
        .setURL(nowPlaying.videoUrl)
        .setFooter({ text: "토리봇 🐿️🌰 via Genius" })
        .setTimestamp();

      return interaction.editReply({ content: null, embeds: [embed] });
    } else {
      const parts = [];
      for (let i = 0; i < lyrics.length; i += maxLength) {
        parts.push(lyrics.substring(i, i + maxLength));
      }

      const embed = new EmbedBuilder()
        .setColor(0xf59e42)
        .setTitle(`🎤 ${cleanSongTitle(nowPlaying.title)}`)
        .setDescription(parts[0])
        .setURL(nowPlaying.videoUrl)
        .setFooter({ text: `토리봇 🐿️🌰 via Genius (1/${parts.length})` })
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [embed] });

      for (let i = 1; i < parts.length; i++) {
        const continueEmbed = new EmbedBuilder()
          .setColor(0xf59e42)
          .setDescription(parts[i])
          .setFooter({ text: `토리봇 🐿️🌰 (${i + 1}/${parts.length})` });

        await interaction.followUp({ embeds: [continueEmbed] });
      }
    }

    return;
  }

  if (interaction.commandName === "재생") {
    const query = interaction.options.getString("노래");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "🐿️ 음성 채널에 먼저 들어가야 도토리를 틀 수 있어!",
        flags: 64,
      });
    }

    await interaction.reply("🌰 토리봇이 도토리 주워오는 중...");

    try {
      let videoUrl;
      let videoTitle;

      if (query.includes("youtube.com") || query.includes("youtu.be")) {
        videoUrl = query;

        let videoId;
        if (query.includes("youtube.com")) {
          const urlParams = new URLSearchParams(new URL(query).search);
          videoId = urlParams.get("v");
        } else {
          videoId = query.split("youtu.be/")[1]?.split("?")[0];
        }

        if (videoId) {
          const videoInfo = await youtube.videos.list({
            part: ["snippet"],
            id: [videoId],
          });
          videoTitle = videoInfo.data.items?.[0]?.snippet?.title || query;
        } else {
          videoTitle = query;
        }
      } else {
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
        videoTitle = res.data.items[0].snippet?.title || query;

        if (!videoId) {
          return interaction.editReply("❌ 도토리를 못 찾았어...");
        }

        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }

      const { artist, title } = parseSongInfo(videoTitle);
      nowPlaying.title = videoTitle;
      nowPlaying.artist = artist;
      nowPlaying.videoUrl = videoUrl;
      nowPlaying.guildId = interaction.guildId;

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const READY_TIMEOUT = 30000;

      try {
        await entersState(
          connection,
          VoiceConnectionStatus.Ready,
          READY_TIMEOUT,
        );
      } catch (error) {
        console.error("❌ [연결] 타임아웃:", error);
        connection.destroy();
        return interaction.editReply("❌ 음성 채널 연결에 실패했어요...");
      }

      const stream = await createYouTubeStream(videoUrl);
      const resource = createAudioResource(stream);

      player.play(resource);
      connection.subscribe(player);

      player.removeAllListeners(AudioPlayerStatus.Playing);
      player.once(AudioPlayerStatus.Playing, () => {
        console.log("🎶 [재생] 재생 중!");
        interaction
          .editReply(`🎶 **${videoTitle}** 재생 시작! 냠냠 🌰`)
          .catch(() => {});
      });
    } catch (err) {
      console.error("❌ [재생] 에러:", err);
      stopCurrentProcesses();
      nowPlaying.title = null;
      nowPlaying.artist = null;
      nowPlaying.videoUrl = null;
      nowPlaying.guildId = null;
      interaction
        .editReply("💥 도토리 떨어뜨렸어... 다시 시도해줘!")
        .catch(() => {});
    }
  }
});

process.on("SIGINT", () => {
  console.log("\n🛑 봇 종료 중...");
  stopCurrentProcesses();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 봇 종료 중...");
  stopCurrentProcesses();
  process.exit(0);
});

client.once(Events.ClientReady, () => {
  console.log(`🐿️ 토리봇 로그인 완료! (${client.user.tag})`);
});

client.login(process.env.DISCORD_TOKEN);
