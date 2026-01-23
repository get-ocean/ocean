import {
    fetchAccount,
    fetchApp,
    fetchDatabaseCluster,
    fetchDomain,
    fetchDroplet,
    fetchLoadBalancer,
    fetchProjectList,
    fetchProjectResources,
    fetchVolume,
} from '@/api/queries'
import ApiStatus from '@/components/ApiStatus'
import BottomGradient from '@/components/BottomGradient'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { DB_CLUSTER_ENGINE_LABELS } from '@/lib/constants'
import { useFlashlistProps, useWithReview } from '@/lib/hooks'
import { queryClient } from '@/lib/query'
import WidgetKitModule from '@/modules/widgetkit'
import { mmkvStorage } from '@/lib/storage'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { S3 } from '@aws-sdk/client-s3'
import { Ionicons } from '@expo/vector-icons'
import { HeaderButton } from '@react-navigation/elements'
import * as Sentry from '@sentry/react-native'
import { FlashList } from '@shopify/flash-list'
import { useQueries, useQuery } from '@tanstack/react-query'
import { parseZone } from 'dnsz'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import * as QuickActions from 'expo-quick-actions'
import { Stack, useNavigation } from 'expo-router'
import { router } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { usePlacement, useSuperwall, useUser } from 'expo-superwall'
import * as WebBrowser from 'expo-web-browser'
import ms from 'ms'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, Image, Platform, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

const TITLE_FOR_RESOURCE_TYPE = {
    droplet: 'Droplets',
    volume: 'Volumes',
    snapshot: 'Snapshots',
    domain: 'Domains',
    loadbalancer: 'Load Balancers',
    app: 'Apps',
    space: 'Spaces',
    dbaas: 'Database Clusters',
} as const

const ACCEPTED_RESOURCE_TYPES = [
    'droplet',
    'volume',
    'domain',
    'loadbalancer',
    'app',
    'space',
    'dbaas',
    'snapshot',
] as const

const ICON_FOR_RESOURCE_TYPE = {
    droplet: require('@/assets/types/droplet.png'),
    volume: require('@/assets/types/volume.png'),
    snapshot: require('@/assets/types/snapshot.png'),
    domain: require('@/assets/types/domain.png'),
    loadbalancer: require('@/assets/types/loadbalancer.png'),
    app: require('@/assets/types/app.png'),
    space: require('@/assets/types/space.png'),
    dbaas: require('@/assets/types/dbaas.png'),
} as const

const COMPONENT_FOR_RESOURCE_TYPE = {
    droplet: DropletCard,
    volume: VolumeCard,
    loadbalancer: LoadBalancerCard,
    app: AppCard,
    dbaas: DatabaseClusterCard,
    domain: DomainCard,
    space: SpaceCard,
} as const

