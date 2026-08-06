package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"blueprint/resilience-engine/internal/model"
)

func TestExecuteValidRequestWritesResult(t *testing.T) {
	input := readTestdata(t, "diamond-cache-outage.json")
	var stdout, stderr bytes.Buffer

	code := Execute(nil, bytes.NewReader(input), &stdout, &stderr)
	if code != exitOK {
		t.Fatalf("exit %d, stderr=%s", code, stderr.String())
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected empty stderr, got %q", stderr.String())
	}

	var result model.SimulationResult
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("result json: %v\n%s", err, stdout.String())
	}
	if result.OverallSla < 0 || result.OverallSla > 100 {
		t.Fatalf("overallSla out of range: %v", result.OverallSla)
	}
	if len(result.Heat) == 0 {
		t.Fatal("expected heat map in result")
	}
}

func TestExecuteMonteCarloFlagsOverrideRequest(t *testing.T) {
	input := readTestdata(t, "diamond-cache-outage.json")
	var stdout, stderr bytes.Buffer

	code := Execute(
		[]string{"-monte-carlo", "50", "-seed", "42"},
		bytes.NewReader(input),
		&stdout,
		&stderr,
	)
	if code != exitOK {
		t.Fatalf("exit %d, stderr=%s", code, stderr.String())
	}

	var result model.SimulationResult
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("result json: %v", err)
	}
	if result.MonteCarlo == nil {
		t.Fatal("expected monteCarlo stats when -monte-carlo is set")
	}
	if result.MonteCarlo.Iterations != 50 {
		t.Fatalf("iterations=%d, want 50", result.MonteCarlo.Iterations)
	}
}

func TestExecuteMinSlaFailsWhenBelowThreshold(t *testing.T) {
	input := readTestdata(t, "diamond-cache-outage.json")
	var stdout, stderr bytes.Buffer

	code := Execute(
		[]string{"-min-sla", "100"},
		bytes.NewReader(input),
		&stdout,
		&stderr,
	)
	if code != exitGateFailed {
		t.Fatalf("exit %d, want %d; stderr=%s stdout=%s", code, exitGateFailed, stderr.String(), stdout.String())
	}

	var result model.SimulationResult
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("result should still be written on gate failure: %v", err)
	}
	if !strings.Contains(stderr.String(), "min-sla") {
		t.Fatalf("stderr should mention min-sla gate, got %q", stderr.String())
	}
}

func TestExecuteMinSlaPassesWhenThresholdMet(t *testing.T) {
	input := readTestdata(t, "diamond-cache-outage.json")
	var stdout, stderr bytes.Buffer

	code := Execute(
		[]string{"-min-sla", "0"},
		bytes.NewReader(input),
		&stdout,
		&stderr,
	)
	if code != exitOK {
		t.Fatalf("exit %d, stderr=%s", code, stderr.String())
	}
}

func TestExecuteInvalidJSONExitsUsage(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := Execute(nil, strings.NewReader("{not-json"), &stdout, &stderr)
	if code != exitUsage {
		t.Fatalf("exit %d, want %d", code, exitUsage)
	}
	if stderr.Len() == 0 {
		t.Fatal("expected stderr error message")
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected empty stdout on input error, got %q", stdout.String())
	}
}

func TestExecuteEmptyStdinExitsUsage(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := Execute(nil, strings.NewReader(""), &stdout, &stderr)
	if code != exitUsage {
		t.Fatalf("exit %d, want %d; stderr=%s", code, exitUsage, stderr.String())
	}
}

func readTestdata(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("testdata", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return data
}
