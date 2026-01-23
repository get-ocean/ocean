import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { Icon, Label, VectorIcon } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function AppTabsLayout() {
    return (
        <NativeTabs disableTransparentOnScrollEdge={true} tintColor={COLORS.primary}>
            <NativeTabs.Trigger name="home">
                <Label>Home</Label>
                <Icon src={<VectorIcon family={Ionicons} name="rocket" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="logs">
                <Label>Logs</Label>
                <Icon src={<VectorIcon family={Ionicons} name="document-text" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="stats">
                <Label>Stats</Label>
                <Icon src={<VectorIcon family={Ionicons} name="stats-chart" />} />
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