export default function HomeScreen() {
    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()
    const { getPresentationResult } = useSuperwall()

    const connections = usePersistedStore((state) => state.connections)
    const removeConnection = usePersistedStore((state) => state.removeConnection)
    const currentConnection = usePersistedStore((state) => state.currentConnection)!
    const switchConnection = usePersistedStore((state) => state.switchConnection)
    const minimizedTypes = usePersistedStore((state) => state.minimizedTypes)
    const toggleMinimizedType = usePersistedStore((state) => state.toggleMinimizedType)

    const navigation = useNavigation()
    const [searchText, setSearchText] = useState('')

    const currentProjectId = useMemo(
        () => currentConnection?.currentProjectId,
        [currentConnection?.currentProjectId]
    )
    const accountQueries = useQueries({
        queries: connections.map((connection) => ({
            queryKey: ['account', connection.id],
            queryFn: async () => {
                const account = await fetchAccount({ connectionId: connection.id })
                return { ...account, connectionId: connection.id }
            },
        })),
    })

    const currentAccount = useMemo(() => {
        if (!currentConnection) return undefined
        return accountQueries.find((q) => q.data && q.data.connectionId === currentConnection.id)
            ?.data
    }, [accountQueries, currentConnection])

    const projectListQueries = useQueries({
        queries: connections.map((connection) => ({
            queryKey: ['projects', connection.id],
            queryFn: async () => fetchProjectList({ connectionId: connection.id }),
        })),
    })

    const currentAccountProjects = useMemo(() => {
        if (!currentAccount) return undefined
        return projectListQueries.find((q) =>
            q.data?.find((p) => p.owner_uuid === currentAccount.team?.uuid)
        )?.data
    }, [projectListQueries, currentAccount])

    const currentAccountProject = useMemo(() => {
        if (!currentProjectId) return undefined
        return currentAccountProjects?.find((project) => project.id === currentProjectId)
    }, [currentAccountProjects, currentProjectId])

    const projectResourcesQuery = useQuery({
        queryKey: ['projects', currentProjectId, 'resources'],
        queryFn: async () => {
            if (!currentProjectId) return null
            return fetchProjectResources({ id: currentProjectId })
        },
        enabled: !!currentProjectId,
    })

    const projectResources = useMemo(() => {
        if (!projectResourcesQuery.data) return null

        const parsedResources = []

        for (const resource of projectResourcesQuery.data) {
            const urn = resource.urn
            if (!urn) continue

            const type = urn.split(':')[1]
            const idOrName = urn.split(':')[2]

            if (type === 'space') {
                if (!resource.links?.self) continue
                parsedResources.push({
                    type: 'space',
                    idOrName,
                    url: resource.links?.self,
                })
                continue
            }

            parsedResources.push({
                type,
                idOrName,
            })
        }

        const domains = parsedResources.filter((resource) => resource.type === 'domain')
        const volumes = parsedResources.filter((resource) => resource.type === 'volume')
        const snapshots = parsedResources.filter((resource) => resource.type === 'snapshot')
        const droplets = parsedResources.filter((resource) => resource.type === 'droplet')
        const loadBalancers = parsedResources.filter((resource) => resource.type === 'loadbalancer')
        const apps = parsedResources.filter((resource) => resource.type === 'app')
        const spaces = parsedResources.filter((resource) => resource.type === 'space')
        const databaseClusters = parsedResources.filter((resource) => resource.type === 'dbaas')

        const resources: (
            | 'droplet'
            | 'volume'
            | 'snapshot'
            | 'domain'
            | 'loadbalancer'
            | 'app'
            | 'space'
            | 'dbaas'
            | { type: string; idOrName: string }
            | { type: 'space'; idOrName: string; url: string }
        )[] = []

        if (droplets.length > 0) {
            resources.push('droplet')
            resources.push(...droplets)
        }

        if (volumes.length > 0) {
            resources.push('volume')
            resources.push(...volumes)
        }

        if (snapshots.length > 0) {
            resources.push('snapshot')
            resources.push(...snapshots)
        }

        if (domains.length > 0) {
            resources.push('domain')
            resources.push(...domains)
        }

        if (loadBalancers.length > 0) {
            resources.push('loadbalancer')
            resources.push(...loadBalancers)
        }

        if (apps.length > 0) {
            resources.push('app')
            resources.push(...apps)
        }

        if (spaces.length > 0) {
            resources.push('space')
            resources.push(...spaces)
        }

        if (databaseClusters.length > 0) {
            resources.push('dbaas')
            resources.push(...databaseClusters)
        }

        return resources
    }, [projectResourcesQuery.data])

    const resourceTypeCounts = useMemo(() => {
        if (!projectResources) return null

        const counts: Record<string, number> = {}

        for (const type of ACCEPTED_RESOURCE_TYPES) {
            counts[type] = projectResources.filter(
                (r) => typeof r === 'object' && r.type === type
            ).length
        }

        return counts
    }, [projectResources])

    const filteredResources = useMemo(() => {
        if (!projectResources) return null
        if (!searchText.trim()) return projectResources

        const getSearchableText = (type: string, idOrName: string): string => {
            const queryKeyMap: Record<string, string[]> = {
                droplet: ['droplets', idOrName],
                volume: ['volume', idOrName],
                dbaas: ['databaseCluster', idOrName],
                loadbalancer: ['loadBalancer', idOrName],
                app: ['app', idOrName],
                domain: ['domain', idOrName],
                space: ['spaces', idOrName],
            }

            const queryKey = queryKeyMap[type]
            if (!queryKey) return idOrName

            const cachedData = queryClient.getQueryData(queryKey) as Record<string, any> | undefined
            if (!cachedData) return idOrName

            if (type === 'app') {
                return cachedData.spec?.name || idOrName
            }

            return cachedData.name || idOrName
        }

        const query = searchText.toLowerCase().trim()
        const result: typeof projectResources = []

        let currentType: string | null = null
        let currentTypeHasMatches = false
        let currentTypeItems: (typeof projectResources)[number][] = []

        for (const resource of projectResources) {
            if (typeof resource === 'string') {
                if (currentType && currentTypeHasMatches) {
                    result.push(currentType as (typeof projectResources)[number])
                    result.push(...currentTypeItems)
                }
                currentType = resource
                currentTypeHasMatches = false
                currentTypeItems = []
            } else {
                const searchableText = getSearchableText(resource.type, resource.idOrName)
                const matches = searchableText.toLowerCase().includes(query)
                if (matches) {
                    currentTypeHasMatches = true
                    currentTypeItems.push(resource)
                }
            }
        }

        if (currentType && currentTypeHasMatches) {
            result.push(currentType as (typeof projectResources)[number])
            result.push(...currentTypeItems)
        }

        return result
    }, [projectResources, searchText])

    console.log('projectResources', projectResources)

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading:
                accountQueries.some((q) => q.isLoading) ||
                projectListQueries.some((q) => q.isLoading) ||
                projectResourcesQuery.isLoading,
            isError: projectResourcesQuery.isError,
            hasData: (projectResources?.length || 0) > 0,
            errorLabel: `Error fetching resources (${projectResourcesQuery.error?.message || 'Unknown error'})`,
            emptyLabel: "There's nothing here...",
        })
    }, [
        accountQueries,
        projectListQueries,
        projectResourcesQuery.isError,
        projectResourcesQuery.error?.message,
        projectResourcesQuery.isLoading,
        projectResources,
    ])
    const { overrideProps } = useFlashlistProps(Placeholder)

    useEffect(() => {
        // this is needed on first login, and when switching connections
        // console.log('currentProjectId', currentProjectId)

        if (!currentConnection) return // pleasing the compiler
        if (!currentAccount) return // pleasing the compiler
        if (!currentAccountProjects || currentAccountProjects.length === 0) return

        if (!currentProjectId) {
            for (const project of currentAccountProjects) {
                if (project.is_default) {
                    switchConnection({
                        connectionId: currentConnection.id,
                        projectId: project.id,
                    })
                    break
                }
            }
        }

        // sets a new project if the user lost access to the current one
        if (!currentAccountProjects.find((project) => project.id === currentProjectId)) {
            for (const project of currentAccountProjects) {
                if (project.id) {
                    switchConnection({ connectionId: currentConnection.id, projectId: project.id })
                    break
                }
            }
        }
    }, [
        currentProjectId,
        currentConnection,
        switchConnection,
        currentAccount,
        currentAccountProjects,
    ])

    useEffect(() => {
        if (subscriptionStatus.status !== 'INACTIVE') {
            QuickActions.isSupported().then((supported) => {
                if (!supported) return
                QuickActions.setItems(
                    Platform.OS === 'ios'
                        ? [
                              {
                                  id: '0',
                                  title: 'Bugs?',
                                  subtitle: 'Open an issue on GitHub!',
                                  icon: 'mail',
                              },
                          ]
                        : []
                )
            })
            return
        }

        try {
            getPresentationResult('LifetimeOffer_1').then((presentationResult) => {
                if (
                    ['placementnotfound', 'noaudiencematch'].includes(
                        presentationResult.type.toLowerCase()
                    )
                ) {
                    return
                }
                setTimeout(() => {
                    registerPlacement({
                        placement: 'LifetimeOffer_1',
                        feature: () => {
                            WidgetKitModule.setIsSubscribed(true)
                            Alert.alert('Congrats!', 'You unlocked lifetime access to Ocean.')
                        },
                    }).catch((error) => {
                        Sentry.captureException(error)
                        console.error('Error registering LifetimeOffer_1', error)
                    })
                }, 1000)
            })

            QuickActions.isSupported().then((supported) => {
                if (!supported) return
                QuickActions.setItems([
                    {
                        id: '0',
                        title:
                            Platform.OS === 'android'
                                ? "Don't delete me ): Tap here!"
                                : "Don't delete me ):",
                        subtitle: "Here's 50% off for life!",
                        icon: 'love',
                        params: { href: '/?showLfo1=1' },
                    },
                ])
            })
        } catch (error) {
            Sentry.captureException(error)
        }
    }, [registerPlacement, subscriptionStatus.status, getPresentationResult])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search resources...',
                autoCapitalize: 'none',
                onChangeText: (event: { nativeEvent: { text: string } }) => {
                    setSearchText(event.nativeEvent.text)
                },
            },
        })
    }, [navigation])

    return (
        <>
            <Stack.Screen
                // name="home"
                options={{
                    headerShown: true,
                    headerLargeTitle: true,
                    title: currentAccountProject?.name || '',
                    // title: "Emily's Team",
                    headerLeft: () => (
                        <ContextMenu
                            dropdownMenuMode={true}
                            actions={[
                                ...connections.map((connection) => ({
                                    title:
                                        accountQueries.find(
                                            (aq) => aq.data?.connectionId === connection.id
                                        )?.data?.team?.name || 'Team',
                                    inlineChildren: true,
                                    disabled: connection.id === currentConnection?.id,
                                    actions: [
                                        ...(projectListQueries
                                            .filter((q) => q.data)
                                            .filter((q) => {
                                                // Find the account for this connection to match projects
                                                const accountForConnection = accountQueries.find(
                                                    (aq) => aq.data?.connectionId === connection.id
                                                )?.data
                                                if (!accountForConnection) return false
                                                // Check if any project belongs to this account's team
                                                return q.data?.some(
                                                    (project) =>
                                                        project.owner_uuid ===
                                                        accountForConnection.team?.uuid
                                                )
                                            })
                                            .flatMap((q) => q.data || [])
                                            .map((project) => ({
                                                title: project.name || 'Unnamed Project',
                                                destructive: false,
                                                systemIcon: isLiquidGlassAvailable()
                                                    ? connection.id === currentConnection?.id
                                                        ? 'smallcircle.filled.circle.fill'
                                                        : 'smallcircle.filled.circle'
                                                    : undefined,
                                                disabled: project.id === currentProjectId,
                                            })) || []),
                                        {
                                            title: 'Remove Account',
                                            systemIcon: 'trash',
                                            destructive: true,
                                        },
                                    ],
                                })),
                                {
                                    title: 'Add Account',
                                    systemIcon: 'plus',
                                    destructive: false,
                                },
                            ]}
                            onPress={(e) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                                if (e.nativeEvent.name === 'Remove Account') {
                                    const [connectionPath] = e.nativeEvent.indexPath // [connectionPath, actionPath]

                                    Alert.alert(
                                        'Remove Connection',
                                        'Are you sure you want to remove this connection?',
                                        [
                                            {
                                                text: 'Remove',
                                                onPress: () => {
                                                    // we can use the same index because they get displayed in the same order
                                                    const connectionId =
                                                        accountQueries[connectionPath].data
                                                            ?.connectionId
                                                    if (!connectionId) return

                                                    removeConnection(connectionId)

                                                    // if we had 1 connection before, we will have none
                                                    if (connections.length === 1) {
                                                        mmkvStorage.clearAll()
                                                        router.dismissAll()
                                                        router.replace('/login/')
                                                        queryClient.clear()
                                                        return
                                                    }
                                                },
                                                style: 'destructive',
                                            },
                                            {
                                                text: 'Cancel',
                                                style: 'cancel',
                                            },
                                        ]
                                    )

                                    return
                                }

                                if (e.nativeEvent.name === 'Add Account') {
                                    if (__DEV__) {
                                        WidgetKitModule.setIsSubscribed(true)
                                        router.push('/login/')
                                        return
                                    }

                                    registerPlacement({
                                        placement: 'AddConnection',
                                        feature: () => {
                                            WidgetKitModule.setIsSubscribed(true)
                                            router.push('/login/')
                                        },
                                    })

                                    return
                                }

                                const [connectionPath, projectPath] = e.nativeEvent.indexPath
                                const selectedConnection = connections[connectionPath]

                                // Find the account for this connection
                                const accountForConnection = accountQueries.find(
                                    (aq) => aq.data?.connectionId === selectedConnection.id
                                )?.data

                                if (!accountForConnection) return

                                // Find the projects for this connection
                                const projectsForConnection = projectListQueries
                                    .filter((q) => q.data)
                                    .find((q) =>
                                        q.data?.some(
                                            (project) =>
                                                project.owner_uuid ===
                                                accountForConnection.team?.uuid
                                        )
                                    )
                                    ?.data?.filter(
                                        (project) =>
                                            project.owner_uuid === accountForConnection.team?.uuid
                                    )

                                if (
                                    !projectsForConnection ||
                                    projectPath >= projectsForConnection.length
                                )
                                    return

                                const selectedProject = projectsForConnection[projectPath]

                                if (!selectedProject || !selectedProject.id) return

                                if (selectedProject.id !== currentProjectId) {
                                    switchConnection({
                                        connectionId: selectedConnection.id,
                                        projectId: selectedProject.id,
                                    })
                                    return
                                }
                            }}
                        >
                            <HeaderButton
                                style={{
                                    marginRight: isLiquidGlassAvailable() ? undefined : 10,
                                }}
                            >
                                <Image
                                    source={require('@/assets/icon.png')}
                                    borderRadius={16}
                                    style={{ width: 32, height: 32 }}
                                />
                            </HeaderButton>
                        </ContextMenu>
                    ),
                    headerRight: () => (
                        <ContextMenu
                            dropdownMenuMode={true}
                            actions={[
                                {
                                    title: 'Icons',
                                    systemIcon: 'app.gift',
                                },
                                {
                                    title: 'Feedback',
                                    systemIcon: 'message',
                                },
                                {
                                    title: 'Rate',
                                    systemIcon: 'star.fill',
                                },
                            ]}
                            onPress={async (e) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                                if (e.nativeEvent.name === 'Icons') {
                                    if (__DEV__) {
                                        router.push('/icons/')
                                        return
                                    }

                                    registerPlacement({
                                        placement: 'AppIcons',
                                        feature: () => {
                                            router.push('/icons/')
                                        },
                                    })
                                    return
                                }
                                if (e.nativeEvent.name === 'Feedback') {
                                    await WebBrowser.openBrowserAsync(
                                        process.env.EXPO_PUBLIC_FEEDBACK_URL!
                                    )
                                    return
                                }
                                if (e.nativeEvent.name === 'Rate') {
                                    Alert.alert(
                                        'Do you like Ocean?',
                                        'Let us know about your experience.',
                                        [
                                            {
                                                text: 'No',
                                                onPress: () => {
                                                    Alert.alert(
                                                        'Thank you!',
                                                        'Your review has been sent successfully.'
                                                    )
                                                },
                                            },
                                            {
                                                text: 'Yes',
                                                onPress: () => {
                                                    if (
                                                        usePersistedStore.getState()
                                                            .installationTs <
                                                        Date.now() - ms('1d')
                                                    ) {
                                                        StoreReview.requestReview()
                                                        return
                                                    }

                                                    registerPlacement({
                                                        placement: 'LifetimeOffer_1_Show',
                                                        feature: async () => {
                                                            await StoreReview.requestReview()
                                                        },
                                                    }).catch((error) => {
                                                        Sentry.captureException(error)
                                                        console.error(
                                                            'Error registering LifetimeOffer_1_Show for Rate',
                                                            error
                                                        )
                                                    })
                                                },
                                            },
                                        ]
                                    )
                                    return
                                }
                            }}
                        >
                            <HeaderTouchableOpacity>
                                <Ionicons
                                    name="ellipsis-horizontal-sharp"
                                    size={32}
                                    color={COLORS.text}
                                />
                            </HeaderTouchableOpacity>
                        </ContextMenu>
                    ),
                }}
            />

            <FlashList
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={<RefreshControl onRefresh={projectResourcesQuery.refetch} />}
                showsVerticalScrollIndicator={false}
                data={Placeholder ? [] : filteredResources}
                extraData={[minimizedTypes, resourceTypeCounts]}
                overrideProps={overrideProps}
                ListEmptyComponent={Placeholder}
                renderItem={({ item: resource }) => {
                    if (typeof resource === 'string') {
                        return (
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: 16,
                                    borderBottomWidth: 1,
                                    borderColor: COLORS.hr,
                                }}
                                onPress={() => {
                                    toggleMinimizedType({
                                        connectionId: currentConnection.id,
                                        type: resource,
                                    })
                                }}
                            >
                                <Image
                                    source={
                                        ICON_FOR_RESOURCE_TYPE[
                                            resource as keyof typeof ICON_FOR_RESOURCE_TYPE
                                        ]
                                    }
                                    style={{ width: 24, height: 24 }}
                                />
                                <Text
                                    style={{
                                        fontSize: 20,
                                        color: COLORS.text,
                                        fontWeight: '600',
                                    }}
                                >
                                    {TITLE_FOR_RESOURCE_TYPE[resource]}{' '}
                                    <Text
                                        style={{
                                            fontSize: 20,
                                            color: COLORS.textMuted,
                                            fontWeight: '500',
                                        }}
                                    >
                                        {resourceTypeCounts?.[resource] &&
                                            `(${resourceTypeCounts[resource]})`}
                                    </Text>
                                </Text>
                                <Ionicons
                                    name={
                                        minimizedTypes[currentConnection.id]?.includes(resource)
                                            ? 'chevron-forward-outline'
                                            : 'chevron-down-outline'
                                    }
                                    size={24}
                                    color={COLORS.textMuted}
                                    style={{
                                        marginLeft: 'auto',
                                    }}
                                />
                            </TouchableOpacity>
                        )
                    }

                    if (
                        ACCEPTED_RESOURCE_TYPES.includes(
                            resource.type as keyof typeof COMPONENT_FOR_RESOURCE_TYPE
                        )
                    ) {
                        if (minimizedTypes[currentConnection.id]?.includes(resource.type)) {
                            return null
                        }

                        const Component =
                            COMPONENT_FOR_RESOURCE_TYPE[
                                resource.type as keyof typeof COMPONENT_FOR_RESOURCE_TYPE
                            ]

                        if (resource.type === 'space' && 'url' in resource) {
                            return (
                                <Component
                                    idOrName={resource.idOrName}
                                    extraData={{ url: resource.url }}
                                />
                            )
                        }

                        // @ts-expect-error - this is fine
                        return <Component idOrName={resource.idOrName} />
                    }

                    return null
                }}
                ListFooterComponent={
                    Placeholder
                        ? () => null
                        : () => {
                              return (
                                  <View style={{ paddingVertical: 50 }}>
                                      <ApiStatus />
                                  </View>
                              )
                          }
                }
            />

            <BottomGradient />
        </>
    )
}

