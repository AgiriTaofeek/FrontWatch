# Application Management

Hierarchy:

```text
Organization
 └── Application
      └── Environment
           └── Project/SDK configuration
```

Application APIs should support creation, update, archive, and retrieval.

Environment should explicitly identify deployment context such as:

```text
production
staging
development
```

Credentials must be scoped to the smallest useful ingestion boundary.
