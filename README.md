# 🐿️ 토리봇 (ToriBot)

디스코드에서 유튜브 음악을 재생하는 귀여운 다람쥐 봇이에요!

## ✨ 기능

- 🎵 유튜브 노래 검색 및 재생
- 🔗 유튜브 URL 직접 재생
- ⏹️ 재생 정지

## 🛠️ 필수 요구사항

### 1. Node.js

- **Node.js v18 이상** 설치 필요
- [다운로드](https://nodejs.org/)

### 2. FFmpeg

- Windows: `winget install ffmpeg`
- Mac: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

### 3. yt-dlp

- Windows: `winget install yt-dlp`
- Mac: `brew install yt-dlp`
- Linux: `sudo apt install yt-dlp`

## 📦 설치 방법

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-username/toribot.git
cd toribot
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 만들고 다음 내용을 입력하세요:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
YOUTUBE_API_KEY=your_youtube_api_key
```

#### 🔑 토큰 발급 방법

**Discord Bot Token:**

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. "New Application" 클릭
3. Bot 탭에서 "Add Bot" 클릭
4. Token 복사 (Reset Token으로 재발급 가능)
5. CLIENT_ID는 OAuth2 → General에서 확인

**권한 설정:**

- Bot 탭: `Send Messages`, `Connect`, `Speak` 권한 활성화
- OAuth2 → URL Generator: `bot`, `applications.commands` 선택
- 생성된 URL로 봇을 서버에 초대

**YouTube API Key:**

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. "API 및 서비스" → "라이브러리"
4. "YouTube Data API v3" 검색 후 사용 설정
5. "사용자 인증 정보" → "API 키 만들기"

### 4. YouTube 쿠키 설정 (선택사항, 권장)

YouTube가 403 에러로 차단할 경우 필요해요:

1. Chrome에서 [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) 확장 프로그램 설치
2. YouTube 로그인
3. 확장 프로그램 클릭 → "Export" 클릭
4. 저장된 `cookies.txt` 파일을 프로젝트 폴더에 복사

## 🚀 실행

```bash
npm start
```

또는

```bash
node index.js
```

## 🎮 사용 방법

### 명령어

- `/재생 [노래 제목 또는 URL]` - 노래 재생
- `/정지` - 재생 중지

### 예시

```
/재생 한로로
/재생 https://www.youtube.com/watch?v=abcd1234
/정지
```

## 📁 프로젝트 구조

```
toribot/
├── index.js          # 메인 봇 파일
├── package.json      # 프로젝트 설정
├── .env             # 환경 변수 (직접 생성)
├── cookies.txt      # YouTube 쿠키 (선택사항)
└── README.md        # 이 파일
```

## 🐛 문제 해결

### 403 Forbidden 에러

→ `cookies.txt` 파일을 추가하세요

### "Cannot find module" 에러

→ `npm install` 다시 실행

### 봇이 음성 채널에 들어오지만 소리가 안 나요

→ FFmpeg와 yt-dlp가 설치되어 있는지 확인하세요

### opusscript 관련 에러

→ `npm install opusscript` 실행

## 📝 라이선스

MIT License

## 💖 제작

토리봇은 Claude와 함께 만들어졌어요! 🐿️🌰
