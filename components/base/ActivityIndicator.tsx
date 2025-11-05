import { COLORS } from '@/theme/colors'
import { ActivityIndicator as RNActivityIndicator } from 'react-native'

export default function ActivityIndicator({
    sm = false,
    monochrome = false,
    color,
}: {
    sm?: boolean
    monochrome?: boolean
    color?: string
}) {
    return (
        <RNActivityIndicator
            size={sm ? 'small' : 'large'}
            color={color || (monochrome ? COLORS.textMuted : COLORS.primary)}
            // style={{ flex: 1 }}
        />
    )
}
