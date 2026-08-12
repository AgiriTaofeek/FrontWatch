# Webhooks & Integrations

## Purpose

Allow FrontWatch to notify external systems without coupling the core alert engine to every vendor.

## Webhook

Conceptual endpoint:

```text
POST customer-configured-url
```

## Event Types

Initial candidates:

```text
alert.triggered
alert.recovered
issue.created
issue.regression
```

## Security

Webhook delivery should support:

- signing secret
- timestamp
- replay protection
- retry
- delivery ID

Example conceptual headers:

```text
X-FrontWatch-Delivery
X-FrontWatch-Timestamp
X-FrontWatch-Signature
```

## Retry

Webhook delivery should use bounded retries and exponential backoff.

## Idempotency

Consumers should be able to deduplicate deliveries using the delivery ID.

## Important

Webhook support is an integration boundary and should not be part of the core telemetry ingestion path.
