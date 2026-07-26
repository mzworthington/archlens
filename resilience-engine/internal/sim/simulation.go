package sim

import (
	"encoding/json"
	"math"
	"strings"

	"blueprint/resilience-engine/internal/graph"
	"blueprint/resilience-engine/internal/model"
)

func buildDependents(schema model.SystemSchema) map[string][]string {
	return graph.BuildDependents(schema)
}

func resolveEntryPoints(schema model.SystemSchema, explicit []string) []string {
	if len(explicit) > 0 {
		return explicit
	}

	called := make(map[string]struct{}, len(schema.Dependencies))
	for _, dep := range schema.Dependencies {
		called[dep.To] = struct{}{}
	}

	entryPoints := make([]string, 0)
	for _, node := range schema.Nodes {
		if _, ok := called[node.EntityRef]; !ok {
			entryPoints = append(entryPoints, node.EntityRef)
		}
	}
	if len(entryPoints) > 0 {
		return entryPoints
	}

	for _, node := range schema.Nodes {
		entryPoints = append(entryPoints, node.EntityRef)
	}
	return entryPoints
}

func domainFromEntityRef(ref string) string {
	parts := strings.Split(ref, "/")
	for _, part := range parts {
		if part != "" {
			return part
		}
	}
	return ref
}

func buildAdvice(
	schema model.SystemSchema,
	spofs []string,
	heat map[string]float64,
	propagationStoppedAt []string,
) []string {
	advice := make([]string, 0)
	nodeByID := make(map[string]model.SystemNode, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeByID[node.EntityRef] = node
	}

	for _, spof := range spofs {
		node := nodeByID[spof]
		name := node.Name
		if name == "" {
			name = spof
		}
		advice = append(advice,
			"Add a circuit breaker on "+name+" — multiple services depend on it with no isolation.",
		)
	}

	for _, stopped := range propagationStoppedAt {
		node := nodeByID[stopped]
		name := node.Name
		if name == "" {
			name = stopped
		}
		advice = append(advice,
			"Circuit breaker on "+name+" contained the blast radius — keep this safeguard enabled.",
		)
	}

	hotNodes := make([]string, 0)
	for id, intensity := range heat {
		if intensity >= 0.7 {
			node := nodeByID[id]
			name := node.Name
			if name == "" {
				name = id
			}
			hotNodes = append(hotNodes, name)
		}
	}
	if len(hotNodes) > 0 {
		advice = append(advice, "High-impact nodes: "+strings.Join(hotNodes, ", ")+". Review timeouts and fallbacks.")
	}

	return advice
}

// DetectSpofs flags shared dependencies with multiple callers and no circuit breaker.
func DetectSpofs(schema model.SystemSchema) []string {
	dependents := buildDependents(schema)
	spofs := make([]string, 0)

	for dependency, callers := range dependents {
		if len(callers) < 2 {
			continue
		}

		hasCircuitBreaker := false
		for _, node := range schema.Nodes {
			if node.EntityRef != dependency {
				continue
			}
			raw, ok := node.Properties["resilience"]
			if !ok {
				break
			}
			var parsed struct {
				Safeguards model.NodeSafeguards `json:"safeguards"`
			}
			if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
				hasCircuitBreaker = boolVal(parsed.Safeguards.CircuitBreaker)
			}
			break
		}

		if !hasCircuitBreaker {
			spofs = append(spofs, dependency)
		}
	}

	return spofs
}

func mergeHeat(dst map[string]float64, src map[string]float64) {
	for id, intensity := range src {
		existing := dst[id]
		dst[id] = math.Min(1, math.Max(existing, intensity))
	}
}

func computeEntryPointSlas(
	entryPoints []string,
	heat map[string]float64,
) (map[string]float64, float64) {
	entryPointSlas := make(map[string]float64, len(entryPoints))
	values := make([]float64, 0, len(entryPoints))
	for _, entry := range entryPoints {
		impact := heat[entry]
		sla := math.Round((1-impact)*1000) / 10
		entryPointSlas[entry] = sla
		values = append(values, sla)
	}

	overall := 100.0
	if len(values) > 0 {
		sum := 0.0
		for _, v := range values {
			sum += v
		}
		overall = math.Round((sum/float64(len(values)))*10) / 10
	}

	return entryPointSlas, overall
}

// RunSimulation executes deterministic blast-radius simulation for the given spec.
func RunSimulation(schema model.SystemSchema, spec model.ChaosSpec) model.SimulationResult {
	mergedHeat := make(map[string]float64)
	propagationStoppedAt := make(map[string]struct{})
	options := BlastRadiusOptions{Safeguards: spec.Safeguards}

	for _, fault := range spec.Faults {
		targets := graph.ResolveFaultTargets(fault.NodeID, schema)
		for _, target := range targets {
			f := fault
			f.NodeID = target
			blast := ComputeBlastRadius(schema, f, options)
			for _, stopped := range blast.PropagationStoppedAt {
				propagationStoppedAt[stopped] = struct{}{}
			}
			mergeHeat(mergedHeat, blast.Heat)
		}
	}

	entryPoints := resolveEntryPoints(schema, spec.EntryPoints)
	entryPointSlas, overallSla := computeEntryPointSlas(entryPoints, mergedHeat)

	impactedNodes := make([]string, 0)
	for id, intensity := range mergedHeat {
		if intensity > 0 {
			impactedNodes = append(impactedNodes, id)
		}
	}

	domainSet := make(map[string]struct{})
	for _, id := range impactedNodes {
		domainSet[domainFromEntityRef(id)] = struct{}{}
	}
	impactedDomains := make([]string, 0, len(domainSet))
	for domain := range domainSet {
		impactedDomains = append(impactedDomains, domain)
	}

	stopped := make([]string, 0, len(propagationStoppedAt))
	for id := range propagationStoppedAt {
		stopped = append(stopped, id)
	}

	spofs := DetectSpofs(schema)
	heatOut := make(map[string]float64, len(mergedHeat))
	for k, v := range mergedHeat {
		heatOut[k] = v
	}

	return model.SimulationResult{
		Heat:                 heatOut,
		ImpactedNodes:        impactedNodes,
		EntryPointSlas:       entryPointSlas,
		OverallSla:           overallSla,
		Spofs:                spofs,
		ImpactedDomains:      impactedDomains,
		Advice:               buildAdvice(schema, spofs, mergedHeat, stopped),
		PropagationStoppedAt: stopped,
		Engine:               "go",
	}
}
