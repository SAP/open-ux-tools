---
name: fiori-app-development
description: 'Create and modify SAP Fiori elements applications. Use for: building List Report, Object Page, Analytical List Page, Worklist, Overview Page, and Basic template apps; designing entity models with UUIDs; generating Fiori apps via MCP; adding columns or tables; creating sample data; previewing Fiori apps. REQUIRES: cds-mcp for CAP documentation and CDS definitions; fiori-mcp for Fiori documentation and functionality.'
argument-hint: 'Describe the Fiori app or modification needed (e.g., "travel management app", "add booking table")'
---

# SAP Fiori Elements App Development

Create and modify SAP Fiori elements applications for both **CAP (Cloud Application Programming Model)** and **non-CAP** projects (e.g., RAP, OData services).

## When to Use

- Creating a new SAP Fiori elements application
- Adding tables, columns, or forms to existing Fiori apps
- Selecting the appropriate floorplan for a use case
- Designing data models with proper UUID keys
- Previewing or testing Fiori applications
- Modifying Fiori app structure or layout

## Prerequisites

This skill requires two MCP servers to be active:
- **cds-mcp**: Provides CAP documentation and CDS definition search
- **fiori-mcp**: Provides Fiori documentation and app generation

Verify MCP servers are running before proceeding.

---

## Workflow

### 1. Validate User Input

When asked to create a SAP Fiori elements app:
- Check if the request describes an application with pages containing table data or forms
- If yes, proceed to floorplan selection
- If ambiguous, ask for clarification about entities, data, and user workflows

### 2. Select Floorplan or Template

Choose the appropriate floorplan based on the use case:

| Use Case | Floorplan / Template |
|----------|----------------------|
| Browse/filter a list + view/edit details | **List Report Page** + **Object Page** |
| Process work items without filtering | **Worklist Page** + **Object Page** |
| Analyze data with charts, KPIs, drilldown | **Analytical List Page** |
| Dashboard with multiple data cards | **Overview Page** |
| Custom SAPUI5 app from scratch | **Basic Template** |

#### Floorplan Details

- **List Report Page** — Lets users filter, view, and work with a list of objects in a table. Typically paired with Object Page.
  
- **Worklist Page** — A variant of List Report for work item lists where users complete or delegate tasks. No filtering options.

- **Analytical List Page** — Supports analytical capabilities with interactive charts and KPIs for data analysis and drilldown.

- **Object Page** — Lets users view, edit, and create details of a single object. Typically used with List Report or Worklist.

- **Overview Page** — Data-driven dashboard organizing large amounts of information in card format. Use for dashboards with multiple data sources.

- **Basic Template** — Blank canvas for custom SAPUI5 development from scratch, following SAP best practices. Use when no Fiori elements floorplan fits.

### 3. Design Data Model

Ensure the data model meets requirements:

**Required Structure:**
- One main entity
- One or more navigation properties to related entities
- Each property must have a proper datatype
- **All entities MUST have a primary key of type UUID**

**Example:**
```cds
entity Travels {
  key ID: UUID;
  TravelNumber: String;
  Destination: String;
  StartDate: Date;
  EndDate: Date;
  to_Bookings: Association to many Bookings on to_Bookings.Travel = $self;
}

entity Bookings {
  key ID: UUID;
  BookingNumber: String;
  FlightDate: Date;
  Travel: Association to Travels;
}
```

### 4. Generate or Modify the App

#### For New Apps

**ALWAYS use the Fiori MCP server** to generate new apps (both CAP and non-CAP projects).

**DO NOT** manually scaffold or create Fiori app files by hand if Fiori MCP is available.

**Generation Steps:**
1. Use `mcp_fiori-mcp_list_functionality` to discover available generation options
2. Use `mcp_fiori-mcp_get_functionality_details` to get required parameters
3. **CRITICAL (CAP only): Query CDS MCP for service endpoint** - Before preparing parameters, use `mcp_cap_search_model` to get the actual service endpoint from the CDS model.
4. Use `mcp_fiori-mcp_execute_functionality` to generate the app
5. Pass required parameters: service (with correct servicePath from step 3), entity, floorplan type, project path
6. **CRITICAL: Add UI Annotations** - The generated app will have NO columns in the List Report table by default
   - Open the `annotations.cds` file in the app folder (e.g., `app/<appname>/annotations.cds`)
   - Add `UI.LineItem` annotation for List Report columns
   - Add `UI.FieldGroup` and `UI.Facets` annotations for Object Page forms
   - See example below
