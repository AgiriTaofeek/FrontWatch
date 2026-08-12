# Upgrade Testing

## Upgrade Matrix

Test:

```text
previous supported version
 → current version
```

and important supported upgrade paths.

## Test

1. Create representative deployment.
2. Populate telemetry.
3. Configure alerts.
4. Create releases.
5. Take backup.
6. Run upgrade.
7. Validate migration.
8. Validate ingestion.
9. Validate dashboard.
10. Validate alerting.

## Rollback

Where supported, test rollback.

## Compatibility

Verify old SDK versions continue to function within the documented compatibility window.
