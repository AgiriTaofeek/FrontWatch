# Framework Compatibility Testing

## Supported Families

```text
React
Next.js
React Router
Remix
TanStack Start
Vue
Nuxt
Svelte
SvelteKit
Solid
SolidStart
```

## Rendering Modes

Test:

```text
SPA
SSR
SSG
hybrid
```

## Required Checks

For every supported integration:

```text
install
build
run
initialize
capture error
capture navigation
capture network
capture performance
```

## SSR Safety

Verify browser-only APIs are not executed during server rendering.

## Version Matrix

Maintain a tested compatibility range rather than claiming every historical framework version.
