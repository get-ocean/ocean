import type { VOLUME_REGIONS } from '@/lib/constants'
import client from '@/lib/do'
import type { components } from '@/lib/do/schema'

/*    		   SPACES             */
export async function createSpacesAccessKey({
    name,
    grants,
    connectionId,
}: { name: string; grants: { bucket: string; permission: string }[]; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/spaces/keys', {
            body: {
                name,
                grants,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.key
    } catch (error) {
        console.error('Error creating spaces access key:', error)
        throw error
    }
}

export async function deleteSpacesAccessKey({
    key,
    connectionId,
}: { key: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/spaces/keys/{access_key}', {
            params: {
                path: {
                    access_key: key,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting spaces access key:', error)
        throw error
    }
}

/*    		   DROPLETS             */
export async function deleteDroplet({
    dropletId,
    connectionId,
}: { dropletId: number | string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/droplets/{droplet_id}', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting droplet:', error)
        throw error
    }
}

export async function shutdownDroplet({
    dropletId,
    connectionId,
}: { dropletId: number | string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/droplets/{droplet_id}/actions', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
            body: {
                type: 'shutdown',
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error shutting down droplet:', error)
        throw error
    }
}

export async function powerOnDroplet({
    dropletId,
    connectionId,
}: { dropletId: number | string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/droplets/{droplet_id}/actions', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
            body: {
                type: 'power_on',
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error powering on droplet:', error)
        throw error
    }
}

export async function renameDroplet({
    dropletId,
    name,
    connectionId,
}: { dropletId: number | string; name: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/droplets/{droplet_id}/actions', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
            body: {
                type: 'rename' as any,
                name,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error renaming droplet:', error)
        throw error
    }
}

export async function toggleDropletBackups({
    dropletId,
    enabled,
    connectionId,
}: { dropletId: number | string; enabled: boolean; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/droplets/{droplet_id}/actions', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
            body: {
                type: enabled ? 'enable_backups' : 'disable_backups',
                backup_policy: enabled
                    ? {
                          hour: 4,
                          plan: 'weekly',
                          retention_period_days: 28,
                          weekday: 'WED',
                      }
                    : undefined,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error toggling droplet backups:', error)
        throw error
    }
}

export async function resetRootDropletPassword({
    dropletId,
    connectionId,
}: { dropletId: number | string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/droplets/{droplet_id}/actions', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
            body: {
                type: 'password_reset' as any,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error resetting droplet root password:', error)
        throw error
    }
}

export async function createDropletSnapshot({
    dropletId,
    snapshotName,
    connectionId,
}: { dropletId: number | string; snapshotName: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/droplets/{droplet_id}/actions', {
            params: {
                path: {
                    droplet_id: Number(dropletId),
                },
            },
            body: {
                type: 'snapshot' as any,
                name: snapshotName,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error creating droplet snapshot:', error)
        throw error
    }
}

/*    		   VOLUMES             */
export async function deleteVolume({
    volumeId,
    connectionId,
}: { volumeId: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/volumes/{volume_id}', {
            params: {
                path: {
                    volume_id: volumeId,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting volume:', error)
        throw error
    }
}

//! NOT USED
export async function attachVolumeDroplet({
    volumeId,
    dropletId,
    region,
    connectionId,
}: {
    volumeId: string
    dropletId: number | string
    region: (typeof VOLUME_REGIONS)[number]
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).POST('/v2/volumes/{volume_id}/actions', {
            params: {
                path: {
                    volume_id: volumeId,
                },
            },
            body: {
                type: 'attach',
                droplet_id: Number(dropletId),
                region: region,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error attaching volume to droplet:', error)
        throw error
    }
}

export async function detachVolumeDroplet({
    volumeId,
    dropletId,
    region,
    connectionId,
}: {
    volumeId: string
    dropletId: number | string
    region: (typeof VOLUME_REGIONS)[number]
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).POST('/v2/volumes/{volume_id}/actions', {
            params: {
                path: {
                    volume_id: volumeId,
                },
            },
            body: {
                type: 'detach',
                droplet_id: Number(dropletId),
                region: region,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error detaching volume from droplet:', error)
        throw error
    }
}

export async function resizeVolume({
    volumeId,
    sizeGigabytes,
    region,
    connectionId,
}: {
    volumeId: string
    sizeGigabytes: number
    region: (typeof VOLUME_REGIONS)[number]
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).POST('/v2/volumes/{volume_id}/actions', {
            params: {
                path: {
                    volume_id: volumeId,
                },
            },
            body: {
                type: 'resize',
                size_gigabytes: sizeGigabytes,
                region: region,
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error resizing volume:', error)
        throw error
    }
}

/*    		   DOMAINS             */
export async function deleteDomain({
    domainName,
    connectionId,
}: { domainName: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/domains/{domain_name}', {
            params: {
                path: {
                    domain_name: domainName,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting domain:', error)
        throw error
    }
}

export async function createDomainRecord({
    domainName,
    recordData,
    connectionId,
}: {
    domainName: string
    recordData:
        | components['schemas']['domain_record_a']
        | components['schemas']['domain_record_aaaa']
        | components['schemas']['domain_record_caa']
        | components['schemas']['domain_record_cname']
        | components['schemas']['domain_record_mx']
        | components['schemas']['domain_record_ns']
        | components['schemas']['domain_record_soa']
        | components['schemas']['domain_record_srv']
        | components['schemas']['domain_record_txt']
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).POST('/v2/domains/{domain_name}/records', {
            params: {
                path: {
                    domain_name: domainName,
                },
            },
            body: recordData,
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data?.domain_record ?? response.data
    } catch (error) {
        console.error('Error creating domain record:', error)
        throw error
    }
}

export async function updateDomainRecord({
    domainName,
    recordId,
    recordData,
    connectionId,
}: {
    domainName: string
    recordId: number
    recordData: {
        type: string
        name?: string
        data?: string
        priority?: number | null
        port?: number | null
        ttl?: number
        weight?: number | null
        flags?: number | null
        tag?: string | null
    }
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).PATCH(
            '/v2/domains/{domain_name}/records/{domain_record_id}',
            {
                params: {
                    path: {
                        domain_name: domainName,
                        domain_record_id: recordId,
                    },
                },
                body: recordData,
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error updating domain record:', error)
        throw error
    }
}

export async function deleteDomainRecord({
    domainName,
    recordId,
    connectionId,
}: {
    domainName: string
    recordId: number
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).DELETE(
            '/v2/domains/{domain_name}/records/{domain_record_id}',
            {
                params: {
                    path: {
                        domain_name: domainName,
                        domain_record_id: recordId,
                    },
                },
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting domain record:', error)
        throw error
    }
}

/*    		   DATABASES            */
export async function deleteDatabaseCluster({
    databaseClusterUuid,
    connectionId,
}: { databaseClusterUuid: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE(
            '/v2/databases/{database_cluster_uuid}',
            {
                params: {
                    path: {
                        database_cluster_uuid: databaseClusterUuid,
                    },
                },
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting database cluster:', error)
        throw error
    }
}

/*    		   LOAD BALANCERS             */
export async function deleteLoadBalancer({
    loadBalancerId,
    connectionId,
}: { loadBalancerId: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/load_balancers/{lb_id}', {
            params: {
                path: {
                    lb_id: loadBalancerId,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting load balancer:', error)
        throw error
    }
}

export async function detachLoadBalancerDroplets({
    loadBalancerId,
    dropletIds,
    connectionId,
}: { loadBalancerId: string; dropletIds: number[]; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE(
            '/v2/load_balancers/{lb_id}/droplets',
            {
                params: {
                    path: {
                        lb_id: loadBalancerId,
                    },
                },
                body: {
                    droplet_ids: dropletIds,
                },
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error detaching droplets from load balancer:', error)
        throw error
    }
}

export async function deleteLoadBalancerRules({
    loadBalancerId,
    forwardingRules,
    connectionId,
}: {
    loadBalancerId: string
    forwardingRules: {
        entry_port: number
        entry_protocol: components['schemas']['forwarding_rule']['entry_protocol']
        target_port: number
        target_protocol: components['schemas']['forwarding_rule']['target_protocol']
        certificate_id?: string
        tls_passthrough?: boolean
    }[]
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).DELETE(
            '/v2/load_balancers/{lb_id}/forwarding_rules',
            {
                params: {
                    path: {
                        lb_id: loadBalancerId,
                    },
                },
                body: {
                    forwarding_rules: forwardingRules,
                },
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting load balancer forwarding rules:', error)
        throw error
    }
}

//! NOT USED
export async function attachLoadBalancerDroplets({
    loadBalancerId,
    dropletIds,
    connectionId,
}: { loadBalancerId: string; dropletIds: (string | number)[]; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST(
            '/v2/load_balancers/{lb_id}/droplets',
            {
                params: {
                    path: {
                        lb_id: loadBalancerId,
                    },
                },
                body: {
                    droplet_ids: dropletIds.map(Number),
                },
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error attaching droplets to load balancer:', error)
        throw error
    }
}

//! NOT USED
export async function createLoadBalancerRules({
    loadBalancerId,
    forwardingRules,
    connectionId,
}: {
    loadBalancerId: string
    forwardingRules: {
        entry_protocol: 'http' | 'https' | 'http2' | 'http3' | 'tcp' | 'udp'
        entry_port: number
        target_protocol: 'http' | 'https' | 'http2' | 'tcp' | 'udp'
        target_port: number
        certificate_id?: string
        tls_passthrough?: boolean
    }[]
    connectionId?: string
}) {
    try {
        const response = await client({ connectionId }).POST(
            '/v2/load_balancers/{lb_id}/forwarding_rules',
            {
                params: {
                    path: {
                        lb_id: loadBalancerId,
                    },
                },
                body: {
                    forwarding_rules: forwardingRules,
                },
            }
        )

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error creating load balancer forwarding rules:', error)
        throw error
    }
}

/*    		   FUNCTIONS             */

/*    		   APPS             */
export async function deleteApp({ appId, connectionId }: { appId: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/apps/{id}', {
            params: {
                path: {
                    id: appId,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting app:', error)
        throw error
    }
}

export async function restartApp({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).POST('/v2/apps/{app_id}/restart', {
            params: {
                path: {
                    app_id: appId,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error restarting app:', error)
        throw error
    }
}

//! NOT USED
export async function deployApp({
    appId,
    forceRebuild,
    connectionId,
}: { appId: string; forceRebuild?: boolean; connectionId?: string }) {
    try {
        const body = forceRebuild ? { force_build: forceRebuild } : {}

        const response = await client({ connectionId }).POST('/v2/apps/{app_id}/deployments', {
            params: {
                path: {
                    app_id: appId,
                },
            },
            body,
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deploying app:', error)
        throw error
    }
}

export async function deleteSnapshot({
    snapshotId,
    connectionId,
}: { snapshotId: number | string; connectionId?: string }) {
    try {
        const response = await client({ connectionId }).DELETE('/v2/snapshots/{snapshot_id}', {
            params: {
                path: {
                    snapshot_id: Number(snapshotId),
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (error) {
        console.error('Error deleting volume snapshot:', error)
        throw error
    }
}
