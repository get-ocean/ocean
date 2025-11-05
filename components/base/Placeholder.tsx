import ActivityIndicator from '@/components/base/ActivityIndicator'
import Text from '@/components/base/Text'
import { COLORS } from '@/theme/colors'
import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'

export default function buildPlaceholder({
    isLoading,
    isError,
    hasData,
    emptyLabel,
    errorLabel,
    emptyButton,
    emptyImage = true,
}: {
    isLoading: boolean
    isError: boolean
    hasData: boolean | undefined
    emptyLabel: string | React.ReactNode
    errorLabel: string | React.ReactNode
    emptyButton?: React.ReactNode
    emptyImage?: boolean
}) {
    if (isLoading) {
        return (
            <PlaceholderRoot>
                <LoadingIndicatorWithHint />
            </PlaceholderRoot>
        )
    }
    if (isError) {
        return (
            <PlaceholderRoot>
                <Text
                    style={{
                        fontSize: 16,
                        color: COLORS.red500,
                        fontWeight: 500,
                        textAlign: 'center',
                        maxWidth: 320,
                    }}
                    numberOfLines={10}
                >
                    {typeof errorLabel === 'string' ? <Text>{errorLabel}</Text> : errorLabel}
                </Text>
            </PlaceholderRoot>
        )
    }
    if (!hasData) {
        return (
            <PlaceholderRoot paddingBottom={emptyImage ? 200 : 150}>
                {emptyImage ? (
                    <Image
                        source={require('@/assets/do-fish.png')}
                        style={{ height: 256, resizeMode: 'contain' }}
                    />
                ) : null}
                <Text
                    style={{
                        fontSize: 16,
                        color: COLORS.text,
                        fontWeight: 500,
                        textAlign: 'center',
                        maxWidth: 320,
                    }}
                    numberOfLines={10}
                >
                    {typeof emptyLabel === 'string' ? <Text>{emptyLabel}</Text> : emptyLabel}
                </Text>
                {emptyButton ? emptyButton : null}
            </PlaceholderRoot>
        )
    }
    return undefined
}

function LoadingIndicatorWithHint() {
    const [shouldShowHint, setShouldShowHint] = useState(false)

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setShouldShowHint(true)
        }, 4000)
        return () => {
            clearTimeout(timeoutId)
        }
    }, [])

    return (
        <>
            <ActivityIndicator />
            {shouldShowHint ? (
                <Text
                    style={{
                        fontSize: 16,
                        color: COLORS.text,
                        textAlign: 'center',
                        fontWeight: 500,
                        maxWidth: 320,
                        marginTop: 16,
                    }}
                >
                    This could take a while...
                </Text>
            ) : null}
        </>
    )
}

function PlaceholderRoot({
    children,
    paddingBottom = 150,
}: { children: React.ReactNode; paddingBottom?: number }) {
    return (
        <View
            style={{
                height: '100%',
                gap: 32,
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom,
            }}
        >
            {children}
        </View>
    )
}
