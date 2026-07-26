package sim

import (
	"encoding/json"
	"math"

	"blueprint/resilience-engine/internal/graph"
	"blueprint/resilience-engine/internal/model"
)

const (
	heatDecay        = 0.75
	localCacheFactor = 0.5
	retryAmplifier   = 1.2
	bulkheadMaxHops  = 2
)

type BlastRadiusOptions struct {
	Safeguards map[string]model.NodeSafeguards
}

type BlastRadiusResult struct {
	Heat                 map[string]float64
	ImpactedNodes        []string
	PropagationStoppedAt []string
}

type queueItem struct {
	nodeID   string
	severity float64
	hops     int
}

func safeguardsFor(
	nodeID string,
	options BlastRadiusOptions,
	schema model.SystemSchema,
) model.NodeSafeguards {
	if options.Safeguards != nil {
		if sg, ok := options.Safeguards[nodeID]; ok {
			return sg
		}
	}

	for _, node := range schema.Nodes {
		if node.EntityRef != nodeID {
			continue
		}
		raw, ok := node.Properties["resilience"]
		if !ok || raw == "" {
			break
		}
		var parsed struct {
			Safeguards model.NodeSafeguards `json:"safeguards"`
		}
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			return parsed.Safeguards
		}
		break
	}

	return model.NodeSafeguards{}
}

func boolVal(v *bool) bool {
	return v != nil && *v
}

// ComputeBlastRadius propagates failure impact upstream from a faulted node.
func ComputeBlastRadius(
	schema model.SystemSchema,
	fault model.NodeFaultConfig,
	options BlastRadiusOptions,
) BlastRadiusResult {
	nodeIDs := make(map[string]struct{}, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeIDs[node.EntityRef] = struct{}{}
	}

	if _, ok := nodeIDs[fault.NodeID]; !ok {
		return BlastRadiusResult{
			Heat:          map[string]float64{},
			ImpactedNodes: []string{},
		}
	}

	dependents := graph.BuildDependents(schema)
	heat := make(map[string]float64)
	propagationStoppedAt := make([]string, 0)
	baseSeverity := resolveFaultSeverity(fault)

	heat[fault.NodeID] = baseSeverity
	queue := []queueItem{{nodeID: fault.NodeID, severity: baseSeverity, hops: 0}}
	visited := make(map[string]struct{})

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if _, seen := visited[current.nodeID]; seen {
			continue
		}
		visited[current.nodeID] = struct{}{}

		for _, callerID := range dependents[current.nodeID] {
			callerSafeguards := safeguardsFor(callerID, options, schema)

			if boolVal(callerSafeguards.CircuitBreaker) {
				propagationStoppedAt = append(propagationStoppedAt, callerID)
				existing := heat[callerID]
				localSeverity := math.Max(existing, current.severity*heatDecay)
				heat[callerID] = localSeverity
				continue
			}

			propagated := current.severity * heatDecay
			if boolVal(callerSafeguards.LocalCache) {
				propagated *= localCacheFactor
			}
			if boolVal(callerSafeguards.Retry) {
				propagated = math.Min(1, propagated*retryAmplifier)
			}

			maxHops := math.MaxInt
			if boolVal(callerSafeguards.Bulkhead) {
				maxHops = bulkheadMaxHops
			}
			if current.hops+1 > maxHops {
				propagationStoppedAt = append(propagationStoppedAt, callerID)
				continue
			}

			existing := heat[callerID]
			merged := math.Min(1, math.Max(existing, propagated))
			heat[callerID] = merged
			queue = append(queue, queueItem{nodeID: callerID, severity: merged, hops: current.hops + 1})
		}
	}

	impacted := make([]string, 0, len(heat))
	for id, intensity := range heat {
		if intensity > 0 {
			impacted = append(impacted, id)
		}
	}

	return BlastRadiusResult{
		Heat:                 heat,
		ImpactedNodes:        impacted,
		PropagationStoppedAt: propagationStoppedAt,
	}
}
