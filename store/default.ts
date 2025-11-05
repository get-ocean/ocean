import type { paths } from '@/lib/do/schema'
import type { Client } from 'openapi-fetch'
import { create } from 'zustand'

interface StoreState {
    currentClient: Client<paths, `${string}/${string}`> | null
}

export const useStore = create<StoreState>()((set, get) => ({
    currentClient: null,
}))
