# Browser SDK Architecture

```text
Public API
   ↓
Capture modules
   ↓
Privacy/sanitization
   ↓
Event normalization
   ↓
Sampling
   ↓
Buffer
   ↓
Transport
```

Capture modules should be independently testable.

The SDK must degrade safely when FrontWatch is unavailable.
