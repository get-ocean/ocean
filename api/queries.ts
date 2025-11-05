import client from '@/lib/do'
import ms from 'ms'

export async function fetchAccount({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchAccount')

    try {
        const response = await client({ connectionId }).GET('/v2/account')

        console.log('User info', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.account
    } catch (e) {
        const error = e as Error
        console.log('Error fetching user info', error)
        throw error
    }
}

/*    		   DROPLETS             */
export async function fetchDropletList() {
    console.log('fetchDroplets')

    try {
        const response = await client().GET('/v2/droplets', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchDroplets', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.droplets
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplets', error)
        throw error
    }
}

export async function fetchGpuDropletList() {
    console.log('fetchDroplets')

    try {
        const response = await client().GET('/v2/droplets', {
            params: {
                query: {
                    type: 'gpus',
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchDroplets', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.droplets
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplets', error)
        throw error
    }
}

export async function fetchDroplet({ id }: { id: number | string }) {
    console.log('fetchDroplet', id)

    try {
        const response = await client().GET('/v2/droplets/{droplet_id}', {
            params: {
                path: {
                    droplet_id: Number(id),
                },
            },
        })
        console.log('fetchDroplets', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.droplet
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplet', error)
        throw error
    }
}

export async function fetchDropletSnapshotList({ id }: { id: number | string }) {
    console.log('fetchDropletSnapshotList', id)

    try {
        const response = await client().GET('/v2/droplets/{droplet_id}/snapshots', {
            params: {
                path: {
                    droplet_id: Number(id),
                },
            },
        })

        console.log('fetchDropletSnapshotLists', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.snapshots
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplet Snapshot List', error)
        throw error
    }
}

export async function fetchDropletBackupList({ id }: { id: number | string }) {
    console.log('fetchDropletBackupList', id)

    try {
        const response = await client().GET('/v2/droplets/{droplet_id}/backups', {
            params: {
                path: {
                    droplet_id: Number(id),
                },
            },
        })

        console.log('fetchDropletBackupLists', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.backups
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplet Backup List', error)
        throw error
    }
}

export async function fetchDropletBackupPolicy({ id }: { id: number | string }) {
    console.log('fetchDropletBackupList', id)

    try {
        const response = await client().GET('/v2/droplets/{droplet_id}/backups/policy', {
            params: {
                path: {
                    droplet_id: Number(id),
                },
            },
        })

        console.log('fetchDropletBackupLists', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.policy
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplet Backup List', error)
        throw error
    }
}

export async function fetchDropletBackupSupportedPolicyList() {
    console.log('fetchDropletBackupSupportedPolicyList')

    try {
        const response = await client().GET('/v2/droplets/backups/supported_policies')

        console.log('fetchDropletBackupLists', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.supported_policies
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplet Backup Supported Policy List', error)
        throw error
    }
}

export async function fetchDropletStats({ id }: { id: number | string }) {
    console.log('fetchDropletStats', id)

    try {
        const now = Date.now()
        const start = new Date(now - ms('24h')).getTime() // 24 hours ago

        const startTimestamp = Math.floor(start / 1000).toString()
        const endTimestamp = Math.floor(now / 1000).toString()

        // Make all API calls in parallel
        const [
            // memoryResponse,
            cpuResponse,
            bandwidthInboundPublicResponse,
            bandwidthOutboundPublicResponse,
            bandwidthInboundPrivateResponse,
            bandwidthOutboundPrivateResponse,
            load15Response,
            load1Response,
            load5Response,
            dropletResponse,
        ] = await Promise.all([
            // Memory Metrics
            // client().GET('/v2/monitoring/metrics/droplet/memory_total', {
            //     params: {
            //         query: {
            //             host_id: String(id),
            //             start: startTimestamp,
            //             end: endTimestamp,
            //         },
            //     },
            // }),
            // CPU Metrics
            client().GET('/v2/monitoring/metrics/droplet/cpu', {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Bandwidth Metrics - Inbound Public
            client().GET('/v2/monitoring/metrics/droplet/bandwidth', {
                params: {
                    query: {
                        host_id: String(id),
                        interface: 'public',
                        direction: 'inbound',
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Bandwidth Metrics - Outbound Public
            client().GET('/v2/monitoring/metrics/droplet/bandwidth', {
                params: {
                    query: {
                        host_id: String(id),
                        interface: 'public',
                        direction: 'outbound',
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Bandwidth Metrics - Inbound Private
            client().GET('/v2/monitoring/metrics/droplet/bandwidth', {
                params: {
                    query: {
                        host_id: String(id),
                        interface: 'private',
                        direction: 'inbound',
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Bandwidth Metrics - Outbound Private
            client().GET('/v2/monitoring/metrics/droplet/bandwidth', {
                params: {
                    query: {
                        host_id: String(id),
                        interface: 'private',
                        direction: 'outbound',
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Load15 Metrics
            client().GET('/v2/monitoring/metrics/droplet/load_15', {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Load1 Metrics
            client().GET('/v2/monitoring/metrics/droplet/load_1', {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Load5 Metrics
            client().GET('/v2/monitoring/metrics/droplet/load_5', {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }),
            // Droplet details (for vCPU count)
            client().GET('/v2/droplets/{droplet_id}', {
                params: {
                    path: {
                        droplet_id: Number(id),
                    },
                },
            }),
        ])

        // Check for errors
        // if (cpuResponse.error) {
        //     throw new Error(`CPU metrics error: ${cpuResponse.error.message}`)
        // }
        if (bandwidthInboundPublicResponse.error) {
            throw new Error(
                `Bandwidth inbound public metrics error: ${bandwidthInboundPublicResponse.error.message}`
            )
        }
        if (bandwidthOutboundPublicResponse.error) {
            throw new Error(
                `Bandwidth outbound public metrics error: ${bandwidthOutboundPublicResponse.error.message}`
            )
        }
        if (bandwidthInboundPrivateResponse.error) {
            throw new Error(
                `Bandwidth inbound private metrics error: ${bandwidthInboundPrivateResponse.error.message}`
            )
        }
        if (bandwidthOutboundPrivateResponse.error) {
            throw new Error(
                `Bandwidth outbound private metrics error: ${bandwidthOutboundPrivateResponse.error.message}`
            )
        }
        // if (load15Response.error) {
        //     throw new Error(`Load15 metrics error: ${load15Response.error.message}`)
        // }
        if (dropletResponse.error) {
            throw new Error(`Droplet details error: ${dropletResponse.error.message}`)
        }

        // Process Bandwidth data (sum all values)
        const processBandwidthData = (data: any) => {
            const values = (data.data?.result?.[0]?.values || []) as [number, string][]
            return values.reduce(
                (sum: number, value: [number, string]) => sum + Number.parseFloat(value[1]),
                0
            )
        }

        const bandwidthInboundPublic = processBandwidthData(bandwidthInboundPublicResponse.data)
        const bandwidthOutboundPublic = processBandwidthData(bandwidthOutboundPublicResponse.data)
        const bandwidthInboundPrivate = processBandwidthData(bandwidthInboundPrivateResponse.data)
        const bandwidthOutboundPrivate = processBandwidthData(bandwidthOutboundPrivateResponse.data)

        // Compute CPU usage percent from CPU counters, normalized by vCPUs
        const computeCpuStats = (cpuData: any, vcpus: number) => {
            try {
                const series = (cpuData?.data?.result || []) as any[]
                if (!Array.isArray(series) || series.length === 0 || !vcpus) {
                    return {
                        latestPercent: 0,
                        averagePercent: 0,
                        series: [] as { t: number; percent: number }[],
                    }
                }

                const totalsByTs: Record<number, { total: number; idle: number }> = {}
                for (const s of series) {
                    const mode = s?.metric?.mode as string | undefined
                    const values = (s?.values || []) as [number, string][]
                    if (!Array.isArray(values) || !mode) continue
                    for (const [ts, valStr] of values) {
                        const val = Number.parseFloat(valStr)
                        if (!Number.isFinite(val)) continue
                        if (!totalsByTs[ts]) {
                            totalsByTs[ts] = { total: 0, idle: 0 }
                        }
                        totalsByTs[ts].total += val
                        if (mode === 'idle') {
                            totalsByTs[ts].idle += val
                        }
                    }
                }

                const timestamps = Object.keys(totalsByTs)
                    .map((k) => Number(k))
                    .filter((n) => Number.isFinite(n))
                    .sort((a, b) => a - b)

                if (timestamps.length < 2) {
                    return {
                        latestPercent: 0,
                        averagePercent: 0,
                        series: [] as { t: number; percent: number }[],
                    }
                }

                let sumUsed = 0
                let sumTime = 0
                const percentSeries: { t: number; percent: number }[] = []

                for (let i = 1; i < timestamps.length; i++) {
                    const tPrev = timestamps[i - 1]
                    const tCurr = timestamps[i]
                    const timeDiff = tCurr - tPrev
                    if (!(timeDiff > 0)) continue

                    const prev = totalsByTs[tPrev]
                    const curr = totalsByTs[tCurr]
                    const totalDiff = curr.total - prev.total
                    const idleDiff = curr.idle - prev.idle

                    if (!(totalDiff > 0)) continue

                    const used = Math.max(0, totalDiff - Math.max(0, idleDiff))
                    const usedCores = used / timeDiff
                    const percent = Math.min(100, Math.max(0, (usedCores / vcpus) * 100))

                    sumUsed += used
                    sumTime += timeDiff
                    percentSeries.push({ t: tCurr, percent })
                }

                const averagePercent =
                    sumTime > 0
                        ? Math.min(100, Math.max(0, (sumUsed / (sumTime * vcpus)) * 100))
                        : 0
                const latestPercent =
                    percentSeries.length > 0 ? percentSeries[percentSeries.length - 1].percent : 0

                return { latestPercent, averagePercent, series: percentSeries }
            } catch (_e) {
                return {
                    latestPercent: 0,
                    averagePercent: 0,
                    series: [] as { t: number; percent: number }[],
                }
            }
        }

        const vcpus = Number(dropletResponse.data?.droplet?.vcpus || 1) || 1
        const cpu = computeCpuStats(cpuResponse.data, vcpus)

        // Process LoadXX data (summaries and normalized by vCPUs)
        const load15Values = (() => {
            try {
                const results = (load15Response.data?.data?.result || []) as any[]
                const allValues: [number, string][][] = results.map(
                    (r) => (r?.values || []) as [number, string][]
                )
                const agg: Record<number, { sum: number; count: number }> = {}
                for (const values of allValues) {
                    for (const [ts, valStr] of values) {
                        const val = Number.parseFloat(valStr)
                        if (!Number.isFinite(val)) continue
                        if (!agg[ts]) agg[ts] = { sum: 0, count: 0 }
                        agg[ts].sum += val
                        agg[ts].count += 1
                    }
                }
                const points = Object.keys(agg)
                    .map((k) => Number(k))
                    .filter((n) => Number.isFinite(n))
                    .sort((a, b) => a - b)
                    .map((ts) => {
                        const avg = agg[ts].count > 0 ? agg[ts].sum / agg[ts].count : 0
                        return { t: ts, value: avg, normalized: vcpus > 0 ? avg / vcpus : 0 }
                    })
                return points
            } catch (_e) {
                return [] as { t: number; value: number; normalized: number }[]
            }
        })()

        const load1Values = (() => {
            try {
                const results = (load1Response.data?.data?.result || []) as any[]
                const allValues: [number, string][][] = results.map(
                    (r) => (r?.values || []) as [number, string][]
                )
                const agg: Record<number, { sum: number; count: number }> = {}
                for (const values of allValues) {
                    for (const [ts, valStr] of values) {
                        const val = Number.parseFloat(valStr)
                        if (!Number.isFinite(val)) continue
                        if (!agg[ts]) agg[ts] = { sum: 0, count: 0 }
                        agg[ts].sum += val
                        agg[ts].count += 1
                    }
                }
                const points = Object.keys(agg)
                    .map((k) => Number(k))
                    .filter((n) => Number.isFinite(n))
                    .sort((a, b) => a - b)
                    .map((ts) => {
                        const avg = agg[ts].count > 0 ? agg[ts].sum / agg[ts].count : 0
                        return { t: ts, value: avg, normalized: vcpus > 0 ? avg / vcpus : 0 }
                    })
                return points
            } catch (_e) {
                return [] as { t: number; value: number; normalized: number }[]
            }
        })()

        const load5Values = (() => {
            try {
                const results = (load5Response.data?.data?.result || []) as any[]
                const allValues: [number, string][][] = results.map(
                    (r) => (r?.values || []) as [number, string][]
                )
                const agg: Record<number, { sum: number; count: number }> = {}
                for (const values of allValues) {
                    for (const [ts, valStr] of values) {
                        const val = Number.parseFloat(valStr)
                        if (!Number.isFinite(val)) continue
                        if (!agg[ts]) agg[ts] = { sum: 0, count: 0 }
                        agg[ts].sum += val
                        agg[ts].count += 1
                    }
                }
                const points = Object.keys(agg)
                    .map((k) => Number(k))
                    .filter((n) => Number.isFinite(n))
                    .sort((a, b) => a - b)
                    .map((ts) => {
                        const avg = agg[ts].count > 0 ? agg[ts].sum / agg[ts].count : 0
                        return { t: ts, value: avg, normalized: vcpus > 0 ? avg / vcpus : 0 }
                    })
                return points
            } catch (_e) {
                return [] as { t: number; value: number; normalized: number }[]
            }
        })()

        const load15Latest =
            load15Values.length > 0 ? load15Values[load15Values.length - 1].value : 0
        const load15Average =
            load15Values.length > 0
                ? load15Values.reduce((s, p) => s + p.value, 0) / load15Values.length
                : 0
        const load15NormalizedLatest = vcpus > 0 ? load15Latest / vcpus : 0
        const load15NormalizedAverage = vcpus > 0 ? load15Average / vcpus : 0

        const load1Latest = load1Values.length > 0 ? load1Values[load1Values.length - 1].value : 0
        const load1Average =
            load1Values.length > 0
                ? load1Values.reduce((s, p) => s + p.value, 0) / load1Values.length
                : 0
        const load1NormalizedLatest = vcpus > 0 ? load1Latest / vcpus : 0
        const load1NormalizedAverage = vcpus > 0 ? load1Average / vcpus : 0

        const load5Latest = load5Values.length > 0 ? load5Values[load5Values.length - 1].value : 0
        const load5Average =
            load5Values.length > 0
                ? load5Values.reduce((s, p) => s + p.value, 0) / load5Values.length
                : 0
        const load5NormalizedLatest = vcpus > 0 ? load5Latest / vcpus : 0
        const load5NormalizedAverage = vcpus > 0 ? load5Average / vcpus : 0

        const memoryTotalResponse = await client().GET(
            '/v2/monitoring/metrics/droplet/memory_total',
            {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }
        )

        // console.log(
        //     'memoryTotalResponse',
        //     JSON.stringify(memoryTotalResponse.data?.data.result[0].values.slice(0, 4), null, 2)
        // )

        const memoryAvailableResponse = await client().GET(
            '/v2/monitoring/metrics/droplet/memory_available',
            {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }
        )

        // console.log(
        //     'memoryAvailableResponse',
        //     JSON.stringify(memoryAvailableResponse.data?.data.result[0].values.slice(0, 4), null, 2)
        // )

        const filesystemSizeResponse = await client().GET(
            '/v2/monitoring/metrics/droplet/filesystem_size',
            {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }
        )

        // console.log(
        //     'filesystemSizeResponse',
        //     JSON.stringify(filesystemSizeResponse.data?.data.result[0].values.slice(0, 4), null, 2)
        // )

        const filesystemFreeResponse = await client().GET(
            '/v2/monitoring/metrics/droplet/filesystem_free',
            {
                params: {
                    query: {
                        host_id: String(id),
                        start: startTimestamp,
                        end: endTimestamp,
                    },
                },
            }
        )

        // console.log(
        //     'filesystemFreeResponse',
        //     JSON.stringify(filesystemFreeResponse.data?.data.result[0].values.slice(0, 4), null, 2)
        // )

        const getLatestFromFirstSeries = (metricResponse: any): number => {
            const series = (metricResponse?.data?.data?.result || []) as any[]
            if (!Array.isArray(series) || series.length === 0) return 0
            const values = (series[0]?.values || []) as [number, string][]
            if (!Array.isArray(values) || values.length === 0) return 0
            const last = values[values.length - 1][1]
            const num = Number.parseFloat(last)
            return Number.isFinite(num) ? num : 0
        }

        const getLatestSumAcrossSeries = (metricResponse: any): number => {
            const series = (metricResponse?.data?.data?.result || []) as any[]
            if (!Array.isArray(series) || series.length === 0) return 0
            let sum = 0
            for (const s of series) {
                const values = (s?.values || []) as [number, string][]
                if (!Array.isArray(values) || values.length === 0) continue
                const last = values[values.length - 1][1]
                const num = Number.parseFloat(last)
                if (Number.isFinite(num)) sum += num
            }
            return sum
        }

        // Memory: usage% = (total - available) / total
        const memoryTotalLatest = getLatestFromFirstSeries(memoryTotalResponse)
        const memoryAvailableLatest = getLatestFromFirstSeries(memoryAvailableResponse)
        const memoryUsedLatest = Math.max(0, memoryTotalLatest - Math.max(0, memoryAvailableLatest))
        const memoryPercentage =
            memoryTotalLatest > 0
                ? Math.min(100, Math.max(0, (memoryUsedLatest / memoryTotalLatest) * 100))
                : 0

        // Disk: usage% = (size - free) / size aggregated across filesystems
        const diskSizeLatest = getLatestSumAcrossSeries(filesystemSizeResponse)
        const diskFreeLatest = getLatestSumAcrossSeries(filesystemFreeResponse)
        const diskUsedLatest = Math.max(0, diskSizeLatest - Math.max(0, diskFreeLatest))
        const diskPercentage =
            diskSizeLatest > 0
                ? Math.min(100, Math.max(0, (diskUsedLatest / diskSizeLatest) * 100))
                : 0

        const result = {
            cpu: cpu,
            memory: memoryPercentage,
            disk: diskPercentage,
            bandwidth: {
                inbound: {
                    public: bandwidthInboundPublic,
                    private: bandwidthInboundPrivate,
                    total: bandwidthInboundPublic + bandwidthInboundPrivate,
                },
                outbound: {
                    public: bandwidthOutboundPublic,
                    private: bandwidthOutboundPrivate,
                    total: bandwidthOutboundPublic + bandwidthOutboundPrivate,
                },
                total:
                    bandwidthInboundPublic +
                    bandwidthOutboundPublic +
                    bandwidthInboundPrivate +
                    bandwidthOutboundPrivate,
            },
            load15: {
                latest: load15Latest,
                average: load15Average,
                normalized: {
                    latest: load15NormalizedLatest,
                    average: load15NormalizedAverage,
                },
                // series: load15Values,
            },
            load1: {
                latest: load1Latest,
                average: load1Average,
                normalized: {
                    latest: load1NormalizedLatest,
                    average: load1NormalizedAverage,
                },
            },
            load5: {
                latest: load5Latest,
                average: load5Average,
                normalized: {
                    latest: load5NormalizedLatest,
                    average: load5NormalizedAverage,
                },
            },
            period: {
                start: startTimestamp,
                end: endTimestamp,
            },
        }

        // console.log('fetchDropletStats result', result)
        return result
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Droplet Stats', error)
        throw error
    }
}

/*    		   VOLUMES             */
export async function fetchVolumeList() {
    console.log('fetchVolumeList')

    try {
        const response = await client().GET('/v2/volumes', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchVolumeList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.volumes
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Volume List', error)
        throw error
    }
}

export async function fetchVolume({ id }: { id: string }) {
    console.log('fetchVolume', id)

    try {
        const response = await client().GET('/v2/volumes/{volume_id}', {
            params: {
                path: {
                    volume_id: id,
                },
            },
        })

        console.log('fetchVolume', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.volume
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Volume', error)
        throw error
    }
}

export async function fetchVolumeSnapshotList({ id }: { id: string }) {
    console.log('fetchVolumeSnapshotList', id)

    try {
        const response = await client().GET('/v2/volumes/{volume_id}/snapshots', {
            params: {
                path: {
                    volume_id: id,
                },
            },
        })

        console.log('fetchVolumeSnapshotList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.snapshots
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Volume Snapshot List', error)
        throw error
    }
}

export async function fetchVolumeSnapshot({ snapshotId }: { snapshotId: string }) {
    console.log('fetchVolumeSnapshot', snapshotId)

    try {
        const response = await client().GET('/v2/volumes/snapshots/{snapshot_id}', {
            params: {
                path: {
                    snapshot_id: snapshotId,
                },
            },
        })

        console.log('fetchVolumeSnapshot', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.snapshot
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Volume Snapshot', error)
        throw error
    }
}

/*    		   PROJECTS             */
export async function fetchProjectList({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchProjectList')

    try {
        const response = await client({ connectionId }).GET('/v2/projects', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchProjectList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.projects as any[]
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Project List', error)
        throw error
    }
}

export async function fetchDefaultProject() {
    console.log('fetchDefaultProject')

    try {
        const response = await client().GET('/v2/projects/default')

        console.log('fetchDefaultProject', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.project
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Default Project', error)
        throw error
    }
}

export async function fetchProject({ id }: { id: string }) {
    console.log('fetchProject', id)

    try {
        const response = await client().GET('/v2/projects/{project_id}', {
            params: {
                path: {
                    project_id: id,
                },
            },
        })

        console.log('fetchProject', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.project
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Project', error)
        throw error
    }
}

export async function fetchProjectResources({ id }: { id: string }) {
    console.log('fetchProjectResources', id)

    try {
        const response = await client().GET('/v2/projects/{project_id}/resources', {
            params: {
                path: {
                    project_id: id,
                },
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchProjectResources', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.resources
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Project Resources', error)
        throw error
    }
}

export async function fetchDefaultProjectResources() {
    console.log('fetchDefaultProjectResources')

    try {
        const response = await client().GET('/v2/projects/default/resources')

        console.log('fetchDefaultProjectResources', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.resources
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Default Project Resources', error)
        throw error
    }
}

/*    		   SNAPSHOTS             */
export async function fetchSnapshotList() {
    console.log('fetchSnapshotList')

    try {
        const response = await client().GET('/v2/snapshots', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchSnapshotList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.snapshots
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Snapshot List', error)
        throw error
    }
}

export async function fetchSnapshot({ id }: { id: string }) {
    console.log('fetchSnapshot', id)

    try {
        const response = await client().GET('/v2/snapshots/{snapshot_id}', {
            params: {
                path: {
                    snapshot_id: id,
                },
            },
        })

        console.log('fetchSnapshot', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.snapshot
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Snapshot', error)
        throw error
    }
}

/*    		   IMAGES             */
export async function fetchImageList() {
    console.log('fetchImageList')

    try {
        const response = await client().GET('/v2/images', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchImageList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.images
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Image List', error)
        throw error
    }
}

export async function fetchImage({ id }: { id: string }) {
    console.log('fetchImage', id)

    try {
        const response = await client().GET('/v2/images/{image_id}', {
            params: {
                path: {
                    image_id: id,
                },
            },
        })

        console.log('fetchImage', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.image
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Image', error)
        throw error
    }
}

/*    		   DOMAINS             */
export async function fetchDomainList() {
    console.log('fetchDomainList')

    try {
        const response = await client().GET('/v2/domains', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchDomainList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.domains
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Domain List', error)
        throw error
    }
}

export async function fetchDomain({ name }: { name: string }) {
    console.log('fetchDomain', name)

    try {
        const response = await client().GET('/v2/domains/{domain_name}', {
            params: {
                path: {
                    domain_name: name,
                },
            },
        })

        console.log('fetchDomain', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.domain
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Domain', error)
        throw error
    }
}

export async function fetchDomainRecords({ name }: { name: string }) {
    console.log('fetchDomainRecords', name)

    try {
        const response = await client().GET('/v2/domains/{domain_name}/records', {
            params: {
                path: {
                    domain_name: name,
                },
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchDomainRecords', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.domain_records
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Domain Records', error)
        throw error
    }
}

/*    		   DATABASES             */
export async function fetchDatabaseCluster({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseCluster', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseCluster', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.database
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster', error)
        throw error
    }
}

export async function fetchDatabaseClusterConfig({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterConfig', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/config',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterConfig', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.config
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Config', error)
        throw error
    }
}

export async function fetchDatabaseClusterCertificate({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterCertificate', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/ca',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterCertificate', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.ca
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Certificate', error)
        throw error
    }
}

export async function fetchDatabaseClusterFirewallRules({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterFirewallRules', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/firewall',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterFirewallRules', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.rules
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Firewall Rules', error)
        throw error
    }
}

export async function fetchDatabaseClusterReplicas({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterReplicas', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/replicas',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterReplicas', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.replicas
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Replicas', error)
        throw error
    }
}

export async function fetchDatabaseClusterEvents({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterEvents', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/events',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterEvents', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.events
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Events', error)
        throw error
    }
}

export async function fetchDatabaseClusterReplica({
    id,
    replicaName,
    connectionId,
}: { id: string; replicaName: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterReplica', id, replicaName)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/replicas/{replica_name}',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                        replica_name: replicaName,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterReplica', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.replica
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Replica', error)
        throw error
    }
}

export async function fetchDatabaseClusterUsers({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterUsers', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/users',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterUsers', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.users
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Users', error)
        throw error
    }
}

export async function fetchDatabaseClusterUser({
    id,
    username,
    connectionId,
}: { id: string; username: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterUser', id, username)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/users/{username}',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                        username: username,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterUser', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.user
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster User', error)
        throw error
    }
}

export async function fetchDatabaseClusterRedisValkeyEvictionPolicy({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterEvictionPolicy', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/eviction_policy',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterEvictionPolicy', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.eviction_policy
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Eviction Policy', error)
        throw error
    }
}

export async function fetchDatabaseClusterSqlModes({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterSqlModes', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/sql_mode',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterSqlModes', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.sql_mode
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster SQL Modes', error)
        throw error
    }
}

export async function fetchDatabaseClusterKafkaTopics({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterKafkaTopics', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/topics',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterKafkaTopics', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.topics
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Kafka Topics', error)
        throw error
    }
}

export async function fetchDatabaseClusterKafkaTopic({
    id,
    topicName,
    connectionId,
}: { id: string; topicName: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterKafkaTopic', id, topicName)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/topics/{topic_name}',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                        topic_name: topicName,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterKafkaTopic', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.topic
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Kafka Topic', error)
        throw error
    }
}

export async function fetchDatabaseClusterKafkaSchemas({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterKafkaSchemas', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/schema-registry',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterKafkaSchemas', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.subjects
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Kafka Schemas', error)
        throw error
    }
}

export async function fetchDatabaseClusterKafkaSchema({
    id,
    subjectName,
    connectionId,
}: { id: string; subjectName: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterKafkaSchema', id, subjectName)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/schema-registry/{subject_name}',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                        subject_name: subjectName,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterKafkaSchema', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.schema
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster Kafka Schema', error)
        throw error
    }
}

export async function fetchDatabaseClustersMetricsCredentials({
    connectionId,
}: { connectionId?: string } = {}) {
    console.log('fetchDatabaseClustersMetricsCredentials')

    try {
        const response = await client({ connectionId }).GET('/v2/databases/metrics/credentials')

        console.log('fetchDatabaseClustersMetricsCredentials', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.credentials
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Clusters Metrics Credentials', error)
        throw error
    }
}

export async function fetchDatabaseClusterOpenSearchIndexes({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchDatabaseClusterOpenSearchIndexes', id)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/databases/{database_cluster_uuid}/indexes',
            {
                params: {
                    path: {
                        database_cluster_uuid: id,
                    },
                },
            }
        )

        console.log('fetchDatabaseClusterOpenSearchIndexes', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.indexes
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Database Cluster OpenSearch Indexes', error)
        throw error
    }
}

/*    		   APPS             */
export async function fetchAppList({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchAppList')

    try {
        const response = await client({ connectionId }).GET('/v2/apps', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchAppList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.apps
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App List', error)
        throw error
    }
}

export async function fetchApp({ id, connectionId }: { id: string; connectionId?: string }) {
    console.log('fetchApp', id)

    try {
        const response = await client({ connectionId }).GET('/v2/apps/{id}', {
            params: {
                path: {
                    id: id,
                },
            },
        })

        console.log('fetchApp', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.app
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App', error)
        throw error
    }
}

export async function fetchAppActiveDeploymentLogs({
    appId,
    type,
    connectionId,
}: { appId: string; type: 'UNSPECIFIED' | 'BUILD' | 'RUN' | 'DEPLOY'; connectionId?: string }) {
    console.log('fetchAppActiveDeploymentLogs', appId, type)

    try {
        const response = await client({ connectionId }).GET(
            // '/v2/apps/{app_id}/components/{component_name}/logs',
            '/v2/apps/{app_id}/logs',
            {
                params: {
                    path: {
                        app_id: appId,
                        // component_name: componentName,
                    },
                    query: {
                        type: type,
                    },
                },
            }
        )

        console.log('fetchAppActiveDeploymentLogs', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Active Deployment Logs', error)
        throw error
    }
}

export async function fetchAppExecUrl({
    appId,
    componentName,
    connectionId,
}: { appId: string; componentName: string; connectionId?: string }) {
    console.log('fetchAppExecUrl', appId, componentName)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/apps/{app_id}/components/{component_name}/exec',
            {
                params: {
                    path: {
                        app_id: appId,
                        component_name: componentName,
                    },
                },
            }
        )

        console.log('fetchAppExecUrl', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Exec URL', error)
        throw error
    }
}

export async function fetchAppInstances({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    console.log('fetchAppInstances', appId)

    try {
        const response = await client({ connectionId }).GET('/v2/apps/{app_id}/instances', {
            params: {
                path: {
                    app_id: appId,
                },
            },
        })

        console.log('fetchAppInstances', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.instances
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Instances', error)
        throw error
    }
}

export async function fetchAppDeployments({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    console.log('fetchAppDeployments', appId)

    try {
        const response = await client({ connectionId }).GET('/v2/apps/{app_id}/deployments', {
            params: {
                path: {
                    app_id: appId,
                },
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchAppDeployments', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.deployments
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Deployments', error)
        throw error
    }
}

export async function fetchAppDeployment({
    appId,
    deploymentId,
    connectionId,
}: { appId: string; deploymentId: string; connectionId?: string }) {
    console.log('fetchAppDeployment', appId, deploymentId)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/apps/{app_id}/deployments/{deployment_id}',
            {
                params: {
                    path: {
                        app_id: appId,
                        deployment_id: deploymentId,
                    },
                },
            }
        )

        console.log('fetchAppDeployment', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.deployment
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Deployment', error)
        throw error
    }
}

export async function fetchAppInstanceSizes({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchAppInstanceSizes')

    try {
        const response = await client({ connectionId }).GET('/v2/apps/tiers/instance_sizes')

        console.log('fetchAppInstanceSizes', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.instance_sizes
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Instance Sizes', error)
        throw error
    }
}

export async function fetchAppInstanceSize({
    slug,
    connectionId,
}: { slug: string; connectionId?: string }) {
    console.log('fetchAppInstanceSize', slug)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/apps/tiers/instance_sizes/{slug}',
            {
                params: {
                    path: {
                        slug: slug,
                    },
                },
            }
        )

        console.log('fetchAppInstanceSize', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.instance_size
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Instance Size', error)
        throw error
    }
}

export async function fetchAppRegions({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchAppRegions')

    try {
        const response = await client({ connectionId }).GET('/v2/apps/regions')

        console.log('fetchAppRegions', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.regions
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Regions', error)
        throw error
    }
}

export async function fetchAppAlerts({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    console.log('fetchAppAlerts', appId)

    try {
        const response = await client({ connectionId }).GET('/v2/apps/{app_id}/alerts', {
            params: {
                path: {
                    app_id: appId,
                },
            },
        })

        console.log('fetchAppAlerts', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.alerts
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Alerts', error)
        throw error
    }
}

export async function fetchAppBandwidthMetrics({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    console.log('fetchAppBandwidthMetrics', appId)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/apps/{app_id}/metrics/bandwidth_daily',
            {
                params: {
                    path: {
                        app_id: appId,
                    },
                },
            }
        )

        console.log('fetchAppBandwidthMetrics', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Bandwidth Metrics', error)
        throw error
    }
}

export async function fetchAppHealth({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    console.log('fetchAppHealth', appId)

    try {
        const response = await client({ connectionId }).GET('/v2/apps/{app_id}/health', {
            params: {
                path: {
                    app_id: appId,
                },
            },
        })

        console.log('fetchAppHealth', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Health', error)
        throw error
    }
}

export async function fetchAppStats({
    appId,
    connectionId,
}: { appId: string; connectionId?: string }) {
    console.log('fetchAppStats', appId)

    try {
        const now = new Date()
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

        const startTimestamp = start.toISOString()
        const endTimestamp = now.toISOString()

        // Make all API calls in parallel
        const [memoryResponse, cpuResponse, restartCountResponse, bandwidthResponse] =
            await Promise.all([
                // Memory Percentage Metrics
                client({ connectionId }).GET('/v2/monitoring/metrics/apps/memory_percentage', {
                    params: {
                        query: {
                            app_id: appId,
                            start: startTimestamp,
                            end: endTimestamp,
                        },
                    },
                }),
                // CPU Percentage Metrics
                client({ connectionId }).GET('/v2/monitoring/metrics/apps/cpu_percentage', {
                    params: {
                        query: {
                            app_id: appId,
                            start: startTimestamp,
                            end: endTimestamp,
                        },
                    },
                }),
                // Restart Count Metrics
                client({ connectionId }).GET('/v2/monitoring/metrics/apps/restart_count', {
                    params: {
                        query: {
                            app_id: appId,
                            start: startTimestamp,
                            end: endTimestamp,
                        },
                    },
                }),
                // Daily Bandwidth Metrics
                client({ connectionId }).GET('/v2/apps/{app_id}/metrics/bandwidth_daily', {
                    params: {
                        path: {
                            app_id: appId,
                        },
                    },
                }),
            ])

        // Check for errors
        if (memoryResponse.error) {
            throw new Error(`Memory metrics error: ${memoryResponse.error.message}`)
        }
        if (cpuResponse.error) {
            throw new Error(`CPU metrics error: ${cpuResponse.error.message}`)
        }
        if (restartCountResponse.error) {
            throw new Error(`Restart count metrics error: ${restartCountResponse.error.message}`)
        }
        if (bandwidthResponse.error) {
            throw new Error(`Bandwidth metrics error: ${bandwidthResponse.error.message}`)
        }

        // Process Memory data (calculate average)
        const memoryData = (memoryResponse.data.data?.result?.[0]?.values || []) as [
            number,
            string,
        ][]
        const memoryAverage =
            memoryData.length > 0
                ? memoryData.reduce(
                      (sum: number, value: [number, string]) => sum + Number.parseFloat(value[1]),
                      0
                  ) / memoryData.length
                : 0

        // Process CPU data (calculate average)
        const cpuData = (cpuResponse.data.data?.result?.[0]?.values || []) as [number, string][]
        const cpuAverage =
            cpuData.length > 0
                ? cpuData.reduce(
                      (sum: number, value: [number, string]) => sum + Number.parseFloat(value[1]),
                      0
                  ) / cpuData.length
                : 0

        // Process Restart Count data (sum all values)
        const restartCountData = (restartCountResponse.data.data?.result?.[0]?.values || []) as [
            number,
            string,
        ][]
        const restartCountSum = restartCountData.reduce(
            (sum: number, value: [number, string]) => sum + Number.parseFloat(value[1]),
            0
        )

        // Process Bandwidth data (return as is - daily bandwidth metrics)
        const bandwidthData =
            Number(bandwidthResponse.data.app_bandwidth_usage?.[0]?.bandwidth_bytes) /
                1024 /
                1024 || 0

        const result = {
            memory: {
                average: memoryAverage,
            },
            cpu: {
                average: cpuAverage,
            },
            restartCount: {
                sum: restartCountSum,
            },
            bandwidth: {
                average: bandwidthData,
            },
            period: {
                start: startTimestamp,
                end: endTimestamp,
            },
        }

        console.log('fetchAppStats result', result)
        return result
    } catch (e) {
        const error = e as Error
        console.log('Error fetching App Stats', error)
        throw error
    }
}

/*    		   LOAD BALANCERS             */
export async function fetchLoadBalancerList({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchLoadBalancerList')

    try {
        const response = await client({ connectionId }).GET('/v2/load_balancers', {
            params: {
                query: {
                    page: 1,
                    per_page: 200,
                },
            },
        })

        console.log('fetchLoadBalancerList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.load_balancers
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Load Balancer List', error)
        throw error
    }
}

export async function fetchLoadBalancer({
    id,
    connectionId,
}: { id: string; connectionId?: string }) {
    console.log('fetchLoadBalancer', id)

    try {
        const response = await client({ connectionId }).GET('/v2/load_balancers/{lb_id}', {
            params: {
                path: {
                    lb_id: id,
                },
            },
        })

        console.log('fetchLoadBalancer', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.load_balancer
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Load Balancer', error)
        throw error
    }
}

/*    		   SPACES            */
export async function fetchSpacesAccessKeys({
    bucket,
    connectionId,
}: { bucket?: string; connectionId?: string } = {}) {
    console.log('fetchSpacesAccessKeys', bucket)

    try {
        const queryParams: Record<string, any> = {
            page: 1,
            per_page: 200,
        }

        if (bucket) {
            // queryParams.bucket = bucket
        }

        const response = await client({ connectionId }).GET('/v2/spaces/keys', {
            params: {
                query: queryParams,
            },
        })

        console.log('fetchSpacesAccessKeys', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.keys
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Spaces Access Keys', error)
        throw error
    }
}

/*    		   FUNCTIONS            */
export async function fetchFunctionNamespaceList({ connectionId }: { connectionId?: string } = {}) {
    console.log('fetchFunctionNamespaceList')

    try {
        const response = await client({ connectionId }).GET('/v2/functions/namespaces')

        console.log('fetchFunctionNamespaceList', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.namespaces
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Function Namespace List', error)
        throw error
    }
}

export async function fetchFunctionNamespace({
    namespaceId,
    connectionId,
}: { namespaceId: string; connectionId?: string }) {
    console.log('fetchFunctionNamespace', namespaceId)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/functions/namespaces/{namespace_id}',
            {
                params: {
                    path: {
                        namespace_id: namespaceId,
                    },
                },
            }
        )

        console.log('fetchFunctionNamespace', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.namespace
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Function Namespace', error)
        throw error
    }
}

export async function fetchFunctionList({
    namespaceId,
    connectionId,
}: { namespaceId?: string; connectionId?: string } = {}) {
    console.log('fetchFunctionList', namespaceId)

    try {
        if (namespaceId) {
            console.log('fetchFunctionList (single namespace)', namespaceId)
            // If namespace is provided, get triggers for that specific namespace
            const response = await client({ connectionId }).GET(
                '/v2/functions/namespaces/{namespace_id}/triggers',
                {
                    params: {
                        path: {
                            namespace_id: namespaceId,
                        },
                    },
                }
            )

            console.log('fetchFunctionList (single namespace)', response)

            if (response.error) {
                throw new Error(response.error.message)
            }

            return response.data.triggers || []
        }

        // If no namespace provided, get all namespaces first, then get triggers for each
        const namespacesResponse = await client({ connectionId }).GET('/v2/functions/namespaces')

        console.log('fetchFunctionList (namespaces)', namespacesResponse)

        if (namespacesResponse.error) {
            throw new Error(namespacesResponse.error.message)
        }

        const namespaces = namespacesResponse.data.namespaces || []
        const allTriggers: any[] = []

        // Get triggers for each namespace and merge them
        for (const namespace of namespaces) {
            if (!namespace.uuid) continue // Skip if namespace UUID is undefined

            try {
                const triggersResponse = await client({ connectionId }).GET(
                    '/v2/functions/namespaces/{namespace_id}/triggers',
                    {
                        params: {
                            path: {
                                namespace_id: namespace.uuid,
                            },
                        },
                    }
                )

                if (triggersResponse.data?.triggers) {
                    // Add namespace info to each trigger for context
                    const triggersWithNamespace = triggersResponse.data.triggers.map(
                        (trigger: any) => ({
                            ...trigger,
                            namespace: {
                                uuid: namespace.uuid,
                                label: namespace.label,
                                region: namespace.region,
                            },
                        })
                    )
                    allTriggers.push(...triggersWithNamespace)
                }
            } catch (error) {
                console.warn(`Failed to fetch triggers for namespace ${namespace.uuid}:`, error)
                // Continue with other namespaces even if one fails
            }
        }

        console.log('fetchFunctionList (all triggers)', allTriggers)
        return allTriggers
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Function List', error)
        throw error
    }
}

export async function fetchFunction({
    namespaceId,
    triggerName,
    connectionId,
}: { namespaceId: string; triggerName: string; connectionId?: string }) {
    console.log('fetchFunction', namespaceId, triggerName)

    try {
        const response = await client({ connectionId }).GET(
            '/v2/functions/namespaces/{namespace_id}/triggers/{trigger_name}',
            {
                params: {
                    path: {
                        namespace_id: namespaceId,
                        trigger_name: triggerName,
                    },
                },
            }
        )

        console.log('fetchFunction', response)

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data.trigger
    } catch (e) {
        const error = e as Error
        console.log('Error fetching Function', error)
        throw error
    }
}

/*    		   MISC             */
export async function fetchApiStatus() {
    const response = await fetch('https://status.digitalocean.com/api/v2/status.json')
    const data = (await response.json()) as {
        page: {
            id: string
            name: string
            url: string
            time_zone: string
            updated_at: Date
        }
        status: {
            indicator: string
            description: string
        }
    }
    return data?.status
}
