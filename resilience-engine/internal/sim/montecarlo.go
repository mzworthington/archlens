package sim

import (
	"math"
	"math/rand"
	"sort"

	"blueprint/resilience-engine/internal/model"
)

func percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := append([]float64(nil), values...)
	sort.Float64s(sorted)
	idx := int(math.Round(p * float64(len(sorted)-1)))
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return math.Round(sorted[idx]*10) / 10
}

func jitterSeverity(base float64, jitter float64, rng *rand.Rand) float64 {
	if jitter <= 0 {
		return base
	}
	delta := (rng.Float64()*2 - 1) * jitter
	return math.Min(1, math.Max(0, base+delta))
}

// RunMonteCarlo runs repeated simulations with severity jitter and aggregates SLA stats.
func RunMonteCarlo(
	schema model.SystemSchema,
	spec model.ChaosSpec,
	config model.MonteCarloConfig,
) model.MonteCarloStats {
	iterations := config.Iterations
	if iterations <= 0 {
		iterations = 1000
	}
	jitter := config.SeverityJitter
	if jitter <= 0 {
		jitter = 0.12
	}

	seed := config.Seed
	if seed == 0 {
		seed = 42
	}
	rng := rand.New(rand.NewSource(seed))

	overallSamples := make([]float64, 0, iterations)
	entrySamples := make(map[string][]float64)
	entryPoints := resolveEntryPoints(schema, spec.EntryPoints)

	for i := 0; i < iterations; i++ {
		jitteredSpec := spec
		jitteredSpec.Faults = make([]model.NodeFaultConfig, len(spec.Faults))
		for idx, fault := range spec.Faults {
			jittered := fault
			severity := resolveFaultSeverity(fault)
			jitteredValue := jitterSeverity(severity, jitter, rng)
			jittered.Severity = &jitteredValue
			jitteredSpec.Faults[idx] = jittered
		}

		result := RunSimulation(schema, jitteredSpec)
		overallSamples = append(overallSamples, result.OverallSla)
		for _, entry := range entryPoints {
			entrySamples[entry] = append(entrySamples[entry], result.EntryPointSlas[entry])
		}
	}

	mean := 0.0
	for _, v := range overallSamples {
		mean += v
	}
	mean = math.Round((mean/float64(len(overallSamples)))*10) / 10

	entryP95 := make(map[string]float64, len(entrySamples))
	for entry, samples := range entrySamples {
		entryP95[entry] = percentile(samples, 0.95)
	}

	return model.MonteCarloStats{
		Iterations:        iterations,
		OverallSlaMean:    mean,
		OverallSlaP5:      percentile(overallSamples, 0.05),
		OverallSlaP95:     percentile(overallSamples, 0.95),
		EntryPointSlasP95: entryP95,
	}
}
