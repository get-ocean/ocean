import ActivityIndicator from '@/components/base/ActivityIndicator'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { formatBytes } from '@/lib/format'
import WidgetKitModule from '@/modules/widgetkit'
import { usePersistedStore } from '@/store/persisted'
import { COLORS } from '@/theme/colors'
import { S3 } from '@aws-sdk/client-s3'
import type { ListObjectsV2CommandOutput } from '@aws-sdk/client-s3'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { usePlacement, useUser } from 'expo-superwall'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, FlatList, Pressable, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

// Helpers for byte/base64 conversions used for upload/download
function base64ToUint8Array(base64: string): Uint8Array {
    const clean = base64.replace(/\s/g, '')
    const lookup = new Uint8Array(256)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i
    let bufferLength = clean.length * 0.75
    if (clean[clean.length - 1] === '=') bufferLength--
    if (clean[clean.length - 2] === '=') bufferLength--
    const bytes = new Uint8Array(bufferLength)
    let p = 0
    for (let i = 0; i < clean.length; i += 4) {
        const encoded1 = lookup[clean.charCodeAt(i)]
        const encoded2 = lookup[clean.charCodeAt(i + 1)]
        const encoded3 = lookup[clean.charCodeAt(i + 2)]
        const encoded4 = lookup[clean.charCodeAt(i + 3)]
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
        if (encoded3 !== 64 && !Number.isNaN(encoded3)) {
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
        }
        if (encoded4 !== 64 && !Number.isNaN(encoded4)) {
            bytes[p++] = ((encoded3 & 3) << 6) | encoded4
        }
    }
    return bytes
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk) as number[])
    }
    // btoa is not guaranteed in RN; implement inline
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let output = ''
    let i = 0
    const len = binary.length
    while (i < len) {
        const c1 = binary.charCodeAt(i++)
        const c2 = binary.charCodeAt(i++)
        const c3 = binary.charCodeAt(i++)
        const enc1 = c1 >> 2
        const enc2 = ((c1 & 3) << 4) | (c2 >> 4)
        let enc3 = ((c2 & 15) << 2) | (c3 >> 6)
        let enc4 = c3 & 63
        if (Number.isNaN(c2)) {
            enc3 = enc4 = 64
        } else if (Number.isNaN(c3)) {
            enc4 = 64
        }
        output +=
            chars.charAt(enc1) +
            chars.charAt(enc2) +
            (enc3 === 64 ? '=' : chars.charAt(enc3)) +
            (enc4 === 64 ? '=' : chars.charAt(enc4))
    }
    return output
}

async function streamBodyToUint8Array(body: any): Promise<Uint8Array> {
    // Newer SDKs expose transformToByteArray
    if (body && typeof body.transformToByteArray === 'function') {
        return await body.transformToByteArray()
    }
    // Blob in RN/browser
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
        const ab = await body.arrayBuffer()
        return new Uint8Array(ab)
    }
    // ReadableStream in RN/browser
    if (body && typeof body.getReader === 'function') {
        const reader = body.getReader()
        const chunks: Uint8Array[] = []
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
        }
        let totalLength = 0
        for (const c of chunks) totalLength += c.length
        const merged = new Uint8Array(totalLength)
        let offset = 0
        for (const c of chunks) {
            merged.set(c, offset)
            offset += c.length
        }
        return merged
    }
    // Fallback: assume ArrayBuffer or Uint8Array
    if (body instanceof ArrayBuffer) return new Uint8Array(body)
    if (body instanceof Uint8Array) return body
    // Last resort: treat as string
    if (typeof body === 'string') {
        return new TextEncoder().encode(body)
    }
    throw new Error('Unsupported response body type for download')
}

type ObjectListItem = {
    key: string
    name: string
    isDirectory: boolean
    size: number
    lastModified?: string
}

type SpacesObjectAcl = 'private' | 'public-read'

