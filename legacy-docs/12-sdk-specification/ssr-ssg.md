# SDK SSR, SSG & SPA Behavior

## Core Rule

Browser instrumentation must execute only in a browser-capable context.

## SSR

During server rendering:

```text
server code
 ↓
do not initialize browser SDK instrumentation
```

Client hydration:

```text
hydration
 ↓
initialize browser SDK
```

## SSG

Generated static HTML should not require the SDK to execute during build.

At runtime:

```text
browser
 ↓
SDK initialization
```

## SPA

Initialize once per application runtime.

Route changes are captured through router integrations.

## Hybrid Applications

Frameworks such as Next.js, Nuxt, SvelteKit, Remix, React Router, TanStack Start, and SolidStart may have both server and client execution.

The SDK package must provide clear installation boundaries.

## Common Failure

Avoid:

```text
server imports browser-only module
```

which can cause build/runtime failures.

## Recommendation

Provide explicit browser/client entry points where framework ecosystems require them.
