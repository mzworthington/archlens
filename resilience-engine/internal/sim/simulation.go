package sim

import (
	"math"
	"sort"
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

func DomainFromEntityRef(ref string) string {
	parts := strings.Split(ref, "/")
	segments := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			segments = append(segments, part)
		}
	}
	if len(segments) == 0 {
		return ref
	}
	if len(segments) <= 2 {
		return segments[0]
	}
	return segments[len(segments)-2]
}

func isThirdPartyNode(node model.SystemNode) bool {
	if node.External {
		return true
	}
	if strings.HasPrefix(node.EntityRef, "external/") || strings.Contains(node.EntityRef, "/external/") {
		return true
	}
	return false
}

func isSafeguardTargetNode(node model.SystemNode) bool {
	if isThirdPartyNode(node) {
		return false
	}
	switch node.Type {
	case "web-app", "mobile-app", "single-page-app", "microservice", "rest-api", "grpc-service", "gateway-api", "background-worker", "serverless-app", "serverless-function", "container", "component", "code-module":
		return true
	default:
		return false
	}
}

func sortedMapKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func buildAdvice(
	schema model.SystemSchema,
	spofs []string,
	heat map[string]float64,
	integrityHeat map[string]float64,
	propagationStoppedAt []string,
	faultNodeIDs []string,
) []string {
	advice := make([]string, 0)
	nodeByID := make(map[string]model.SystemNode, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeByID[node.EntityRef] = node
	}
	dependents := buildDependents(schema)

	for _, spof := range spofs {
		depNode := nodeByID[spof]
		depName := depNode.Name
		if depName == "" {
			depName = spof
		}
		note := "shared dependency with fan-in and no caller-side isolation in application code"
		if isThirdPartyNode(depNode) {
			note = "shared third-party dependency with fan-in - isolation must be in your application code, not on the vendor"
		}
		callers := dependents[spof]
		seenCallers := make(map[string]struct{}, len(callers))
		for _, callerID := range callers {
			if _, seen := seenCallers[callerID]; seen {
				continue
			}
			seenCallers[callerID] = struct{}{}
			callerNode, ok := nodeByID[callerID]
			if !ok || !isSafeguardTargetNode(callerNode) {
				continue
			}
			if boolVal(model.ResilienceSafeguardsForNode(callerNode).CircuitBreaker) {
				continue
			}
			callerName := callerNode.Name
			if callerName == "" {
				callerName = callerID
			}
			advice = append(advice,
				"In "+callerName+", add a circuit breaker on the outbound client to "+depName+" - "+note+".",
			)
		}
	}

	for _, stopped := range propagationStoppedAt {
		node := nodeByID[stopped]
		name := node.Name
		if name == "" {
			name = stopped
		}
		advice = append(advice,
			"Circuit breaker in "+name+" contained the blast radius - keep this outbound isolation in application code.",
		)
	}

	hotNodes := make([]string, 0)
	for _, id := range sortedMapKeys(heat) {
		intensity := heat[id]
		if intensity >= 0.7 {
			node, ok := nodeByID[id]
			if ok && !isSafeguardTargetNode(node) {
				continue
			}
			name := node.Name
			if name == "" {
				name = id
			}
			hotNodes = append(hotNodes, name)
		}
	}
	if len(hotNodes) > 0 {
		advice = append(advice, "High-impact services: "+strings.Join(hotNodes, ", ")+". Review outbound timeouts and fallbacks in application code.")
	}

	for _, faultID := range faultNodeIDs {
		brokers := graph.PubSubBrokersForPublisher(schema, faultID)
		if len(brokers) == 0 {
			continue
		}
		publisher := nodeByID[faultID]
		publisherName := publisher.Name
		if publisherName == "" {
			publisherName = faultID
		}
		stalePeers := make(map[string]struct{})
		for _, brokerID := range brokers {
			for _, peerID := range graph.PubSubPeersOnBroker(schema, brokerID) {
				if peerID == faultID {
					continue
				}
				peerHeat := integrityHeat[peerID]
				if peerHeat >= IntegrityPeerFactor*0.5 {
					stalePeers[peerID] = struct{}{}
				}
			}
		}
		if len(stalePeers) > 0 {
			peerNames := make([]string, 0, len(stalePeers))
			for _, id := range sortedMapKeys(stalePeers) {
				node := nodeByID[id]
				name := node.Name
				if name == "" {
					name = id
				}
				peerNames = append(peerNames, name)
			}
			advice = append(advice,
				publisherName+" stopped publishing - in "+strings.Join(peerNames, ", ")+
					", handle stale or missing events in consumer logic.",
			)
		}
	}

	integrityOnly := make([]string, 0)
	for _, id := range sortedMapKeys(integrityHeat) {
		intensity := integrityHeat[id]
		if intensity < 0.7 {
			continue
		}
		avail := heat[id]
		if avail >= 0.3 {
			continue
		}
		node, ok := nodeByID[id]
		if ok && !isSafeguardTargetNode(node) {
			continue
		}
		name := node.Name
		if name == "" {
			name = id
		}
		integrityOnly = append(integrityOnly, name)
	}
	if len(integrityOnly) > 0 {
		advice = append(advice,
			"Data integrity risk without availability loss: "+strings.Join(integrityOnly, ", ")+
				". Verify staleness handling and compensating actions in application code.",
		)
	}

	return advice
}

