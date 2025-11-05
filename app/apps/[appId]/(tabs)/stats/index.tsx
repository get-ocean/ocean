import { fetchAppStats } from '@/api/queries'
import InfoRow from '@/components/InfoRow'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import { useSearchParams } from '@/lib/hooks'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ScrollView, View } from 'react-native'

export default function AppStatsScreen() {
    const { appId } = useSearchParams<{ appId: string }>()

    const appStatsQuery = useQuery({
        queryKey: ['apps', appId, 'stats'],
        queryFn: () => fetchAppStats({ appId }),
        enabled: !!appId,
    })

    const appStats = useMemo(() => appStatsQuery.data, [appStatsQuery.data])!

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: appStatsQuery.isLoading,
            isError: appStatsQuery.isError,
            hasData: !!appStats,
            emptyLabel: 'No stats found',
            errorLabel: `Error loading stats (${appStatsQuery.error?.message || 'Unknown error'})`,
        })
    }, [appStats, appStatsQuery.isError, appStatsQuery.isLoading, appStatsQuery.error?.message])

    if (Placeholder || appStats === undefined) {
        Placeholder
    }

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 0, flexDirection: 'column' }}
            refreshControl={<RefreshControl onRefresh={appStatsQuery.refetch} />}
        >
            <View
                style={{
                    flexDirection: 'column',
                    gap: 0,
                }}
            >
                <InfoRow
                    label="Bandwidth"
                    icon="download-outline"
                    value={`${appStats?.bandwidth.average.toFixed(2)} GB`}
                />
                <InfoRow
                    label="CPU (avg)"
                    icon="speedometer-outline"
                    value={`${appStats?.cpu.average.toFixed(2)}%`}
                />
                <InfoRow
                    label="Memory (avg)"
                    icon="hardware-chip-outline"
                    value={`${appStats?.memory.average.toFixed(2)}%`}
                />
                <InfoRow
                    label="Restart Count"
                    icon="refresh-outline"
                    value={`${appStats?.restartCount.sum}`}
                />
            </View>
        </ScrollView>
    )
}
