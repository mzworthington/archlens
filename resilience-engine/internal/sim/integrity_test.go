package sim_test

import (
	"testing"

	"blueprint/resilience-engine/internal/model"
	"blueprint/resilience-engine/internal/sim"
)

func pubSubSchema() model.SystemSchema {
	return model.SystemSchema{
		Nodes: []model.SystemNode{
			{EntityRef: "shop/web", Name: "Web", Type: "web-app"},
			{EntityRef: "shop/orders", Name: "Orders", Type: "microservice"},
			{EntityRef: "shop/events", Name: "Events", Type: "event-broker"},
			{EntityRef: "shop/worker", Name: "Worker", Type: "background-worker"},
		},
		Dependencies: []model.SystemDependency{
			{From: "shop/web", To: "shop/orders", Type: "direct-call"},
			{From: "shop/orders", To: "shop/events", Type: "publish-subscribe"},
			{From: "shop/worker", To: "shop/events", Type: "publish-subscribe"},
		},
	}
}

func TestComputeIntegrityRadiusPublisherFault(t *testing.T) {
	result := sim.ComputeIntegrityRadius(
		pubSubSchema(),
		model.NodeFaultConfig{NodeID: "shop/orders", FaultType: "region-outage"},
	)

	if result.IntegrityHeat["shop/orders"] != 1 {
		t.Fatalf("expected orders integrity 1, got %v", result.IntegrityHeat["shop/orders"])
	}
	if result.IntegrityHeat["shop/events"] != 1 {
		t.Fatalf("expected events integrity 1, got %v", result.IntegrityHeat["shop/events"])
	}
	if result.IntegrityHeat["shop/worker"] != sim.IntegrityPeerFactor {
		t.Fatalf("expected worker peer integrity %v, got %v", sim.IntegrityPeerFactor, result.IntegrityHeat["shop/worker"])
	}
	if _, ok := result.IntegrityHeat["shop/web"]; ok {
		t.Fatalf("web should not have integrity impact")
	}
}

func TestComputeIntegrityRadiusBrokerFault(t *testing.T) {
	result := sim.ComputeIntegrityRadius(
		pubSubSchema(),
		model.NodeFaultConfig{NodeID: "shop/events", FaultType: "error-rate", Severity: ptr(0.8)},
	)

	if result.IntegrityHeat["shop/events"] != 0.8 {
		t.Fatalf("expected broker integrity 0.8, got %v", result.IntegrityHeat["shop/events"])
	}
	if result.IntegrityHeat["shop/orders"] != 0.8 {
		t.Fatalf("expected orders integrity 0.8, got %v", result.IntegrityHeat["shop/orders"])
	}
	if result.IntegrityHeat["shop/worker"] != 0.8 {
		t.Fatalf("expected worker integrity 0.8, got %v", result.IntegrityHeat["shop/worker"])
	}
}

func TestRunSimulationPublisherPreservesEntrySlaWithIntegrityImpact(t *testing.T) {
	schema := model.SystemSchema{
		Nodes: []model.SystemNode{
			{EntityRef: "shop/web", Name: "Web", Type: "web-app"},
			{EntityRef: "shop/orders", Name: "Orders", Type: "microservice"},
			{EntityRef: "shop/events", Name: "Events", Type: "event-broker"},
			{EntityRef: "shop/worker", Name: "Worker", Type: "background-worker"},
		},
		Dependencies: []model.SystemDependency{
			{From: "shop/orders", To: "shop/events", Type: "publish-subscribe"},
			{From: "shop/worker", To: "shop/events", Type: "publish-subscribe"},
		},
	}

	result := sim.RunSimulation(schema, model.ChaosSpec{
		Faults: []model.NodeFaultConfig{
			{NodeID: "shop/orders", FaultType: "region-outage"},
		},
		EntryPoints: []string{"shop/web"},
	})

	if result.OverallSla != 100 {
		t.Fatalf("expected overall SLA 100, got %v", result.OverallSla)
	}
	if result.OverallIntegrity >= 100 {
		t.Fatalf("expected degraded integrity, got %v", result.OverallIntegrity)
	}
	if result.IntegrityHeat["shop/worker"] != sim.IntegrityPeerFactor {
		t.Fatalf("expected worker integrity impact")
	}
}
