import { createSpacesAccessKey } from '@/api/mutations'
import { fetchAccount, fetchProjectList } from '@/api/queries'
import Text from '@/components/base/Text'
import { checkLoginCredentials } from '@/lib/login'
import { queryClient } from '@/lib/query'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { router, useNavigation } from 'expo-router'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
    Alert,
    Button,
    Image,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import Animated, {
    interpolate,
    useAnimatedKeyboard,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
    const navigation = useNavigation()

    const connections = usePersistedStore((state) => state.connections)
    const addConnection = usePersistedStore((state) => state.addConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)

    const apiTokenRef = useRef<string>('')

    const [isLoading, setIsLoading] = useState(false)
    const [isModal, setIsModal] = useState(false)

    const showCloseButton = useMemo(() => {
        return Platform.OS === 'android' && isModal
    }, [isModal])

    const keyboard = useAnimatedKeyboard({
        isStatusBarTranslucentAndroid: true,
        isNavigationBarTranslucentAndroid: true,
    })

    const helpBoxAnimatedStyles = useAnimatedStyle(() => {
        const isKeyboardVisible = interpolate(keyboard.height.value, [0, 1], [0, 1], 'clamp')

        return {
            opacity: withTiming(isKeyboardVisible ? 0 : 1),
            bottom: withTiming(isKeyboardVisible ? -300 : 0),
        }
    })

    const validateToken = useCallback(async (token: string) => {
        console.log('[validateToken]  token', token)
        try {
            const response = await checkLoginCredentials(token)
            return response
        } catch {
            Alert.alert('Invalid token', 'Please enter a valid Digital Ocean API token')
        }
    }, [])

    const handleLogin = useCallback(async () => {
        const token = apiTokenRef.current.trim() || ''
        if (!token) {
            Alert.alert('Error', 'Please enter an API token')
            return
        }

        setIsLoading(true)

        try {
            const user = await validateToken(token)
            if (!user || !user.uuid || !user.email) {
                Alert.alert('Error', 'Invalid token')
                return
            }

            if (connections.find((c) => c.id === user.uuid)) {
                Alert.alert('Error', 'You are already connected to this account')
                return
            }

            addConnection({
                id: user.uuid,
                email: user.email,
                apiToken: token,
                currentProjectId: null,
                spacesAccessKey: null,
            })

            const spacesAccessKeyName = `ocean-${Date.now()}`

            let spacesAccessKey: { access_key: string; secret_key: string } | null = null

            try {
                const createdKey = await createSpacesAccessKey({
                    name: spacesAccessKeyName,
                    grants: [{ bucket: '', permission: 'fullaccess' }],
                    connectionId: user.uuid,
                })
                if (!createdKey || !createdKey.access_key || !createdKey.secret_key) {
                    throw new Error('Could not create spaces access key')
                }
                spacesAccessKey = {
                    access_key: createdKey.access_key,
                    secret_key: createdKey.secret_key,
                }
            } catch {
                Alert.alert(
                    'Error',
                    'Could not create spaces access key, please use an API token with "Full Access" permissions.'
                )
            }

            if (!spacesAccessKey) {
                return
            }

            // failed to create, you will not be able to browse spaces

            usePersistedStore.setState((prev) => ({
                ...prev,
                connections: [
                    ...(prev.connections || []).filter((c) => c.id !== user.uuid),
                    {
                        id: user.uuid,
                        email: user.email,
                        apiToken: token,
                        currentProjectId: null,
                        spacesAccessKey: {
                            name: spacesAccessKeyName,
                            id: spacesAccessKey.access_key,
                            secret: spacesAccessKey.secret_key,
                        },
                    },
                ],
            }))

            switchConnection({ connectionId: user.uuid })

            await queryClient.prefetchQuery({
                queryKey: ['account'],
                queryFn: async () => fetchAccount(),
            })

            await queryClient.prefetchQuery({
                queryKey: ['projects'],
                queryFn: async () => fetchProjectList({ connectionId: user.uuid }),
            })

            router.replace('/home')
        } catch (error) {
            console.error('[handleLogin] error', error)
            Alert.alert('Error', 'Could not connect to Digital Ocean')
        } finally {
            setIsLoading(false)
        }
    }, [validateToken, switchConnection, addConnection, connections])

    const openApiDocs = useCallback(() => {
        try {
            Linking.openURL(
                'https://docs.digitalocean.com/reference/api/create-personal-access-token/'
            )
        } catch {}
    }, [])

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        setIsModal(connections.length > 0)
    }, [])

    useLayoutEffect(() => {
        navigation.setOptions({
            gestureEnabled: isModal,
            // animation: isModal ? undefined : 'none',
        })
    }, [navigation, isModal])

    return (
        <>
            <SafeAreaView style={{ flex: 1 }} edges={Platform.OS === 'android' ? ['top'] : []}>
                <KeyboardAwareScrollView
                    bottomOffset={20}
                    keyboardShouldPersistTaps="handled"
                    style={{
                        flex: 1,
                        paddingTop: 120,
                        backgroundColor: COLORS.bgApp,
                    }}
                >
                    {showCloseButton && (
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                top: -50, // to negate the paddingTop
                                right: 30,
                                backgroundColor: '#ffffff28',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 16,
                                height: 32,
                                width: 32,
                            }}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="close" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    )}

                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            gap: 64,
                            maxWidth: 320,
                            width: '100%',
                        }}
                    >
                        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                            <Image
                                source={require('@/assets/launch-icon.png')}
                                style={{
                                    width: 200,
                                    height: 200,
                                    marginBottom: 24,
                                }}
                                resizeMode="contain"
                            />
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                    color: COLORS.text,
                                }}
                            >
                                {isModal ? 'Add Account' : 'Welcome to Ocean'}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: '400',
                                    textAlign: 'center',
                                    color: COLORS.textMuted,
                                }}
                            >
                                {isModal
                                    ? 'Add an API token for a new connection!'
                                    : 'Add your API token to get started!'}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'column', gap: 10 }}>
                            <Text style={{ color: COLORS.text }}>API Token</Text>
                            <TextInput
                                style={{
                                    height: 48,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    backgroundColor: COLORS.bgSecondary,
                                    color: COLORS.text,
                                    fontSize: 16,
                                }}
                                placeholder="dop_v1_..."
                                placeholderTextColor={COLORS.textMuted}
                                secureTextEntry={true}
                                autoCapitalize="none"
                                autoComplete="off"
                                autoCorrect={false}
                                keyboardAppearance="dark"
                                importantForAutofill="no"
                                onChangeText={(text) => {
                                    apiTokenRef.current = text
                                }}
                                returnKeyLabel="Connect"
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                            <View style={{ marginTop: 20 }}>
                                <Button
                                    title={isLoading ? 'Connecting...' : 'Connect'}
                                    onPress={handleLogin}
                                    disabled={isLoading}
                                    color={COLORS.primary}
                                />
                            </View>
                        </View>
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
            {!isModal && (
                <Animated.View style={[helpBoxAnimatedStyles]}>
                    <Pressable style={styles.helpBox} onPress={openApiDocs}>
                        <Text style={styles.helpTitle}>Need help finding your API key?</Text>
                        <Text style={styles.helpText}>
                            Tap to learn how to generate an API token.
                        </Text>
                    </Pressable>
                </Animated.View>
            )}
        </>
    )
}

const styles = StyleSheet.create({
    helpBox: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,

        backgroundColor: COLORS.bgSecondary,
        marginHorizontal: 24,
        padding: 24,

        // marginBottom: Math.max(rt.insets.bottom, 25),
        marginBottom: 25,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.hr,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    helpText: { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
})
