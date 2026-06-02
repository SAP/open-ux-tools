---
'@sap-ux/ui5-test-writer': patch
---

fix(ui5-test-writer): emit chartId/chartType identifier instead of title for iCheckMicroChart, and skip UI.Hidden sections

The Object Page test generator now emits `iCheckMicroChart({ chartId, chartType })` instead of the
title-based `iCheckMicroChart("<title>")` form whenever the underlying `UI.Chart` annotation can be
resolved from the OData metadata or its referenced annotation files. Title-based output is kept as a
fallback when the chart annotation cannot be located or its `ChartType` cannot be mapped to a known
microchart class. Annotation files declared via `manifest.json -> sap.app.dataSources.<service>.settings.annotations`
are now loaded together with the service metadata when extracting features.

The same metadata pipeline is also used to detect `UI.Hidden` annotations on Object Page header
facets, body sections, and sub-sections — sections marked `UI.Hidden = true` (and, conservatively,
any `UI.Hidden` expression) are now omitted from the generated tests, which previously caused
runtime failures for apps that hide sections dynamically. Hidden sections are kept in the
intermediate feature data with a `hidden` flag so they can be re-enabled in the future when
expression evaluation against the test API becomes possible.
