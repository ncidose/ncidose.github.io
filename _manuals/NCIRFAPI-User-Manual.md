# NCIRF API

Current documented release: **September 10, 2026**
Current release type: **Scientific Update**
Latest scientific update: **September 10, 2026**

NCIRFAPI provides REST-style access to the NCIRF4 batch calculation workflow. A
client sends one JSON object to `/param` or `/jobs`; the selected service
prepares the matching NCIRF4 phantom, runs the calculation, parses the tally
output, and returns organ dose and uncertainty values as JSON.

The September 10 scientific update adds **registered custom x-ray spectra**
alongside the built-in spectrum library. Vendors can use spectra generated in
the NCIRF GUI to model equipment- and protocol-specific beams, register them
once through the NCI Dose Tools administrator, and reuse their IDs in dose
requests. `GET /spectra` lists the beams available to the authenticated company.
Existing integrations using only kVp/HVL continue to use the built-in library.

## CPU and GPU Services

The licensed API is available through two compatible services:

- **CPU API** — full Geant4 transport and scoring at
  `https://ncirf-api.ncidosetools.com`.
- **GPU API** — hybrid CUDA organ/bone transport with a concurrent optimized
  Geant4 PSD calculation at `https://ncirfgpu-api.ncidosetools.com`.

Both services accept the same core NCIRF request fields, support phantom
libraries 1-5, and return the same core dose and uncertainty structure. On the
GPU service, `PSDMode: 0` selects the fixed-history optimized PSD calculation;
`Thread` controls its Geant4 PSD branch rather than CUDA launch geometry.

### GPU Stopping Modes

For phantom libraries 1-4, the GPU API accepts exactly one CUDA stopping input:
`Hist` for a fixed number of histories or `TopDoseError` for an uncertainty
threshold from greater than 0% through 100%. Adaptive runs check 100,000-history
batches, can first stop at 600,000 histories, and have a 10,000,000-history
ceiling. The response `cuda` object reports the histories used and whether the
threshold was reached. Pregnant phantoms (`PhtLib: 5`) require explicit `Hist`
and do not accept `TopDoseError`. The concurrent Geant4 PSD branch uses 100,000
histories in either mode.

CPU cloud endpoint:

```text
POST https://ncirf-api.ncidosetools.com/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>
```

GPU cloud endpoint:

```text
POST https://ncirfgpu-api.ncidosetools.com/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>
```

*A vendor-specific API key is provided after the commercial licensing
agreement is executed.*

Local Xojo debug endpoint:

```text
POST http://localhost:8080/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>
```

## Authentication

`POST /param`, `/jobs`, and `GET /spectra` require an API key assigned to the
licensed vendor and enabled for the selected service. Send the key in the
`X-API-Key` request header. Do not include it in the URL or JSON body. Missing,
disabled, or invalid keys return HTTP `401`.

The API key is a bearer credential. Store it in an environment variable or a
server-side secret manager, and send requests only over HTTPS. Server-to-server
integration is recommended. Do not commit the key to source control, write it
to application logs, embed it in browser JavaScript, or distribute it inside a
desktop or mobile application. Use a vendor-controlled backend as a proxy when
the end-user application cannot protect a secret.

The same assigned company key is accepted by NCICTAPI, NCINMAPI, and NCIRFAPI.
If a key may have been exposed, stop using it and contact the NCI Dose Tools
administrator to have it disabled or rotated. Successful requests are logged
under the registered company name; the raw key is not written to the API
access log.

### Command-Line Example

Save one of the JSON examples below as `request.json`. For an interactive test,
read the key without placing it in shell history:

```bash
read -rsp "NCI Dose API key: " NCIDOSE_API_KEY && printf '\n'
export NCIDOSE_API_KEY

curl https://ncirf-api.ncidosetools.com/param \
  -H 'Content-Type: application/json' \
  -H "X-API-Key: ${NCIDOSE_API_KEY}" \
  --data @request.json

unset NCIDOSE_API_KEY
```

### Python Example

Provide `NCIDOSE_API_KEY` to the Python process through the deployment
environment or secret manager. Do not put the raw key in the source file.

