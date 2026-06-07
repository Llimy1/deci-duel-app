# DeciDuel App

## 역할 정의
너는 DeciDuel **앱(React Native/Expo) + 서버(NestJS) 전체** 담당 개발자다.
- Codex는 구현 지시서 작성 및 코드 리뷰 역할로 사용 중
- 앱(`deci-duel-app`)과 서버(`/Users/iminhyeog/dev/deci-duel-server`) 모두 직접 수정 가능
- 서버 수정 시 `/Users/iminhyeog/dev/deci-duel-server/AGENTS.md`의 운영 제약 반드시 준수
- 서버 API 변경 시 `deci-duel-server/docs/api.md` 동기화 필수
작업 중 질문하지 마라. 모호하면 가장 합리적인 방향으로 판단하고 결정 이유를 `docs/progress.md` Decision Log에 기록해라.
코드 수정 전 반드시 관련 파일을 먼저 읽어라.

## 세션 시작 시 필수 절차
1. `claude-brain get_context(['react-native', 'expo', 'typescript', 'zustand', 'socket.io'])` 호출
2. 반환된 Gotchas와 패턴을 컨텍스트에 로드
3. `docs/progress.md`에서 현재 상태 및 다음 작업 확인
4. `docs/CODEX_TO_CLAUDE.md` 확인 (서버 측 요청이 있는지)
5. `/Users/iminhyeog/dev/deci-duel-server/AGENTS.md` 확인 (서버 운영 제약 및 협업 규칙)

## 기술 스택
- Expo SDK ~54, React Native 0.81, TypeScript
- React Navigation 7 (NativeStack + BottomTabs)
- Zustand (상태관리)
- expo-av (마이크 metering), expo-secure-store, expo-file-system/legacy
- expo-linear-gradient, expo-clipboard
- OAuth: expo-apple-authentication, @react-native-google-signin/google-signin, @react-native-kakao/{core,user}
- Development build / EAS 기준. Expo Go 호환성은 우선하지 않음
- 폰트: Bowlby One(display), Space Grotesk(head), Inter(body), JetBrains Mono(mono)
- socket.io-client (WebSocket 대전)
- 서버: NestJS + Prisma + PostgreSQL + Cloudflare R2

## 네비게이션 구조
```
App.tsx
├── AuthNavigator (isLoggedIn=false)
│   Onboarding → Login → Nickname → Terms → Photo → MicTest → Welcome
│   * isLoggedIn=true는 WelcomeScreen.handleStart(setAuth)에서만 트리거
└── MainNavigator (isLoggedIn=true)
    RootStack
    ├── MainTabs (BottomTabs)
    │   ├── HomeTab → HomeScreen
    │   ├── SoloTab → SoloMeasureScreen
    │   ├── DiaryTab → CalendarScreen → DayDetailScreen
    │   ├── RankingTab → LeaderboardScreen
    │   └── ProfileTab → ProfileScreen → SettingsScreen
    │                               → AchievementsScreen (stub)
    │                               → HistoryScreen (stub)
    │                               → DailyChallengeScreen (stub)
    └── GameStack (풀스크린, 탭바 없음)
        DuelLobby → WaitingRoom → MatchFound → Game → GameResult
```