function DatabaseClusterCard({ idOrName }: { idOrName: string }) {
    const withReview = useWithReview()
    const databaseClusterQuery = useQuery({
        queryKey: ['databaseCluster', idOrName],
        queryFn: async () => fetchDatabaseCluster({ id: idOrName }),
        enabled: !!idOrName,
    })

    const data = useMemo(() => databaseClusterQuery.data, [databaseClusterQuery.data])

    const subtitleString = useMemo(() => {
        if (!data) return undefined
        const items: string[] = []
        if (data.engine) {
            const engineDisplayName =
                DB_CLUSTER_ENGINE_LABELS[data.engine as keyof typeof DB_CLUSTER_ENGINE_LABELS] ||
                data.engine

            items.push(`${engineDisplayName} ${data.version ? `v${data.version}` : ''}`)
        }
        // if (data.num_nodes) {
        //     items.push(`${data.num_nodes} ${data.num_nodes === 1 ? 'node' : 'nodes'}`)
        // }
        if (data.size !== undefined) {
            const splitted = data.size.split('-')
            const cpus = splitted.find((item: string) => item.includes('vcpu'))?.split('vcpu')[0]
            const memory = splitted.find((item: string) => item.includes('gb'))?.split('gb')[0]
            if (cpus) {
                items.push(`${cpus} vCPU`)
            }
            if (memory) {
                items.push(`${memory}GB RAM`)
            }
        }
        return items.join(' • ')
    }, [data])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: databaseClusterQuery.isLoading,
            isError: databaseClusterQuery.isError,
            hasData: !!data,
            hasParsedData: subtitleString !== undefined,
            emptyLabel: 'No database cluster data found',
            errorLabel: 'Error fetching database cluster',
        })
    }, [databaseClusterQuery.isLoading, databaseClusterQuery.isError, data, subtitleString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    // const statusColor =
    //     data.status === 'online'
    //         ? COLORS.green500
    //         : data.status === 'creating'
    //           ? COLORS.gold500
    //           : data.status === 'resizing'
    //             ? COLORS.blue500
    //             : data.status === 'migrating'
    //               ? COLORS.purple500
    //               : data.status === 'forking'
    //                 ? COLORS.teal500
    //                 : COLORS.neutral500

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                // borderBottomWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/databases/${encodeURIComponent(idOrName)}/`)
            })}
        >
            <ProjectListItem label={data.name} subtitle={subtitleString} endContent={data.region} />
        </TouchableOpacity>
    )
}

