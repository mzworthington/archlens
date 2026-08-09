# Unit test features

Generated from Vitest (`pnpm generate:features-unit`).

<!-- vitest-feature-reporter--start -->

## Canvas

### _redirects

#### _redirects (Cloudflare Pages SPA routing)

- ✅ serves bundled-blueprints, chaos-specs, schemas, and SEO files before the index.html fallback

### ActionControls

#### ActionControls Component

- ✅ shows pending changes button only when hasPendingChanges is true
- ✅ renders correctly when workspace is closed
- ✅ renders correctly when workspace is open
- ✅ triggers openWorkspaceDirectory on clicking Open Folder
- ✅ triggers loadSchema on clicking Open File
- ✅ triggers saveSchema on clicking Save when workspace is closed
- ✅ triggers saveActiveDiagram on clicking Save when workspace is open
- ✅ triggers initSchema on clearing canvas if confirmed
- ✅ does not trigger initSchema on clearing canvas if not confirmed
- ✅ disables buttons when isLoading is true
- ✅ disables undo button when past history is empty, enables and triggers action when filled
- ✅ disables redo button when future history is empty, enables and triggers action when filled

### adviceLensUrl

#### adviceLensUrl

- ✅ builds workspace AdviceLens URLs
- ✅ parses workspace AdviceLens URLs
- ✅ detects AdviceLens only via lens=advicelens

### App

#### App Layout and Collapsible Panels

- ✅ should have panels hidden by default and support toggling them

### AppContext

#### AppProvider port wiring

- ✅ wires browser ports synchronously before React effects
- ✅ does not replace the bundled sample workspace port after sample open

### AppHeader

#### AppHeader

- ✅ shows a burger menu on mobile and reveals navigation links
- ✅ closes the mobile menu when a link is selected
- ✅ closes the mobile menu when Escape is pressed

### applyDependencyHighlights

#### applyDependencyHighlights

- ✅ labels upstream and downstream roles when enabled
- ✅ passes nodes through when disabled

### applyDocumentHead

#### applyDocumentHead

- ✅ updates title, description, canonical, robots, and social tags
- ✅ sets noindex for workspace and replaces prior JSON-LD

### applyRefactorBoundaryAsDraft

#### applyRefactorBoundaryAsDraft

- ✅ adds a draft group and parents boundary members on the active diagram
- ✅ returns false when fewer than two members are on the canvas

### applyRefactorPlanAsDraft

#### applyRefactorPlanAsDraft

- ✅ loads the diagram and navigates to workspace on success
- ✅ rejects single-member boundaries

### blastHeatmap

#### applyBlastHeatmap

- ✅ attaches transient blast and integrity heat without mutating input nodes
- ✅ marks multiple fault targets
- ✅ marks rippling nodes when requested
- ✅ clears blast styling when disabled

### blastRipple

#### blastWaveProgress

- ✅ stays at zero before the wave reaches the hop
- ✅ eases in during the hop window and reaches one after

#### buildBlastRippleFrame

- ✅ animates upstream propagation edges when the caller wave is active

#### computeBlastRippleFrame

- ✅ reveals heat hop-by-hop over time
- ✅ flags nodes in the active wave as rippling

### BlueprintNode

#### BlueprintNode Component

- ✅ renders correctly with basic node details
- ✅ simplifies chrome when liteCanvas is on but keeps all edge handles mounted
- ✅ keeps full chrome when zoomed out unless liteCanvas is on
- ✅ shows HOT and SILO badges for concerning forensics
- ✅ shows COUPLED badge when couplingHighlight is set
- ✅ shows safeguard badges when resilience safeguards are active
- ✅ exposes hotspot heat intensity for styling when heatmap is active
- ✅ does not mark heat when intensity is zero
- ✅ shows SLA and DATA badges when availability and integrity heat are present
- ✅ truncates long entityRefs while exposing the full value in the title tooltip
- ✅ truncates long node names while exposing the full value in the title tooltip
- ✅ triggers store selectNode when clicked
- ✅ renders TEST badge when node represents a test component
- ✅ renders workspace proxy indicator when external is true without third-party classification
- ✅ renders third-party indicator when external has classification third-party
- ✅ shows Go to entity button for external nodes present elsewhere in the workspace
- ✅ hides Go to entity button when external node is not in the workspace catalog
- ✅ navigates to canonical entity when Go to entity is clicked
- ✅ shows Zoom indicator when node has a sub-diagram link in loadedSystems
- ✅ keeps the zoom button visible in lite canvas mode
- ✅ triggers navigation to node entityRef when Zoom button is clicked
- ✅ shows Externals button when child diagram has external nodes
- ✅ toggles child externals overlay on the canvas when Externals button is clicked
- ✅ shows a Code button when the node has a filepath and opens the source modal
- ✅ hides the Code button when the node can zoom into a child diagram

### BrandMark

#### BrandMark

- ✅ renders a single active lens badge

### Breadcrumbs

#### Breadcrumbs Component

- ✅ renders sample workspace label when bundled sample is open
- ✅ renders folder mode toggle when a directory workspace is open
- ✅ opens a folder workspace when Folder mode is selected from demo
- ✅ omits workspace chrome when no workspace is open
- ✅ renders next hierarchy level preview when a node with next level component schema is selected
- ✅ renders dropdown button with child components and triggers selectSystem when child is clicked
- ✅ always shows the context diagram when viewing a deep diagram without intermediate ancestors loaded
- ✅ preserves TraceLens in breadcrumb links while the lens is active
- ✅ shows a compact summary and opens the full trail in a mobile menu
- ✅ lists peer context diagrams from the workspace catalog before they are lazy-loaded
- ✅ keeps peer context switching available on stress context diagrams

### browserNetworkStatus

#### BrowserNetworkStatusAdapter

- ✅ isOnline mirrors navigator.onLine
- ✅ notifies subscribers on online/offline events and unsubscribes cleanly

### buildCouplingOverlayEdges

#### applyCouplingHighlights

- ✅ marks coupled peer nodes when enabled
- ✅ clears highlights when disabled

#### buildCouplingGhostNodes

- ✅ creates dashed ghost nodes for unmapped coupled filepaths

#### buildCouplingOverlayEdges

- ✅ returns no edges when overlay is disabled
- ✅ builds labeled coupling edges when enabled

#### buildCouplingSchemaDependencyEdges

- ✅ overlays declared dependencies between coupled peers when enabled

#### filterCouplingFocusNodes

- ✅ keeps only the selected node and coupled peers when enabled
- ✅ returns all nodes when disabled
- ✅ includes ghost nodes when only unmapped peers exist

### buildDiagramRecommendations

#### buildDiagramRecommendations

- ✅ merges resilience and refactor recommendations for an active simulation
- ✅ filters recommendations to an offender entity and boundary members

### buildEstateRecommendations

#### buildEstateRecommendations

- ✅ returns merged resilience and refactor recommendations for loaded diagrams
- ✅ filters recommendations by source and search query
- ✅ sorts estate items by descending recommendation priority

### buildForensicsPanelModel

#### buildForensicsPanelModel

- ✅ includes composite risk when blast radius is available
- ✅ derives focusable coupling count from focus or coupled files
- ✅ includes extended complexity and line churn metrics when present

### buildForensicsTrendDashboard

#### buildForensicsTrendDashboard

- ✅ builds component-level trends from direct forensics
- ✅ rolls up descendant trends for containers
- ✅ returns undefined when there is no chartable data

#### collectDescendantForensics

- ✅ collects components under a container by entityRef prefix and containerId

### buildInfo

#### formatAppVersionLabel

- ✅ formats major.minor from package version plus build id

#### parseBuildIdFromHtml

- ✅ reads app-build-id meta tag from html
- ✅ returns null when meta tag is missing

### buildRefactorPlan

#### buildRefactorPlan

- ✅ collects boundary node inputs from loaded systems
- ✅ builds boundary, ownership, and suggestions for an offender

### buildTraceLensScopeOptions

#### buildTraceLensScopeOptions

- ✅ includes structural entities and offenders with subtree counts
- ✅ filters options by name, entity ref, or level

### bundledChaosSpecCatalog

#### bundledChaosSpecCatalog

- ✅ loads catalog entries from catalog.json
- ✅ loads a YAML body by id
- ✅ parses workspace chaos-specs paths into catalog entries
- ✅ skips workspace scan when the adapter has no FS permission (samples/remote)
- ✅ lets workspace entries override bundled ids

### bundledSamplePreload

#### listBundledPreloadPaths

- ✅ keeps golden-journey and stress estates only
- ✅ returns empty when catalog has no preload estates
- ✅ documents golden/stress demo estates

### bundledSampleWorkspace

#### BundledSampleWorkspaceAdapter

- ✅ exposes the samples catalog for navigation
- ✅ reads a single blueprint file by relative path
- ✅ rejects non-blueprint source paths so callers can fall back to git raw
- ✅ loads the prebuilt navigation catalog without fetching every YAML
- ✅ warms golden-journey and stress YAML bodies from the catalog

#### BundledSampleWorkspaceAdapter fetch resilience

- ✅ retries transient Failed to fetch errors and then succeeds
- ✅ clears a failed catalog cache so a later retry can succeed
- ✅ limits concurrent blueprint downloads

### Canvas

#### Canvas Component

- ✅ renders canvas layout with correct count of nodes and edges
- ✅ hides MiniMap and Background when liteCanvas is on
- ✅ focuses coupling neighbors and hides other nodes and schema links
- ✅ shows all nodes in resilience mode even when dependency focus is on
- ✅ keeps TraceLens hotspot heat visible while ChaosLens is active
- ✅ force-shows scoped external nodes while resilience mode hides other externals
- ✅ renders more-actions menu without a system switcher
- ✅ triggers openWorkspaceDirectory store action when Open Folder is clicked
- ✅ renders error alert notification toast when lastError is set
- ✅ triggers zoomIntoNode store action on double clicking a C4 node
- ✅ shows a Zoom out button that navigates to the parent system

### canvasDisplayGraph

#### buildCanvasVisibleNodes - C4 context level

- ✅ always shows actors and external dependencies at context level
- ✅ keeps actors and externals visible under dependency focus at context level

### chaosLensUrl

#### chaosLensUrl

- ✅ builds workspace chaos lens URLs
- ✅ parses workspace chaos lens URLs
- ✅ detects chaos lens routes

### ChildLevelExternalsDialog

#### ChildLevelExternalsDialog

- ✅ lists child externals without changing the active diagram
- ✅ closes on Escape
- ✅ closes when navigating to a canonical external entity

### CodeViewer

#### LeftWorkspacePanel (code viewer)

- ✅ should render the explorer header and schema tabs
- ✅ should render the initial schema in the YAML code block
- ✅ should switch tabs and show JSON schema representation
- ✅ should support YAML direct edit and apply workflow
- ✅ should support JSON direct edit and apply workflow
- ✅ should show error when applying invalid YAML configuration
- ✅ should show error when applying invalid JSON configuration
- ✅ should support Mermaid preview toggle and render mock visual preview
- ✅ should open mermaid import dialog from the mermaid tab
- ✅ should filter test components from YAML, JSON, and Mermaid views based on showTests state

### compareOffenders

#### compareOffenders

- ✅ ranks refactor filter by effective score then composite risk
- ✅ prefers hotspot classification over score alone in default ranking

### compareSystemSchemas

#### compareSystemSchemas

- ✅ returns empty diff for identical schemas
- ✅ detects added, modified, and deleted nodes

### computeClientLayout

#### computeClientLayout

- ✅ normalizes missing sizes and delegates to the registry engine
- ✅ uses measured dimensions when present
- ✅ applies grid policy without calling the engine when sparse
- ✅ falls back to grid when the registry has no engine

#### shouldUseGrid

- ✅ uses grid for empty edge sets
- ✅ uses an engine when edges are dense enough

### concern

#### evaluateForensicsConcern

- ✅ returns none for undefined or empty forensics
- ✅ marks hotspot classification as danger
- ✅ marks knowledge-silo as warning and combines with hotspot as danger
- ✅ uses secondary thresholds when classifications are absent

### ConnectionsSection

#### ConnectionsSection

- ✅ spotlights a connection when the crosshair is clicked

### countDependencyFocusMetrics

#### countDependencyFocusMetrics

- ✅ returns zeros when mode is full or unselected
- ✅ reports hidden externals in focus mode
- ✅ includes externals in focus-externals mode

### countForensicsMetrics

#### countSchemaForensicsMetrics

- ✅ counts diagram-wide externals, tests, and dependencies when nothing is selected
- ✅ counts partners and incident edges for a selected node
- ✅ returns zeros for an unknown selection

### CouplingMiniGraph

#### CouplingMiniGraph

- ✅ calls onPeerClick for linked peers only

### d3HierarchyLayoutAdapter

#### D3HierarchyLayoutAdapter

- ✅ places tree children below the root

### dagreLayoutAdapter

#### DagreLayoutAdapter

- ✅ places a chain top-to-bottom
- ✅ spreads siblings so fan-in labels have horizontal room
- ✅ centers a hub node above its children

### db

#### db.ts - IndexedDB Client Operations

- ✅ should successfully save baseline schemas and dependencies
- ✅ should compute an empty diff when baseline and working schemas match
- ✅ should detect added components and connections in working schema
- ✅ should detect deleted components and connections in working schema
- ✅ should detect modified properties, name or type of components
- ✅ should detect position changes of components
- ✅ should revert draft changes back to baseline

### DependencyFocusChip

#### DependencyFocusChip

- ✅ promotes to focus-externals when + Externals is clicked

### DependencyMiniGraph

#### DependencyMiniGraph

- ✅ renders upstream and downstream peers
- ✅ calls onPeerClick when a peer is selected
- ✅ shows overflow counts when peers are capped

### DependencyViewControl

#### DependencyViewControl

- ✅ calls onChange when a segment is selected

### DesignSystemDocsPage

#### DesignSystemDocsPage

- ✅ renders the showcase inside the docs shell

### DesignSystemShowcase

#### DesignSystemShowcase Component

- ✅ renders title and navigation
- ✅ supports switching tabs
- ✅ documents product marketing patterns on the components tab

