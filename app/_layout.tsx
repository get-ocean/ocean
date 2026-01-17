import { queryClient } from '@/lib/query'
import { storage } from '@/lib/storage'
import { COLORS } from '@/theme/colors'
import * as Sentry from '@sentry/react-native'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { isRunningInExpoGo } from 'expo'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { activateKeepAwakeAsync } from 'expo-keep-awake'
import { useQuickActionRouting } from 'expo-quick-actions/router'
import { SplashScreen, Stack, useNavigationContainerRef } from 'expo-router'
import { SuperwallProvider } from 'expo-superwall'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    // biome-ignore lint/correctness/noUndeclaredVariables: <>
    environment: __DEV__ ? 'development' : 'production',
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
})

const mmkvPersister = createSyncStoragePersister({
    storage: {
        getItem: (key) => {
            const value = storage.getString(key)
            return value ?? null
        },
        setItem: (key, value) => {
            storage.set(key, value)
        },
        removeItem: (key) => {
            storage.delete(key)
        },
    },
})

// const clearStorage = () => {
//     storage.clearAll()
//     queryClient.clear()
// }
// clearStorage()

function RootLayout() {
    const commonHeaderStyle = {
        headerTransparent: Platform.OS === 'ios',
        headerStyle: isLiquidGlassAvailable()
            ? undefined
            : {
                  backgroundColor: COLORS.bgApp,
              },
        headerTintColor: COLORS.text,
        headerShadowVisible: true,
        headerLargeTitleStyle: {
            color: COLORS.primary, //,Light,
        },
        // headerShadowVisible: false,
        // elevation: 0,
    }

    const commonContentStyle = {
        contentStyle: {
            backgroundColor: COLORS.bgApp,
        },
    }

    useQuickActionRouting()
    const ref = useNavigationContainerRef()

    useEffect(() => {
        if (ref?.current) {
            navigationIntegration.registerNavigationContainer(ref)
        }
    }, [ref])

    useEffect(() => {
        SplashScreen.hide()
        activateKeepAwakeAsync()
    }, [])

    return (
        <SafeAreaProvider>
            <SuperwallProvider
                apiKeys={{
                    ios: process.env.EXPO_PUBLIC_IOS_SUPERWALL_API_KEY,
                    android: process.env.EXPO_PUBLIC_ANDROID_SUPERWALL_API_KEY,
                }}
            >
                <GestureHandlerRootView>
                    <KeyboardProvider statusBarTranslucent={true} navigationBarTranslucent={true}>
                        <PersistQueryClientProvider
                            client={queryClient}
                            persistOptions={{
                                persister: mmkvPersister,
                                dehydrateOptions: {
                                    shouldDehydrateQuery: (query) => query.state.data !== undefined,
                                },
                            }}
                        >
                            <Stack
                                screenOptions={{
                                    navigationBarHidden: true,
                                }}
                            >
                                <Stack.Screen
                                    name="index"
                                    options={{
                                        title: '',
                                        headerShown: false,
                                        gestureEnabled: false,
                                        contentStyle: {
                                            backgroundColor: COLORS.bgApp,
                                        },
                                    }}
                                />
                                <Stack.Screen
                                    name="onboard/index"
                                    options={{
                                        headerShown: false,
                                        gestureEnabled: false,
                                        animation: 'none',
                                    }}
                                />

                                <Stack.Screen
                                    name="login/index"
                                    options={{
                                        title: 'Login',
                                        headerShown: false,
                                        // gestureEnabled: false,
                                        // animation: 'none',
                                        presentation: 'modal',
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                <Stack.Screen
                                    name="home/index"
                                    options={{
                                        title: 'Home',
                                        headerShown: false,
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                <Stack.Screen
                                    name="volumes/[volumeId]/index"
                                    options={{
                                        title: 'Volume',
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                {/* <Stack.Screen
                            name="functions/index"
                            options={{
                                title: 'Functions',
                                headerShown: true,
                                headerLargeTitle: true,
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                                autoHideHomeIndicator: true,
                            }}
                        /> */}

                                {/* <Stack.Screen
                            name="functions/[namespaceId]/[triggerName]/index"
                            options={{
                                title: 'Function',
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                                autoHideHomeIndicator: true,
                            }}
                        /> */}

                                <Stack.Screen
                                    name="domains/[domainName]"
                                    options={{
                                        title: 'Domain',
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                        headerShown: false, //! expo 54 (otherwise double header)
                                    }}
                                />

                                <Stack.Screen
                                    name="spaces/[spaceUrl]/home"
                                    options={{
                                        title: 'Space',
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                <Stack.Screen
                                    name="spaces/[spaceUrl]/browse"
                                    options={{
                                        title: 'Browse',
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                <Stack.Screen
                                    name="loadBalancers/[balancerId]/index"
                                    options={{
                                        title: 'Load Balancer',
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                <Stack.Screen
                                    name="databases/[clusterId]/index"
                                    options={{
                                        title: 'Database',
                                        ...commonHeaderStyle,
                                        ...commonContentStyle,
                                        autoHideHomeIndicator: true,
                                    }}
                                />

                                <Stack.Screen
                                    name="droplets/[dropletId]"
                                    options={{
                                        title: 'Droplet',
                                        headerShown: false,
                                        ...commonContentStyle,
                                    }}
                                />

                                <Stack.Screen
                                    name="apps/[appId]/(tabs)"
                                    options={{
                                        title: 'App',
                                        headerShown: false,
                                        ...commonContentStyle,
                                    }}
                                />

                                {/* <Stack.Screen
                            name="apps/[appId]/components/[componentId]"
                            options={{
                                title: 'Component',
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                            }}
                        /> */}
                            </Stack>
                        </PersistQueryClientProvider>
                    </KeyboardProvider>
                </GestureHandlerRootView>
            </SuperwallProvider>
        </SafeAreaProvider>
    )
}

export default RootLayout