function VolumeCard({ idOrName }: { idOrName: string }) {
    const withReview = useWithReview()
    const volumeQuery = useQuery({
        queryKey: ['volume', idOrName],
        queryFn: async () => fetchVolume({ id: idOrName }),
        enabled: !!idOrName,
    })

    const data = useMemo(() => volumeQuery.data, [volumeQuery.data])

    const subtitleString = useMemo(() => {
        if (!data) return undefined
        const items: string[] = []
        if ((data.droplet_ids?.length || 0) > 0) {
            items.push(
                `${data.droplet_ids?.length} ${data.droplet_ids?.length === 1 ? 'droplet' : 'droplets'}`
            )
        }
        if (data.size_gigabytes) {
            items.push(`${data.size_gigabytes} GB`)
        }
        return items.join(' • ')
    }, [data])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: volumeQuery.isLoading,
            isError: volumeQuery.isError,
            hasData: !!data,
            hasParsedData: subtitleString !== undefined,
            emptyLabel: 'No volume data found',
            errorLabel: 'Error fetching volume',
        })
    }, [volumeQuery.isLoading, volumeQuery.isError, data, subtitleString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/volumes/${idOrName}/`)
            })}
        >
            <ProjectListItem
                label={data.name || idOrName}
                subtitle={subtitleString}
                endContent={data.region?.slug}
            />
        </TouchableOpacity>
    )
}

function SpaceCard({ idOrName, extraData }: { idOrName: string; extraData: { url: string } }) {
    const withReview = useWithReview()
    const currentConnection = usePersistedStore((state) => state.currentConnection)

    const spaceQuery = useQuery({
        queryKey: ['spaces', idOrName],
        queryFn: async () => {
            if (!idOrName) return null
            if (!currentConnection?.spacesAccessKey) return null

            const endpoint = extraData.url.replace(idOrName, '').replace('/.', '/')

            console.log('endpoint', endpoint)

            const s3Client = new S3({
                forcePathStyle: false, // Configures to use subdomain/virtual calling format.
                endpoint: endpoint,
                region: 'us-east-1',
                credentials: {
                    accessKeyId: currentConnection.spacesAccessKey.id,
                    secretAccessKey: currentConnection.spacesAccessKey.secret,
                },
            })

            try {
                // Initialize the result object
                const bucketInfo: {
                    name: string
                    region: string
                    createdAt: Date | null
                    versioning: { status: string; mfaDelete: string } | null
                    encryption: any
                    policy: any
                    acl: any
                    tags: any
                    cors: any
                    lifecycle: any
                } = {
                    name: idOrName,
                    region: 'us-east-1',
                    createdAt: null,
                    versioning: null,
                    encryption: null,
                    policy: null,
                    acl: null,
                    tags: null,
                    cors: null,
                    lifecycle: null,
                }

                // Check if bucket exists and get basic info
                await s3Client.headBucket({ Bucket: idOrName })

                // Get bucket location/region
                try {
                    const locationResponse = await s3Client.getBucketLocation({ Bucket: idOrName })
                    bucketInfo.region = locationResponse.LocationConstraint || 'us-east-1'
                } catch (e) {
                    console.log('Could not get bucket location:', e)
                }

                // Get bucket versioning
                try {
                    const versioningResponse = await s3Client.getBucketVersioning({
                        Bucket: idOrName,
                    })
                    bucketInfo.versioning = {
                        status: versioningResponse.Status || 'Disabled',
                        mfaDelete: versioningResponse.MFADelete || 'Disabled',
                    }
                } catch (e) {
                    console.log('Could not get bucket versioning:', e)
                }

                // Get bucket encryption
                try {
                    const encryptionResponse = await s3Client.getBucketEncryption({
                        Bucket: idOrName,
                    })
                    bucketInfo.encryption = encryptionResponse.ServerSideEncryptionConfiguration
                } catch (e) {
                    console.log('Could not get bucket encryption:', e)
                }

                // Get bucket policy
                try {
                    const policyResponse = await s3Client.getBucketPolicy({ Bucket: idOrName })
                    bucketInfo.policy = policyResponse.Policy
                        ? JSON.parse(policyResponse.Policy)
                        : null
                } catch (e) {
                    console.log('Could not get bucket policy:', e)
                }

                // Get bucket tags
                try {
                    const tagsResponse = await s3Client.getBucketTagging({ Bucket: idOrName })
                    bucketInfo.tags = tagsResponse.TagSet
                } catch (e) {
                    console.log('Could not get bucket tags:', e)
                }

                // Get bucket CORS
                try {
                    const corsResponse = await s3Client.getBucketCors({ Bucket: idOrName })
                    bucketInfo.cors = corsResponse.CORSRules
                } catch (e) {
                    console.log('Could not get bucket CORS:', e)
                }

                // Get bucket lifecycle configuration
                try {
                    const lifecycleResponse = await s3Client.getBucketLifecycleConfiguration({
                        Bucket: idOrName,
                    })
                    bucketInfo.lifecycle = lifecycleResponse.Rules
                } catch (e) {
                    console.log('Could not get bucket lifecycle:', e)
                }

                console.log('Bucket info:', JSON.stringify(bucketInfo, null, 2))
                return bucketInfo
            } catch (error) {
                console.log('Error fetching bucket info:', error)
                return null
            }
        },
        enabled: !!idOrName,
    })

    const data = useMemo(() => spaceQuery.data, [spaceQuery.data])

    const regionString = useMemo(() => {
        if (!extraData.url) return undefined
        let scratch = extraData.url.replace('https://', '')
        scratch = scratch.replace('.digitaloceanspaces.com', '')
        return scratch.split('.').slice(-1)[0]
    }, [extraData.url])

    const subtitleString = useMemo(() => {
        return ''
    }, [])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: spaceQuery.isLoading,
            isError: spaceQuery.isError,
            hasData: !!data,
            hasParsedData: subtitleString !== undefined,
            emptyLabel: 'No space data found',
            errorLabel: 'Error fetching space',
        })
    }, [spaceQuery.isLoading, spaceQuery.isError, data, subtitleString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTopWidth: 1,
                // borderBottomWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/spaces/${encodeURIComponent(extraData.url)}/home`)
            })}
        >
            <ProjectListItem label={idOrName} subtitle={subtitleString} endContent={regionString} />
        </TouchableOpacity>
    )
}

