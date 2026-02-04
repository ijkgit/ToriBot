import { Events, EmbedBuilder } from "discord.js";
import {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
} from "@discordjs/voice";
import {
  searchSong,
  getVideoInfo,
  getNextRecommendation,
} from "../services/youtube.js";
import { searchLyrics } from "../services/lyrics.js";
import {
  player,
  state,
  stopCurrentProcesses,
  playSong,
} from "../services/player.js";
import { cleanSongTitle, parseSongInfo } from "../utils/songParser.js";
import { logger } from "../utils/logger.js";

/**
 * 다음 곡 재생
 */
async function playNextInQueue() {
  // 수동 큐 우선
  if (state.queue.length > 0) {
    const nextSong = state.queue.shift();
    logger.info("큐", `다음 곡 재생: ${nextSong.title}`);
    await playSong(
      nextSong.url,
      nextSong.title,
      nextSong.videoId,
      state.nowPlaying.guildId,
    );
    return;
  }

  // 자동재생
  if (state.autoplayEnabled && state.nowPlaying.videoId) {
    logger.info("자동재생", "다음 추천 곡 찾는 중...");

    const nextVideo = await getNextRecommendation(
      state.nowPlaying.videoId,
      state.nowPlaying.title,
      state.playHistory,
    );

    if (nextVideo) {
      logger.success("자동재생", `다음 곡: ${nextVideo.title}`);
      await playSong(
        nextVideo.url,
        nextVideo.title,
        nextVideo.videoId,
        state.nowPlaying.guildId,
      );
    } else {
      logger.warn("자동재생", "추천 곡 없음");
    }
  }
}

/**
 * 커맨드 핸들러 등록
 */
