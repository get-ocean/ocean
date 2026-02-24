import 'expo-router/entry'
import './lib/prebundle'
import * as SplashScreen from 'expo-splash-screen'
import { setBackgroundColorAsync } from 'expo-system-ui'
import { TextInput } from 'react-native'
import { install } from 'react-native-quick-crypto'
install()

TextInput.defaultProps = TextInput.defaultProps || {}
TextInput.defaultProps.autoCapitalize = 'none'
TextInput.defaultProps.autoComplete = 'off'
TextInput.defaultProps.autoCorrect = false

SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({
    duration: 500,
    fade: true,
})

try {
    setBackgroundColorAsync('#12181F') // setting it in app.json does not seem to have an effect
} catch (error) {
    console.error(error)
}
