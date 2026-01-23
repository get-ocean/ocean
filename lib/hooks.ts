import { usePersistedStore } from '@/store/persisted'
import { useFocusEffect } from 'expo-router'
import { useGlobalSearchParams } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import ms from 'ms'
import { useCallback, useMemo, useState } from 'react'
import { Platform } from 'react-native'

export function useSearchParams<T extends Record<string, string>>() {
    //! `useLocalSearchParams` only works on the initial render (when going to /home)
    //! so we have to update this manually using GlobalSearchParams
    //! if we use GlobalSearchParams directly, it will clear the params mid way through the navigation
    //! (when going from vector/home to vector/records or from records to [recordId] to another page for example, it shows the loading state while the navigation is still happening
    //! or worse, it removes the param making it undefined until you navigate back, making the screen load every time you go back)
    const globalSearchParams = useGlobalSearchParams<T>()

    const [_searchParams, _setSearchParams] = useState<T>({} as unknown as T)

    useFocusEffect(
        useCallback(() => {
            if (globalSearchParams === undefined) return
            // console.log('useSearchParams [mount]', globalSearchParams)
            _setSearchParams(globalSearchParams)
        }, [globalSearchParams])
    )

    return _searchParams
}

export function useFlashlistProps(placeholder?: React.ReactNode) {
    const isAndroid = useMemo(() => Platform.OS === 'android', [])

    if (isAndroid) {
        return {
            overrideProps: undefined,
        }
    }

    return {
        overrideProps: placeholder
            ? {
                  contentContainerStyle: {
                      flex: 1,
                  },
              }
            : undefined,
    }
}

export function useWithReview() {
    const countToReviewPrompt = usePersistedStore((state) => state.countToReviewPrompt)
    const setCountToReviewPrompt = usePersistedStore((state) => state.setCountToReviewPrompt)
    const lastShownReviewPrompt = usePersistedStore((state) => state.lastShownReviewPrompt)
    const setLastShownReviewPrompt = usePersistedStore((state) => state.setLastShownReviewPrompt)

    const withReview = useCallback(
        <T extends (...args: any[]) => any>(fn: T) => {
            return ((...args: Parameters<T>) => {
                fn(...args)

                if (countToReviewPrompt === 0) {
                    if (!lastShownReviewPrompt || lastShownReviewPrompt < Date.now() - ms('1d')) {
                        setLastShownReviewPrompt(Date.now())
                        setCountToReviewPrompt(12)
                        StoreReview.requestReview()
                    }
                } else {
                    setCountToReviewPrompt(countToReviewPrompt - 1)
                }
            }) as T
        },
        [
            countToReviewPrompt,
            setCountToReviewPrompt,
            lastShownReviewPrompt,
            setLastShownReviewPrompt,
        ]
    )

    return withReview
}
