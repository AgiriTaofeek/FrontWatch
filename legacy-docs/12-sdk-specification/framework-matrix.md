# Framework Support Matrix

| Framework | SPA | SSR | SSG | Adapter |
|---|---:|---:|---:|---|
| React | Yes | Via host | Via host | React |
| Next.js | Yes | Yes | Yes | Next |
| React Router | Yes | Yes | Depends | React Router |
| Remix | Yes | Yes | Depends | Remix |
| TanStack Start | Yes | Yes | Depends | TanStack |
| Vue | Yes | Via host | Via host | Vue |
| Nuxt | Yes | Yes | Yes | Nuxt |
| Svelte | Yes | Via host | Via host | Svelte |
| SvelteKit | Yes | Yes | Yes | SvelteKit |
| Solid | Yes | Via host | Via host | Solid |
| SolidStart | Yes | Yes | Depends | SolidStart |

## Adapter Responsibilities

Each adapter should handle:

- framework initialization
- route integration
- error integration
- lifecycle integration
- SSR/client boundary

The core SDK remains framework independent.
