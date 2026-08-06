package graph

import "blueprint/resilience-engine/internal/model"

func isGroup(schema model.SystemSchema, ref string) bool {
	for _, node := range schema.Nodes {
		if node.EntityRef == ref {
			return node.Type == "group"
		}
	}
	return false
}

func childrenOfGroup(parentID string, schema model.SystemSchema) []string {
	children := make([]string, 0)
	for _, node := range schema.Nodes {
		if node.ParentEntityRef == parentID {
			children = append(children, node.EntityRef)
		}
	}
	return children
}

func expandEndpoints(ref string, schema model.SystemSchema) []string {
	if !isGroup(schema, ref) {
		return []string{ref}
	}
	children := childrenOfGroup(ref, schema)
	if len(children) == 0 {
		return []string{ref}
	}
	return children
}

// BuildDependents maps dependency target -> callers (upstream), expanding group boundaries.
// Skips provisions (and other non-runtime) edges so IaC declarations are not blast-radius callers.
func BuildDependents(schema model.SystemSchema) map[string][]string {
	nodeIDs := make(map[string]struct{}, len(schema.Nodes))
	for _, node := range schema.Nodes {
		nodeIDs[node.EntityRef] = struct{}{}
	}

	dependents := make(map[string][]string)
	for _, dep := range schema.Dependencies {
		if !isAvailabilityPropagatingDependency(dep.Type) {
			continue
		}
		sources := expandEndpoints(dep.From, schema)
		targets := expandEndpoints(dep.To, schema)
		for _, target := range targets {
			if _, ok := nodeIDs[target]; !ok {
				continue
			}
			for _, source := range sources {
				if _, ok := nodeIDs[source]; !ok {
					continue
				}
				dependents[target] = append(dependents[target], source)
			}
		}
	}
	return dependents
}

func ResolveFaultTargets(nodeID string, schema model.SystemSchema) []string {
	if !isGroup(schema, nodeID) {
		return []string{nodeID}
	}
	children := childrenOfGroup(nodeID, schema)
	if len(children) == 0 {
		return []string{nodeID}
	}
	return children
}
