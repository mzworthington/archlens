package sim_test

import (
	"path/filepath"
	"testing"
	"time"

	"blueprint/resilience-engine/api"
	"blueprint/resilience-engine/internal/fixtures"
	"blueprint/resilience-engine/internal/model"
	"blueprint/resilience-engine/internal/sim"
)

// KR3: deterministic SLA/SLO report (including WASM Monte Carlo path) in <5s.
// Default designer Monte Carlo config is 1000 iterations @ severityJitter 0.12.
const (
	kr3MonteCarloBudget   = 5 * time.Second
	defaultWasmIterations = 1000
	largeGraphFaultNode   = "chaoslens-stress/large-graph/domain-orders"
)

func loadLargeGraphSchema(t *testing.T) model.SystemSchema {
	t.Helper()
	root, err := fixtures.FindRepoRoot("")
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(root, "blueprints", "chaoslens-stress", "large-graph-containers.yaml")
	schema, err := fixtures.LoadBlueprintSchema(path)
	if err != nil {
		t.Fatal(err)
	}
	return schema
}

func largeGraphSpec() model.ChaosSpec {
	return model.ChaosSpec{
		Faults: []model.NodeFaultConfig{
			{NodeID: largeGraphFaultNode, FaultType: "region-outage"},
		},
	}
}

func TestLargeGraphMonteCarloWithinKR3Budget(t *testing.T) {
	schema := loadLargeGraphSchema(t)
	if got := len(schema.Nodes); got < 30 {
		t.Fatalf("large-graph fixture too small for KR1 topology stress: %d nodes", got)
	}

	cfg := model.MonteCarloConfig{
		Iterations:     defaultWasmIterations,
		Seed:           42,
		SeverityJitter: 0.12,
	}

	start := time.Now()
	stats := sim.RunMonteCarlo(schema, largeGraphSpec(), cfg)
	elapsed := time.Since(start)

	if stats.Iterations != defaultWasmIterations {
		t.Fatalf("expected %d iterations, got %d", defaultWasmIterations, stats.Iterations)
	}
	if stats.OverallSlaP95 < stats.OverallSlaP5 {
		t.Fatalf("p95 (%v) should be >= p5 (%v)", stats.OverallSlaP95, stats.OverallSlaP5)
	}
	if elapsed >= kr3MonteCarloBudget {
		t.Fatalf(
			"WASM Monte Carlo path exceeded KR3 budget on large-graph: %v >= %v (nodes=%d)",
			elapsed,
			kr3MonteCarloBudget,
			len(schema.Nodes),
		)
	}
	t.Logf("large-graph Monte Carlo: %d nodes, %d iterations in %v", len(schema.Nodes), stats.Iterations, elapsed)
}

func TestLargeGraphWasmAPIRequestWithinKR3Budget(t *testing.T) {
	schema := loadLargeGraphSchema(t)
	mc := model.MonteCarloConfig{
		Iterations:     defaultWasmIterations,
		Seed:           42,
		SeverityJitter: 0.12,
	}

	start := time.Now()
	out, err := api.RunRequest(model.SimulationRequest{
		Schema:     schema,
		Spec:       largeGraphSpec(),
		MonteCarlo: &mc,
	})
	elapsed := time.Since(start)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) == 0 {
		t.Fatal("expected non-empty WASM API JSON response")
	}
	if elapsed >= kr3MonteCarloBudget {
		t.Fatalf(
			"api.RunRequest Monte Carlo exceeded KR3 budget on large-graph: %v >= %v",
			elapsed,
			kr3MonteCarloBudget,
		)
	}
	t.Logf("large-graph api.RunRequest (WASM bridge path) in %v", elapsed)
}
