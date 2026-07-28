package sim

import (
	"math"

	"blueprint/resilience-engine/internal/graph"
	"blueprint/resilience-engine/internal/model"
)

// IntegrityPeerFactor scales integrity impact for sibling subscribers on a topic.
const IntegrityPeerFactor = 0.5

type IntegrityRadiusResult struct {
	IntegrityHeat          map[string]float64
	IntegrityImpactedNodes []string
}

func mergeIntegrityHeat(dst map[string]float64, nodeID string, severity float64) {
	existing := dst[nodeID]
	dst[nodeID] = math.Min(1, math.Max(existing, severity))
}

// ComputeIntegrityRadius propagates data-integrity impact for async publish-subscribe streams.
func ComputeIntegrityRadius(
	schema model.SystemSchema,
	fault model.NodeFaultConfig,
) IntegrityRadiusResult {
	nodeIDs := make(map[string]struct{}, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeIDs[node.EntityRef] = struct{}{}
	}

	if _, ok := nodeIDs[fault.NodeID]; !ok {
		return IntegrityRadiusResult{
			IntegrityHeat: map[string]float64{},
		}
	}

	integrityHeat := make(map[string]float64)
	baseSeverity := resolveFaultSeverity(fault)
	mergeIntegrityHeat(integrityHeat, fault.NodeID, baseSeverity)

	for _, brokerID := range graph.PubSubBrokersForPublisher(schema, fault.NodeID) {
		mergeIntegrityHeat(integrityHeat, brokerID, baseSeverity)
		for _, peerID := range graph.PubSubPeersOnBroker(schema, brokerID) {
			if peerID == fault.NodeID {
				continue
			}
			mergeIntegrityHeat(integrityHeat, peerID, baseSeverity*IntegrityPeerFactor)
		}
	}

	if len(graph.PubSubBrokersAttachedToNode(schema, fault.NodeID)) > 0 {
		for _, peerID := range graph.PubSubPeersOnBroker(schema, fault.NodeID) {
			mergeIntegrityHeat(integrityHeat, peerID, baseSeverity)
		}
	}

	impacted := make([]string, 0)
	for id, intensity := range integrityHeat {
		if intensity > 0 {
			impacted = append(impacted, id)
		}
	}

	return IntegrityRadiusResult{
		IntegrityHeat:          integrityHeat,
		IntegrityImpactedNodes: impacted,
	}
}

func mergeIntegrityMaps(dst map[string]float64, src map[string]float64) {
	for id, intensity := range src {
		existing := dst[id]
		dst[id] = math.Min(1, math.Max(existing, intensity))
	}
}

func computeOverallIntegrity(integrityHeat map[string]float64) float64 {
	if len(integrityHeat) == 0 {
		return 100
	}

	sum := 0.0
	count := 0
	for _, intensity := range integrityHeat {
		if intensity <= 0 {
			continue
		}
		sum += (1 - intensity) * 100
		count++
	}
	if count == 0 {
		return 100
	}
	return math.Round((sum/float64(count))*10) / 10
}