function LoadBalancerCard({ idOrName }: { idOrName: string }) {
    const withReview = useWithReview()
    const loadBalancerQuery = useQuery({
        queryKey: ['loadBalancer', idOrName],
        queryFn: async () => fetchLoadBalancer({ id: idOrName }),
        enabled: !!idOrName,
    })

    const data = useMemo(() => loadBalancerQuery.data, [loadBalancerQuery.data])

    const subtitleString = useMemo(() => {
        if (!data) return undefined
        const items: string[] = []
        if (data.ip) {
            items.push(data.ip)
        }
        if ((data.droplet_ids?.length || 0) > 0) {
            items.push(
                `${data.droplet_ids?.length} ${data.droplet_ids?.length === 1 ? 'droplet' : 'droplets'}`
            )
        }
        if (data.size_unit !== undefined) {
            items.push(`${data.size_unit} ${data.size_unit === 1 ? 'node' : 'nodes'}`)
        }
        return items.join(' • ')
    }, [data])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: loadBalancerQuery.isLoading,
            isError: loadBalancerQuery.isError,
            hasData: !!data,
            hasParsedData: subtitleString !== undefined,
            emptyLabel: 'No load balancer data found',
            errorLabel: 'Error fetching load balancer',
        })
    }, [loadBalancerQuery.isLoading, loadBalancerQuery.isError, data, subtitleString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    // const statusColor =
    //     data.status === 'active'
    //         ? COLORS.green500
    //         : data.status === 'errored'
    //           ? COLORS.red500
    //           : data.status === 'new'
    //             ? COLORS.gold500
    //             : COLORS.neutral500

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                // borderBottomWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/loadBalancers/${encodeURIComponent(idOrName)}/`)
            })}
        >
            <ProjectListItem
                label={data.name || idOrName}
                subtitle={subtitleString}
                endContent={data.region?.slug}
            />
        </TouchableOpacity>
    )
}