### diagramLoadSession

#### diagramLoadSession

- ✅ keeps the overlay visible until nested loads finish

### diagramState

#### diagramState Actions & State Management

- ✅ should initialize with correct default nodes, edges, and schemas
- ✅ should successfully add a new node and serialize to YAML
- ✅ should delete a node and clean up referencing edges
- ✅ should update a node name and metadata properties
- ✅ should rename a node ID and update referencing edges
- ✅ should rename a context-level actor and update dependency refs
- ✅ should update dependency refs when renaming after entityRef was resolved to FQN
- ✅ should update edges that reference the old FQN when renaming a node
- ✅ should update edges when canvas id is short but dependency uses resolved FQN
- ✅ should establish a connection between nodes and detect a cycle
- ✅ should allow updating schema name and level
- ✅ should map isTest flag correctly from domain node to RF node data
- ✅ should not write autolayout positions into YAML until layout is customized
- ✅ should write layout engine positions into schema and YAML when persisted
- ✅ should support undo and redo basic workflow
- ✅ should support undo on node property updates
- ✅ should support undo on node deletion
- ✅ should place a new node at the specified position if provided
- ✅ should reset focusedCyclePath to null when initSchema is called
- ✅ does not seed session layout cache before autolayout on load

##### validation console logging

- ✅ logs schema validation warnings only when the issue set changes
- ✅ does not re-run schema validation on dimensions-only node changes

### DiffMenu

#### DiffMenu Component

- ✅ is hidden when isOpen is false
- ✅ renders up to date message when there are no structural differences
- ✅ displays added, modified, and deleted component nodes and connections
- ✅ triggers revert schema operations and calls initSchema when Revert is confirmed
- ✅ triggers commit schema operations and calls saveActiveDiagram when Commit is clicked

### DocsHome

#### DocsHome

- ✅ renders product suite and primary calls to action
- ✅ uses landing layout without docs sidebar
- ✅ links each product card to its guide chapter

### DocsPage

#### DocsPage feature filter

- ✅ filters the feature report as the user types
- ✅ filters to a package when a package chip is clicked without filling the search box

### DocsPage.productCta

#### DocsPage product CTA

- ✅ shows an in-app product button on product guide pages

### DocsShell

#### DocsShell

- ✅ shows mobile section scrollers for Start, Surfaces, and Tech
- ✅ shows header hubs for Start, Surfaces, and Tech
- ✅ shows local section nav on mobile and nested sidebar items when provided

### elkLayoutAdapter

#### ElkLayoutAdapter

- ✅ places a chain top-to-bottom

### EmptyDiagramOverlay

#### EmptyDiagramOverlay

- ✅ shows when a named diagram has zero nodes
- ✅ hides while loading
- ✅ hides when nodes are present
- ✅ hides for the intentional empty workspace starter

### executeRecommendationAction

#### executeRecommendationAction

- ✅ opens refactor plan for review-refactor-plan actions
- ✅ navigates to canvas and enables circuit breaker safeguards
- ✅ runs a failure simulation for timeout review actions

### ExecutiveTelemetryPanel

#### ExecutiveTelemetryPanel

- ✅ shows plain-English continuity summary without entity refs

#### TelemetryViewToggle

- ✅ switches between SRE and executive views

### exportAdviceLensArtifact

#### exportAdviceLensArtifact

- ✅ defaults studio export to YAML with the shared artifact shape

### externalNodeVisibility

#### externalNodeVisibility

- ✅ classifies upstream and downstream externals from dependency direction
- ✅ shows externals based on directional toggles
- ✅ filters schema externals by direction
- ✅ counts externals per direction
- ✅ always shows external dependencies on C4 context diagrams

### externalSummaryDisplay

#### externalSummaryDisplay - C4 context level

- ✅ does not use external summary collapse on context diagrams
- ✅ keeps on-diagram external dependencies visible at context (no whitelist)
- ✅ keeps context externals visible even when caller/target toggles are off
- ✅ does not build summary hubs on context diagrams

#### externalSummaryDisplay - external-only container diagrams

- ✅ does not collapse externals when the diagram has no internal nodes
- ✅ does not build empty summary hubs for external-only diagrams

### fetchSourceFileContent

#### fetchSourceFileContent

- ✅ prefers local workspace content when available
- ✅ falls back to raw URL when local read fails
- ✅ falls back to raw URL when local read returns SPA HTML
- ✅ detects SPA HTML fallbacks for non-html paths
- ✅ returns a helpful error when no source metadata exists

### fileSync

#### fileSync Adapters

##### BrowserFileSystemAdapter (FileSystemPort)

###### loadSchema

- ✅ uses showOpenFilePicker if available in window
- ✅ falls back to file input click if showOpenFilePicker is not supported

###### saveSchema

- ✅ uses showSaveFilePicker if available in window
- ✅ falls back to browser anchor tag download if showSaveFilePicker is not supported

##### BrowserWorkspaceAdapter (WorkspacePort)

- ✅ selectDirectory prompts showDirectoryPicker and saves active handle
- ✅ hasPermission queries and requests browser file handle permissions
- ✅ readDirectoryFiles reads top-level .yaml and .yml files from active handle
- ✅ readDirectoryFiles traverses child directories recursively and reads all yaml files
- ✅ readFile splits path and traverses directory handle recursively to return content
- ✅ writeFile creates directory structure and file handles to write content

### filterFeatureMarkdown

#### filterFeatureMarkdown

- ✅ returns the original markdown when the query is empty
- ✅ keeps matching list items and their ancestor headings
- ✅ keeps all descendants under a matching heading
- ✅ keeps parent package/file headings when a nested suite matches
- ✅ counts matching feature list items
- ✅ package mode keeps only the matching top-level ## section

### filterSelectedDependencyFocus

#### filterSelectedDependencyFocus

- ✅ collects selected node plus transitive upstream and downstream neighbors
- ✅ includes upstream dependents when selecting a mid-chain node
- ✅ includes all transitive upstream callers when selecting a leaf
- ✅ does not include sibling-only branches via a shared upstream
- ✅ filters nodes when enabled; passes through when disabled or unselected
- ✅ keeps upstream callers when focusing a dependency target
- ✅ includes all group children when the caller connects to the group shell
- ✅ includes upstream callers of a grouped child via the group edge
- ✅ collectUpstreamNeighborhood returns only incoming transitive callers
- ✅ collectDownstreamNeighborhood returns only outgoing transitive targets
- ✅ buildDependencyGraphModel assigns hop distances and totals
- ✅ resolveDependencyRoles labels upstream and downstream peers
- ✅ collectDependencyNeighborhoodWithExternals adds externals on closure edges
- ✅ filterSelectedDependencyFocusNodes includes externals when requested

### ForensicsSection

#### ForensicsSection

- ✅ links to TraceLens scoped to the selected entity
- ✅ renders readonly metrics and hotspot concern badge
- ✅ shows composite risk when blast radius is provided
- ✅ shows knowledge silo badge
- ✅ toggles coupling lens via workspace display when peers are linked
- ✅ shows focus hint when coupling lens is on and node is selected
- ✅ renders trend dashboard with churn sparkline and coupling mini graph
- ✅ renders ownership breakdown when authors are present
- ✅ selects coupled peer from mini graph when linked
- ✅ shows helper text for the section and each metric
- ✅ renders dual churn windows and acceleration when present
- ✅ renders imported files and selects linked peers

### ForensicsTrendPanel

#### ForensicsTrendPanel

- ✅ renders churn, author, and complexity micro charts for rollups

### GoldenJourneyTour

#### GoldenJourneyTour

- ✅ renders estate product map and six journey steps with deep links

### Header

#### Header Component

- ✅ renders branding and breadcrumbs

### hiddenExternalConnectionGhosts

#### buildHiddenExternalConnectionGhosts

- ✅ returns empty output when disabled
- ✅ creates ghost node and dashed edge for hidden external on closure edge
- ✅ includes direct hidden external edge from the selection

### highlightQuerySources

#### highlightQuerySources

- ✅ loads highlight queries for all shipped grammars

### hotspotHeatmap

#### applyHotspotHeatmap

- ✅ sets transient hotspotHeat from scores when enabled
- ✅ clears heat when disabled

#### hotspotHeatIntensity

- ✅ returns 0 when forensics is missing
- ✅ returns 0 when hotspotScore is missing
- ✅ returns the score when in range
- ✅ clamps out-of-range scores

#### hotspotHeatmapMinimapColor

- ✅ returns null for zero intensity
- ✅ returns a red-scale hex for positive intensity

### importIac

#### previewIacImport

- ✅ returns parse result and merge plan for terraform resources
- ✅ parses multi-file python pulumi stacks using runtime from Pulumi.yaml

### importMermaid

#### previewMermaidImport

- ✅ returns parse result and merge plan for new nodes

### ioState

#### ioState Actions & State Management

- ✅ should open workspace, read blueprint.yaml, and mark workspace as open
- ✅ should catalog all systems on open and lazy-load when selecting another

##### loadSchema error handling

- ✅ should load content and return true on successful parsing
- ✅ should return false if loadSchema is cancelled by user
- ✅ should return false if loadSchema throws

##### openBundledSample

- ✅ opens from prebuilt catalog and only reads the entry YAML
- ✅ does not overwrite a folder workspace when sample load finishes after folder open
- ✅ keeps sample mode when the folder picker is cancelled
- ✅ does not apply sample ports when finalize loses to a newer folder open

##### openWorkspaceDirectory edge cases

- ✅ should fail if no files are returned from workspace
- ✅ should log/skip invalid schemas and continue if at least one schema is valid
- ✅ should fail if all schema files fail to parse
- ✅ discards IndexedDB drafts whose topology no longer matches disk YAML

##### saveActiveDiagram logic

- ✅ should delegate to saveSchema when workspace is not open
- ✅ should delegate to saveSchema for bundled sample workspaces
- ✅ should write to file successfully when workspace is open
- ✅ should return false if writeFile fails or throws when workspace is open

##### saveSchema error handling

- ✅ should return false if saveSchema port operation fails
- ✅ should return false and log error if saveSchema throws

### LayoutEngineControls

#### LayoutEngineControls

- ✅ updates store and applies layout when an engine is picked

### layoutUtils

#### getAbsoluteNodePosition

- ✅ accumulates parent offsets for nested nodes

#### getClosestHandles

- ✅ defaults to TB handles when the target is below the source
- ✅ uses top-to-bottom handles when the target is above the source
- ✅ supports LR routing when requested

#### isDesktopViewport

- ✅ returns true when the sm breakpoint matches
- ✅ returns false below the sm breakpoint

#### layoutGroupedDomainNodes

- ✅ keeps downstream externals below a multi-child system boundary on initial layout

#### layoutUtils forensics plumbing

- ✅ maps node forensics onto RF node data
- ✅ preserves forensics when rebuilding schema from canvas
- ✅ preserves git source provenance when rebuilding schema from canvas

#### mapDomainDepsToRFEdges

- ✅ drops duplicate from→to edges that would share a React key

#### mapDomainNodesToRFNodes

- ✅ maps group parents and nested children with parentId
- ✅ does not set React Flow parentId for diagram-membership parentEntityRef
- ✅ round-trips parentEntityRef through rebuildSchemaFromCanvas

#### shouldAutoLayoutOnLoad

- ✅ skips auto layout only when every node has saved coordinates
- ✅ runs auto layout when only some nodes have coordinates
- ✅ runs auto layout for grouped context when coordinates are absent
- ✅ runs auto layout when nodes are missing coordinates

### layoutUtils.direction

#### dependency edge direction visuals

- ✅ maps domain deps with a closed arrow marker toward the target
- ✅ keeps publish-subscribe edges animated by default
- ✅ animates edges incident to the selected node
- ✅ animates all edges when selected-dependencies focus mode is on
- ✅ preserves already-animated edges
- ✅ disables all edge animation when preferReducedMotion is set
- ✅ caps liteCanvas animation to edges incident to the selection

### lazyLayoutEngine

#### lazyLayoutEngine

- ✅ does not call the loader until computeLayout runs
- ✅ reuses the loaded adapter on subsequent calls

### LeftWorkspacePanel

#### LeftWorkspacePanel

- ✅ switches between TraceLens and Schema tabs without closing the panel

### LensToolbarControls

#### LensToolbarControls

- ✅ does not render a TraceLens toolbar toggle
- ✅ does not render coupling lens in the toolbar
- ✅ toggles resilience mode from the toolbar
- ✅ shows guidance when resilience is unavailable on component diagrams

### LiteCanvasButton

#### LiteCanvasButton

- ✅ toggles lite canvas from the bottom toolbar

### LiveSchemaPreview

#### LiveSchemaPreview

- ✅ fetches latest schema and renders pretty JSON
- ✅ shows an error when the channel is invalid
- ✅ shows an error when fetch fails

### materializeCouplingGhost

#### materializeCouplingGhostOnDiagram

- ✅ adds workspace entities as external dependencies
- ✅ materializes unmapped filepaths as new component nodes

### MermaidPreview

#### MermaidPreview Component

- ✅ renders loading state initially then displays rendered SVG
- ✅ displays visualization error when render fails
- ✅ opens and closes expanded portal view

### MobilePanelToggles

#### MobilePanelToggles

- ✅ opens the explorer panel from a labelled button
- ✅ opens the properties panel from a labelled button
- ✅ hides when explorer is open
- ✅ hides when properties panel is open

### MonteCarloControls

#### MonteCarloControls

- ✅ renders current config and reports changes

### navigateToWorkspaceEntity

#### navigateToWorkspaceEntity

- ✅ updates the URL and lets useUrlSync load the diagram
- ✅ uses the diagram entityRef in the URL when the target is a diagram
- ✅ returns false when the entity is not in the catalog

### OfflineBanner

#### OfflineBanner

- ✅ is hidden when network status reports online
- ✅ shows when network status reports offline on mount
- ✅ toggles when the network status port notifies changes

### openChaosSpecOnCanvas

#### openChaosSpecOnCanvas

- ✅ navigates to the target diagram, selects it, and applies the ChaosSpec
- ✅ runs simulation when requested
- ✅ fails when the diagram is missing from the workspace catalog
- ✅ surfaces apply errors after navigation

