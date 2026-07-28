# Changelog

## 2026-07-28

### 🚀 Features

- Highlight safeguards on canvas and allow persistance of safeguards:
- Integrate integrity metrics into resilience simulation and UI components
- Add support for interactive mode via BLUEPRINT_INTERACTIVE environment variable

### 🧰 Maintenance & Dependencies

- Improve sync pipeline, incluing release on change
- Update CI workflows to use actions/setup-go@v6 and improve release CLI with target SHA

## 2026-07-27

### 🚀 Features

- Workspace loading functionality for tracelens
- Add blast ripple animation and heat hop tracking for resilience simulation
- When using chaoslens we show all nodes even when selected
- Enhance ForensicsPage with source code dialog and provenance tracking
- Syntax highlighting on code viewer
- Add Monte Carlo simulation configuration to resilience state and UI components

### ⚙️ Refactoring & Performance

- Remove unused redirect logic

### 🧰 Maintenance & Dependencies

- Update changelog and remove unused tree-sitter dependencies from package.json and pnpm-lock.yaml
- Refactor CI workflow to regenerate derived outputs
- Fix changelog formatting
- Improve chaoslens guide gif

### 📚 Documentation

- Call to action on subproduct guides

## 2026-07-26

### 🚀 Features

- ChaosLens MVP! ChaosLens simulates what-if failures on the architecture you already have open in Blueprint canvas — without a separate diagram or route. ChaosLens runs on the normal workspace canvas against the active
- Enhance ChaosLens integration with Go/WASM support and update documentation

### 🐛 Bug Fixes

- Refresh checked-in chaoslens.wasm to match current Go sources

### ⚙️ Refactoring & Performance

- Remove obsolete chaoslens.wasm and wasm_exec.js files

### 🧰 Maintenance & Dependencies

- Update changelog and enhance documentation
- Align pulimi to rest of languages
- Update dependencies and enhance package configurations

## 2026-07-25

### 🚀 Features

- Externals split into up and down including layout
- Add zoom-in button to BlueprintNode and update Canvas layout with workspace status badges
- Pulumi with python

### ⚙️ Refactoring & Performance

- Simplify breadcrumb logic
- Consolidate CLI release detection and publishing logic, removing schema release handling
- Update changelog generation process and remove deprecated script
- Streamline changelog generation and update CLI script handling

### 🧰 Maintenance & Dependencies

- Release logic split across web, cli, schema
- Merge origin/main and regenerate changelog

## 2026-07-24

### 🚀 Features

- Groups mermaid support
- Enhance IaC context handling by nesting modules under product hubs and refining group structures
- Enhance search functionality in workspace by integrating toolbar menu portal and improving node selection experience
- Add support for re-exports in TreeSitter and TsMorph parsers, enhancing module import handling
- Enhance infraSchemaMap with human-readable tokenization and generic label checks for improved display names
- Update useUrlSync to maintain diagram URL for external node selections, enhancing navigation consistency

### ⚙️ Refactoring & Performance

- Update IaC analysis to streamline module discovery and enhance workspace package indexing

## 2026-07-23

### 🚀 Features

- Add resolveEntityHome function and integrate GoToEntityButton for external nodes in workspace
- Add workspace display settings functionality and related UI components
- Implement child diagram externals functionality and enhance workspace navigation
- Order of node buttons
- Improved placement of nodes

### 🧰 Maintenance & Dependencies

- Stabilise e2e tests

## 2026-07-21

### 🚀 Features

- Enhance forensics data with author commit tracking and guided refactor workflow updates
- Add build ID and versioning metadata for deployment, introduce update banner for new builds
- Add workbox-window dependency for improved PWA functionality and update documentation for service worker behavior
- Enhance app version label formatting to support short and full build IDs
- View source code when git analysis has run
- Enhance C# and .NET analysis capabilities with project reference handling and namespace resolution
- Improve designer canvas performance with loading overlays and off-main-thread layout processing
- Implement diagram loading overlays and off-thread layout processing for improved performance
- Additional sandbox files

