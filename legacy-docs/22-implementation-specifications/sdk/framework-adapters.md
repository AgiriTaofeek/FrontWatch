# Framework Adapters

The core SDK should be framework-agnostic.

Integration adapters may handle framework-specific lifecycle details for:

```text
Next.js
React Router
Remix
TanStack Start
SvelteKit
Nuxt
SolidStart
```

Do not put framework-specific logic into the core capture pipeline unless necessary.