```python
import json
import os

import requests

with open("request.json", encoding="utf-8") as request_file:
    payload = json.load(request_file)

response = requests.post(
    "https://ncirf-api.ncidosetools.com/param",
    headers={"X-API-Key": os.environ["NCIDOSE_API_KEY"]},
    json=payload,
    timeout=3600,
)
response.raise_for_status()
print(response.json())
```

---

## Health Check

```http
GET http://localhost:8080/health
GET https://ncirf-api.ncidosetools.com/health
GET https://ncirfgpu-api.ncidosetools.com/health
```

A healthy service returns JSON containing:

```json
{"ok": true, "service": "ncirf4api"}
```

The public health routes do not require an API key.

## Asynchronous FIFO Queue

Both services execute calculations through their own persistent, single-worker
FIFO queue. Synchronous `POST /param` waits for the same queue. For long-running
or batch integration, submit asynchronously:

```http
POST /jobs
POST /param
Prefer: respond-async
```

An accepted asynchronous submission returns HTTP `202` with `job_id`,
`status_url`, and `result_url`. Poll `GET /jobs/{job_id}` until `status` is
`completed`, `failed`, or `cancelled`, then retrieve the calculation with
`GET /jobs/{job_id}/result`. Queued status responses include
`queue_position`, `jobs_ahead`, and `estimated_wait_seconds` when available.
`DELETE /jobs/{job_id}` can cancel a queued job; a running transport job cannot
be cancelled safely.

Queue records survive a service restart. If a submission response is lost or
ambiguous, do not automatically repeat the POST: doing so can create a second
calculation. Retain the returned job ID and retry status polling after temporary
network failures.

## Public CPU/GPU Comparison Sandbox

