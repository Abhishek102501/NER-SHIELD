# Vendored MapLibre GL worker

`maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` are copied verbatim from
`node_modules/maplibre-gl/dist/`. MapLibre's own worker-URL auto-detection resolves to
an empty string under this project's bundler (Turbopack), which makes `new Worker("",
{type:"module"})` fail — the browser resolves the empty URL to the current page and
gets HTML back ("non-JavaScript MIME type of text/html"). With no worker, vector tiles
are never parsed and the map renders blank.

`components/map/LiveMap.tsx` calls `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`
at module scope to point at these files instead, which Next.js serves as-is from
`public/`.

**If you upgrade `maplibre-gl`, re-copy both files:**

```
cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/maplibre/maplibre-gl-worker.mjs
cp node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs public/maplibre/maplibre-gl-shared.mjs
```

Both files are required — the worker bundle imports `./maplibre-gl-shared.mjs`
relatively, so they must stay together at this path.
