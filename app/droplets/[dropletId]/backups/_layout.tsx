import { COLORS } from '@/theme/colors'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function DropletBackupsLayout() {
    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerBlurEffect: isLiquidGlassAvailable() ? undefined : 'regular',
                headerShadowVisible: true,
                headerLargeTitleStyle: {
                    color: COLORS.text,
                },
                headerTintColor: COLORS.text,
                headerStyle: isLiquidGlassAvailable()
                    ? undefined
                    : {
                          backgroundColor: COLORS.bgApp,
                      },
                contentStyle: {
                    backgroundColor: COLORS.bgApp,
                },
                title: 'Backups',
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    )
}