// DetectSpofs flags shared dependencies with multiple callers and no circuit breaker.
func DetectSpofs(schema model.SystemSchema) []string {
	dependents := buildDependents(schema)
	spofs := make([]string, 0)

	for _, dependency := range sortedMapKeys(dependents) {
		callers := dependents[dependency]
		if len(callers) < 2 {
			continue
		}

		hasCircuitBreaker := false
		for _, node := range schema.Nodes {
			if node.EntityRef != dependency {
				continue
			}
			hasCircuitBreaker = boolVal(model.ResilienceSafeguardsForNode(node).CircuitBreaker)
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
	mergedIntegrityHeat := make(map[string]float64)
	propagationStoppedAt := make(map[string]struct{})
	faultNodeIDs := make([]string, 0)
	options := BlastRadiusOptions{Safeguards: spec.Safeguards}

	for _, fault := range spec.Faults {
		targets := graph.ResolveFaultTargets(fault.NodeID, schema)
		for _, target := range targets {
			faultNodeIDs = append(faultNodeIDs, target)
			f := fault
			f.NodeID = target
			blast := ComputeBlastRadius(schema, f, options)
			for _, stopped := range blast.PropagationStoppedAt {
				propagationStoppedAt[stopped] = struct{}{}
			}
			mergeHeat(mergedHeat, blast.Heat)

			integrity := ComputeIntegrityRadius(schema, f)
			mergeIntegrityMaps(mergedIntegrityHeat, integrity.IntegrityHeat)
		}
	}

	entryPoints := resolveEntryPoints(schema, spec.EntryPoints)
	entryPointSlas, overallSla := computeEntryPointSlas(entryPoints, mergedHeat)

	impactedNodes := make([]string, 0)
	for _, id := range sortedMapKeys(mergedHeat) {
		if mergedHeat[id] > 0 {
			impactedNodes = append(impactedNodes, id)
		}
	}

	integrityImpactedNodes := make([]string, 0)
	for _, id := range sortedMapKeys(mergedIntegrityHeat) {
		if mergedIntegrityHeat[id] > 0 {
			integrityImpactedNodes = append(integrityImpactedNodes, id)
		}
	}

	domainSet := make(map[string]struct{})
	for _, id := range impactedNodes {
		domainSet[DomainFromEntityRef(id)] = struct{}{}
	}
	impactedDomains := sortedMapKeys(domainSet)

	integrityDomainSet := make(map[string]struct{})
	for _, id := range integrityImpactedNodes {
		integrityDomainSet[DomainFromEntityRef(id)] = struct{}{}
	}
	integrityImpactedDomains := sortedMapKeys(integrityDomainSet)

	stopped := sortedMapKeys(propagationStoppedAt)

	spofs := DetectSpofs(schema)
	heatOut := make(map[string]float64, len(mergedHeat))
	for k, v := range mergedHeat {
		heatOut[k] = v
	}

	integrityOut := make(map[string]float64, len(mergedIntegrityHeat))
	for k, v := range mergedIntegrityHeat {
		integrityOut[k] = v
	}

	return model.SimulationResult{
		Heat:                     heatOut,
		IntegrityHeat:            integrityOut,
		ImpactedNodes:            impactedNodes,
		IntegrityImpactedNodes:   integrityImpactedNodes,
		EntryPointSlas:           entryPointSlas,
		OverallSla:               overallSla,
		OverallIntegrity:         computeOverallIntegrity(mergedIntegrityHeat),
		Spofs:                    spofs,
		ImpactedDomains:          impactedDomains,
		IntegrityImpactedDomains: integrityImpactedDomains,
		Advice: buildAdvice(
			schema,
			spofs,
			mergedHeat,
			mergedIntegrityHeat,
			stopped,
			faultNodeIDs,
		),
		PropagationStoppedAt: stopped,
		Engine:               "go",
	}
}
