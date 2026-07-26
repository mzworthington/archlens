package sim_test

import (
	"testing"

	"blueprint/resilience-engine/internal/model"
	"blueprint/resilience-engine/internal/sim"
)

func ecommerceSchema() model.SystemSchema {
	return model.SystemSchema{
		Nodes: []model.SystemNode{
			{EntityRef: "shop/web", Name: "Web App", Type: "web-app"},
			{EntityRef: "shop/mobile", Name: "Mobile App", Type: "mobile-app"},
			{EntityRef: "shop/api", Name: "API", Type: "microservice"},
			{EntityRef: "shop/payment", Name: "Payment", Type: "microservice"},
			{EntityRef: "shop/db", Name: "Database", Type: "database"},
		},
		Dependencies: []model.SystemDependency{
			{From: "shop/web", To: "shop/api"},
			{From: "shop/mobile", To: "shop/api"},
			{From: "shop/api", To: "shop/payment"},
			{From: "shop/api", To: "shop/db"},
		},
	}
}

func TestComputeBlastRadiusPropagatesUpstream(t *testing.T) {
	result := sim.ComputeBlastRadius(
		ecommerceSchema(),
		model.NodeFaultConfig{NodeID: "shop/payment", FaultType: "region-outage"},
		sim.BlastRadiusOptions{},
	)

	if result.Heat["shop/payment"] != 1 {
		t.Fatalf("expected payment heat 1, got %v", result.Heat["shop/payment"])
	}
	if result.Heat["shop/api"] <= 0 {
		t.Fatalf("expected api heat > 0")
	}
	if result.Heat["shop/web"] <= 0 {
		t.Fatalf("expected web heat > 0")
	}
	if _, ok := result.Heat["shop/db"]; ok {
		t.Fatalf("db should not be impacted")
	}
}

func TestRunSimulationDegradesSla(t *testing.T) {
	result := sim.RunSimulation(ecommerceSchema(), model.ChaosSpec{
		Faults: []model.NodeFaultConfig{
			{NodeID: "shop/payment", FaultType: "region-outage"},
		},
		EntryPoints: []string{"shop/web"},
	})

	if result.OverallSla >= 100 {
		t.Fatalf("expected degraded SLA, got %v", result.OverallSla)
	}
	if result.EntryPointSlas["shop/web"] >= 100 {
		t.Fatalf("expected degraded entry SLA")
	}
}

func TestDetectSpofs(t *testing.T) {
	spofs := sim.DetectSpofs(ecommerceSchema())
	found := false
	for _, id := range spofs {
		if id == "shop/api" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected shop/api to be flagged as SPOF")
	}
}

func TestGroupDependencyExpansion(t *testing.T) {
	schema := model.SystemSchema{
		Nodes: []model.SystemNode{
			{EntityRef: "demo/user", Type: "person"},
			{EntityRef: "demo/hub", Type: "group", Name: "Hub"},
			{EntityRef: "demo/api", Type: "microservice", ParentEntityRef: "demo/hub"},
			{EntityRef: "demo/db", Type: "database", ParentEntityRef: "demo/hub"},
		},
		Dependencies: []model.SystemDependency{
			{From: "demo/user", To: "demo/hub"},
		},
	}

	result := sim.RunSimulation(schema, model.ChaosSpec{
		Faults: []model.NodeFaultConfig{
			{NodeID: "demo/api", FaultType: "region-outage"},
		},
		EntryPoints: []string{"demo/user"},
	})

	if result.Heat["demo/user"] <= 0 {
		t.Fatalf("expected user to be impacted via group edge, heat=%v", result.Heat["demo/user"])
	}
}

func TestRunMonteCarloProducesStats(t *testing.T) {
	stats := sim.RunMonteCarlo(ecommerceSchema(), model.ChaosSpec{
		Faults: []model.NodeFaultConfig{
			{NodeID: "shop/payment", FaultType: "latency", Severity: ptr(0.5)},
		},
		EntryPoints: []string{"shop/web"},
	}, model.MonteCarloConfig{Iterations: 200, Seed: 1})

	if stats.Iterations != 200 {
		t.Fatalf("expected 200 iterations, got %d", stats.Iterations)
	}
	if stats.OverallSlaMean <= 0 || stats.OverallSlaMean > 100 {
		t.Fatalf("unexpected mean SLA %v", stats.OverallSlaMean)
	}
	if stats.OverallSlaP95 < stats.OverallSlaP5 {
		t.Fatalf("p95 should be >= p5")
	}
}

func ptr(v float64) *float64 { return &v }