### ⚙️ Refactoring & Performance

- Remove SystemMapDialog and related state management from the workspace, update README for terminology consistency
- Update e2e tests to use new sandbox loading helper and remove deprecated journeys test

### 🧰 Maintenance & Dependencies

- Update docs to include entityref descriptions

## 2026-07-20

### 🚀 Features

- Pulimi support
- Implement deduplication of dependencies in graph management and enhance related tests for consistency
- Enhance type definitions with optional churnByWeek property, and improve metrics in blueprints for better analysis
- Add Java and Go parsing capabilities to TreeSitterParser, including import, package, and method call detection; enhance test framework detection for multiple languages
- Add unit test features generation to CI workflow and update related documentation
- UX refresh, additional menus and helpers
- Update Playwright configuration for parallel testing and enhance screenshot assets
- Enhance workspace management with cataloging and lazy-loading of systems
- Add tests for flowchart label processing and enhance Mermaid extraction from markdown
- Add Code of Conduct to promote a respectful and constructive community
- Mobile UX improvements
- Enhance forensics insights with trend dashboard and schema version assessment
- Implement ToolbarMenuPortal for improved dropdown handling in workspace toolbar

### 🐛 Bug Fixes

- Include bun in build step

### ⚙️ Refactoring & Performance

- Streamline address slugification and enhance Pulumi extraction from markdown

### 🧰 Maintenance & Dependencies

