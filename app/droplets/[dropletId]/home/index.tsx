import {
    deleteDroplet,
    detachVolumeDroplet,
    powerOnDroplet,
    renameDroplet,
    resetRootDropletPassword,
    shutdownDroplet,
} from '@/api/mutations'
import { fetchDroplet, fetchVolume } from '@/api/queries'
import ActionChip from '@/components/ActionChip'
import InfoRow from '@/components/InfoRow'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import type { VOLUME_REGIONS } from '@/lib/constants'
import { queryClient } from '@/lib/query'
import WidgetKitModule from '@/modules/widgetkit'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { usePlacement, useUser } from 'expo-superwall'
import { useLayoutEffect, useMemo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function DropletHomeScreen() {
    const { dropletId } = useLocalSearchParams<{ dropletId: string }>()

    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()

    const navigation = useNavigation()

    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const dropletQuery = useQuery({
        queryKey: ['droplets', dropletId],
        queryFn: () => fetchDroplet({ id: dropletId }),
        enabled: !!dropletId,
    })

    const droplet = useMemo(() => dropletQuery.data, [dropletQuery.data])!

    const dropletVolumeQueries = useQueries({
        queries:
            droplet && droplet.volume_ids.length > 0
                ? droplet.volume_ids.map((volumeId) => ({
                      queryKey: ['volumes', volumeId],
                      queryFn: () => fetchVolume({ id: volumeId }),
                  }))
                : [],
    })

    const dropletVolumes = useMemo(
        () =>
            dropletVolumeQueries
                .map((query) => query.data)
                .filter((volume) => volume !== undefined),
        [dropletVolumeQueries]
    )

    const renameDropletMutation = useMutation({
        mutationFn: async (name: string) => {
            await renameDroplet({ dropletId, name })
            return name
        },
        onSuccess: (newName) => {
            queryClient.setQueryData(['droplets', dropletId], (old: typeof droplet) => {
                return {
                    ...old,
                    name: newName,
                }
            })
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const shutdownDropletMutation = useMutation({
        mutationFn: async () => await shutdownDroplet({ dropletId }),
        onSuccess: () => {
            Alert.alert(
                'Shutting down',
                'Droplet is shutting down, refresh the page in a few seconds!'
            )
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const powerOnDropletMutation = useMutation({
        mutationFn: async () => await powerOnDroplet({ dropletId }),
        onSuccess: () => {
            Alert.alert('Powering on', 'Droplet is powering on, refresh the page in a few seconds!')
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const resetPasswordMutation = useMutation({
        mutationFn: async () => await resetRootDropletPassword({ dropletId }),
        onSuccess: () => {
            dropletQuery.refetch()
            Alert.alert(
                'Success',
                'Root password reset successfully. Check your email for the new password.'
            )
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const deleteDropletMutation = useMutation({
        mutationFn: async () => await deleteDroplet({ dropletId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const detachVolumeDropletMutation = useMutation({
        mutationFn: async ({
            volumeId,
            region,
        }: { volumeId: string; region: (typeof VOLUME_REGIONS)[number] }) => {
            await detachVolumeDroplet({ volumeId, dropletId, region })
            return { volumeId, region }
        },
        onSuccess: ({ volumeId, region }) => {
            queryClient.setQueryData(['droplets', dropletId], (old: typeof droplet) => {
                return {
                    ...old,
                    volume_ids: old.volume_ids.filter((id: string) => id !== volumeId),
                }
            })
            queryClient.invalidateQueries({ queryKey: ['volumes', volumeId] })
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const publicIp = useMemo(() => {
        return droplet?.networks?.v4?.find((network) => network.type === 'public')?.ip_address
    }, [droplet])

    const privateIp = useMemo(() => {
        return droplet?.networks?.v4?.find((network) => network.type === 'private')?.ip_address
    }, [droplet])

    const headerRightLoading = useMemo(() => {
        return (
            renameDropletMutation.isPending ||
            shutdownDropletMutation.isPending ||
            resetPasswordMutation.isPending ||
            deleteDropletMutation.isPending
        )
    }, [
        renameDropletMutation.isPending,
        shutdownDropletMutation.isPending,
        resetPasswordMutation.isPending,
        deleteDropletMutation.isPending,
    ])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: dropletQuery.isLoading,
            isError: !!dropletQuery.error,
            hasData: !!droplet,
            emptyLabel: 'No droplet found',
            errorLabel: `Error loading droplet (${dropletQuery.error?.message || 'Unknown error'})`,
        })
    }, [droplet, dropletQuery.error, dropletQuery.isLoading, dropletQuery.error?.message])

    useLayoutEffect(() => {
        if (!droplet) return
        navigation.setOptions({
            headerShown: true,
            headerLargeTitle: true,
            title: droplet.name,
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
                                  title: 'Rename',
                                  systemIcon: 'pencil',
                              },
                              {
                                  title: droplet.status === 'active' ? 'Turn off' : 'Turn on',
                                  systemIcon: 'power',
                              },

                              {
                                  title: 'Reset root password',
                                  systemIcon: 'lock.open',
                                  destructive: true,
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
                                  if (router.canGoBack()) {
                                      router.back()
                                  } else {
                                      router.replace('/home/')
                                  }
                                  return
                              }

                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                              if (e.nativeEvent.name === 'Rename') {
                                  Alert.prompt(
                                      'Rename',
                                      'Enter the new name for the droplet.',
                                      [
                                          { text: 'Cancel', style: 'cancel' },
                                          {
                                              text: 'Rename',
                                              onPress: (text?: string) => {
                                                  if (!text) return

                                                  renameDropletMutation.mutate(text)
                                              },
                                          },
                                      ],
                                      'plain-text',
                                      droplet.name
                                  )
                                  return
                              }

                              if (e.nativeEvent.name === 'Turn off') {
                                  Alert.alert('Are you sure?', 'The droplet will be turned off.', [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                          text: 'Turn off',
                                          style: 'destructive',
                                          onPress: () => {
                                              shutdownDropletMutation.mutate()
                                          },
                                      },
                                  ])
                                  return
                              }

                              if (e.nativeEvent.name === 'Turn on') {
                                  powerOnDropletMutation.mutate()
                                  return
                              }

                              if (e.nativeEvent.name === 'Reset root password') {
                                  Alert.alert('Are you sure?', 'This action cannot be undone.', [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                          text: 'Reset root password',
                                          style: 'destructive',
                                          onPress: () => {
                                              Alert.alert(
                                                  'Are you super duper sure?',
                                                  'The root password will be reset and you will receive an email with the new password.',
                                                  [
                                                      {
                                                          text: 'Cancel',
                                                          style: 'cancel',
                                                      },
                                                      {
                                                          text: 'Reset',
                                                          style: 'destructive',
                                                          onPress: () => {
                                                              resetPasswordMutation.mutate()
                                                          },
                                                      },
                                                  ]
                                              )
                                          },
                                      },
                                  ])
                                  return
                              }

                              if (e.nativeEvent.name === 'Destroy') {
                                  Alert.alert('Are you sure?', 'This action cannot be undone.', [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                          text: 'Destroy',
                                          style: 'destructive',
                                          onPress: () => {
                                              Alert.alert(
                                                  'Are you super duper sure?',
                                                  'The droplet will be destroyed and cannot be recovered.',
                                                  [
                                                      {
                                                          text: 'Cancel',
                                                          style: 'cancel',
                                                      },
                                                      {
                                                          text: 'Destroy droplet',
                                                          style: 'destructive',
                                                          onPress: () => {
                                                              deleteDropletMutation.mutate()
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
        droplet,
        navigation,
        acknowledge,
        acknowledged,
        headerRightLoading,
        renameDropletMutation.mutate,
        shutdownDropletMutation.mutate,
        powerOnDropletMutation.mutate,
        resetPasswordMutation.mutate,
        deleteDropletMutation.mutate,
    ])

    return (
        <>
            {Placeholder || (
                <ScrollView
                    style={{ flex: 1 }}
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 0, flexDirection: 'column' }}
                    refreshControl={
                        <RefreshControl
                            refreshing={dropletQuery.isRefetching}
                            onRefresh={async () => {
                                await Promise.all([
                                    dropletQuery.refetch(),
                                    ...dropletVolumeQueries.map((query) => query.refetch()),
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
                        {subscriptionStatus.status === 'INACTIVE' && (
                            <TouchableOpacity
                                style={{
                                    padding: 16,
                                    width: '100%',
                                    backgroundColor: COLORS.primary,
                                    borderBottomWidth: 0.5,
                                    borderTopColor: COLORS.hr,
                                    borderBottomColor: COLORS.hr,
                                }}
                                onPress={() => {
                                    registerPlacement({
                                        placement: 'TapWidget',
                                        feature: () => {
                                            WidgetKitModule.setIsSubscribed(true)
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
                                        fontSize: 14,
                                        fontWeight: 600,
                                    }}
                                >
                                    Add this Droplet as a Widget on your home screen!
                                </Text>
                            </TouchableOpacity>
                        )}

                        <InfoRow
                            label="Status"
                            icon="pulse-outline"
                            value={droplet.status.toUpperCase()}
                            isLight={true}
                        />

                        <InfoRow
                            label="Public IP"
                            icon="globe-outline"
                            value={publicIp || 'Unknown'}
                            isCopyable={true}
                        />

                        <InfoRow
                            label="Private IP"
                            value={privateIp || 'Unknown'}
                            icon="lock-closed-outline"
                            isCopyable={true}
                            isLight={true}
                        />

                        {droplet.image.distribution && droplet.image.name && (
                            <>
                                <InfoRow
                                    label="OS"
                                    icon="desktop-outline"
                                    value={droplet.image.distribution}
                                />

                                <InfoRow
                                    label="Image"
                                    icon="image-outline"
                                    value={droplet.image.name}
                                    isLight={true}
                                />
                            </>
                        )}

                        <InfoRow
                            label="Volumes"
                            icon="disc-outline"
                            value={
                                detachVolumeDropletMutation.isPending ||
                                dropletVolumeQueries.some((query) => query.isLoading) ? (
                                    <ActivityIndicator sm={true} />
                                ) : dropletVolumeQueries.some((query) => query.isError) ? (
                                    'Error loading volumes'
                                ) : dropletVolumes.length > 0 ? (
                                    <View style={{ flexDirection: 'column', gap: 6 }}>
                                        {dropletVolumes.map((volume) => (
                                            <ContextMenu
                                                key={volume.id}
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
                                                            'Are you sure you want to detach this volume?',
                                                            [
                                                                {
                                                                    text: 'Cancel',
                                                                    style: 'cancel',
                                                                },
                                                                {
                                                                    text: 'Detach',
                                                                    style: 'destructive',
                                                                    onPress: () => {
                                                                        if (
                                                                            !volume.id ||
                                                                            !volume.region
                                                                        )
                                                                            return
                                                                        detachVolumeDropletMutation.mutate(
                                                                            {
                                                                                volumeId: volume.id,
                                                                                region: volume
                                                                                    .region
                                                                                    .slug as (typeof VOLUME_REGIONS)[number],
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
                                                    <Text>{volume.name}</Text>
                                                </ActionChip>
                                            </ContextMenu>
                                        ))}
                                    </View>
                                ) : (
                                    'No volumes attached'
                                )
                            }
                            alignItems={droplet.tags.length > 1 ? 'flex-start' : 'center'}
                        />

                        <InfoRow
                            label="Tags"
                            icon="pricetag-outline"
                            value={droplet.tags.length > 0 ? droplet.tags : 'No tags'}
                            isLight={true}
                        />

                        <InfoRow
                            label="CPU"
                            icon="hardware-chip-outline"
                            value={`${droplet.vcpus} vCPUs`}
                        />

                        <InfoRow
                            label="Memory"
                            icon="cube-outline"
                            value={`${droplet.memory} MB`}
                            isLight={true}
                        />

                        <InfoRow label="Disk" icon="folder-outline" value={`${droplet.disk} GB`} />

                        <InfoRow
                            label="Region"
                            icon="location-outline"
                            value={`${droplet.region.name} (${droplet.region.slug.toUpperCase()})`}
                            isLight={true}
                        />

                        <InfoRow
                            label="Price"
                            icon="cash-outline"
                            value={`$${droplet.size.price_monthly}/month ($${droplet.size.price_hourly}/h) `}
                        />

                        <InfoRow
                            label="Created"
                            icon="calendar-outline"
                            value={format(droplet.created_at, 'MMM d, yyyy @ h:mm a')}
                            isLight={true}
                        />
                    </View>
                </ScrollView>
            )}
        </>
    )
}
