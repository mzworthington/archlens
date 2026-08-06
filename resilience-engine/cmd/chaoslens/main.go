// Command chaoslens runs a ChaosLens simulation request from stdin and writes
// the SimulationResult JSON to stdout. Optional flags override Monte Carlo
// settings and enforce an SLA gate for CI.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"

	"blueprint/resilience-engine/api"
	"blueprint/resilience-engine/internal/model"
)

const (
	exitOK         = 0
	exitGateFailed = 1
	exitUsage      = 2
)

func main() {
	os.Exit(Execute(os.Args[1:], os.Stdin, os.Stdout, os.Stderr))
}

// Execute runs the CLI against the provided args and IO streams.
func Execute(args []string, stdin io.Reader, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("chaoslens", flag.ContinueOnError)
	fs.SetOutput(stderr)

	monteCarlo := fs.Int("monte-carlo", 0, "override Monte Carlo iterations (enables Monte Carlo when > 0)")
	seed := fs.Int64("seed", 0, "override Monte Carlo seed (used when Monte Carlo is enabled)")
	severityJitter := fs.Float64("severity-jitter", -1, "override Monte Carlo severity jitter (0-1); negative keeps request value")
	minSLA := fs.Float64("min-sla", -1, "fail with exit 1 when reported SLA is below this percent; negative disables the gate")

	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	if fs.NArg() != 0 {
		fmt.Fprintf(stderr, "unexpected arguments: %v\n", fs.Args())
		fmt.Fprintln(stderr, "usage: chaoslens [flags] < request.json")
		return exitUsage
	}

	input, err := io.ReadAll(stdin)
	if err != nil {
		fmt.Fprintf(stderr, "read stdin: %v\n", err)
		return exitUsage
	}
	if len(bytes.TrimSpace(input)) == 0 {
		fmt.Fprintln(stderr, "expected simulation request JSON on stdin")
		fmt.Fprintln(stderr, "usage: chaoslens [flags] < request.json")
		return exitUsage
	}

	var req model.SimulationRequest
	if err := json.Unmarshal(input, &req); err != nil {
		fmt.Fprintf(stderr, "invalid request json: %v\n", err)
		return exitUsage
	}

	applyMonteCarloFlags(&req, *monteCarlo, *seed, *severityJitter)

	out, err := api.RunRequest(req)
	if err != nil {
		fmt.Fprintf(stderr, "simulation failed: %v\n", err)
		return exitUsage
	}

	if _, err := stdout.Write(out); err != nil {
		fmt.Fprintf(stderr, "write stdout: %v\n", err)
		return exitUsage
	}
	if len(out) == 0 || out[len(out)-1] != '\n' {
		fmt.Fprintln(stdout)
	}

	if *minSLA < 0 {
		return exitOK
	}

	var result model.SimulationResult
	if err := json.Unmarshal(out, &result); err != nil {
		fmt.Fprintf(stderr, "parse simulation result: %v\n", err)
		return exitUsage
	}

	reported := reportedSLA(result)
	if reported < *minSLA {
		fmt.Fprintf(
			stderr,
			"SLA gate failed: reported SLA %.2f%% is below -min-sla=%.2f\n",
			reported,
			*minSLA,
		)
		return exitGateFailed
	}
	return exitOK
}

func applyMonteCarloFlags(req *model.SimulationRequest, iterations int, seed int64, severityJitter float64) {
	if iterations <= 0 && req.MonteCarlo == nil {
		return
	}
	if req.MonteCarlo == nil {
		req.MonteCarlo = &model.MonteCarloConfig{}
	}
	if iterations > 0 {
		req.MonteCarlo.Iterations = iterations
	}
	if seed != 0 {
		req.MonteCarlo.Seed = seed
	}
	if severityJitter >= 0 {
		req.MonteCarlo.SeverityJitter = severityJitter
	}
	if req.MonteCarlo.Iterations <= 0 {
		req.MonteCarlo.Iterations = 1000
	}
}

func reportedSLA(result model.SimulationResult) float64 {
	if result.MonteCarlo != nil {
		return result.MonteCarlo.OverallSlaP5
	}
	return result.OverallSla
}
