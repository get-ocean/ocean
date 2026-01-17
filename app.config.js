//  https://docs.expo.dev/workflow/configuration/#switching-configuration-based-on-the-environment
//  https://docs.expo.dev/versions/latest/config/app/#backgroundcolor
//  https://docs.expo.dev/versions/latest/config/app/#primarycolor

module.exports = ({ config }) => {
    return {
        ...config,
        primaryColor: '#12181F',
        backgroundColor: '#12181F',

        name: process.env.EXPO_PUBLIC_APP_NAME,
        slug: process.env.EXPO_PUBLIC_APP_SLUG,
        scheme: process.env.EXPO_PUBLIC_APP_SCHEME,
        version: process.env.EXPO_PUBLIC_APP_VERSION,
        owner: process.env.EXPO_PUBLIC_OWNER,

        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'dark',
        newArchEnabled: true,

        ios: {
            appleTeamId: process.env.EXPO_PUBLIC_APPLE_TEAM_ID,
            bundleIdentifier: process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER,
            supportsTablet: true,
            config: {
                usesNonExemptEncryption: false,
            },
            infoPlist: {
                SKIncludeConsumableInAppPurchaseHistory: true,
            },
            entitlements: {
                'com.apple.security.application-groups': [process.env.EXPO_PUBLIC_WIDGET_GROUP],
            },
        },

        androidNavigationBar: {
            enforceContrast: false,
        },
        android: {
            package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE,
            adaptiveIcon: {
                foregroundImage: './assets/icon-android.png',
            },
            playStoreUrl: process.env.EXPO_PUBLIC_ANDROID_STORE_URL,
            predictiveBackGestureEnabled: false,
        },

        plugins: [
            [
                'expo-build-properties',
                {
                    android: {
                        minSdkVersion: 24,
                        targetSdkVersion: 35,
                        // enableMinifyInReleaseBuilds: true,
                        // enableShrinkResourcesInReleaseBuilds: true,
                        // useDayNightTheme: true
                    },
                },
            ],
            './plugins/withAndroidHeap',
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/launch-icon.png',
                    resizeMode: 'contain',
                    backgroundColor: '#101012',
                    imageWidth: 200,
                    android: {
                        imageWidth: 150,
                    },
                },
            ],
            [
                '@sentry/react-native/expo',
                {
                    url: 'https://sentry.io/',
                    project: process.env.EXPO_PUBLIC_SENTRY_PROJECT,
                    organization: process.env.EXPO_PUBLIC_SENTRY_ORG,
                },
            ],
            '@bacons/apple-targets',
            // [
            //     './plugins/withAndroidWidget',
            //     {
            //         src: './targets/widget-android',
            //         versions: {
            //             glance: '1.1.1',
            //             kotlinExtension: '2.0.0',
            //             gson: '2.13.2',
            //             activityCompose: '1.11.0',
            //             composeUi: '1.9.3',
            //             material3: '1.4.0',
            //             workRuntime: '2.10.5',
            //             chart: '3.1.0',
            //         },
            //         widgets: [],
            //     },
            // ],
        ],

        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {
                origin: false,
            },
            eas: {
                projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
            },
        },
    }
}
