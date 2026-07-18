import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

import DashboardScreen from './screens/DashboardScreen'
import MonitorsScreen from './screens/MonitorsScreen'
import AIScreen from './screens/AIScreen'
import MarketplaceScreen from './screens/MarketplaceScreen'
import ProfileScreen from './screens/ProfileScreen'

const Tab = createBottomTabNavigator()

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
                Dashboard: 'earth',
                Monitors: 'analytics',
                AI: 'sparkles',
                Marketplace: 'store',
                Profile: 'person',
              }
              const icon = iconMap[route.name] || 'circle'
              return <Ionicons name={focused ? icon : `${icon}-outline`} size={size} color={color} />
            },
            tabBarActiveTintColor: '#10b981',
            tabBarInactiveTintColor: '#71717a',
            headerStyle: { backgroundColor: '#10b981' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: '🌍 EnviroDash' }} />
          <Tab.Screen name="Monitors" component={MonitorsScreen} options={{ title: '📊 Monitors' }} />
          <Tab.Screen name="AI" component={AIScreen} options={{ title: '✨ AI Assistant' }} />
          <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: '📦 Market' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '👤 Profile' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
