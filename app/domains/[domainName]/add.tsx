import { createDomainRecord } from '@/api/mutations'
import { queryClient } from '@/lib/query'
import { COLORS } from '@/theme/colors'
import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router, useGlobalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
    Alert,
    Keyboard,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native'
import ContextMenu from 'react-native-context-menu-view'
import { SafeAreaView } from 'react-native-safe-area-context'

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const IPV6_REGEX =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|([0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,6}:))$/
const SCHEME_PREFIX_REGEX = /^https?:\/\//i
const TRAILING_SLASH_REGEX = /\/$/
const TRAILING_DOT_REGEX = /\.$/
const FQDN_REGEX = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$/
const SINGLE_LABEL_REGEX = /^[a-zA-Z0-9-]{1,63}$/
const SRV_NAME_REGEX = /^_[a-z0-9-]+\._(tcp|udp)$/i
const WHITESPACE_REGEX = /\s/

const fieldLabels: Record<RecordType, { name: string; data: string }> = {
    A: { name: 'Host', data: 'IPv4 Address' },
    AAAA: { name: 'Host', data: 'IPv6 Address' },
    CNAME: { name: 'Host', data: 'Target (Hostname)' },
    MX: { name: 'Host', data: 'Mail Host (Hostname)' },
    TXT: { name: 'Host', data: 'Text' },
    NS: { name: 'Host', data: 'Nameserver (Hostname)' },
    SRV: { name: 'Name (_service._proto)', data: 'Target (Hostname)' },
    CAA: { name: 'Host', data: 'Value' },
}

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA'

function isValidIpv4(value: string): boolean {
    return IPV4_REGEX.test(value.trim())
}

function isValidIpv6(value: string): boolean {
    return IPV6_REGEX.test(value.trim())
}

function normalizeFqdn(value: string): string {
    let v = value.trim()
    v = v.replace(SCHEME_PREFIX_REGEX, '')
    v = v.replace(TRAILING_SLASH_REGEX, '')
    v = v.replace(TRAILING_DOT_REGEX, '')
    return v
}

function isValidFqdn(value: string): boolean {
    const v = normalizeFqdn(value)
    if (!v) return false
    if (WHITESPACE_REGEX.test(v)) return false
    return FQDN_REGEX.test(v) || SINGLE_LABEL_REGEX.test(v)
}

function parseOptionalInt(value: string): number | null {
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) ? n : null
}

function clampTtl(value: number): number {
    return Math.max(30, Math.min(604800, value))
}

function validateTtlString(ttlStr: string): string | null {
    const n = Number.parseInt(ttlStr || '3600', 10)
    const ttlNumber = clampTtl(Number.isFinite(n) ? n : 3600)
    if (!(ttlNumber >= 30 && ttlNumber <= 604800))
        return 'TTL must be between 30 and 604800 seconds'
    return null
}

function validateA(dataStr: string): string | null {
    if (!isValidIpv4(dataStr)) return 'A record requires a valid IPv4 address'
    return null
}
function validateAAAA(dataStr: string): string | null {
    if (!isValidIpv6(dataStr)) return 'AAAA record requires a valid IPv6 address'
    return null
}
function validateCNAME(nameStr: string, dataStr: string): string | null {
    if (nameStr.trim() === '@') return 'CNAME cannot be set at the apex (@)'
    if (!isValidFqdn(dataStr)) return 'CNAME target must be a valid hostname'
    return null
}
function validateMX(dataStr: string, priorityStr: string): string | null {
    if (!isValidFqdn(dataStr)) return 'MX host must be a valid hostname'
    const p = parseOptionalInt(priorityStr)
    if (p === null || p < 0 || p > 65535) return 'Priority must be 0–65535'
    return null
}
function validateNS(dataStr: string): string | null {
    if (!isValidFqdn(dataStr)) return 'NS host must be a valid hostname'
    return null
}
function validateSRV(
    nameStr: string,
    dataStr: string,
    priorityStr: string,
    weightStr: string,
    portStr: string
): string | null {
    if (!SRV_NAME_REGEX.test(nameStr.trim())) return 'SRV name must be like _service._tcp'
    if (!isValidFqdn(dataStr)) return 'SRV target must be a valid hostname'
    const p = parseOptionalInt(priorityStr)
    const w = parseOptionalInt(weightStr)
    const pt = parseOptionalInt(portStr)
    if (p === null || p < 0 || p > 65535) return 'Priority must be 0–65535'
    if (w === null || w < 0 || w > 65535) return 'Weight must be 0–65535'
    if (pt === null || pt < 0 || pt > 65535) return 'Port must be 0–65535'
    return null
}
function validateCAA(
    flagsStr: string,
    tagStr: '' | 'issue' | 'issuewild' | 'iodef',
    dataStr: string
): string | null {
    const f = parseOptionalInt(flagsStr)
    if (f === null || f < 0 || f > 255) return 'CAA flags must be 0–255'
    if (!tagStr) return 'CAA tag is required (issue, issuewild, iodef)'
    if (!dataStr.trim()) return 'CAA value is required'
    return null
}

