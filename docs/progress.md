# DeciDuel App 진행 상황

## 마지막 업데이트
2026-06-01

## 현재 상태
Phase A 완료. 코드 리뷰 지적 앱 사이드 6개 수정 완료. Phase B(앱 완성도) 진행 중.

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

## 완료된 작업 (2026-06-01 코드 리뷰 대응)
- useMicDb start() → Promise<boolean> 반환, 실패 시 false
- diaryStore saveEntry 실패 시 낙관적 업데이트 롤백 + AsyncStorage 저장 스킵
- gameStore sendReady() → boolean 반환 (연결 안됐으면 false)
- MatchFoundScreen: sendReady() 성공 시에만 meReady=true, 상대 disconnect 배너 추가
- GameScreen: mic.start() 실패 시 Alert + 나가기 옵션, 상대 disconnect 배너 추가
- LoginScreen: 소셜 로그인 버튼 → "준비 중" Alert (navigate 제거)
- LeaderboardScreen: 에러 시 재시도 버튼, Av에 profileImageUrl 전달
- leaderboard.ts: LeaderboardEntry에 profileImageUrl 추가

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
- [ ] 오프라인/네트워크 에러 처리

### Phase C — 법적/배포 준비
- [ ] 개인정보처리방침 / 이용약관 페이지 (웹)
- [ ] SettingsScreen 약관/개인정보 링크 연결
- [ ] 버전 표시 (app.json 연동)
- [ ] 로그아웃/회원탈퇴 QA
- [ ] 앱 아이콘 & 스플래시 실제 디자인 교체

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
