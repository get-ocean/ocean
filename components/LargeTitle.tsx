import { COLORS } from '@/theme/colors'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack } from 'expo-router'
import { type ReactNode, useMemo } from 'react'
import { Platform } from 'react-native'

export default function LargeTitle({
    name,
    title,
    headerLeft,
    headerRight,
}: {
    name: string
    title: string
    headerLeft?: ReactNode
    headerRight?: ReactNode
}) {
    const HeaderLeft = useMemo(() => {
        if (headerLeft) {
            return () => headerLeft
        }
        return undefined
    }, [headerLeft])

    const HeaderRight = useMemo(() => {
        if (headerRight) {
            return () => headerRight
        }
        return undefined
    }, [headerRight])

    return (
        <Stack.Screen
            key={name}
            name={name}
            options={{
                title,
                headerShown: true,
                headerLargeTitle: true,
                headerLeft: HeaderLeft,
                headerRight: HeaderRight,
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
            }}
        />
    )
}
