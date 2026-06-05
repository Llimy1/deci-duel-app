/**
 * GameScreen measuring phase 핵심 로직 — 순수 함수로 추출
 *
 * 목적:
 *  - React 의존성 없이 Jest Node 환경에서 단위 테스트 가능
 *  - GameScreen measuring useEffect는 이 함수를 얇게 감싸는 래퍼
 *
 * 담당 동작:
 *  1. waitForReady(timeout) — mic 준비 대기
 *  2. 실패 시 onMicFailed 콜백
 *  3. 준비됐으나 window 이미 소진 시 onWindowExpired 콜백
 *  4. 준비 완료 → mic.reset + official window 시작
 *  5. 서버 round:start 기준(windowStartedAt) 타이머 → 대기 시간이 남은 시간에 자동 반영
 *  6. window 종료 → setOfficialMeasuringEnd + submitRound
 *  7. cancel() — effect cleanup 시 호출
 */

export interface MeasureRoundOptions {
  roundSeconds: number;
  timeoutMs: number;
  round: number;
  waitForReady: (timeoutMs: number) => Promise<boolean>;
  micReset: () => void;
  micGetPeak: () => number;
  micGetDb: () => number;
  submitRound: (round: number, peakDb: number) => void;
  onOfficialMeasuringStart: () => void;
  /** submit 직전 + cancel 시 호출 — round:db 전송 종료 */
  onOfficialMeasuringEnd: () => void;
  onTimeLeftUpdate: (timeLeft: number) => void;
  onResetRefs: () => void;
  onMicFailed: () => void;
  onWindowExpired: () => void;
}

export interface MeasureRoundHandle {
  /** measuring effect cleanup 시 호출 */
  cancel: () => void;
}

export function startMeasureRound(opts: MeasureRoundOptions): MeasureRoundHandle {
  let cancelled = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let submitted = false;

  // round:start 수신 시점을 공식 window 기준으로 잡는다.
  // waitForReady 대기 시간이 elapsed에 포함 → 늦게 ready되면 남은 시간이 자동으로 줄어든다.
  const windowStartedAt = Date.now();

  void opts.waitForReady(opts.timeoutMs).then((ready) => {
    if (cancelled) return;

    if (!ready) {
      opts.onMicFailed();
      return;
    }

    const waitedSeconds = (Date.now() - windowStartedAt) / 1000;
    const remainingSeconds = opts.roundSeconds - waitedSeconds;

    // 대기 중 이미 window가 소진됐으면 즉시 실패
    if (remainingSeconds <= 0) {
      opts.onWindowExpired();
      return;
    }

    opts.micReset();
    opts.onResetRefs();
    opts.onOfficialMeasuringStart();

    timerId = setInterval(() => {
      const elapsed = (Date.now() - windowStartedAt) / 1000;
      const timeLeft = Math.max(0, Number((opts.roundSeconds - elapsed).toFixed(1)));
      opts.onTimeLeftUpdate(timeLeft);

      if (timeLeft > 0 || submitted) return;
      submitted = true;
      if (timerId !== null) { clearInterval(timerId); timerId = null; }
      const peakDb = Number(Math.max(opts.micGetPeak(), opts.micGetDb()).toFixed(2));
      // submit 직전 official window 종료 — round:db 전송 중단 (Issue 3)
      opts.onOfficialMeasuringEnd();
      opts.submitRound(opts.round, peakDb);
    }, 100);
  });

  return {
    cancel() {
      cancelled = true;
      if (timerId !== null) { clearInterval(timerId); timerId = null; }
      opts.onOfficialMeasuringEnd();
    },
  };
}
