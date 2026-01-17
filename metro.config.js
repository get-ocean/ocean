const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config')
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)

if (process.argv.some((arg) => arg.includes('android'))) {
    // Checks if the npm command includes 'android'
    // AWS SDK ESM tweak only on Android
    // https://github.com/aws/aws-sdk-js-v3/issues/4877#issuecomment-1656007484

    console.log('Applying AWS SDK ESM tweak only on Android')
    config.resolver = {
        ...config.resolver,
        resolverMainFields: ['react-native', 'browser', 'main'],
    }

    config.resolver.unstable_enablePackageExports = false
}

module.exports = wrapWithReanimatedMetroConfig(config)