### openRefactorOnCanvas

#### openRefactorOnCanvas

- ✅ navigates to the offender with coupling and guided boundary highlights

### openSimulateFailureOnCanvas

#### openSimulateFailureOnCanvas

- ✅ navigates to the diagram and starts a ChaosLens simulation at the offender

### openWorkspaceFromCatalog

#### loadWorkspaceFromCatalog

- ✅ loads only the entry YAML and installs the prebuilt catalog
- ✅ throws when the entry path is missing from the catalog

### pages

#### docs link resolution

- ✅ resolves relative markdown links within the guide
- ✅ registers the BlueprintSpec and ChaosSpec guide pages
- ✅ registers product CTAs for each product guide chapter
- ✅ resolves in-app AdviceLens entry link
- ✅ resolves absolute docs paths
- ✅ registers CI workflows and Tech sidebar pages
- ✅ groups docs nav into Start/Surfaces/Tech hubs and sidebar
- ✅ marks Start vs Surfaces vs Tech hubs active without colliding on CI workflows
- ✅ registers the AdviceLens engine reference page
- ✅ resolves feature report pages
- ✅ resolves current guide chapter paths
- ✅ resolves in-app TraceLens links
- ✅ resolves in-app workspace links
- ✅ maps screenshot assets under /docs-assets

#### stripHtmlComments

- ✅ removes HTML comments used as reporter placeholders

### partitionLayoutComponents

#### partitionLayoutComponents

- ✅ splits disconnected subgraphs

### planNodeNameUpdate

#### planNodeNameUpdate

- ✅ updates entityRef when the slug is unique
- ✅ keeps the name only when the slug collides
- ✅ keeps the name only when the slug is unchanged

### prerenderHtml

#### injectPrerenderedPageHtml

- ✅ rewrites head tags and injects crawlable body content inside #root

### PropertyPanel

#### PropertyPanel UI Component

- ✅ should render External Dependencies section when no node is selected and workspace is loaded
- ✅ should render Workspace config and Catalog when no node is selected
- ✅ should render Diagram C4 Level selector and trigger updateSchemaLevel on change
- ✅ should render read-only Diagram entityRef from workspaceName or schema.name
- ✅ should trigger node creation when catalog component is clicked
- ✅ should show validation success message when architecture is acyclic
- ✅ should hide validation success when connection issues exist
- ✅ should show cycle warning alert when circular dependency is triggered
- ✅ should display node attributes editor when a node is selected
- ✅ should rename node and metadata attributes when edited in node details
- ✅ should allow adding custom metadata attributes to the component
- ✅ should allow editing active connection descriptions
- ✅ shows child level externals when selected node has a child diagram with externals

### PropertyPanel.resilience

#### PropertyPanel resilience tabs

- ✅ shows simulation tab by default and switches to properties

### propertyPanelTitle

#### resolvePropertyPanelTitle

- ✅ labels ChaosLens while resilience mode is active
- ✅ labels Dependency when an edge is selected
- ✅ labels the selected node type when known
- ✅ falls back to Diagram for component/code canvas
- ✅ falls back to Canvas for higher-level diagrams

### rankOffenders

#### loadedSystemsHaveForensics

- ✅ returns true when any node has forensics
- ✅ returns false when no forensics blocks exist

#### offenderMatchesEntityScope

- ✅ matches descendants by entityRef prefix and containerId

#### rankForensicsOffenders

- ✅ ranks component hotspots by score and classification
- ✅ filters hotspots and silos
- ✅ ranks refactor candidates by complexity × churn × (1 - ownership)
- ✅ boosts refactor ranking when ChaosLens shows critical-path exposure
- ✅ includes dependency count as structural context on ranked rows
- ✅ ranks container rollups and ignores component diagrams in containers scope
- ✅ filters heating offenders by churn acceleration
- ✅ filters prod and test offenders separately

### RecommendationsList

#### RecommendationsList

- ✅ renders ranked recommendations with source labels
- ✅ renders empty message when provided
- ✅ renders action buttons and handles clicks
- ✅ renders narration detail and AdviceLens label when present

### remoteCatalogWorkspace

#### Feature: Hosted sandbox reads remote catalog

- ✅ follows latest pointer → catalog → lazy YAML consume protocol
- ✅ rejects diagram paths that are not listed in the remote catalog

### resetToEmptyWorkspace

#### resetToEmptyWorkspace

- ✅ clears sandbox systems and leaves a blank diagram

### resilienceState

#### resilienceState

- ✅ expands the property panel when entering resilience mode on desktop
- ✅ keeps the property panel collapsed when entering resilience mode on mobile
- ✅ keeps the property panel collapsed when a simulation completes on mobile
- ✅ does not expand the property panel when a simulation completes on desktop
- ✅ materializes unresolved externals when entering resilience mode
- ✅ rewires missing dependency edges when materializing resilience externals
- ✅ materializes connected external neighbors before simulating
- ✅ expands through an auth proxy into its home diagram when faulting session-db
- ✅ includes upstream transitive callers in the simulation scope
- ✅ runs simulation against the active workspace schema
- ✅ resets telemetry view when leaving resilience mode
- ✅ clears simulation when leaving resilience mode
- ✅ stores Monte Carlo settings for the next simulation run
- ✅ clamps Monte Carlo values to supported ranges
- ✅ defaults Monte Carlo config to engine-aligned values
- ✅ persists safeguard toggles to node properties for schema explorer and draft diff
- ✅ loads a ChaosSpec YAML scenario onto the active diagram
- ✅ rejects ChaosSpec YAML when diagramRef does not match
- ✅ runs simulation from configured faults without a selected node
- ✅ supports multiple faults in the scenario list
- ✅ removes a fault from the scenario list
- ✅ simulates a region outage at a specific node

### resolveCouplingEdges

#### findNodeIdByFilepath

- ✅ resolves normalized filepaths to canvas node ids
- ✅ resolves workspace catalog filepaths to on-canvas entity refs

#### resolveAllCanvasCouplingEdges

- ✅ collects coupling edges from every node on the diagram

#### resolveCouplingEdges

- ✅ returns empty when selected node has no coupled files
- ✅ maps coupledFiles paths to nodes on the canvas via properties.filepath
- ✅ resolves coupled peers from the workspace catalog when not on the active canvas
- ✅ normalizes path separators and leading ./ when matching
- ✅ returns empty when selected node is missing
- ✅ skips self-coupling if filepath matches the selected node

#### resolveImportPeerPaths

- ✅ maps importedFiles paths to nodes on the canvas

### resolveLiveSchemaUrl

#### parseLiveSchemaFence

- ✅ defaults empty body to blueprint latest
- ✅ accepts channel-only fences as blueprint
- ✅ accepts kind + channel fences
- ✅ rejects invalid fences

#### resolveLiveSchemaUrl

- ✅ defaults empty channel to latest blueprint under /
- ✅ accepts latest and versioned blueprint channels
- ✅ resolves chaos schema channels
- ✅ joins with Vite BASE_URL when not root
- ✅ rejects path traversal and unknown channels

### resolveSelectedNode

#### findSelectedEdge / isEdgeEndpointMissing

- ✅ finds selected edge by id
- ✅ detects dangling edge endpoints

#### resolveSelectedRfNode

- ✅ matches by react-flow id or entityRef

#### resolveSelectedSchemaNode

- ✅ resolves schema node from RF selection
- ✅ returns null when nothing is selected

### resolveTraceLensScopeDiagrams

#### resolveDiagramPathsForEntityScope

- ✅ collects home and child diagram paths from the workspace catalog

### runResilienceSimulationAsync

#### runResilienceSimulationAsync

- ✅ uses WASM integrityHeat without merging TypeScript integrity
- ✅ does not hybrid-merge TypeScript when WASM returns empty integrityHeat
- ✅ falls back to the TypeScript engine when WASM is unavailable
- ✅ propagates WASM simulation errors instead of falling back
- ✅ logs WASM unavailability through the injected logger

### safeguardHighlights

#### applySafeguardHighlights

- ✅ marks nodes with persisted or session safeguards when resilience mode is on
- ✅ clears safeguard styling when resilience mode is off

### sampleWorkspaceLoader

#### loadSampleWorkspaceSession

- ✅ createSampleWorkspacePort uses bundled adapter when remote env is unset
- ✅ createSampleWorkspacePort prefers remote adapter when env is set
- ✅ uses bundled catalog when remote env is unset
- ✅ falls back to bundled catalog when remote manifest is unavailable
- ✅ uses remote catalog when manifest resolves

### sandboxWorkspace

#### sandboxWorkspace

- ✅ builds entity-ref workspace paths
- ✅ preserves AdviceLens when building breadcrumb links
- ✅ preserves TraceLens when building breadcrumb links
- ✅ preserves ChaosLens when building breadcrumb links

### schemaCompare

#### schemaCompare

- ✅ treats position-only differences as equal topology
- ✅ detects extra / changed dependencies
- ✅ keeps matching draft (with positions) on open
- ✅ discards topologically stale draft in favor of disk
- ✅ uses disk when there is no draft
- ✅ detects parentEntityRef changes as topology drift

### Searchbar

#### Searchbar Component

- ✅ renders search input with placeholder
- ✅ renders matching results in a body portal above the toolbar
- ✅ filters and displays nodes matching search query
- ✅ lists current-diagram matches before other diagrams
- ✅ respects showTests filtering state
- ✅ handles clearing search input
- ✅ navigates to the selected node when dropdown item is clicked
- ✅ navigates to nodes on other diagrams
- ✅ navigates dropdown using arrow keys and selects with Enter
- ✅ closes dropdown when Escape key is pressed

### searchWorkspaceNodes

#### searchWorkspaceNodes

- ✅ returns empty results for blank queries
- ✅ lists current-diagram matches before other diagrams
- ✅ prefers the current diagram copy when the same entityRef exists elsewhere
- ✅ respects showTests and directional external filters

### selectBundledSampleEntryPath

#### selectBundledSampleEntryPath

- ✅ prefers samples context when present
- ✅ falls back to context then first entry
- ✅ throws when catalog is empty

### SelectedDependencySection

#### SelectedDependencySection

- ✅ shows from/to refs, description, and dangling warning when endpoints missing
- ✅ lets the user edit dependency type

### sessionLayoutCache

#### sessionLayoutCache

- ✅ stores and retrieves layouts by file path and schema fingerprint
- ✅ misses when the schema fingerprint changes

### simulationScopeHighlights

#### applySimulationScopeHighlights

- ✅ marks nodes outside the simulation scope as out-of-scope
- ✅ clears out-of-scope styling when disabled
- ✅ keeps group frames visible when a child is in scope

### siteSeo

#### siteSeo catalog

- ✅ resolves distinctive homepage metadata with social share image
- ✅ gives each product surface a unique title and description
- ✅ covers every docs page path with an SEO record
- ✅ marks workspace routes as non-indexable with a workspace title
- ✅ builds a sitemap that lists indexable URLs and omits workspace
- ✅ builds JSON-LD graph with Organization, WebSite, and SoftwareApplication nodes

### SourceCodeDialog

#### SourceCodeDialog

- ✅ renders nothing when closed
- ✅ shows loaded source content when open
- ✅ shows scan system name when present on provenance

### StartupWorkspaceDialog

#### StartupWorkspaceDialog

- ✅ renders sample and open-directory choices when open
- ✅ renders nothing when closed
- ✅ invokes handlers from the embedded entry panel
- ✅ surfaces sandbox loading feedback while open is in progress

### store

#### Blueprint Store Integration Helper Actions

- ✅ should resolve relative path correctly

### summarizeWorkspaceForensics

#### summarizeWorkspaceForensics

- ✅ returns zeros for an empty workspace
- ✅ aggregates topology and forensics across diagrams without double-counting entityRefs
- ✅ counts topology even when no TraceLens blocks are present
- ✅ scopes complexity metrics to an entity subtree when scopeEntityRef is set

### TelemetryPanel

#### TelemetryPanel

- ✅ explains when SLA is unchanged but integrity degraded

### TraceLensPanel

#### TraceLensPanel

- ✅ renders ranked offenders and filters to hotspots
- ✅ shows workspace complexity summary for the loaded estate
- ✅ scopes workspace complexity metrics to the entity scope
- ✅ shows guidance when no blueprints are in scope
- ✅ filters the ranking list from the page search
- ✅ opens refactor plan slide-over when an offender row is clicked
- ✅ filters offenders by entity scope in the URL path
- ✅ changes entity scope from the picker
- ✅ opens refactor plan from entity deep link
- ✅ opens source dialog from deep link with source=1
- ✅ shows chaos risk context when a ChaosLens simulation is active
- ✅ shows estate recommendations when the recommendations tab is selected
- ✅ switches to AdviceLens URL when the recommendations tab is selected

### TraceLensScopePicker

#### TraceLensScopePicker

- ✅ shows all entities by default and opens searchable menu
- ✅ selects an entity scope and can clear it

### TraceLensSidePanel

#### TraceLensSidePanelContent

- ✅ renders worst offenders CTA and canvas lens controls
- ✅ shows empty selection hint when no node is selected
- ✅ navigates to full trace lens mode from worst offenders CTA
- ✅ shows readonly git forensics when the selected node is enriched
- ✅ shows coupling lens hint for a selected node with on-canvas peers

### traceLensUrl

#### traceLensUrl

- ✅ builds workspace lens URLs
- ✅ parses workspace lens URLs
- ✅ detects workspace TraceLens routes

### treeSitterHighlight

#### treeSitterHighlight

- ✅ maps tree-sitter capture names via theme config
- ✅ prefers shorter highlight spans when ranges overlap
- ✅ compresses painted classes into render spans

### uiState

#### uiState Actions & State Management

