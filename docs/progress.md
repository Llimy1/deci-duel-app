# DeciDuel App 진행 상황

## 마지막 업데이트
2026-06-05

## 현재 상태
스플래시 애니메이션 구현 완료 (D 마크 → DECI DUEL 워드마크 5.4s 시퀀스). iOS 빌드 문제 해결 (buildReactNativeFromSource). 앱 104개 테스트 pass. Phase B 진행 중.

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

## 진행 중인 작업
- Phase B 앱 완성도

## 출시 전 작업 로드맵

### Phase B — 앱 완성도
- [ ] i18n 다국어 지원 (한국어/영어)
  - `i18next` + `react-i18next` + `expo-localization`
  - 기기 언어 자동 감지 + 설정에서 수동 변경
- [ ] 폰트 전체 통일 (시스템 폰트 혼용 제거)
- [ ] 화면 간 톤/분위기 일관성 정리
- [ ] 이모지 다양화 (다이어리 바텀시트 등)
- [ ] 효과음 (카운트다운 3-2-1, 라운드 승/패)
  - 배경음악은 dB 측정에 영향 → 미포함 결정
- [ ] 햅틱 (카운트다운, 게임 시작, 라운드 결과)
- [ ] 딥링크 (방코드 공유 → 앱 자동 실행 + 코드 자동 입력)
- [x] 오프라인/네트워크 에러 처리

### Phase C — 법적/배포 준비
- [ ] 개인정보처리방침 / 이용약관 페이지 (웹)
- [ ] SettingsScreen 약관/개인정보 링크 연결
- [ ] 버전 표시 (app.json 연동)
- [ ] 로그아웃/회원탈퇴 QA
- [x] 앱 아이콘 & 스플래시 실제 디자인 교체

### Phase D — 배포
- [ ] OAuth 구현 (Apple 필수 + Google + 카카오)
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
