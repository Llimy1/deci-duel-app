# DeciDuel App 진행 상황

## 마지막 업데이트
2026-06-07

## 현재 상태
Apple/Google/Kakao OAuth를 전부 **네이티브 SDK 기반**으로 통일 완료 (Codex [14:14] "정정" 지시 반영 — 2026-06-06의 서버사이드 Authorization Code Flow 결정 폐기). 서버 `POST /auth/oauth`가 Apple/Google idToken, Kakao accessToken을 공통으로 검증하며 audience(`aud`) 검증을 추가했고, 앱은 `@react-native-google-signin/google-signin` + `@react-native-kakao/{core,user}`로 LoginScreen을 재작성했다 (`src/utils/oauthProviders.ts` 헬퍼 모듈 신규). 서버/앱 빌드·테스트 전부 통과 (서버 142/142, 앱 121/121). 다음 단계는 dev client 재빌드(`npx expo run:ios`/`run:android`) 후 실기기 E2E QA. Phase B(효과음/햅틱, 딥링크, i18n)는 OAuth QA 이후 진행한다.

## 완료된 작업

### Phase 1 — 기반 구축
- 전체 화면 UI 스켈레톤 (Auth + Main 탭 전체)
- Zustand 스토어 (user, session, game, diary)
- expo-av 기반 useMicDb (실시간 dB 측정)
- 폰트/테마/디자인 토큰 시스템

### Phase 2 — API 연결 + WebSocket 대전
- JWT 세션 관리 (SecureStore + Zustand + 401 리프레시 single-flight)
- Auth API 완전 연결 (devSignup/Login/Refresh/Logout)
- 프로필 API 완전 연결 (Me 조회/닉네임/아바타/이미지/탈퇴)
- 다이어리 CRUD 완전 연결 (로컬 AsyncStorage + 서버 동기화)
- 솔로 기록 완전 연결
- 글로벌 리더보드 완전 연결
- WebSocket 실시간 대전 완전 연결
  - 방 생성/참가/준비/라운드/재대결/재연결/방장 이전
  - gameStore.ts (Zustand + socket.io)
  - 게임 플로우 풀스크린 RootStack으로 분리

### Phase A — 정리/제거 (2026-05-31)
- Auth 플로우 재설계: Terms + MicTest 화면 추가, 약관 동의 devSignup 원자적 저장
- MicTestScreen, TermsScreen 신규 구현
- requireMicPermission() 유틸 추가, SoloMeasure + DuelLobby 적용
- ProfileScreen 승패/승률/연승 통계 UI 제거
- AchievementsScreen / HistoryScreen / DailyChallengeScreen → "준비 중" stub
- FriendsScreen 삭제
- MatchingScreen / Countdown / Measure / RoundBreak / Result 레거시 화면 삭제
- HomeScreen 데일리챌린지 카드 제거
- SecureStore try-catch 폴트 톨러런트 처리

## 완료된 작업 (2026-06-01 코드 리뷰 대응 — 세션 1)
- useMicDb start() → Promise<boolean> 반환, 실패 시 false
- diaryStore saveEntry 실패 시 낙관적 업데이트 롤백 + AsyncStorage 저장 스킵
- gameStore sendReady() → boolean 반환 (연결 안됐으면 false)
- MatchFoundScreen: sendReady() 성공 시에만 meReady=true, 상대 disconnect 배너 추가
- GameScreen: mic.start() 실패 시 Alert + 나가기 옵션, 상대 disconnect 배너 추가
- LoginScreen: 소셜 로그인 버튼 → "준비 중" Alert (navigate 제거)
- LeaderboardScreen: 에러 시 재시도 버튼, Av에 profileImageUrl 전달
- leaderboard.ts: LeaderboardEntry에 profileImageUrl 추가

## 완료된 작업 (2026-06-01 코드 리뷰 대응 — 세션 2)
- QuickLogSheet mic.start() guard: 실패 시 Toast.error + early return
- MicTestScreen mic.start() guard: 실패 시 Toast.error + early return
- GameScreen disconnectWasPositiveRef 패턴: waitSecs:0 vs 카운트다운 소진 구분해 배너 문구 정확화
- GameScreen mic 순차 시작: mic.start() 성공 확인 후 타이머 시작 (느린 기기 타이밍 정확화)
- MatchFoundScreen errorMessage → meReady 롤백 useEffect 추가
- gameStore room:reconnected: profileImageKey → profileImageUrl 통일, isHost/score/roundResults/opponent 전체 상태 복원
- 서버 game.gateway.spec.ts failing test 수정 (room:leave 후 재연결 → 새 방 만들기)
- 서버 reconnect payload 타입 assertion 추가 (profileImageUrl 포함 전체 필드 검증)
- docs/api.md room:reconnected full payload 및 profileImageUrl 필드 문서화
- 앱 테스트 인프라 구축: Jest + ts-jest, react-native/expo-* 모킹, `npm test`로 실행
- gameStore 단위 테스트 14개 — 전체 pass
  - room:reconnected: 상태 복원, currentRound 추론, draw 정규화, profileImageUrl 반영
  - connect: playing/countdown 상태 보호, connecting→idle, errorMessage 초기화
  - sendReady: 미연결 false, 연결 true + game:ready emit
  - opponent:disconnected/reconnected: disconnectedWaitSecs 갱신

## 완료된 작업 (2026-06-03 — Codex [23:45] mic warm-up 구현)
- `src/utils/gameMicController.ts` 신규: 순수 mic 수명주기 컨트롤러 (warmUp/waitForReady/cleanup)
- GameScreen countdown 진입 시 mic warm-up — round:start 전에 마이크 준비 완료
- GameScreen measuring 진입 시 mic.reset()만 호출 (재시작 없음, 서버 round:start 기준 타이머)
- GameScreen 라운드 사이 mic.stop() 제거 — gameOver/unmount useEffect에서만 cleanup()
- warm-up 진행 중 measuring 진입 시 waitForReady()로 완료까지 대기 (엣지케이스 처리)
- `src/utils/__tests__/gameMicController.test.ts` 신규: 14개 테스트 (warmUp 5 / waitForReady 6 / cleanup 3)
- 전체 테스트 28/28 pass (gameStore 14 + gameMicController 14)

## 완료된 작업 (2026-06-03 — Codex 리뷰 2차 4건 대응)
- isFailed() early-return 제거: measuring effect에서 `isFailed()` 시 silent fail 버그 수정 → waitForReady(false) 경로로 Alert+leaveRoom
- legacy window 보정: `windowStartedAt = round:start 수신 시점`. 대기시간이 elapsed에 포함 → 늦은 warm-up 시 full 5초 새로 주지 않음. remainingSeconds≤0 이면 즉시 실패
- officialMeasuring submit 시 종료: submitRound 직전 setOfficialMeasuring(false) → submit 이후 round:db 전송 중단
- prepareTimeoutMs 서버 값 연동: gameStore에 저장, preparing effect에서 `prepareTimeoutMs - 500` 동적 계산
- 테스트 47/47 pass (gameStore 25 + gameMicController 22)

## 완료된 작업 (2026-06-03 — Codex 리뷰 5건 대응)
- gameMicController 안전장치 추가
  - generation 토큰 → cleanup 이후 늦게 도착한 mic.start() resolve 무시 (cleanup race 해결)
  - waitForReady(timeoutMs) → 2500ms 내 미준비 시 false + status=failed (무기한 대기 방지)
  - cleanup 시 pending resolver를 false로 flush (매달린 promise 제거)
- GameScreen official measuring window 분리
  - `officialMeasuring` state: waitForReady → mic.reset → setOfficialMeasuring(true) 이후에만
    round:db 전송 / UI 라이브 dB / peak 노출 (warm-up 구간 dB 조기 전송 방지)
  - measuring cleanup에서 officialMeasuring=false로 리셋
- [23:49] 마이크 준비 handshake **앱 측 구현 완료** (구 서버 하위호환)
  - gameStore: `preparing` status, round:prepare/opponent:mic-ready/opponent:mic-error 핸들러,
    round:start durationMs 저장, sendMicReady/sendMicError 액션
  - GameScreen: preparing 진입 시 warmUp → waitForReady → sendMicReady/sendMicError,
    PreparingPhase compact UI, durationMs 기준 타이머
- 테스트 56개 전체 pass (gameStore 25 + gameMicController 22 + measureRound 9)

## 완료된 작업 (2026-06-03 — Codex 리뷰 2건 + API 예외처리 테스트)

### Codex 리뷰 2건 대응 (서버 — 게이트웨이)
- **양쪽 모두 미준비 시 임의 forfeit 버그 수정** (`find` → `filter`, 1명만 미준비일 때만 forfeit, 양쪽 다 미준비면 `cleanupRoom`)
- **preparing 중 재연결 시 round:prepare 재전송 추가** (`tryReconnect` 에서 `room.state === 'preparing'`이면 `round:prepare` 재전송)
- `ROUND_PREPARE_TIMEOUT_MS` 3000 → 8000으로 증가 (재시도 Alert 클릭 시간 확보)
- 서버 게이트웨이 통합테스트 32개 전체 pass

### GameScreen preparing mic 재시도 UX (앱)
- `attempt()` 재귀 패턴: mic 실패 시 Alert에 "재시도" + "나가기" 두 버튼 제공
- "재시도" 선택 시 `round:mic-error` 미전송, cleanup 후 `attempt()` 재호출
- "나가기" 선택 시에만 `sendMicError` → `leaveRoom` → `navigation.goBack()`
- `mounted` guard로 unmount 이후 Alert 콜백 무시

### API 예외처리 테스트 (앱 + 서버)
- 앱 `src/api/__tests__/client.test.ts` — 12개: Non-ok JSON/파싱불가/네트워크오류/401+no-refresh/401+refresh
- 앱 `src/api/__tests__/me.test.ts` — 8개: updateNickname 409, upload 400/413, fetchMe 404
- 앱 `src/api/__tests__/diary.test.ts` — 8개: create 400/409, get/update/delete 404
- 앱 `src/api/__tests__/auth.test.ts` — 8개: login 404/401, signup 409/400, skipAuth 검증
- 서버 `auth.controller.spec.ts` — id>20/pw>50/nick>12/termsVersion missing/privacyVersion missing → 400
- 서버 `user.controller.spec.ts` — nickname>12/file>5MB → 400/413
- 서버 `diary.controller.spec.ts` — emoji>2/comment>200/존재하지않는날짜/year범위 → 400 + `createDiary`에 `validateDateParam` 추가
- 앱 전체 테스트 **92개** pass (gameStore 25 + gameMicController 22 + measureRound 9 + API 36)

