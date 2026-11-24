# Open UX Tools - Architecture Diagram

## Repository Overview

The **SAP Open UX Tools** repository is a monorepo containing 90+ packages organized using pnpm workspaces. It provides modular building blocks for developing SAP Fiori applications, with a focus on code generation, OData integration, UI5 tooling, and deployment configuration.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SAP Open UX Tools Monorepo                              │
│                    (pnpm workspace - 90+ packages)                              │
│                                                                                 │
│  Technology Stack:                                                              │
│  • TypeScript 6.0+ (ES2023 target)                                             │
│  • pnpm 11.22+ workspace management                                             │
│  • Nx for build orchestration                                                   │
│  • Jest + Playwright for testing                                                │
│  • Changesets for versioning                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Main Component Categories

The repository is organized into 8 main functional categories:

### 1. **Code Generators & Writers** (Application Scaffolding)

```
┌───────────────────────────────────────────────────────────────────┐
│                     Fiori Application Generators                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────┐    │
│  │ @sap-ux/create      │───▶│  Main Entry Point           │    │
│  │                     │    │  (Orchestrator)             │    │
│  └─────────────────────┘    └─────────────────────────────┘    │
│           │                                                      │
│           ├─────────────┬─────────────┬──────────────┐         │
│           ▼             ▼             ▼              ▼          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ ┌─────────┐│
│  │ Fiori       │  │ Fiori        │  │ Adaptation │ │ Fiori   ││
│  │ Elements    │  │ Freestyle    │  │ Project    │ │ FPM     ││
│  │ Writer      │  │ Writer       │  │ Generator  │ │ Writer  ││
│  └─────────────┘  └──────────────┘  └────────────┘ └─────────┘│
│                                                                  │
│  Sub-Generators (Feature Addition):                            │
│  • fiori-app-sub-generator        • ui-service-sub-generator   │
│  • deploy-config-sub-generator    • flp-config-sub-generator   │
│  • abap-deploy-config-sub         • cf-deploy-config-sub       │
│  • ui5-library-sub-generator      • repo-app-import-sub        │
│                                                                  │
│  Configuration Writers:                                         │
│  • app-config-writer              • cap-config-writer          │
│  • mockserver-config-writer       • launch-config              │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 15+ writer and generator packages
- Create new Fiori applications (Elements, Freestyle, Adaptation Projects)
- Add features to existing projects (services, deployment config, FLP)
- Configure project settings and build tools

---

### 2. **User Interaction Layer** (Inquirers & UI Components)

```
┌───────────────────────────────────────────────────────────────────┐
│                    Interactive Prompting Layer                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Inquirers (CLI Prompts):                                        │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ odata-service-     │    │ ui5-application-         │         │
│  │   inquirer         │    │   inquirer               │         │
│  └────────────────────┘    └──────────────────────────┘         │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ flp-config-        │    │ abap-deploy-config-      │         │
│  │   inquirer         │    │   inquirer               │         │
│  └────────────────────┘    └──────────────────────────┘         │
│                                                                   │
│  UI Components (React-based):                                    │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ @sap-ux/           │    │ @sap-ux/                 │         │
│  │   ui-components    │    │   ui-prompting           │         │
│  └────────────────────┘    └──────────────────────────┘         │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ control-property-  │    │ sap-systems-ext-         │         │
│  │   editor           │    │   webapp                 │         │
│  └────────────────────┘    └──────────────────────────┘         │
│                                                                   │
│  Common Utilities:                                               │
│  • inquirer-common (shared prompt utilities)                     │
│  • fiori-generator-shared (common generator logic)              │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 10+ inquirer and UI packages
- Collect user input via CLI prompts
- Provide React-based UI components for VS Code extensions
- Share common prompting and generation logic

---

### 3. **Data & Service Layer** (OData & System Access)

