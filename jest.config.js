/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // 테스트 대상: 순수 TS 파일 (RN 의존성 없는 store/utils)
  // RN/Expo 전용 모듈은 아래에서 mock
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^expo-.*$': '<rootDir>/src/__mocks__/expo-modules.ts',
    '^@react-native-community/netinfo$': '<rootDir>/src/__mocks__/netinfo.ts',
  },
};
