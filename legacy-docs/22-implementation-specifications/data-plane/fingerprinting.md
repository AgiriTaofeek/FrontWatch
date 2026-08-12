# Fingerprinting

Fingerprinting determines when multiple error occurrences represent the same issue.

## Inputs

Potential inputs:

```text
exception type
normalized message
top meaningful stack frames
route
framework context
```

Avoid high-cardinality or user-specific fields that make grouping unstable.

## Requirements

- deterministic
- stable across occurrences
- resistant to noisy dynamic values
- versionable

Fingerprint algorithm changes should be treated as a data-model/product decision.
