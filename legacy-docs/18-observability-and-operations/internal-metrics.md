# Internal Metrics

## API

```text
http_requests_total
http_request_errors_total
http_request_duration
```

## Ingestion

```text
ingestion_requests_total
ingestion_events_total
ingestion_rejected_total
ingestion_bytes_total
ingestion_latency
```

## Queue

```text
queue_depth
queue_lag
publish_errors
consumer_errors
```

## Processing

```text
events_processed_total
processing_failures_total
processing_latency
retry_total
dead_letter_total
```

## Storage

```text
postgres_latency
postgres_connections
clickhouse_query_latency
clickhouse_insert_latency
storage_bytes
```

## Resource

```text
CPU
memory
goroutines
GC
disk
network
```

Metrics should have controlled label cardinality.
