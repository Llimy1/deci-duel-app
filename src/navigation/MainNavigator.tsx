import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from '../theme';

import type { HomeStackParamList, DiaryStackParamList, RankingStackParamList, ProfileStackParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import SoloMeasureScreen from '../screens/SoloMeasureScreen';
import MatchingScreen from '../screens/MatchingScreen';
import MatchFoundScreen from '../screens/game/MatchFoundScreen';
import CountdownScreen from '../screens/CountdownScreen';
import MeasureScreen from '../screens/MeasureScreen';
import RoundBreakScreen from '../screens/game/RoundBreakScreen';
import ResultScreen from '../screens/ResultScreen';

import CalendarScreen from '../screens/diary/CalendarScreen';
import DayDetailScreen from '../screens/diary/DayDetailScreen';

import LeaderboardScreen from '../screens/social/LeaderboardScreen';
import FriendsScreen from '../screens/social/FriendsScreen';

import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import AchievementsScreen from '../screens/profile/AchievementsScreen';
import HistoryScreen from '../screens/profile/HistoryScreen';
import DailyChallengeScreen from '../screens/profile/DailyChallengeScreen';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const DiaryStack = createNativeStackNavigator<DiaryStackParamList>();
const RankingStack = createNativeStackNavigator<RankingStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator();

const SCREEN_OPT = {
  headerShown: false,
  contentStyle: { backgroundColor: C.bg },
};

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ ...SCREEN_OPT, animation: 'fade_from_bottom' }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="SoloMeasure" component={SoloMeasureScreen} options={{ animation: 'slide_from_bottom' }} />
      <HomeStack.Screen name="Matching" component={MatchingScreen} options={{ animation: 'slide_from_bottom' }} />
      <HomeStack.Screen name="MatchFound" component={MatchFoundScreen} options={{ animation: 'fade' }} />
      <HomeStack.Screen name="Countdown" component={CountdownScreen} options={{ animation: 'fade' }} />
      <HomeStack.Screen name="Measure" component={MeasureScreen} options={{ animation: 'fade' }} />
      <HomeStack.Screen name="RoundBreak" component={RoundBreakScreen} options={{ animation: 'fade' }} />
      <HomeStack.Screen name="Result" component={ResultScreen} options={{ animation: 'slide_from_bottom' }} />
    </HomeStack.Navigator>
  );
}

function DiaryStackNav() {
  return (
    <DiaryStack.Navigator screenOptions={SCREEN_OPT}>
      <DiaryStack.Screen name="Calendar" component={CalendarScreen} />
      <DiaryStack.Screen name="DayDetail" component={DayDetailScreen} options={{ animation: 'slide_from_right' }} />
      <DiaryStack.Screen name="SoloMeasure" component={SoloMeasureScreen} options={{ animation: 'slide_from_bottom' }} />
    </DiaryStack.Navigator>
  );
}

function RankingStackNav() {
  return (
    <RankingStack.Navigator screenOptions={SCREEN_OPT}>
      <RankingStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <RankingStack.Screen name="Friends" component={FriendsScreen} options={{ animation: 'slide_from_right' }} />
    </RankingStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={SCREEN_OPT}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStack.Screen name="Achievements" component={AchievementsScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStack.Screen name="History" component={HistoryScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStack.Screen name="DailyChallenge" component={DailyChallengeScreen} options={{ animation: 'slide_from_right' }} />
    </ProfileStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bgElev,
          borderTopColor: C.line,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 60,
        },
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.textMute,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'JetBrainsMono_400Regular',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate('HomeTab', { screen: 'Home' });
          },
        })}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔥</Text>,
        }}
      />
      <Tab.Screen
        name="DiaryTab"
        component={DiaryStackNav}
        options={{
          tabBarLabel: '다이어리',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="RankingTab"
        component={RankingStackNav}
        options={{
          tabBarLabel: '랭킹',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNav}
        options={{
          tabBarLabel: '나',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
