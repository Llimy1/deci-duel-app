import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from '../theme';
import type { AuthStackParamList } from './types';

import LoginScreen from '../screens/auth/LoginScreen';
import DevSignupScreen from '../screens/auth/DevSignupScreen';
import NicknameScreen from '../screens/auth/NicknameScreen';
import PhotoScreen from '../screens/auth/PhotoScreen';
import MicPermissionScreen from '../screens/auth/MicPermissionScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="DevSignup" component={DevSignupScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="Photo" component={PhotoScreen} />
      <Stack.Screen name="MicPermission" component={MicPermissionScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