The [NCIRF vendor sandbox](/vendors?tool=ncirf#api-sandbox) compares both
services without exposing a vendor API key in the browser. CPU and GPU receive
the same selected inputs, 1,000,000 histories, and four threads. The result
identifies the calculation engine and highlights server calculation time.

The page reports CPU API and GPU API availability plus each service's remaining
allowance before submission. Each backend has a separate limit of five runs per
IP address per 30 minutes and accepts up to three demo requests at a time; its
FIFO queue then runs one calculation at a time. Pregnant-phantom fetal tallies
may require more histories for stable uncertainty, and the sandbox shows large
uncertainties unchanged. The sandbox is for technical evaluation, not clinical
or production use.

## Spectrum Catalog and Custom Beams

Query the available spectra before configuring equipment or protocol mappings:

```http
GET https://ncirf-api.ncidosetools.com/spectra
X-API-Key: <assigned vendor API key>
```

For a GPU integration, use the same route on
`https://ncirfgpu-api.ncidosetools.com`.

The response contains `ok`, `builtin_count`, `custom_count`, `count`, and a
`spectra` array. All 114 built-in spectra are shared; custom entries are visible
only to the company associated with the supplied API key. Responses are marked
`Cache-Control: no-store`. This route accepts GET only.

Every entry includes `spectrum_id`, `display_name`, `type` (`builtin` or
`custom`), `kvp`, and `hvl_mm_al`. Available metadata also includes `target`,
`anode_angle_deg`, `physics`, `generator`, `spekpy_version`, and
`applied_filters` (material/thickness objects) or `filtration_description`.
Custom entries additionally include `content_sha256` and `extra_al_mm`;
generation warnings are included when present. Metadata availability depends
on the original file or built-in record; a missing field is not a zero value.
The endpoint does not return raw spectrum arrays or server file paths.

### Vendor Workflow

Maintain a vendor-side mapping from hospital, fluoroscopy unit, and beam setting
to a registered `spectrum_id`. One unit may need several spectra for its kVp
and filtration combinations; a spectrum is a beam definition, not a unique
machine identifier. Query the catalog when setting up an installation and
after requesting additional spectra. There is no need to generate a spectrum
or resend its SpekPy parameters on every dose call.

For a beam not already listed:

1. Generate and validate it in the NCIRF GUI, then export its `.ncirfspc` file.
2. Send the file and intended vendor/equipment/protocol information to the NCI
   Dose Tools administrator for registration.
3. Query `/spectra` again after registration and retain the returned
   `spectrum_id` in the vendor's equipment/protocol mapping.
4. Send that ID as `SpectrumID` in subsequent `/param` calculations.

Use the ID stored **inside** the spectrum file, not its filename, display name,
or position in the list. IDs are case-sensitive. For example, replace `kVp`
and `HVL` in either complete input example below with:

```json
"SpectrumID": "custom_<registered-id>"
```

`builtin_001` is also a valid ID and selects the existing 28 kVp, 0.460 mm Al
built-in beam. The lowercase field alias `spectrum_id` is accepted.
If both aliases are sent, they must agree. kVp/HVL may be omitted with an ID;
if supplied, kVp must agree with the registered beam and HVL must agree within
0.01 mm Al. They never replace or regenerate the selected spectrum. Unknown
and unauthorized IDs both return HTTP `404`; there is no automatic fallback
to a built-in beam. Empty IDs, conflicting selection fields, and client-supplied
`SpectrumFile`/`spectrum_file` paths return `400`.

Without `SpectrumID`, the existing kVp/HVL behavior is unchanged and searches
only the built-in library. The dose response preserves the existing
`matched.spectrum_id`, `matched.spectrum_kvp`, and
`matched.spectrum_hvl_mm_al` fields and adds `matched.spectrum`, containing the
same metadata as the catalog entry. Store this metadata with calculation
results to identify the beam actually used.

### Example: Dose Request Using a Registered Custom Spectrum

Replace `custom_<registered-id>` below with an exact custom `spectrum_id`
returned by your authenticated `/spectra` request. This example uses the same
size-dependent phantom inputs as the legacy example below, but selects the
beam by ID instead of kVp/HVL. The other phantom libraries support the same
selection field.

```http
POST https://ncirf-api.ncidosetools.com/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>

{
  "ID": "registered-beam-example",
  "PhtLib": 4,
  "Age": 30,
  "Sex": "f",
  "HT": 150,
  "WT": 40,
  "SpectrumID": "custom_<registered-id>",
  "SID": 80,
  "FW": 10,
  "FH": 10,
  "DAP": 100,
  "PPA": 180,
  "PSA": 0,
  "ISOX": 16.5,
  "ISOY": 13.7,
  "ISOZ": 75.1,
  "Tbl": 1,
  "Hist": 5000000,
  "Thread": 6
}
```

### Administrator Registration

By default, the API reads the following directory under the **server account's**
home directory, independently of the desktop GUI's spectrum library:

```text
NCIRFAPI/Custom Spectra/
  <exact registered company name>/
    equipment_protocol.ncirfspc
  registrations.sqlite
  registration-errors.log
```

The company folder name must exactly match the company name in the API key
registration, including case. A separate folder grants a separate company
access; copying an identical beam file into both folders explicitly grants
both companies access. Hospital/equipment mappings remain the vendor's
responsibility; this initial implementation scopes permissions by company,
not by hospital. Do not put files in a shared public custom-spectra folder.

Set `NCIRF_API_SPECTRA_DIR` to an absolute path to use a different root. The
API reads immediate company folders and immediate `.ncirfspc` files on
startup; it ignores links, nested directories, and unrelated extensions.
Restart the API after adding or removing files. There is no upload endpoint,
live reload, or online SpekPy generation during dose requests.

Registration uses the GUI's NCIRF-SPC decoder and validation: 62-point NCIRF
energy grid, finite nonnegative weights, supported target/kVp/model,
normalization, and locally recomputed DAP per history. Files over 1 MiB,
invalid files, built-in ID collisions, and conflicting custom IDs are excluded;
review `registration-errors.log` and the returned catalog after restarting.

Keep `registrations.sqlite` with catalog backups. It records each accepted ID's
canonical beam fingerprint, rejecting changed beam content under an already
registered ID even across restarts. Generate a **new ID** for a changed beam;
do not delete the ledger to replace an existing one. Filenames, save times,
JSON formatting, and display-only metadata are not part of this fingerprint.
The spectrum root must be writable by the API service for the ledger and
diagnostic log. A ledger failure disables custom spectra while leaving
built-ins available; a missing spectrum root is a valid built-in-only setup.

For an isolated API instance, `NCIRF_API_WORK_ROOT` may point to an existing
directory. It relocates the API's GEANT4 working subfolder only; it does not
change the spectrum root or API key file. Leaving it unset preserves the
existing work directory. Each simultaneously running test/production instance
must use a separate work directory and port.

## JSON Input

The API uses the same parameter names as the NCIRF4 unified batch input. Field names are case-sensitive, but common lower-case aliases are also accepted.

JSON numeric literals use dot decimals as required by JSON. Numeric parameters
may also be sent as strings using either dot or comma decimal notation. API
numeric output uses dot decimals regardless of server or client locale.

Parameter | Required | Definition
--|--|--
`ID` | no | Patient or case identifier returned as `patient_id` when provided
`PhtLib` | yes | Phantom library: `1` arm raised reference, `2` arm lowered reference, `3` arm rotated reference, `4` size-dependent, `5` pregnant
`Age` | yes | Age in years for `PhtLib` 1-4; gestational age string for `PhtLib` 5, e.g., `15wk`
`Sex` | required for `PhtLib` 1-4 | `f`, `m`, `female`, `male`, `1`, or `2`; ignored for pregnant phantoms
`HT` | required for `PhtLib` 4 | Height in cm for size-dependent phantom matching
`WT` | required for `PhtLib` 4 | Weight in kg for size-dependent phantom matching
`SpectrumID` | no | Stable built-in or vendor-authorized custom ID from `GET /spectra`; alias `spectrum_id`
`kVp` | unless `SpectrumID` is supplied | Legacy mode: 28-125 kVp matching a built-in spectrum; ID mode: optional consistency check against the registered beam
`HVL` | unless `SpectrumID` is supplied | Positive HVL in mm Al; legacy mode matches a built-in pair within 0.01 mm Al; ID mode checks the registered beam
`SID` | yes | Source-to-isocenter distance in cm
`FW` | yes | Field width in cm
`FH` | yes | Field height in cm
`DAP` | yes | Positive dose-area product in Gy-cm²
`PPA` | yes | Practitioner primary angle in degrees
`PSA` | yes | Practitioner secondary angle in degrees
`ISOX` | yes | Isocenter x position in cm
`ISOY` | yes | Isocenter y position in cm
`ISOZ` | yes | Isocenter z position in cm
`Tbl` | no | Patient table thickness in cm; defaults to `0` if omitted
`Hist` | CPU: yes; GPU: one of `Hist` or `TopDoseError` | Fixed number of particle histories; required for pregnant phantoms
`TopDoseError` | GPU libraries 1-4 only, as an alternative to `Hist` | Adaptive CUDA stopping threshold in percent, greater than 0 and at most 100
`Thread` | yes | Number of Geant4 threads; on the GPU service this controls the concurrent PSD branch
`PSDMode` | GPU only, optional | `0` selects the optimized fixed-history Geant4 PSD calculation

Supported aliases include `id`, `phantom_library`, `age`, `sex`, `height_cm`, `weight_kg`, `kvp`, `hvl`, `sid`, `field_width_cm`, `field_height_cm`, `dap_gy_cm2`, `ppa`, `psa`, `iso_x`, `iso_y`, `iso_z`, `table_thickness_cm`, `history`, and `threads`.

## Phantom Library Behavior

`PhtLib` | Behavior
--|--
`1`, `2`, `3` | Uses the reference phantom library. `Age` is snapped to the nearest supported reference age group. `Sex` selects female or male reference phantom.
`4` | Uses the size-dependent phantom library. `Age` and `Sex` determine pediatric/adult and female/male group; `HT` and `WT` are matched to the nearest available phantom grid.
`5` | Uses pregnant phantoms. `Age` must be one of `8wk`, `10wk`, `15wk`, `20wk`, `25wk`, `30wk`, `35wk`, or `38wk`.

## Example: Size-Dependent Phantom

```http
POST http://localhost:8080/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>

{
  "ID": "10009",
  "PhtLib": 4,
  "Age": 30,
  "Sex": "f",
  "HT": 150,
  "WT": 40,
  "kVp": 28,
  "HVL": 0.460,
  "SID": 80,
  "FW": 10,
  "FH": 10,
  "DAP": 100,
  "PPA": 180,
  "PSA": 0,
  "ISOX": 16.5,
  "ISOY": 13.7,
  "ISOZ": 75.1,
  "Tbl": 1,
  "Hist": 5000000,
  "Thread": 6
}
```

## Example: Pregnant Phantom

```http
POST http://localhost:8080/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>

{
  "ID": "10006",
  "PhtLib": 5,
  "Age": "15wk",
  "kVp": 28,
  "HVL": 0.460,
  "SID": 80,
  "FW": 10,
  "FH": 10,
  "DAP": 100,
  "PPA": 180,
  "PSA": 0,
  "ISOX": 24.5,
  "ISOY": 15.1,
  "ISOZ": 82.3,
  "Tbl": 1,
  "Hist": 5000000,
  "Thread": 6
}
```

Additional ready-to-run examples are provided in `_ncirf4api_test.http`.

## JSON Output

Successful responses have the following structure (selected fields shown).
The dose values below are illustrative placeholders, not calculation results.

```json
{
  "ok": true,
  "patient_id": "10009",
  "phantom_library": 4,
  "age": "30",
  "sex": "f",
  "lattice_file": "3150040.lat",
  "drf": "35F",
  "matched": {
    "geant4_phantom_group": 3,
    "phantom_age_or_height": 150,
    "phantom_sex_or_weight": 40,
    "spectrum_id": "builtin_001",
    "spectrum_kvp": 28,
    "spectrum_hvl_mm_al": 0.46,
    "spectrum": {
      "spectrum_id": "builtin_001",
      "type": "builtin",
      "kvp": 28,
      "hvl_mm_al": 0.46
    },
    "matched_height_cm": 150,
    "matched_weight_kg": 40
  },
  "dose": {
    "brain": 0.0,
    "effective_dose_mSv": 0.0
  },
  "error_percent": {
    "brain": 0.0,
    "effective_dose_mSv": 0.0
  }
}
```

`dose` contains organ doses in mGy, except `effective_dose_mSv`, which is in mSv. `error_percent` contains the corresponding relative uncertainty in percent.

GPU responses additionally include a `cuda` object describing the stopping
mode, histories used, maximum histories, target threshold, threshold status,
top-dose organ, and its final uncertainty.

`matched.spectrum` describes the beam actually used and includes its
`display_name` and available generation/filtration metadata in addition to
the fields illustrated above. A registered custom beam reports `type: "custom"`
and `content_sha256` for its canonical physical-beam fingerprint. Store the
returned ID and metadata with each result rather than relying on the current
catalog display name alone. The original `matched.spectrum_id`,
`matched.spectrum_kvp`, and `matched.spectrum_hvl_mm_al` remain available to
existing clients.

## Output Keys

Key | Organ/tissue
--|--
`brain` | Brain
`pituitary_gland` | Pituitary gland
`lens` | Lens
`eye_balls` | Eye balls
`salivary_glands` | Salivary glands
`oral_cavity` | Oral cavity
`spinal_cord` | Spinal cord
`thyroid` | Thyroid
`esophagus` | Esophagus
`trachea` | Trachea
`thymus` | Thymus
`lungs` | Lungs
`breast` | Breast
`heart_wall` | Heart wall
`stomach_wall` | Stomach wall
`liver` | Liver
`gall_bladder` | Gall bladder
`adrenals` | Adrenals
`spleen` | Spleen
`pancreas` | Pancreas
`kidney` | Kidney
`small_intestine` | Small intestine
`colon` | Colon
`rectosigmoid` | Rectosigmoid
`urinary_bladder` | Urinary bladder
`prostate_or_uterus` | Prostate/Uterus
`gonads` | Ovaries/Testes
`skin` | Skin
`peak_skin_dose` | Peak skin dose
`muscle` | Muscle
`active_marrow` | Active marrow
`shallow_marrow` | Shallow marrow
`effective_dose_mSv` | Effective dose

## Error Output

Invalid input returns `ok: false`, an HTTP error status, and an explanatory `error` string.

```json
{
  "ok": false,
  "status": 400,
  "error": "missing required input: PhtLib"
}
```

## Monte Carlo History and Threads

More histories generally increase calculation time and reduce statistical uncertainty.

Recommended history | Organs of interest
--|--
10⁵ | Peak skin dose
10⁶ | Organs within the beam field
10⁷ | Organs outside the beam field

More threads can reduce runtime. The maximum useful thread count depends on the server hardware and deployment configuration.
