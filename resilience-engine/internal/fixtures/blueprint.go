// Package fixtures loads Blueprint YAML stress diagrams for engine tests.
package fixtures

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"blueprint/resilience-engine/internal/model"
)

// FindRepoRoot walks upward from start (or the working directory) until it
// finds the ArchLens repo root containing samples/chaoslens-stress.
func FindRepoRoot(start string) (string, error) {
	dir := start
	if dir == "" {
		wd, err := os.Getwd()
		if err != nil {
			return "", err
		}
		dir = wd
	}
	for {
		candidate := filepath.Join(dir, "samples", "chaoslens-stress")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("repo root with samples/chaoslens-stress not found from %q", start)
		}
		dir = parent
	}
}

// LoadBlueprintSchema parses the Blueprint YAML subset needed for simulation
// (nodes + dependencies + node.resilience). Avoids a YAML dependency so the
// engine module stays dependency-free.
func LoadBlueprintSchema(path string) (model.SystemSchema, error) {
	file, err := os.Open(path)
	if err != nil {
		return model.SystemSchema{}, err
	}
	defer file.Close()

	var schema model.SystemSchema
	section := ""
	var node *model.SystemNode
	var dep *model.SystemDependency
	inResilience := false

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		raw := scanner.Text()
		line := strings.TrimRight(raw, " \t")
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		indent := len(line) - len(strings.TrimLeft(line, " "))

		if indent == 0 {
			inResilience = false
			node = nil
			dep = nil
			switch {
			case trimmed == "nodes:":
				section = "nodes"
			case trimmed == "dependencies:":
				section = "dependencies"
			default:
				section = ""
			}
			continue
		}

		switch section {
		case "nodes":
			if strings.HasPrefix(trimmed, "- entityRef:") {
				inResilience = false
				ref := valueAfterColon(trimmed)
				schema.Nodes = append(schema.Nodes, model.SystemNode{EntityRef: ref})
				node = &schema.Nodes[len(schema.Nodes)-1]
				continue
			}
			if node == nil {
				continue
			}
			if trimmed == "resilience:" {
				inResilience = true
				node.Resilience = &model.NodeResilience{}
				continue
			}
			if inResilience {
				key, val, ok := splitKV(trimmed)
				if !ok {
					continue
				}
				flag := strings.EqualFold(val, "true")
				switch key {
				case "circuitBreaker":
					node.Resilience.CircuitBreaker = &flag
				case "bulkhead":
					node.Resilience.Bulkhead = &flag
				case "retry":
					node.Resilience.Retry = &flag
				case "localCache":
					node.Resilience.LocalCache = &flag
				}
				continue
			}
			key, val, ok := splitKV(trimmed)
			if !ok {
				continue
			}
			switch key {
			case "type":
				node.Type = val
			case "name":
				node.Name = val
			case "parentEntityRef":
				node.ParentEntityRef = val
			}
		case "dependencies":
			if strings.HasPrefix(trimmed, "- from:") {
				from := valueAfterColon(trimmed)
				schema.Dependencies = append(schema.Dependencies, model.SystemDependency{From: from})
				dep = &schema.Dependencies[len(schema.Dependencies)-1]
				continue
			}
			if dep == nil {
				continue
			}
			key, val, ok := splitKV(trimmed)
			if !ok {
				continue
			}
			switch key {
			case "to":
				dep.To = val
			case "type":
				dep.Type = val
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return model.SystemSchema{}, err
	}
	if len(schema.Nodes) == 0 {
		return model.SystemSchema{}, fmt.Errorf("no nodes parsed from %s", path)
	}
	return schema, nil
}

func valueAfterColon(line string) string {
	_, val, _ := splitKV(line)
	return val
}

func splitKV(line string) (key, val string, ok bool) {
	line = strings.TrimPrefix(line, "- ")
	parts := strings.SplitN(line, ":", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	key = strings.TrimSpace(parts[0])
	val = strings.TrimSpace(parts[1])
	if len(val) >= 2 {
		if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
			val = val[1 : len(val)-1]
		}
	}
	return key, val, key != ""
}
