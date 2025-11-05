// https://www.npmjs.com/package/openapi-typescript

import type { paths } from '@/lib/do/schema'
import { useStore } from '@/store/default'
import { usePersistedStore } from '@/store/persisted'
import createClient from 'openapi-fetch'

function client({ connectionId }: { connectionId?: string } = {}) {
    const { currentClient } = useStore.getState()

    if (!currentClient) {
        const currentConnection = connectionId
            ? usePersistedStore.getState().connections.find((c) => c.id === connectionId)
            : usePersistedStore.getState().currentConnection

        if (!currentConnection) {
            throw new Error('No connection found')
        }

        const newClient = createClient<paths>({
            baseUrl: 'https://api.digitalocean.com',
            headers: {
                Authorization: `Bearer ${currentConnection.apiToken}`,
            },
        })

        useStore.setState({ currentClient: newClient })
        return newClient
    }

    return currentClient
}

export default client
