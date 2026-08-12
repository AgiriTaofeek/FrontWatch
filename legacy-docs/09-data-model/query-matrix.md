# FrontWatch — Query Matrix

| Query | Main dimensions | Time-bound | Expected frequency |
|---|---|---:|---:|
| Application health | app, environment, time | Yes | Very high |
| Active issues | app, environment, status | Usually | Very high |
| Issue occurrences | issue, time, release | Yes | High |
| Session timeline | session, timestamp | Yes | High |
| Network failures | app, route, status, time | Yes | High |
| Performance by route | app, route, metric, time | Yes | High |
| Release comparison | app, release, time | Yes | High |
| Error trend | app, issue/event type, time | Yes | Very high |
| Browser impact | app, browser, time | Yes | Medium |
| Device impact | app, device, time | Yes | Medium |
| Alert evaluation | rule, metric, time | Yes | High |
| Audit search | org, actor, action, time | Yes | Low |

## Design Implication

The storage layer must be optimized around the highest-value and highest-frequency queries, especially:

```text
Health
Issues
Error trends
Issue investigation
Session timelines
Release comparison
```