## 완료된 작업 (2026-06-03 — 서버 handshake 구현 + spec 통합테스트)
- **서버 round:prepare handshake 완전 구현**
  - `game.types.ts`: `GameState`에 `'preparing'` 추가, `GameRoom`에 `micReady`, `prepareTimer` 추가
  - `game-room.store.ts`: `createRoom`에 `micReady: new Map()`, `prepareTimer: null` 추가
  - `game.gateway.ts`:
    - `ROUND_PREPARE_TIMEOUT_MS = 3000`, `ROUND_CLIENT_DURATION_MS = 5000` 상수 추가
    - `startCountdown` 최종 단계 → `prepareRound` (기존 `startRound` 대체)
    - `prepareRound`: `round:prepare` broadcast + prepareTimer 시작 (timeout 시 미준비 플레이어 forfeit)
    - `doStartRound`: 양쪽 mic-ready 확인 후 `round:start` broadcast
    - `@SubscribeMessage('round:mic-ready')`: idempotent, 상대 알림, 양쪽 ready 시 doStartRound
    - `@SubscribeMessage('round:mic-error')`: 상대 알림, prepareTimer 취소, forfeit 처리
    - `cleanupRoom`, `resetGameData`, `room:leave` 에서 prepareTimer 정리
    - `reconnectStates`, `activeStates`에 `'preparing'` 포함
- `src/utils/measureRound.ts` 신규 (앱): GameScreen measuring effect 순수 함수 추출 (Node 테스트 가능)
- `src/utils/__tests__/measureRound.test.ts` 신규 (앱): 9개 통합 테스트
- **서버 `game.gateway.spec.ts` 전면 업데이트** — 30개 통합테스트 전체 pass
  - `startGame` helper: `game:ready` → `round:prepare` → `round:mic-ready` × 2 → `round:start` 흐름
  - 3-round `submitRound` helpers: 각 라운드마다 prepare 핸들링 포함
  - 신규 테스트 섹션 "round:prepare handshake" (5개):
    - payload 검증 (round, prepareTimeoutMs)
    - round:mic-error → opponent:mic-error + game:over forfeit win
    - prepare 타임아웃 → 미준비 플레이어 forfeit
    - round:mic-ready 중복 전송 → idempotent
    - 잘못된 round 번호 → 무시

## 완료된 작업 (2026-06-03 — Codex 최종 지시 대응 [21:10])

### Server: officialRoundStarted 기반 상태머신 재설계
- `GameRoom`에 `officialRoundStarted: boolean`, `prepareDeadlineAt: number | null` 추가
- `doStartRound()`: 첫 `round:start` emit 직전 `officialRoundStarted = true`
- `prepareRound()`: `prepareDeadlineAt = Date.now() + ROUND_PREPARE_TIMEOUT_MS` + `remainingPrepareTimeoutMs` payload 추가
- `resetGameData()`: 두 필드 초기화
- prepare timeout 콜백 재설계:
  - `length === 0`: stale timer guard (return)
  - `!officialRoundStarted && length >= 1`: `emitMatchPrepareFailed()` → room reset to ready
  - `officialRoundStarted && length === 1`: 기존 forfeit
  - `officialRoundStarted && length === 2`: `emitTechnicalAbort()` → draw + cleanupRoom
- `onRoundMicError()`: `!officialRoundStarted` → `emitMatchPrepareFailed`, 이후 → 기존 forfeit
- `onRoomLeave()`: `countdown/preparing && !officialRoundStarted` → setup cancel (WaitingRoom), `officialRoundStarted` → 기존 forfeit
- `tryReconnect()`: `prepareDeadlineAt` 기반 `remainingPrepareTimeoutMs` 계산 후 전달
- 신규 private `emitMatchPrepareFailed()`, `emitTechnicalAbort()` 메서드

### Server: `match:prepare-failed` 이벤트
- 공식 라운드 시작 전 준비 실패 → room을 `ready`로 reset + 양쪽에 `match:prepare-failed` emit
- `game:over`/전적 저장 없음
- payload: `{ reason, failedUserIds, round, retryable, resetTo, message }`

### Server: `validateDateParam()` 월 overflow 수정
- `month < 1 || month > 12 || day < 1 || day > 31` 빠른 guard 추가
- `getFullYear() / getMonth()+1 / getDate()` 3중 비교로 `2024-13-15`, `2024-00-15` 등 차단
- diary.controller.spec.ts에 overflow 테스트 3건 추가

### Server: 테스트 업데이트
- 기존 "양쪽 미준비" 테스트 → `match:prepare-failed` + room 유지로 수정
- 신규 `match:prepare-failed` 그룹 5개: 1명 timeout/2명 timeout/room:leave setup cancel/공식 라운드 후 forfeit 유지/공식 라운드 후 leave forfeit
- `docs/api.md`: WebSocket 계약 전면 업데이트 (round:prepare/mic-ready/mic-error/opponent:*/match:prepare-failed/round:start durationMs/room:leave 정책)

### App: `match:prepare-failed` 핸들러
- `gameStore`: `matchPrepareFailed/matchPrepareFailedMessage` 상태, `clearMatchPrepareFailed()` 액션
- `match:prepare-failed` handler: status=`matched` + 게임 상태 초기화, roomCode/opponent/isHost 유지
- `round:prepare` handler: `remainingPrepareTimeoutMs` 우선 사용 + `matchPrepareFailed` 초기화

### App: `GameScreen` 로직 수정
- `matchPrepareFailed` 감지 effect: mic cleanup → clearMatchPrepareFailed → Toast → `navigation.replace('MatchFound')`
- preparing "나가기" 버튼: `sendMicError()` 제거, `leaveRoom()` 만 호출
- `.gitignore`에 `.claude/` 추가

### 테스트
- 앱 96개 pass (gameStore +4: match:prepare-failed 그룹)
- 서버 139개 pass

## 완료된 작업 (2026-06-03 — 오프라인/네트워크 에러 처리)
- `@react-native-community/netinfo` 설치
- `src/utils/networkStatus.ts`: 싱글톤 리스너 → `getIsOnline()` 동기 조회 (API client용)
- `src/hooks/useNetworkStatus.ts`: React 훅 → `{ isOnline, isLoading }` 반환
- `src/components/OfflineBanner.tsx`: 절대 위치 배너, Animated spring/timing, 오프라인(빨간) + 재연결(초록) 2.5초 표시
- `App.tsx`: `OfflineBanner` 최상단 추가 (ToastContainer 위)
- `src/api/client.ts`: `request()` 시작 전 `getIsOnline()` 체크 → 오프라인 시 즉시 에러 (fetch 대기 없음)
- `jest.config.js` + `src/__mocks__/netinfo.ts`: netinfo 테스트 모킹 추가
- 전체 테스트 96개 pass

## 완료된 작업 (2026-06-04 — Codex [20:07+20:11] 대응)

### 최종 정책 (20:11 정정 기준)
- 친구방은 두 명 전용 일회성 방
- 상대 이탈 → "상대가 나갔습니다" + "새 방 만들기" / "홈으로" (자동 WaitingRoom 이동 X)
- GameResult: 정상 종료 + 상대 있음 → "다시 대결" / "홈으로", 포기전/이탈 → "새 방 만들기" / "홈으로"
- `room:wait-new-opponent` / `replacement_waiting` 미구현 (폐기)

### gameStore 변경
- `goToWaitingRoom` 제거 → `opponentLeft: boolean` (상대 이탈 트리거) + `matchSessionId: string | null` 추가
- `clearOpponentLeft()` 액션 추가
- `switchToNewRoom()` 액션: `room:leave` emit + 상태 초기화 + `room:create` emit (소켓 유지)
- `opponent:left` 핸들러: `opponentLeft: true, status: 'waiting'` (goToWaitingRoom 제거)
- `room:host_transferred` 핸들러: `opponentLeft: true, isHost: true` (goToWaitingRoom 제거)
- `room:joined` / `opponent:joined` / `rematch:matched`: `matchSessionId` 저장 (서버 미구현 시 null)
- `room:created` / `round:prepare` / `round:start`: `opponentLeft: false` 초기화

### 화면 변경
- **WaitingRoomScreen**: `opponentLeft=true` 시 "상대가 나갔습니다" UI 분기, "새 방 만들기" → `switchToNewRoom()`, "홈으로" → `leaveRoom() + popToTop()`
- **MatchFoundScreen**: `goToWaitingRoom` 효과 → `opponentLeft` 효과로 교체 (WaitingRoom의 상대이탈 UI로 navigate.replace)
- **GameScreen**: `opponentLeft` 효과 추가 — mic cleanup + `navigation.replace('WaitingRoom')` (countdown 중 이탈 케이스)
- **GameResultScreen**: `goToWaitingRoom` 효과 제거, `canRematch = !forfeit && !opponentLeft` 버튼 분기, "새 방 만들기" 버튼 추가

### 마이크 실패 Alert guard (필수 앱 테스트 6 대응)
- GameScreen preparing Alert "나가기" 버튼에 `if (!mounted) return` guard 추가
  - `match:prepare-failed`로 MatchFound로 이동한 뒤 Alert 클릭 시 stale `leaveRoom()` 호출 방지
- Alert 메시지에 "재시도해도 서버 대기 시간은 연장되지 않습니다" 문구 추가 (서버 deadline UX)

### 테스트
- `gameStore.test.ts` INITIAL_STATE_FIELDS: `goToWaitingRoom` → `opponentLeft`, `matchSessionId` 추가
- `opponent:left` 그룹 3개: opponentLeft=true / payload 없음 / clearOpponentLeft
- `room:host_transferred` 그룹 1개: opponentLeft=true + isHost
- `matchSessionId` 그룹 3개: room:joined / opponent:joined / null(구 서버)
- `match:prepare-failed` 그룹 +1: prepare-failed 후 opponentLeft는 false 유지 (방 고정)
- 앱 전체 테스트 **104개** pass

## 완료된 작업 (2026-06-04 — UI 버그 수정)
- **SoloMeasureScreen 상태 칩 정렬 수정**
  - `statusChip.justifyContent: 'flex-end'` → `'center'`
  - Chip 내부 View에 `justifyContent: 'flex-end'`가 전파되어 텍스트가 우측 끝에 몰리던 문제 해결
  - "대기" / "측정중" / "결과" 텍스트가 68px 칩 내에서 수평 중앙 정렬됨

