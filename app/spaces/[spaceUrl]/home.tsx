import { fetchSpacesAccessKeys } from '@/api/queries'
import InfoRow from '@/components/InfoRow'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { S3 } from '@aws-sdk/client-s3'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function SpaceScreen() {
    const { spaceUrl } = useLocalSearchParams<{ spaceUrl: string }>()

    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const acknowledge = usePersistedStore((state) => state.acknowledge)
    const acknowledged = usePersistedStore((state) => state.acknowledgments)

    const spaceName = useMemo(() => {
        let name = spaceUrl.replace('https://', '').replace('http://', '').replace('www.', '')
        name = name.split('.')[0]
        return name
    }, [spaceUrl])

    const spaceKeysQuery = useQuery({
        queryKey: ['spaces', spaceName, 'keys'],
        queryFn: async () => {
            if (!spaceName) return null
            const keys = await fetchSpacesAccessKeys({ bucket: spaceName })
            return keys
        },
        enabled: !!spaceName,
    })

    const spaceKeys = useMemo(() => spaceKeysQuery.data, [spaceKeysQuery.data])

    const spaceQuery = useQuery({
        queryKey: ['spaces', spaceName],
        queryFn: async () => {
            if (!spaceName) return null
            if (!currentConnection?.spacesAccessKey) return null

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')

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
                    name: spaceName,
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
                await s3Client.headBucket({ Bucket: spaceName })

                // Get bucket location/region
                try {
                    const locationResponse = await s3Client.getBucketLocation({ Bucket: spaceName })
                    bucketInfo.region = locationResponse.LocationConstraint || 'us-east-1'
                } catch (e) {
                    console.log('Could not get bucket location:', e)
                }

                // Get bucket versioning
                try {
                    const versioningResponse = await s3Client.getBucketVersioning({
                        Bucket: spaceName,
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
                        Bucket: spaceName,
                    })
                    bucketInfo.encryption = encryptionResponse.ServerSideEncryptionConfiguration
                } catch (e) {
                    console.log('Could not get bucket encryption:', e)
                }

                // Get bucket policy
                try {
                    const policyResponse = await s3Client.getBucketPolicy({ Bucket: spaceName })
                    bucketInfo.policy = policyResponse.Policy
                        ? JSON.parse(policyResponse.Policy)
                        : null
                } catch (e) {
                    console.log('Could not get bucket policy:', e)
                }

                // Get bucket tags
                try {
                    const tagsResponse = await s3Client.getBucketTagging({ Bucket: spaceName })
                    bucketInfo.tags = tagsResponse.TagSet
                } catch (e) {
                    console.log('Could not get bucket tags:', e)
                }

                // Get bucket CORS
                try {
                    const corsResponse = await s3Client.getBucketCors({ Bucket: spaceName })
                    bucketInfo.cors = corsResponse.CORSRules
                } catch (e) {
                    console.log('Could not get bucket CORS:', e)
                }

                // Get bucket lifecycle configuration
                try {
                    const lifecycleResponse = await s3Client.getBucketLifecycleConfiguration({
                        Bucket: spaceName,
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
        enabled: !!spaceName,
    })

    const space = useMemo(() => spaceQuery.data, [spaceQuery.data])!

    const deleteSpaceMutation = useMutation({
        mutationFn: async () => {
            if (!spaceName) throw new Error('Space name is required')
            if (!currentConnection?.spacesAccessKey) throw new Error('No access key found')

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')

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

            await s3Client.deleteBucket({ Bucket: spaceName })
        },
        onSuccess: () => {
            router.back()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const isFileListingEnabled = useMemo(() => {
        const hasPublicListAccess =
            space?.acl?.grants?.some(
                (grant: any) =>
                    grant.Grantee?.Type === 'Group' &&
                    grant.Grantee?.URI?.includes('AllUsers') &&
                    grant.Permission === 'READ'
            ) ||
            space?.policy?.Statement?.some(
                (statement: any) =>
                    statement.Effect === 'Allow' &&
                    statement.Principal === '*' &&
                    (statement.Action?.includes('s3:ListBucket') ||
                        statement.Action?.includes('s3:GetBucketLocation'))
            )

        return hasPublicListAccess
    }, [space?.acl, space?.policy])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: spaceQuery.isLoading,
            isError: spaceQuery.isError,
            hasData: !!space,
            emptyLabel: 'No space found',
            errorLabel: `Error loading space (${spaceQuery.error?.message || 'Unknown error'})`,
        })
    }, [space, spaceQuery.isLoading, spaceQuery.isError, spaceQuery.error?.message])

    return (
        <>
            <Stack.Screen
                // name="index"
                options={{
                    headerShown: true,
                    headerLargeTitle: true,
                    title: spaceName || '',
                    headerRight: deleteSpaceMutation.isPending
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
                                                              'The space will be deleted and cannot be recovered.',
                                                              [
                                                                  {
                                                                      text: 'Cancel',
                                                                      style: 'cancel',
                                                                  },
                                                                  {
                                                                      text: 'Delete space',
                                                                      style: 'destructive',
                                                                      onPress: () => {
                                                                          deleteSpaceMutation.mutate()
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
                <>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentInsetAdjustmentBehavior="automatic"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 0, flexDirection: 'column' }}
                        refreshControl={
                            <RefreshControl
                                refreshing={spaceQuery.isRefetching}
                                onRefresh={async () => {
                                    await Promise.all([
                                        spaceQuery.refetch(),
                                        spaceKeysQuery.refetch(),
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
                                label="Endpoint"
                                icon="hardware-chip-outline"
                                value={spaceUrl}
                                isLight={true}
                                isCopyable={true}
                            />

                            <InfoRow
                                label="Region URL"
                                icon="location-outline"
                                value={`${space.region}.digitaloceanspaces.com`}
                            />
                            <InfoRow
                                label="Region"
                                icon="location-outline"
                                value={space.region}
                                isLight={true}
                            />
                            <InfoRow
                                label="Object Versioning"
                                icon="git-branch-outline"
                                value={space.versioning ? space.versioning.status : 'Unknown'}
                            />
                            <InfoRow
                                label="Encryption"
                                icon="lock-closed-outline"
                                value={space.encryption ? 'Enabled' : 'Disabled'}
                                isLight={true}
                            />
                            <InfoRow
                                label="Tags"
                                icon="pricetags-outline"
                                value={
                                    space.tags && space.tags.length > 0
                                        ? `${space.tags.length} tags`
                                        : 'No tags'
                                }
                            />
                            <InfoRow
                                label="CORS"
                                icon="globe-outline"
                                value={
                                    space.cors && space.cors.length > 0
                                        ? 'Configured'
                                        : 'Not configured'
                                }
                                isLight={true}
                            />
                            <InfoRow
                                label="Lifecycle Rules"
                                icon="time-outline"
                                value={
                                    space.lifecycle && space.lifecycle.length > 0
                                        ? `${space.lifecycle.length} rules`
                                        : 'No rules'
                                }
                            />
                            <InfoRow
                                label="Policy"
                                icon="document-outline"
                                value={space.policy ? 'Configured' : 'No policy'}
                                isLight={true}
                            />

                            <InfoRow
                                label="File Listing"
                                icon="list-outline"
                                value={isFileListingEnabled ? 'Enabled' : 'Restricted'}
                            />

                            <InfoRow
                                label="Access Keys"
                                icon="key-outline"
                                value={`${spaceKeys?.length || 0} Keys`}
                                isLight={true}
                            />

                            {/* {space.objects && space.objects.length > 0 && (
                            <View style={{ marginTop: 16 }}>
                                <Text
                                    style={{
                                        color: COLORS.text,
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginBottom: 12,
                                        paddingHorizontal: 16,
                                    }}
                                >
                                    Recent Objects
                                </Text>
                                {space.objects.slice(0, 5).map((obj: any, index: number) => (
                                    <InfoRow
                                        key={index}
                                        label={obj.key}
                                        icon="document-outline"
                                        value={
                                            obj.size ? `${(obj.size / 1024).toFixed(2)} KB` : '0 KB'
                                        }
                                        isLight={index % 2 === 0}
                                    />
                                ))}
                            </View>
                        )} */}
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bottom: 48,
                            left: 0,
                            right: 0,
                            // height: 100,
                            marginHorizontal: 16,
                            backgroundColor: COLORS.primaryLight,
                            borderRadius: 16,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: COLORS.hr,
                        }}
                        onPress={() => {
                            router.push(`/spaces/${encodeURIComponent(spaceUrl)}/browse`)
                        }}
                    >
                        <Text style={{ color: COLORS.blue900, fontWeight: 500 }}>
                            Tap to browse and manage files
                        </Text>
                        <Ionicons name="arrow-forward-outline" size={24} color={COLORS.blue900} />
                    </TouchableOpacity>
                </>
            )}
        </>
    )
}
