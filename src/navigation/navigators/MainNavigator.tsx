import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import HomeScreen from '../../features/home/screens/HomeScreen';
import LearningScreen from '../../features/learning/screens/LearningScreen';
import GamesScreen from '../../features/game/screens/GamesScreen';
import ProfileScreen from '../../features/profile/screens/ProfileScreen';
import { AIAgentDemo } from '../../features/ai-agent/screens/AIAgentDemo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../shared/styles/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string = 'home';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Learning':
              iconName = 'school';
              break;
            case 'Games':
              iconName = 'sports-esports';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            case 'AIDemo':
              iconName = 'smart-toy';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Learning"
        component={LearningScreen}
        options={{
          title: 'Learn',
        }}
      />
      <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{
          title: 'Games',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Tab.Screen
        name="AIDemo"
        component={AIAgentDemo}
        options={{
          title: 'AI Demo',
        }}
      />
    </Tab.Navigator>
  );
};
