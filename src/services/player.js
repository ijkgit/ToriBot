import { spawn } from "child_process";
import fs from "fs";
import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { parseSongInfo } from "../utils/songParser.js";
import { logger } from "../utils/logger.js";

// 플레이어 인스턴스
export const player = createAudioPlayer();

// 상태 관리
export const state = {
  currentProcesses: {
    ytdlp: null,
    ffmpeg: null,
  },
  nowPlaying: {
    title: null,
    artist: null,
    videoUrl: null,
    videoId: null,
    guildId: null,
  },
  queue: [],
  playHistory: [],
  autoplayEnabled: true,
  currentConnection: null,
};

const hasCookies = fs.existsSync("./cookies.txt");
if (hasCookies) {
  logger.success("쿠키", "cookies.txt 발견!");
} else {
  logger.warn("쿠키", "cookies.txt 없음 - YouTube 차단될 수 있어요!");
}

/**
 * 현재 프로세스 정리
 */
export function stopCurrentProcesses() {
  logger.info("프로세스", "기존 프로세스 정리 시작");

  if (player.state.status !== AudioPlayerStatus.Idle) {
    logger.info("프로세스", "플레이어 정지");
    player.stop(true);
  }

  if (state.currentProcesses.ytdlp && !state.currentProcesses.ytdlp.killed) {
    logger.info("프로세스", "yt-dlp 종료");
    try {
      state.currentProcesses.ytdlp.kill("SIGKILL");
    } catch (err) {
      logger.warn("프로세스", `yt-dlp 종료 실패: ${err.message}`);
    }
    state.currentProcesses.ytdlp = null;
  }

  if (state.currentProcesses.ffmpeg && !state.currentProcesses.ffmpeg.killed) {
    logger.info("프로세스", "FFmpeg 종료");
    try {
      state.currentProcesses.ffmpeg.kill("SIGKILL");
    } catch (err) {
      logger.warn("프로세스", `FFmpeg 종료 실패: ${err.message}`);
    }
    state.currentProcesses.ffmpeg = null;
  }

  logger.success("프로세스", "정리 완료");
}

/**
 * YouTube 스트림 생성
 */
export function createYouTubeStream(videoUrl) {
  logger.info("스트림", "생성 시작");

  stopCurrentProcesses();

  return new Promise((resolve) => {
    setTimeout(() => {
      const ytdlpArgs = ["-f", "bestaudio", "-o", "-"];

      if (hasCookies) {
        ytdlpArgs.push("--cookies", "./cookies.txt");
      }

      ytdlpArgs.push(videoUrl);

      logger.debug("yt-dlp", `명령: ${ytdlpArgs.join(" ")}`);

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

      state.currentProcesses.ytdlp = ytdlp;
      state.currentProcesses.ffmpeg = ffmpeg;

      ytdlp.stdout.pipe(ffmpeg.stdin);

      // 에러 핸들링
      ytdlp.on("error", (error) => {
        if (error.code !== "EPIPE") {
          logger.error("yt-dlp", "프로세스 에러", error);
        }
      });

      ffmpeg.on("error", (error) => {
        if (error.code !== "EPIPE") {
          logger.error("FFmpeg", "프로세스 에러", error);
        }
      });

      ytdlp.stderr.on("data", (data) => {
        const msg = data.toString();
        if (msg.includes("ERROR")) {
          logger.error("yt-dlp", msg);
        }
      });

      ffmpeg.stderr.on("data", (data) => {
        const msg = data.toString();
        if (msg.includes("Error")) {
          logger.error("FFmpeg", msg);
        }
      });

      // 프로세스 종료 핸들링
      ytdlp.on("close", (code) => {
        if (code !== 0 && code !== null) {
          logger.warn("yt-dlp", `종료 코드: ${code}`);
        }
        if (state.currentProcesses.ytdlp === ytdlp) {
          state.currentProcesses.ytdlp = null;
        }
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0 && code !== null) {
          logger.warn("FFmpeg", `종료 코드: ${code}`);
        }
        if (state.currentProcesses.ffmpeg === ffmpeg) {
          state.currentProcesses.ffmpeg = null;
        }
      });

      // 파이프 에러 핸들링
      ytdlp.stdout.on("error", (err) => {
        if (err.code !== "EPIPE") {
          logger.error("yt-dlp stdout", err.message);
        }
      });

      ffmpeg.stdin.on("error", (err) => {
        if (err.code !== "EPIPE") {
          logger.error("FFmpeg stdin", err.message);
        }
      });

      logger.success("스트림", "생성 완료");
      resolve(ffmpeg.stdout);
    }, 200);
  });
}

/**
 * 노래 재생
 */
export async function playSong(videoUrl, videoTitle, videoId, guildId) {
  try {
    // videoId 재추출 (필요시)
    if (!videoId || videoId.length !== 11) {
      logger.warn("재생", "videoId 재추출 시도");
      try {
        const url = new URL(videoUrl);
        videoId = url.searchParams.get("v");
        logger.success("재생", `videoId 재추출 성공: ${videoId}`);
      } catch (err) {
        logger.error("재생", "videoId 추출 실패", err);
      }
    }

    const { artist, title } = parseSongInfo(videoTitle);
    state.nowPlaying.title = videoTitle;
    state.nowPlaying.artist = artist;
    state.nowPlaying.videoUrl = videoUrl;
    state.nowPlaying.videoId = videoId;
    state.nowPlaying.guildId = guildId;

    // 재생 기록 추가
    if (videoId) {
      state.playHistory.push(videoId);
      if (state.playHistory.length > 20) {
        state.playHistory.shift();
      }
      logger.debug("재생", `재생 기록 추가. 총: ${state.playHistory.length}곡`);
    }

    const stream = await createYouTubeStream(videoUrl);
    const resource = createAudioResource(stream);

    player.play(resource);

    logger.success("재생", `재생 시작: ${videoTitle}`);
  } catch (error) {
    logger.error("재생", "재생 실패", error);
    throw error;
  }
}
