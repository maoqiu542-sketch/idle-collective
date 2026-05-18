# Idle Collective Art Pipeline

This directory defines the first-stage art asset production pipeline for map,
resource, building, and UI fallback assets.

Pipeline flow:

1. `scripts/art-pipeline/sync-specs.js`
   Generates the JSON specs from the canonical JS definitions.
2. `scripts/art-pipeline/queue-comfyui-generation.js`
   Expands the specs into ComfyUI request payloads and optional live queue calls.
3. `scripts/art-pipeline/bootstrap-placeholders.js`
   Seeds starter SVG source assets so the runtime can immediately consume images.
4. `scripts/art-pipeline/export-approved-assets.js`
   Crops, centers, scales, and exports approved source assets into runtime PNGs.
5. `scripts/art-pipeline/sync-runtime-manifest.js`
   Writes the runtime manifest used by the app.
6. `scripts/art-pipeline/validate-assets.js`
   Runs catalog and exported asset QC checks.

Generated source assets live under `art-source/generated`.
Runtime-ready assets live under `public/game-assets`.
