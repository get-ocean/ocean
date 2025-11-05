import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

export default function AppTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primaryLight,
                tabBarStyle: {
                    borderTopColor: COLORS.hr,
                    backgroundColor: COLORS.bgApp,
                    borderTopWidth: Platform.OS === 'ios' ? 1 : 0.2,
                    paddingTop: 8,
                    paddingBottom: 24,
                    height: 84,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'rocket' : 'rocket-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="logs"
                options={{
                    title: 'Logs',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'code-slash' : 'code-slash-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: 'Stats',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'stats-chart' : 'stats-chart-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    )
}
