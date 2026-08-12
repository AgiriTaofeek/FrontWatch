# Frontend Testing Strategy

## Unit

Test:

- data transformations
- filter logic
- formatters
- state transitions

## Component

Test:

- loading
- empty
- error
- success
- accessibility behavior

## Integration

Test complete workflows:

```text
login
 ↓
select application
 ↓
filter environment
 ↓
open issue
 ↓
inspect occurrence
 ↓
open session
```

## End-to-End

Critical workflows should run in a real browser.

## Visual Regression

Important design-system and investigation screens should have visual regression coverage where useful.

## API Contract

Frontend types and API responses should be validated against the published contract.

## Performance Tests

Track:

- initial load
- route transitions
- large list rendering
- timeline rendering
