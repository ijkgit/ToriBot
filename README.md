# 🐿️ 토리봇 (ToriBot)

디스코드에서 유튜브 음악을 재생하는 귀여운 다람쥐 봇이에요!

## ✨ 기능

- 🎵 유튜브 노래 검색 및 재생 (음악 전용 필터링)
- 🔗 유튜브 URL 직접 재생
- 🔄 YouTube처럼 자동으로 다음 곡 추천 재생
- 🎯 재생 기록 추적으로 중복 방지
- ⏹️ 재생 정지
- ⏭️ 다음 곡으로 스킵
- 🎤 현재 재생 중인 노래의 가사 표시 (Genius 지원)
- 📋 현재 재생 중인 곡 정보 확인
- 📋 재생 대기 목록 확인
- 🔄 자동재생 켜기/끄기

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
5. CLIENT_ID는 OAuth2 - General에서 확인

**권한 설정:**
- Bot 탭: `Send Messages`, `Connect`, `Speak` 권한 활성화
- OAuth2 - URL Generator: `bot`, `applications.commands` 선택
- 생성된 URL로 봇을 서버에 초대

**YouTube API Key:**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. "API 및 서비스" - "라이브러리"
4. "YouTube Data API v3" 검색 후 사용 설정
5. "사용자 인증 정보" - "API 키 만들기"

### 4. YouTube 쿠키 설정 (필수)

YouTube 403 에러 방지를 위해 쿠키 설정이 필요해요:

1. Chrome 확장 프로그램 설치: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. YouTube 로그인
3. 확장 프로그램 클릭 - "Export" 클릭
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

| 명령어 | 설명 |
|--------|------|
| `/재생 [노래 제목 또는 URL]` | 노래 재생 (즉시 재생) |
| `/정지` | 재생 중지 및 큐 비우기 |
| `/스킵` | 다음 곡으로 넘어가기 |
| `/가사` | 현재 재생 중인 노래의 가사 표시 |
| `/현재곡` | 현재 재생 중인 곡 정보 확인 |
| `/큐` | 재생 대기 목록 확인 |
| `/자동재생 [true/false]` | 자동재생 켜기/끄기 |

### 📖 사용 예시

```
/재생 스텔라 블레이드 OST
/재생 https://www.youtube.com/watch?v=abcd1234
/가사
/현재곡
/스킵
/자동재생 true
/큐
/정지
```

### 💡 주요 기능 설명

**🎵 음악 전용 필터링**
- YouTube Music 카테고리의 영상만 검색해요
- 뮤직비디오, 음원, 커버곡 등 음악 콘텐츠만 재생돼요
- 라이브 방송이나 토크쇼 같은 비음악 콘텐츠는 자동으로 제외돼요

**🔄 YouTube 스타일 자동재생**
- 곡이 끝나면 YouTube처럼 유사한 곡을 자동으로 추천해서 재생해요
- 발라드를 들으면 발라드가, 게임 OST를 들으면 게임 OST가 이어서 나와요
- 아티스트나 장르가 비슷한 곡을 지능적으로 추천해요
- `/자동재생 false`로 끌 수 있어요

**🎯 재생 기록 추적**
- 최근 20곡의 재생 기록을 저장해요
- 같은 곡이 반복되지 않도록 자동으로 제외해요
- 재생 기록이 가득 차면 자동으로 초기화돼요

**🎵 즉시 재생**
- `/재생` 명령어는 항상 즉시 재생돼요
- 재생 중에 다른 곡을 `/재생`하면 바로 전환돼요

**📋 큐 시스템**
- 자동재생은 큐에 쌓이지 않고 곡이 끝날 때마다 1곡씩 추천돼요
- 수동으로 여러 곡을 대기열에 추가하고 싶다면 추후 `/큐추가` 기능이 추가될 예정이에요

## 📁 프로젝트 구조

```
toribot/
├── src/
│   ├── config/
│   │   ├── env.js           # 환경변수 설정
│   │   └── commands.js      # 슬래시 커맨드 정의
│   ├── services/
│   │   ├── youtube.js       # YouTube API 관련
│   │   ├── lyrics.js        # 가사 검색
│   │   └── player.js        # 음악 재생 로직
│   ├── handlers/
│   │   └── commands.js      # 커맨드 핸들러
│   └── utils/
│       ├── logger.js        # 로깅 유틸
│       └── songParser.js    # 노래 제목 파싱
├── index.js                 # 메인 진입점
├── package.json
├── .env
├── cookies.txt
└── README.md
```

## 🏗️ 코드 구조

### 모듈화된 아키텍처

