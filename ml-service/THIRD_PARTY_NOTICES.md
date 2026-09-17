# Third-Party Notices

## Landslide4Sense-2022 (IARAI)

`src/nershield_ml/landslide4sense/model/unet.py` is adapted from the official
baseline U-Net implementation published at
https://github.com/iarai/Landslide4Sense-2022, and the normalization
constants in `src/nershield_ml/landslide4sense/config.py`
(`CHANNEL_MEAN`/`CHANNEL_STD`) are taken verbatim from that repository's
`dataset/landslide_dataset.py`. NER-SHIELD did not train this architecture or
invent these constants; they are reproduced here, with attribution, so real
checkpoint weights trained against the original code are usable unmodified.

No pretrained weights are vendored in this repository — see
`ml-service/README.md#landslide4sense` for how to supply your own via
`LANDSLIDE_MODEL_PATH`.

License (MIT):

```
MIT License

Copyright (c) 2022 Institute of Advanced Research in Artificial Intelligence

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## NorthEast_Rainfall_Forecasting (regional port of Mumbai_RainFall_Forecasting)

`src/ne_rainfall/` is vendored verbatim (Python source only — no data,
notebooks, or reports) from a local `NorthEast_Rainfall_Forecasting` project,
which is itself an explicit regional port of Omkar Nitsure's
https://github.com/omkar-nitsure/Mumbai_RainFall_Forecasting (advisor: Prof.
Subimal Ghosh, IIT Bombay). `src/nershield_ml/northeast_rainfall/` is
NER-SHIELD's own adapter around it (config, validation, risk banding, API) —
see that module's docstring for exactly what was verified directly (real
inference run, checkpoint metadata inspected) versus what remains unverified
(no full 2015–2023 training run has been performed; see
`ml-service/README.md#north-east-rainfall-forecasting`).

NER-SHIELD did not train this model and did not author `ne_rainfall/` itself;
both are reproduced here with attribution. The one checkpoint copied locally
for testing (`models/northeast_smoke_test_DO_NOT_USE.pt`, gitignored) is
explicitly labeled by its own upstream project as having no predictive value
and is never used as the default checkpoint path.

License (MIT):

```
MIT License

Copyright (c) 2024 Omkar Nitsure (original Mumbai_RainFall_Forecasting)
Copyright (c) 2026 Contributors (North East India regional port)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Note on data (from the upstream project's own LICENSE, reproduced here since
it governs any real historical data pulled through `src/ne_rainfall/data/`):
this license covers the source code only. Data retrieved by those clients is
governed by its own providers' terms — Copernicus/ECMWF (ERA5), NOAA (GFS,
public domain), NASA (POWER), the India Meteorological Department, and the
Government of India's National Data Sharing and Accessibility Policy.
NER-SHIELD's own demo/test paths use only synthetic, clearly-labeled data —
see `northeast_rainfall/demo_data.py` — and never call these live data
clients.
