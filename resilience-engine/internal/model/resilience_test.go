package model

import "testing"

func TestResilienceSafeguardsForNodeTopLevel(t *testing.T) {
	node := SystemNode{
		Resilience: &NodeResilience{
			CircuitBreaker: boolPtr(true),
			Retry:          boolPtr(true),
		},
	}

	got := ResilienceSafeguardsForNode(node)
	if !pointerBool(got.CircuitBreaker) || !pointerBool(got.Retry) {
		t.Fatalf("expected circuit breaker and retry, got %+v", got)
	}
}

func TestResilienceSafeguardsForNodeMissing(t *testing.T) {
	got := ResilienceSafeguardsForNode(SystemNode{})
	if pointerBool(got.CircuitBreaker) || pointerBool(got.Bulkhead) || pointerBool(got.Retry) || pointerBool(got.LocalCache) {
		t.Fatalf("expected empty safeguards, got %+v", got)
	}
}

func pointerBool(v *bool) bool {
	return v != nil && *v
}
