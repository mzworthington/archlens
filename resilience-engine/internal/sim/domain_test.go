package sim_test

import (
	"testing"

	"blueprint/resilience-engine/internal/sim"
)

func TestDomainFromEntityRef(t *testing.T) {
	tests := []struct {
		ref  string
		want string
	}{
		{ref: "shop/api", want: "shop"},
		{ref: "billing/ledger", want: "billing"},
		{
			ref:  "blueprint/chaoslens-stress/large-graph/domain-orders",
			want: "large-graph",
		},
		{ref: "e-commerce/order-api/order-processor", want: "order-api"},
	}

	for _, tc := range tests {
		if got := sim.DomainFromEntityRef(tc.ref); got != tc.want {
			t.Fatalf("DomainFromEntityRef(%q) = %q, want %q", tc.ref, got, tc.want)
		}
	}
}
