import { deleteDatabaseCluster } from '@/api/mutations'
import {
    fetchDatabaseCluster,
    fetchDatabaseClusterFirewallRules,
    fetchDatabaseClusterReplicas,
} from '@/api/queries'
import InfoRow from '@/components/InfoRow'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import { DB_CLUSTER_ENGINE_LABELS } from '@/lib/constants'
import { queryClient } from '@/lib/query'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function DatabaseClusterHomeScreen() {
    const { clusterId } = useLocalSearchParams<{ clusterId: string }>()

    const navigation = useNavigation()

    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const databaseClusterQuery = useQuery({
        queryKey: ['databases', clusterId],
        queryFn: () => fetchDatabaseCluster({ id: clusterId }),
        enabled: !!clusterId,
    })

    const deleteDatabaseClusterMutation = useMutation({
        mutationFn: async () => await deleteDatabaseCluster({ databaseClusterUuid: clusterId }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    // const databaseClusterCertificateQuery = useQuery({
    //     queryKey: ['databases', clusterId, 'certificate'],
    //     queryFn: () => fetchDatabaseClusterCertificate({ id: clusterId }),
    // })

    const databaseClusterFirewallRulesQuery = useQuery({
        queryKey: ['databases', clusterId, 'firewallRules'],
        queryFn: () => fetchDatabaseClusterFirewallRules({ id: clusterId }),
        enabled: !!clusterId,
    })

    const databaseClusterReplicasQuery = useQuery({
        queryKey: ['databases', clusterId, 'replicas'],
        queryFn: () => fetchDatabaseClusterReplicas({ id: clusterId }),
        enabled: !!clusterId,
    })

    const cluster = useMemo(() => databaseClusterQuery.data, [databaseClusterQuery.data])!
    // const clusterCertificate = useMemo(
    //     () => databaseClusterCertificateQuery.data,
    //     [databaseClusterCertificateQuery.data]
    // )

    const clusterUsers = useMemo(() => cluster?.users, [cluster?.users])

    const clusterFirewallRules = useMemo(
        () => databaseClusterFirewallRulesQuery.data,
        [databaseClusterFirewallRulesQuery.data]
    )
    const clusterReplicas = useMemo(
        () => databaseClusterReplicasQuery.data,
        [databaseClusterReplicasQuery.data]
    )

    const clusterEngine = useMemo(
        () =>
            cluster?.engine
                ? DB_CLUSTER_ENGINE_LABELS[cluster.engine as keyof typeof DB_CLUSTER_ENGINE_LABELS]
                : 'Unknown',
        [cluster?.engine]
    )

    const clusterVpsConnection = useMemo(() => {
        if (!cluster?.private_connection) return null
        return `https://${cluster.private_connection.user}:${cluster.private_connection.password}@${cluster.private_connection.host}:${cluster.private_connection.port}`
    }, [cluster?.private_connection])

    const clusterConnection = useMemo(() => {
        if (!cluster?.connection) return null
        return `https://${cluster.connection.user}:${cluster.connection.password}@${cluster.connection.host}:${cluster.connection.port}`
    }, [cluster?.connection])

    const clusterUiConnection = useMemo(() => {
        if (!cluster?.ui_connection) return null
        return `https://${cluster.ui_connection.user}:${cluster.ui_connection.password}@${cluster.ui_connection.host}:${cluster.ui_connection.port}`
    }, [cluster?.ui_connection])

    const clusterVersion = useMemo(
        () => cluster?.semantic_version || cluster?.version || 'Unknown',
        [cluster?.semantic_version, cluster?.version]
    )

    const clusterMemory = useMemo(() => {
        if (!cluster?.size) return 'Unknown'
        const [_, __, cpu, memory] = cluster.size.split('-')
        return `${memory.replace('gb', '')} GB`
    }, [cluster?.size])

    const clusterCpu = useMemo(() => {
        if (!cluster?.size) return 'Unknown'
        const [_, __, cpu, memory] = cluster.size.split('-')
        return `${cpu.replace('cpu', '')} CPU`
    }, [cluster?.size])

    const clusterSize = useMemo(() => {
        if (!cluster?.storage_size_mib) return 'Unknown'
        return `${(cluster.storage_size_mib / 1024).toFixed()} GB`
    }, [cluster?.storage_size_mib])

    const headerRightLoading = useMemo(() => {
        return deleteDatabaseClusterMutation.isPending
    }, [deleteDatabaseClusterMutation.isPending])

    // console.log('cluster', JSON.stringify(cluster, null, 2))
    // console.log('clusterUsers', JSON.stringify(clusterUsers, null, 2))
    // console.log('clusterFirewallRules', JSON.stringify(clusterFirewallRules, null, 2))
    // console.log('clusterReplicas', JSON.stringify(clusterReplicas, null, 2))

    useLayoutEffect(() => {
        if (!cluster) return
        navigation.setOptions({
            title: cluster.name || cluster.id,
            headerRight: headerRightLoading
                ? () => (
                      <HeaderItem>
                          <ActivityIndicator sm={true} />
                      </HeaderItem>
                  )
                : () => (
                      <ContextMenu
                          dropdownMenuMode={true}
                          actions={[
                              {
                                  title: 'Close',
                                  systemIcon: 'xmark',
                              },
                              {
                                  title: 'Destroy',
                                  systemIcon: 'trash',
                                  destructive: true,
                              },
                          ]}
                          onPress={(e) => {
                              if (e.nativeEvent.name === 'Close') {
                                  if (!acknowledged.swipeLeft) {
                                      acknowledge('swipeLeft')
                                      Alert.alert('Quick Tip', 'You can swipe left to go back!', [
                                          { text: 'Good to know!', style: 'cancel' },
                                      ])
                                  }
                                  router.back()
                                  return
                              }

                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                              if (e.nativeEvent.name === 'Destroy') {
                                  Alert.alert('Are you sure?', 'This action cannot be undone.', [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                          text: 'Destroy',
                                          style: 'destructive',
                                          onPress: () => {
                                              Alert.alert(
                                                  'Are you super duper sure?',
                                                  'The cluster will be deleted and cannot be recovered.',
                                                  [
                                                      {
                                                          text: 'Cancel',
                                                          style: 'cancel',
                                                      },
                                                      {
                                                          text: 'Destroy cluster',
                                                          style: 'destructive',
                                                          onPress: () => {
                                                              deleteDatabaseClusterMutation.mutate()
                                                          },
                                                      },
                                                  ]
                                              )
                                          },
                                      },
                                  ])
                                  return
                              }
                          }}
                      >
                          <HeaderTouchableOpacity
                              style={
                                  isLiquidGlassAvailable()
                                      ? undefined
                                      : {
                                            backgroundColor: COLORS.bgSecondary,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderRadius: 16,
                                            height: 32,
                                            width: 32,
                                        }
                              }
                          >
                              <Ionicons
                                  name="ellipsis-horizontal-sharp"
                                  size={isLiquidGlassAvailable() ? 32 : 18}
                                  color={COLORS.text}
                              />
                          </HeaderTouchableOpacity>
                      </ContextMenu>
                  ),
        })
    }, [
        cluster,
        navigation,
        acknowledge,
        acknowledged,
        headerRightLoading,
        deleteDatabaseClusterMutation.mutate,
    ])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: databaseClusterQuery.isLoading,
            isError: databaseClusterQuery.isError,
            hasData: !!cluster,
            emptyLabel: 'No database cluster found',
            errorLabel: `Error loading database cluster (${databaseClusterQuery.error?.message || 'Unknown error'})`,
        })
    }, [
        cluster,
        databaseClusterQuery.isLoading,
        databaseClusterQuery.isError,
        databaseClusterQuery.error?.message,
    ])

    return (
        <>
            <Stack.Screen
                // name="index"
                options={{
                    headerShown: true,
                    headerLargeTitle: true,
                    title: cluster?.name || '',
                }}
            />
            {Placeholder || (
                <ScrollView
                    style={{ flex: 1 }}
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 0, flexDirection: 'column' }}
                    refreshControl={
                        <RefreshControl
                            onRefresh={async () => {
                                await Promise.all([
                                    databaseClusterQuery.refetch(),
                                    // databaseClusterCertificateQuery.refetch()
                                    databaseClusterFirewallRulesQuery.refetch(),
                                    databaseClusterReplicasQuery.refetch(),
                                ])
                            }}
                        />
                    }
                >
                    <View
                        style={{
                            flexDirection: 'column',
                            gap: 0,
                        }}
                    >
                        {clusterConnection && (
                            <InfoRow
                                label="Connection"
                                icon="link-outline"
                                value={clusterConnection}
                                isCopyable={true}
                                isLight={true}
                            />
                        )}
                        {clusterUiConnection && (
                            <InfoRow
                                label="UI Connection"
                                icon="tv-outline"
                                value={clusterUiConnection}
                                isCopyable={true}
                            />
                        )}
                        {clusterVpsConnection && (
                            <InfoRow
                                label="VPS Connection"
                                icon="cloud-outline"
                                value={clusterVpsConnection}
                                isCopyable={true}
                                isLight={!!clusterUiConnection}
                            />
                        )}

                        <InfoRow
                            label="Engine"
                            icon="cog-outline"
                            value={clusterEngine}
                            isLight={!clusterUiConnection}
                        />
                        <InfoRow
                            label="Region"
                            icon="location-outline"
                            value={cluster.region.toUpperCase()}
                            isLight={!!clusterUiConnection}
                        />

                        <InfoRow
                            label="Status"
                            icon="pulse-outline"
                            value={cluster.status?.toUpperCase() || 'Unknown'}
                            isLight={!clusterUiConnection}
                        />
                        <InfoRow
                            label="Tags"
                            icon="pricetag-outline"
                            value={
                                cluster.tags && cluster.tags.length > 0 ? cluster.tags : 'No tags'
                            }
                            isLight={!!clusterUiConnection}
                        />
                        <InfoRow
                            label="Version"
                            icon="code-outline"
                            value={clusterVersion}
                            isLight={!clusterUiConnection}
                        />
                        <InfoRow
                            label="Memory"
                            icon="cube-outline"
                            value={clusterMemory}
                            isLight={!!clusterUiConnection}
                        />
                        <InfoRow
                            label="CPU"
                            icon="hardware-chip-outline"
                            value={clusterCpu}
                            isLight={!clusterUiConnection}
                        />
                        <InfoRow
                            label="Size"
                            icon="resize-outline"
                            value={clusterSize}
                            isLight={!!clusterUiConnection}
                        />

                        <InfoRow
                            label="Users"
                            icon="people-outline"
                            value={clusterUsers?.length}
                            isLight={!clusterUiConnection}
                        />
                        <InfoRow
                            label="Replicas"
                            icon="copy-outline"
                            value={
                                clusterReplicas && clusterReplicas.length > 0
                                    ? clusterReplicas.map((replica) => replica.name).join(', ')
                                    : 'No replicas'
                            }
                            isLight={!!clusterUiConnection}
                        />

                        <InfoRow
                            label="Firewall"
                            icon="shield-outline"
                            value={
                                clusterFirewallRules && clusterFirewallRules.length > 0
                                    ? `${clusterFirewallRules.length} rules`
                                    : 'Not configured'
                            }
                            isLight={!clusterUiConnection}
                        />

                        <InfoRow
                            label="Created"
                            icon="calendar-outline"
                            value={
                                cluster.created_at
                                    ? format(cluster.created_at, 'MMM d, yyyy @ hh:mm a')
                                    : 'Unknown'
                            }
                            isLight={!!clusterUiConnection}
                        />
                    </View>
                </ScrollView>
            )}
        </>
    )
}