- ✅ should initialize with correct default UI state
- ✅ should set isDiffOpen value via setIsDiffOpen action
- ✅ should toggle showTests property via toggleShowTests action
- ✅ should toggle upstream and downstream external visibility
- ✅ should toggle dependency focus via toggleShowSelectedDependenciesOnly
- ✅ should set dependency view mode via setDependencyViewMode
- ✅ should toggle showCoupling property via toggleShowCoupling action
- ✅ should toggle showHotspotHeatmap via toggleShowHotspotHeatmap action
- ✅ should toggle liteCanvas via toggleLiteCanvas action
- ✅ should manage leftCollapsed and rightCollapsed panel states
- ✅ should set showDesignSystem value via setShowDesignSystem action
- ✅ should automatically expand right panel when a node is selected on desktop
- ✅ should keep right panel collapsed when a node is selected on mobile
- ✅ should expand right panel on mobile when expandPanel is requested
- ✅ should initialize focusedCyclePath to null and set it via setFocusedCyclePath
- ✅ opens child level externals modal without leaving the diagram

### UpdateBanner

#### UpdateBanner

- ✅ is hidden when no update is pending
- ✅ shows refresh prompt when the service worker reports an update
- ✅ dismisses the banner when Later is clicked

### useActiveDiagramEntity

#### useActiveDiagramEntity

- ✅ derives parent entityRef from the active diagram without loading the parent system

### useChaosSpecDialog

#### useChaosSpecDialog

- ✅ previews a valid ChaosSpec and applies it on load
- ✅ generates export YAML from the active scenario

### useImportIacDialog

#### useImportIacDialog

- ✅ applies ELK layout after a successful IaC import

### useImportMermaidDialog

#### useImportMermaidDialog

- ✅ applies ELK layout after a successful Mermaid import

### useKeyboardNavigation

#### useKeyboardNavigation Hook

- ✅ should call onSearchOpen when ⌘K is pressed (not typing)
- ✅ should call onSearchOpen when Ctrl+K is pressed (not typing)
- ✅ should call onSearchOpen when / is pressed (not typing)
- ✅ should call onZoomOut when Escape is pressed (not typing)
- ✅ should call onZoomOut when Backspace is pressed (not typing)
- ✅ should not call onZoomOut when typing in INPUT
- ✅ should not call onZoomOut when the callback is omitted
- ✅ should not trigger shortcuts when typing in INPUT
- ✅ should not trigger shortcuts when typing in TEXTAREA
- ✅ should not trigger shortcuts when typing in contenteditable element
- ✅ should call onUndo when ⌘Z or Ctrl+Z is pressed (not typing)
- ✅ should call onRedo when ⌘Shift+Z, Ctrl+Shift+Z, ⌘Y, or Ctrl+Y is pressed (not typing)
- ✅ should call onShortcutsOpen when ? is pressed (not typing)
- ✅ should cleanup event listener on unmount

### useTraceLensUrlSync

#### useTraceLensUrlSync

- ✅ opens a refactor plan only when ?plan= is present
- ✅ keeps the refactor plan closed after the user dismisses a ?plan= deep link

### useUrlSync

#### useUrlSync

- ✅ does not update the URL when the user selects a node on the canvas
- ✅ selects a node when the URL names a node on the loaded diagram
- ✅ loads the owning diagram when the URL names a node on another file
- ✅ selects the context diagram when the URL names a context but the canvas shows a child estate

### useWorkspaceLensSync

#### useWorkspaceLensSync

- ✅ enables ChaosLens and applies faults from the URL
- ✅ does not treat resilience=1 as ChaosLens
- ✅ writes ChaosLens query params when resilience mode is enabled
- ✅ keeps faults when the user adds one before the URL has caught up
- ✅ opens ChaosSpec picker from browse=chaosspecs and keeps it in the URL
- ✅ writes browse=chaosspecs when the ChaosSpec picker opens

### WorkspaceDisplayControls

#### WorkspaceDisplayControls

- ✅ exposes workspace-wide display toggles including selected-deps focus
- ✅ marks the summary when counts are scoped to the selected node
- ✅ disables caller and target toggles when dependency focus is active
- ✅ locks caller and target toggles on at C4 context level

### WorkspaceEntryPanel

#### WorkspaceEntryPanel

- ✅ renders sample and open-directory actions
- ✅ shows the CLI panel when requested
- ✅ invokes the matching handler for each choice
- ✅ shows loading feedback and disables actions while sandbox opens

### workspaceOpenSession

#### workspaceOpenSession

- ✅ invalidates older open generations
- ✅ blocks demo bootstrap after a folder is preferred
- ✅ claims demo bootstrap only once until released

### WorkspacePage

#### WorkspacePage Component

- ✅ should render Explorer, Canvas, and PropertyPanel
- ✅ should support expanding and collapsing left and right side panels
- ✅ should synchronize workspace system selection from URL params
- ✅ does not reopen the startup chooser when navigating within the workspace
- ✅ shows the startup chooser on bare workspace with no loaded systems

### WorkspacePage.resilience

#### WorkspacePage resilience mode

- ✅ shows resilience controls in the property panel when mode is enabled
- ✅ runs simulation against the active diagram and shows SLA telemetry

### workspacePanelLayout

#### workspacePanelLayout

- ✅ assigns traceLens to the left slot by default
- ✅ lists mutually exclusive left-slot panels
- ✅ resolves active panel within a slot

### WorkspaceStatusBadges

#### WorkspaceStatusBadges

- ✅ displays the C4 level badge
- ✅ displays valid status badge when validation is successful
- ✅ displays cycle warning validation status badge when cycle is present
- ✅ displays schema version warning badge when loaded version mismatches app expectation

## CLI

### analyzer

#### CodebaseAnalyzer Domain Service

- ✅ should correctly run analysis and delegate to writers
- ✅ splits complex monorepos into multiple systems from workspaces
- ✅ uses --system-name for multi-repo product membership
- ✅ should not throw if analyzing an empty file set
- ✅ attaches forensics onto component and container nodes when metrics are provided
- ✅ stops when the abort signal is already aborted

### attachForensics

#### aggregateNodeForensics

- ✅ rolls up max/sum/counts from child forensics
- ✅ omits loc/sloc on rollups when no child reports them
- ✅ rolls up author commits from children
- ✅ rolls up churnByWeek and churn-weighted ownership from children
- ✅ rolls up dual churn windows from children
- ✅ rolls up complexity peaks, line churn, and coupled files from children

#### attachForensicsToSchema

- ✅ attaches file metrics to component nodes by filepath
- ✅ aggregates onto container nodes from matching components
- ✅ aggregates onto context system nodes from system components
- ✅ normalizes backslashes in filepath joins

### baseWriter

#### BaseWriter YAML v3 format

- ✅ writes v3 object YAML on context.yaml
- ✅ writes metadata.source when git provenance is provided
- ✅ writes v3 object YAML on containers.yaml
- ✅ writes v3 object YAML on component YAML files

#### resolveLocalSchemaUrl

- ✅ resolves a path-relative schema from this repo blueprints tree

### cancellation

#### cancellation

- ✅ throwIfAborted no-ops without a signal or when not aborted
- ✅ throwIfAborted throws CancellationError when aborted
- ✅ identifies cancellation errors
- ✅ aborts the signal when SIGINT is received
- ✅ aborts the signal when SIGTERM is received

### catalogArgv

#### parse catalog commands

- ✅ defaults compose key prefix from estate id and skips validation
- ✅ parses publish-fragment required flags
- ✅ defaults prune retention policy and key prefix
- ✅ routes catalog actions through parseArchlensCommand
- ✅ rejects missing required flags

### cliBanner

#### cliBanner

- ✅ renders banner without throwing
- ✅ formats success and spinner copy

### cliHelp

#### cliHelp

- ✅ detects help flags
- ✅ resolves help topics
- ✅ knows valid subcommands
- ✅ suggests close subcommand names
- ✅ prints overview help without throwing
- ✅ exits on unknown subcommand

### collectFileMetrics

#### collectFileMetrics helpers

- ✅ normalizes paths for map keys

### componentLevelWriter

#### ComponentLevelWriter

- ✅ writes one component schema per container with expected path, entityRef, slugified ids, and filtered nodes
- ✅ includes dependencies touching the container, including cross-container edges
- ✅ emits rollup drill-down schemas from rollupDrillDown
- ✅ strips representative filepaths from parent rollups that have drill-down diagrams

### componentResolver

#### componentResolver

- ✅ dispatches to language-specific rollup resolvers
- ✅ returns null for unsupported extensions

### composeCatalog

#### Feature: catalog compose with CAS on latest

- ✅ composes staged fragments and CAS-updates latest
- ✅ skips upload when latest already points at the composed revision
- ✅ retries transient storage errors then succeeds
- ✅ exposes capped exponential CAS backoff
- ✅ applies accepted suggestion overlays during compose
- ✅ retries when latest CAS fails then succeeds
- ✅ reloads fragments after a CAS conflict so a newer fragment is included

#### Feature: catalog publish-fragment

- ✅ stages a local tree as a fragment

### consoleLogger

#### ConsoleLogger

- ✅ should log info messages with correct icon styles
- ✅ should log warnings
- ✅ should log errors with stack trace or error details

### containerGrouping

#### containerGrouping

- ✅ groups by packages/<name> instead of the first path segment
- ✅ falls back to the folder under src/lib
- ✅ refuses layout-leftover names as container identity
- ✅ skips packages/<name> without package.json when isPackageRoot is provided
- ✅ optionally rolls up _-module-_ container names
- ✅ groups by plugins/<name> the same way as packages/<name>
- ✅ keeps .NET test projects as the container even under nested Domain folders

#### ModelExtractor

- ✅ assigns package containers, marks tests, and hydrates node types from markers
- ✅ preserves slash segments in rolled-up component entity refs
- ✅ marks containers as tests when every source file in them is a test
- ✅ rolls up C# files by layer, skips boilerplate, types API containers, and links dependencies
- ✅ creates container nodes and edges from csproj references without source files

### containerLevelWriter

#### ContainerLevelWriter

- ✅ should write container schema with correct entityRef
- ✅ should slugify context name in entityRef
- ✅ nests under system when system id matches the context root
- ✅ writes container nodes without layout positions
- ✅ should log successful write

### contextLevelWriter

#### contextDisplayName

- ✅ title-cases slugified context roots

#### ContextLevelWriter

- ✅ should write context schema with correct entityRef
- ✅ should use an explicit display name when provided
- ✅ should slugify context name in entityRef
- ✅ writes the context diagram under the --context slug
- ✅ uses curated display names for peer contexts like E-Shop
- ✅ sticks a declared landscape system anchor onto eshop/system without duplicates
- ✅ keeps multi-system product hubs on the context entityRef
- ✅ should merge a second software-system into an existing context diagram
- ✅ emits a group frame when systems nest under a shared folder parent
- ✅ folds IaC folder groups into an existing product hub
- ✅ nests subsystems under the product group and leaves other products disconnected
- ✅ should upsert rather than duplicate when rewriting the same system
- ✅ should log successful write
- ✅ does not inherit a peer application context when creating infrastructure
- ✅ prefers an existing root context.yaml seed when the context folder is omitted
- ✅ hydrates a declared context with personas and does not inject a fallback user
- ✅ falls back to a fresh context when the declared seed is unreadable

#### personDependenciesForSystems

- ✅ links the person to top-level groups only

#### resolveContextSeedRelativePath

- ✅ prefers root context.yaml when nested path is absent
- ✅ uses nested context path when present or when creating fresh

#### topLevelSystemNodes

- ✅ returns nodes without a visual parent, excluding the person

### csharpAnalyzer

#### CSharpAnalyzer Strategy

- ✅ supports cs
- ✅ creates node with default properties
- ✅ computes container info from C# namespaces

### csharpDependencies

#### csharpDependencies

##### buildCSharpNamespaceIndex

- ✅ maps declared namespaces to container and component ids

##### extractCSharpDependencies

- ✅ links layers via cross-namespace usings within a project
- ✅ ignores framework usings

##### extractCsprojContainerDependencies

- ✅ creates inter-container edges from ProjectReference entries

##### isFrameworkNamespace

- ✅ filters BCL and common vendor namespaces

### csharpGrouping

#### csharpGrouping

##### classifyCSharpContainer

- ✅ maps Ordering.API (ordering-api) → rest-api
- ✅ maps OrderProcessor (orderprocessor) → background-worker
- ✅ maps WebApp (webapp) → web-app
- ✅ maps ClientApp (clientapp) → web-app
- ✅ maps EventBus (eventbus) → event-broker
- ✅ maps Shared (shared) → container

##### isCSharpSourcePath

- ✅ detects .cs paths case-insensitively

##### nodeTypePriority

- ✅ ranks rest-api above relational-database and default

##### resolveCSharpComponent

- ✅ returns null for boilerplate files
- ✅ rolls up files by the first folder under the project
- ✅ keeps project-root files as leaf components
- ✅ rolls up .NET test projects by folder under the test project

##### shouldSkipCSharpFile

- ✅ skips GlobalUsings, Migrations, Designer, and ModelSnapshot files
- ✅ keeps architectural sources

### entityRefContext

#### entityRefContext

- ✅ maps known context slugs to display titles
- ✅ nests under a stable system leaf when system id matches the context root

### externalDependenciesPass

#### applyExternalDependenciesPass

- ✅ rewrites component schemas with unresolved external proxy nodes only
- ✅ rolls component couplings up onto containers.yaml as inter-container edges
- ✅ does not add component noise onto application/context.yaml
- ✅ is a no-op when the blueprints tree is empty
- ✅ adds service-level coupling edges and external component proxies on container diagrams

#### listBlueprintSchemaPaths

- ✅ skips *-overlay.yaml merge helpers

### folderComponentRollup

#### folderComponentRollup

- ✅ rolls up monorepo paths to full folder depth
- ✅ rolls up monorepo paths to folder depth
- ✅ keeps simple-repo leaf files under one src folder
- ✅ rolls up python packages by immediate parent folder

### forensicAnalyzer

#### ForensicAnalyzer

- ✅ correlates structure + history, classifies, and reports
- ✅ skips AST for cold files when minChurnForComplexity is set but still counts loc
- ✅ filters to hotspots only when requested

### forensicsGlob

#### forensicsGlob

- ✅ aligns forensics glob with architecture scan plus js/jsx and without tf
- ✅ returns configured min churn when explicitly set
- ✅ applies large-repo default when configured min churn is zero

