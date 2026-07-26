//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"

	"blueprint/resilience-engine/api"
)

func main() {
	js.Global().Set("chaosLensSimulate", js.FuncOf(simulate))
	<-make(chan struct{})
}

func simulate(_ js.Value, args []js.Value) any {
	if len(args) < 1 {
		return mustJSON(map[string]string{"error": "expected JSON input string"})
	}

	out, err := api.Run([]byte(args[0].String()))
	if err != nil {
		return mustJSON(map[string]string{"error": err.Error()})
	}
	return string(out)
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{"error":"marshal failed"}`
	}
	return string(b)
}
