import { fetchApiStatus } from '@/api/queries'
import Text from '@/components/base/Text'
import { COLORS } from '@/theme/colors'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import { useMemo } from 'react'
import { Alert, TouchableOpacity, View } from 'react-native'

export default function ApiStatus() {
    const apiStatusQuery = useQuery({
        queryKey: ['apiStatus'],
        queryFn: fetchApiStatus,
    })

    const isOperational = useMemo(
        () => apiStatusQuery?.data?.indicator === 'none',
        [apiStatusQuery.data]
    )

    if (!apiStatusQuery.data) {
        return null
    }

    return (
        <TouchableOpacity
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                Alert.alert(
                    'White Flash Warning',
                    'The status page has a strong white background. You may want to turn your brightness down.',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'OK',
                            onPress: () => {
                                try {
                                    Linking.openURL('https://status.digitalocean.com')
                                } catch {
                                    Alert.alert('Error', 'Failed to open link, please try again.')
                                }
                            },
                        },
                    ]
                )
            }}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
            }}
        >
            <View
                style={{
                    width: 10,
                    height: 10,
                    backgroundColor: isOperational ? COLORS.primary : COLORS.error,
                    borderRadius: 5,
                }}
            />
            <Text
                style={{
                    color: isOperational ? COLORS.primary : COLORS.error,
                }}
            >
                {apiStatusQuery?.data?.description}
            </Text>
        </TouchableOpacity>
    )
}
