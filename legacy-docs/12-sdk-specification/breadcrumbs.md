# SDK Breadcrumbs

## Purpose

Breadcrumbs provide context immediately before an error.

## Categories

```text
navigation
interaction
network
error
performance
custom
```

## Examples

```text
Navigation → /accounts
Network → GET /api/accounts → 200
Interaction → button
Network → GET /api/profile → 500
Error → TypeError
```

## Limits

Breadcrumb storage must be bounded.

Example concept:

```text
last N breadcrumbs
```

## Privacy

Breadcrumb messages and metadata are untrusted/sensitive-capable data.

Apply the same privacy rules as other telemetry.

## Custom Breadcrumbs

Developers should be able to add useful context:

```ts
frontwatch.addBreadcrumb({
  category: "payment",
  message: "Payment flow started"
});
```

Custom breadcrumbs must not encourage developers to place secrets into telemetry.
