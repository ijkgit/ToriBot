import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { parseSongInfo, cleanSongTitle } from "../utils/songParser.js";
import { logger } from "../utils/logger.js";

/**
 * Genius에서 가사 검색
 */
async function searchGeniusLyrics(artist, title) {
  try {
    const searchQuery = artist ? `${artist} ${title}` : title;
    const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(searchQuery)}`;

    logger.debug("Genius", `검색: ${searchQuery}`);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const searchData = await searchResponse.json();

    const songHits = searchData.response?.sections?.find(
      (s) => s.type === "song",
    )?.hits;
    if (!songHits || songHits.length === 0) {
      logger.warn("Genius", "검색 결과 없음");
      return null;
    }

    const songUrl = songHits[0].result.url;
    logger.debug("Genius", `곡 페이지: ${songUrl}`);

    const lyricsResponse = await fetch(songUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await lyricsResponse.text();
    const $ = cheerio.load(html);

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
          $(elem).find("br").replaceWith("\n");
          lyrics += $(elem).text() + "\n\n";
        });
        break;
      }
    }

    lyrics = lyrics.trim();

    if (lyrics && lyrics.length > 50) {
      logger.success("Genius", "가사 찾음");
      return lyrics;
    }

    logger.warn("Genius", "가사 추출 실패");
    return null;
  } catch (error) {
    logger.error("Genius", "가사 검색 실패", error);
    return null;
  }
}

/**
 * 가사 검색 (여러 방법 시도)
 */
export async function searchLyrics(songInfo) {
  const { artist, title } = parseSongInfo(songInfo);

  logger.debug("가사검색", `검색: ${artist} - ${title}`);

  // 1. 아티스트 + 제목
  let lyrics = await searchGeniusLyrics(artist, title);
  if (lyrics) return lyrics;

  // 2. 제목만
  lyrics = await searchGeniusLyrics("", title);
  if (lyrics) return lyrics;

  // 3. 정제된 제목
  lyrics = await searchGeniusLyrics("", cleanSongTitle(songInfo));
  if (lyrics) return lyrics;

  logger.warn("가사검색", "모든 시도 실패");
  return null;
}
