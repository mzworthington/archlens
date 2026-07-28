package graph

import "blueprint/resilience-engine/internal/model"

const publishSubscribe = "publish-subscribe"

func isAsyncStreamDependency(depType string) bool {
	return depType == publishSubscribe
}

// PubSubPeersOnBroker returns all from endpoints on publish-subscribe edges targeting brokerID.
func PubSubPeersOnBroker(schema model.SystemSchema, brokerID string) []string {
	if !isAsyncStreamDependency(publishSubscribe) {
		return nil
	}

	nodeIDs := make(map[string]struct{}, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeIDs[node.EntityRef] = struct{}{}
	}

	peers := make(map[string]struct{})
	for _, dep := range schema.Dependencies {
		if dep.Type != publishSubscribe {
			continue
		}
		targets := expandEndpoints(dep.To, schema)
		for _, target := range targets {
			if target != brokerID {
				continue
			}
			for _, source := range expandEndpoints(dep.From, schema) {
				if _, ok := nodeIDs[source]; ok {
					peers[source] = struct{}{}
				}
			}
		}
	}

	out := make([]string, 0, len(peers))
	for id := range peers {
		out = append(out, id)
	}
	return out
}

// PubSubBrokersForPublisher returns brokers targeted by publish-subscribe edges from publisherID.
func PubSubBrokersForPublisher(schema model.SystemSchema, publisherID string) []string {
	nodeIDs := make(map[string]struct{}, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeIDs[node.EntityRef] = struct{}{}
	}

	brokers := make(map[string]struct{})
	for _, dep := range schema.Dependencies {
		if dep.Type != publishSubscribe {
			continue
		}
		sources := expandEndpoints(dep.From, schema)
		for _, source := range sources {
			if source != publisherID {
				continue
			}
			for _, target := range expandEndpoints(dep.To, schema) {
				if _, ok := nodeIDs[target]; ok {
					brokers[target] = struct{}{}
				}
			}
		}
	}

	out := make([]string, 0, len(brokers))
	for id := range brokers {
		out = append(out, id)
	}
	return out
}

// PubSubBrokersAttachedToNode is non-empty when nodeID is the to endpoint on a publish-subscribe edge.
func PubSubBrokersAttachedToNode(schema model.SystemSchema, nodeID string) []string {
	nodeIDs := make(map[string]struct{}, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeIDs[node.EntityRef] = struct{}{}
	}
	if _, ok := nodeIDs[nodeID]; !ok {
		return nil
	}

	brokers := make(map[string]struct{})
	for _, dep := range schema.Dependencies {
		if dep.Type != publishSubscribe {
			continue
		}
		for _, target := range expandEndpoints(dep.To, schema) {
			if target == nodeID {
				brokers[nodeID] = struct{}{}
			}
		}
	}

	out := make([]string, 0, len(brokers))
	for id := range brokers {
		out = append(out, id)
	}
	return out
}
