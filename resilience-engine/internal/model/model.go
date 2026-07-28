package model

// SystemSchema is the subset of Blueprint schema required for simulation.
type SystemSchema struct {
	Nodes        []SystemNode       `json:"nodes"`
	Dependencies []SystemDependency `json:"dependencies"`
}

type SystemNode struct {
	EntityRef       string                 `json:"entityRef"`
	Type            string                 `json:"type"`
	Name            string                 `json:"name,omitempty"`
	ParentEntityRef string                 `json:"parentEntityRef,omitempty"`
	Resilience      *NodeResilience        `json:"resilience,omitempty"`
	Properties      map[string]interface{} `json:"properties,omitempty"`
}

type NodeResilience struct {
	CircuitBreaker *bool `json:"circuitBreaker,omitempty"`
	Bulkhead       *bool `json:"bulkhead,omitempty"`
	Retry          *bool `json:"retry,omitempty"`
	LocalCache     *bool `json:"localCache,omitempty"`
}

type SystemDependency struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type,omitempty"`
}

type NodeSafeguards struct {
	CircuitBreaker *bool `json:"circuitBreaker,omitempty"`
	Bulkhead       *bool `json:"bulkhead,omitempty"`
	Retry          *bool `json:"retry,omitempty"`
	LocalCache     *bool `json:"localCache,omitempty"`
}

type NodeFaultConfig struct {
	NodeID     string          `json:"nodeId"`
	FaultType  string          `json:"faultType"`
	Severity   *float64        `json:"severity,omitempty"`
	Safeguards *NodeSafeguards `json:"safeguards,omitempty"`
}

type ChaosSpec struct {
	Faults      []NodeFaultConfig         `json:"faults"`
	Safeguards  map[string]NodeSafeguards `json:"safeguards,omitempty"`
	EntryPoints []string                  `json:"entryPoints,omitempty"`
}

type MonteCarloConfig struct {
	Iterations     int     `json:"iterations"`
	Seed           int64   `json:"seed,omitempty"`
	SeverityJitter float64 `json:"severityJitter,omitempty"`
}

type SimulationRequest struct {
	Schema     SystemSchema      `json:"schema"`
	Spec       ChaosSpec         `json:"spec"`
	MonteCarlo *MonteCarloConfig `json:"monteCarlo,omitempty"`
}

type MonteCarloStats struct {
	Iterations        int                `json:"iterations"`
	OverallSlaMean    float64            `json:"overallSlaMean"`
	OverallSlaP5      float64            `json:"overallSlaP5"`
	OverallSlaP95     float64            `json:"overallSlaP95"`
	EntryPointSlasP95 map[string]float64 `json:"entryPointSlasP95,omitempty"`
}

type SimulationResult struct {
	Heat                     map[string]float64 `json:"heat"`
	IntegrityHeat            map[string]float64 `json:"integrityHeat,omitempty"`
	ImpactedNodes            []string           `json:"impactedNodes"`
	IntegrityImpactedNodes   []string           `json:"integrityImpactedNodes,omitempty"`
	EntryPointSlas           map[string]float64 `json:"entryPointSlas"`
	OverallSla               float64            `json:"overallSla"`
	OverallIntegrity         float64            `json:"overallIntegrity,omitempty"`
	Spofs                    []string           `json:"spofs"`
	ImpactedDomains          []string           `json:"impactedDomains"`
	IntegrityImpactedDomains []string           `json:"integrityImpactedDomains,omitempty"`
	Advice                   []string           `json:"advice"`
	PropagationStoppedAt     []string           `json:"propagationStoppedAt"`
	MonteCarlo               *MonteCarloStats   `json:"monteCarlo,omitempty"`
	Engine                   string             `json:"engine"`
}