export default function SpaceBrowseScreen() {
    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()

    const { spaceUrl, path: pathParam } = useLocalSearchParams<{
        spaceUrl: string
        path?: string
    }>()

    const queryClient = useQueryClient()

    const currentConnection = usePersistedStore((state) => state.currentConnection)

    // Delete mode and selection state
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

    const clearSelection = useCallback(() => {
        setSelectedKeys(new Set())
    }, [])

    const toggleSelectItem = useCallback((item: ObjectListItem) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev)
            if (next.has(item.key)) next.delete(item.key)
            else next.add(item.key)
            return next
        })
    }, [])

    // Initial slide-up animation for bottom navigation bar (runs once on mount)
    const bottomBarTranslateY = useRef(new Animated.Value(80)).current
    useEffect(() => {
        const animation = Animated.sequence([
            Animated.delay(140),
            Animated.timing(bottomBarTranslateY, {
                toValue: 0,
                duration: 350,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ])
        animation.start()
        return () => {
            animation.stop()
        }
        // only on first mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bottomBarTranslateY])

    const spaceName = useMemo(() => {
        let name = spaceUrl.replace('https://', '').replace('http://', '').replace('www.', '')
        name = name.split('.')[0]
        return name
    }, [spaceUrl])

    // Normalize current path used as Prefix for S3 listing
    const currentPath = useMemo(() => {
        if (!pathParam) return ''
        const raw = Array.isArray(pathParam) ? pathParam[0] : pathParam
        let normalized = raw.trim()
        if (normalized.startsWith('/')) normalized = normalized.slice(1)
        // Store without trailing slash here; we will add when needed for Prefix
        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1)
        return normalized
    }, [pathParam])

    const currentPrefix = useMemo(() => {
        if (!currentPath) return undefined
        return currentPath.endsWith('/') ? currentPath : `${currentPath}/`
    }, [currentPath])

    const navigateToPath = useCallback((newPath: string) => {
        // Expect newPath without leading '/'
        const cleaned = newPath.startsWith('/') ? newPath.slice(1) : newPath
        router.setParams({ path: cleaned })
    }, [])

    const navigateUp = useCallback(() => {
        if (!currentPath) {
            router.back()
            return
        }
        const parts = currentPath.split('/').filter(Boolean)
        parts.pop()
        const parent = parts.join('/')
        navigateToPath(parent)
    }, [currentPath, navigateToPath])

    // List objects for current path
    const objectsQuery = useQuery({
        queryKey: ['spaces', spaceName, 'objects', currentPath],
        queryFn: async () => {
            if (!spaceName) return []
            if (!currentConnection?.spacesAccessKey) return []

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')
            const s3Client = new S3({
                forcePathStyle: false,
                endpoint,
                region: 'us-east-1',
                credentials: {
                    accessKeyId: currentConnection.spacesAccessKey.id,
                    secretAccessKey: currentConnection.spacesAccessKey.secret,
                },
            })

            const response = await s3Client.listObjectsV2({
                Bucket: spaceName,
                Delimiter: '/',
                Prefix: currentPrefix,
                MaxKeys: 1000,
            })

            const folders = (response.CommonPrefixes || []).map((p) => {
                const prefix = p.Prefix || ''
                const withoutCurrent = currentPrefix ? prefix.replace(currentPrefix, '') : prefix
                const name = withoutCurrent.replace(/\/$/, '')
                return {
                    key: prefix,
                    name,
                    isDirectory: true,
                    size: 0,
                    lastModified: undefined as undefined | string,
                }
            })

            const files = (response.Contents || [])
                .filter((obj) => obj.Key !== currentPrefix) // skip the directory placeholder
                .map((obj) => {
                    const key = obj.Key || ''
                    const name = currentPrefix ? key.replace(currentPrefix, '') : key
                    return {
                        key,
                        name,
                        isDirectory: false,
                        size: obj.Size || 0,
                        lastModified: obj.LastModified?.toISOString(),
                    }
                })

            // Folders first, then files
            return [...folders, ...files]
        },
        enabled: !!spaceName,
    })

    const selectedItems = useMemo(() => {
        const data = (objectsQuery.data as ObjectListItem[]) || []
        if (selectedKeys.size === 0) return [] as ObjectListItem[]
        return data.filter((i) => selectedKeys.has(i.key))
    }, [objectsQuery.data, selectedKeys])

    const uploadMutation = useMutation({
        mutationFn: async (params: {
            asset: DocumentPicker.DocumentPickerAsset
            acl: SpacesObjectAcl
        }) => {
            const { asset, acl } = params
            if (!spaceName) throw new Error('Space name is required')
            if (!currentConnection?.spacesAccessKey) throw new Error('No access key found')

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')
            const s3Client = new S3({
                forcePathStyle: false,
                endpoint,
                region: 'us-east-1',
                credentials: {
                    accessKeyId: currentConnection.spacesAccessKey.id,
                    secretAccessKey: currentConnection.spacesAccessKey.secret,
                },
            })

            // Read file as base64 and convert to bytes for S3
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            })
            const bodyBytes = base64ToUint8Array(base64)

            const key = `${currentPrefix || ''}${asset.name}`
            await s3Client.putObject({
                Bucket: spaceName,
                Key: key,
                Body: bodyBytes,
                ContentType: (asset as any).mimeType || 'application/octet-stream',
                ACL: acl,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spaces', spaceName, 'objects'] })
        },
        onError: (error: any) => {
            Alert.alert('Upload failed', error?.message || 'Unknown error')
        },
    })

    const downloadFileMutation = useMutation({
        mutationFn: async (item: ObjectListItem) => {
            if (item.isDirectory) return
            if (!spaceName) throw new Error('Space name is required')
            if (!currentConnection?.spacesAccessKey) throw new Error('No access key found')

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')
            const s3Client = new S3({
                forcePathStyle: false,
                endpoint,
                region: 'us-east-1',
                credentials: {
                    accessKeyId: currentConnection.spacesAccessKey.id,
                    secretAccessKey: currentConnection.spacesAccessKey.secret,
                },
            })

            const resp = await s3Client.getObject({ Bucket: spaceName, Key: item.key })
            const bytes = await streamBodyToUint8Array(resp.Body as any)
            const base64 = uint8ArrayToBase64(bytes)
            const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${item.name}`
            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
            })
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri)
            } else {
                Alert.alert('Downloaded', `Saved to: ${fileUri}`)
            }
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Something went wrong, please try again.')
        },
        onSuccess: () => {
            downloadFileMutation.reset()
        },
    })

    const createFolderMutation = useMutation({
        mutationFn: async (folderName: string) => {
            if (!spaceName) throw new Error('Space name is required')
            if (!currentConnection?.spacesAccessKey) throw new Error('No access key found')

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')
            const s3Client = new S3({
                forcePathStyle: false,
                endpoint,
                region: 'us-east-1',
                credentials: {
                    accessKeyId: currentConnection.spacesAccessKey.id,
                    secretAccessKey: currentConnection.spacesAccessKey.secret,
                },
            })

            const sanitized = (folderName || '').trim().replace(/^\/+|\/+$/g, '')
            if (!sanitized) throw new Error('Folder name cannot be empty')
            const exists = ((objectsQuery.data as ObjectListItem[]) || []).some(
                (i) => i.isDirectory && i.name === sanitized
            )
            if (exists) throw new Error('Folder already exists')
            const key = `${currentPrefix || ''}${sanitized}/`
            await s3Client.putObject({
                Bucket: spaceName,
                Key: key,
                Body: new Uint8Array(0),
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spaces', spaceName, 'objects'] })
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Something went wrong, please try again.')
        },
    })

    const deleteObjectsMutation = useMutation({
        mutationFn: async (items: ObjectListItem[]) => {
            if (!items || items.length === 0) return
            if (!spaceName) throw new Error('Space name is required')
            if (!currentConnection?.spacesAccessKey) throw new Error('No access key found')

            const endpoint = spaceUrl.replace(spaceName, '').replace('/.', '/')
            const s3Client = new S3({
                forcePathStyle: false,
                endpoint,
                region: 'us-east-1',
                credentials: {
                    accessKeyId: currentConnection.spacesAccessKey.id,
                    secretAccessKey: currentConnection.spacesAccessKey.secret,
                },
            })

            async function deletePrefixRecursively(prefix: string) {
                let token: string | undefined
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const resp: ListObjectsV2CommandOutput = await s3Client.listObjectsV2({
                        Bucket: spaceName,
                        Prefix: prefix,
                        ContinuationToken: token,
                        MaxKeys: 1000,
                    })
                    const contents = (resp.Contents || []) as Array<{ Key?: string }>
                    const objects = contents.map((o) => ({ Key: o.Key! }))
                    for (let i = 0; i < objects.length; i += 1000) {
                        const chunk = objects.slice(i, i + 1000)
                        if (chunk.length > 0) {
                            await s3Client.deleteObjects({
                                Bucket: spaceName,
                                Delete: { Objects: chunk, Quiet: true },
                            })
                        }
                    }
                    if (!resp.IsTruncated) break
                    token = resp.NextContinuationToken
                }
            }

            // Collect file keys for single-shot delete
            const fileKeys = items.filter((i) => !i.isDirectory).map((i) => ({ Key: i.key }))
            for (let i = 0; i < fileKeys.length; i += 1000) {
                const chunk = fileKeys.slice(i, i + 1000)
                if (chunk.length > 0) {
                    await s3Client.deleteObjects({
                        Bucket: spaceName,
                        Delete: { Objects: chunk, Quiet: true },
                    })
                }
            }

            // For folders, delete recursively by prefix
            const folderItems = items.filter((i) => i.isDirectory)
            for (const folder of folderItems) {
                await deletePrefixRecursively(folder.key)
            }
        },
        onSuccess: () => {
            clearSelection()
            setIsDeleteMode(false)
            queryClient.invalidateQueries({ queryKey: ['spaces', spaceName, 'objects'] })
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Something went wrong, please try again.')
        },
    })

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: objectsQuery.isLoading,
            isError: objectsQuery.isError,
            hasData: !!objectsQuery.data,
            emptyLabel: 'No space found',
            errorLabel: `Error loading space (${objectsQuery.error?.message || 'Unknown error'})`,
        })
    }, [
        objectsQuery.isLoading,
        objectsQuery.isError,
        objectsQuery.error?.message,
        objectsQuery.data,
    ])

    return (
        <>
            {Placeholder || (
                <>
                    <FlatList
                        data={(objectsQuery.data as ObjectListItem[]) || []}
                        keyExtractor={(item) => item.key}
                        ItemSeparatorComponent={() => (
                            <View style={{ height: 1, backgroundColor: COLORS.hr }} />
                        )}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        contentInsetAdjustmentBehavior="automatic"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    if (subscriptionStatus?.status !== 'ACTIVE' && !__DEV__) {
                                        registerPlacement({
                                            placement: 'BrowseSpace',
                                            feature: () => {
                                                WidgetKitModule.setIsSubscribed(true)
                                            },
                                        }).catch((error) => {
                                            Sentry.captureException(error)
                                            console.error('Error registering BrowseSpace', error)
                                            Alert.alert(
                                                'Error',
                                                'Something went wrong, please try again.'
                                            )
                                        })
                                        return
                                    }

                                    if (isDeleteMode) {
                                        toggleSelectItem(item)
                                        return
                                    }

                                    if (item.isDirectory) {
                                        const next = `${currentPrefix || ''}${item.name}`
                                        navigateToPath(next)
                                    } else {
                                        downloadFileMutation.mutate(item)
                                    }
                                }}
                                style={{
                                    paddingHorizontal: 16,
                                    height: 56,
                                    justifyContent: 'center',
                                }}
                            >
                                <View
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                >
                                    {isDeleteMode && (
                                        <Ionicons
                                            name={
                                                selectedKeys.has(item.key)
                                                    ? 'checkmark-circle'
                                                    : 'ellipse-outline'
                                            }
                                            size={20}
                                            color={
                                                selectedKeys.has(item.key)
                                                    ? '#F44336'
                                                    : COLORS.textMuted
                                            }
                                        />
                                    )}
                                    <Ionicons
                                        name={item.isDirectory ? 'folder' : 'document'}
                                        size={22}
                                        color={item.isDirectory ? '#FFB800' : COLORS.textMuted}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: COLORS.text }}>{item.name}</Text>
                                        {!item.isDirectory && (
                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {formatBytes(item.size)}
                                            </Text>
                                        )}
                                    </View>

                                    {!isDeleteMode &&
                                    !item.isDirectory &&
                                    downloadFileMutation.variables?.key === item.key &&
                                    downloadFileMutation.isPending ? (
                                        <ActivityIndicator sm={true} />
                                    ) : null}
                                    {!isDeleteMode &&
                                        !item.isDirectory &&
                                        downloadFileMutation.variables?.key !== item.key && (
                                            <Ionicons
                                                name="cloud-download"
                                                size={18}
                                                color={COLORS.textMuted}
                                            />
                                        )}
                                    {!isDeleteMode && item.isDirectory && (
                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color={COLORS.textMuted}
                                        />
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                        refreshControl={<RefreshControl onRefresh={objectsQuery.refetch} />}
                        ListHeaderComponent={() => (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderColor: COLORS.hr,
                                    backgroundColor: COLORS.bgSecondary,
                                }}
                            >
                                <Ionicons name="folder-open" size={16} color={COLORS.textMuted} />
                                <Text
                                    style={{ marginLeft: 8, color: COLORS.textMuted }}
                                    numberOfLines={1}
                                >
                                    {`/${currentPath}` || '/'}
                                </Text>
                            </View>
                        )}
                        ListEmptyComponent={
                            objectsQuery.isLoading ? (
                                <View
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <ActivityIndicator />
                                </View>
                            ) : (
                                () => (
                                    <View
                                        style={{
                                            padding: 24,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text style={{ color: COLORS.textMuted }}>
                                            {currentPath ? 'Folder is empty' : 'Bucket is empty'}
                                        </Text>
                                    </View>
                                )
                            )
                        }
                    />

                    {/* Sticky bottom navigation bar */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            bottom: 36,
                            left: 16,
                            right: 16,
                            height: 56,
                            backgroundColor: COLORS.bgSecondary,
                            borderRadius: 24,
                            paddingHorizontal: 12,
                            borderWidth: 1,
                            borderColor: COLORS.hr,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transform: [{ translateY: bottomBarTranslateY }],
                        }}
                    >
                        {isDeleteMode ? (
                            <>
                                <Pressable
                                    onPress={() => {
                                        clearSelection()
                                        setIsDeleteMode(false)
                                    }}
                                    style={({ pressed }) => ({
                                        padding: 10,
                                        opacity: pressed ? 0.6 : 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    })}
                                >
                                    <Ionicons name="close" size={18} color={COLORS.text} />
                                    <Text style={{ color: COLORS.text }}>Cancel</Text>
                                </Pressable>

                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ color: COLORS.text }}>
                                        {selectedItems.length} selected
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={() => {
                                        if (subscriptionStatus?.status !== 'ACTIVE' && !__DEV__) {
                                            registerPlacement({
                                                placement: 'BrowseSpace',
                                                feature: () => {
                                                    WidgetKitModule.setIsSubscribed(true)
                                                },
                                            }).catch((error) => {
                                                Sentry.captureException(error)
                                                console.error(
                                                    'Error registering BrowseSpace',
                                                    error
                                                )
                                                Alert.alert(
                                                    'Error',
                                                    'Something went wrong, please try again.'
                                                )
                                            })
                                            return
                                        }

                                        if (
                                            selectedItems.length === 0 ||
                                            deleteObjectsMutation.isPending
                                        )
                                            return

                                        Alert.alert(
                                            'Delete selected items?',
                                            'This action cannot be undone.',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete',
                                                    style: 'destructive',
                                                    onPress: () =>
                                                        deleteObjectsMutation.mutate(selectedItems),
                                                },
                                            ]
                                        )
                                    }}
                                    disabled={
                                        selectedItems.length === 0 ||
                                        deleteObjectsMutation.isPending
                                    }
                                    style={({ pressed }) => ({
                                        padding: 10,
                                        opacity:
                                            pressed ||
                                            selectedItems.length === 0 ||
                                            deleteObjectsMutation.isPending
                                                ? 0.6
                                                : 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 5,
                                    })}
                                >
                                    {deleteObjectsMutation.isPending ? (
                                        <ActivityIndicator sm={true} />
                                    ) : (
                                        <Ionicons name="trash" size={18} color={COLORS.text} />
                                    )}
                                    <Text style={{ color: COLORS.text }}>Delete</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Pressable
                                    onPress={() => {
                                        if (subscriptionStatus?.status !== 'ACTIVE' && !__DEV__) {
                                            registerPlacement({
                                                placement: 'BrowseSpace',
                                                feature: () => {
                                                    WidgetKitModule.setIsSubscribed(true)
                                                },
                                            }).catch((error) => {
                                                Sentry.captureException(error)
                                                console.error(
                                                    'Error registering BrowseSpace',
                                                    error
                                                )
                                                Alert.alert(
                                                    'Error',
                                                    'Something went wrong, please try again.'
                                                )
                                            })
                                            return
                                        }

                                        navigateUp()
                                    }}
                                    style={({ pressed }) => ({
                                        padding: 10,
                                        opacity: pressed ? 0.6 : 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    })}
                                >
                                    <Ionicons name="chevron-back" size={18} color={COLORS.text} />
                                    <Text style={{ color: COLORS.text }}>Up</Text>
                                </Pressable>

                                <ContextMenu
                                    dropdownMenuMode={true}
                                    actions={[
                                        { title: 'Public', systemIcon: 'globe' },
                                        { title: 'Private', systemIcon: 'lock' },
                                    ]}
                                    onPress={async (e) => {
                                        const selectedAcl: SpacesObjectAcl =
                                            e.nativeEvent.name === 'Public'
                                                ? 'public-read'
                                                : 'private'

                                        if (subscriptionStatus?.status !== 'ACTIVE' && !__DEV__) {
                                            registerPlacement({
                                                placement: 'BrowseSpace',
                                                feature: () => {
                                                    WidgetKitModule.setIsSubscribed(true)
                                                },
                                            }).catch((error) => {
                                                Sentry.captureException(error)
                                                console.error(
                                                    'Error registering BrowseSpace',
                                                    error
                                                )
                                                Alert.alert(
                                                    'Error',
                                                    'Something went wrong, please try again.'
                                                )
                                            })
                                            return
                                        }

                                        try {
                                            const result = await DocumentPicker.getDocumentAsync({
                                                copyToCacheDirectory: true,
                                                multiple: false,
                                            })
                                            if (!result.canceled) {
                                                await uploadMutation.mutateAsync({
                                                    asset: result.assets[0],
                                                    acl: selectedAcl,
                                                })
                                            }
                                        } catch (err: any) {
                                            Alert.alert(
                                                'Upload error',
                                                err?.message || 'Unknown error'
                                            )
                                        }
                                    }}
                                >
                                    <Pressable
                                        disabled={uploadMutation.isPending}
                                        style={({ pressed }) => ({
                                            padding: 10,
                                            opacity: pressed || uploadMutation.isPending ? 0.6 : 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 8,
                                        })}
                                    >
                                        {uploadMutation.isPending ? (
                                            <ActivityIndicator sm={true} />
                                        ) : (
                                            <Ionicons
                                                name="cloud-upload"
                                                size={18}
                                                color={COLORS.text}
                                                style={{ marginTop: 2 }}
                                            />
                                        )}
                                        <Text style={{ color: COLORS.text }}>Upload</Text>
                                    </Pressable>
                                </ContextMenu>

                                <Pressable
                                    onPress={() => {
                                        if (subscriptionStatus?.status !== 'ACTIVE' && !__DEV__) {
                                            registerPlacement({
                                                placement: 'BrowseSpace',
                                                feature: () => {
                                                    WidgetKitModule.setIsSubscribed(true)
                                                },
                                            }).catch((error) => {
                                                Sentry.captureException(error)
                                                console.error(
                                                    'Error registering BrowseSpace',
                                                    error
                                                )
                                                Alert.alert(
                                                    'Error',
                                                    'Something went wrong, please try again.'
                                                )
                                            })
                                            return
                                        }

                                        Alert.prompt(
                                            'New Folder',
                                            'Enter a name for your folder',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Create',
                                                    onPress: (text?: string) => {
                                                        if (!text) return
                                                        createFolderMutation.mutate(text)
                                                    },
                                                },
                                            ],
                                            'plain-text',
                                            'New Folder'
                                        )
                                    }}
                                    disabled={createFolderMutation.isPending}
                                    style={({ pressed }) => ({
                                        padding: 10,
                                        opacity:
                                            pressed || createFolderMutation.isPending ? 0.6 : 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    })}
                                >
                                    {createFolderMutation.isPending ? (
                                        <ActivityIndicator sm={true} />
                                    ) : (
                                        <Ionicons name="add" size={18} color={COLORS.text} />
                                    )}
                                    <Text style={{ color: COLORS.text }}>Folder</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => {
                                        if (subscriptionStatus?.status !== 'ACTIVE' && !__DEV__) {
                                            registerPlacement({
                                                placement: 'BrowseSpace',
                                                feature: () => {
                                                    WidgetKitModule.setIsSubscribed(true)
                                                },
                                            }).catch((error) => {
                                                Sentry.captureException(error)
                                                console.error(
                                                    'Error registering BrowseSpace',
                                                    error
                                                )
                                                Alert.alert(
                                                    'Error',
                                                    'Something went wrong, please try again.'
                                                )
                                            })
                                            return
                                        }

                                        clearSelection()
                                        setIsDeleteMode(true)
                                    }}
                                    style={({ pressed }) => ({
                                        padding: 10,
                                        opacity: pressed ? 0.6 : 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 5,
                                    })}
                                >
                                    <Ionicons name="trash" size={18} color={COLORS.text} />
                                    <Text style={{ color: COLORS.text }}>Delete</Text>
                                </Pressable>
                            </>
                        )}
                    </Animated.View>
                </>
            )}
        </>
    )
}