- Pipeline performance tweaks
- Pipeline performance improvements
- Update sandbox files
- Update features-unit.md
- Update CI workflow to upload and download generated features documentation, remove outdated check script
- Improve CI workflow for documentation handling and remove deprecated scripts
- _(deps)_ Bump setup-node to v7 and download-artifact to v8 (#21)
- Remove dependency on quality and unit-tests from e2e job in CI workflow

## 2026-07-19

### 🚀 Features

- Add mapDomainDepsToRFEdges function to drop duplicate edges and update related usages across layout utilities and diagram state management
- Implement deduplication of dependencies in graph management and enhance related tests for consistency

## 2026-07-18

### 🚀 Features

- Enhance dependency visualization by adding animated edges and updating focus logic to include upstream and downstream neighbors
- Implement force relayout option in layout pass and enhance schema merging to preserve forensics and properties during overwrites
- Upgrade schema versioning to v3, refactor YAML structure to include metaData, and enhance serialization for improved compatibility
- Introduce liteCanvas mode to enhance performance by simplifying node visuals, capping edge animations, and hiding non-essential UI elements during large diagram interactions
- Enhance CLI and core functionality with Terraform support, add context-level person node, and improve documentation for unit test features
- Implement mobile navigation for documentation with separate scrollers for product guide and reference sections, and refactor DocsShell for improved readability

### ⚙️ Refactoring & Performance

- Remove unnecessary 'onlyRenderVisibleElements' prop from Canvas component and update related tests for consistency

## 2026-07-17

### 🚀 Features

- Implement Mermaid import functionality, enhance diagram state management, and update UI components for improved user experience
- External dependencies management in diagram state, and enhance UI components for external dependencies display
- External dependencies handling
- Enhance external dependencies management by rolling up component-level dependencies into inter-container edges, update UI components for improved display, and refine schema handling for container diagrams
- Add showSelectedDependenciesOnly state management and UI controls for focused dependency display in the canvas
- Implement forensics metrics counting and enhance UI components to display dependency counts in the workspace
- Add startup chooser functionality to manage workspace initialization and enhance user experience with Mermaid imports

### 🐛 Bug Fixes

- Improve workspace folder handling by prioritizing startup chooser, enhance test timeouts, and update documentation for clarity

### ⚙️ Refactoring & Performance

- Streamline database seeding process in e2e tests, improve workspace folder opening logic, and update toolbar interaction for better performance

### 🧰 Maintenance & Dependencies

- Update pre-commit checks to include full-repo format validation, modify linting commands to deny warnings, and enhance documentation for commit hooks

### 📚 Documentation

- Update docs with new features

## 2026-07-16

### 🚀 Features

- Implement undo/redo functionality with keyboard shortcuts and UI controls
- Enable drag-and-drop node placement on canvas and update default right panel state to expanded
- Implement cycle path focus feature to visualize circular dependencies in the canvas
- New logo and assets
- Add blueprint context, designer assets, and Lighthouse configuration
- Add mobile sub-navigation switchers to DesignSystemShowcase and DocsShell components
- Add global loading state with overlay and disable action buttons during asynchronous operations
- Implement resolveShortEntityRef function and enhance entity reference handling in tests and state management
- Enhance C# parsing and classification, add local-first persistence feature, and update blueprint context with new layers and components
- Integrate PWA support with service worker, enhance app context for network status, and update designer metadata for offline capabilities

### 🐛 Bug Fixes

- Correct e2e panel toggle assertions and update corresponding documentation screenshots
- Adjust asset references for dark mode support in PWA configuration

### ⚙️ Refactoring & Performance

- Show orb ontop of node
- Extract getNextLevel function for breadcrumb navigation and optimize segment creation logic

### 🧰 Maintenance & Dependencies

- Add error logging to pending changes diff computation in diagram state
- Update blueprint layout coordinates, add customer entity, and set static playwright viewport
- Fix builds around actionControls
- Update CLI documentation and assets, replace PNG with GIF for interactive prompts, and add VHS demo instructions
- Update JSON schema generation process, add pre-commit checks for schema validation, and enhance documentation for IDE integration
- Update schema version to v2, refactor YAML serialization to support one-element sequences, and enhance documentation for IDE integration
- Regen sandbox files

### 📚 Documentation

- Expand documentation with roadmap, canvas features, and a new design system guide
- Update project documentation screenshots to reflect current UI state

### 🧪 Testing

- Add delays to e2e test screenshots to ensure proper render and update documentation images

### 🎨 Styling

- Update CodeViewer UI with new branding colors and improved tab styling

## 2026-07-15

### 🚀 Features

- Migrate blueprint system to modular component architecture and update CLI analysis domain logic
- Add schema topology comparison to resolve stale IndexedDB drafts on workspace load and quarantine the unmaintained Rust CLI.
- Implement comprehensive codebase forensics engine with metrics, aggregation, and git-based history analysis
- Enhance BlueprintNode and PropertyPanel components with forensics data integration and UI updates for better visibility of codebase metrics
- Refactor component blueprints and introduce cli writer and core component definitions
- Docs site from md
- Enhance Design System Showcase and Docs components with new identity guidelines, improved layout, and updated styling
- Introduce eshop domain blueprints and update existing component definitions
- Integrate Tree-sitter for language analysis and standardize blueprint component configurations
- Add Forensics page and update navigation links in AppHeader and related components
- Implement layout engine selection and integration for diagram positioning in designer application
- Add mobile navigation and breadcrumbs components for improved user experience in workspace
- Replace mobile edge rails with touch-friendly navigation chips and remove unused design system link
- Improve mobile layout responsiveness and safe area handling using viewport-fit and dynamic viewport units
- Refactor Mermaid integration and improve component loading with lazy loading and suspense for better performance
- Add risk heatmap and coupling focus features to enhance node visualization and workspace display controls

### 🐛 Bug Fixes

- Improve property panel layout and text truncation to prevent overflow

### ⚙️ Refactoring & Performance

- Migrate core models and schema logic to new @blueprint/core package and implement CLI writer abstractions
- Move core logic to workspace-agnostic packages and modernize diagram state management and property panel components
- Transition CLI from Rust to TypeScript and reorganize blueprint component structures
- Implement container grouping logic and add gitignore support to model extractor
- Remove legacy handover artifacts and add AGENTS.md documentation
- Update setNotification signature to use ToastNotification type in openWorkspace state
- Change cliIgnores and cliSystems to mutable variables and add blueprint dependency to context.yaml
- Replace VitePress documentation site with integrated Markdown viewer inside designer application
- Standardize component blueprints and update CLI analysis and writing logic
- Update blueprint component file paths and dependency mappings across plugins and packages

### 🧰 Maintenance & Dependencies

- Update Playwright configuration and enhance e2e tests for blueprint navigation; replace test workspace references and add new screenshots
- Fix md linting
- Update documentation for CLI installation and usage, remove outdated links, and simplify setup instructions
- Update dependencies, refine lint-staged configuration, and improve pre-commit hook logic

### 🧪 Testing

- Add missing properties object to hotspot heatmap test data

## 2026-07-13

### ⚙️ Refactoring & Performance

- Consolidate blueprint structure by removing deprecated component files and updating schema definitions
- Remove unused context_system_id variable from analyzer orchestrator
- Simplify sub-diagram detection, remove UI comments, and update blueprint context schema

### 🧪 Testing

- Comment out obsolete e2e test steps and update documentation assets following workspace decommissioning

## 2026-07-12

### 🚀 Features

- Covert CLI to rust
- Add C# support to analyzer, update CLI defaults, and initialize new designer and eshop blueprint schemas
- Implement TypeScript CLI analysis package and add extensive component definition blueprints.
- Add persistence and diffing support for node positions and C4 metadata in schema workspaces

### ⚙️ Refactoring & Performance

- Reorganize UI components into a structured feature-based folder architecture
- Encapsulate URL synchronization logic into a custom useUrlSync hook and clean up workspace page components
- Migrate entity ref mapping from plain objects to Map for improved lookup and type safety
- Simplify 404 redirect logic by removing subdirectory path handling
- Implement Default traits, clean up orchestrator and path logic, and update pre-commit hooks
- Remove legacy blueprint YAML configuration files and update CLI analyzer logic
- Implement strategy pattern for language-specific codebase analysis using new analyzer classesg

### 🧰 Maintenance & Dependencies

- _(deps)_ Bump softprops/action-gh-release from 2 to 3
- _(deps)_ Bump actions/checkout from 4 to 7
- _(deps)_ Bump actions/upload-artifact from 5 to 7
- _(deps)_ Bump actions/cache from 4 to 6
- _(deps)_ Bump github/codeql-action from 3 to 4
- Add coverage report paths to vitest action and set release job dependency on build-and-test
- Split pipeline to support independent releases for Rust and TypeScript CLI binaries and update project documentation

## 2026-07-11

### 🚀 Features

- Generate and integrate comprehensive blueprint component definitions

### ⚙️ Refactoring & Performance

- Migrate to pnpm monorepo architecture with core, app, and cli packages
- Migrate and consolidate Backstage component blueprints and asset references
- Remove deprecated blueprints and implement new application state and entity reference infrastructure
- Consolidate CLI release logic into the main CI pipeline workflow
- Enable Properties Panel to manage both node-specific and workspace-level configuration properties

### 🧰 Maintenance & Dependencies

- Add Bun setup step to GitHub Actions workflow
- Update CI reporter to github-actions and add CodeQL badge to README
- Implement GitHub Pages deployment and isolate CLI release process into a dedicated job

### 📚 Documentation

- Overhaul project documentation with dedicated setup, architecture, and journeys guides while updating the README to prioritize CLI usage.
- Update architecture documentation to include CLI AST analyzer details and fix typo in README
- Add README files for all packages, configure root vitest workspace, and update documentation and package metadata

## 2026-07-10

### 🚀 Features

- Add dependency descriptions to property panel and include new blueprint system templates
- Relocate validation status and actions to top-right panel in Canvas adapter
- Implement URL-based workspace routing and add C4 level management to system schemas
- Integrate Playwright for E2E testing and add UI tour screenshots to README
- Implement workspace manifest management and remove legacy hardcoded blueprint files
- Implement codebase AST analysis domain logic with ports, adapters, and modular structure
- Integrate Tree-sitter parser adapter for multi-language AST analysis and update CLI for dynamic parsing
- Enhance breadcrumbs to display hierarchy paths and nested node previews
- Add C# parser support and implement dynamic blueprint directory and naming logic
- Implement eShop service blueprints and enhance Tree-sitter parser to capture field, property, and parameter types.
- Add hierarchical path resolution and sibling system dropdown navigation to Breadcrumbs
- Implement adapter layer for diagram state management and workspace persistence
- Implement DesignSystemShowcase component and update project assets with new branding icons and grid layout
- Migrate to wouter routing and split App into dedicated Workspace and DesignSystem pages
- Add brand header to canvas, update code viewer branding, and filter breadcrumbs by workspace family
- Code coverage repots
- Implement CLI interactive mode, cross-platform binary release pipeline, and additional blueprint definitions
- Implement comprehensive blueprint component definitions and expand CLI analysis test coverage
- Implement searchable node navigation with Header integration and hotkey support

### 🐛 Bug Fixes

- Resolve loaded systems from current store state instead of default constant
- Ensure initialManifest is explicitly undefined when getClosestManifest fails

### ⚙️ Refactoring & Performance

- Enforce consistent code style and update husky to run tests on pre-commit
- Update import extensions and make namespaces optional in analysis types
- Update breadcrumb navigation logic and flatten workspace hierarchy structure
- Consolidate canvas UI controls into a new ActionControls component and add relevant unit tests.
- Rename analyze scripts and binaries to blueprint while updating CLI path and documentation
- Remove redundant comments in Searchbar and add ReactFlow mocks to test suite

### 🧰 Maintenance & Dependencies

- Enforce full codebase linting in pre-commit hook and resolve unused variable warnings in tests
- Update coverage action to v2 and enable json report generation
- Add caching for Playwright browsers to improve build performance
- Update release workflow to reflect CLI source and binary renaming

### 📚 Documentation

- Update setup instructions to include Mise and clarify Husky git hook validation requirements
- Update architecture diagram, add path handling description, and document modular zustand store slices
- Update screenshots

### 🧪 Testing

- Update e2e visual regression test project naming and refresh associated screenshots

## 2026-07-09

### 🚀 Features

- Add collapsible left and right panels with toggle controls and update canvas zoom limits
- Add breadcrumb navigation, C4 model serialization, and enhanced component testing suite
- Set default sidebar panel states to collapsed
- Implement dynamic edge routing by calculating closest node handles and adding cardinal connection points to BlueprintNode

### 🧰 Maintenance & Dependencies

- Add dependabot configuration, update CI schedule, and refine README documentation and architectural diagrams
- Add badge to readme
- Upgrade dependencies, fix Zod type inference, and add workspace release exclusions
- Revert base path to root in vite config
- Update actions/deploy-pages to v5

## 2026-07-08

### 🚀 Features

- Initialize project scaffolding with Vite, domain logic, and core UI components
- Build local codebase AST analyzer script utilizing ts-morph and dagre layout
- Add isTest flag to nodes and visualize test files with Mermaid integration
- Add interactive pan and zoom lightbox for Mermaid diagram previews and update project title

### 🐛 Bug Fixes

- Align analyze script output structure with schema and support new node types
- Improve frontend validation error diagnostics and display error notifications

### ⚙️ Refactoring & Performance

- Condense dependency filter logic in analyze.ts for improved readability

### 🧰 Maintenance & Dependencies

- Integrate Prettier, strict linting, Husky pre-commit hooks, and GitHub Actions CI workflow
- Fix node deprecation warning and cache setup in workflow
- Add GitHub Pages deployment job and configure Vite base path