### formatArchitectureHealth

#### formatArchitectureHealthResult

- ✅ formats actionable findings in text mode
- ✅ includes regression deltas in json mode

### formatBlueprintOutput

#### formatBlueprintTreeDiff

- ✅ renders added nodes in text mode

#### formatValidationResult

- ✅ renders json output
- ✅ renders human text for success

### formatEstateResilienceResult

#### formatEstateResilienceResult

- ✅ serializes JSON as a versioned AdviceLens artifact with plain heat maps
- ✅ serializes YAML as a versioned AdviceLens artifact
- ✅ keeps a human-readable text summary

### gitignoreFilter

#### gitignoreFilter

- ✅ honours gitignore patterns instead of hardcoded folder names
- ✅ loads .gitignore from a project directory

### gitLogHistory

#### parseGitLogOutput

- ✅ parses null-separated commit records with paths
- ✅ parses numstat lines with path list

#### relativizeCommitPaths

- ✅ maps git-root paths onto a nested scan root

### gitProvenance

#### collectGitProvenance

- ✅ collects remote, branch, commit, and scanRoot offset
- ✅ returns undefined when not inside a git repository
- ✅ omits remoteUrl when origin is not configured

### goAnalyzer

#### GoAnalyzer Strategy

- ✅ supports go
- ✅ creates a node with Go technology
- ✅ marks test files
- ✅ derives container from last meaningful directory segment
- ✅ classifies http handler directories as rest-api
- ✅ skips generic top-level dirs (cmd, internal, pkg) and takes next segment
- ✅ returns null for files at root with only generic dirs

### goGrouping

#### goGrouping

##### resolveGoComponent

- ✅ rolls up by meaningful package directory
- ✅ skips generic top-level dirs and uses the package folder

### iacAnalyzer

#### IacAnalyzer

- ✅ parses a terraform root and writes containers.yaml + context node
- ✅ parses a pulumi project and writes containers.yaml + context node
- ✅ parses a python pulumi project with nested runtime and **main**.py
- ✅ writes terraform and pulumi roots to context in one pass
- ✅ links multiple terraform roots under the owning product hub
- ✅ nests terraform roots under the product hub that owns their path
- ✅ groups sibling terraform modules under a shared folder frame
- ✅ nests IaC modules under an existing product hub instead of a folder group
- ✅ does not overwrite a populated code-scan containers.yaml with an empty IaC result
- ✅ does not run code-scan fallback for empty terraform roots
- ✅ no-ops when no IaC roots exist
- ✅ projects meaningful Cloudflare externals and hydrates context from seed serves

### interactiveGitChoice

#### applyInteractiveGitChoice

- ✅ disables git forensics when user selects none
- ✅ keeps forensics enrich when user selects full
- ✅ does not override an explicit CLI --git plan when choice is skipped
- ✅ accepts InteractiveGitChoice mode union

#### shouldPromptForGit

- ✅ prompts in interactive mode when git was not decided via flags
- ✅ does not prompt when headless
- ✅ does not prompt when --git already set
- ✅ does not prompt when --no-git already set

### interactiveMainMenu

#### interactiveMainMenu

- ✅ lists scan plus catalog actions
- ✅ shows the menu only for bare interactive runs
- ✅ builds publish and fragment plans with dry-run defaults
- ✅ builds compose and overlay plans

### javaAnalyzer

#### JavaAnalyzer Strategy

- ✅ supports java, kt, and kts
- ✅ creates a Java node with correct technology
- ✅ creates a Kotlin node with correct technology
- ✅ marks test files
- ✅ derives container from package declaration (3rd segment onward)
- ✅ classifies controller packages as rest-api
- ✅ falls back to path when no namespace is present

### javaGrouping

#### javaGrouping

##### resolveJavaComponent

- ✅ returns null for boilerplate files
- ✅ rolls up files by package folder under src/main/java
- ✅ falls back to namespace declaration when path layout is missing

### loadAnalysisConfig

#### loadAnalysisConfig

- ✅ returns defaults when no config file exists
- ✅ loads blueprint.config.json ignore and rollupModules
- ✅ loads blueprint.config.yml
- ✅ merges CLI ignore overrides onto file config

### modelExtractor.drillDown

#### ModelExtractor rollup drill-down

- ✅ tracks member filepaths and file-level nodes for folder rollups

### modelExtractor.reExports

#### ModelExtractor re-exports

- ✅ links barrel files to relative modules via export-from declarations

### modelExtractorHelpers

#### applyHydrationUpgrade

- ✅ upgrades node type when hydration has higher priority
- ✅ keeps existing type when hydration is lower priority

#### findComponentInMap

- ✅ prefers the container-hinted map key
- ✅ falls back to suffix match when hint misses

#### pushUniqueDependency

- ✅ dedupes identical edges

### nodeFileSystem

#### NodeFileSystemAdapter

- ✅ should verify file exists, write to files, and delete files
- ✅ should create directories and handle package.json name reading
- ✅ should support path and directory lookups

### nodeTypeHydrator

#### nodeTypeHydrator

- ✅ classifies UI packages as gateway-api
- ✅ classifies database imports and DbContext construction
- ✅ classifies event brokers from imports or class names
- ✅ classifies API controllers from imports or filename markers (language-agnostic)
- ✅ prefers rest-api over database when *Api.cs also has EF usings
- ✅ classifies IntegrationEventHandler paths as event-broker
- ✅ falls back to background-worker when no markers match
- ✅ hydrates an existing node in place
- ✅ maps dependency edge types from the target node

### parseArchlensArgv

#### parseArchlensArgv (git options)

- ✅ defaults to architecture with git forensics enabled
- ✅ disables git forensics with --no-git
- ✅ keeps git forensics enabled with --git
- ✅ treats --git-only as headless architecture plus forensics enrich
- ✅ parses --git-since
- ✅ parses --max-coupling-commit-files
- ✅ keeps architecture interactive when only --git is set
- ✅ forces interactive mode when ARCHLENS_INTERACTIVE=1
- ✅ exposes architecture flag overrides and keeps git on by default

#### parseArchlensArgv plan shape

- ✅ returns a typed plan object
- ✅ enables publish-after-scan with --publish
- ✅ forwards --skip-validation to publish-after-scan
- ✅ opts into a publish validation gate with --validate
- ✅ forwards --key-prefix and --workspace-name to publish-after-scan
- ✅ parses --system-name for multi-repo products
- ✅ strips update subcommand before parsing analysis flags
- ✅ treats scan subcommand as headless with config defaults
- ✅ treats --scan flag as headless
- ✅ keeps scan headless even when ARCHLENS_INTERACTIVE=1
- ✅ treats enrich subcommand as externals-only pass
- ✅ enables git forensics refresh with enrich --git
- ✅ treats --enrich-only flag like enrich subcommand

#### parseArchlensArgv update flags

- ✅ detects update subcommand and skip flag helpers

#### parseResilienceArgv

- ✅ parses resilience defaults and flags

### publishCatalog

#### Feature: Publish blueprint catalog from CI

- ✅ skips publish when blueprint validation fails
- ✅ publishes parseable files when --skip-validation is set
- ✅ returns a dry-run plan without touching object storage
- ✅ uploads through the storage port when dry-run is disabled
- ✅ reports when object storage is not configured

### publishRemoteCatalog

#### Feature: Resolve publish storage adapter

- ✅ returns null when only a read-only HTTP catalog is configured
- ✅ applies CLI bucket overrides on top of environment config

### pulumiDiscovery

#### discoverPulumiRoots

- ✅ ignores marketplace catalog YAML named pulumi.yaml that is not a Pulumi project
- ✅ finds a project with Pulumi.yaml and yaml resources
- ✅ collects TypeScript sources for nodejs runtime
- ✅ collects Python sources when runtime is nested under runtime.name
- ✅ skips nested projects under an outer root
- ✅ returns empty when no Pulumi projects exist
- ✅ uses the directory slug when the Pulumi project is the scan root

### pythonAnalyzer

#### PythonAnalyzer Strategy

- ✅ supports py
- ✅ creates node with default properties

### pythonDependencies

#### pythonDependencies

##### buildPythonModuleIndex

- ✅ indexes modules to container and component ids

##### isPythonSourcePath

- ✅ detects .py files

##### ModelExtractor integration

- ✅ links Python modules via absolute and relative imports

##### modulePathFromPythonFile

- ✅ maps src-layout modules
- ✅ maps flat package modules

##### resolvePythonImport

- ✅ resolves absolute imports
- ✅ resolves parent-relative imports
- ✅ ignores stdlib imports

### remoteCatalogRevision

#### computeRemoteCatalogRevisionId

- ✅ is stable for the same content regardless of input order
- ✅ changes when file content changes
- ✅ returns a 16-character hex prefix

### resilienceRun

#### resolveAdviceLensArtifactFormat

- ✅ uses explicit --format for structured artifacts
- ✅ defaults text+output to JSON for CI, unless the path is .yaml

### rollupDrillDown

#### rollupDrillDown

- ✅ builds file leaf entity refs under a rollup parent
- ✅ derives nested drill-down yaml paths from entity refs
- ✅ requires at least two member filepaths before emitting drill-down
- ✅ builds child component schemas for multi-file rollups
- ✅ builds nested drill-down schemas for multi-level folder rollups
- ✅ keeps outgoing dependencies to other rollups for external resolution
- ✅ rewrites cross-container deps to single-file rollup leaves onto the emitted rollup

### selfUpdate

#### releaseAssets

- ✅ maps darwin arm64 to macOS asset
- ✅ maps win32 x64 to windows zip

#### selfUpdate helpers

- ✅ resolves install dir from exec path
- ✅ adds --no-update-check and strips update subcommand
- ✅ matches runtime and language tree-sitter WASM filenames

### semver

#### semver

- ✅ parses v-prefixed tags
- ✅ compares patch versions
- ✅ detects newer versions

### sourceFileLister

#### SourceFileListerAdapter

- ✅ lists multi-language source files from the configured glob

### sourceFileWalk

#### listFilesForGlob

- ✅ returns repo-relative paths for matching extensions
- ✅ honours shouldSkip callback

#### parseForensicsGlobPattern

- ✅ parses brace expansion into extensions
- ✅ falls back to common extensions when pattern has no brace block

### sourcePathFilter

#### sourcePathFilter

- ✅ skips structural noise paths by default
- ✅ applies extra config ignore globs
- ✅ honours include allow-lists when provided
- ✅ still honours .gitignore via the composite filter

### startupUpdate

#### maybePromptAndSelfUpdate

- ✅ skips check in headless mode
- ✅ prompts and updates when user accepts
- ✅ does not update when user declines

#### runUpdateCommand

- ✅ exits when not a compiled release
- ✅ reports up to date when no newer release
- ✅ runs self-update when a newer release exists

### systemDiscovery

#### systemDiscovery

- ✅ extracts workspace roots from globs
- ✅ parses npm and pnpm workspace declarations
- ✅ discovers a product hub plus workspace/standalone spokes
- ✅ withProductHub does not link different products together
- ✅ respects explicit systems config override and still adds a product hub
- ✅ pins a single-repo scan to a named system under a shared product hub
- ✅ reads app/package.json when the repo root has no package manifest
- ✅ falls back to a single system when no workspaces or standalone packages exist
- ✅ partitions repo-wide files onto a named multi-repo system instead of the product hub
- ✅ partitions files by longest matching system root
- ✅ resolveProductIdForPath uses the same longest-prefix rules as code partitioning
- ✅ planIacContextSystems nests sibling modules under their shared parent folder
- ✅ planIacContextSystems folds modules into the product hub when one exists
- ✅ normalizeContextGrouping collapses orphan folder groups and promotes hubs
- ✅ normalizeContextGrouping drops empty folder groups nested under a product hub
- ✅ pruneEmptyProductHubs removes orphaned infrastructure frames

### terraformDiscovery

#### discoverTerraformRoots

- ✅ finds a root with .tf files and skips nested module dirs
- ✅ uses infrastructure systemId when scan root itself has .tf files
- ✅ returns empty when no terraform files exist

### testPath

#### detectTestFramework

- ✅ detects JS/TS frameworks from imports
- ✅ detects Python frameworks
- ✅ detects .NET frameworks
- ✅ detects Java/Kotlin frameworks
- ✅ detects Go testing stdlib and testify
- ✅ detects jest from path token when no imports
- ✅ returns null for production code with no test imports

#### testPath

- ✅ marks unit test files and test directories
- ✅ marks .NET, Go, Java, and Python test conventions
- ✅ recognises dedicated test-project folder segments

### treeSitterComplexity

#### TreeSitterComplexityAdapter

- ✅ computes cyclomatic complexity for TypeScript and Python
- ✅ skips missing files and logs a warning

### treeSitterForensics

#### collectFunctionComplexitySlices

- ✅ splits TypeScript methods into per-function AST slices

#### extractRelativeImportsFromTree

- ✅ collects relative TypeScript import specifiers
- ✅ collects relative Python import_from specifiers

#### TreeSitterScanCache

- ✅ stores and retrieves parsed trees by normalized path

### treeSitterParser

#### TreeSitterParserAdapter

- ✅ should parse imports, instantiations, and calls from TypeScript files
- ✅ should parse imports, instantiations, and calls from Python files
- ✅ should parse imports, instantiations, and calls from C# files
- ✅ should parse imports, package, and calls from Java files
- ✅ should parse imports, package clause, and calls from Go files
- ✅ records C# object creation and base types, not parameter or field type annotations

### treeSitterWasmPaths

#### treeSitterWasmPaths

- ✅ resolves c_sharp WASM from the installed tree-sitter-wasms package
- ✅ includes the compiled binary directory in search paths
- ✅ deduplicates search dirs
- ✅ returns null when no WASM exists for the language
- ✅ resolves runtime tree-sitter.wasm from the web-tree-sitter package

### tsMorphParser

#### TsMorphParserAdapter

- ✅ should parse imports, instantiations, and calls from TypeScript files
- ✅ should identify test files correctly
- ✅ should include files under test directories and mark them as tests
- ✅ should parse export-from re-exports on barrel files

### typescriptAnalyzer

#### TypeScriptAnalyzer Strategy