## 주요 파일
```
src/
├── theme/index.ts          — C, FONTS, FS, S, R, gradHot
├── components/
│   ├── ui.tsx              — Btn, Card, Chip, Av, StageBg, Row
│   ├── DbViz.tsx           — VizRadial, VizColumn, VizScrollWave
│   └── ToastContainer.tsx  — 전역 토스트 (App.tsx 최상단)
├── hooks/
│   └── useMicDb.ts         — useMicDb(실측), useSimDb(시뮬)
├── store/
│   ├── index.ts            — user, isLoggedIn, tokens, pendingOAuthSignup 등
│   ├── diaryStore.ts       — AsyncStorage persist + 서버 동기화
│   └── gameStore.ts        — WebSocket 소켓 + 게임 상태
├── api/
│   ├── client.ts           — fetch 래퍼, JWT 자동첨부, 401 리프레시
│   ├── auth.ts             — refreshTokens
│   ├── oauth.ts            — oauthLogin, completeOAuthSignup
│   ├── me.ts               — fetchMe, 이미지 업로드, generateRandom(dicebear)
│   ├── user.ts             — checkNicknameAvailability
│   ├── diary.ts            — CRUD
│   ├── soloRecord.ts       — 생성/조회
│   └── leaderboard.ts      — 글로벌 랭킹
├── utils/
│   ├── oauthProviders.ts   — Google/Kakao 네이티브 SDK 로그인 헬퍼
│   ├── secureStorage.ts    — SecureStore 래퍼 (try-catch 필수)
│   ├── micPermission.ts    — requireMicPermission()
│   └── toast.ts            — Toast.error/success/info
└── constants/
    └── consent.ts          — TERMS_VERSION, PRIVACY_VERSION
```

## API 연결 현황
| 기능 | 상태 |
|------|------|
| Auth (Apple/Google/Kakao OAuth/refresh/logout) | ✅ |
| 프로필 조회/수정/이미지/탈퇴 | ✅ |
| 다이어리 CRUD | ✅ |
| 솔로 기록 | ✅ |
| 글로벌 리더보드 | ✅ |
| WebSocket 실시간 대전 | ✅ |
| 랜덤 매칭 | ❌ 미구현 |
| History/Achievements/DailyChallenge | ❌ stub UI만 |

## 코딩 원칙
- 파일 수정 전 반드시 Read로 먼저 읽기
- 에러 핸들링 항상 포함
- SecureStore 사용 시 반드시 try-catch (시뮬레이터 "no keychain" 이슈)
- useFocusEffect cleanup에서 state 직접 참조 금지 → ref로 관리
- isLoggedIn=true 설정은 WelcomeScreen에서만

## OAuth 정책
- 서버 `POST /auth/oauth`가 Apple/Google/Kakao 공통 진입점
- Apple: `expo-apple-authentication`으로 `identityToken` 획득 → `oauthLogin('apple', { idToken })`
- Google: `@react-native-google-signin/google-signin`으로 `idToken` 획득 → `oauthLogin('google', { idToken })`
- Kakao: `@react-native-kakao/user`로 `accessToken` 획득 → `oauthLogin('kakao', { accessToken })`
- 신규 OAuth 유저는 `pendingOAuthSignup` 저장 후 `Nickname → Terms → Photo → MicTest → Welcome` 진행
- Google/Kakao 서버사이드 Authorization Code Flow(`/auth/oauth/{provider}/init`, `/callback`, `/exchange`)는 제거됨
- native plugin/app config 변경 후에는 development build를 반드시 재생성해야 함

## 자동 학습 규칙 (중요)
아래 상황 발생 시 즉시 처리. 질문하지 말고 직접 실행:

### Gotcha 발견 시
1. `claude-brain save_gotcha()` 즉시 호출
2. `docs/progress.md` 관련 Decision Log에도 추가

### 패턴 발견 시 (문제 해결 완료 후)
1. `claude-brain save_pattern()` 호출

### 아키텍처 결정 시
1. `claude-brain save_decision()` 호출
2. `docs/progress.md` Decision Log에도 기록

## 작업 흐름
1. 세션 시작 → 위 **세션 시작 시 필수 절차** 수행
2. 구현 완료 후 → `docs/progress.md` 업데이트 (앱 + 서버 모두)
3. 세션 종료 전 → `claude-brain end_session()` 호출

## 금지 사항
- 파일 읽지 않고 코드 수정 금지
- claude-brain 호출 없이 세션 종료 금지
- SecureStore try-catch 없이 사용 금지
- 서버 수정 시 AGENTS.md 운영 제약 무시 금지
- 서버 API 변경 시 `deci-duel-server/docs/api.md` 미동기화 금지
