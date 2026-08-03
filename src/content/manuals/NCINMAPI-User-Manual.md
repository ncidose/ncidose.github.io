# NCINM API

Current documented release: **NCINM3.20260510**

NCINMAPI provides REST-style access to the NCINM3 radiopharmaceutical dose
calculation workflow. A client sends one JSON object to `/param`; the server
matches the requested phantom and radiopharmaceutical, calculates organ doses,
and returns JSON output.

The API currently supports the NCI and ICRP phantom-library radiopharmaceutical
workflow. Fetus phantom calculations are available in the NCINM3 GUI through
the Radionuclide tab with user-entered maternal source-region data; they are not
included in the radiopharmaceutical API because pregnancy-specific
radiopharmaceutical biokinetic models are not currently defined.

Cloud endpoint:

```text
POST https://ncinm-api.ncidosetools.com/param
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

curl https://ncinm-api.ncidosetools.com/param \
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
    "https://ncinm-api.ncidosetools.com/param",
    headers={"X-API-Key": os.environ["NCIDOSE_API_KEY"]},
    json=payload,
    timeout=120,
)
response.raise_for_status()
print(response.json())
```

Ready-to-run local examples are provided in:

```text
_ncinm3api_test.http
```

---

## JSON Input

The API accepts one JSON object per request.

Parameter | Required | Definition
--|--|--
`phantom_library` | yes | Phantom library. Use `1` for NCI phantoms and `2` for ICRP phantoms. Fetus phantom calculations are not currently supported by the radiopharmaceutical API.
`sex` | yes | Patient sex. Use `1`, `f`, or `female` for female; use `2`, `m`, or `male` for male.
`age` | yes | Patient age in years. Any non-negative numeric age is accepted and matched to the nearest available age phantom.
`radiopharmaceutical` | yes | Exact library name or clinical-style text such as `F-18 FDG` or `Tc-99m MDP`.
`administered_activity_mbq` | yes | Administered activity in MBq. Must be greater than zero.

Supported aliases:

| Canonical parameter | Accepted aliases |
|---|---|
| `phantom_library` | `phantomLibrary`, `PhtLib`, `phtlib`, `phantom` |
| `sex` | `Sex`, `gender`, `Gender` |
| `age` | `Age`, `patient_age`, `patientAge` |
| `radiopharmaceutical` | `Radiopharmaceutical`, `radiopharmaceutical_name`, `radiopharmaceuticalName`, `clinical_radiopharmaceutical`, `clinicalRadiopharmaceutical`, `rpharm`, `RPharm` |
| `administered_activity_mbq` | `activity_mbq`, `activity`, `MBq`, `mbq` |

---

## Phantom Matching

The API maps patient age to the nearest available NCINM3 age group:

Input age | Matched phantom age
--|--
`0 <= age < 0.5` | 0 year
`0.5 <= age < 3` | 1 year
`3 <= age < 7.5` | 5 years
`7.5 <= age < 12.5` | 10 years
`12.5 <= age < 18` | 15 years
`age >= 18` | Adult

The response reports the matched phantom age. In API input and output,
`sex = 1` is female and `sex = 2` is male.

---

## Radiopharmaceutical Matching

The API can accept either a library ID or clinical-style text.
When a radiopharmaceutical name is received in JSON input, NCINMAPI
automatically matches the submitted text to the closest library entry using
fuzzy matching.

Matching is performed in this order:

1. Numeric ID match, when `radiopharmaceutical` contains only an ID.
2. Exact text match against the available radiopharmaceutical names.
3. Fuzzy text match against the available radiopharmaceutical names.

The fuzzy matcher normalizes radionuclide notation before matching. Examples:

Input notation | Normalized notation
--|--
`18F`, `F18`, `18 F`, `F-18` | `F-18`
`99mTc`, `Tc99m`, `Tc-99m` | `Tc-99m`
`I123`, `123I`, `I-123` | `I-123`
`201Tl`, `Tl201`, `Tl-201` | `Tl-201`

Fuzzy matching stays within the same radionuclide when a radionuclide is
provided. If no radiopharmaceutical with that radionuclide is available, the API
returns an error instead of matching to a different radionuclide.