```
┌───────────────────────────────────────────────────────────────────┐
│                   OData & Backend Integration                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  OData Service Tools:                                            │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ odata-service-     │───▶│ Adds OData service       │         │
│  │   writer           │    │ to UI5 project           │         │
│  └────────────────────┘    └──────────────────────────┘         │
│                                                                   │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ generator-odata-   │───▶│ Downloads app data       │         │
│  │   downloader       │    │ for mock server          │         │
│  └────────────────────┘    └──────────────────────────┘         │
│                                                                   │
│  OData Annotation Tools:                                         │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Annotation Parsers & Converters                   │         │
│  ├────────────────────────────────────────────────────┤         │
│  │  • fiori-annotation-api (read/write annotations)   │         │
│  │  • annotation-generator (generate annotations)     │         │
│  │  • odata-annotation-core (core annotation logic)   │         │
│  │  • odata-annotation-core-types                     │         │
│  │  • xml-odata-annotation-converter (XML format)     │         │
│  │  • cds-odata-annotation-converter (CDS format)     │         │
│  │  • cds-annotation-parser (CDS parser)              │         │
│  │  • odata-entity-model (model representation)       │         │
│  │  • odata-vocabularies (OASIS & SAP vocabularies)   │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  System Access:                                                  │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ system-access      │───▶│ Access remote systems    │         │
│  │                    │    │ using store or prompts   │         │
│  └────────────────────┘    └──────────────────────────┘         │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ axios-extension    │───▶│ Enhanced HTTP client     │         │
│  │                    │    │ for SAP systems          │         │
│  └────────────────────┘    └──────────────────────────┘         │
│  ┌────────────────────┐    ┌──────────────────────────┐         │
│  │ sap-systems-ext    │───▶│ Store SAP system         │         │
│  │                    │    │ connection info          │         │
│  └────────────────────┘    └──────────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 15+ OData and system access packages
- Read, write, and convert OData annotations (XML, CDS formats)
- Connect to SAP backend systems
- Download metadata and service definitions
- Manage SAP system credentials

---

### 4. **UI5 Tooling & Middleware** (Dev Server Extensions)

```
┌───────────────────────────────────────────────────────────────────┐
│                   UI5 Development Middlewares                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                    UI5 Server                          │     │
│  │                                                        │     │
│  │  ┌──────────────────┐  ┌──────────────────────┐      │     │
│  │  │ preview-         │  │ backend-proxy-       │      │     │
│  │  │   middleware     │  │   middleware         │      │     │
│  │  └──────────────────┘  └──────────────────────┘      │     │
│  │  ┌──────────────────┐  ┌──────────────────────┐      │     │
│  │  │ ui5-proxy-       │  │ reload-middleware    │      │     │
│  │  │   middleware     │  │                      │      │     │
│  │  └──────────────────┘  └──────────────────────┘      │     │
│  │  ┌──────────────────┐  ┌──────────────────────┐      │     │
│  │  │ serve-static-    │  │ backend-proxy-       │      │     │
│  │  │   middleware     │  │   middleware-cf      │      │     │
│  │  └──────────────────┘  └──────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  UI5 Configuration & Info:                                       │
│  • ui5-config (manage UI5 config files)                          │
│  • ui5-info (UI5 version & metadata)                             │
│  • ui5-application-writer (create UI5 project structure)         │
│  • ui5-library-writer (generate UI5 libraries)                   │
│  • ui5-test-writer (generate UI5 tests)                          │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 10+ middleware and UI5 tool packages
- Extend UI5 development server with custom middlewares
- Proxy requests to SAP backends
- Live reload and preview functionality
- UI5 project configuration and scaffolding

---

### 5. **Deployment & Build Tools**

```
┌───────────────────────────────────────────────────────────────────┐
│                  Deployment Configuration                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ABAP Deployment:                                                │
│  • abap-deploy-config-writer                                     │
│  • abap-deploy-config-inquirer                                   │
│  • abap-deploy-config-sub-generator                              │
│                                                                   │
│  Cloud Foundry Deployment:                                       │
│  • cf-deploy-config-writer                                       │
│  • cf-deploy-config-inquirer                                     │
│  • cf-deploy-config-sub-generator                                │
│                                                                   │
│  Deployment Tooling:                                             │
│  • deploy-tooling (UI5 CLI tasks for ABAP deployment)            │
│  • deploy-config-generator-shared (common deploy utilities)      │
│                                                                   │
│  Adaptation Project:                                             │
│  • adp-tooling (tooling for UI5 adaptation projects)             │
│  • adp-flp-config-sub-generator (FLP config for ADP)             │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 10+ deployment-related packages
- Configure deployment to ABAP and Cloud Foundry
- Build and deploy tasks for UI5 CLI
- Adaptation project tooling

---

### 6. **Core Utilities & Infrastructure**

```
┌───────────────────────────────────────────────────────────────────┐
│                     Core Utility Libraries                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Project Management:                                             │
│  • project-access (Fiori project file system operations)         │
│  • project-input-validator (validate project inputs)             │
│  • project-integrity (check project integrity)                   │
│                                                                   │
│  Infrastructure:                                                 │
│  • logger (logging utilities)                                    │
│  • store (secure persistent storage)                             │
│  • telemetry (usage telemetry data)                              │
│  • i18n (internationalization)                                   │
│  • yaml (YAML file manipulation)                                 │
│  • nodejs-utils (Node.js utility wrappers)                       │
│  • btp-utils (SAP BTP utilities)                                 │
│  • text-document-utils (text document utilities)                 │
│  • feature-toggle (feature toggle manager)                       │
│  • fiori-tools-settings (settings management)                    │
│  • environment-check (environment validation)                    │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 15+ core utility packages
- Foundational libraries used across all other packages
- Project file system access and validation
- Logging, storage, and telemetry infrastructure
- BTP and environment utilities

