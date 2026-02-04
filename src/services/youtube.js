import { google } from "googleapis";
import { config } from "../config/env.js";
import { parseSongInfo } from "../utils/songParser.js";
import { logger } from "../utils/logger.js";

const youtube = google.youtube({
  version: "v3",
  auth: config.youtube.apiKey,
});

/**
 * 노래 검색
 */
export async function searchSong(query) {
  try {
    const res = await youtube.search.list({
      part: ["snippet"],
      q: query,
      maxResults: 1,
      type: ["video"],
      videoCategoryId: "10", // Music 카테고리
    });

    if (!res.data.items || res.data.items.length === 0) {
      return null;
    }

    const videoId = res.data.items[0].id?.videoId;
    const videoTitle = res.data.items[0].snippet?.title;

    if (!videoId) return null;

    return {
      videoId,
      title: videoTitle,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    logger.error("YouTube 검색", "검색 실패", error);
    return null;
  }
}

/**
 * 비디오 정보 가져오기
 */
export async function getVideoInfo(videoId) {
  try {
    const videoInfo = await youtube.videos.list({
      part: ["snippet"],
      id: [videoId],
    });

    return videoInfo.data.items?.[0]?.snippet?.title || null;
  } catch (error) {
    logger.error("YouTube 정보", "비디오 정보 가져오기 실패", error);
    return null;
  }
}

/**
 * 다음 추천 곡 찾기
 */
export async function getNextRecommendation(
  currentVideoId,
  nowPlayingTitle,
  playHistory,
) {
  try {
    logger.debug("추천", `다음 곡 찾는 중... videoId: ${currentVideoId}`);

    if (!currentVideoId || currentVideoId.length !== 11) {
      logger.error("추천", "유효하지 않은 videoId");
      return null;
    }

    const { artist, title } = parseSongInfo(nowPlayingTitle);
    let searchQuery = artist || title.split(" ")[0];

    if (searchQuery.length < 3) {
      searchQuery = title;
    }

    logger.debug("추천", `검색 키워드: ${searchQuery}`);

    // 검색으로 videoId 목록 가져오기
    const searchRes = await youtube.search.list({
      part: ["snippet"],
      q: searchQuery,
      type: ["video"],
      videoCategoryId: "10",
      maxResults: 20,
    });

    if (!searchRes.data.items || searchRes.data.items.length === 0) {
      logger.warn("추천", "검색 결과 없음");
      return null;
    }

    const videoIds = searchRes.data.items
      .map((item) => item.id.videoId)
      .filter((id) => id);

    if (videoIds.length === 0) {
      logger.warn("추천", "videoId 없음");
      return null;
    }

    // videos.list로 상세 정보 가져오기
    const videosRes = await youtube.videos.list({
      part: ["snippet", "contentDetails"],
      id: videoIds,
    });

    if (!videosRes.data.items || videosRes.data.items.length === 0) {
      logger.warn("추천", "비디오 정보 없음");
      return null;
    }

    // Music 카테고리 + 재생 기록 제외
    const excludeIds = [currentVideoId, ...playHistory];
    const musicVideos = videosRes.data.items.filter((video) => {
      const isMusic = video.snippet.categoryId === "10";
      const notPlayed = !excludeIds.includes(video.id);
      const notLive = video.snippet.liveBroadcastContent === "none";
      return isMusic && notPlayed && notLive;
    });

    logger.debug(
      "추천",
      `필터링: 전체 ${videosRes.data.items.length}개 → 음악 ${musicVideos.length}개`,
    );

    if (musicVideos.length === 0) {
      logger.warn("추천", "필터링 후 결과 없음");
      return null;
    }

    // 랜덤 선택
    const randomIndex = Math.floor(
      Math.random() * Math.min(5, musicVideos.length),
    );
    const selectedVideo = musicVideos[randomIndex];

    const result = {
      videoId: selectedVideo.id,
      title: selectedVideo.snippet.title,
      url: `https://www.youtube.com/watch?v=${selectedVideo.id}`,
    };

    logger.success("추천", `다음 곡: ${result.title}`);
    return result;
  } catch (error) {
    logger.error("추천", "추천 곡 찾기 실패", error);
    return null;
  }
}
