# Release Pipeline

```text
Git tag
 ↓
Build
 ↓
Test
 ↓
Security scan
 ↓
Immutable images
 ↓
Publish artifacts
 ↓
Release metadata
 ↓
Staging
 ↓
Smoke tests
 ↓
Promotion
```

Promote the same built artifact rather than rebuilding later.

Every artifact must map to:

```text
source commit
tests
dependency versions
```

Maintain a known-good rollback version.
