/**
 * GameMicController 단위 테스트
 *
 * 검증 항목:
 *  1. warmUp — countdown 진입 시 mic.start() 1회 호출, 중복 방지
 *  2. 상태 전환 — ready/failed 정확히 전환
 *  3. waitForReady — ready 즉시 반환 / starting 중 대기 / fallback start
 *  4. 라운드 2+ — mic.start() 재호출 없이 ready 유지
 *  5. cleanup — gameOver/unmount 시에만 mic.stop() 호출
 */

import { createGameMicController, GameMicInterface } from '../gameMicController';

function makeMockMic(startResult = true): jest.Mocked<GameMicInterface> {
  return {
    start: jest.fn().mockResolvedValue(startResult),
    stop: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
  };
}

/* ─────────────────────────── warmUp ─────────────────────────── */

describe('warmUp', () => {
  it('호출 시 mic.start()를 실행한다', () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    expect(mic.start).toHaveBeenCalledTimes(1);
  });

  it('중복 호출 시 mic.start()를 한 번만 실행한다', async () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    ctrl.warmUp();
    ctrl.warmUp();
    await Promise.resolve();
    expect(mic.start).toHaveBeenCalledTimes(1);
  });

  it('성공 시 isReady()가 true, isFailed()가 false', async () => {
    const mic = makeMockMic(true);
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    expect(ctrl.isReady()).toBe(true);
    expect(ctrl.isFailed()).toBe(false);
  });

  it('실패 시 isFailed()가 true, isReady()가 false', async () => {
    const mic = makeMockMic(false);
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    expect(ctrl.isReady()).toBe(false);
    expect(ctrl.isFailed()).toBe(true);
  });

  it('이미 ready 상태에서 다시 warmUp 호출 시 no-op (라운드 2+)', async () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);
    ctrl.warmUp(); // round 1 countdown
    await Promise.resolve();
    ctrl.warmUp(); // round 2 countdown — no-op
    ctrl.warmUp(); // round 3 countdown — no-op
    expect(mic.start).toHaveBeenCalledTimes(1);
  });
});

/* ─────────────────────────── waitForReady ─────────────────────────── */

describe('waitForReady', () => {
  it('warm-up 성공 후 즉시 true를 반환한다', async () => {
    const mic = makeMockMic(true);
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    const ready = await ctrl.waitForReady();
    expect(ready).toBe(true);
  });

  it('warm-up 실패 후 즉시 false를 반환한다', async () => {
    const mic = makeMockMic(false);
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    const ready = await ctrl.waitForReady();
    expect(ready).toBe(false);
  });

  it('warm-up 진행 중 waitForReady는 완료까지 대기한다', async () => {
    let resolveStart!: (v: boolean) => void;
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise((r) => { resolveStart = r; }));

    const ctrl = createGameMicController(mic);
    ctrl.warmUp(); // status = 'starting', in-flight

    let resolved: boolean | undefined;
    const readyPromise = ctrl.waitForReady().then((v) => { resolved = v; return v; });

    // 아직 완료 전
    await Promise.resolve();
    expect(resolved).toBeUndefined();

    // warm-up 완료
    resolveStart(true);
    const result = await readyPromise;
    expect(result).toBe(true);
  });

  it('warm-up 실패 대기 중 false로 resolve된다', async () => {
    let resolveStart!: (v: boolean) => void;
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise((r) => { resolveStart = r; }));

    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    const readyPromise = ctrl.waitForReady();

    resolveStart(false);
    const result = await readyPromise;
    expect(result).toBe(false);
  });

  it('warmUp 없이 waitForReady 호출 시 fallback으로 mic.start()를 실행한다', async () => {
    const mic = makeMockMic(true);
    const ctrl = createGameMicController(mic);
    const ready = await ctrl.waitForReady();
    expect(mic.start).toHaveBeenCalledTimes(1);
    expect(ready).toBe(true);
  });

  it('라운드 2에서 waitForReady는 mic.start() 없이 즉시 true', async () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);

    // 라운드 1
    ctrl.warmUp();
    await Promise.resolve();
    await ctrl.waitForReady();

    // 라운드 2 — warm-up no-op, waitForReady 즉시 true
    ctrl.warmUp();
    const round2Ready = await ctrl.waitForReady();
    expect(round2Ready).toBe(true);
    expect(mic.start).toHaveBeenCalledTimes(1); // 전체 게임 통틀어 1회만
  });
});

/* ─────────────────────────── cleanup ─────────────────────────── */

