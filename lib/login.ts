import type { paths } from '@/lib/do/schema'
import createClient from 'openapi-fetch'

export async function checkLoginCredentials(token: string) {
    try {
        const client = createClient<paths>({
            baseUrl: 'https://api.digitalocean.com',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        const response = await client.GET('/v2/account')

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.account
    } catch (e) {
        const error = e as Error
        console.log('Error checking login credentials', error)
        throw error
    }
}
