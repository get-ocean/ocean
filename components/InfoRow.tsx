import Text from '@/components/base/Text'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import Clipboard from '@react-native-clipboard/clipboard'
import { type ReactNode, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

export default function InfoRow({
    label,
    icon,
    value,
    backgroundColor,
    onPress,
    alignItems = 'center',
    isCopyable = false,
    isSensitive = false,
    isLight = false,
    borderTop = true,
    borderBottom = true,
}: {
    label: string
    icon?: keyof typeof Ionicons.glyphMap
    value: string | string[] | number | number[] | ReactNode
    backgroundColor?: string
    onPress?: () => void
    alignItems?: 'center' | 'flex-start'
    isCopyable?: boolean
    isSensitive?: boolean
    isLight?: boolean
    borderTop?: boolean
    borderBottom?: boolean
}) {
    const [isCopied, setIsCopied] = useState(false)

    return (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: isCopyable ? 'center' : alignItems,
                padding: 16,
                width: '100%',
                backgroundColor: isLight ? COLORS.bgSecondary : backgroundColor,
                borderTopWidth: borderTop ? 0.5 : 0,
                borderBottomWidth: borderBottom ? 0.5 : 0,
                borderTopColor: COLORS.hr,
                borderBottomColor: COLORS.hr,
            }}
            disabled={!onPress}
            onPress={onPress}
        >
            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {icon && <Ionicons name={icon} size={20} color={COLORS.textMuted} />}
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>{label}</Text>
            </View>
            <View
                style={{
                    flex: 3,
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                }}
            >
                {isCopyable ? (
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 16,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor:
                                isLight || backgroundColor ? COLORS.hr : COLORS.bgSecondary,
                            borderWidth: 0.8,
                            borderColor: COLORS.primaryLight
                                .replace('rgb', 'rgba')
                                .replace(')', ', 0.1)'),
                        }}
                        onPress={() => {
                            if (!value || typeof value !== 'string') return
                            Clipboard.setString(value)
                            setIsCopied(true)
                            setTimeout(() => {
                                setIsCopied(false)
                            }, 1000)
                        }}
                        disabled={isCopied}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                color: isCopied ? COLORS.primaryLight : COLORS.text,
                            }}
                        >
                            {isCopied ? 'Copied!' : isSensitive ? 'Tap to copy' : value}
                        </Text>
                        {isCopied ? undefined : (
                            <Ionicons
                                name="clipboard-outline"
                                size={12.5}
                                color={isCopied ? COLORS.text : COLORS.text}
                            />
                        )}
                    </TouchableOpacity>
                ) : typeof value === 'string' || typeof value === 'number' ? (
                    <Text
                        style={{
                            color: COLORS.text,
                            fontSize: 14,
                            textAlign: 'right',
                        }}
                        ellipsizeMode="clip"
                        numberOfLines={2}
                    >
                        {value}
                    </Text>
                ) : Array.isArray(value) ? (
                    <View
                        style={{
                            width: '100%',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {value.map((item) => (
                            <Text
                                key={item}
                                style={{
                                    color: COLORS.text,
                                    fontSize: 12,
                                    textAlign: 'center',
                                    paddingVertical: 4,
                                    paddingHorizontal: 8,
                                    backgroundColor:
                                        isLight || backgroundColor ? COLORS.hr : COLORS.bgSecondary,
                                    borderRadius: 16,
                                    borderWidth: 0.8,
                                    borderColor: COLORS.primaryLight
                                        .replace('rgb', 'rgba')
                                        .replace(')', ', 0.1)'),
                                }}
                            >
                                {item}
                            </Text>
                        ))}
                    </View>
                ) : (
                    value
                )}
            </View>
        </TouchableOpacity>
    )
}
