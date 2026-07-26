package api

import (
	"encoding/json"
	"fmt"

	"blueprint/resilience-engine/internal/model"
	"blueprint/resilience-engine/internal/sim"
)

// Run executes a simulation request and returns JSON bytes.
func Run(input []byte) ([]byte, error) {
	var req model.SimulationRequest
	if err := json.Unmarshal(input, &req); err != nil {
		return nil, fmt.Errorf("invalid request json: %w", err)
	}
	return RunRequest(req)
}

func RunRequest(req model.SimulationRequest) ([]byte, error) {
	result := sim.RunSimulation(req.Schema, req.Spec)
	if req.MonteCarlo != nil {
		stats := sim.RunMonteCarlo(req.Schema, req.Spec, *req.MonteCarlo)
		result.MonteCarlo = &stats
	}
	out, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("marshal result: %w", err)
	}
	return out, nil
}
