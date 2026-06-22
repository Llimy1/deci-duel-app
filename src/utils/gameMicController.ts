/**
 * 대결 게임 마이크 수명주기 컨트롤러
 *
 * 핵심 원칙:
 *  - countdown 진입 시 미리 warm-up (mic.start) — round:start 이전에 마이크 준비 완료
 *  - round:start(playing) 진입 시 mic.reset()만 호출 — 재시작 없이 peak window 초기화
 *  - 라운드 사이 mic.stop() 금지 — gameOver/unmount에서만 한 번 호출
 *
 * 장점:
 *  - 라운드 1: mic.start 지연이 타이머에 영향 없음 (countdown 중 완료)
 *  - 라운드 2+: stop/start 없이 reset만 → 재시작 지연 제거
 *  - 양쪽 기기의 공식 측정 window가 서버 round:start 기준으로 동기화
 *
 * 안전장치:
 *  - generation 토큰: cleanup() 이후 도착한 mic.start() resolve를 무시 (race 방지)
 *  - waitForReady(timeoutMs): 마이크 준비가 지연되면 false로 resolve (무한 대기 방지)
 */

export type MicLifecycleStatus = 'idle' | 'starting' | 'ready' | 'failed';

export interface GameMicInterface {
  start: () => Promise<boolean>;
  stop: () => Promise<unknown>;
  reset: () => void;
}

export interface GameMicController {
  /** countdown 진입 시 호출 — 이미 starting/ready/failed 상태면 no-op */
  warmUp: () => void;
  /** mic 준비 완료 여부 */
  isReady: () => boolean;
  /** mic 실패 여부 (submit 차단용) */
  isFailed: () => boolean;
  /**
   * measuring 진입 시 호출 — mic 준비 완료까지 기다린 후 resolve(true/false)
   * 이미 ready이면 즉시 resolve(true), failed이면 즉시 resolve(false)
   * warmUp이 호출되지 않은 경우 fallback으로 start() 실행
   * @param timeoutMs 이 시간 안에 준비되지 않으면 false로 resolve하고 status를 failed로 전환
   */
  waitForReady: (timeoutMs?: number) => Promise<boolean>;
  /** gameOver 또는 unmount 시 호출 — mic.stop() + 상태 초기화 */
  cleanup: () => void;
}

export function createGameMicController(mic: GameMicInterface): GameMicController {
  let status: MicLifecycleStatus = 'idle';
  let pendingResolvers: Array<(ready: boolean) => void> = [];
  // cleanup()마다 증가. 진행 중이던 mic.start() resolve가 이 토큰을 검사해
  // 정리 이후 status를 ready/failed로 되돌리는 race를 방지한다.
  let generation = 0;

  const flushPending = (ready: boolean) => {
    const resolvers = pendingResolvers.splice(0);
    resolvers.forEach((r) => r(ready));
  };

  const doStart = () => {
    const gen = generation;
    void mic.start().then((started) => {
      if (gen !== generation) return; // cleanup() 이후 도착한 resolve — 무시
      if (status !== 'starting') return; // 이미 timeout 등으로 확정됨 — 무시
      status = started ? 'ready' : 'failed';
      flushPending(started);
    });
  };

  return {
    warmUp() {
      if (status !== 'idle') return; // 이미 시작했거나 완료/실패 — no-op
      status = 'starting';
      doStart();
    },

    isReady: () => status === 'ready',
    isFailed: () => status === 'failed',

    waitForReady(timeoutMs?: number): Promise<boolean> {
      if (status === 'ready') return Promise.resolve(true);
      if (status === 'failed') return Promise.resolve(false);
      if (status === 'idle') {
        // warmUp이 호출되지 않은 경우 (비정상 경로) — fallback start
        status = 'starting';
        doStart();
      }
      // status === 'starting': warm-up 완료까지 대기
      return new Promise<boolean>((resolve) => {
        let settled = false;
        const settle = (ready: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ready);
        };
        pendingResolvers.push(settle);

        if (timeoutMs != null && timeoutMs > 0) {
          const gen = generation;
          setTimeout(() => {
            if (gen !== generation) {
              settle(false); // cleanup된 세대 — 대기만 풀어준다
              return;
            }
            if (status === 'starting') {
              // 제한 시간 내 준비 실패 → failed 확정, 모든 대기자 false
              status = 'failed';
              flushPending(false);
            } else {
              settle(false);
            }
          }, timeoutMs);
        }
      });
    },

    cleanup() {
      generation += 1; // 진행 중 start/timeout 무효화
      status = 'idle';
      flushPending(false); // 대기 중 promise가 매달리지 않도록 해제
      void mic.stop();
    },
  };
}
