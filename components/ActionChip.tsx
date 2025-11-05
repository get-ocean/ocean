import { COLORS } from '@/theme/colors'
import { TouchableOpacity } from 'react-native'

export default function ActionChip({
    children,
    isLight = false,
    onPress,
}: { children: React.ReactNode; isLight?: boolean; onPress?: () => void }) {
    return (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isLight ? COLORS.hr : COLORS.bgSecondary,
                borderWidth: 0.8,
                borderColor: COLORS.primaryLight.replace('rgb', 'rgba').replace(')', ', 0.1)'),
            }}
            onPress={onPress}
        >
            {children}
        </TouchableOpacity>
    )
}
