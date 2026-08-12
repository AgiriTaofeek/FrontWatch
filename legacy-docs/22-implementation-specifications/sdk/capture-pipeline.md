# SDK Capture Pipeline

```text
Browser signal
 ↓
capture
 ↓
normalize
 ↓
sanitize
 ↓
sample
 ↓
enqueue
 ↓
batch
 ↓
transport
```

Never send raw sensitive values merely because a capture module collected them.

Capture must be asynchronous and bounded.