---

### 7. **Testing & Quality Tools**

```
┌───────────────────────────────────────────────────────────────────┐
│                      Testing Infrastructure                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Jest Extensions:                                                │
│  • jest-file-matchers (file/folder matchers)                     │
│  • jest-environment-ui5 (UI5 test environment)                   │
│  • jest-runner-puppeteer (Puppeteer test runner)                 │
│                                                                   │
│  E2E Testing:                                                    │
│  • @sap-ux/playwright (Playwright framework wrapper)             │
│                                                                   │
│  Linting:                                                        │
│  • eslint-plugin-fiori-tools (custom ESLint rules)               │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 5+ testing and linting packages
- Custom Jest extensions for file and UI5 testing
- Playwright integration for E2E tests
- Custom ESLint rules for Fiori applications

---

### 8. **AI & Documentation Tools**

```
┌───────────────────────────────────────────────────────────────────┐
│                   AI-Powered & Documentation                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • fiori-mcp-server (Model Context Protocol server for AI)       │
│  • fiori-docs-embeddings (documentation indexing for AI)         │
│  • guided-answers-helper (interactive help system)               │
│  • fiori-migration-writer (migrate from WebIDE format)           │
└───────────────────────────────────────────────────────────────────┘
```

**Key packages**: 4 AI and documentation packages
- MCP server for AI coding assistants
- Documentation embeddings for AI-powered search
- Interactive guided help
- Migration tools from legacy formats

---

## Package Dependency Flow

Understanding how packages depend on each other:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Typical Dependency Hierarchy                │
└─────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────┐
    │  User-Facing Generators (Layer 1)  │
    │                                    │
    │  • @sap-ux/create                 │
    │  • generator-adp                   │
    │  • fiori-mcp-server                │
    └────────────────────────────────────┘
                   │
                   ▼
    ┌────────────────────────────────────┐
    │  Writers & Inquirers (Layer 2)     │
    │                                    │
    │  • fiori-elements-writer          │
    │  • fiori-freestyle-writer         │
    │  • odata-service-inquirer         │
    │  • ui5-application-inquirer       │
    └────────────────────────────────────┘
                   │
                   ▼
    ┌────────────────────────────────────┐
    │  Domain Logic (Layer 3)            │
    │                                    │
    │  • odata-service-writer           │
    │  • fiori-annotation-api           │
    │  • ui5-config                     │
    │  • deploy-tooling                 │
    └────────────────────────────────────┘
                   │
                   ▼
    ┌────────────────────────────────────┐
    │  Core Utilities (Base Layer)       │
    │                                    │
    │  • project-access                 │
    │  • axios-extension                │
    │  • logger                         │
    │  • store                          │
    │  • i18n                           │
    │  • yaml                           │
    └────────────────────────────────────┘
```

---

## Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Development Ecosystem                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Build & Test:                                                 │
│  • pnpm 11.22+ (package manager)                               │
│  • Nx (monorepo orchestration)                                 │
│  • TypeScript 6.0+ (ES2023 target)                             │
│  • esbuild (bundling)                                          │
│  • Jest 30+ (unit testing)                                     │
│  • Playwright (E2E testing)                                    │
│                                                                 │
│  Quality Gates:                                                │
│  • ESLint 10+ (flat config)                                    │
│  • Prettier 3.9+ (formatting)                                  │
│  • Changesets (versioning)                                     │
│  • SonarCloud (code analysis)                                  │
│  • 80% min code coverage                                       │
│                                                                 │
│  Publishing:                                                   │
│  • GitHub Actions (CI/CD)                                      │
│  • npmjs.com (@sap-ux scope)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key External Consumers

- **SAP Fiori Tools** (VS Code Extensions)
- **SAP Business Application Studio**
- **@sap/generator-fiori** (internal)
- **tools-suite** (internal monorepo)
- **easy-ui5** (community project)

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Language** | TypeScript 6.0+ (ES2023 target) |
| **Package Manager** | pnpm 11.22+ |
| **Build** | Nx 22+, esbuild 0.28+ |
| **Testing** | Jest 30+, Playwright 1.65+ |
| **Linting** | ESLint 10+, Prettier 3.9+ |
| **UI** | React 18+ |
| **HTTP** | Axios (custom extensions) |
| **Versioning** | Changesets 2.31+ |
| **CI/CD** | GitHub Actions |
| **Node.js** | 22.22.2+ |

---

## Repository Stats

- **Total Packages**: ~90
- **Categories**: 8 major functional areas
- **Scope**: @sap-ux (public), @sap-ux-private (internal)
- **License**: Apache-2.0
- **Repository**: https://github.com/SAP/open-ux-tools

---

**Documentation**: See AGENTS.md, README.md, docs/Guidelines.md