function AppCard({ idOrName }: { idOrName: string }) {
    const withReview = useWithReview()
    const appQuery = useQuery({
        queryKey: ['app', idOrName],
        queryFn: async () => fetchApp({ id: idOrName }),
        enabled: !!idOrName,
    })

    const data = useMemo(() => appQuery.data, [appQuery.data])

    const subtitleString = useMemo(() => {
        if (!data) return undefined
        const items: string[] = []

        const serviceCount = data.spec?.services?.length || 0
        const workerCount = data.spec?.workers?.length || 0
        const jobCount = data.spec?.jobs?.length || 0
        const totalComponents = serviceCount + workerCount + jobCount
        if (totalComponents > 0) {
            items.push(`${totalComponents}${totalComponents === 1 ? ' service' : ' services'}`)
        }

        if (data.live_domain) {
            items.push(data.live_domain.replace('.ondigitalocean.app', ''))
        }

        return items.join(' • ')
    }, [data])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: appQuery.isLoading,
            isError: appQuery.isError,
            hasData: !!data,
            hasParsedData: subtitleString !== undefined,
            emptyLabel: 'No app data found',
            errorLabel: 'Error fetching app',
        })
    }, [appQuery.isLoading, appQuery.isError, data, subtitleString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    // const deploymentStatus = data.active_deployment?.phase || 'unknown'
    // const statusColor =
    //     deploymentStatus === 'ACTIVE'
    //         ? COLORS.green500
    //         : deploymentStatus === 'BUILDING'
    //           ? COLORS.gold500
    //           : deploymentStatus === 'DEPLOYING'
    //             ? COLORS.blue500
    //             : deploymentStatus === 'ERROR'
    //               ? COLORS.red500
    //               : COLORS.neutral500

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/apps/${encodeURIComponent(idOrName)}/home/`)
            })}
        >
            <ProjectListItem
                label={data.spec.name}
                subtitle={subtitleString}
                endContent={data.region?.slug}
            />
        </TouchableOpacity>
    )
}

function DomainCard({ idOrName }: { idOrName: string }) {
    const withReview = useWithReview()
    const domainQuery = useQuery({
        queryKey: ['domain', idOrName],
        queryFn: async () => fetchDomain({ name: idOrName }),
        enabled: !!idOrName,
    })

    const data = useMemo(() => domainQuery.data, [domainQuery.data])

    const recordTypeCounts = useMemo(() => {
        if (!data?.zone_file) return undefined
        const parsedZone = parseZone(data?.zone_file)
        const counts: Record<string, number> = {}
        for (const record of parsedZone.records) {
            counts[record.type] = (counts[record.type] || 0) + 1
        }
        return counts
    }, [data?.zone_file])

    const recordTypeCountsString = useMemo(() => {
        if (!recordTypeCounts) return undefined
        return Object.entries(recordTypeCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, count]) => `${count} ${type}`)
            .join(' • ')
    }, [recordTypeCounts])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: domainQuery.isLoading,
            isError: domainQuery.isError,
            hasData: !!data,
            hasParsedData: recordTypeCountsString !== undefined,
            emptyLabel: 'No domain data found',
            errorLabel: 'Error fetching domain',
        })
    }, [domainQuery.isLoading, domainQuery.isError, data, recordTypeCountsString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/domains/${encodeURIComponent(idOrName)}/`)
            })}
        >
            <ProjectListItem label={data.name || idOrName} subtitle={recordTypeCountsString} />
        </TouchableOpacity>
    )
}