export function registerCommandHandlers(client) {
  // 플레이어 이벤트
  player.on("error", (error) => {
    logger.error("플레이어", "에러 발생", error);
    stopCurrentProcesses();
    playNextInQueue().catch(console.error);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    logger.info("플레이어", "재생 종료");
    playNextInQueue().catch(console.error);
  });

  // 인터랙션 핸들러
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // /정지
    if (commandName === "정지") {
      stopCurrentProcesses();
      state.queue = [];
      state.playHistory = [];
      state.nowPlaying = {
        title: null,
        artist: null,
        videoUrl: null,
        videoId: null,
        guildId: null,
      };
      if (state.currentConnection) {
        state.currentConnection.destroy();
        state.currentConnection = null;
      }
      return interaction.reply("⏹️ 재생을 멈췄어요!");
    }

    // /스킵
    if (commandName === "스킵") {
      if (
        !state.nowPlaying.title ||
        state.nowPlaying.guildId !== interaction.guildId
      ) {
        return interaction.reply({
          content: "🐿️ 지금은 아무 노래도 안 틀고 있어요!",
          flags: 64,
        });
      }

      await interaction.reply("⏭️ 다음 곡으로 넘어가요!");
      player.stop();
      return;
    }

    // /자동재생
    if (commandName === "자동재생") {
      state.autoplayEnabled = interaction.options.getBoolean("활성화");
      return interaction.reply(
        state.autoplayEnabled
          ? "✅ 자동재생이 활성화되었어요! 곡이 끝나면 YouTube처럼 추천 곡을 자동으로 재생해요."
          : "❌ 자동재생이 비활성화되었어요.",
      );
    }

    // /큐
    if (commandName === "큐") {
      if (state.queue.length === 0) {
        return interaction.reply({
          content: "📭 대기 중인 곡이 없어요!",
          flags: 64,
        });
      }

      const queueList = state.queue
        .slice(0, 10)
        .map((song, index) => `${index + 1}. ${song.title}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(0xf59e42)
        .setTitle("📋 재생 대기 목록")
        .setDescription(
          queueList +
            (state.queue.length > 10
              ? `\n... 외 ${state.queue.length - 10}곡`
              : ""),
        )
        .setFooter({ text: `총 ${state.queue.length}곡 | 토리봇 🐿️🌰` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // /현재곡
    if (commandName === "현재곡") {
      if (
        !state.nowPlaying.title ||
        state.nowPlaying.guildId !== interaction.guildId
      ) {
        return interaction.reply({
          content: "🐿️ 지금은 아무 노래도 안 틀고 있어요!",
          flags: 64,
        });
      }

      const queueInfo =
        state.queue.length > 0
          ? `\n📋 대기 중: ${state.queue.length}곡`
          : state.autoplayEnabled
            ? "\n🔄 자동재생: 다음 곡 자동 추천"
            : "";

      const embed = new EmbedBuilder()
        .setColor(0xf59e42)
        .setTitle("🎵 현재 재생 중")
        .setDescription(`**${state.nowPlaying.title}**${queueInfo}`)
        .setURL(state.nowPlaying.videoUrl)
        .setFooter({
          text: `자동재생: ${state.autoplayEnabled ? "ON" : "OFF"} | 토리봇 🐿️🌰`,
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // /가사
    if (commandName === "가사") {
      if (
        !state.nowPlaying.title ||
        state.nowPlaying.guildId !== interaction.guildId
      ) {
        return interaction.reply({
          content: "🐿️ 지금은 아무 노래도 안 틀고 있어요!",
          flags: 64,
        });
      }

      await interaction.reply("🔍 Genius에서 가사를 찾고 있어요...");

      const lyrics = await searchLyrics(state.nowPlaying.title);

      if (!lyrics) {
        const { artist, title } = parseSongInfo(state.nowPlaying.title);
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
          .setTitle(`🎤 ${cleanSongTitle(state.nowPlaying.title)}`)
          .setDescription(lyrics.substring(0, 4096))
          .setURL(state.nowPlaying.videoUrl)
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
          .setTitle(`🎤 ${cleanSongTitle(state.nowPlaying.title)}`)
          .setDescription(parts[0])
          .setURL(state.nowPlaying.videoUrl)
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

    // /재생
    if (commandName === "재생") {
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
        let videoId;

        // URL 직접 입력
        if (query.includes("youtube.com") || query.includes("youtu.be")) {
          videoUrl = query;

          if (query.includes("youtube.com")) {
            try {
              const url = new URL(query);
              videoId = url.searchParams.get("v");
            } catch (err) {
              return interaction.editReply(
                "❌ 올바른 YouTube URL이 아니에요...",
              );
            }
          } else {
            videoId = query.split("youtu.be/")[1]?.split("?")[0];
          }

          if (videoId) {
            videoTitle = await getVideoInfo(videoId);
            if (!videoTitle) videoTitle = query;
          } else {
            videoTitle = query;
          }
        } else {
          // 검색
          const result = await searchSong(query);

          if (!result) {
            return interaction.editReply("❌ 도토리를 못 찾았어...");
          }

          videoId = result.videoId;
          videoTitle = result.title;
          videoUrl = result.url;
        }

        logger.debug("재생", `videoId: ${videoId}`);

        // 음성 채널 연결
        if (
          !state.currentConnection ||
          state.currentConnection.state.status ===
            VoiceConnectionStatus.Disconnected
        ) {
          state.currentConnection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });

          try {
            await entersState(
              state.currentConnection,
              VoiceConnectionStatus.Ready,
              30000,
            );
          } catch (error) {
            logger.error("연결", "타임아웃", error);
            state.currentConnection.destroy();
            state.currentConnection = null;
            return interaction.editReply("❌ 음성 채널 연결에 실패했어요...");
          }

          state.currentConnection.subscribe(player);
        }

        // 즉시 재생
        await playSong(videoUrl, videoTitle, videoId, interaction.guildId);

        player.removeAllListeners(AudioPlayerStatus.Playing);
        player.once(AudioPlayerStatus.Playing, () => {
          logger.success("재생", "재생 중!");
          const autoplayMsg = state.autoplayEnabled
            ? "\n🔄 곡이 끝나면 자동으로 추천 곡을 재생해요!"
            : "";
          interaction
            .editReply(`🎶 **${videoTitle}** 재생 시작! 냠냠 🌰${autoplayMsg}`)
            .catch(() => {});
        });
      } catch (err) {
        logger.error("재생", "재생 실패", err);
        stopCurrentProcesses();
        interaction
          .editReply("💥 도토리 떨어뜨렸어... 다시 시도해줘!")
          .catch(() => {});
      }
    }
  });
}