- ✅ supports ts, tsx, js, jsx
- ✅ creates node with correct properties
- ✅ computes container info correctly

### typescriptGrouping

#### typescriptGrouping

##### isTypeScriptSourcePath

- ✅ detects TS/JS paths case-insensitively

##### resolveRelativeTypeScriptImportPath

- ✅ resolves sibling and parent-relative imports

##### resolveTypeScriptComponent

- ✅ returns null for boilerplate files
- ✅ rolls up monorepo package paths by folders under src
- ✅ keeps package src-root files as leaf components
- ✅ keeps simple-repo leaf files under a single src folder
- ✅ rolls up files in the same folder to one component
- ✅ uses the parent folder when the file name matches the folder (index-style)

##### resolveTypeScriptImportComponentId

- ✅ maps import specifiers to rolled-up component ids

##### shouldSkipTypeScriptFile

- ✅ skips config, declaration, and setup boilerplate
- ✅ skips e2e and unit test trees under packages
- ✅ keeps architectural sources

### updateCheck

#### checkForUpdate

- ✅ returns null when already on latest
- ✅ returns availability when newer release exists

#### resolveLatestTag

- ✅ uses cache when fresh
- ✅ refreshes stale cache

#### shouldCheckForUpdates

- ✅ checks only interactive release binaries
- ✅ skips dev builds and update subcommand

### validateDiffArgv

#### parseArchlensCommand

- ✅ routes validate and diff subcommands
- ✅ routes publish subcommand

#### parseDiffArgv

- ✅ defaults baseline and current to blueprints when omitted
- ✅ accepts positional baseline and current paths
- ✅ accepts flag overrides

#### parsePublishArgv

- ✅ defaults to blueprints with dry run enabled and validation skipped
- ✅ accepts workspace name and disables dry run
- ✅ keeps --skip-validation as an explicit allow even with --validate
- ✅ opts into a hard validation gate with --validate

#### parseValidateArgv

- ✅ defaults to blueprints/ with health-only mode
- ✅ accepts positional path and json format
- ✅ enables contract mode and commit baseline flags
- ✅ defaults bare --since-commit to HEAD~1

### version

#### version

- ✅ returns embedded build version
- ✅ detects --version and -V

#### version (dev build)

- ✅ treats dev as non-release

### watchAndRerun

#### resolveWatchOptions

- ✅ reads output dir and debounce from plan

#### watchAndRerun

- ✅ runs once then reruns on watcher events with frozen state
- ✅ passes output dir into watch ignore patterns via frozen state

### watchMode

#### buildWatchIgnorePatterns

- ✅ ignores blueprint output directory relative to scan root
- ✅ ignores absolute output outside scan root

#### createDebouncer

- ✅ coalesces rapid calls

#### parseArchlensArgv watch flags

- ✅ parses --watch and --watch-debounce

### workspacePackages

#### ModelExtractor workspace package imports

- ✅ creates inter-container edges for workspace package imports
- ✅ resolves workspace package subpath imports to target components
- ✅ does not treat Node built-ins as local cross-container imports
- ✅ still resolves relative imports within and across containers

#### workspace package imports and externals pass

- ✅ materializes cross-container package targets as externals on component diagrams

#### workspacePackages

- ✅ detects relative imports
- ✅ extracts scoped and unscoped package names from module specifiers
- ✅ builds a package-name → container-id index from source paths and package.json names

## Core

### adviceLensArtifact

#### evaluateAdviceLensGate

- ✅ passes when worst SLA meets the threshold
- ✅ fails when worst SLA is below the threshold
- ✅ fails on recommendations only when fail-on-recommendations is set

#### serializeEstateResilienceReport

- ✅ emits a versioned AdviceLens artifact with JSON-safe heat maps
- ✅ buildAdviceLensArtifact accepts recommendation-only UI exports
- ✅ formats the artifact as YAML for studio / human-readable export

### advicelensStressFixtures

#### advicelens-stress fixtures

- ✅ loads every scenario YAML from samples/advicelens-stress/
- ✅ composite-risk emits both chaos and tracelens recommendations with forensics
- ✅ knowledge-silo scenario includes refactor-oriented forensics without requiring chaos
- ✅ component drill-down carries code-level hotspot forensics

### architectureHealth

#### assessArchitectureHealth

- ✅ reports actionable direct-call cycles and ignores wiring-only broken refs
- ✅ does not fail health for cycles that only close via external proxies
- ✅ treats inter-container mutual edges as informational
- ✅ reports hotspot and knowledge-silo findings with remediation
- ✅ reports heating when short-window churn accelerates
- ✅ is healthy when there are no actionable cycles or forensics concerns

#### compareArchitectureHealth

- ✅ detects deterioration when new actionable cycles and hotspots appear
- ✅ does not treat new informational cycles as deterioration
- ✅ is not deteriorated when debt is unchanged or improved

### blastRadius

#### computeBlastRadius

- ✅ marks the faulted node at full severity and propagates upstream to callers
- ✅ decays heat with distance from the fault origin
- ✅ stops upstream propagation when a circuit breaker is enabled on an intermediate node
- ✅ reduces propagated severity when local cache is enabled on a caller
- ✅ returns empty impact when the faulted node is unknown

### buildRecommendations

#### buildRecommendations

- ✅ merges resilience and composite-risk recommendations for a simulated diagram
- ✅ rolls composite-risk recommendations up to the container for code-level nodes
- ✅ includes refactor boundary recommendations when provided

#### buildResilienceRecommendations

- ✅ emits caller-targeted circuit-breaker recommendations for structural SPOFs
- ✅ skips circuit-breaker recommendations on component-level diagrams

### buildWorkspaceCatalogFromYaml

#### buildWorkspaceCatalogFromYamlFiles

- ✅ parses YAML, resolves refs, and emits navigation catalog entries
- ✅ reports skipped invalid files via onInvalid
- ✅ throws when no valid schemas remain

#### parseWorkspaceCatalogJson

- ✅ accepts a valid catalog payload
- ✅ rejects empty or malformed payloads

### catalogPrune

#### Feature: catalog prune planning

- ✅ groups snapshot and fragment keys and leaves latest/overlays alone
- ✅ always keeps the latest revision even when older than the day window
- ✅ keeps snapshots that are within the day window even beyond count
- ✅ keeps only the newest N fragment runs per fragmentKey
- ✅ never schedules latest or overlays for deletion

### chaoslensStressFixtures

#### chaoslens-stress external simulation scope

- ✅ loads the external-scope sandbox pair from samples/chaoslens-stress/
- ✅ materializes unresolved dependency endpoints from the workspace
- ✅ materializes workspace auth and propagates blast when faulting the external dependency
- ✅ materializes auth when simulating the API that depends on it
- ✅ expands through the auth proxy into its home diagram and faults session-db

#### chaoslens-stress fixtures

- ✅ loads every scenario YAML from samples/chaoslens-stress/
- ✅ 'e-commerce dual entry + preset API ci…'
- ✅ 'shared hub fan-out with preset hub sa…'
- ✅ 'safeguards bulkhead contains leaf fau…'
- ✅ 'group boundary expansion propagates t…'
- ✅ 'deep chain bulkhead contains leaf fau…'
- ✅ 'diamond DAG merges parallel paths'
- ✅ 'multi-domain cross-cutting payment'
- ✅ 'large graph partial blast radius with…'
- ✅ runs all scenarios within the KR3 latency budget

### chaosRiskContext

#### buildChaosRiskContextMap

- ✅ returns empty map when simulation is missing
- ✅ marks high blast nodes as on critical path

### chaosSpecCatalog

#### mergeChaosSpecCatalogEntries

- ✅ dedupes by id with later sources winning

#### resolveChaosSpecCatalogAvailability

- ✅ is available when diagramRef resolves in the workspace catalog
- ✅ is diagram-missing when the target diagram is absent

#### sortChaosSpecCatalogEntries

- ✅ orders by name then id

#### toChaosSpecCatalogEntry

- ✅ maps document metadata and fault count onto a catalog row

### chaosSpecDocument

#### ChaosSpec document

- ✅ publishes JSON Schema with a versioned $id
- ✅ parses the payment-outage example spec
- ✅ maps a document to runtime ChaosSpec and Monte Carlo config
- ✅ runs simulation against the referenced ecommerce blueprint
- ✅ rejects invalid fault types
- ✅ validates diagramRef against the active diagram
- ✅ accepts fault targets on dependency endpoints not yet materialized as nodes
- ✅ round-trips the payment-outage example through serialize
- ✅ builds and serializes a scenario document
- ✅ rejects building a document with no faults

### chaosSpecs

#### chaos-specs fixtures

- ✅ loads every ChaosSpec YAML in chaos-specs/
- ✅ deep-chain-leaf-outage.yaml validates and converts against its target diagram
- ✅ diamond-cache-outage.yaml validates and converts against its target diagram
- ✅ ecommerce-api-latency.yaml validates and converts against its target diagram
- ✅ external-scope-auth-outage.yaml validates and converts against its target diagram
- ✅ golden-journey-payment-gateway-outage.yaml validates and converts against its target diagram
- ✅ group-boundary-db-outage.yaml validates and converts against its target diagram
- ✅ large-graph-orders-outage.yaml validates and converts against its target diagram
- ✅ multi-domain-payment-db-outage.yaml validates and converts against its target diagram
- ✅ payment-outage.yaml validates and converts against its target diagram
- ✅ safeguards-ledger-outage.yaml validates and converts against its target diagram
- ✅ shared-hub-inventory-outage.yaml validates and converts against its target diagram

### churnAcceleration

#### churnAccelerationRatio

- ✅ compares 30d churn to the long-window monthly average
- ✅ returns null when either window has no churn

#### churnAccelerationTone

- ✅ escalates tone for high acceleration

#### formatChurnAcceleration

- ✅ formats ratios for display

### classifyFile

#### classifyFile

- ✅ classifies hotspot when score meets threshold
- ✅ classifies knowledge silo for complex single-author files
- ✅ classifies knowledge silo when dominant author exceeds threshold
- ✅ does not treat never-touched files as silos
- ✅ can apply both classifications
- ✅ returns empty when neither applies

### compareBlueprintTrees

#### compareBlueprintTrees

- ✅ reports added and removed files
- ✅ reports unchanged files when schemas match

### compareSystemSchemas

#### compareSystemSchemas

- ✅ returns empty diff for identical schemas
- ✅ detects added, modified, and deleted nodes

### compositeRisk

#### computeChaosRefactorMultiplier

- ✅ boosts nodes on critical paths with weak safeguards

#### computeCompositeRiskScore

- ✅ multiplies clamped hotspot and blast scores

#### computeEffectiveRefactorScore

- ✅ scales base refactor score by chaos multiplier

### containerDiagramScope

#### containerDiagramScope

- ✅ finds the app container diagram for a nested component diagram
- ✅ collects sibling app containers from parent container dependencies

#### forensics overview externals

- ✅ suggests app-level containers for the forensics component diagram
- ✅ classifies cli as a caller using workspace container dependencies
- ✅ groups overview externals into caller and target bands

### contextDeclaration

#### assembleContextDeclaration

- ✅ builds personas, system anchors, and third-party externals with synthesized edges
- ✅ serializes a YAML seed with metadata description
- ✅ derives names from entityRef when omitted
- ✅ hydrates the committed ArchLens blueprints context seed

### contextHydration

#### context ownership helpers

- ✅ treats product personas and third-parties as author-owned
- ✅ classifies systems by contextOwnership, with sparse unmarked as author

#### hydrateContextSchema

- ✅ creates a context with scan systems and a fallback context actor when base is missing
- ✅ sticks a landscape-level author anchor onto the scan system leaf
- ✅ hydrates a sparse system anchor and preserves personas and third-parties
- ✅ prunes in-scope scan-owned orphans but not other repos or author anchors
- ✅ upserts proposed third-parties without removing declared ones
- ✅ drops dangling dependencies when an orphan is pruned
- ✅ does not draw fallback User Uses edges to third-party vendors

### csprojReferences

#### csprojReferences

##### csprojBasename

- ✅ strips directory and extension

##### parseCsprojProjectReferences

- ✅ extracts ProjectReference Include paths
- ✅ ignores PackageReference and other ItemGroup entries
- ✅ returns empty array when no project references exist

##### resolveCsprojReferencePath

- ✅ resolves relative paths from a csproj file location

### cyclomaticComplexity

#### countCyclomaticComplexity

- ✅ counts TypeScript decision points from a representative fixture
- ✅ counts Python control flow and boolean operators
- ✅ counts Java switch labels and ternary expressions
- ✅ counts Go cases and logical operators
- ✅ counts C# conditional expressions and case labels
- ✅ returns base complexity for empty walks

### dependencyCycles

#### canonicalCycleKey

- ✅ normalizes rotations of the same cycle

#### collectDependencyCycles

- ✅ marks non-external direct-call cycles as actionable
- ✅ marks cycles through external proxies as informational
- ✅ marks inter-container / read-write-only cycles as informational
- ✅ dedupes the same cycle path across diagrams

#### findSimpleCycles

- ✅ finds a mutual direct-call cycle

### dependencySemantics

#### dependencySemantics

- ✅ maps every DependencyType to semantics
- ✅ identifies publish-subscribe as async-stream
- ✅ treats provisions as non-runtime provisioning (no availability propagation)

### describeChaosRiskContext

#### describeChaosRiskContext

- ✅ summarizes critical-path blast exposure
- ✅ includes SPOF and safeguard gaps

### displayName

#### displayNameFromEntityRef

- ✅ title-cases the entityRef leaf

#### preferDisplayName

- ✅ prefers explicit over derived and keeps the first explicit on conflict
- ✅ honors displayNameSource stamps when a curated name matches the derived form

#### resolveDisplayName

- ✅ keeps explicit names and derives when omitted

### entityRef

#### entityRef Rules

##### buildBreadcrumbSegments

- ✅ builds ancestor and current segments from entityRef prefixes
- ✅ assigns C4 levels from entityRef depth
- ✅ appends a zoom preview segment when provided

##### deriveSharedContextNamespace