The response includes both the original submitted text and the matched library
entry so vendors can audit automatic matches.

---

## Example 1: Clinical-Style Radiopharmaceutical Name

```json
{
  "phantom_library": 2,
  "sex": "female",
  "age": 58,
  "radiopharmaceutical": "F-18 FDG",
  "administered_activity_mbq": 200
}
```

---

## Example 2: Alternate Radionuclide Notation

```json
{
  "PhtLib": 1,
  "Sex": "m",
  "Age": 42,
  "Radiopharmaceutical": "Tc99m MDP bone scan",
  "MBq": 740
}
```

---

## Example 3: Library ID

```json
{
  "phantom_library": 2,
  "sex": 1,
  "age": 8,
  "radiopharmaceutical": "20",
  "administered_activity_mbq": 200
}
```

---

## JSON Output

Successful responses return HTTP `200` and a JSON object.

Top-level key | Definition
--|--
`ok` | `true` for successful calculations.
`input` | Parsed and resolved input values used for calculation.
`phantom_age_match` | Original age, matched phantom age, and matching method.
`radiopharmaceutical_match` | Original text, matched library name, method, score, and optional warning.
`dose_mGy` | Organ absorbed doses in mGy. `effective_dose_mSv` is reported in mSv.

Example response structure:

```json
{
  "ok": true,
  "input": {
    "phantom_library": 2,
    "sex": 1,
    "age": 58.0,
    "matched_phantom_age": "Adult",
    "radiopharmaceutical_original": "F-18 FDG",
    "radiopharmaceutical": "F-18-fluoro-2-deoxy-D-glucose (FDG) (ICRP 128)",
    "administered_activity_mbq": 200.0
  },
  "phantom_age_match": {
    "original_age_year": 58.0,
    "matched": "Adult",
    "method": "nearest_available_age_phantom"
  },
  "radiopharmaceutical_match": {
    "original": "F-18 FDG",
    "matched": "F-18-fluoro-2-deoxy-D-glucose (FDG) (ICRP 128)",
    "method": "fuzzy",
    "score": 1.0
  },
  "dose_mGy": {
    "adipose": 0.0,
    "brain": 0.0,
    "thyroid": 0.0,
    "effective_dose_mSv": 0.0
  }
}
```

Dose values in the example are illustrative placeholders. Actual values depend
on the matched phantom, radiopharmaceutical, and administered activity.

---

## Output Dose Keys

`dose_mGy` contains these dose keys:

```text
adipose, adrenal, adrenal_l, adrenal_r, bronchi, brain,
breast_adipose, breast_glandular, colon_w, colon_w_l, colon_w_r,
et, gall_bladder_w, gonads, heart_w, kidney, kidney_r, kidney_l,
kidney_cortex_l, kidney_cortex_r, kidney_medulla_l, kidney_medulla_r,
kidney_pelvis_l, kidney_pelvis_r, lenses_of_eye, liver, lung,
lung_l, lung_r, lymph_nodes_et, lymph_nodes_but_et_th,
lymph_nodes_thoracic, muscle, nasal_passage_ant, nasal_passage_post,
oesophagus, oral_mucosa, pancreas, pituitary_gland,
prostate_or_uterus, salivary_glands, sigmoid_rectum_w, skin,
small_intestine_w, spinal_cord, spleen, stomach_w, thymus, thyroid,
tongue, tonsils, ureters, urinary_bladder_w, active_marrow,
shallow_marrow, effective_dose_mSv
```

All organ dose keys are in mGy except `effective_dose_mSv`, which is in mSv.

---

## Error Output

Invalid input returns `ok: false`, HTTP status `400`, and an explanatory error
string.

```json
{
  "ok": false,
  "status": 400,
  "error": "Invalid radiopharmaceutical: No radiopharmaceutical with the same radionuclide is available in this library."
}
```

Common validation errors include:

- invalid JSON input
- missing or invalid `phantom_library`
- missing or invalid `sex`
- negative `age`
- missing or unmatched radiopharmaceutical
- `administered_activity_mbq` less than or equal to zero

Server-side calculation or installation problems return HTTP `500` with an
error message.
