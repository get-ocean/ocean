export const DB_CLUSTER_ENGINE_LABELS = {
    pg: 'PostgreSQL',
    mysql: 'MySQL',
    redis: 'Redis',
    mongodb: 'MongoDB',
    kafka: 'Kafka',
    opensearch: 'OpenSearch',
    valkey: 'Valkey',
} as const

export const VOLUME_REGIONS = [
    'ams1',
    'ams2',
    'ams3',
    'blr1',
    'fra1',
    'lon1',
    'nyc1',
    'nyc2',
    'nyc3',
    'sfo1',
    'sfo2',
    'sfo3',
    'sgp1',
    'tor1',
    'syd1',
] as const