**config/** - 설정 파일
- `env.js`: 환경변수 관리
- `commands.js`: Discord 슬래시 커맨드 정의

**services/** - 핵심 비즈니스 로직
- `youtube.js`: YouTube API 검색, 추천 알고리즘
- `lyrics.js`: Genius API를 통한 가사 검색
- `player.js`: 오디오 스트리밍 및 재생 관리

**handlers/** - 이벤트 처리
- `commands.js`: Discord 커맨드 인터랙션 처리

**utils/** - 유틸리티 함수
- `logger.js`: 통합 로깅 시스템
- `songParser.js`: 노래 제목 파싱 및 정제

### 장점

1. **모듈화**: 기능별로 분리되어 유지보수 쉬움
2. **재사용성**: 각 함수를 다른 곳에서도 사용 가능
3. **테스트 용이**: 개별 모듈 단위 테스트 가능
4. **확장성**: 새 기능 추가 시 해당 모듈만 수정
5. **가독성**: 코드 구조가 명확함

## 🐛 문제 해결

### 403 Forbidden 에러
`cookies.txt` 파일을 추가하세요 (필수)

### "Cannot find module" 에러
`npm install` 다시 실행

### ERR_MODULE_NOT_FOUND 에러
- `src/config/commands.js` 파일명 확인 (command.js가 아님)
- 모든 파일이 올바른 위치에 있는지 확인

### 봇이 음성 채널에 들어오지만 소리가 안 나요
FFmpeg와 yt-dlp가 PATH에 설치되어 있는지 확인하세요

### opusscript 관련 에러
`npm install opusscript` 실행

### 가사를 찾을 수 없어요
주로 영어 노래나 Genius에 등록된 곡만 가사를 찾을 수 있어요

### 자동재생이 계속 같은 곡만 재생해요
재생 기록이 쌓이면 자동으로 다른 곡이 재생돼요. `/스킵`으로 넘어갈 수도 있어요

### 곡이 끝났는데 다음 곡이 자동으로 안 나와요
`/자동재생 true`가 활성화되어 있는지 확인하세요

### 음악이 아닌 영상이 재생돼요
최신 버전에서는 Music 카테고리 필터링이 적용되어 음악만 재생돼요

## 🔧 기술 스택

- **discord.js** - 디스코드 봇 프레임워크
- **@discordjs/voice** - 음성 재생
- **yt-dlp** - 유튜브 다운로드
- **FFmpeg** - 오디오 스트리밍
- **googleapis** - 유튜브 검색 및 추천 API
- **cheerio** - HTML 파싱 (가사 추출)
- **node-fetch** - HTTP 요청
- **opusscript** - 오디오 인코딩

## 📝 변경 이력

### v2.2.0 (2026-02-04)
- 🏗️ 코드 리팩토링 - 모듈화 아키텍처 적용
  - config, services, handlers, utils로 분리
  - 각 기능별 독립적인 모듈로 구성
  - 유지보수성 및 확장성 대폭 개선
- ✨ 통합 로깅 시스템 추가
- 📝 코드 가독성 향상

### v2.1.0 (2026-02-04)
- ✨ 음악 전용 필터링 추가 (Music 카테고리만)
- ✨ 재생 기록 추적 시스템 (최근 20곡)
- ✨ 라이브 방송 자동 제외
- 🐛 같은 곡이 반복 재생되는 문제 해결
- 🐛 음악이 아닌 영상이 재생되는 문제 해결
- 🎨 검색 알고리즘 개선 (아티스트/제목 기반)

### v2.0.0 (2026-02-04)
- ✨ YouTube 스타일 자동재생 추가
- ✨ 스킵 기능 추가 (`/스킵`)
- ✨ 큐 확인 기능 추가 (`/큐`)
- ✨ 자동재생 토글 기능 추가 (`/자동재생`)
- 🎨 검색 시 1곡만 재생 (큐에 쌓이지 않음)
- 🐛 큐가 계속 쌓이는 문제 해결

### v1.1.0 (2026-02-03)
- ✨ 가사 검색 기능 추가 (Genius 지원)
- ✨ 현재곡 정보 확인 기능 추가
- 🐛 재생 중 곡 전환 시 에러 수정
- 🐛 TimeoutNegativeWarning 해결

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

버그 리포트나 기능 제안은 Issues에 올려주세요!

## 🚧 예정된 기능

- [ ] 볼륨 조절 기능
- [ ] 반복 재생 기능
- [ ] 재생 기록 확인
- [ ] 큐에 곡 수동 추가 기능 (`/큐추가`)
- [ ] 플레이리스트 재생 기능
- [ ] 셔플 재생 기능
- [ ] 웹 대시보드
