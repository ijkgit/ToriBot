# 🐿️ 토리봇 (ToriBot)

디스코드에서 유튜브 음악을 재생하는 귀여운 다람쥐 봇이에요!

## ✨ 기능

- 🎵 유튜브 노래 검색 및 재생
- 🔗 유튜브 URL 직접 재생
- ⏹️ 재생 정지
- 🔄 재생 중 다른 곡으로 즉시 전환 가능
- 🎤 현재 재생 중인 노래의 가사 표시 (Genius 지원)
- 📋 현재 재생 중인 곡 정보 확인

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

### 4. YouTube 쿠키 설정 (필수)

YouTube 403 에러 방지를 위해 쿠키 설정이 필요해요:

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
- `/가사` - 현재 재생 중인 노래의 가사 표시
- `/현재곡` - 현재 재생 중인 곡 정보 확인

### 예시

```
/재생 한로로
/재생 https://www.youtube.com/watch?v=abcd1234
/가사
/현재곡
/정지
```

**💡 Tip:** 재생 중에 다른 노래를 `/재생`하면 즉시 전환돼요!

## 📁 프로젝트 구조

```
toribot/
├── index.js          # 메인 봇 파일
├── package.json      # 프로젝트 설정
├── .env             # 환경 변수 (직접 생성)
├── cookies.txt      # YouTube 쿠키 (필수)
├── .gitignore       # Git 제외 파일
└── README.md        # 이 파일
```

## 🐛 문제 해결

### 403 Forbidden 에러

→ `cookies.txt` 파일을 추가하세요 (필수)

### "Cannot find module" 에러

→ `npm install` 다시 실행

### 봇이 음성 채널에 들어오지만 소리가 안 나요

→ FFmpeg와 yt-dlp가 PATH에 설치되어 있는지 확인하세요

### opusscript 관련 에러

→ `npm install opusscript` 실행

### 가사를 찾을 수 없어요

→ 주로 영어 노래나 Genius에 등록된 곡만 가사를 찾을 수 있어요

### 재생 중 다른 곡을 틀면 에러가 발생해요

→ 최신 버전으로 업데이트하세요 (v1.1.0 이상)

## 🔧 기술 스택

- **discord.js** - 디스코드 봇 프레임워크
- **@discordjs/voice** - 음성 재생
- **yt-dlp** - 유튜브 다운로드
- **FFmpeg** - 오디오 스트리밍
- **googleapis** - 유튜브 검색 API
- **cheerio** - HTML 파싱 (가사 추출)
- **node-fetch** - HTTP 요청

## 📝 변경 이력

### v1.1.0 (2026-02-03)

- ✨ 가사 검색 기능 추가 (Genius 지원)
- ✨ 현재곡 정보 확인 기능 추가
- 🐛 재생 중 곡 전환 시 에러 수정
- 🐛 TimeoutNegativeWarning 해결
- 🎨 가사를 Discord Embed로 깔끔하게 표시

### v1.0.0 (2026-02-03)

- 🎉 초기 릴리즈
- 🎵 유튜브 음악 재생 기능
- ⏹️ 재생 정지 기능
- 🔄 곡 전환 기능

## 📝 라이선스

MIT License

## 💖 제작

토리봇은 Claude와 함께 만들어졌어요! 🐿️🌰

---

⭐ 마음에 드셨다면 Star 부탁드려요!

## 🤝 기여하기

버그 리포트나 기능 제안은 [Issues](https://github.com/your-username/toribot/issues)에 올려주세요!
