// Package issue owns fingerprinting and (later) grouping/issue
// lifecycle — code-structure.md's module boundaries table lists
// fingerprinting under Issues, not Telemetry.
package issue

import (
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"
)

// FingerprintVersion — legacy fingerprinting.md's explicit requirement:
// "fingerprint algorithm changes should be treated as a data-model/
// product decision" and must be versionable. A future algorithm change
// bumps this rather than silently reshuffling existing groupings
// (ADR-008: derived data must be recomputable, not destructively
// overwritten).
const FingerprintVersion uint16 = 1

var (
	// Order matters: UUIDs before plain numbers, since a UUID also
	// contains digits the number pattern would otherwise fragment into
	// noise instead of one clean placeholder.
	uuidPattern   = regexp.MustCompile(`(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
	hexPattern    = regexp.MustCompile(`(?i)\b0x[0-9a-f]+\b`)
	quotedPattern = regexp.MustCompile(`'[^']*'|"[^"]*"`)
	numberPattern = regexp.MustCompile(`\d+`)
)

// NormalizeMessage strips values that vary between otherwise-identical
// occurrences of the same underlying error — legacy fingerprinting.md's
// "resistant to noisy dynamic values" requirement. Not perfect (no
// normalization scheme covers every case), which is exactly why the
// algorithm is versioned rather than assumed final.
func NormalizeMessage(message string) string {
	m := uuidPattern.ReplaceAllString(message, "<uuid>")
	m = hexPattern.ReplaceAllString(m, "<hex>")
	m = quotedPattern.ReplaceAllString(m, "<string>")
	m = numberPattern.ReplaceAllString(m, "<n>")
	return strings.TrimSpace(m)
}

// Fingerprint computes a stable grouping key for an error event, and
// returns FingerprintVersion alongside it — one call gives you both
// values a caller needs to persist, rather than requiring a second
// lookup of the version constant (and risking it drift out of sync).
// Deterministic (same input always produces the same output) and
// stable across occurrences (normalization absorbs the noise) — both
// explicit legacy spec requirements. Truncated to 16 hex chars: plenty
// of collision resistance for this use, cheaper to store/index than
// the full 64.
func Fingerprint(exceptionType, message string) (string, uint16) {
	input := exceptionType + "|" + NormalizeMessage(message)
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])[:16], FingerprintVersion
}
