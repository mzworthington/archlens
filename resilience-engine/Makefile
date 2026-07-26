.PHONY: test build-wasm build-cli build copy-wasm ensure-wasm all fmt fmt-check vet check

GOROOT_WASM := $(shell go env GOROOT)/lib/wasm/wasm_exec.js
DESIGNER_PUBLIC := ../app/packages/designer/public/resilience-engine

test:
	go test ./...

fmt-check:
	@test -z "$$(gofmt -l .)" || (echo "Go files need formatting. Run: make fmt" && gofmt -l . && exit 1)

fmt:
	gofmt -w .

vet:
	go vet ./...

check: fmt-check vet

build-wasm:
	GOOS=js GOARCH=wasm go build -o dist/chaoslens.wasm ./wasm

build-cli:
	go build -o dist/chaoslens ./cmd/chaoslens

copy-wasm: build-wasm
	mkdir -p $(DESIGNER_PUBLIC)
	cp dist/chaoslens.wasm $(DESIGNER_PUBLIC)/chaoslens.wasm
	cp "$(GOROOT_WASM)" $(DESIGNER_PUBLIC)/wasm_exec.js

ensure-wasm:
	@test -f $(DESIGNER_PUBLIC)/chaoslens.wasm && test -f $(DESIGNER_PUBLIC)/wasm_exec.js || $(MAKE) copy-wasm

build: build-cli copy-wasm

all: test build
