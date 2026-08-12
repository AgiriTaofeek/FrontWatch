# SDK Manual APIs

The automatic instrumentation should be complemented by a small manual API.

## Capture Exception

```ts
frontwatch.captureException(error);
```

## Capture Message

```ts
frontwatch.captureMessage("Checkout started");
```

## Breadcrumb

```ts
frontwatch.addBreadcrumb({
  category: "checkout",
  message: "Checkout started"
});
```

## Set Context

```ts
frontwatch.setContext("checkout", {
  step: "payment"
});
```

Sensitive values must be subject to privacy rules.

## User Identity

If supported, the API should accept a pseudonymous identifier rather than encouraging sensitive PII.

Example:

```ts
frontwatch.setUser({
  id: "customer_opaque_id"
});
```

## Flush

```ts
await frontwatch.flush();
```

Useful for controlled shutdown/lifecycle scenarios.

## Disable

```ts
frontwatch.close();
```

The exact API may evolve, but the public surface should remain intentionally small.
