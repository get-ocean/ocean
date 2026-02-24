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
            blockedPermissions: [
                'android.permission.READ_MEDIA_IMAGES',
                'android.permission.READ_MEDIA_VIDEO',
            ],
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
                    experimental_android: {
                        enableAndroidGradlePlugin: true,
                        autoUploadProguardMapping: true,
                        includeProguardMapping: true,
                        dexguardEnabled: true,
                        uploadNativeSymbols: true,
                        autoUploadNativeSymbols: true,
                        includeNativeSources: true,
                        includeSourceContext: true,
                    },
                },
            ],
            [
                './plugins/withAndroidWidget',
                {
                    src: './targets/widget-android',
                    versions: {
                        glance: '1.1.1',
                        kotlinExtension: '2.0.0',
                        gson: '2.11.0',
                        activityCompose: '1.9.2',
                        composeUi: '1.7.3',
                        material3: '1.3.1',
                        workRuntime: '2.9.1',
                        chart: '3.1.0',
                    },
                    widgets: [
                        {
                            receiverName: 'MediumDropletStatsWidgetReceiver',
                            configurationActivity: 'MediumDropletStatsConfigurationActivity',
                            title: 'Droplet Stats',
                            description: '@string/medium_stats_widget_description',
                            resource: '@xml/medium_droplet_stats_widget',
                        },
                        {
                            receiverName: 'MediumDropletBandwidthWidgetReceiver',
                            configurationActivity: 'MediumDropletBandwidthConfigurationActivity',
                            title: 'Droplet Bandwidth',
                            description: '@string/medium_bandwidth_widget_description',
                            resource: '@xml/medium_droplet_bandwidth_widget',
                        },
                        {
                            receiverName: 'LargeProjectDropletsWidgetReceiver',
                            configurationActivity: 'LargeProjectDropletsConfigurationActivity',
                            title: 'Project Droplets',
                            description: '@string/large_project_widget_description',
                            resource: '@xml/large_project_droplets_widget',
                        },
                        {
                            receiverName: 'SmallShortcutWidgetReceiver',
                            configurationActivity: 'SmallShortcutConfigurationActivity',
                            title: 'Droplet Shortcut',
                            description: '@string/small_shortcut_widget_description',
                            resource: '@xml/small_shortcut_widget',
                        },
                    ],
                },
            ],
            './plugins/withHotUpdaterAndroidFix',
            [
                '@hot-updater/react-native',
                {
                    channel: 'production',
                },
            ],
            [
                'expo-alternate-app-icons',
                [
                    {
                        name: 'Droplet',
                        ios: './assets/icon-droplet.png',
                        android: {
                            foregroundImage: './assets/icon-droplet.png',
                        },
                    },
                    {
                        name: 'Lines',
                        ios: './assets/icon-lines.png',
                        android: {
                            foregroundImage: './assets/icon-lines.png',
                        },
                    },
                    {
                        name: 'Symbol',
                        ios: './assets/icon-symbol.png',
                        android: {
                            foregroundImage: './assets/icon-symbol.png',
                        },
                    },
                ],
            ],
            '@bacons/apple-targets',
            'expo-quick-actions',
            'expo-font',
            'expo-web-browser',
            'expo-asset',
            'expo-image',
            'expo-video',
            'expo-sharing',
            [
                'expo-audio',
                {
                    microphonePermission: false,
                    recordAudioAndroid: false,
                    enableBackgroundPlayback: false,
                    enableBackgroundRecording: false,
                },
            ],
            'expo-image-picker',
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