describe('cleanup', () => {
  it('mic.stop()을 호출한다', async () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    ctrl.cleanup();
    expect(mic.stop).toHaveBeenCalledTimes(1);
  });

  it('라운드 사이에는 mic.stop()이 호출되지 않는다', async () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);

    // 라운드 1
    ctrl.warmUp();
    await Promise.resolve();
    await ctrl.waitForReady(); // measuring 진입

    // 라운드 1 종료 — cleanup 없음
    ctrl.warmUp(); // 라운드 2 countdown — no-op
    await ctrl.waitForReady(); // measuring 진입

    // 라운드 2 종료 — cleanup 없음
    expect(mic.stop).not.toHaveBeenCalled();

    // 게임 오버
    ctrl.cleanup();
    expect(mic.stop).toHaveBeenCalledTimes(1); // 단 1회
  });

  it('cleanup 후 상태가 idle로 초기화된다', async () => {
    const mic = makeMockMic();
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    ctrl.cleanup();
    expect(ctrl.isReady()).toBe(false);
    expect(ctrl.isFailed()).toBe(false);
  });

  it('cleanup 대기 중인 waitForReady promise를 false로 해제한다', async () => {
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise(() => {})); // 영원히 pending
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    const readyPromise = ctrl.waitForReady();
    ctrl.cleanup();
    await expect(readyPromise).resolves.toBe(false);
  });
});

/* ─────────────────── cleanup race (Issue 4) ─────────────────── */

describe('cleanup race', () => {
  it('cleanup 이후 도착한 mic.start() resolve는 status를 바꾸지 않는다', async () => {
    let resolveStart!: (v: boolean) => void;
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise((r) => { resolveStart = r; }));

    const ctrl = createGameMicController(mic);
    ctrl.warmUp(); // status = 'starting', in-flight

    // 마이크가 준비되기 전에 게임 종료/언마운트
    ctrl.cleanup();
    expect(ctrl.isReady()).toBe(false);
    expect(ctrl.isFailed()).toBe(false);

    // 뒤늦게 start가 성공으로 resolve — 무시되어야 함
    resolveStart(true);
    await Promise.resolve();
    expect(ctrl.isReady()).toBe(false);
    expect(ctrl.isFailed()).toBe(false);
  });

  it('cleanup 후 새 warmUp은 정상적으로 다시 시작한다', async () => {
    let resolveFirst!: (v: boolean) => void;
    const mic = makeMockMic();
    mic.start.mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }));

    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    ctrl.cleanup();

    // 새 게임 시작 — 두 번째 start는 기본 mock(true)
    ctrl.warmUp();
    await Promise.resolve();
    expect(ctrl.isReady()).toBe(true);

    // 뒤늦게 첫 번째 start가 resolve돼도 현재 ready 상태를 깨지 않음
    resolveFirst(false);
    await Promise.resolve();
    expect(ctrl.isReady()).toBe(true);
    expect(mic.start).toHaveBeenCalledTimes(2);
  });
});

/* ── isFailed 상태에서 waitForReady가 즉시 false (Issue 1 근거) ── */

describe('isFailed → waitForReady 즉시 false', () => {
  it('warmUp 실패 후 waitForReady는 즉시 false를 반환한다', async () => {
    const mic = makeMockMic(false); // start → false
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    expect(ctrl.isFailed()).toBe(true);
    // isFailed()인 상태에서 waitForReady를 호출해도 즉시 false로 resolve
    const result = await ctrl.waitForReady();
    expect(result).toBe(false);
    expect(mic.start).toHaveBeenCalledTimes(1); // 재시도 없음
  });

  it('warmUp 실패 후에도 cleanup은 stop을 1회 호출한다', async () => {
    const mic = makeMockMic(false);
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();
    await Promise.resolve();
    ctrl.cleanup();
    expect(mic.stop).toHaveBeenCalledTimes(1);
  });
});

/* ─────────────────── waitForReady timeout (Issue 3) ─────────────────── */

describe('waitForReady timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('제한 시간 내 준비되지 않으면 false로 resolve하고 failed로 전환', async () => {
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise(() => {})); // 영원히 pending
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();

    const readyPromise = ctrl.waitForReady(2500);
    jest.advanceTimersByTime(2500);
    await expect(readyPromise).resolves.toBe(false);
    expect(ctrl.isFailed()).toBe(true);
  });

  it('타임아웃 전에 ready가 되면 true로 resolve한다', async () => {
    let resolveStart!: (v: boolean) => void;
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise((r) => { resolveStart = r; }));
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();

    const readyPromise = ctrl.waitForReady(2500);
    resolveStart(true);
    await expect(readyPromise).resolves.toBe(true);
    expect(ctrl.isReady()).toBe(true);
  });

  it('타임아웃으로 failed된 후 뒤늦은 start resolve는 ready로 되돌리지 않는다', async () => {
    let resolveStart!: (v: boolean) => void;
    const mic = makeMockMic();
    mic.start.mockReturnValue(new Promise((r) => { resolveStart = r; }));
    const ctrl = createGameMicController(mic);
    ctrl.warmUp();

    const readyPromise = ctrl.waitForReady(2500);
    jest.advanceTimersByTime(2500);
    await expect(readyPromise).resolves.toBe(false);

    resolveStart(true); // 뒤늦은 성공
    await Promise.resolve();
    expect(ctrl.isReady()).toBe(false);
    expect(ctrl.isFailed()).toBe(true);
  });
});
