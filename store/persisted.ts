import { mmkvStorage } from '@/lib/storage'
import WidgetKitModule from '@/modules/widgetkit'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface Connection {
    id: string
    email: string
    apiToken: string
    currentProjectId: string | null
    spacesAccessKey: {
        name: string
        id: string
        secret: string
    } | null
}

interface PersistedStoreState {
    connections: Connection[]
    currentConnection: Connection | null
    switchConnection: (
        props:
            | {
                  connectionId: string
              }
            | {
                  connectionId: string
                  projectId: string
              }
    ) => void
    removeConnection: (connectionId: string) => void
    addConnection: (connection: Connection) => void

    countToReviewPrompt: number
    setCountToReviewPrompt: (count: number) => void
    lastShownReviewPrompt: number | null
    setLastShownReviewPrompt: (ts: number) => void

    minimizedTypes: Record<string, string[]>
    toggleMinimizedType: ({
        connectionId,
        type,
    }: {
        connectionId: string
        type: string
    }) => void

    acknowledgments: {
        swipeLeft: boolean
    }
    acknowledge: (type: keyof PersistedStoreState['acknowledgments']) => void

    hasSeenOnboarding: boolean
}

export const usePersistedStore = create<PersistedStoreState>()(
    persist(
        (set, get) => ({
            connections: [],
            currentConnection: null,
            removeConnection: (connectionId: string) => {
                WidgetKitModule.removeConnection(connectionId)
                const newConnections = get().connections.filter((c) => c.id !== connectionId)

                set({
                    connections: newConnections,
                    currentConnection: newConnections[0] || null,
                })
            },
            addConnection: (connection: Connection) => {
                WidgetKitModule.addConnection(connection)
                set((state) => ({
                    connections: [...state.connections, connection],
                }))
            },
            switchConnection: (
                props:
                    | {
                          connectionId: string
                      }
                    | {
                          connectionId: string
                          projectId: string
                      }
            ) => {
                const state = get()

                const connection = state.connections.find((c) => c.id === props.connectionId)
                if (!connection) return

                const newConnection = {
                    ...connection,
                    currentProjectId:
                        'projectId' in props ? props.projectId : connection.currentProjectId,
                }

                const newConnections = state.connections.map((c) =>
                    c.id === newConnection.id ? newConnection : c
                )

                set({
                    connections: newConnections,
                    currentConnection: newConnection,
                })

                // queryClient.invalidateQueries()
            },

            countToReviewPrompt: 12,
            setCountToReviewPrompt: (count: number) => {
                set({ countToReviewPrompt: count })
            },
            lastShownReviewPrompt: null,
            setLastShownReviewPrompt: (ts: number) => {
                set({ lastShownReviewPrompt: ts })
            },

            minimizedTypes: {},
            toggleMinimizedType: ({ connectionId, type }) => {
                const state = get()

                const newMinimizedTypes = {
                    ...state.minimizedTypes,
                    [connectionId]: [...(state.minimizedTypes[connectionId] || []), type],
                }

                if (state.minimizedTypes[connectionId]?.includes(type)) {
                    newMinimizedTypes[connectionId] = state.minimizedTypes[connectionId].filter(
                        (t) => t !== type
                    )
                } else {
                    newMinimizedTypes[connectionId] = [
                        ...(state.minimizedTypes[connectionId] || []),
                        type,
                    ]
                }

                set({ minimizedTypes: newMinimizedTypes })
            },
            acknowledgments: {
                swipeLeft: false,
            },
            acknowledge: (type: keyof PersistedStoreState['acknowledgments']) => {
                set({ acknowledgments: { ...get().acknowledgments, [type]: true } })
            },

            hasSeenOnboarding: false,
        }),
        {
            name: 'ocean-persisted-store',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
        }
    )
)
