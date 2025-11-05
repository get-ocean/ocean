import { fetchApp, fetchAppActiveDeploymentLogs } from '@/api/queries'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { useFlashlistProps, useSearchParams } from '@/lib/hooks'
import { COLORS } from '@/theme/colors'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import ms from 'ms'
import { useEffect, useMemo, useRef } from 'react'

export default function AppLogsScreen() {
    const { appId } = useSearchParams<{ appId: string }>()
    const flashListRef = useRef<FlashListRef<any>>(null)

    const appQuery = useQuery({
        queryKey: ['apps', appId],
        queryFn: () => fetchApp({ id: appId }),
        enabled: !!appId,
    })

    const app = useMemo(() => appQuery.data, [appQuery.data])

    const appLogsQuery = useQuery({
        queryKey: ['apps', appId, 'logs'],
        queryFn: async () => {
            const urls = await fetchAppActiveDeploymentLogs({ appId, type: 'RUN' })
            if (urls.live_url) {
                const logsResponse = await fetch(urls.live_url)
                const logs = await logsResponse.text()
                return logs.split('\n').map((log) => {
                    const splittedLog = log.split(' ')
                    const componentName = splittedLog[0]
                    const message = splittedLog.slice(1).join(' ')
                    return { componentName, message }
                })
            }
            return []
        },
        refetchInterval: ms('10s'),
        refetchIntervalInBackground: false,
        enabled: !!appId,
    })

    const appLogs = useMemo(() => appLogsQuery.data, [appLogsQuery.data])

    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (appLogs && appLogs.length > 0) {
            // Small delay to ensure the list has rendered the new items
            setTimeout(() => {
                flashListRef.current?.scrollToEnd({ animated: true })
            }, 100)
        }
    }, [appLogs])

    const Placeholder = useMemo(() => {
        const emptyApp = buildPlaceholder({
            isLoading: appQuery.isLoading,
            isError: appQuery.isError,
            hasData: !!app,
            emptyLabel: 'No app found',
            errorLabel: `Error loading app (${appQuery.error?.message || 'Unknown error'})`,
        })

        if (emptyApp) return emptyApp

        const emptyAppLogs = buildPlaceholder({
            isLoading: appLogsQuery.isLoading,
            isError: appLogsQuery.isError,
            hasData: !!appLogs,
            emptyLabel: 'No app logs found',
            errorLabel: `Error loading app logs (${appLogsQuery.error?.message || 'Unknown error'})`,
        })

        return emptyAppLogs
    }, [
        appQuery.isLoading,
        appQuery.isError,
        appQuery.error?.message,
        app,
        appLogsQuery.isLoading,
        appLogsQuery.isError,
        appLogsQuery.error?.message,
        appLogs,
    ])
    const { overrideProps } = useFlashlistProps(Placeholder)

    return (
        <>
            <FlashList
                ref={flashListRef}
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={
                    <RefreshControl
                        onRefresh={async () => {
                            await Promise.all([appQuery.refetch(), appLogsQuery.refetch()])
                        }}
                    />
                }
                showsVerticalScrollIndicator={false}
                data={Placeholder ? [] : appLogs}
                overrideProps={overrideProps}
                ListEmptyComponent={Placeholder}
                renderItem={({ item: log }) => {
                    return (
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: 400,
                                color: COLORS.text,
                                paddingLeft: 16,
                            }}
                            numberOfLines={100}
                        >
                            <Text style={{ fontWeight: 600, color: COLORS.primaryLight }}>
                                {log.componentName}
                            </Text>{' '}
                            {log.message}
                        </Text>
                    )
                }}
            />
        </>
    )
}