export default function AddDomainRecord() {
    const { domainName } = useGlobalSearchParams<{ domainName: string }>()

    const recordTypes: RecordType[] = useMemo(
        () => ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'],
        []
    )

    const [selectedType, setSelectedType] = useState<RecordType>('A')
    const [name, setName] = useState<string>('')
    const [data, setData] = useState<string>('')
    const [ttl, setTtl] = useState<string>('3600')
    const [priority, setPriority] = useState<string>('')
    const [weight, setWeight] = useState<string>('')
    const [port, setPort] = useState<string>('')
    const [flags, setFlags] = useState<string>('')
    const [tag, setTag] = useState<'issue' | 'issuewild' | 'iodef' | ''>('')

    const showPriority = selectedType === 'MX' || selectedType === 'SRV'
    const showWeight = selectedType === 'SRV'
    const showPort = selectedType === 'SRV'
    const showFlags = selectedType === 'CAA'
    const showTag = selectedType === 'CAA'

    const createRecordMutation = useMutation({
        mutationFn: async () => {
            const ttlNumber = clampTtl(Number.parseInt(ttl || '3600', 10) || 3600)

            const base: Parameters<typeof createDomainRecord>[0]['recordData'] = {
                type: selectedType,
                name: name?.trim() || undefined,
                ttl: ttlNumber,
            }

            if (selectedType === 'A' || selectedType === 'AAAA' || selectedType === 'TXT') {
                base.data = data.trim()
            }
            if (selectedType === 'CNAME' || selectedType === 'MX' || selectedType === 'NS') {
                base.data = normalizeFqdn(data)
            }
            if (selectedType === 'MX') {
                base.priority = parseOptionalInt(priority)
            }
            if (selectedType === 'SRV') {
                base.data = normalizeFqdn(data)
                base.priority = parseOptionalInt(priority)
                base.weight = parseOptionalInt(weight)
                base.port = parseOptionalInt(port)
            }
            if (selectedType === 'CAA') {
                base.flags = parseOptionalInt(flags)
                base.tag = tag
                base.data = data.trim()
            }

            const result = await createDomainRecord({
                domainName,
                recordData: base,
            })
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['domains', domainName, 'records'] })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Failed to create record')
        },
    })

    const validateInputs = useCallback(() => {
        const ttlErr = validateTtlString(ttl)
        if (ttlErr) return ttlErr
        switch (selectedType) {
            case 'A':
                return validateA(data)
            case 'AAAA':
                return validateAAAA(data)
            case 'CNAME':
                return validateCNAME(name, data)
            case 'MX':
                return validateMX(data, priority)
            case 'NS':
                return validateNS(data)
            case 'SRV':
                return validateSRV(name, data, priority, weight, port)
            case 'CAA':
                return validateCAA(flags, tag, data)
            case 'TXT':
                return data.trim() ? null : 'TXT value is required'
            default:
                return null
        }
    }, [selectedType, name, data, priority, weight, port, flags, tag, ttl])

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View
                    style={{
                        padding: 24,
                        paddingTop: 16,
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                    }}
                >
                    <View style={{ flexDirection: 'column', gap: 20 }}>
                        {/* Type field */}
                        <View style={{ flexDirection: 'column', gap: 8 }}>
                            <Text style={{ fontSize: 14, color: COLORS.text }}>Type</Text>
                            <ContextMenu
                                dropdownMenuMode={true}
                                actions={recordTypes.map((t) => ({ title: t }))}
                                onPress={(e) => {
                                    const t = e.nativeEvent.name as RecordType
                                    if (recordTypes.includes(t)) {
                                        setSelectedType(t)
                                        // Clear values except host when switching type
                                        setData('')
                                        setPriority('')
                                        setWeight('')
                                        setPort('')
                                        setFlags('')
                                        setTag('')
                                    }
                                }}
                            >
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: COLORS.bgSecondary,
                                        borderRadius: 8,
                                        padding: 12,
                                    }}
                                >
                                    <Text style={{ fontSize: 14, color: COLORS.text }}>
                                        {selectedType}
                                    </Text>
                                </TouchableOpacity>
                            </ContextMenu>
                        </View>

                        {/* Name field */}
                        <View style={{ flexDirection: 'column', gap: 8 }}>
                            <Text style={{ fontSize: 14, color: COLORS.text }}>
                                {fieldLabels[selectedType].name}
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: COLORS.bgSecondary,
                                    borderRadius: 8,
                                    padding: 12,
                                    color: COLORS.text,
                                    fontSize: 14,
                                }}
                                value={name}
                                onChangeText={setName}
                                placeholder={
                                    selectedType === 'SRV' ? '_service._tcp' : '@ or subdomain'
                                }
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoComplete="off"
                                autoCorrect={false}
                                keyboardAppearance="dark"
                                importantForAutofill="no"
                            />
                        </View>

                        {/* Data field */}
                        <View style={{ flexDirection: 'column', gap: 8 }}>
                            <Text style={{ fontSize: 14, color: COLORS.text }}>
                                {fieldLabels[selectedType].data}
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: COLORS.bgSecondary,
                                    borderRadius: 8,
                                    padding: 12,
                                    color: COLORS.text,
                                    fontSize: 14,
                                }}
                                value={data}
                                onChangeText={setData}
                                placeholder={
                                    selectedType === 'A'
                                        ? 'e.g. 203.0.113.10'
                                        : selectedType === 'AAAA'
                                          ? 'e.g. 2001:0db8::1'
                                          : selectedType === 'TXT'
                                            ? 'Enter text'
                                            : 'e.g. host.example.com'
                                }
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoComplete="off"
                                autoCorrect={false}
                                keyboardAppearance="dark"
                                importantForAutofill="no"
                            />
                        </View>

                        {/* Advanced fields by type */}
                        {showPriority && (
                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                <Text style={{ fontSize: 14, color: COLORS.text }}>Priority</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: COLORS.bgSecondary,
                                        borderRadius: 8,
                                        padding: 12,
                                        color: COLORS.text,
                                        fontSize: 14,
                                    }}
                                    value={priority}
                                    onChangeText={setPriority}
                                    keyboardType="number-pad"
                                    placeholder="0–65535"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    autoCorrect={false}
                                    keyboardAppearance="dark"
                                    importantForAutofill="no"
                                />
                            </View>
                        )}

                        {showWeight && (
                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                <Text style={{ fontSize: 14, color: COLORS.text }}>Weight</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: COLORS.bgSecondary,
                                        borderRadius: 8,
                                        padding: 12,
                                        color: COLORS.text,
                                        fontSize: 14,
                                    }}
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="number-pad"
                                    placeholder="0–65535"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    autoCorrect={false}
                                    keyboardAppearance="dark"
                                    importantForAutofill="no"
                                />
                            </View>
                        )}

                        {showPort && (
                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                <Text style={{ fontSize: 14, color: COLORS.text }}>Port</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: COLORS.bgSecondary,
                                        borderRadius: 8,
                                        padding: 12,
                                        color: COLORS.text,
                                        fontSize: 14,
                                    }}
                                    value={port}
                                    onChangeText={setPort}
                                    keyboardType="number-pad"
                                    placeholder="0–65535"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    autoCorrect={false}
                                    keyboardAppearance="dark"
                                    importantForAutofill="no"
                                />
                            </View>
                        )}

                        {showFlags && (
                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                <Text style={{ fontSize: 14, color: COLORS.text }}>Flags</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: COLORS.bgSecondary,
                                        borderRadius: 8,
                                        padding: 12,
                                        color: COLORS.text,
                                        fontSize: 14,
                                    }}
                                    value={flags}
                                    onChangeText={setFlags}
                                    keyboardType="number-pad"
                                    placeholder="0–255"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    autoCorrect={false}
                                    keyboardAppearance="dark"
                                    importantForAutofill="no"
                                />
                            </View>
                        )}

                        {showTag && (
                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                <Text style={{ fontSize: 14, color: COLORS.text }}>Tag</Text>
                                <ContextMenu
                                    dropdownMenuMode={true}
                                    actions={[
                                        { title: 'issue' },
                                        { title: 'issuewild' },
                                        { title: 'iodef' },
                                    ]}
                                    onPress={(e) => {
                                        const t = e.nativeEvent.name as
                                            | 'issue'
                                            | 'issuewild'
                                            | 'iodef'
                                        setTag(t)
                                    }}
                                >
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: COLORS.bgSecondary,
                                            borderRadius: 8,
                                            padding: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: tag ? COLORS.text : COLORS.textMuted,
                                            }}
                                        >
                                            {tag || 'Select tag'}
                                        </Text>
                                    </TouchableOpacity>
                                </ContextMenu>
                            </View>
                        )}

                        {/* TTL */}
                        <View style={{ flexDirection: 'column', gap: 8 }}>
                            <Text style={{ fontSize: 14, color: COLORS.text }}>TTL (seconds)</Text>
                            <TextInput
                                style={{
                                    backgroundColor: COLORS.bgSecondary,
                                    borderRadius: 8,
                                    padding: 12,
                                    color: COLORS.text,
                                    fontSize: 14,
                                }}
                                value={ttl}
                                onChangeText={setTtl}
                                keyboardType="number-pad"
                                placeholder="3600"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoComplete="off"
                                autoCorrect={false}
                                keyboardAppearance="dark"
                                importantForAutofill="no"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={{
                            padding: 16,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            backgroundColor: COLORS.bgSecondary,
                        }}
                        disabled={!!createRecordMutation.isPending}
                        onPress={async () => {
                            const errorMsg = validateInputs()
                            if (errorMsg) {
                                Alert.alert('Invalid input', errorMsg)
                                return
                            }
                            await createRecordMutation.mutateAsync()
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.primaryLight,
                                textAlign: 'center',
                                fontSize: 16,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                            }}
                        >
                            {createRecordMutation.isPending ? 'Creating…' : 'Create'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    )
}
