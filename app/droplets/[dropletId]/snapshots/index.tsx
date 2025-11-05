import { createDropletSnapshot, deleteSnapshot } from '@/api/mutations'
import { fetchDropletSnapshotList } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { useFlashlistProps, useSearchParams } from '@/lib/hooks'
import { queryClient } from '@/lib/query'
import { COLORS } from '@/theme/colors'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function DropletSnapshotsScreen() {
    const { dropletId } = useSearchParams<{ dropletId: string }>()

    const navigation = useNavigation()

    const dropletSnapshotsQuery = useQuery({
        queryKey: ['droplets', dropletId, 'snapshots'],
        queryFn: () => fetchDropletSnapshotList({ id: dropletId }),
        enabled: !!dropletId,
    })

    const dropletSnapshots = useMemo(() => dropletSnapshotsQuery.data, [dropletSnapshotsQuery.data])

    const createDropletSnapshotMutation = useMutation({
        mutationFn: async ({ snapshotName }: { snapshotName: string }) => {
            await createDropletSnapshot({ dropletId, snapshotName })
        },
        onSuccess: () => {
            Alert.alert(
                'Snapshot is being created',
                'Refresh this page in a few minutes to see your new snapshot!'
            )
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const deleteSnapshotMutation = useMutation({
        mutationFn: async ({ snapshotId }: { snapshotId: number }) => {
            await deleteSnapshot({ snapshotId })
            return snapshotId
        },
        onSuccess: async (deletedSnapshotId) => {
            await queryClient.setQueryData(
                ['droplets', dropletId, 'snapshots'],
                (old: typeof dropletSnapshots) => old?.filter((s) => s.id !== deletedSnapshotId)
            )
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const handleCreateSnapshot = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        Alert.prompt(
            'Create Snapshot',
            'Enter the name of the snapshot you want to create',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Create',
                    onPress: (snapshotName?: string) => {
                        if (!snapshotName) return

                        createDropletSnapshotMutation.mutate({
                            snapshotName,
                        })
                    },
                },
            ],
            'plain-text',
            `ocean_${Math.floor(Date.now() / 1000)}`
        )
    }, [createDropletSnapshotMutation.mutate])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: dropletSnapshotsQuery.isLoading,
            isError: dropletSnapshotsQuery.isError,
            hasData: !!dropletSnapshots && dropletSnapshots.length > 0,
            emptyLabel: 'No snapshots found, you can create one by tapping the button below!',
            errorLabel: `Error loading snapshots (${dropletSnapshotsQuery.error?.message || 'Unknown error'})`,
            emptyButton: (
                <TouchableOpacity
                    style={{
                        backgroundColor: COLORS.bgSecondary,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: COLORS.hr,
                    }}
                    onPress={handleCreateSnapshot}
                    disabled={createDropletSnapshotMutation.isPending}
                >
                    <Text style={{ color: COLORS.primary, fontSize: 16 }}>Create snapshot</Text>
                </TouchableOpacity>
            ),
        })
    }, [
        dropletSnapshots,
        dropletSnapshotsQuery.isError,
        dropletSnapshotsQuery.isLoading,
        dropletSnapshotsQuery.error?.message,
        handleCreateSnapshot,
        createDropletSnapshotMutation.isPending,
    ])
    const { overrideProps } = useFlashlistProps(Placeholder)

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight:
                createDropletSnapshotMutation.isPending || deleteSnapshotMutation.isPending
                    ? () => <ActivityIndicator sm={true} />
                    : () => (
                          <HeaderTouchableOpacity
                              style={{
                                  height: 32,
                                  width: 32,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                              }}
                              onPress={handleCreateSnapshot}
                          >
                              <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                          </HeaderTouchableOpacity>
                      ),
        })
    }, [
        navigation,
        createDropletSnapshotMutation.isPending,
        handleCreateSnapshot,
        deleteSnapshotMutation.isPending,
    ])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={dropletSnapshotsQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={Placeholder ? [] : dropletSnapshots}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
            renderItem={({ item: snapshot }) => {
                return (
                    <ContextMenu
                        dropdownMenuMode={true}
                        actions={[
                            {
                                title: 'Delete',
                                systemIcon: 'trash',
                                destructive: true,
                            },
                        ]}
                        onPress={(e) => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)

                            if (e.nativeEvent.name === 'Delete') {
                                Alert.alert(
                                    'Delete Snapshot',
                                    'Are you sure you want to delete this snapshot?',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: () => {
                                                Alert.alert(
                                                    'Are you super duper sure?',
                                                    'This action cannot be undone.',
                                                    [
                                                        {
                                                            text: 'Cancel',
                                                            style: 'cancel',
                                                        },
                                                        {
                                                            text: 'Delete snapshot',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                deleteSnapshotMutation.mutate({
                                                                    snapshotId: snapshot.id,
                                                                })
                                                            },
                                                        },
                                                    ]
                                                )
                                            },
                                        },
                                    ]
                                )
                            }
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: COLORS.hr,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: 500,
                                    color: COLORS.text,
                                }}
                            >
                                {snapshot.name}
                            </Text>

                            <Text
                                style={{
                                    fontSize: 14,
                                    color: COLORS.textMuted,
                                }}
                            >
                                {snapshot.created_at}
                            </Text>
                        </View>
                    </ContextMenu>
                )
            }}
        />
    )
}