7. **After generation (CAP only):**
   - Install dependencies in **project root**: `npm install` (not in individual app folders)
   - Ensure `@cap-js/sqlite` is installed: `npm install @cap-js/sqlite`
   - Deploy database schema: `cds deploy --to sqlite:database-name.db`
   - **Verify service endpoint** - Double-check `app/<appname>/webapp/manifest.json` to ensure `dataSources.mainService.uri` matches the CDS model endpoint (should already be correct if step 3 was followed)
   - Start server: `npm run watch-<appname>`

#### For Modifications

**DO NOT use screen personalization** to modify (e.g., adding columns).

Instead:
1. Check if Fiori MCP provides a function for the modification
2. If yes, use the MCP function
3. If no, modify project code directly

### 5. Create Sample Data (if needed)

When creating CSV files for sample data:
- **All primary keys and foreign keys MUST be in UUID format**
- Example UUID: `550e8400-e29b-41d4-a716-446655440001`

**Example CSV:**
```csv
ID;TravelNumber;Destination;StartDate;EndDate
550e8400-e29b-41d4-a716-446655440001;TRV001;Paris;2024-05-01;2024-05-10
650e8400-e29b-41d4-a716-446655440002;TRV002;Tokyo;2024-06-15;2024-06-25
```

### 6. Preview the App

Use the most specific `npm run watch-*` script defined in `package.json`:
- ✅ Use: `npm run watch-travels`
- ❌ Avoid: Generic `cds watch`

---

## CAP-Specific Rules

When working with **CAP (Cloud Application Programming Model)** projects, follow these additional rules:

### Searching CDS Definitions

**MUST use CDS MCP server first:**
- Before reading any `.cds` files, search using CDS MCP
- Look for entities, fields, services, HTTP endpoints
- Only fall back to reading `.cds` files if MCP fails or is unavailable

### Searching CAP Documentation

**MUST use CDS MCP server** every time you:
- Create or modify CDS models
- Use CAP APIs
- Use the `cds` CLI

**DO NOT** propose, suggest, or make changes without first checking CAP docs via CDS MCP.

### Creating a New CAP Project

1. **Ask CDS MCP server for guidance first**
2. Use only the plain form of `cds init`:
   ```bash
   cds init <project-name>
   ```
3. **DO NOT use `--add` options** during init:
   - ❌ `--add hana`
   - ❌ `--add sqlite`
   - ❌ `--add tiny-sample`
4. Add configuration (database, sample data) as **separate steps after initialization**

### Post-Creation Setup (CAP Projects)

After creating a CAP project and generating a Fiori app, complete these steps in order:

#### 1. Install Dependencies in Project Root

**IMPORTANT:** Always install in the **project root**, not in individual app folders.

```bash
cd <project-name>
npm install @sap/cds express @cap-js/sqlite
```

**Critical:** The `@cap-js/sqlite` package must be explicitly installed—it's not included by default.

#### 2. Deploy Database Schema

Before running the app, deploy the data model to create database tables:

```bash
cds deploy --to sqlite:database-name.db
```

This command:
- Creates all database tables from your schema
- Creates service views
- Loads sample data from CSV files in `db/data/`

**Without this step:** You'll get `no such table` errors when accessing the app.

#### 3. Verify Service Endpoint (Double-Check)

**Note:** If you followed step 3 in the generation workflow (querying CDS MCP for the service endpoint before generation), the endpoint should already be correct. This is a verification step.

**Why this matters:** The Fiori generator may use incorrect capitalization or naming for the service URL if not provided with the correct endpoint, causing a "404 Not Found" metadata error.

**Steps to verify:**
1. Open `app/<appname>/webapp/manifest.json`
2. Check the `dataSources.mainService.uri` value
3. Use CDS MCP to confirm: `mcp_io_github_cap_search_model` with `kind: "service"`
4. Verify the manifest URI matches the CDS model `urlPath` or `endpoints[0].path` exactly
5. If they don't match, update the manifest.json with the correct endpoint

**Example mismatch:**
- CDS Model shows: `/odata/v4/production-order/`
- Manifest.json has: `/odata/v4/ProductionOrderService/` ❌
- Fix: Update manifest.json to `/odata/v4/production-order/` ✅

#### 4. Start the Application

