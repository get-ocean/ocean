import { toggleDropletBackups } from '@/api/mutations'
import { fetchDroplet, fetchDropletBackupList, fetchDropletBackupPolicy } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { useFlashlistProps, useSearchParams } from '@/lib/hooks'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo } from 'react'
import { Alert, Image, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function DropletBackupsScreen() {
    const { dropletId } = useSearchParams<{ dropletId: string }>()

    const navigation = useNavigation()

    const dropletQuery = useQuery({
        queryKey: ['droplets', dropletId],
        queryFn: async () => await fetchDroplet({ id: dropletId }),
        enabled: !!dropletId,
    })

    const dropletBackupsQuery = useQuery({
        queryKey: ['droplets', dropletId, 'backups'],
        queryFn: async () => await fetchDropletBackupList({ id: dropletId }),
        enabled: !!dropletId,
    })

    const dropletBackupPolicyQuery = useQuery({
        queryKey: ['droplets', dropletId, 'backupPolicy'],
        queryFn: async () => await fetchDropletBackupPolicy({ id: dropletId }),
        enabled: !!dropletId,
    })

    const dropletBackups = useMemo(() => dropletBackupsQuery.data, [dropletBackupsQuery.data])
    const dropletBackupPolicy = useMemo(
        () => dropletBackupPolicyQuery.data,
        [dropletBackupPolicyQuery.data]
    )

    const toggleDropletBackupsMutation = useMutation({
        mutationFn: async ({ enabled }: { enabled: boolean }) => {
            await toggleDropletBackups({ dropletId, enabled })
        },
        onSuccess: async () => {
            await dropletQuery.refetch()
            await dropletBackupPolicyQuery.refetch()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const isBackupsEnabled = useMemo(() => {
        return !!dropletBackupPolicy?.backup_enabled
    }, [dropletBackupPolicy])

    const Placeholder = useMemo(() => {
        if (dropletBackups !== undefined && !isBackupsEnabled) {
            return (
                <View
                    style={{
                        height: '100%',
                        paddingBottom: 200,
                        paddingHorizontal: 60,
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 32,
                    }}
                >
                    <Image
                        source={require('@/assets/do-fish.png')}
                        style={{ height: 256, resizeMode: 'contain' }}
                    />

                    <Text
                        style={{ color: COLORS.text, fontSize: 16, textAlign: 'center' }}
                        numberOfLines={2}
                    >
                        Backups are disabled, you can enable them by tapping the button below!
                    </Text>

                    <TouchableOpacity
                        style={{
                            backgroundColor: COLORS.bgSecondary,
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: COLORS.hr,
                        }}
                        onPress={() => {
                            toggleDropletBackupsMutation.mutate({ enabled: true })
                        }}
                        disabled={toggleDropletBackupsMutation.isPending}
                    >
                        <Text style={{ color: COLORS.primary, fontSize: 16 }}>Enable backups</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return buildPlaceholder({
            isLoading: dropletBackupsQuery.isLoading,
            isError: dropletBackupsQuery.isError,
            hasData: !!dropletBackups && dropletBackups.length > 0,
            emptyLabel: 'No backups found',
            errorLabel: `Error loading backups (${dropletBackupsQuery.error?.message || 'Unknown error'})`,
        })
    }, [
        isBackupsEnabled,
        dropletBackups,
        dropletBackupsQuery.isError,
        dropletBackupsQuery.isLoading,
        dropletBackupsQuery.error?.message,
        toggleDropletBackupsMutation.isPending,
        toggleDropletBackupsMutation.mutate,
    ])
    const { overrideProps } = useFlashlistProps(Placeholder)

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: toggleDropletBackupsMutation.isPending
                ? () => (
                      <HeaderItem>
                          <ActivityIndicator sm={true} />
                      </HeaderItem>
                  )
                : () => (
                      <ContextMenu
                          dropdownMenuMode={true}
                          actions={[
                              isBackupsEnabled
                                  ? {
                                        title: 'Disable backups',
                                        systemIcon: 'bolt.slash.fill',
                                    }
                                  : {
                                        title: 'Enable backups',
                                        systemIcon: 'bolt.fill',
                                    },
                          ]}
                          onPress={(e) => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                              if (e.nativeEvent.name === 'Disable backups') {
                                  toggleDropletBackupsMutation.mutate({ enabled: false })
                                  return
                              }

                              if (e.nativeEvent.name === 'Enable backups') {
                                  toggleDropletBackupsMutation.mutate({ enabled: true })
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
        isBackupsEnabled,
        navigation,
        toggleDropletBackupsMutation.mutate,
        toggleDropletBackupsMutation.isPending,
    ])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
                <RefreshControl
                    onRefresh={async () => {
                        await Promise.all([
                            dropletQuery.refetch(),
                            dropletBackupsQuery.refetch(),
                            dropletBackupPolicyQuery.refetch(),
                        ])
                    }}
                />
            }
            showsVerticalScrollIndicator={false}
            data={Placeholder ? [] : dropletBackups}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
            renderItem={({ item: backup }) => {
                return (
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
                            }}
                        >
                            {backup.name}
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                            }}
                        >
                            {backup.created_at}
                        </Text>
                    </View>
                )
            }}
        />
    )
}
