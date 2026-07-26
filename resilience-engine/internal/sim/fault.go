package sim

import "blueprint/resilience-engine/internal/model"

func defaultFaultSeverity(faultType string) float64 {
	switch faultType {
	case "region-outage":
		return 1
	case "error-rate":
		return 0.8
	case "packet-loss":
		return 0.6
	case "latency":
		return 0.4
	default:
		return 0.5
	}
}

func resolveFaultSeverity(fault model.NodeFaultConfig) float64 {
	base := defaultFaultSeverity(fault.FaultType)
	if fault.Severity != nil {
		base = *fault.Severity
	}
	if base < 0 {
		return 0
	}
	if base > 1 {
		return 1
	}
	return base
}
