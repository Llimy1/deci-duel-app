const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// EAS Build는 매번 `expo prebuild`로 ios/Podfile을 새로 생성하므로 직접 수정은 의미 없음.
// AppCheckCore가 GoogleUtilities/RecaptchaInterop(모듈 미정의 Swift pod)에 의존하는데,
// use_frameworks! 없이 plain static library로 통합 시 "cannot yet be integrated as
// static libraries" 경고 뒤 pod install이 비정상 종료되는 문제가 있어,
// use_modular_headers!를 강제로 주입해 모든 pod에 모듈맵을 생성하게 한다.
// (@react-native-google-signin/google-signin + react-native-google-mobile-ads가
// 둘 다 AppCheckCore를 끌어옴)
function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          'use_expo_modules!',
          'use_expo_modules!\n  use_modular_headers!'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
}

module.exports = withModularHeaders;