Use the generated watch script:
```bash
npm run watch-<appname>
```

#### 5. Restarting After Database Changes

When you modify the data model or CSV files:
1. Redeploy: `cds deploy --to sqlite:database-name.db`
2. **Kill the running server** (Ctrl+C)
3. **Restart:** `npm run watch-<appname>`

The server must be restarted to pick up the new database schema.

### Handling Common CAP Issues

#### Package Conflicts

**Problem:** `@sap/cds was loaded from different locations`

**Cause:** Global CAP packages in `~/node_modules/` conflict with local project packages.

**Solution:**
```bash
rm -rf ~/node_modules/@sap ~/node_modules/@cap-js
```

Then restart the server. **Always install CAP packages locally in each project, never globally.**

#### Missing Database Driver

**Problem:** `Cannot find module '@cap-js/sqlite'`

**Solution:**
```bash
npm install @cap-js/sqlite
```

#### Database Not Deployed

**Problem:** `no such table: ServiceName_EntityName`

**Solution:**
```bash
cds deploy --to sqlite:database-name.db
```

Then kill and restart the server.

---

## Quality Checklist

Before completing:
- ✅ Floorplan matches the use case
- ✅ All entities have UUID primary keys
- ✅ Navigation properties are defined
- ✅ Sample data uses UUID format
- ✅ App generated via Fiori MCP (not manual)
- ✅ UI annotations for application based on floorplan
- ✅ Preview script is specific (`watch-<appname>`)
- ✅ (CAP only) Consulted CDS MCP for definitions and documentation
- ✅ (CAP only) Queried CDS MCP for service endpoint BEFORE generation and used correct servicePath in parameters
- ✅ (CAP only) Service endpoint in manifest.json matches CDS model endpoint
- ✅ (CAP only) Dependencies installed in **project root** (including `@cap-js/sqlite`)
- ✅ (CAP only) Database deployed with `cds deploy`
- ✅ (CAP only) No global package conflicts in `~/node_modules/`
- ✅ (CAP only) Server can start and access data without errors

---

## Common Patterns

### Travel Management App
- **Floorplan**: List Report + Object Page
- **Entities**: Travels (main), Bookings (child), Passengers (child)
- **Sample**: Travel list with filtering → drill into travel details → view bookings

### Task Processing App
- **Floorplan**: Worklist + Object Page
- **Entities**: Tasks (main), Comments (child)
- **Sample**: Simple task list → process/complete tasks

### Sales Dashboard
- **Floorplan**: Overview Page
- **Entities**: Sales, Orders, Customers
- **Sample**: Cards showing KPIs, charts, recent activity

### Custom Form Builder
- **Floorplan**: Basic Template
- **Entities**: Forms, Fields, Responses
- **Sample**: Custom SAPUI5 implementation with form logic

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| MCP servers not found | Servers not running | Verify cds-mcp and fiori-mcp are running |
| Generation fails | Invalid parameters | Check parameters match `get_functionality_details` output |
| Preview won't start | Missing dependencies | Run `npm install` in **project root** |
| UUIDs not working | Wrong data type | Verify all PKs and FKs are UUID type, not String or Integer |
| App not found in preview | Wrong script | Use specific `watch-<appname>` script, not generic watch |
| `no such table` error | Database not deployed | Run `cds deploy --to sqlite:db-name.db` then restart server |
| `@sap/cds loaded from different locations` | Global package conflict | Remove `~/node_modules/@sap` and `~/node_modules/@cap-js` |
| `Cannot find module '@cap-js/sqlite'` | Missing database driver | Install in root: `npm install @cap-js/sqlite` |
| Data not showing | Server caching old DB | Kill server, redeploy database, restart server |
| `404 Not Found` - Cannot load metadata | Wrong service endpoint URL | Use CDS MCP to get correct endpoint (should be done BEFORE generation as step 3), update manifest.json `dataSources.mainService.uri` if needed |

### Diagnostic Commands (CAP)

**Check database tables:**
```bash
sqlite3 database-name.db ".tables"
```

**Verify data loaded:**
```bash
sqlite3 database-name.db "SELECT COUNT(*) FROM table_name;"
```

**Check for global package conflicts:**
```bash
ls ~/node_modules/@sap 2>/dev/null
ls ~/node_modules/@cap-js 2>/dev/null
```

**Verify local dependencies:**
```bash
npm list @sap/cds @cap-js/sqlite
```

---
