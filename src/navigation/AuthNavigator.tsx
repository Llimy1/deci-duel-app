import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from '../theme';
import type { AuthStackParamList } from './types';

import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import DevSignupScreen from '../screens/auth/DevSignupScreen';
import NicknameScreen from '../screens/auth/NicknameScreen';
import PhotoScreen from '../screens/auth/PhotoScreen';
import TermsScreen from '../screens/auth/TermsScreen';
import MicTestScreen from '../screens/auth/MicTestScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

type Props = {
  initialRouteName: keyof AuthStackParamList;
};

export default function AuthNavigator({ initialRouteName }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="DevSignup" component={DevSignupScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Photo" component={PhotoScreen} />
      <Stack.Screen name="MicTest" component={MicTestScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
