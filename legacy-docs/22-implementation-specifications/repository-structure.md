# Repository Structure

Recommended monorepo:

```text
frontwatch/
├── apps/
│   ├── web/                 # dashboard
│   └── control-api/         # Bun + TypeScript
├── services/
│   ├── ingestion/           # Go
│   ├── processor/           # Go
│   └── aggregator/          # Go, when needed
├── packages/
│   ├── contracts/            # API/event schemas
│   ├── sdk/                  # browser SDK
│   ├── ui/                   # shared UI
│   └── config/               # shared TS configuration
├── infra/
│   ├── docker/
│   ├── helm/
│   └── local/
├── docs/
├── scripts/
└── .github/
```

Do not split every logical feature into a separate deployable service. Deployable boundaries should follow operational needs.
