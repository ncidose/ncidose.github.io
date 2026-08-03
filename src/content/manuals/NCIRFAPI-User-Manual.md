# NCIRF API

Current documented release: **4.20260510**

NCIRFAPI provides REST-style access to the NCIRF4 batch calculation workflow. A
client sends one JSON object to `/param`; the server prepares the matching
NCIRF4 phantom, runs GEANT4, parses the tally output, and returns organ dose
and uncertainty values as JSON.

Cloud endpoint:

```text
POST https://ncirf-api.ncidosetools.com/param
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

`POST /param` requires the API key assigned to the licensed vendor. Send the
key in the `X-API-Key` request header. Do not include it in the URL or JSON
body. Missing, disabled, or invalid keys return HTTP `401`.

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
```

A healthy local debug server returns:

```json
{"ok": true, "service": "ncirf4api"}
```

## JSON Input

The API uses the same parameter names as the NCIRF4 unified batch input. Field names are case-sensitive, but common lower-case aliases are also accepted.

Parameter | Required | Definition
--|--|--
`ID` | no | Patient or case identifier returned as `patient_id` when provided
`PhtLib` | yes | Phantom library: `1` arm raised reference, `2` arm lowered reference, `3` arm rotated reference, `4` size-dependent, `5` pregnant
`Age` | yes | Age in years for `PhtLib` 1-4; gestational age string for `PhtLib` 5, e.g., `15wk`
`Sex` | required for `PhtLib` 1-4 | `f`, `m`, `female`, `male`, `1`, or `2`; ignored for pregnant phantoms
`HT` | required for `PhtLib` 4 | Height in cm for size-dependent phantom matching
`WT` | required for `PhtLib` 4 | Weight in kg for size-dependent phantom matching
`kVp` | yes | X-ray tube potential in kVp
`HVL` | yes | Half-value layer in mm Al
`SID` | yes | Source-to-isocenter distance in cm
`FW` | yes | Field width in cm
`FH` | yes | Field height in cm
`DAP` | yes | Dose-area product in Gy-cm<sup>2</sup>
`PPA` | yes | Practitioner primary angle in degrees
`PSA` | yes | Practitioner secondary angle in degrees
`ISOX` | yes | Isocenter x position in cm
`ISOY` | yes | Isocenter y position in cm
`ISOZ` | yes | Isocenter z position in cm
`Tbl` | no | Patient table thickness in cm; defaults to `0` if omitted
`Hist` | yes | Number of Monte Carlo particle histories
`Thread` | yes | Number of GEANT4 threads

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

Additional ready-to-run examples are provided in `ncirf4api_test.http`.

## JSON Output

Successful responses have this structure:

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
10<sup>5</sup> | Peak skin dose
10<sup>6</sup> | Organs within the beam field
10<sup>7</sup> | Organs outside the beam field

More threads can reduce runtime. The maximum useful thread count depends on the server hardware and deployment configuration.
