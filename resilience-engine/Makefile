.PHONY: test build-wasm build-cli build copy-wasm all fmt fmt-check vet check check-wasm

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

check-wasm: build-wasm
	@cmp -s dist/chaoslens.wasm $(DESIGNER_PUBLIC)/chaoslens.wasm || (echo "chaoslens.wasm is out of date. Run: make copy-wasm" && exit 1)

build-wasm:
	GOOS=js GOARCH=wasm go build -o dist/chaoslens.wasm ./wasm

build-cli:
	go build -o dist/chaoslens ./cmd/chaoslens

copy-wasm: build-wasm
	mkdir -p $(DESIGNER_PUBLIC)
	cp dist/chaoslens.wasm $(DESIGNER_PUBLIC)/chaoslens.wasm
	cp "$(GOROOT_WASM)" $(DESIGNER_PUBLIC)/wasm_exec.js

build: build-cli copy-wasm

all: test build
