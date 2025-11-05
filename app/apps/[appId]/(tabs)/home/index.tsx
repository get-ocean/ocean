import { deleteApp, restartApp } from '@/api/mutations'
import { fetchApp } from '@/api/queries'
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
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function AppHomeScreen() {
    const { appId } = useLocalSearchParams<{ appId: string }>()

    const navigation = useNavigation()

    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const appQuery = useQuery({
        queryKey: ['apps', appId],
        queryFn: () => fetchApp({ id: appId }),
        enabled: !!appId,
    })

    const deleteAppMutation = useMutation({
        mutationFn: async () => await deleteApp({ appId }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['projects'] })
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const restartAppMutation = useMutation({
        mutationFn: async () => await restartApp({ appId }),
        onSuccess: async () => {
            await appQuery.refetch()
            Alert.alert('Success', 'App restarted successfully.')
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const app = useMemo(() => appQuery.data, [appQuery.data])!

    const liveUrl = useMemo(() => {
        return app?.live_url || app?.live_url_base
    }, [app])

    const defaultIngress = useMemo(() => {
        return app?.default_ingress
    }, [app])

    const appName = useMemo(() => {
        return app?.spec?.name || app?.id
    }, [app])

    const headerRightLoading = useMemo(() => {
        return deleteAppMutation.isPending || restartAppMutation.isPending
    }, [deleteAppMutation.isPending, restartAppMutation.isPending])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: appQuery.isLoading,
            isError: appQuery.isError,
            hasData: !!app,
            emptyLabel: 'No app found',
            errorLabel: `Error loading app (${appQuery.error?.message || 'Unknown error'})`,
        })
    }, [app, appQuery.isError, appQuery.isLoading, appQuery.error?.message])

    useLayoutEffect(() => {
        if (!app) return
        navigation.setOptions({
            title: appName,
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
                                  title: 'Restart',
                                  systemIcon: 'arrow.counterclockwise',
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

                              if (e.nativeEvent.name === 'Restart') {
                                  Alert.alert(
                                      'Restart App',
                                      'Are you sure you want to restart this app?',
                                      [
                                          { text: 'Cancel', style: 'cancel' },
                                          {
                                              text: 'Restart',
                                              onPress: () => {
                                                  restartAppMutation.mutate()
                                              },
                                          },
                                      ]
                                  )
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
                                                  'The app will be deleted and cannot be recovered.',
                                                  [
                                                      {
                                                          text: 'Cancel',
                                                          style: 'cancel',
                                                      },
                                                      {
                                                          text: 'Destroy app',
                                                          style: 'destructive',
                                                          onPress: () => {
                                                              deleteAppMutation.mutate()
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
        app,
        navigation,
        acknowledge,
        acknowledged,
        appName,
        headerRightLoading,
        deleteAppMutation.mutate,
        restartAppMutation.mutate,
    ])

    return (
        <>
            <Stack.Screen
                // name="index"
                options={{
                    title: appName || '',
                }}
            />
            {Placeholder || (
                <ScrollView
                    style={{ flex: 1 }}
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 0, flexDirection: 'column' }}
                    refreshControl={<RefreshControl onRefresh={appQuery.refetch} />}
                >
                    <View
                        style={{
                            flexDirection: 'column',
                            gap: 0,
                        }}
                    >
                        <InfoRow
                            label="Live URL"
                            icon="globe-outline"
                            value={liveUrl || 'Not available'}
                            isCopyable={true}
                            isLight={true}
                        />

                        <InfoRow
                            label="Default Ingress"
                            icon="server-outline"
                            isCopyable={true}
                            value={defaultIngress || 'Not available'}
                        />

                        <InfoRow
                            label="Tier"
                            icon="diamond-outline"
                            value={app.tier_slug ? app.tier_slug.toUpperCase() : 'Unknown'}
                            isLight={true}
                        />

                        <InfoRow
                            label="Region"
                            icon="location-outline"
                            value={app.region?.label || 'Unknown'}
                        />

                        <InfoRow
                            label="Live Domain"
                            icon="link-outline"
                            value={app.live_domain || 'Not available'}
                            isCopyable={true}
                            isLight={true}
                        />

                        <InfoRow
                            label="Components"
                            icon="link-outline"
                            alignItems={
                                (app.spec.services?.length || 0) > 1 ? 'flex-start' : 'center'
                            }
                            value={
                                (app.spec.services?.length || 0) > 0 ? (
                                    <View style={{ flexDirection: 'column', gap: 4 }}>
                                        {app.spec.services!.map((service, index) => (
                                            <ActionChip
                                                key={`${service.name}-${index}`}
                                                onPress={() => {
                                                    // router.push(
                                                    //     `/apps/${appId}/components/${service.name}`
                                                    // )
                                                }}
                                            >
                                                <Text>{service.name}</Text>
                                            </ActionChip>
                                        ))}
                                    </View>
                                ) : (
                                    'No components'
                                )
                            }
                        />

                        <InfoRow
                            label="Created"
                            icon="calendar-outline"
                            value={
                                app.created_at
                                    ? format(new Date(app.created_at), 'MMM d, yyyy @ h:mm a')
                                    : 'Unknown'
                            }
                        />

                        <InfoRow
                            label="Updated"
                            icon="sync-outline"
                            value={
                                app.updated_at
                                    ? format(new Date(app.updated_at), 'MMM d, yyyy @ h:mm a')
                                    : 'Unknown'
                            }
                            isLight={true}
                        />
                    </View>
                </ScrollView>
            )}
        </>
    )
}
