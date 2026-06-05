/**
 * measureRound 통합 흐름 테스트
 *
 * Codex [19:22] 요청 시나리오:
 *  1. countdown warmUp 실패 → playing 진입 시 Alert/leaveRoom, submit 없음
 *  2. legacy 경로 늦은 ready → windowStartedAt 기준 남은 시간만 사용 (full 5초 새로 시작 안 함)
 *  3. submit 후 officialMeasuring=false → round:db 전송 중단
 *  4. window 소진 후 ready → windowExpired 콜백, submit 없음
 *  5. cancel() 시 officialMeasuringEnd 호출 + submit 없음
 */

import { startMeasureRound, type MeasureRoundOptions } from '../measureRound';

// Date.now()를 테스트에서 제어 가능하게
const realDateNow = Date.now.bind(global.Date);

function makeDeps(overrides: Partial<MeasureRoundOptions> = {}): {
  deps: MeasureRoundOptions;
  mocks: {
    submitRound: jest.Mock;
    onOfficialMeasuringStart: jest.Mock;
    onOfficialMeasuringEnd: jest.Mock;
    onTimeLeftUpdate: jest.Mock;
    onMicFailed: jest.Mock;
    onWindowExpired: jest.Mock;
    onResetRefs: jest.Mock;
    waitForReady: jest.Mock;
  };
} {
  const mocks = {
    submitRound: jest.fn(),
    onOfficialMeasuringStart: jest.fn(),
    onOfficialMeasuringEnd: jest.fn(),
    onTimeLeftUpdate: jest.fn(),
    onMicFailed: jest.fn(),
    onWindowExpired: jest.fn(),
    onResetRefs: jest.fn(),
    waitForReady: jest.fn<Promise<boolean>, [number]>().mockResolvedValue(true),
  };

  const deps: MeasureRoundOptions = {
    roundSeconds: 5,
    timeoutMs: 2500,
    round: 1,
    micReset: jest.fn(),
    micGetPeak: jest.fn().mockReturnValue(80),
    micGetDb: jest.fn().mockReturnValue(70),
    ...mocks,
    ...overrides,
  };

  return { deps, mocks };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/* ─────────── 1. mic 실패 → onMicFailed, submit 없음 ─────────── */

describe('mic 실패 (Issue 1)', () => {
  it('waitForReady가 false이면 onMicFailed를 호출하고 submit하지 않는다', async () => {
    const { deps, mocks } = makeDeps({ waitForReady: jest.fn().mockResolvedValue(false) });
    startMeasureRound(deps);

    await Promise.resolve(); // flush waitForReady
    jest.runAllTimers();

    expect(mocks.onMicFailed).toHaveBeenCalledTimes(1);
    expect(mocks.submitRound).not.toHaveBeenCalled();
    expect(mocks.onOfficialMeasuringStart).not.toHaveBeenCalled();
  });

  it('mic 실패 시 officialMeasuringEnd는 cancel() 시에만 호출된다', async () => {
    const { deps, mocks } = makeDeps({ waitForReady: jest.fn().mockResolvedValue(false) });
    const handle = startMeasureRound(deps);

    await Promise.resolve();
    expect(mocks.onOfficialMeasuringEnd).not.toHaveBeenCalled();

    handle.cancel();
    expect(mocks.onOfficialMeasuringEnd).toHaveBeenCalledTimes(1);
  });
});

/* ─────────── 2. 늦은 ready → 남은 시간만 사용 (Issue 2) ─────────── */

describe('늦은 ready — windowStartedAt 기준 타이머 (Issue 2)', () => {
  it('1초 늦게 ready되면 첫 tick의 timeLeft는 4초 이하여야 한다', async () => {
    let resolveReady!: (v: boolean) => void;
    const { deps, mocks } = makeDeps({
      waitForReady: jest.fn().mockReturnValue(new Promise<boolean>((r) => { resolveReady = r; })),
    });

    const now = jest.spyOn(Date, 'now');
    let currentTime = 1000000;
    now.mockImplementation(() => currentTime);

    startMeasureRound(deps);

    // 1초 후 ready
    currentTime += 1000;
    resolveReady(true);
    await Promise.resolve();
    await Promise.resolve();

    // 타이머 첫 tick
    jest.advanceTimersByTime(100);
    currentTime += 100;

    expect(mocks.onOfficialMeasuringStart).toHaveBeenCalledTimes(1);
    const firstTimeLeft = mocks.onTimeLeftUpdate.mock.calls[0][0] as number;
    // 1초 대기 + 0.1초 경과 → 약 3.9초
    expect(firstTimeLeft).toBeLessThanOrEqual(4.0);
    expect(firstTimeLeft).toBeGreaterThanOrEqual(3.8);
  });

  it('full 5초를 새로 주지 않는다 — startedAt은 round:start 수신 시점', async () => {
    let resolveReady!: (v: boolean) => void;
    const { deps, mocks } = makeDeps({
      waitForReady: jest.fn().mockReturnValue(new Promise<boolean>((r) => { resolveReady = r; })),
    });

    const now = jest.spyOn(Date, 'now');
    let currentTime = 2000000;
    now.mockImplementation(() => currentTime);

    startMeasureRound(deps);

    // 2초 후 ready
    currentTime += 2000;
    resolveReady(true);
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(100);
    currentTime += 100;

    const firstTimeLeft = mocks.onTimeLeftUpdate.mock.calls[0][0] as number;
    // 2초 대기 + 0.1초 → 약 2.9초 남음. 5초 새로 시작했으면 4.9가 나올 것
    expect(firstTimeLeft).toBeLessThanOrEqual(3.0);
    expect(firstTimeLeft).toBeGreaterThanOrEqual(2.8);
  });
});

/* ─────────── 3. submit 후 officialMeasuringEnd 호출 (Issue 3) ─────────── */

describe('submit 후 officialMeasuringEnd (Issue 3)', () => {
  it('timer 종료 시 onOfficialMeasuringEnd를 호출한 뒤 submitRound를 호출한다', async () => {
    const { deps, mocks } = makeDeps();

    const now = jest.spyOn(Date, 'now');
    let t = 3000000;
    now.mockImplementation(() => t);

    startMeasureRound(deps);
    await Promise.resolve();
    await Promise.resolve();

    // 5초 경과 → timeLeft = 0
    t += 5000;
    jest.advanceTimersByTime(100);

    expect(mocks.onOfficialMeasuringEnd).toHaveBeenCalled();
    expect(mocks.submitRound).toHaveBeenCalledWith(1, expect.any(Number));

    // onOfficialMeasuringEnd가 submitRound보다 먼저 호출돼야 한다
    const endCallOrder = mocks.onOfficialMeasuringEnd.mock.invocationCallOrder[0];
    const submitCallOrder = mocks.submitRound.mock.invocationCallOrder[0];
    expect(endCallOrder).toBeLessThan(submitCallOrder);
  });

  it('submit 이후 추가 tick이 와도 submitRound는 1회만 호출된다', async () => {
    const { deps, mocks } = makeDeps();

    const now = jest.spyOn(Date, 'now');
    let t = 3000000;
    now.mockImplementation(() => t);

    startMeasureRound(deps);
    await Promise.resolve();
    await Promise.resolve();

    t += 5000;
    jest.advanceTimersByTime(100); // submit

    t += 1000;
    jest.advanceTimersByTime(1000); // 추가 tick

    expect(mocks.submitRound).toHaveBeenCalledTimes(1);
  });
});

/* ─────────── 4. window 소진 후 ready → onWindowExpired (Issue 2 경계) ─────────── */

describe('window 소진 후 ready', () => {
  it('roundSeconds보다 늦게 ready되면 onWindowExpired를 호출하고 submit하지 않는다', async () => {
    let resolveReady!: (v: boolean) => void;
    const { deps, mocks } = makeDeps({
      waitForReady: jest.fn().mockReturnValue(new Promise<boolean>((r) => { resolveReady = r; })),
    });

    const now = jest.spyOn(Date, 'now');
    let t = 4000000;
    now.mockImplementation(() => t);

    startMeasureRound(deps);

    // 6초 후 ready (roundSeconds=5 초과)
    t += 6000;
    resolveReady(true);
    await Promise.resolve();
    await Promise.resolve();

    jest.runAllTimers();

    expect(mocks.onWindowExpired).toHaveBeenCalledTimes(1);
    expect(mocks.submitRound).not.toHaveBeenCalled();
    expect(mocks.onOfficialMeasuringStart).not.toHaveBeenCalled();
  });
});

/* ─────────── 5. cancel() — 정리 ─────────── */

describe('cancel()', () => {
  it('cancel 후 ready가 resolve돼도 officialMeasuringStart/submitRound 미호출', async () => {
    let resolveReady!: (v: boolean) => void;
    const { deps, mocks } = makeDeps({
      waitForReady: jest.fn().mockReturnValue(new Promise<boolean>((r) => { resolveReady = r; })),
    });

    const handle = startMeasureRound(deps);
    handle.cancel();

    resolveReady(true);
    await Promise.resolve();
    await Promise.resolve();

    jest.runAllTimers();

    expect(mocks.onOfficialMeasuringStart).not.toHaveBeenCalled();
    expect(mocks.submitRound).not.toHaveBeenCalled();
  });

  it('진행 중 cancel 시 onOfficialMeasuringEnd가 호출된다', async () => {
    const { deps, mocks } = makeDeps();

    const now = jest.spyOn(Date, 'now');
    let t = 5000000;
    now.mockImplementation(() => t);

    const handle = startMeasureRound(deps);
    await Promise.resolve();
    await Promise.resolve();

    // 2초 경과 후 cancel
    t += 2000;
    jest.advanceTimersByTime(100);

    handle.cancel();
    expect(mocks.onOfficialMeasuringEnd).toHaveBeenCalledTimes(1);
    expect(mocks.submitRound).not.toHaveBeenCalled();
  });
});
