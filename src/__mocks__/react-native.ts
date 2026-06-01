// Minimal React Native mock for store unit tests
export const Alert = { alert: jest.fn() };
export const Platform = { OS: 'ios' };
export const Dimensions = { get: jest.fn(() => ({ width: 375, height: 812 })) };