function DropletCard({ idOrName }: { idOrName: string }) {
    const withReview = useWithReview()
    const dropletQuery = useQuery({
        queryKey: ['droplets', idOrName],
        queryFn: async () => fetchDroplet({ id: idOrName }),
        enabled: !!idOrName,
    })

    const data = useMemo(() => dropletQuery.data, [dropletQuery.data])

    const subtitleString = useMemo(() => {
        if (!data) return undefined
        const items: string[] = []
        const publicIPv4 = data.networks?.v4?.find(
            (network: any) => network.type === 'public'
        )?.ip_address
        if (publicIPv4) {
            items.push(publicIPv4)
        }
        if (data.vcpus && data.memory) {
            const memoryInGB = Math.round(data.memory / 1024)
            items.push(`${data.vcpus} vCPU & ${memoryInGB}GB`)
        }
        // if (data.memory) {
        //     const memoryInGB = Math.round(data.memory / 1024)
        //     items.push(`${memoryInGB}GB`)
        // }
        // if (data.disk) {
        //     items.push(`${data.disk}GB SSD`)
        // }
        if (data.image?.name) {
            items.push(data.image.name)
        }
        return items.join(' • ')
    }, [data])

    const statusColor = useMemo(() => {
        if (!data) return undefined
        if (data.status === 'active') return COLORS.success
        if (data.status === 'off') return COLORS.error
        return COLORS.warning
    }, [data])

    const Placeholder = useMemo(() => {
        return ProjectListItemPlaceholder({
            isLoading: dropletQuery.isLoading,
            isError: dropletQuery.isError,
            hasData: !!data,
            hasParsedData: subtitleString !== undefined,
            emptyLabel: 'No droplet data found',
            errorLabel: 'Error fetching droplet',
        })
    }, [dropletQuery.isLoading, dropletQuery.isError, data, subtitleString])

    if (Placeholder) {
        return Placeholder
    }

    if (!data) {
        // pleasing the compiler
        return null
    }

    return (
        <TouchableOpacity
            style={{
                backgroundColor: COLORS.bgSecondary,
                padding: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                // borderBottomWidth: 1,
                borderColor: COLORS.hr,
            }}
            onPress={withReview(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
                router.push(`/droplets/${encodeURIComponent(idOrName)}/home/`)
            })}
        >
            <ProjectListItem
                label={data.name}
                subtitle={subtitleString}
                endContent={data.region?.slug}
                statusColor={statusColor}
            />
        </TouchableOpacity>
    )
}

