import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

export default function DropletTabsLayout() {
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
                name="backups"
                options={{
                    title: 'Backups',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'cloud-download-outline' : 'cloud-download-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="snapshots"
                options={{
                    title: 'Snapshots',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'camera-outline' : 'camera-outline'}
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
