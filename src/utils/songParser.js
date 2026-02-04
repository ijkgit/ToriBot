/**
 * 노래 제목에서 불필요한 정보 제거
 */
export function cleanSongTitle(title) {
  return title
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
}

/**
 * 노래 제목에서 아티스트와 곡명 분리
 */
export function parseSongInfo(title) {
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
