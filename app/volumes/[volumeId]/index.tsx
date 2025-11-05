import { deleteVolume, detachVolumeDroplet, resizeVolume } from '@/api/mutations'
import { fetchDroplet, fetchVolume } from '@/api/queries'
import ActionChip from '@/components/ActionChip'
import InfoRow from '@/components/InfoRow'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { queryClient } from '@/lib/query'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function VolumeScreen() {
    const { volumeId } = useLocalSearchParams<{ volumeId: string }>()

    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const volumeQuery = useQuery({
        queryKey: ['volumes', volumeId],
        queryFn: () => fetchVolume({ id: volumeId }),
        enabled: !!volumeId,
    })

    const volume = useMemo(() => volumeQuery.data, [volumeQuery.data])!

    const attachedDropletQuery = useQuery({
        queryKey: ['droplets', volume?.droplet_ids?.[0]],
        queryFn: async () => {
            if (!volume?.droplet_ids || volume.droplet_ids.length === 0) return null
            const attachedDroplet = await fetchDroplet({ id: volume.droplet_ids[0] })
            return attachedDroplet
        },
        enabled: !!volume?.droplet_ids?.[0],
    })

    const attachedDroplet = useMemo(() => attachedDropletQuery.data, [attachedDropletQuery.data])

    const deleteVolumeMutation = useMutation({
        mutationFn: async () => await deleteVolume({ volumeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['volumes'] })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const resizeVolumeMutation = useMutation({
        mutationFn: async (sizeGigabytes: number) =>
            await resizeVolume({
                volumeId,
                sizeGigabytes,
                region: volume.region?.slug as any,
            }),
        onSuccess: () => {
            volumeQuery.refetch()
            Alert.alert('Success', 'Volume resized successfully.')
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const detachDropletMutation = useMutation({
        mutationFn: async () => {
            if (!attachedDroplet) throw new Error('This volume is not attached to a droplet')
            await detachVolumeDroplet({
                volumeId,
                dropletId: attachedDroplet.id,
                region: volume.region?.slug as any,
            })
            return attachedDroplet.id
        },
        onSuccess: async (detachedDropletId) => {
            await queryClient.setQueryData(['volumes', volumeId], (old: typeof volume) => {
                if (!old) return old
                if (!old.droplet_ids || old.droplet_ids.length === 0) return old
                return {
                    ...old,
                    droplet_ids: old.droplet_ids.filter((id) => id !== detachedDropletId),
                }
            })
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const headerRightLoading = useMemo(() => {
        return deleteVolumeMutation.isPending || resizeVolumeMutation.isPending
    }, [deleteVolumeMutation.isPending, resizeVolumeMutation.isPending])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: volumeQuery.isLoading,
            isError: volumeQuery.isError,
            hasData: !!volume,
            emptyLabel: 'No volume found',
            errorLabel: `Error loading volume (${volumeQuery.error?.message || 'Unknown error'})`,
        })
    }, [volumeQuery.isLoading, volumeQuery.isError, volumeQuery.error?.message, volume])

    return (
        <>
            <Stack.Screen
                // name="index"
                options={{
                    headerShown: true,
                    headerLargeTitle: true,
                    title: volume?.name || '',
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
                                          title: 'Resize',
                                          systemIcon: 'arrow.down.backward.and.arrow.up.forward',
                                      },
                                      {
                                          title: 'Delete',
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

                                      if (e.nativeEvent.name === 'Resize') {
                                          Alert.prompt(
                                              'Resize',
                                              `Enter the new size in GB, must be bigger than ${volume.size_gigabytes} GB.`,
                                              [
                                                  { text: 'Cancel', style: 'cancel' },
                                                  {
                                                      text: 'Resize',
                                                      onPress: (text?: string) => {
                                                          if (!text) return

                                                          const amountGb = Number.parseInt(text)

                                                          resizeVolumeMutation.mutate(amountGb)
                                                      },
                                                  },
                                              ],
                                              'plain-text'
                                          )
                                          return
                                      }

                                      if (e.nativeEvent.name === 'Delete') {
                                          Alert.alert(
                                              'Are you sure?',
                                              'This action cannot be undone.',
                                              [
                                                  { text: 'Cancel', style: 'cancel' },
                                                  {
                                                      text: 'Delete',
                                                      style: 'destructive',
                                                      onPress: () => {
                                                          Alert.alert(
                                                              'Are you super duper sure?',
                                                              'The volume will be deleted and cannot be recovered.',
                                                              [
                                                                  {
                                                                      text: 'Cancel',
                                                                      style: 'cancel',
                                                                  },
                                                                  {
                                                                      text: 'Delete volume',
                                                                      style: 'destructive',
                                                                      onPress: () => {
                                                                          deleteVolumeMutation.mutate()
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
                            refreshing={volumeQuery.isRefetching}
                            onRefresh={async () => {
                                await Promise.all([
                                    volumeQuery.refetch(),
                                    attachedDropletQuery.refetch(),
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
                        <InfoRow
                            label="Description"
                            icon="document-text-outline"
                            value={volume.description || 'No description'}
                            isLight={true}
                        />
                        <InfoRow
                            label="Size"
                            icon="resize-outline"
                            value={
                                volume.size_gigabytes ? `${volume.size_gigabytes} GB` : 'Unknown'
                            }
                        />

                        <InfoRow
                            label="Filesystem"
                            icon="library-outline"
                            value={volume.filesystem_type || 'Unknown'}
                            isLight={true}
                        />

                        <InfoRow
                            label="Region"
                            icon="location-outline"
                            value={
                                volume.region
                                    ? `${volume.region.name} (${volume.region.slug.toUpperCase()})`
                                    : 'Unknown'
                            }
                        />
                        <InfoRow
                            label="Attached to"
                            icon="link-outline"
                            value={
                                attachedDropletQuery.isFetching ||
                                detachDropletMutation.isPending ? (
                                    <ActivityIndicator sm={true} />
                                ) : attachedDroplet ? (
                                    <ContextMenu
                                        dropdownMenuMode={true}
                                        actions={[
                                            {
                                                title: 'View Droplet',
                                                systemIcon: 'eye',
                                            },
                                            {
                                                title: 'Detach',
                                                systemIcon: 'pip.remove',
                                                destructive: true,
                                            },
                                        ]}
                                        onPress={(e) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                                            if (e.nativeEvent.name === 'View Droplet') {
                                                router.push(`/droplets/${attachedDroplet.id}/home`)
                                                return
                                            }

                                            if (e.nativeEvent.name === 'Detach') {
                                                Alert.alert(
                                                    'Detach Droplet',
                                                    'Are you sure you want to detach this droplet?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Detach',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                detachDropletMutation.mutate()
                                                            },
                                                        },
                                                    ]
                                                )
                                            }
                                            return
                                        }}
                                    >
                                        <ActionChip isLight={true}>
                                            <Text>{attachedDroplet.name}</Text>
                                        </ActionChip>
                                    </ContextMenu>
                                ) : (
                                    'Not attached'
                                )
                            }
                            isLight={true}
                        />
                        <InfoRow
                            label="Created"
                            icon="calendar-outline"
                            value={
                                volume.created_at
                                    ? formatDistanceToNow(volume.created_at, { addSuffix: true })
                                    : 'Unknown'
                            }
                        />
                    </View>
                </ScrollView>
            )}
        </>
    )
}
