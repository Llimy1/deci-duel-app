// Mock for @react-native-community/netinfo
const NetInfo = {
  addEventListener: jest.fn(() => jest.fn()), // returns unsubscribe fn
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
};

export default NetInfo;
