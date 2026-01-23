import { fetchDropletStats } from '@/api/queries'
import InfoRow from '@/components/InfoRow'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { useSearchParams } from '@/lib/hooks'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useQuery } from '@tanstack/react-query'
import { usePlacement, useUser } from 'expo-superwall'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { Alert } from 'react-native'

export default function DropletStatsScreen() {
    const { dropletId } = useSearchParams<{ dropletId: string }>()

    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()

    const dropletStatsQuery = useQuery({
        queryKey: ['droplets', dropletId, 'stats'],
        queryFn: () => fetchDropletStats({ id: dropletId }),
        enabled: !!dropletId,
    })

    const dropletStats = useMemo(() => dropletStatsQuery.data, [dropletStatsQuery.data])!

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: dropletStatsQuery.isLoading,
            isError: !!dropletStatsQuery.error,
            hasData: !!dropletStats,
            emptyLabel: 'No stats found',
            errorLabel: `Error loading stats (${dropletStatsQuery.error?.message || 'Unknown error'})`,
        })
    }, [
        dropletStats,
        dropletStatsQuery.error,
        dropletStatsQuery.error?.message,
        dropletStatsQuery.isLoading,
    ])

    return (
        <>
            {Placeholder || (
                <ScrollView
                    style={{ flex: 1 }}
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 28, flexDirection: 'column' }}
                    refreshControl={<RefreshControl onRefresh={dropletStatsQuery.refetch} />}
                >
                    <View
                        style={{
                            flexDirection: 'column',
                            gap: 16,
                        }}
                    >
                        {subscriptionStatus.status === 'INACTIVE' && (
                            <TouchableOpacity
                                style={{
                                    padding: 16,
                                    marginHorizontal: 16,
                                    borderRadius: 16,
                                    backgroundColor: COLORS.primary,
                                }}
                                onPress={() => {
                                    registerPlacement({
                                        placement: 'TapWidget',
                                        feature: () => {
                                            Alert.alert(
                                                'Congrats!',
                                                'You can now go to your homescreen and search for "Ocean" widgets.'
                                            )
                                        },
                                    }).catch((error) => {
                                        Sentry.captureException(error)
                                        console.error('Error registering TapWidget', error)
                                        Alert.alert(
                                            'Error',
                                            'Something went wrong, please try again.'
                                        )
                                    })
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.bgApp,
                                        alignSelf: 'center',
                                        fontSize: 16,
                                        fontWeight: 600,
                                    }}
                                >
                                    Tap to see these stats on your home screen
                                </Text>
                            </TouchableOpacity>
                        )}

                        <StatsSection title="Bandwidth" icon="server-outline">
                            <InfoRow
                                borderTop={false}
                                label="Outbound (Public)"
                                value={`${Math.round(dropletStats.bandwidth.outbound.public)} MB`}
                            />
                            <InfoRow
                                label="Inbound (Public)"
                                value={`${Math.round(dropletStats.bandwidth.inbound.public)} MB`}
                            />
                            <InfoRow
                                label="Outbound (Private)"
                                value={`${Math.round(dropletStats.bandwidth.outbound.private)} MB`}
                            />
                            <InfoRow
                                borderBottom={false}
                                label="Inbound (Private)"
                                value={`${Math.round(dropletStats.bandwidth.inbound.private)} MB`}
                            />
                        </StatsSection>

                        <StatsSection title="CPU" icon="speedometer-outline">
                            <InfoRow
                                borderTop={false}
                                label="CPU Usage (Avg)"
                                value={`${dropletStats.cpu.averagePercent.toFixed(1)}%`}
                            />
                            <InfoRow
                                borderBottom={false}
                                label="CPU Usage (Now)"
                                value={`${dropletStats.cpu.latestPercent.toFixed(1)}%`}
                            />
                        </StatsSection>

                        <StatsSection title="Disk & Memory" icon="cube-outline">
                            <InfoRow
                                borderTop={false}
                                label="Memory Usage (Now)"
                                value={`${dropletStats.memory.toFixed(1)}%`}
                            />
                            <InfoRow
                                borderBottom={false}
                                label="Disk Usage (Now)"
                                value={`${dropletStats.disk.toFixed(1)}%`}
                            />
                        </StatsSection>

                        <StatsSection icon="pulse-outline" title="Load">
                            <InfoRow
                                borderTop={false}
                                label="15m (Avg / vCPU)"
                                value={`${dropletStats.load15.normalized.average.toFixed(2)}`}
                            />
                            <InfoRow
                                label="5m (Avg / vCPU)"
                                value={`${dropletStats.load5.normalized.average.toFixed(2)}`}
                            />
                            <InfoRow
                                label="1m (Avg / vCPU)"
                                value={`${dropletStats.load1.normalized.average.toFixed(2)}`}
                            />
                            <InfoRow
                                label="15m (Now)"
                                value={`${dropletStats.load15.latest.toFixed(2)}`}
                            />
                            <InfoRow
                                label="5m (Now)"
                                value={`${dropletStats.load5.latest.toFixed(2)}`}
                            />
                            <InfoRow
                                borderBottom={false}
                                label="1m (Now)"
                                value={`${dropletStats.load1.latest.toFixed(2)}`}
                            />
                        </StatsSection>
                    </View>
                </ScrollView>
            )}
        </>
    )
}

function StatsSection({
    icon,
    title,
    children,
}: { icon: keyof typeof Ionicons.glyphMap; title: string; children: ReactNode }) {
    return (
        <View
            style={{
                flexDirection: 'column',
                gap: 0,
                marginHorizontal: 16,
                borderRadius: 16,
                backgroundColor: COLORS.bgSecondary,
                borderColor: COLORS.hr,
                borderWidth: 0.5,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6.9,
                    margin: 16,
                    marginBottom: 8,
                }}
            >
                <Ionicons name={icon} size={24} color={COLORS.text} />
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{title}</Text>
            </View>

            <View
                style={{
                    flexDirection: 'column',
                    gap: 0,
                }}
            >
                {children}
            </View>
        </View>
    )
}
