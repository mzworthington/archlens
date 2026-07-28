package model

// ResilienceSafeguardsForNode reads safeguards from top-level node.resilience.
func ResilienceSafeguardsForNode(node SystemNode) NodeSafeguards {
	if node.Resilience == nil {
		return NodeSafeguards{}
	}
	return resilienceToSafeguards(node.Resilience)
}

func resilienceToSafeguards(r *NodeResilience) NodeSafeguards {
	return NodeSafeguards{
		CircuitBreaker: r.CircuitBreaker,
		Bulkhead:       r.Bulkhead,
		Retry:          r.Retry,
		LocalCache:     r.LocalCache,
	}
}

func boolPtr(value bool) *bool {
	return &value
}
