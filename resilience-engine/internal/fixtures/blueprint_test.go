package fixtures_test

import (
	"path/filepath"
	"testing"

	"blueprint/resilience-engine/internal/fixtures"
)

func TestLoadLargeGraphStressFixture(t *testing.T) {
	root, err := fixtures.FindRepoRoot("")
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(root, "blueprints", "chaoslens-stress", "large-graph-containers.yaml")
	schema, err := fixtures.LoadBlueprintSchema(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := len(schema.Nodes); got < 30 {
		t.Fatalf("expected >= 30 nodes in large-graph fixture, got %d", got)
	}
	if got := len(schema.Dependencies); got < 30 {
		t.Fatalf("expected >= 30 dependencies in large-graph fixture, got %d", got)
	}

	var retail *bool
	for _, node := range schema.Nodes {
		if node.EntityRef == "chaoslens-stress/large-graph/bff-retail" {
			if node.Resilience == nil || node.Resilience.CircuitBreaker == nil {
				t.Fatalf("bff-retail should parse circuitBreaker resilience")
			}
			retail = node.Resilience.CircuitBreaker
			break
		}
	}
	if retail == nil || !*retail {
		t.Fatalf("expected bff-retail circuitBreaker=true")
	}
}