- ✅ returns the sole context entityRef when only one context diagram exists
- ✅ returns undefined when sibling contexts have no shared namespace prefix

##### entityRefParentPrefix

- ✅ returns the parent prefix for nested entityRefs
- ✅ returns the context root for top-level container entityRefs
- ✅ returns undefined for the context diagram itself

##### getSchemaEntityRef

- ✅ should return id/entityRef if it is set
- ✅ should fallback to workspaceName or schema.name when entityRef/id is default

##### isEntityRef

- ✅ should identify valid entity references and filter out file paths

##### NEXT_C4_LEVEL

- ✅ maps each C4 level to the next

##### resolveShortEntityRef

- ✅ should append short refs under a scoped systemId
- ✅ should not double-prefix when systemId is the context root
- ✅ should prefix with context when systemId is a local container slug
- ✅ should pass through existing FQNs

##### resolveWorkspaceEntityRefs

- ✅ should correctly resolve FQN references across container and component hierarchies
- ✅ should correctly resolve FQN references using schema entityRef parent linkage
- ✅ should prefix all levels with context slug when a context file is present
- ✅ should not double-prefix stale dependency refs on context diagrams
- ✅ keeps diagram-root group entityRef when only one context diagram is loaded

### estateFragment

#### Feature: compose estate fragments into one YAML tree

- ✅ Scenario: keeps the freshest run per fragmentKey
- ✅ Scenario: selects freshest manifests without needing object bodies
- ✅ Scenario: later fragment wins for non-context paths
- ✅ Scenario: merges context.yaml by entityRef preferring explicit display names
- ✅ Scenario: keeps the first explicit name when two fragments disagree
- ✅ rejects empty input and mixed estates

#### Feature: estate fragment keys and paths

- ✅ sanitizes fragment key segments and builds storage keys
- ✅ detects context.yaml paths for entityRef merge
- ✅ round-trips fragment manifests

### estateScenarios

#### buildDefaultEstateScenarios

- ✅ includes region-outage scenarios for each service node
- ✅ includes a fan-in latency probe for the shared API dependency
- ✅ includes publisher outage scenarios for pub-sub publishers

### evidenceCitations

#### listEvidenceCitations

- ✅ lists stable keys for forensics and simulation evidence
- ✅ returns empty list for empty evidence

### executiveTelemetry

#### buildExecutiveTelemetrySummary

- ✅ describes unchanged availability when SLA is unaffected
- ✅ summarizes degraded availability without entity refs
- ✅ mentions structural SPOFs in plain language

#### riskLevelFromSla

- ✅ maps SLA bands to risk levels

### externalNodeLayout

#### externalNodeLayout

- ✅ classifies upstream and downstream externals from dependency direction
- ✅ places upstream externals above and downstream externals below internals
- ✅ lays out externals in one horizontal row even when the internal graph is narrow
- ✅ orders downstream externals by connected internal x (barycenter) to limit crossings
- ✅ updates only external nodes when positioning on a diagram
- ✅ leaves external-only diagrams alone so nodes stay freely movable
- ✅ places downstream externals below a packed group, not inside its children

### externalScope

#### externalScope

- ✅ resolves parent C4 display level for each diagram level
- ✅ rolls component refs up to container level using the workspace index
- ✅ suggests container-level neighbors only on component diagrams
- ✅ groups overview externals into caller and target bands
- ✅ computes aggregated hub edges to internal nodes only
- ✅ filters overview externals to 1-hop selection neighbors
- ✅ exposes stable hub ids per band

### functionComplexity

#### countCognitiveComplexity

- ✅ adds nesting penalty for nested control flow

#### summarizeFunctionComplexitySlices

- ✅ uses file fallback when no function slices exist
- ✅ tracks peak across function slices

### gitHistory

#### aggregateFileHistory

- ✅ computes churn, authorCount, and topAuthorPercent
- ✅ includes churnByWeek when sinceDays is provided
- ✅ filters churn to a shorter window when windowDays is set
- ✅ aggregates lineChurn from commit numstat when present

#### computeChurnByWeek

- ✅ buckets commits into weekly counts oldest-first

#### filterCommitsInWindow

- ✅ keeps only commits within the window

### goldenJourneyFixture

#### golden-journey estate fixture

- ✅ loads estate, platform, and component YAML
- ✅ component diagrams expose richer internal graphs
- ✅ models temporal coupling on Payment Client for Coupling lens demos
- ✅ models product personas linked to each platform on the estate
- ✅ links product personas to the estate in context diagram
- ✅ models related product groups in one estate diagram
- ✅ ranks add-circuit-breaker on Checkout API after Payment Gateway outage
- ✅ does not target personas with circuit-breaker advice on the context diagram
- ✅ propagates blast through checkout group boundary to entry points
- ✅ estate resilience sweep includes the golden journey estate

### graph

#### dedupeDependencies

- ✅ keeps the first edge for each from→to pair

#### Graph Validation & Cycle Detection

- ✅ should validate a clean, acyclic graph
- ✅ should detect a direct cycle (A -> A)
- ✅ should detect a multi-node cycle (A -> B -> C -> A)
- ✅ should detect cycles in disconnected subgraphs

#### resilience graph

- ✅ expands group targets on dependency edges
- ✅ maps callers to expanded group children
- ✅ does not treat provisions edges as availability callers
- ✅ resolves group fault targets to child nodes
- ✅ propagates fault impact to callers through group boundaries

#### toSystemSchemaJsonSchema

- ✅ exports Draft-07 JSON Schema as a v4 object document with metadata

#### YAML Schema Parsing and Serialization

- ✅ should parse valid v3 YAML into SystemSchema model
- ✅ should throw validation errors for YAML with invalid node types
- ✅ should throw validation errors for YAML with malformed node IDs
- ✅ should serialize SystemSchema model to a v4 object with metadata
- ✅ should round-trip metadata.source provenance in YAML
- ✅ should parse v4 YAML with metadata into SystemSchema
- ✅ rejects legacy object-root YAML without metadata
- ✅ rejects legacy sequence-root YAML
- ✅ should parse and serialize isTest flag
- ✅ should serialize SystemSchema model to valid Mermaid code and handle keyword conflicts
- ✅ serializes group children into subgraph blocks
- ✅ should accept container node type from CLI-generated schemas

##### C4 Model Validation & Serialization Extensions

- ✅ should parse C4 properties from valid v3 YAML schema
- ✅ ignores unknown fields at document root
- ✅ should reject path-style schema identity
- ✅ should serialize C4 properties to valid YAML and Mermaid
- ✅ should parse and round-trip node forensics
- ✅ should reject invalid forensics classifications

##### flat parentEntityRef wire format

- ✅ parses and serializes group children with parentEntityRef

### hotspotScoring

#### computeHotspotScores

- ✅ returns empty map for empty input
- ✅ scores the red-zone file highest
- ✅ uses structural-only scores when churn is flat zero
- ✅ prefers line churn over commit churn when present

### iacExternalSignificance

#### classifyIacResource

- ✅ classifies Cloudflare Pages as a primary product
- ✅ classifies Cloudflare R2 bucket as a primary product
- ✅ classifies DNS, Pages domains, CORS, and custom domains as supporting
- ✅ classifies zone data sources as noise
- ✅ classifies AWS Lambda, S3, and RDS as primary products
- ✅ classifies AWS IAM and networking helpers as supporting
- ✅ classifies Azure and GCP primaries
- ✅ returns null for providers outside known packs

#### infrastructureServesOf

- ✅ reads serves membership from an infrastructure spoke
- ✅ returns empty when role is not infrastructure

#### projectMeaningfulIacExternals

- ✅ projects container primaries and a single context vendor for Cloudflare
- ✅ projects multiple vendors from one Pulumi stack
- ✅ passes through resources outside known vendor packs
- ✅ dogfoods ArchLens Cloudflare Pulumi source into meaningful externals
- ✅ projects multi-provider Pulumi TypeScript in one stack

### iacImport

#### defaultIacPathForKind

- ✅ returns virtual paths for paste imports

#### detectIacSourceKind

- ✅ detects terraform hcl from path and content
- ✅ detects pulumi yaml from project file name
- ✅ detects pulumi typescript from imports
- ✅ detects pulumi python from path before import heuristics

#### inferPulumiRuntime

- ✅ reads nested runtime.name from project metadata

#### parseIacBatchToSchema

- ✅ merges multiple terraform files
- ✅ rejects mixed terraform and pulumi vendors
- ✅ uses pulumiRuntime to parse imperative stacks without project metadata
- ✅ infers pulumiRuntime from Pulumi.yaml when not passed explicitly

#### parseIacToSchema

- ✅ parses terraform hcl through the unified entrypoint
- ✅ parses pulumi yaml through the unified entrypoint
- ✅ parses pulumi python through the unified entrypoint

#### vendorForKind

- ✅ maps kinds to vendors

### iacResourceMap

#### mapProviderTypeToNodeType

- ✅ maps aws_rds_instance → relational-database
- ✅ maps azurerm_mssql_database → relational-database
- ✅ maps google_sql_database_instance → relational-database
- ✅ maps aws_dynamodb_table → database
- ✅ maps aws_elasticache_cluster → cache-store
- ✅ maps azurerm_redis_cache → cache-store
- ✅ maps aws_msk_cluster → event-broker
- ✅ maps aws_sns_topic → event-broker
- ✅ maps aws_sqs_queue → event-broker
- ✅ maps aws_lambda_function → serverless-function
- ✅ maps google_cloudfunctions_function → serverless-function
- ✅ maps azurerm_function_app → serverless-function
- ✅ maps aws_ecs_service → microservice
- ✅ maps azurerm_container_app → microservice
- ✅ maps aws_lb → gateway-api
- ✅ maps aws_api_gateway_rest_api → gateway-api
- ✅ maps aws_cloudfront_distribution → gateway-api
- ✅ maps cloudflare_pagesproject → gateway-api
- ✅ maps cloudflare_index_pagesproject → gateway-api
- ✅ maps cloudflare_r2bucket → rest-api
- ✅ maps cloudflare_index_r2bucket → rest-api
- ✅ maps cloudflare_dnsrecord → container
- ✅ maps cloudflare_r2customdomain → container
- ✅ defaults unknown types to container and marks unknown

### importCoupling

#### buildImportCoupling

- ✅ maps direct imports to resolved targets within the scan set
- ✅ deduplicates and skips self-imports

### importExtraction

#### extractRelativeImports

- ✅ extracts TypeScript relative imports
- ✅ extracts Python relative imports
- ✅ extracts Go relative imports
- ✅ extracts Java relative imports

### infraSchemaMap

#### addressToDisplayName

- ✅ formats Terraform addresses as hyphenated-type.local-name

#### infraIrToSchema display names

- ✅ uses the Terraform address as the node name

### integrityRadius

#### computeIntegrityRadius

- ✅ marks broker and peer subscribers when a publisher faults
- ✅ marks all pub-sub clients when the broker faults
- ✅ returns empty impact when the faulted node is unknown

### layoutMerge

#### hasCompleteSavedLayout

- ✅ is false when any node lacks coordinates
- ✅ is true only when every node is positioned

#### hasFinitePosition

- ✅ requires finite x and y

#### nodesNeedingLayout

- ✅ returns nodes missing a finite position

#### seedPreservedPositions

- ✅ copies finite positions and strips coords from new nodes

### locMetrics

#### countLocAndSloc

- ✅ counts physical and source lines

### mermaidImport

#### extractMermaidFromMarkdown

- ✅ extracts the first mermaid fenced block
- ✅ is case-insensitive on the fence language tag
- ✅ returns trimmed input when no fence is found
- ✅ returns trimmed input when fence opener has non-whitespace junk
- ✅ skips an invalid mermaid-prefixed fence and uses a later valid one

#### parseMermaidToSchema - C4

- ✅ parses C4Context with Person, System, and Rel
- ✅ parses C4Container with ContainerDb and external systems
- ✅ parses C4Component diagram
- ✅ parses directed Rel variants and ignores malformed Rel lines

#### parseMermaidToSchema - flowchart

- ✅ parses a simple graph TD with nodes and edges
- ✅ parses labeled edges with descriptions
- ✅ parses publish-subscribe edges from dotted arrows
- ✅ infers event-broker from diamond shape
- ✅ parses subgraph blocks into group nodes with parentEntityRef
- ✅ defaults component type at component level
- ✅ strips person emoji and (External) suffix from flowchart labels
- ✅ throws on unrecognised diagram type

### narrateRecommendations

#### narrateRecommendations

- ✅ returns input unchanged without a narrator
- ✅ attaches narration from a narrator without changing priority or evidence

### nodeOwnership

#### nodeOwnership

- ✅ treats C4 persons and product personas as human actors
- ✅ detects third-party classification
- ✅ treats workspace proxies separately from vendors

### nodeResilience

#### nodeResilience

- ✅ reads flat top-level node.resilience safeguards
- ✅ returns empty safeguards for missing resilience
- ✅ formats only enabled safeguards and omits empty payloads
- ✅ applies safeguard toggles and merges session overrides
- ✅ writes flat top-level resilience

### nodeRoles

#### nodeRole

- ✅ maps every NodeType to a role
- ✅ classifies user-facing and async roles
- ✅ ranks user-facing above data stores for merge precedence

### ownership

#### buildOwnershipBreakdown

- ✅ derives concentration from authors list
- ✅ classifies solo ownership

#### rollupForensicAuthors

- ✅ sums commits per email across children

### parentChildLayout

#### parentChildLayout

- ✅ topLevelNodes excludes nodes with parentEntityRef
- ✅ buildParentChildEdges maps parentEntityRef to layout edges
- ✅ converts between absolute and relative positions
- ✅ fitGroupBounds wraps children with padding
- ✅ applyRelativePositionsAfterLayout stores child coords relative to parent
- ✅ resolveGroupContentLayout packs children inside the frame
- ✅ packGroupChildren prefers balanced rows for five children
- ✅ packGroupChildren lays out multiple children in a row without overlap
- ✅ hasGroupedLayout detects group and parent-child nodes
- ✅ stripLayoutCoordinates removes position

### path

#### Domain Path Utilities

##### getFileName

