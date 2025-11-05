import { deleteDomain, deleteDomainRecord, updateDomainRecord } from '@/api/mutations'
import { fetchDomain, fetchDomainRecords } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { useFlashlistProps } from '@/lib/hooks'
import { queryClient } from '@/lib/query'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function DomainScreen() {
    const { domainName } = useLocalSearchParams<{ domainName: string }>()

    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const domainQuery = useQuery({
        queryKey: ['domains', domainName],
        queryFn: async () => {
            const domain = await fetchDomain({ name: domainName })
            return domain
        },
        enabled: !!domainName,
    })

    const deleteDomainMutation = useMutation({
        mutationFn: async () => await deleteDomain({ domainName }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const updateDomainRecordMutation = useMutation({
        mutationFn: async ({ id, type, data }: { id: number; type: string; data: string }) =>
            await updateDomainRecord({ domainName, recordId: id, recordData: { type, data } }),
        onSuccess: () => {
            domainRecordsQuery.refetch()
            Alert.alert('Success', 'Domain record updated successfully.')
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const deleteDomainRecordMutation = useMutation({
        mutationFn: async ({ id }: { id: number }) =>
            await deleteDomainRecord({ domainName, recordId: id }),
        onSuccess: () => {
            domainRecordsQuery.refetch()
            Alert.alert('Success', 'Domain record deleted successfully.')
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const domainRecordsQuery = useQuery({
        queryKey: ['domains', domainName, 'records'],
        queryFn: async () => {
            const records = await fetchDomainRecords({ name: domainName })
            return records
        },
        enabled: !!domainName,
    })

    const domain = useMemo(() => domainQuery.data, [domainQuery.data])!
    const domainRecords = useMemo(() => domainRecordsQuery.data, [domainRecordsQuery.data])!

    const domainRecordOrganized = useMemo(() => {
        if (!domainRecords) {
            return []
        }

        const types = domainRecords.reduce(
            (acc, record) => {
                acc[record.type] = acc[record.type] || []
                acc[record.type].push(record)
                return acc
            },
            {} as Record<string, typeof domainRecords>
        )

        const records: ((typeof domainRecords)[number] | string)[] = []

        const sortedTypes = Object.keys(types).sort((a, b) => a.localeCompare(b))

        for (const type of sortedTypes) {
            records.push(type)
            records.push(...types[type])
        }

        return records
    }, [domainRecords])

    const isHeaderLoading = useMemo(() => {
        return (
            deleteDomainMutation.isPending ||
            updateDomainRecordMutation.isPending ||
            deleteDomainRecordMutation.isPending
        )
    }, [
        deleteDomainMutation.isPending,
        updateDomainRecordMutation.isPending,
        deleteDomainRecordMutation.isPending,
    ])

    const Placeholder = useMemo(() => {
        const emptyDomain = buildPlaceholder({
            isLoading: domainQuery.isLoading,
            isError: domainQuery.isError,
            hasData: !!domain,
            emptyLabel: 'No domain found',
            errorLabel: `Error loading domain (${domainQuery.error?.message || 'Unknown error'})`,
        })

        if (emptyDomain) return emptyDomain

        const emptyDomainRecords = buildPlaceholder({
            isLoading: domainRecordsQuery.isLoading,
            isError: domainRecordsQuery.isError,
            hasData: !!domainRecords,
            emptyLabel: 'No domain records found',
            errorLabel: `Error loading domain records (${domainRecordsQuery.error?.message || 'Unknown error'})`,
        })

        return emptyDomainRecords
    }, [
        domainQuery.isLoading,
        domainQuery.isError,
        domainQuery.error?.message,
        domain,
        domainRecordsQuery.isLoading,
        domainRecordsQuery.isError,
        domainRecordsQuery.error?.message,
        domainRecords,
    ])
    const { overrideProps } = useFlashlistProps(Placeholder)

    return (
        <>
            <Stack.Screen
                // name="index"
                options={{
                    headerShown: true,
                    headerLargeTitle: true,
                    title: domainName,

                    headerRight: isHeaderLoading
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
                                          title: 'Add Record',
                                          systemIcon: 'plus',
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

                                      if (e.nativeEvent.name === 'Add Record') {
                                          router.push(`/domains/${domainName}/add`)
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
                                                              'The domain will be deleted.',
                                                              [
                                                                  {
                                                                      text: 'Cancel',
                                                                      style: 'cancel',
                                                                  },
                                                                  {
                                                                      text: 'Delete domain',
                                                                      style: 'destructive',
                                                                      onPress: () => {
                                                                          deleteDomainMutation.mutate()
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
            <FlashList
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={<RefreshControl onRefresh={domainQuery.refetch} />}
                showsVerticalScrollIndicator={false}
                data={Placeholder ? [] : domainRecordOrganized}
                overrideProps={overrideProps}
                ListEmptyComponent={Placeholder}
                renderItem={({ item: recordOrSection }) => {
                    if (typeof recordOrSection === 'string') {
                        return (
                            <View
                                style={{
                                    paddingHorizontal: 20,
                                    paddingVertical: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: COLORS.hr,
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 500, color: COLORS.text }}>
                                    {recordOrSection}
                                </Text>
                            </View>
                        )
                    }

                    const record = recordOrSection as (typeof domainRecords)[number]

                    return (
                        <ContextMenu
                            dropdownMenuMode={true}
                            actions={[
                                { title: 'Edit', systemIcon: 'pencil' },
                                { title: 'Delete', systemIcon: 'trash', destructive: true },
                            ]}
                            onPress={(event) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                                if (event.nativeEvent.name === 'Edit') {
                                    Alert.prompt(
                                        'Edit Domain Record',
                                        'Enter the new data for this record',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Save',
                                                onPress: (text?: string) => {
                                                    if (!text) return
                                                    if (!record.id) return

                                                    updateDomainRecordMutation.mutate({
                                                        id: record.id,
                                                        type: record.type,
                                                        data: text,
                                                    })
                                                },
                                            },
                                        ],
                                        'plain-text',
                                        record.data
                                    )
                                    return
                                }

                                if (event.nativeEvent.name === 'Delete') {
                                    Alert.alert(
                                        'Delete Domain Record',
                                        'Are you sure you want to delete this domain record?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: () => {
                                                    if (!record.id) return

                                                    deleteDomainRecordMutation.mutate({
                                                        id: record.id,
                                                    })
                                                },
                                            },
                                        ]
                                    )
                                    return
                                }
                            }}
                        >
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'column',
                                    gap: 4,
                                    padding: 16,
                                    paddingHorizontal: 20,
                                    borderTopWidth: 0.5,
                                    borderBottomWidth: 0.5,
                                    borderColor: COLORS.hr,
                                    backgroundColor: COLORS.bgSecondary,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 500,
                                        color: COLORS.text,
                                    }}
                                >
                                    {record.name === '@'
                                        ? domainName
                                        : `${record.name}.${domainName}`}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: COLORS.textMuted,
                                    }}
                                    numberOfLines={10}
                                    ellipsizeMode="tail"
                                >
                                    {record.data}
                                </Text>
                            </TouchableOpacity>
                        </ContextMenu>
                    )
                }}
            />
        </>
    )
}
