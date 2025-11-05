import {
    deleteLoadBalancer,
    deleteLoadBalancerRules,
    detachLoadBalancerDroplets,
} from '@/api/mutations'
import { fetchDroplet, fetchLoadBalancer } from '@/api/queries'
import ActionChip from '@/components/ActionChip'
import InfoRow from '@/components/InfoRow'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import type { components } from '@/lib/do/schema'
import { queryClient } from '@/lib/query'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function LoadBalancerScreen() {
    const { balancerId } = useLocalSearchParams<{ balancerId: string }>()

    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const loadBalancerQuery = useQuery({
        queryKey: ['loadBalancers', balancerId],
        queryFn: () => fetchLoadBalancer({ id: balancerId }),
        enabled: !!balancerId,
    })

    const loadBalancer = useMemo(() => loadBalancerQuery.data, [loadBalancerQuery.data])!

    const attachedDropletQueries = useQueries({
        queries: loadBalancer?.droplet_ids
            ? loadBalancer.droplet_ids.map((id) => ({
                  queryKey: ['droplets', id],
                  queryFn: async () => await fetchDroplet({ id }),
              }))
            : [],
    })

    const attachedDroplets = useMemo(
        () => attachedDropletQueries.map((q) => q.data).filter((d) => !!d),
        [attachedDropletQueries]
    )

    const deleteLoadBalancerMutation = useMutation({
        mutationFn: async () => await deleteLoadBalancer({ loadBalancerId: balancerId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    // const attachDropletsMutation = useMutation({
    //     mutationFn: async ({ dropletIds }: { dropletIds: number[] }) =>
    //         await attachLoadBalancerDroplets({ loadBalancerId: balancerId, dropletIds }),
    //     onSuccess: () => {
    //         loadBalancerQuery.refetch()
    //     },
    //     onError: (error) => {
    //         Alert.alert('Error', error.message)
    //     },
    // })

    const detachDropletsMutation = useMutation({
        mutationFn: async ({ dropletIds }: { dropletIds: number[] }) => {
            await detachLoadBalancerDroplets({ loadBalancerId: balancerId, dropletIds })
            return dropletIds
        },
        onSuccess: (detachedDropletIds) => {
            queryClient.setQueryData(['loadBalancers', balancerId], (old: typeof loadBalancer) => {
                if (!old) return old
                if (!old.droplet_ids || old.droplet_ids.length === 0) return old
                return {
                    ...old,
                    droplet_ids: old.droplet_ids.filter((id) => !detachedDropletIds.includes(id)),
                }
            })
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const deleteRulesMutation = useMutation({
        mutationFn: async ({
            forwardingRules,
        }: {
            forwardingRules: {
                entry_port: number
                entry_protocol: components['schemas']['forwarding_rule']['entry_protocol']
                target_port: number
                target_protocol: components['schemas']['forwarding_rule']['target_protocol']
                certificate_id?: string
                tls_passthrough?: boolean
            }[]
        }) => {
            await deleteLoadBalancerRules({ loadBalancerId: balancerId, forwardingRules })
            return forwardingRules
        },
        onSuccess: (deletedForwardingRules) => {
            queryClient.setQueryData(['loadBalancers', balancerId], (old: typeof loadBalancer) => {
                if (!old) return old
                if (!old.forwarding_rules || old.forwarding_rules.length === 0) return old
                return {
                    ...old,
                    forwarding_rules: old.forwarding_rules.filter(
                        (rule) =>
                            !deletedForwardingRules.some(
                                (r) =>
                                    r.entry_port === rule.entry_port &&
                                    r.entry_protocol === rule.entry_protocol &&
                                    r.target_port === rule.target_port &&
                                    r.target_protocol === rule.target_protocol &&
                                    r?.certificate_id === rule?.certificate_id &&
                                    r?.tls_passthrough === rule?.tls_passthrough
                            )
                    ),
                }
            })
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    // const createRulesMutation = useMutation({
    //     mutationFn: async ({ forwardingRules }: { forwardingRules: any[] }) =>
    //         await createLoadBalancerRules({ loadBalancerId: balancerId, forwardingRules }),
    //     onSuccess: () => {
    //         loadBalancerQuery.refetch()
    //     },
    //     onError: (error) => {
    //         Alert.alert('Error', error.message)
    //     },
    // })

    const headerRightLoading = useMemo(() => {
        return deleteLoadBalancerMutation.isPending
    }, [deleteLoadBalancerMutation.isPending])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: loadBalancerQuery.isLoading,
            isError: loadBalancerQuery.isError,
            hasData: !!loadBalancer,
            emptyLabel: 'No load balancer found',
            errorLabel: `Error loading load balancer (${loadBalancerQuery.error?.message || 'Unknown error'})`,
        })
    }, [
        loadBalancer,
        loadBalancerQuery.isError,
        loadBalancerQuery.isLoading,
        loadBalancerQuery.error?.message,
    ])

    return (
        <>
            <Stack.Screen
                // name="index"
                options={{
                    headerShown: true,
                    headerLargeTitle: true,
                    title: loadBalancer?.name || '',
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
                                              Alert.alert(
                                                  'Quick Tip',
                                                  'You can swipe left to go back!',
                                                  [{ text: 'Good to know!', style: 'cancel' }]
                                              )
                                          }
                                          router.back()
                                          return
                                      }

                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                                      if (e.nativeEvent.name === 'Destroy') {
                                          Alert.alert(
                                              'Are you sure?',
                                              'This action cannot be undone.',
                                              [
                                                  { text: 'Cancel', style: 'cancel' },
                                                  {
                                                      text: 'Destroy',
                                                      style: 'destructive',
                                                      onPress: () => {
                                                          Alert.alert(
                                                              'Are you super duper sure?',
                                                              'The load balancer will be deleted and cannot be recovered.',
                                                              [
                                                                  {
                                                                      text: 'Cancel',
                                                                      style: 'cancel',
                                                                  },
                                                                  {
                                                                      text: 'Destroy load balancer',
                                                                      style: 'destructive',
                                                                      onPress: () => {
                                                                          deleteLoadBalancerMutation.mutate()
                                                                      },
                                                                  },
                                                              ]
                                                          )
                                                      },
                                                  },
                                              ]
                                          )
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
                                await loadBalancerQuery.refetch()
                                // attachedDropletQuery.refetch()
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
                        <InfoRow
                            label="IP"
                            icon="globe-outline"
                            value={loadBalancer.ip}
                            isLight={true}
                            isCopyable={true}
                        />

                        <InfoRow
                            label="Region"
                            icon="location-outline"
                            value={
                                loadBalancer.region?.name
                                    ? `${loadBalancer.region.name} (${loadBalancer.region.slug.toUpperCase()})`
                                    : 'Unknown'
                            }
                        />
                        <InfoRow
                            label="Type"
                            icon="wifi-outline"
                            value={loadBalancer.type || 'Unknown'}
                            isLight={true}
                        />
                        <InfoRow
                            label="Health Check"
                            icon="heart-outline"
                            value={
                                loadBalancer.health_check ? (
                                    <ActionChip>
                                        <Text
                                            style={{
                                                color: COLORS.text,
                                                fontSize: 12,
                                            }}
                                        >
                                            {loadBalancer.health_check.protocol}://0.0.0.0:{' '}
                                            {loadBalancer.health_check.port}
                                        </Text>
                                    </ActionChip>
                                ) : (
                                    'Unknown'
                                )
                            }
                        />

                        <InfoRow
                            label="Forwarding"
                            icon="swap-horizontal-outline"
                            alignItems={
                                loadBalancer.forwarding_rules?.length > 1 ? 'flex-start' : 'center'
                            }
                            value={
                                deleteRulesMutation.isPending ? (
                                    <ActivityIndicator sm={true} />
                                ) : loadBalancer.forwarding_rules?.length > 0 ? (
                                    <View
                                        style={{
                                            flexDirection: 'column',
                                            gap: 8,
                                            alignItems: 'flex-end',
                                        }}
                                    >
                                        {loadBalancer.forwarding_rules.map((rule) => {
                                            const label = `${rule.entry_protocol.toUpperCase()} on port ${rule.entry_port} → ${rule.target_protocol.toUpperCase()} on port ${rule.target_port}`
                                            return (
                                                <ContextMenu
                                                    key={label}
                                                    dropdownMenuMode={true}
                                                    actions={[
                                                        {
                                                            title: 'Delete',
                                                            systemIcon: 'trash',
                                                            destructive: true,
                                                        },
                                                    ]}
                                                    onPress={(e) => {
                                                        Haptics.impactAsync(
                                                            Haptics.ImpactFeedbackStyle.Rigid
                                                        )

                                                        if (e.nativeEvent.name === 'Delete') {
                                                            Alert.alert(
                                                                'Delete Forwarding Rule',
                                                                'Are you sure you want to delete this rule?',
                                                                [
                                                                    {
                                                                        text: 'Cancel',
                                                                        style: 'cancel',
                                                                    },
                                                                    {
                                                                        text: 'Delete',
                                                                        style: 'destructive',
                                                                        onPress: () => {
                                                                            deleteRulesMutation.mutate(
                                                                                {
                                                                                    forwardingRules:
                                                                                        [rule],
                                                                                }
                                                                            )
                                                                        },
                                                                    },
                                                                ]
                                                            )
                                                            return
                                                        }
                                                    }}
                                                >
                                                    <ActionChip isLight={true}>
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                color: COLORS.text,
                                                            }}
                                                        >
                                                            {label}
                                                        </Text>
                                                    </ActionChip>
                                                </ContextMenu>
                                            )
                                        })}
                                        {/* <ActionChip isLight={true}>
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: COLORS.text,
                                                }}
                                            >
                                                Tap to add
                                            </Text>
                                        </ActionChip> */}
                                    </View>
                                ) : (
                                    'Unknown'
                                )
                            }
                            isLight={true}
                        />
                        <InfoRow
                            label="Droplets"
                            icon="apps-outline"
                            alignItems={attachedDroplets.length > 1 ? 'flex-start' : 'center'}
                            value={
                                detachDropletsMutation.isPending ||
                                attachedDropletQueries.some((query) => query.isLoading) ? (
                                    <ActivityIndicator sm={true} />
                                ) : attachedDropletQueries.some((query) => query.isError) ? (
                                    'Error loading droplets'
                                ) : attachedDroplets.length > 0 ? (
                                    <View style={{ flexDirection: 'column', gap: 6 }}>
                                        {attachedDroplets.map((droplet) => (
                                            <ContextMenu
                                                key={droplet.id}
                                                dropdownMenuMode={true}
                                                actions={[
                                                    {
                                                        title: 'Detach',
                                                        systemIcon: 'pip.remove',
                                                        destructive: true,
                                                    },
                                                ]}
                                                onPress={(e) => {
                                                    if (e.nativeEvent.name === 'Detach') {
                                                        Alert.alert(
                                                            'Detach',
                                                            'Are you sure you want to detach this droplet?',
                                                            [
                                                                {
                                                                    text: 'Cancel',
                                                                    style: 'cancel',
                                                                },
                                                                {
                                                                    text: 'Detach',
                                                                    style: 'destructive',
                                                                    onPress: () => {
                                                                        detachDropletsMutation.mutate(
                                                                            {
                                                                                dropletIds: [
                                                                                    droplet.id,
                                                                                ],
                                                                            }
                                                                        )
                                                                    },
                                                                },
                                                            ]
                                                        )
                                                        return
                                                    }
                                                }}
                                            >
                                                <ActionChip>
                                                    <Text>{droplet.name}</Text>
                                                </ActionChip>
                                            </ContextMenu>
                                        ))}
                                    </View>
                                ) : (
                                    'No droplets attached'
                                )
                            }
                        />

                        <InfoRow
                            label="Tag"
                            icon="pricetag-outline"
                            value={loadBalancer.tag || 'No tag'}
                            isLight={true}
                        />

                        <InfoRow
                            label="Created"
                            icon="calendar-outline"
                            value={
                                loadBalancer.created_at
                                    ? formatDistanceToNow(loadBalancer.created_at, {
                                          addSuffix: true,
                                      })
                                    : 'Unknown'
                            }
                        />
                    </View>
                </ScrollView>
            )}
        </>
    )
}