## 완료된 작업 (2026-06-04 — 앱 아이콘 & 스플래시 디자인 교체)
- Claude Design 핸드오프 번들에서 최종 확정된 아이콘 4종 적용
- **마크 "DUEL D"**: 네온 그라디언트 D(핑크→퍼플→시안)의 카운터에 dB 파형 삽입, 왼쪽 시안/오른쪽 핑크로 VS 대결 암시, 중앙 가장 높은 옐로우→화이트 바로 마이크 캡슐 표현
- `assets/icon.png`: 1024×1024 opaque, iOS 앱 아이콘 (근블랙 #0a0612 배경 + 글로우)
- `assets/adaptive-icon.png`: 1024×1024 투명, Android adaptive icon foreground (safe area 66% 이내)
- `assets/splash-icon.png`: 1024×1024 투명, #0a0612 배경에 contain으로 표시
- `assets/favicon.png`: 64×64, 3바 단순화 — 16px에서도 식별 가능
- `app.json` 경로/backgroundColor 이미 정확히 설정돼 있어 별도 수정 없음

## 완료된 작업 (2026-06-05 — 스플래시 애니메이션 + iOS 빌드 수정)

### 스플래시 애니메이션 (SplashAnimation.tsx 신규)
- `src/components/SplashAnimation.tsx` 신규 생성
- Claude Design 핸드오프 HTML 스펙(--T: 5.4s) 그대로 React Native Animated API로 재현
- **D 마크 페이즈** (0 – 2160ms): scale 0.5→2.1(540ms) + hold(864ms) + scale/fade out(756ms)
- **워드마크 페이즈** (1620ms~): DECI(#ff6aa9) + DUEL(#4fe9ff), BowlbyOne 44px, fade+scale in 864ms → hold → fade out
- **태그라인 페이즈** (2700ms~): "소리쳐서 이겨라", JetBrainsMono 12px, slide up + fade in
- **언더라인 페이즈** (2700ms~): 핑크→시안 LinearGradient 150px, scaleX 0→1 spring
- **EQ 바**: 5개 바가 transform-origin center 기반 scaleY 0.55↔1.0 루프(1.15s 주기, stagger delay)
- `AnimatedRect` = `Animated.createAnimatedComponent(Rect)` — `useNativeDriver: false`로 SVG y/height 애니메이션
- 배경: SVG RadialGradient (퍼플@42%, 핑크@64%)
- `App.tsx`: `splashDone` state 추가, 폰트 로드 완료 후 SplashAnimation 재생, 5.4s 후 `onDone()` → 세션 복구 확인 → 앱 진입
- `assets/splash.png` (1290×2796 full-bleed): native splash screen 이미지 교체, `app.json` resizeMode cover

### iOS 빌드 수정 (`ld: framework 'React' not found`)
- **원인**: Expo SDK 54 / RN 0.81 New Arch가 prebuilt xcframework(`React.xcframework`)를 사용, `[CP] Copy XCFrameworks` 빌드 페이즈가 링크 전에 실행되지 않아 `XCFrameworkIntermediates/React-Core-prebuilt/React.framework` 누락
- **수정**: `ios/Podfile.properties.json`에 `"ios.buildReactNativeFromSource": "true"` 추가 → pod install 재실행
- Podfile이 `RCT_USE_PREBUILT_RNCORE` 세팅을 해제 → React Native를 xcframework 대신 소스에서 직접 컴파일
- `FRAMEWORK_SEARCH_PATHS`에서 `React-Core-prebuilt` 항목 제거 확인

## 정리된 작업 (2026-06-05 — OAuth 전 선행 작업 재검토)

### 1. 폰트 전체 통일
- 전체 23개 화면 파일 스캔 결과: fontFamily 누락 없음 ✅ (이미 완료 상태)

### 2. 화면 간 톤/분위기 일관성 QA
- Login/Home/Game 화면 시뮬레이터 확인: 다크 네온 (#0a0612) 일관 유지 ✅
- BowlbyOne 워드마크, EQ 파형 시각 요소, 소셜 버튼 계층 모두 톤 일치
- **의도적 유지**: 온보딩 화면은 게임 화면보다 약간 밝은 채도 → 신규 사용자 접근성 고려

### 3. 다이어리 이모지 다양화
- 사용자 결정에 따라 기존 7개 MOODS로 복구
- 이모지/비주얼 다양화는 Phase B에서 별도 UX 방향을 잡은 뒤 진행

### 4. 법적 문서/웹 페이지
- 임시 `docs/legal/terms.md`, `docs/legal/privacy.md` 초안은 삭제
- 약관/개인정보 페이지는 나중에 관리자 웹을 별도로 만든 뒤 연결

### 5. SettingsScreen 약관/개인정보 링크 연결
- GitHub 문서 임시 링크는 해제
- 관리자 웹 URL이 확정되면 SettingsScreen의 이용약관/개인정보처리방침 row에 연결

### 6. 앱 버전 표시
- SettingsScreen에 이미 구현됨 (`appJson.expo.version`) ✅

### 7. 로그아웃/회원탈퇴 QA + 버그 수정
- **버그 수정**: `store/index.ts` logout()에 `lastResult: null` 추가 (미초기화 버그)
- **버그 수정**: `SettingsScreen` handleLogout/handleDeleteAccount에 `disconnectSocket()` 추가
  - 게임 소켓 연결 중 로그아웃 시 소켓이 잔존하는 문제 해결
- `src/store/gameStore.ts` disconnectSocket() import해 logout 전 호출 보장

### 8. 마이크 권한 사전 안내 최종 점검
- Phase A에서 구현된 MicTestScreen + requireMicPermission() 유틸 확인 ✅
- DuelLobby/SoloMeasure 진입 전 권한 체크 정상 작동 확인 ✅
- "권한 없음" vs "열기 실패" UX 분기 gameMicController에서 처리 ✅

### 검증
- `npx tsc --noEmit`: 통과 ✅
- `npm test`: 104/104 ✅
- 시뮬레이터 (iPhone 16 Pro): 스플래시 → 로그인 화면 진입 확인 ✅

### OAuth 진행 원칙
- OAuth는 바로 구현하지 않고 먼저 설계 논의 후 진행
- 설계에서 확정할 것: Apple/Google/Kakao provider별 앱 플로우, 서버 callback/token 교환 방식, 기존 dev 계정과 사용자 병합 정책, 약관/마이크 권한 플로우 삽입 위치, 테스트 계정/QA 시나리오
- Phase B(효과음/햅틱, 딥링크, i18n)는 OAuth 설계/구현 이후 진행

## 완료된 작업 (2026-06-05 — 네이티브 스플래시 수정 + 로그아웃 버그 수정)

### 네이티브 스플래시 (LaunchScreen)
- **문제**: `expo prebuild --clean`이 `SplashScreenLegacy.imageset`에 구버전 1024×1024 아이콘 이미지를 생성, 앱 첫 실행 시 이상하게 늘어진 화면 노출
- **수정 1**: `app.json`의 `splash.image` / `resizeMode` 제거 → 네이티브 스플래시가 이미지 없이 `#0a0612` 단색 배경만 사용
- **수정 2**: 로컬 iOS `SplashScreen.storyboard`의 `SplashScreenLegacy` imageView/resource 참조 제거
- **수정 3**: 시뮬레이터 LaunchScreen 스냅샷 캐시 삭제 (`~/Library/Developer/CoreSimulator/.../Snapshots/com.anonymous.deciduelapp`)
- 재빌드 후 확인: 네이티브 스플래시 = 순수 어두운 배경(#0a0612) → SplashAnimation(D→DECI DUEL) 자연스럽게 이어짐

### Zustand 로그아웃 버그 수정
- `store/index.ts` `logout()` 에 `lastResult: null` 누락 → 재로그인 시 이전 게임 결과 잔존 문제 수정
- `SettingsScreen.tsx` `handleLogout()` / `handleDeleteAccount()` 에 `disconnectSocket()` 추가 → 게임 소켓 연결 중 로그아웃 시 소켓 잔존 방지

## 완료된 작업 (2026-06-05 — OAuth 전체 구현 + 회원탈퇴 개선)

### 회원탈퇴 개선
- **코드 수준 삭제 순서**: R2 profileImage → DiaryRecord.deleteMany → SoloRecord.deleteMany → User.delete
- **서버**: `user.repository.ts` `findProfileImageKey / deleteDiaryRecords / deleteSoloRecord` 추가
- **서버**: `user.service.ts` `deleteMe()` 4단계 순서 구현 (cascade 없이 코드 수준)
- **앱**: SettingsScreen 회원탈퇴 모달 텍스트 전체 중앙정렬 + ⚠ 이모지 `color: '#ff3b30'` 적용

### DB 마이그레이션 (데이터 보존)
- `prisma migrate dev` 대신 `prisma db execute --file`로 SQL 직접 실행 (22명 사용자 데이터 보존)
- `auth_provider` / `provider_id` 컬럼 추가, `dev_id` / `dev_password` 삭제
- `@@unique([authProvider, providerId])` 복합 유니크 제약 추가
- `prisma generate` 재실행 → `authProvider_providerId` composite key 생성

### 서버 OAuth 구현
- `jose` 라이브러리 기반 Apple/Google JWKS 검증, Kakao REST API 호출
- `POST /auth/oauth`: provider 토큰 검증 → 기존 유저: AuthTokenData / 신규 유저: signupToken(15min JWT)
- `POST /auth/oauth/signup`: signupToken 검증 → nickname/terms로 User 생성 + 토큰 발급
- `auth.controller.spec.ts` 전면 재작성 (13개 테스트) — `jest.mock('jose')` 호이스팅으로 ESM 문제 해결
- 서버 전체 테스트 **130/130** pass

### 앱 OAuth 구현
- `expo-apple-authentication`, `expo-auth-session`, `expo-web-browser` 설치
- `src/api/oauth.ts` 신규: `oauthLogin()` / `completeOAuthSignup()`
- `src/api/auth.ts`: devLogin/devSignup 제거, refreshTokens만 유지
- `src/store/index.ts`: `pendingDevCredentials` → `pendingOAuthSignup: { provider, signupToken } | null`
- `LoginScreen.tsx` 전면 재작성: Apple/Google/Kakao 소셜 로그인 버튼, provider별 loading 상태
- `PhotoScreen.tsx`: `pendingDevCredentials` → `pendingOAuthSignup`, `devSignup` → `completeOAuthSignup`
- `AuthNavigator.tsx` + `navigation/types.ts`: `DevSignup` 라우트 제거
- `DevSignupScreen.tsx` 삭제
- `auth.test.ts` 재작성: `oauthLogin` / `completeOAuthSignup` 테스트 8개
- 앱 전체 테스트 **103/103** pass (`npx tsc --noEmit` 통과)
- `.env`: OAuth 키 플레이스홀더 추가 (`EXPO_PUBLIC_GOOGLE_*`, `EXPO_PUBLIC_KAKAO_REST_API_KEY`)

### 미완료 (QA 필요)
- OAuth 클라이언트 ID / Kakao REST API 키 `.env`에 실제 값 입력 필요
- 실기기/시뮬레이터에서 Apple/Google/Kakao 로그인 E2E 테스트 필요
- 서버 재시작 (`npm run start:dev`)

## 완료된 작업 (2026-06-06 — 서버사이드 OAuth 전환 + UI 버그 수정)

### 서버사이드 OAuth (Kakao/Google)
- **설계**: Expo Go에서 앱사이드 OAuth 불가 → 서버가 Authorization Code Flow 처리
- **서버 `auth.service.ts`**: `pendingStates` / `pendingAuthCodes` Map 추가, `kakaoInitUrl` / `kakaoCallback` / `googleInitUrl` / `googleCallback` / `exchangeAuthCode` / `processOAuthUser` / `createOAuthState` / `consumeOAuthState` / `buildAuthCodeRedirect` 구현
  - State token CSRF 보호 (5분 TTL), auth code 1분 TTL, `ALLOWED_REDIRECT_SCHEMES` 검증
- **서버 `auth.controller.ts`**: `GET /auth/oauth/kakao/init` / `GET /auth/oauth/kakao/callback` / `GET /auth/oauth/google/init` / `GET /auth/oauth/google/callback` / `POST /auth/oauth/exchange` 추가
- **서버 `auth.request.ts`**: `ExchangeAuthCodeRequest { code: string }` 추가
- **앱 `api/oauth.ts`**: `exchangeAuthCode(code)` 함수 추가
- **앱 `LoginScreen.tsx`**: `expo-auth-session` 제거, `WebBrowser.openAuthSessionAsync` + `Linking.createURL('oauth/callback')` 패턴으로 handleKakao/handleGoogle 재구현. Apple은 `expo-apple-authentication` 네이티브 방식 유지

### Android 에뮬레이터 개발 환경
- `adb reverse tcp:3000 tcp:3000` — 에뮬레이터 `localhost:3000` → Mac `localhost:3000` 포워딩 (에뮬레이터 재부팅 시 재실행 필요)
- 에뮬레이터에서 `localhost` = 에뮬레이터 자신, Mac 접근은 `10.0.2.2` 또는 adb reverse 사용

### LeaderboardScreen 버그 수정
- `myRankNum` style `width: 52` → `minWidth: 52` + `numberOfLines={1}` 추가
- 두 자리 이상 순위(`#10`, `#100`)에서 줄바꿈 발생하던 문제 해결

## 완료된 작업 (2026-06-07 — Google/Kakao 네이티브 SDK 전환 + 서버 audience 검증)

Codex [2026-06-07 14:14] "정정 — Google/Kakao도 네이티브 SDK 기준으로 OAuth 전환" 지시 반영. 2026-06-06에 구현한 서버사이드 Authorization Code Flow(Kakao/Google)를 폐기하고, Apple과 동일하게 앱이 직접 idToken/accessToken을 획득해 `POST /auth/oauth`로 전달하는 방식으로 통일.

### 서버 (`deci-duel-server`)
- **`auth.service.ts`**: `pendingStates`/`pendingAuthCodes` Map과 `kakaoInitUrl`/`kakaoCallback`/`googleInitUrl`/`googleCallback`/`exchangeAuthCode`/`createOAuthState`/`consumeOAuthState`/`buildAuthCodeRedirect`/`ALLOWED_REDIRECT_SCHEMES` 전부 제거
- **audience(`aud`) 검증 추가**: `assertAudienceAllowed()` 헬퍼 신설 — `APPLE_ALLOWED_AUDIENCES`/`GOOGLE_ALLOWED_CLIENT_IDS`(콤마 구분 allowlist) 환경변수 기준으로 `aud` claim 검증, 미설정 시 검증 스킵(개발 편의, 프로덕션 전 필수 설정)
- **`verifyOAuthToken` 분기 강화**: provider별 필수 토큰 누락 시 명시적 400 (`OAUTH_TOKEN_REQUIRED`) — Apple/Google은 idToken, Kakao는 accessToken
- **`auth.controller.ts`**: `kakaoInit`/`kakaoCallback`/`exchangeAuthCode`/`googleInit`/`googleCallback` 엔드포인트 제거. `POST /auth/oauth`(통합 진입점)/`POST /auth/oauth/signup`/`refresh`/`logout`만 유지
- **`auth.request.ts`**: `ExchangeAuthCodeRequest` DTO 제거
- **`auth.service.spec.ts` 신규**: provider별 토큰 누락(400), Apple/Google audience mismatch(401)·match·env-미설정 스킵, Kakao 검증 실패(401: non-2xx/네트워크 오류/`id` 누락) 등 12개 테스트 추가
- **`.env.example`**: `KAKAO_CLIENT_ID/SECRET/REDIRECT_URI`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` 제거 → `APPLE_ALLOWED_AUDIENCES`/`GOOGLE_ALLOWED_CLIENT_IDS` 추가 (Kakao는 REST 키 불필요 — accessToken을 그대로 Bearer 전달해 검증)
- **`docs/api.md`**: 기존 server-side OAuth 엔드포인트를 "DEPRECATED & REMOVED"로 명시, `POST /auth/oauth` 통합 스펙(요청/응답/에러코드/audience 검증) 전면 재작성
- 검증: `npx tsc --noEmit` 통과, `npx jest src/auth` 25/25, 전체 `npx jest --runInBand` **142/142 통과**

### 앱 (`deci-duel-app`)
- **패키지 추가**: `@react-native-google-signin/google-signin`, `@react-native-kakao/{core,user}`, `expo-build-properties` (+ 기존 `expo-dev-client`, `eas.json` 재사용)
- **`app.config.ts` plugins 구성**: `@react-native-google-signin/google-signin`(`iosUrlScheme: com.googleusercontent.apps.<iOS Client ID prefix>`), `@react-native-kakao/core`(`nativeAppKey`, `android.authCodeHandlerActivity`, `ios.handleKakaoOpenUrl`), `expo-build-properties`
- **`src/utils/oauthProviders.ts` 신규**: `signInWithGoogleNative()`/`signInWithKakaoNative()` — 각각 idToken/accessToken만 반환. `GoogleSignin.configure()`/`initializeKakaoSDK()`를 모듈 내부에서 idempotent 1회 lazy 초기화. `OAuthCancelledError`(취소)/`OAuthProviderError`(실패) 구분으로 LoginScreen의 Toast 분기를 단순화
- **`LoginScreen.tsx`**: `handleGoogle`/`handleKakao`를 `WebBrowser.openAuthSessionAsync` + `Linking` 패턴에서 `signInWithGoogleNative`/`signInWithKakaoNative` 직접 호출로 교체. `expo-web-browser`/`expo-linking`/`WebBrowser.maybeCompleteAuthSession()` 제거. 취소는 `instanceof OAuthCancelledError`로 판별해 Toast 미노출
- **`src/api/oauth.ts`**: `exchangeAuthCode()` 제거 (`oauthLogin`/`completeOAuthSignup`만 유지)
- **`src/utils/__tests__/oauthProviders.test.ts` 신규**: idToken/accessToken 누락, 사용자 취소(Toast 미노출 신호), Google `PLAY_SERVICES_NOT_AVAILABLE`, Kakao 카카오톡 미설치/일반 SDK 오류 등 10개 테스트 — 네이티브 SDK는 `jest.mock`으로 대체
- 검증: `npx tsc --noEmit` 통과, `npx jest --runInBand` **121/121 통과**

## 진행 중인 작업
- **dev client 재빌드 필요**: 네이티브 설정(`app.config.ts` plugins) 변경으로 `npx expo run:ios` / `npx expo run:android` 재실행 후 실기기 OAuth E2E QA
- Apple Sign In: 개발 빌드 환경에서 테스트 필요 (네이티브 SDK 전환과 무관하게 기존 유지)
- `docs/CLAUDE_TO_CODEX.md`에 완료 보고 작성 예정 (Codex "완료 보고" 체크리스트 기준)
- Phase B 앱 완성도(효과음/햅틱, 딥링크, i18n)는 OAuth QA 이후 진행

## 출시 전 작업 로드맵

### Phase B — 앱 완성도
- [ ] i18n 다국어 지원 (한국어/영어)
  - `i18next` + `react-i18next` + `expo-localization`
  - 기기 언어 자동 감지 + 설정에서 수동 변경
- [x] 폰트 전체 통일 (전체 23개 화면 스캔 완료 — fontFamily 누락 없음)
- [x] 화면 간 톤/분위기 일관성 정리 (다크 네온 #0a0612 전체 일관 확인)
- [ ] 이모지/비주얼 다양화 — 기존 7개 MOODS 유지, Phase B에서 별도 진행
- [ ] 효과음 (카운트다운 3-2-1, 라운드 승/패)
  - 배경음악은 dB 측정에 영향 → 미포함 결정
- [ ] 햅틱 (카운트다운, 게임 시작, 라운드 결과)
- [ ] 딥링크 (방코드 공유 → 앱 자동 실행 + 코드 자동 입력)
- [x] 오프라인/네트워크 에러 처리

### Phase C — 법적/배포 준비
- [ ] 개인정보처리방침 / 이용약관 페이지 (관리자 웹에서 별도 구현 후 연결)
- [ ] SettingsScreen 약관/개인정보 링크 연결 (관리자 웹 URL 확정 후 연결)
- [x] 버전 표시 (Constants.expoConfig.version 연동)
- [x] 로그아웃/회원탈퇴 QA (lastResult null 버그 수정, disconnectSocket 추가)
- [x] 앱 아이콘 & 스플래시 실제 디자인 교체

### Phase D — 배포
- [ ] OAuth 설계 논의 후 구현 (Apple 필수 + Google + 카카오)
  - EAS/TestFlight 단계까지는 개발자 로그인 유지
- [ ] Google AdMob 연동
  - 배너: 홈, 리더보드, 프로필
  - 전면: 게임 결과 이후
  - 측정 중/게임 중 광고 배제
- [ ] EAS 빌드 + TestFlight 배포

## 랜덤 매칭 이후 (나중에)
- GameRecord 테이블 + 매치 히스토리
- HistoryScreen 실데이터 연결
- AchievementsScreen 업적 시스템
- Matchmaking Queue (랜덤 매칭)
- wins/losses/streak 자동 계산 재도입

## 다음 세션 시작 시 할 일
1. `claude-brain get_context(['react-native', 'expo', 'typescript', 'zustand', 'socket.io'])` 호출
2. `docs/progress.md` Phase B 체크리스트 확인
3. `docs/CODEX_TO_CLAUDE.md` 서버 측 요청 확인

## Decision Log
| 날짜 | 결정 내용 | 이유 |
|------|-----------|------|
| 2026-06-13 | 다이어리 기록 시트(CalendarScreen 상세/수정, QuickLogSheet resultMode) 전면 리디자인: "사운드 웨이브 시그니처 밴드"(`VizSignatureWave`, `DbViz.tsx`) + "[이모지] [dB] dB" 한 줄 헤더 + 저널 스타일(테두리 없는, line-height 1.85) 코멘트. 코멘트 길이 제한 15자 → 200자(`MAX_COMMENT`)로 확대. 무드는 기존 7종 + `rn-emoji-keyboard`로 커스텀 이모지 선택 가능(`MoodPicker.tsx`의 `MoodRow`, "+" 칩) | "오늘의 일기"처럼 더 긴 코멘트를 쓸 수 있게 해달라는 요청에 맞춰, 기존 박스형 코멘트 UI는 긴 텍스트에 어색했음. dB 측정이라는 앱의 핵심 정체성을 살린 웨이브 밴드를 다이어리만의 시각적 요소로 추가. `VizSignatureWave`는 `seed`(날짜)+`db` 기반 결정론적 시드 난수로 막대 높이를 생성해 같은 항목은 항상 같은 파형을 그림(피크 막대는 점선으로 표시). DayDetailScreen(현재 라우트에 남아있으나 CalendarScreen은 모달 시트를 사용해 실질적으로 미접근)도 일관성을 위해 200자+멀티라인으로 최소 변경 |
| 2026-06-13 | [서버] `CreateDiaryRequest`/`UpdateDiaryRequest`의 `emoji` 필드 `@MaxLength(2)` → `@MaxLength(16)` | 커스텀 이모지 선택(skin tone, ZWJ 시퀀스, 국기 등 복합 이모지)은 유니코드 코드포인트 기준 2자를 초과할 수 있음. `mood: string`은 계속 리터럴 유니코드 이모지 문자를 저장(포맷 변경 없음), DB 컬럼(`emoji String`)에 길이 제약 없어 마이그레이션 불필요. `docs/api.md`에 emoji(16자)/comment(200자) 검증 규칙 명시 |
| 2026-06-11 | App Store 6.5" 스크린샷(1242x2688) 5장을 HTML/CSS+Playwright로 제작 | 신규 시뮬레이터 빌드+실캡처 대신, 앱 디자인 시스템(C/FONTS/gradHot)을 그대로 재현한 마케팅용 데모 이미지를 빠르게 생성. `app-store-assets/screenshots/source.html`+`capture.js`로 1242x2688 JPG 5장(Home/SoloMeasure/Duel/Leaderboard/Diary) 출력 |
| 2026-06-11 | [서버] 닉네임 비속어/금칙어 필터 추가 (`completeOAuthSignup`, `updateNickname`) | App Store Age Rating 심사에서 "User-Generated Content=Yes"(닉네임이 리더보드/대전 등에서 다른 유저에게 노출됨)로 답할 경우, 비속어 필터가 없으면 "Profanity or Crude Humor"를 "None"으로 답하기 어려움. 외부 npm 패키지는 가용성/품질을 검증할 수 없어, `deci-duel-server/src/common/validation/profanity-filter.ts`에 한글+영문 금칙어 목록과 leetspeak 정규화를 적용한 자체 wordlist 필터를 신규 구현. 닉네임 패턴/길이 검증 이후, 중복 검사 이전에 적용. `UserExceptionMessage.NICKNAME_CONTAINS_PROFANITY` 추가, `docs/api.md`에 두 엔드포인트 에러 케이스 추가(append). 앱 측 코드 변경 불필요 — 기존 400 에러 핸들링으로 메시지 그대로 노출됨 |
| 2026-05-31 | isLoggedIn=true 트리거를 WelcomeScreen.handleStart로 이연 | Photo/MicTest가 auth 네비게이터 안에서 정상 노출되어야 함 |
| 2026-05-31 | 약관 동의 데이터를 UserConsent 별도 테이블 대신 User 컬럼으로 | 현재 규모에서 단일 버전으로 충분. devSignup 1회 INSERT로 원자적 처리 |
| 2026-05-31 | 약관 버전을 네비게이션 params로 전달 (Terms → Photo) | 일시적 데이터를 스토어에 넣으면 로그아웃 후 잔존 위험 |
| 2026-05-31 | SecureStore 전체 try-catch 처리 | iOS 시뮬레이터 "no keychain" 에러로 signup 실패. 토큰은 Zustand 메모리에도 있어 세션 유지 가능 |
| 2026-05-30 | 게임 플로우를 RootStack 풀스크린으로 분리 | 탭바가 게임 중 사라졌다 생기는 이질감 제거 |
| 2026-05-30 | 배경음악 미포함 | dB 측정 게임 특성상 배경음이 측정값에 영향 |
| 2026-05-30 | useMicDb start deps=[] + hasPermissionRef 패턴 | Android에서 권한 granted → start 재생성 → Maximum update depth. ref로 안정화 |
| 2026-05-30 | HistoryScreen/AchievementsScreen 초기 제거 | GameRecord 미구현. 빈 화면은 UX 저하. 랜덤 매칭 때 함께 추가 |
| 2026-05-30 | isFocusedRef (useFocusEffect 기반) | iOS에서 Modal 열린 상태에 navigation.isFocused()가 false 반환 |
| 2026-05-30 | mountedFinalResult useRef 패턴 | MatchFoundScreen 마운트 시 stale finalResult로 즉시 navigate 방지 |
| 2026-05-30 | hasNavigatedAway ref 패턴 3개 화면 | Android 백버튼/iOS 스와이프 백이 leaveRoom() bypass 방지 |
| 2026-06-01 | mic.start() → Promise<boolean>, 전 호출부 가드 추가 | 실패 시 측정 상태 진입 차단, 사용자 안내 |
| 2026-06-01 | GameScreen micFailed flag로 submitRound 차단 | 0dB 라운드 제출 방지, Alert "나가기" 단일화 |
| 2026-06-01 | disconnectWasPositiveRef 패턴 | waitSecs:0과 카운트다운 소진을 구분해 banner 문구 정확화 |
| 2026-06-01 | room:reconnected payload 전체 복원 | roomCode + currentRound만 복원하던 것 → isHost/score/rounds/opponent 포함 |
| 2026-06-01 | connect 이벤트 status 복원 조건부 | 재연결 시 진행 중인 게임 상태를 idle로 덮어쓰지 않음 |
| 2026-06-01 | MatchFoundScreen errorMessage → meReady 롤백 | sendReady 후 서버 error 이벤트에 meReady 자동 복귀 |
| 2026-06-01 | GameScreen mic 순차 시작 | mic.start() 성공 후 타이머 시작. 느린 기기에서 실제 녹음 전 시간이 라운드에 포함되는 문제 해결. UX 허용 범위 결정 |
| 2026-06-01 | 앱 테스트 인프라 추가 | Jest + ts-jest. gameStore socket 이벤트 상태 전환 14개 테스트. `npm test`로 실행 |
| 2026-06-01 | room:reconnected profileImageUrl 통일 | 서버 동기화. room:joined/opponent:joined와 계약 일치 |
| 2026-06-03 | GameScreen mic warm-up 패턴 도입 | countdown 중 mic.start() 미리 실행, round:start 시 reset()만 호출. 라운드 2+에서 stop/start 지연 제거, 서버 window 기준 타이머 동기화 |
| 2026-06-03 | gameMicController 분리 | 순수 TS 컨트롤러로 추출 → Jest 단위 테스트 가능, React 의존 없음 |
| 2026-06-03 | gameMicController generation 토큰 | cleanup 이후 늦은 mic.start() resolve가 status를 ready로 되돌리는 race 방지 |
| 2026-06-03 | waitForReady timeout(2500ms) | mic.start가 무한 pending일 때 measuring이 멈추는 문제 방지. 서버 prepare timeout(3000)보다 짧게 |
| 2026-06-03 | officialMeasuring state 도입 | phase.type==='measuring'만으로 공식 측정 판단 시 warm-up dB가 조기 전송됨. reset 이후로 게이팅 |
| 2026-06-03 | handshake 앱 측만 구현 + 서버 요청 분리 | CLAUDE.md "서버 코드 직접 수정 금지" 준수. 앱은 하위호환(preparing 미수신 시 기존 흐름), 서버 계약은 CODEX_TO_CLAUDE.md에 요청 |
| 2026-06-03 | round:start durationMs 저장 | 서버 기준 측정 window 길이를 앱이 따르도록. 구 서버(durationMs 없음)는 5000 기본값 |
| 2026-06-03 | windowStartedAt = round:start 수신시점 | 늦은 warm-up 시 full 5초 재시작 → 서버 5.5s hard close 후 late submit 가능. enteredAt 기준으로 타이머 시작 |
| 2026-06-03 | officialMeasuring submit 직전 false | submit 후에도 round:db가 계속 전송되는 문제. submitRound 직전에 off |
| 2026-06-03 | prepareTimeoutMs 동적 연동 | 서버 계약 준수. 앱이 항상 2500 고정이면 서버 timeout보다 늦게 실패할 수 있음 |
| 2026-06-03 | isFailed early-return 제거 | countdown 중 warm-up 실패 후 playing 진입 시 Alert 없이 라운드가 멈추는 silent fail 방지 |
| 2026-06-03 | prepare timeout 3000 → 8000ms | 재시도 Alert 클릭 + cleanup + warmUp 재실행에 물리적 시간 필요. 3초는 사람이 Alert 읽기도 전에 서버 timeout |
| 2026-06-03 | preparing mic 재시도 attempt() 패턴 | 단순 Alert "나가기"만 있으면 일시적 mic 오류로 강제 퇴장. 재시도 선택 시 mic-error 미전송으로 서버 forfeit 방지 |
| 2026-06-03 | API 예외처리 테스트 앱 4파일 신규 | client/me/diary/auth fetch 에러경로 검증. mock fetch로 순수 단위 테스트, 실서버 의존 없음 |
| 2026-06-03 | officialRoundStarted 도입 | 첫 round:start 이전/이후를 구분해 준비 실패 정책 분기. 첫 라운드 전 실패는 승패 없는 setup cancel |
| 2026-06-03 | match:prepare-failed 이벤트 도입 | 공식 라운드 전 mic 준비 실패 → room reset to ready, game:over 없음, 양쪽 MatchFound 복귀 |
| 2026-06-03 | officialRoundStarted && 2명 타임아웃 → technical abort | 임의 승패 금지. draw forfeit로 양쪽 처리 후 cleanupRoom |
| 2026-06-03 | room:leave 공식 전 setup cancel | countdown/preparing + !officialRoundStarted 이탈은 forfeit 아님. 남은 플레이어 WaitingRoom |
| 2026-06-03 | 나가기 버튼에서 sendMicError 제거 | 명시적 이탈은 room:leave로만 처리. retry 실패마다 mic-error 미전송 정책 준수 |
| 2026-06-03 | matchPrepareFailed GameScreen effect | 서버 match:prepare-failed 수신 시 GameScreen이 MatchFound로 replace. stale finalResult로 GameResult 진입 방지 |
| 2026-06-03 | prepareDeadlineAt + remainingPrepareTimeoutMs | 재연결 시 남은 prepare 시간을 정확히 전달. app은 실제 남은 시간 기준으로 attempt |
| 2026-06-05 | `ios.buildReactNativeFromSource: true` | Expo SDK 54 + RN 0.81 New Arch에서 prebuilt xcframework 링크 오류. `[CP] Copy XCFrameworks` 빌드 페이즈가 링크 전에 미실행. 소스 빌드 전환으로 해결 |
| 2026-06-05 | SplashAnimation useNativeDriver 분리 | SVG y/height 애니메이션은 `useNativeDriver: false` 필수 (Layout 속성). opacity/transform은 `true`. AnimatedRect = Animated.createAnimatedComponent(Rect) |
| 2026-06-05 | EQ 바 transform-origin center 에뮬레이션 | CSS `transform-origin: center`를 RN에서 재현: cy = y + h/2 계산 후 y/height 양쪽 interpolate. scaleY 대신 절대값 사용 |
| 2026-06-10 | ui-ux-pro-max 전체 화면 QA + 일괄 수정 | 21개 화면(min/medium/max) 코드 리뷰 후 발견된 이슈를 한 번에 수정: CalendarScreen editMoodChip 40→44px(터치 타겟 CRITICAL), MicTestScreen ⚠️/🔒 이모지 → Ionicons SVG 아이콘(no-emoji-icons), WaitingRoomScreen copyBtn 38→44px + hitSlop, LoginScreen terms 안내문 paddingHorizontal 제거(SE에서 "다." 단독 줄바꿈 방지), SoloMeasureScreen waveHeight compact 0.22→0.3 (cap 170→200, SE에서 파형 영역 빈 공간 축소). LoginScreen DECIDUEL 줄바꿈은 의도된 디자인으로 무효 처리. Leaderboard/WaitingRoom/MatchFound/GameScreen/Achievements/History/DailyChallenge의 장식용 이모지(🏆👑🚪📡🎖️⚡)는 빈 상태/배너 일러스트로 기능 아이콘이 아니라 보류 |
| 2026-06-11 | oauthProviders.ts dynamic env access → static literal | TestFlight에서 Google/Kakao 로그인 시 "설정이 누락되었습니다" 토스트. `process.env[name]`(동적 접근)은 babel-plugin-transform-inline-environment-variables가 인라이닝하지 못해 프로덕션 번들에서 항상 undefined. EAS production env에는 값이 정상 존재(`eas env:list production` 확인). `process.env.EXPO_PUBLIC_XXX` 정적 멤버 접근으로 변경 |
| 2026-06-11 | PhotoScreen에서 saveTokens(SecureStore) 제거, WelcomeScreen.handleStart로 이연 | TestFlight에서 마이크 권한 화면 도중 설정 앱 이동 후 복귀 시 스플래시 → 바로 로그인 상태로 진입(MicTest/Welcome 스킵). 원인: PhotoScreen.ensureAccountSession()이 SecureStore에 토큰을 미리 저장 → 앱 재시작 시 App.tsx restoreAuth()가 이 토큰으로 isLoggedIn=true 설정. SecureStore 저장을 온보딩 완료(Welcome) 시점으로 이연. 앱이 온보딩 도중 재시작되면 SecureStore에 토큰이 없어 다시 로그인 화면으로 — 기존 계정은 OAuth 로그인 시 서버가 isNewUser=false로 기존 토큰 발급해 정상 진입 |
| 2026-06-11 | expo-audio 도입 (마이크 권한 확인/요청 전용) | TestFlight에서 마이크 권한을 허용해도 MicTestScreen의 permStatus가 'denied'로 고정. 원인: expo-av(`Audio.getPermissionsAsync`/`requestPermissionsAsync`)는 iOS 17+에서 deprecated된 `AVAudioSession.recordPermission`을 사용해 권한 변경 후 stale 값을 반환. `expo-audio`의 `getRecordingPermissionsAsync`/`requestRecordingPermissionsAsync`(AVAudioApplication 기반)로 권한 확인/요청만 교체. 실제 녹음/미터링(`Audio.Recording`)은 expo-av 유지. MicTestScreen, useMicDb, micPermission.ts 적용. app.config.ts에 'expo-audio' 플러그인 추가 — **다음 EAS 빌드(prebuild) 필요** |
| 2026-06-11 | AdMob ATT(App Tracking Transparency) + SKAdNetworkItems 추가 | TestFlight에서 배너 광고가 전혀 노출되지 않음. AdMob 환경변수/유닛ID/배치 코드는 모두 정상(EAS production env 확인됨). iOS에서 ATT 동의 흐름과 SKAdNetworkItems 없이는 비개인화 광고 fill이 매우 낮거나 0에 가까울 수 있음 + Apple 정책상 IDFA 기반 광고 SDK는 ATT 프롬프트 필수. `expo-tracking-transparency` 추가 + App.tsx에서 `requestTrackingPermissionsAsync()` 후 `mobileAds().initialize()`. app.config.ts의 `react-native-google-mobile-ads` 플러그인에 Google 공식 SKAdNetworkItems(50개) 추가 — **다음 EAS 빌드(prebuild) 필요**. 그래도 광고가 안 뜨면 AdMob 콘솔에서 새 광고 단위 fill 지연(24~48h)/앱 검수 상태 확인 필요 |
| 2026-06-11 | PhotoScreen에서 계정 생성 직후 ONBOARDING_KEY=true 기록 + MicTestScreen에 AppState 권한 재확인 추가 (이후 행에서 일부 되돌림) | Issue #3 후속 보완. 기존 수정으로 "온보딩 도중 토큰이 미리 저장되어 잘못 isLoggedIn=true 되는" 문제는 해결했지만, MicTest 화면에서 설정 앱으로 나갔다 올 때 iOS가 메모리 회수로 앱을 재시작(스플래시 재생)하면 hasOnboarded=false라서 AuthNavigator가 Onboarding 인트로 화면(맨 처음)으로 돌아가는 문제가 남아있었음. completeOAuthSignup 성공 직후(PhotoScreen) ONBOARDING_KEY를 true로 저장해두면, 재시작 시 AuthNavigator가 Login 화면으로 진입 → 같은 OAuth 버튼 재탭 시 서버가 isNewUser:false로 인식해 즉시 로그인되어 홈으로 이동(닉네임/아바타는 fetchMeWithRetry로 복원). 또한 앱이 재시작되지 않고 background→active로만 전환되는 경우 useFocusEffect가 재실행되지 않아 마이크 권한 상태가 갱신되지 않으므로, AppState 'active' 리스너로 getRecordingPermissionsAsync()를 다시 호출하도록 MicTestScreen에 추가 |
| 2026-06-11 | Issue #3 관련 PhotoScreen/WelcomeScreen 수정을 모두 원복 (saveTokens는 다시 PhotoScreen.ensureAccountSession에서 즉시 호출, ONBOARDING_KEY 추가 로직 제거, WelcomeScreen.handleStart 동기 함수로 복귀) | 사용자 재검토 결과: MicTest 화면에서 설정 앱으로 갔다가 마이크 권한을 켜고 돌아왔을 때, 앱이 재시작되며 SecureStore에 저장된 토큰으로 바로 로그인되어 홈으로 이동하는 것은 — 이미 completeOAuthSignup으로 계정/닉네임/프로필사진까지 서버에 저장된 상태이고 fetchMeWithRetry가 프로필을 복원하므로 — 문제가 아니라 정상/허용 가능한 동작으로 판단. 따라서 Issue #3을 별도 네비게이션 변경으로 막을 필요가 없다고 결론. Issue #2(마이크 권한 상태 갱신: expo-audio 도입 + MicTestScreen AppState 'active' 리스너로 getRecordingPermissionsAsync 재호출)만 유지 |
| 2026-06-11 | expo-asset 설치 + app.config.ts plugins에 'expo-asset' 추가, npx expo-doctor 17/17 통과 확인 | expo-doctor 실행 결과 expo-audio의 필수 peer dependency인 expo-asset 누락 및 그로 인한 expo-constants/expo-asset 중복 설치 경고 발견. `npx expo install expo-asset`으로 설치 후 plugins 배열 맨 앞에 'expo-asset' 추가(옵션 없음, app.plugin.js 존재 확인). 재실행 결과 17/17 통과, tsc --noEmit 클린. EAS 프로덕션 빌드 전 최종 설정 점검 완료 |
| 2026-06-10 | SoloMeasureScreen waveHeight 0.3/200 → 0.22/170 되돌림 | 위 QA에서 늘린 waveHeight(+53px)가 iPhone SE(667h)에서 vizSection의 flex 높이를 초과해 dbRow("측정 시작 버튼을 눌러주세요")가 아래 statsRow("최대" StatBox)와 겹치는 회귀 발생(실기기 스크린샷으로 확인). RN은 flex 자식의 overflow를 기본 visible로 렌더링하므로 컨테이너 밖으로 침범함. 빈 공간 축소보다 레이아웃 무결성 우선, 원래 검증된 값으로 복구 |
| 2026-06-10 | SoloMeasureScreen done phase waveHeight 축소 (toast 겹침 근본 수정) | 솔로 측정 결과(done) + 다이어리 저장 토스트 노출 시 cta 높이가 늘어나 vizSection(flex:1) 가용 공간이 부족해지는 문제. 1차 시도로 toast를 position:absolute 오버레이로 뺐더니 이번엔 toast가 statsRow 위에 겹쳐 dB 값을 가리는 새 회귀 발생(실기기 스크린샷) — absolute는 겹침 위치만 옮길 뿐 근본 해결이 아니었음. toast를 다시 inline(doneActions)으로 되돌리고, 대신 phase==='done'일 때 waveHeight를 compact 0.22/170 → 0.16/110(다른 phase는 기존 유지)로 축소해 vizSection 콘텐츠 높이를 ~40px 줄여 toast+stats+버튼이 모두 들어갈 여유 확보. done에서는 정지된 파형보다 결과 숫자/통계/액션이 더 중요하므로 시각적으로도 합리적. tsc 통과 |
| 2026-06-10 | MicTestScreen ScrollView에 flex:1 추가 | granted 상태에서 privacyCard("녹음 파일은 서버로 전송되지 않아...") 카드가 하단 ctaWrap("다음 →")과 겹쳐 잘리는 회귀 발견(실기기 스크린샷, iPhone SE). 원인: ScrollView에 `style`(flex:1) 없이 `contentContainerStyle.minHeight: height*0.72`만 지정 — ScrollView가 컨텐츠 높이만큼 자라 SafeAreaView(flex:1, 고정 높이) 안에서 형제 ctaWrap과 겹침(SoloMeasureScreen과 동일한 RN flexShrink:0 패턴, [[gotcha #29]]). 수정: ScrollView에 `style={{flex:1}}` 추가, 불필요해진 minHeight 제거 → ScrollView가 남은 공간만큼만 차지하고 내부에서 스크롤되도록 변경. tsc 통과 |
| 2026-06-10 | Auth 온보딩 4개 화면(PhotoScreen, NicknameScreen, TermsScreen, WelcomeScreen) 동일 패턴 일괄 수정 | MicTestScreen에서 발견한 ScrollView+ctaWrap 오버랩 패턴([[gotcha #29]])을 다른 ScrollView 사용 화면 전수 조사한 결과, 동일하게 `contentContainerStyle.minHeight: height*X` + `style` 없는 ScrollView + 하단 고정 ctaWrap/ctaRow 구조를 가진 4개 화면을 추가 발견. 동일 수정 적용: ScrollView에 `style={{flex:1}}`(새 `scroll` 스타일, 단 NicknameScreen은 기존 contentContainerStyle 이름이 `scroll`이라 충돌 방지를 위해 `scrollView`로 명명) 추가, `minHeight: height*X` 제거. 부수적으로 NicknameScreen·TermsScreen은 `height`가 그 minHeight 계산에만 쓰여 unused 변수가 되어 destructuring에서 제거(`const { width } = useWindowDimensions()`), WelcomeScreen·PhotoScreen은 `height`가 compact 플래그 등에 계속 쓰여 유지. HomeScreen/OnboardingScreen/GameResultScreen/LeaderboardScreen/ProfileScreen/CalendarScreen/SettingsScreen은 ctaWrap류 고정 하단 요소 없이 ScrollView가 화면 전체를 차지하는 구조라 위험 패턴 없음을 확인하고 수정 제외. tsc 통과 |
| 2026-06-10 | AdMob 배너 1차 도입(Profile 하단만) | `react-native-google-mobile-ads@16.3.3` 추가. `app.config.ts`에 AdMob config plugin 등록(개발 기본값은 Google 테스트 App ID, 운영은 `ADMOB_IOS_APP_ID`/`ADMOB_ANDROID_APP_ID`로 교체). 런타임은 `AdBanner` 공통 컴포넌트 + `src/config/adMob.ts`로 분리하고 Profile ScrollView 맨 아래에만 삽입. `__DEV__`에서는 `TestIds.ADAPTIVE_BANNER`, production에서는 `EXPO_PUBLIC_ADMOB_IOS_BANNER_PROFILE_UNIT_ID`/`EXPO_PUBLIC_ADMOB_ANDROID_BANNER_PROFILE_UNIT_ID`가 있을 때만 노출해 테스트 광고 단위가 운영에 노출되지 않도록 처리. 광고 로드 실패 시 배너는 조용히 숨김. tsc + `expo config --type prebuild` 통과 |
| 2026-06-10 | AdMob 배너 위치를 Profile 내부 → Bottom Tabs 바로 위 공통 슬롯으로 변경 | 사용자 방향 변경("랭킹/다이어리/홈/프로필 전부 배너 광고, 네이티브 고급형은 추후") 반영. Profile ScrollView 하단 배너 제거, `MainNavigator`의 custom `tabBar`에서 `AdBanner placement="main-tab-bottom"`을 `BottomTabBar` 위에 렌더링. Home/Diary/Ranking/Profile 탭에서 공통 노출되며, Home/Diary의 `SoloMeasure` 진입 시에는 측정 UX 보호를 위해 숨김. 운영 env는 `EXPO_PUBLIC_ADMOB_{IOS,ANDROID}_BANNER_MAIN_TAB_UNIT_ID`를 우선 사용하고 기존 PROFILE 변수도 fallback으로 유지. tsc 통과 |
| 2026-06-05 | 회원탈퇴 cascade 없이 코드 수준 삭제 | DB cascade는 실수로 delete 시 복구 불가. 코드에서 순서 명시 → 각 단계 에러 캐치 가능 |
| 2026-06-05 | OAuth signupToken = 15분 만료 JWT (DB 저장 안함) | Redis 없는 환경에서 stateless 유효성 검증. 만료 후 재로그인 유도 |
| 2026-06-05 | Kakao accessToken → REST API로 providerId 추출 | Kakao는 JWKS 없음. `/v2/user/me` bearer 호출로 `id` 필드 추출 |
| 2026-06-05 | jest.mock('jose') 호이스팅으로 ESM 문제 해결 | jose v6은 pure ESM. ts-jest CJS 환경에서 import 오류. transformIgnorePatterns 대신 mock 호이스팅이 더 단순 |
| 2026-06-05 | prisma db execute (SQL 직접) vs migrate dev | 22명 기존 데이터 보존. nullable column 추가 → UPDATE → NOT NULL 단계 진행. prisma migrate는 non-nullable 추가 시 기존 데이터 거부 |
| 2026-06-06 | 서버사이드 OAuth Authorization Code Flow | Expo Go에서 앱사이드 Kakao/Google OAuth 불가 (커스텀 스킴 미지원). 서버가 OAuth 처리 후 앱 deep link로 auth code 전달 |
| 2026-06-06 | Apple은 expo-apple-authentication 네이티브 유지 | Expo Go에서 Apple 웹 OAuth 불가, expo-apple-authentication은 개발 빌드(npx expo run:ios)에서 동작 |
| 2026-06-06 | adb reverse tcp:3000 tcp:3000 | Android 에뮬레이터에서 localhost = 에뮬레이터 자신. IP 변경 없이 Mac 서버 접근. Google 콘솔에 IP 주소 등록 불가 문제도 해결 |
| 2026-06-07 | Expo Go 지원 포기 → development build/EAS 기준 전환 | Codex [14:14] 지시 + 사용자 결정. Apple/Google/Kakao OAuth를 모두 네이티브 SDK(@react-native-google-signin, @react-native-kakao)로 통일하기 위해 필수. Expo Go에서는 서드파티 네이티브 모듈 동작 불가 |
| 2026-06-07 | 앱 ID를 com.anonymous.deciduelapp → com.deciduel.app으로 확정 | OAuth 콘솔(Apple/Google/Kakao) 등록 식별자라 다른 모든 설정의 전제조건. 사용자 확정 후 app.json 변경 + `expo prebuild --clean`으로 ios/android 네이티브 프로젝트 재생성, pod install 완료 |
| 2026-06-07 | 디버그 키스토어 SHA-1/SHA-256은 prebuild 전후 동일 (~/.android/debug.keystore 공유) | Google/Kakao 콘솔에 디버그 지문을 먼저 등록해도 향후 prebuild 재실행으로 무효화되지 않음을 확인. SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25 |
| 2026-06-07 | Google Cloud Console OAuth 클라이언트 3종 발급 완료 | 네이티브 SDK(`@react-native-google-signin/google-signin`) 구성에 필요. Android/iOS/Web 클라이언트 ID는 코드에 고정하지 않고 EAS/로컬 env(`EXPO_PUBLIC_GOOGLE_*`)로 주입. Web 클라이언트는 리디렉션 URI 비워서 생성 (네이티브 idToken audience 식별자 용도이며 브라우저 리디렉션 플로우 아님). Firebase App Check는 OAuth 기능과 무관 + "Firebase Auth 도입 금지" 취지에 부합해 스킵 |
| 2026-06-07 | TODO: Play Store 출시 시점에 Play App Signing SHA-1 재등록 필요 | 현재 등록한 SHA-1(`5E:8F:...`)은 로컬 디버그 키스토어 지문. Google Play 배포 시 Play App Signing이 앱 서명에 사용하는 별도 SHA-1/SHA-256이 발급되므로, 출시 단계에서 Google Cloud Console(Android 클라이언트)과 Kakao Developers(키 해시)에 release 지문을 추가 등록해야 함 (현재는 등록 불필요 — dev/debug 빌드 기준 진행) |
| 2026-06-07 | TODO: App Store 출시 시점에 Google iOS OAuth 클라이언트에 App Store ID 등록 필요 | iOS 클라이언트 생성 시 Bundle ID(`com.deciduel.app`)/Team ID(`6T6KKD96D4`)는 입력했으나 App Store ID는 아직 앱 미출시로 비워둠. App Store Connect 등록 후 Google Cloud Console → 사용자 인증 정보 → 해당 iOS 클라이언트 ID 편집에서 App Store ID 추가 입력 필요 |
| 2026-06-07 | Kakao Developers 콘솔 설정 완료 (네이티브 앱 키 + 플랫폼 등록) | 네이티브 앱 키는 코드에 고정하지 않고 EAS/로컬 env(`EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`)로 주입. iOS 플랫폼: 번들 ID `com.deciduel.app`, Android 플랫폼: 패키지명 `com.deciduel.app` + 디버그 키 해시 등록 완료 |
| 2026-06-07 | TODO: 앱 출시 시점에 Kakao 콘솔에 Google Play 스토어 / App Store 링크(ID) 등록 필요 | 카카오 콘솔 앱 설정에 스토어 링크 입력란 존재. 현재는 미출시 상태라 비워둠 — 출시 후 양쪽 스토어 URL/ID 모두 등록 필요 |
| 2026-06-07 | Kakao 앱 아이콘 업로드 용량 제한(~250KB) → 256×256 리사이즈본 생성 | 기존 `assets/icon.png`(1024×1024, 695KB)이 카카오 앱 아이콘 업로드 제한 초과로 거부됨. `sips -z 256 256`으로 리사이즈해 `/tmp/kakao-icon/icon-256.png`(256×256, ~58.6KB) 생성 후 콘솔에 업로드 (앱 자체 에셋은 변경하지 않음 — 업로드 전용 파일) |
| 2026-06-07 | Kakao/Google OAuth 동의항목 = 최소 동의(로그인만), 이메일/닉네임 등 선택 동의항목 전부 미요청 | 이메일은 사용하지 않고, 닉네임은 `NicknameScreen`에서 자체 설정하므로 외부 프로필 정보가 불필요. 고유 식별자(Kakao `id`/회원번호, Google idToken `sub`)는 동의항목과 무관하게 항상 제공되어 계정 식별/병합에 충분함. 불필요한 동의 요구를 줄여 가입 전환율 향상 + 기존 dev 로그인의 "이메일 미사용·닉네임 자체 설정" 정책과 일관 |
| 2026-06-07 | `@gorhom/bottom-sheet` 제거 | 코드베이스 어디서도 사용되지 않는 죽은 의존성. peer dep(`react-native-reanimated >=3.16`)이 미설치 상태라 `npm install` 시 react-native 버전 충돌 유발 → expo-dev-client 설치 시 `--legacy-peer-deps` 우회 필요했던 원인. 제거 후 일반 install 정상화 |
| 2026-06-07 | Google/Kakao를 서버사이드 Authorization Code Flow → 네이티브 SDK 기반으로 재전환 | Codex [14:14] "정정" 지시(2026-06-06 결정 폐기) + 사용자 확정("좋아 시작하자"). Apple/Google/Kakao 인증 기준을 provider마다 다르게 가져가지 않기 위해 전부 네이티브 SDK(`expo-apple-authentication`/`@react-native-google-signin`/`@react-native-kakao`)로 통일. `@react-native-google-signin/google-signin`, `@react-native-kakao/{core,user}`, `expo-build-properties` 설치 + `app.config.ts` plugins(`iosUrlScheme`, `nativeAppKey`, `authCodeHandlerActivity`, `handleKakaoOpenUrl`) 구성 |
| 2026-06-07 | OAuth provider 네이티브 호출을 `src/utils/oauthProviders.ts`로 분리 | Codex 제안("중복 로직은 작은 모듈로 분리해도 됨") 채택. `signInWithGoogleNative`/`signInWithKakaoNative`가 각각 idToken/accessToken만 반환하고 `OAuthCancelledError`(취소, Toast 미노출)/`OAuthProviderError`(실패, Toast 노출)로 결과를 구분 — LoginScreen은 분기만 담당해 가독성 확보. `GoogleSignin.configure()`/`initializeKakaoSDK()`는 모듈 내부에서 idempotent하게 1회만 실행 (lazy, 앱 시작 지연 없음) |
| 2026-06-07 | LoginScreen `handleGoogle`/`handleKakao` WebBrowser 플로우 → 네이티브 SDK 직접 호출로 교체, `exchangeAuthCode()`/`expo-web-browser`/`expo-linking` 제거 | Codex 지시 그대로 적용. `oauthLogin('google', { idToken })` / `oauthLogin('kakao', { accessToken })`만 호출하면 되어 서버와의 계약이 Apple과 동일해짐 (provider별 분기 단순화). 사용자 취소는 `instanceof OAuthCancelledError`로 판별해 Toast 없이 조용히 종료 |
| 2026-06-07 | Kakao 취소/환경 오류 메시지 분리 (취소 vs KakaoTalk 미설치 vs 일반 오류) | `@react-native-kakao/user`가 표준화된 취소 에러 코드를 노출하지 않아(`code`/`message`에 "cancel" 포함 여부로 휴리스틱 판별), 미설치 등 환경 문제는 `isKakaoTalkLoginAvailable()`로 별도 확인 후 안내 문구 분기. Codex 지시("KakaoTalk 미설치/취소/SDK 오류를 구분해 메시지를 다듬는다") 반영 |
| 2026-06-07 | `oauthProviders.ts` 단위 테스트 10개 신규 (네이티브 SDK는 jest.mock 처리) | Codex 지시 케이스(idToken/accessToken 누락 → 에러, 사용자 취소 → Toast 없는 신호) 모두 커버. `@react-native-google-signin/google-signin`·`@react-native-kakao/{core,user}`를 모듈 레벨 mock으로 대체 (실제 네이티브 모듈은 Jest Node 환경에서 로드 불가) |
| 2026-06-07 | `expo-auth-session`/`expo-web-browser` 제거 (구 `EXPO_PUBLIC_GOOGLE_*`/`EXPO_PUBLIC_KAKAO_REST_API_KEY`는 신규 변수로 대체, 아래 항목 참고) | 네이티브 SDK 전환으로 WebBrowser 기반 OAuth 플로우가 완전히 사라져 코드베이스 어디서도 참조하지 않는 죽은 의존성이 됨 (`expo-linking`은 `expo-auth-session`의 transitive dep으로 함께 정리됨, `react-native`의 `Linking`은 `micPermission.ts`에서 별도로 계속 사용 중이라 영향 없음). 사용자 승인("불필요한 코드 잔재는 삭제해도 돼") 반영 |
| 2026-06-07 | Google/Kakao client id·native app key를 `EXPO_PUBLIC_*` env 변수로 전환 | 사용자 피드백("id 값들이나 이런 부분들 env로 전부 호출해야 하는 거 아닌가? 이번만큼은 env 수정해도 돼") 반영. `oauthProviders.ts`는 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`를 사용하고, `app.config.ts`도 같은 env에서 native plugin 설정을 계산한다. 2026-06-10 출시 준비 중 실제 값 fallback은 제거했으며, EAS production env와 로컬 `.env`에서만 주입한다 |
| 2026-06-07 | 정적 `app.json` → 동적 `app.config.ts` 전환 | 위 항목에서 "`.env`를 바꿔도 `app.json`(plugins의 `nativeAppKey`/`iosUrlScheme`)은 동기화되지 않는다"는 한계를 사용자에게 설명하자 "관리에 용이할 것 같다"며 전환 승인. `ConfigContext`/`ExpoConfig` 타입(`expo/config`)으로 작성, Expo CLI가 `expo start`/`prebuild`/`EAS build` 시 `.env`를 자동 로드해 `process.env.*`를 config 평가 시점에 제공하므로 `dotenv` 패키지 불필요. `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`로부터 `iosUrlScheme`(`com.googleusercontent.apps.<prefix>`)을 정규식으로 동적 계산, `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`를 `nativeAppKey`에 그대로 연결 — `oauthProviders.ts` 런타임 값과 `.env` 한 곳만 수정하면 자동 동기화됨. `npx expo config --type public/prebuild`로 변환 전후 결과값(`bundleIdentifier`/`package`/`plugins` 전체)이 동일함을 확인 후 `app.json` 삭제 |
| 2026-06-07 | `SettingsScreen.tsx`의 `import appJson from '../../../app.json'` → `expo-constants`(`Constants.expoConfig?.version`)로 교체 | `app.config.ts` 전환으로 정적 JSON import가 깨짐(TS2307). 정적/동적 설정 어느 쪽이든 일관되게 동작하는 Expo 표준 방식인 `expo-constants`로 런타임 조회하도록 변경 (직접 의존성으로 `npx expo install expo-constants` 추가, 이미 `expo` SDK에 번들되어 있던 패키지를 명시적 dependency로 승격) |
| 2026-06-07 | [서버] Codex 지시서(`[2026-06-07 20:10]`) — Server Observability(Phase 1) + Admin Auth/API MVP(Phase 2) 구현 완료 | `deci-duel-server`에 requestId/AsyncLocalStorage 컨텍스트, pino 구조화 로깅, `OperationalEvent` 모델+서비스, `POST /admin/auth/login`/`GET /admin/health`/`GET /admin/events` 신규 admin API(일반 유저 JWT와 완전 분리된 admin JWT)를 추가. **앱 코드 변경 불필요** — 모든 응답에 `requestId`(옵셔널) 필드와 `x-request-id` 응답 헤더가 추가되지만 기존 `ApiResponse` 파서는 옵셔널 필드를 무시하므로 호환성 깨지지 않음. 추후 에러 리포팅/문의 플로우에서 `requestId`를 노출하면 서버 로그 추적에 도움이 될 수 있음(선택 사항). 상세는 `deci-duel-server/docs/{api.md, progress.md, CLAUDE_TO_CODEX.md}` 참고. 서버 전체 테스트 16 suites/219 tests + build 통과 |
| 2026-06-11 | `CalendarScreen.tsx` 다이어리 상세 바텀시트에 `KeyboardAvoidingView` 추가 (키보드-모달 겹침 수정) | 사용자 리포트: 다이어리 기록 수정 시 코멘트 `TextInput`에 포커스가 가면 키보드가 바텀시트 위에 겹쳐서 뜸. `detailSheet`(`position: absolute, bottom: 0`)를 새 `sheetKeyboardWrap`(absolute fill) 안의 `KeyboardAvoidingView`로 감싸 `behavior="padding"`(iOS)/`"height"`(Android) 적용 — 키보드 노출 시 wrap에 추가되는 padding/height만큼 `bottom: 0` 자식이 위로 밀려 올라감. RN Modal은 키보드 회피를 자동으로 처리하지 않으므로, absolute 포지션 바텀시트는 KeyboardAvoidingView를 absolute fill 부모로 감싸야 효과가 있음 — 향후 유사한 바텀시트 모달에 재사용 가능한 패턴. tsc 통과 |