- ✅ should extract filename correctly from paths

##### resolveRelativePath

- ✅ should resolve standard relative files in same folder
- ✅ should resolve subfolders correctly
- ✅ should traverse up directories using ..
- ✅ should return absolute path if input is absolute or web url

### pulumiImport

#### extractPulumiFromMarkdown

- ✅ extracts the first yaml/yml/pulumi fenced block
- ✅ accepts bare fences and yml/pulumi language tags
- ✅ returns trimmed input when no fence is found

#### parsePulumiBatchToSchema

- ✅ merges resources across files and resolves cross-file refs
- ✅ fails on duplicate addresses across files

#### parsePulumiToSchema - Python

- ✅ maps gcp resources from Python source
- ✅ maps submodule imports like pulumi_gcp.compute.Network
- ✅ maps aws resources from aliased Python imports

#### parsePulumiToSchema - TypeScript

- ✅ maps new aws resources from TypeScript source

#### parsePulumiToSchema - YAML

- ✅ maps a single lambda resource to a scoped node
- ✅ creates an edge from a property reference
- ✅ creates an edge from dependsOn in options
- ✅ marks get resources as external data sources
- ✅ warns and defaults unknown resource types
- ✅ warns on unresolved refs without failing
- ✅ returns empty schema for project metadata only
- ✅ throws on invalid YAML

### pulumiStack

#### pulumiStack

- ✅ accepts real Pulumi project metadata and rejects marketplace docs named pulumi.yaml
- ✅ keeps only Python program files for python runtime
- ✅ keeps YAML resources for yaml runtime and skips stack config files
- ✅ parses imperative Python stacks without project metadata YAML

### refactorBoundary

#### buildRefactorBoundary

- ✅ expands a component seed via temporal coupling
- ✅ builds container rollup from high-refactor children
- ✅ flags cross-container members
- ✅ returns undefined when seed is missing

### refactorScore

#### computeRefactorScore

- ✅ weights complexity, churn, and distributed ownership
- ✅ treats missing ownership as zero concentration

### refactorSuggestions

#### buildRefactorSuggestions

- ✅ suggests extracting shared logic when files are highly coupled
- ✅ suggests splitting by container when boundary spans containers
- ✅ suggests adding a second owner for knowledge silos or solo ownership
- ✅ suggests coordinating ownership when ownership is distributed
- ✅ orders suggestions by priority descending

### remoteCatalogSnapshot

#### Feature: Atomic snapshot materialization

- ✅ places latest pointer last so upload can cut over safely

#### Feature: Parse published catalog manifests

- ✅ round-trips a valid snapshot manifest
- ✅ rejects invalid payloads

#### Feature: Remote catalog snapshot contract (ADR-0010)

##### Scenario: Invalid corpus is rejected before publish

- ✅ normalizes Windows-style paths and rejects duplicates

##### Scenario: Successful publish builds an immutable snapshot

- ✅ builds snapshot manifest, latest pointer, and upload object keys

#### parseRemoteCatalogLatestPointer

- ✅ round-trips a valid latest pointer

#### remote catalog path helpers

- ✅ builds stable manifest keys

#### serializeWorkspaceCatalog

- ✅ emits trailing newline JSON

### resilienceAdviceEligibility

#### isEstateResilienceDiagramLevel

- ✅ includes context and container diagrams
- ✅ excludes component and code diagrams from estate resilience simulation

#### isResilienceAdviceTarget

- ✅ allows calling application services and workers
- ✅ excludes shared infrastructure and data stores
- ✅ excludes IaC-imported resources
- ✅ excludes structural component and code-module nodes
- ✅ excludes human actors and third-party vendors

#### isResilienceSimulationDiagramLevel

- ✅ matches estate resilience diagram levels

#### resolveAdviceApplicability

- ✅ keeps eligible nodes as their own scope
- ✅ rolls code-level contributors up to the owning container

### resolveImportPath

#### resolveRelativeImport

- ✅ resolves exact paths and extension/index candidates
- ✅ returns null for package or unresolved imports
- ✅ normalizes parent directory segments
- ✅ resolves Python dot-style specifiers

### rollupCoupledFiles

#### rollupTopCoupledFiles

- ✅ returns highest-scoring coupled peers across children

### runEstateResilience

#### runEstateResilience

- ✅ runs default scenarios and returns ranked recommendations for a stress fixture
- ✅ returns resilience recommendations for degraded SLAs on the e-commerce topology

#### runEstateResilience diagram level gating

- ✅ skips chaos scenarios for component-level diagrams but still returns forensics recommendations

#### runEstateResilience workspace enrichment

- ✅ uses loadedSystems to enrich simulations through proxy boundaries

### schema

#### End-to-End Schema Validation Test

- ✅ should naturally flow slugified strings through integrated dependency configurations

#### EntityRef Utilities with Unified Parsing

##### getImpactedDomainGroup()

- ✅ uses the prefix for two-segment refs
- ✅ uses the parent container segment for workspace-qualified refs

##### getLevel()

- ✅ should resolve C4 levels perfectly from slugified outputs
- ✅ should throw an error if evaluated path exceeds 4 segments or has no segments

##### leaf()

- ✅ should correctly retrieve the last segment from an EntityRef

##### parse()

- ✅ should correctly parse and slugify a root context reference when parent is not provided
- ✅ should correctly parse, slugify, and nest under parent reference when parent is provided
- ✅ should throw an error if the value input is missing or empty

#### slugify Helper Utility

- ✅ should transform spaces to hyphens and drop special characters

### schemaMerge

#### applyImportMergePlan

- ✅ merges additions without touching existing nodes
- ✅ skips conflicting nodes by default
- ✅ overwrites conflicting nodes when resolution is overwrite
- ✅ preserves forensics and properties when overwriting
- ✅ renames conflicting nodes when resolution is rename
- ✅ deduplicates identical edges

#### computeImportMergePlan

- ✅ identifies additions when imported nodes are new
- ✅ detects conflicts when entityRef matches but fields differ
- ✅ treats identical nodes as unchanged

### schemaVersion

#### schemaVersion

- ✅ builds versioned and latest public URLs
- ✅ parses schema contract majors from URLs and legacy semver
- ✅ assessSchemaVersion returns null when compatible
- ✅ assessSchemaVersion flags legacy semver and older majors
- ✅ assessSchemaVersion flags newer majors
- ✅ assessSchemaVersion flags unrecognized version strings
- ✅ builds a fetchable language-server URL and directive

### simulation

#### detectSpofCallSites

- ✅ returns callers for shared dependencies without circuit breakers

#### detectSpofs

- ✅ flags shared dependencies with multiple callers and no circuit breaker
- ✅ excludes nodes that already have a circuit breaker safeguard configured

#### runResilienceSimulation

- ✅ computes degraded SLA for entry points affected by blast radius
- ✅ reports full SLA when no faults are configured
- ✅ merges blast radius across multiple simultaneous faults
- ✅ keeps entry-point SLA healthy when a publisher faults but marks integrity on async peers
- ✅ groups workspace-qualified refs by parent diagram, not workspace root

### simulationProxyExpansion

#### buildSimulationSchema cross-boundary expansion

- ✅ materializes home-diagram neighbors and propagates faults across proxy boundaries
- ✅ rematerializes deep home-diagram callers so blast can cross a long proxy chain

#### expandSimulationSchemaThroughProxies

- ✅ merges home-diagram dependencies reachable through external proxies in scope
- ✅ is idempotent when home dependencies are already on the active diagram

### simulationSchema

#### buildSimulationSchema

- ✅ returns the active schema unchanged when no workspace is loaded
- ✅ materializes direct external neighbors missing from the active diagram
- ✅ is idempotent when external neighbors are already on the diagram
- ✅ enables blast-radius propagation through a materialized external fault target
- ✅ includes upstream transitive callers in the simulation scope

#### materializeUnresolvedSimulationEndpoints

- ✅ materializes unresolved dependency endpoints from the workspace

### slug

#### Slug utility tests

- ✅ should convert workspace names to clean URL slugs
- ✅ should treat dots as separators for namespaces and package-like ids

### sourceProvenance

#### buildSourceFileRawUrl

- ✅ builds a GitHub raw URL with scanRoot offset
- ✅ builds a GitLab raw URL

#### buildSourceFileUrl

- ✅ builds a GitHub blob URL pinned to scannedAtCommit
- ✅ builds a GitLab blob URL
- ✅ returns undefined when remoteUrl is missing

#### normalizeGitRemoteUrl

- ✅ converts SCP-style git@ URLs to HTTPS
- ✅ strips .git suffix from HTTPS remotes
- ✅ returns undefined for empty input

#### resolveRepoRelativeFilePath

- ✅ joins scanRoot with node filepath when scan root is a subdirectory
- ✅ returns filepath unchanged when scanRoot is root

### suggestionOverlay

#### Feature: suggestion overlays

- ✅ round-trips overlay documents and builds storage keys
- ✅ Scenario: accepted add-dependent overlays merge into context.yaml
- ✅ Scenario: rejected overlays are skipped (tombstone)
- ✅ applies overlays in acceptedAt order

### temporalCoupling

#### computeTemporalCoupling

- ✅ flags pairs above threshold with enough shared commits
- ✅ excludes pairs below shared-commit floor
- ✅ skips commits that exceed maxFilesPerCommitForCoupling
- ✅ does not cap commits when maxFilesPerCommitForCoupling is 0

#### couplingScore

- ✅ uses Jaccard-style formula
- ✅ returns 0 when denominator is non-positive

### terraformImport

#### extractTerraformFromMarkdown

- ✅ extracts the first hcl/tf/terraform fenced block
- ✅ accepts bare fences and tf/terraform language tags
- ✅ returns trimmed input when no fence is found

#### parseTerraformBatchToSchema

- ✅ merges resources across files and resolves cross-file refs
- ✅ omits filepath for paste-only single-file parse without a real path
- ✅ fails on duplicate addresses across files

#### parseTerraformToSchema - HCL resources

- ✅ maps a single lambda resource to a scoped node
- ✅ creates an edge from depends_on
- ✅ creates an edge from an attribute reference
- ✅ marks data sources as external
- ✅ marks remote modules as external
- ✅ marks local modules as non-external
- ✅ warns and defaults unknown resource types
- ✅ warns on unresolved refs without failing
- ✅ emits one representative node for for_each
- ✅ returns empty schema for provider-only files
- ✅ throws on invalid HCL

#### parseTerraformToSchema - JSON

- ✅ maps .tf.json resources like HCL

### treeSitterLanguages

#### treeSitterLanguages

- ✅ maps common source extensions to language keys
- ✅ builds wasm filenames for all shipped languages

### treeSitterWasmCopy

#### treeSitterWasmCopy

- ✅ resolves installed web-tree-sitter and tree-sitter-wasms package dirs
- ✅ copies runtime + package language WASMs into a destination directory
- ✅ optionally copies HCL grammars when the package is installed

### trends

#### bucketAuthorActivity

- ✅ groups author counts into solo, pair, and team bands

#### bucketComplexityCounts

- ✅ groups complexities into display bands

#### rollupChurnByWeek

- ✅ sums aligned weekly buckets across series
- ✅ pads shorter series with implicit zeros
- ✅ returns undefined when no series have data

### validateBlueprintWorkspace

#### validateBlueprintWorkspace

- ✅ passes a valid context + container workspace
- ✅ reports cycles and invalid connections
- ✅ reports broken parentEntityRef links
- ✅ reports broken child diagram linkage

### workspaceCatalog

#### workspaceCatalog

- ✅ treats sibling context diagrams as peers without a shared parent context
- ✅ builds ancestor chains from catalog parent links
- ✅ derives entityRef from schema name when missing

##### mergeWorkspaceCatalogEntries

- ✅ keeps path stubs when lazy load only has a subset of diagrams

##### resolveChildDiagramEntry

- ✅ returns the child diagram entry for a parent node entityRef
- ✅ returns undefined when only a context diagram shares the entityRef
- ✅ returns undefined when no child diagram exists
- ✅ lists external nodes on the child diagram
- ✅ returns an empty list when the child diagram has no externals

##### resolveEntityHome

- ✅ returns the diagram entry when entityRef is a diagram identity
- ✅ returns the owning diagram when entityRef is a native node
- ✅ prefers the context diagram when context and containers share an entityRef
- ✅ returns undefined when entityRef is not in the workspace
- ✅ ignores external proxy nodes when resolving the canonical home diagram

### workspaceExternals

#### workspaceExternals

##### buildWorkspaceEntityIndex

- ✅ indexes every node across workspace schemas

##### buildWorkspaceFilepathIndex

- ✅ indexes entities by normalized properties.filepath across workspace schemas

##### directional external layout

- ✅ assigns saved y positions when enriching a schema with externals

##### enrichSchemaWithExternals

- ✅ materializes suggested cross-container components and neighbor containers
- ✅ is idempotent when externals are already present
- ✅ on container diagrams only materializes container-level externals
- ✅ on context diagrams never materializes component-level noise
- ✅ unresolved mode only adds dangling dependency endpoints
- ✅ skips context schemas when enrichLevels excludes them

##### enrichWorkspaceWithExternals

- ✅ enriches every schema using a shared workspace index
- ✅ rolls component-level cross-container deps up onto the container diagram
- ✅ adds service-level coupling edges and external component proxies on container diagrams

##### listExternalCandidates

- ✅ lists sibling containers and cross-container components for a component diagram
- ✅ lists cross-container components on container diagrams
- ✅ filters by source schema level
- ✅ filters by node type and search text
- ✅ excludes entities already on the active diagram

##### materializeExternalNodes

- ✅ creates external proxy nodes with canonical refs and layout positions

##### suggestExternalDependencies

- ✅ suggests related containers from parent container diagram
- ✅ suggests cross-container components referenced from other diagrams
- ✅ suggests unresolved dependency endpoints in the active schema

## Reporters

### vitestFeatureReporter

#### VitestFeatureReporter

- ✅ maps project names to package labels
- ✅ nests output as Package → File → describe
- ✅ embeds into an existing file between placeholders
- ✅ marks failed and skipped tests with the correct icons

<!-- vitest-feature-reporter--end -->
