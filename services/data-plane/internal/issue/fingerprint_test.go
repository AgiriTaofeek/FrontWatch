package issue

import "testing"

func TestFingerprint_Deterministic(t *testing.T) {
	a, _ := Fingerprint("TypeError", "Cannot read properties of undefined")
	b, _ := Fingerprint("TypeError", "Cannot read properties of undefined")
	if a != b {
		t.Fatalf("Fingerprint() not deterministic: %q != %q", a, b)
	}
}

func TestFingerprint_ReturnsCurrentVersion(t *testing.T) {
	_, version := Fingerprint("TypeError", "boom")
	if version != FingerprintVersion {
		t.Errorf("version = %d, want %d", version, FingerprintVersion)
	}
}

func TestFingerprint_SameGroup(t *testing.T) {
	tests := []struct {
		name string
		msgA string
		msgB string
	}{
		{
			name: "different numeric IDs in an otherwise identical message",
			msgA: "Failed to load user 12345",
			msgB: "Failed to load user 98765",
		},
		{
			name: "different UUIDs",
			msgA: "Session 550e8400-e29b-41d4-a716-446655440000 expired",
			msgB: "Session 6ba7b810-9dad-11d1-80b4-00c04fd430c8 expired",
		},
		{
			name: "different quoted values",
			msgA: `Unexpected token 'foo' in JSON`,
			msgB: `Unexpected token 'bar' in JSON`,
		},
		{
			name: "different hex addresses",
			msgA: "Segfault at 0x7ffee3a1b2c0",
			msgB: "Segfault at 0x1a2b3c4d5e6f",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a, _ := Fingerprint("TypeError", tt.msgA)
			b, _ := Fingerprint("TypeError", tt.msgB)
			if a != b {
				t.Errorf("expected same fingerprint for noisy variants, got %q vs %q (normalized: %q vs %q)",
					a, b, NormalizeMessage(tt.msgA), NormalizeMessage(tt.msgB))
			}
		})
	}
}

func TestFingerprint_DifferentGroup(t *testing.T) {
	t.Run("different exception types, same message", func(t *testing.T) {
		a, _ := Fingerprint("TypeError", "boom")
		b, _ := Fingerprint("RangeError", "boom")
		if a == b {
			t.Error("expected different fingerprints for different exception types")
		}
	})

	t.Run("genuinely different messages", func(t *testing.T) {
		a, _ := Fingerprint("TypeError", "Cannot read properties of undefined")
		b, _ := Fingerprint("TypeError", "Network request failed")
		if a == b {
			t.Error("expected different fingerprints for genuinely different messages")
		}
	})
}

func TestNormalizeMessage(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"strips numbers", "user 12345 not found", "user <n> not found"},
		{"strips uuid", "id 550e8400-e29b-41d4-a716-446655440000 missing", "id <uuid> missing"},
		{"strips hex", "at address 0x7ffee3a1b2c0", "at address <hex>"},
		{"strips quoted strings", `token "abc" invalid`, "token <string> invalid"},
		{"leaves plain text alone", "network request failed", "network request failed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormalizeMessage(tt.input)
			if got != tt.want {
				t.Errorf("NormalizeMessage(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