function ZoneBadge({ zone }: { zone: string }) {
    return (
        <Text
            style={{
                fontSize: 14,
                color: COLORS.text,
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 4,
                backgroundColor: COLORS.hr,
                textTransform: 'uppercase',
            }}
        >
            {zone}
        </Text>
    )
}

function ProjectListItem({
    label,
    subtitle,
    endContent,
    statusColor,
}: { label: string; subtitle?: string; endContent?: string; statusColor?: string }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
            }}
        >
            <View style={{ gap: 2, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: statusColor ? statusColor : COLORS.success,
                        }}
                    />
                    <Text
                        style={{
                            fontSize: 16,
                            color: COLORS.text,
                            fontWeight: '600',
                            marginBottom: 2,
                        }}
                    >
                        {label}
                    </Text>
                </View>

                {subtitle && (
                    <Text style={{ fontSize: 14, color: COLORS.textMuted }}>{subtitle}</Text>
                )}
            </View>

            <View
                style={{
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    height: '100%',
                }}
            >
                {endContent && <ZoneBadge zone={endContent} />}
            </View>
        </View>
    )
}

function ProjectListItemPlaceholder({
    isLoading,
    isError,
    hasData,
    hasParsedData,
    emptyLabel,
    errorLabel,
}: {
    isLoading: boolean
    isError: boolean
    hasData: boolean
    hasParsedData: boolean
    emptyLabel: string
    errorLabel: string
}) {
    if (isLoading || (hasData && !hasParsedData)) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: COLORS.bgSecondary,
                    borderTopWidth: 1,
                    borderColor: COLORS.hr,
                    padding: 16,
                }}
            >
                <ActivityIndicator />
            </View>
        )
    }
    if (isError) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: COLORS.bgSecondary,
                    padding: 16,
                    paddingHorizontal: 20,
                    borderTopWidth: 1,
                    borderColor: COLORS.hr,
                }}
            >
                <Text style={{ color: COLORS.red500 }}>{errorLabel}</Text>
            </View>
        )
    }
    if (!hasData || !hasParsedData) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: COLORS.bgSecondary,
                    padding: 16,
                    paddingHorizontal: 20,
                    borderTopWidth: 1,
                    borderColor: COLORS.hr,
                }}
            >
                <Text style={{ color: COLORS.textMuted }}>{emptyLabel}</Text>
            </View>
        )
    }
    return null
}
