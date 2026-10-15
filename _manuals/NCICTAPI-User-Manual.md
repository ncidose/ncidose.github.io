# NCICT API

Documented version: **4.20261014**
Update: **October 14, 2026 — Scientific Update**

This manual documents the version above; local packages and the cloud endpoint
are updated separately.

NCICTAPI provides REST-style access to the NCICT4 CT organ dose calculation
workflow. A client sends one JSON object to `/param`; the server matches the
requested phantom, applies the scanner and scan-range parameters, calculates
organ doses, and returns JSON output.

## Getting Started

### Local Windows API

1. Run the supplied NCICT API Windows installer and complete installation.
2. Open **Start NCICT API** from the Start menu or desktop shortcut. Keep its
   console window open while using the API.
3. From the same Windows computer, call `http://127.0.0.1:8081`. No API key is
   required by this local package.
4. Use **Stop NCICT API**, or close the console window, to stop the server.

Check the server in Windows PowerShell:

```powershell
curl.exe http://127.0.0.1:8081/health
```

Save a JSON example from this manual as `request.json`, then submit it:

```powershell
curl.exe http://127.0.0.1:8081/param -H "Content-Type: application/json" --data-binary "@request.json"
```

The installed `Docs` folder contains this manual and a keyless local request
example. The server listens only on the same computer; installation does not
create a Windows service, automatic startup entry, or firewall rule. If startup
fails, check whether another application is already using port 8081.

### Cloud API

No local installation is needed. Use the hosted endpoint and assigned API key:

```text
POST https://ncict-api.ncidosetools.com/param
Content-Type: application/json
X-API-Key: <assigned vendor API key>
```

*A vendor-specific API key is provided after the commercial licensing
agreement is executed.*

The JSON input and output described below apply to both local and cloud APIs
when running the corresponding version. Only the base URL and authentication
differ; cloud deployment may lag the installed release.

### Cloud Authentication

On the cloud service, `POST /param` requires the API key assigned to the licensed vendor. Send the
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

### Cloud Command-Line Example

Save one of the JSON examples below as `request.json`. For an interactive test,
read the key without placing it in shell history:

```bash
read -rsp "NCI Dose API key: " NCIDOSE_API_KEY && printf '\n'
export NCIDOSE_API_KEY

curl https://ncict-api.ncidosetools.com/param \
  -H 'Content-Type: application/json' \
  -H "X-API-Key: ${NCIDOSE_API_KEY}" \
  --data @request.json

unset NCIDOSE_API_KEY
```

### Cloud Python Example

Provide `NCIDOSE_API_KEY` to the Python process through the deployment
environment or secret manager. Do not put the raw key in the source file.

```python
import json
import os

import requests

with open("request.json", encoding="utf-8") as request_file:
    payload = json.load(request_file)

response = requests.post(
    "https://ncict-api.ncidosetools.com/param",
    headers={"X-API-Key": os.environ["NCIDOSE_API_KEY"]},
    json=payload,
    timeout=120,
)
response.raise_for_status()
print(response.json())
```

---

## JSON Input

The API accepts one JSON object per request. GUI Batch uses CSV format, but it uses the same phantom-selection rules as the API JSON input. `dose_target` explicitly identifies the dose recipient; NCICT does not infer it from other fields.

JSON numeric literals use dot decimals as required by JSON. Numeric parameters
may also be sent as strings using either dot or comma decimal notation. API
numeric output uses dot decimals regardless of server or client locale.

Recommended key order for readability:

```text
dose_target, age, sex, presentation, height, weight, wed, protocol, start, end, kvp, tcm_strength, head_body, ctdivol, ctdi_profile_id, nctdic, nctdip, custom_ma
```

| Category           | Parameter        | Required                                          | Definition                                                                                                                                                                     |
| ------------------ | ---------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phantom selection  | `dose_target`  | yes                                               | Dose recipient: `patient`, `fetus`, or `mother`.                                                                                                                         |
| Phantom selection  | `age`          | At least one required*; required for fetus/mother | Patient age in years, or gestational age in weeks such as `20wk`.                                                                                                            |
| Phantom selection  | `sex`          | for patient                                       | Patient sex. `f`, `m`, `female`, and `male` are accepted. It is ignored for fetus and mother.                                                                          |
| Phantom selection  | `presentation` | optional                                          | `cephalic` or `breech`. If omitted, `cephalic` is used. It is ignored for patient dose.                                                                                  |
| Phantom selection  | `height`       | At least one required*                            | Patient height in cm. It is ignored for fetus and mother.                                                                                                                      |
| Phantom selection  | `weight`       | At least one required*                            | Patient weight in kg. It is ignored for fetus and mother.                                                                                                                      |
| Phantom selection  | `wed`          | At least one required*                            | Scan-average water-equivalent diameter in cm. Omit the key or use an empty string when unavailable. It is ignored when height or weight is available and for fetus and mother. |
| Scan range         | `protocol`     | optional                                          | Predefined protocol name; takes priority over `start` and `end`. Accepts common aliases and minor spelling errors.                                                         |
| Scan range         | `start`        | unless `protocol` is provided                   | Scan start location from the top of the head in cm, or an anatomical landmark ID from `1001` to `1010`.                                                                    |
| Scan range         | `end`          | unless `protocol` is provided                   | Scan end location from the top of the head in cm, or an anatomical landmark ID from `1001` to `1010`.                                                                      |
| Scanner parameters | `kvp`          | yes                                               | Tube potential in kVp.                                                                                                                                                         |
| Scanner parameters | `tcm_strength` | unless `custom_ma` is provided                  | Tube current modulation strength from `0` to `1`. Omit the key or use an empty string when providing `custom_ma`.                                                        |
| Scanner parameters | `head_body`    | yes                                               | CTDI phantom type. Use `1` for the 16-cm CTDI phantom and `2` for the 32-cm CTDI phantom.                                                                                  |
| Scanner parameters | `ctdivol`      | yes                                               | Volumetric CT dose index in mGy. Values must be greater than or equal to `0`.                                                                                                |
| Scanner parameters | `ctdi_profile_id` | optional | Exact profile ID for the submitted kVp and CTDI phantom. |
| Scanner parameters | `nctdic`, `nctdip` | optional pair | Center/peripheral CTDI in mGy/100 mAs; supply both as positive numbers. |
| Scanner parameters | `custom_ma` | required when `tcm_strength` is omitted or blank | Array of slice-specific mA values. Each value must be greater than `0`. |

\* For patient dose, provide at least one of `age`, `height`, `weight`, or `wed`.

## Phantom Selection Rules

| Dose target | Available information                | Phantom selection                                        |
| ----------- | ------------------------------------ | -------------------------------------------------------- |
| Patient     | Height and weight                    | Closest size phantom                                     |
| Patient     | Height only                          | Estimate weight from closest sex-specific ICRP reference |
| Patient     | Weight only                          | Estimate height from closest sex-specific ICRP reference |
| Patient     | WED only                             | Phantom with the closest WED over the scan range         |
| Patient     | Age and sex only                     | Age- and sex-specific reference body size                |
| Patient     | Age unavailable, body size available | Infer the closest age/size group                         |
| Patient     | Age and body size unavailable        | Input error: provide age, height, weight, or WED         |
| Fetus       | Gestational age                      | Fetal phantom for the closest supported week             |
| Mother      | Gestational age                      | Maternal phantom for the closest supported week          |

Additional rules:

- Patient size priority: **height/weight → WED → age/sex reference**.
- For patient dose, at least one of `age`, `height`, `weight`, or `wed` is required.
- If WED and height/weight are both provided, WED is ignored.
- Gestational age is required for fetus and mother.
- Sex, height, weight, and WED are ignored for fetus and mother.
- If presentation is omitted, `cephalic` is used.

Patient requests always select an NCI size-dependent phantom; the GUI's ICRP
voxel phantoms are not directly selected by the API. Reference body sizes are
used as matching targets. Age may be fractional; `0` is valid for a newborn.
Height, weight, and WED must be positive to count as available body-size data.
For mother dose, the maternal library uses cephalic presentation; `presentation`
resolves to `cephalic` even if `breech` is requested.

Patient age below 20 years selects the pediatric candidate group; age 20 years or older selects the adult group. If patient age is omitted, NCICT searches the same-sex pediatric and adult candidates using the available height, weight, or WED. If only height or weight is supplied, the missing value is filled from the closest sex-specific ICRP reference body size before matching.

For WED matching, NCICT calculates each candidate phantom's mean WED over the submitted scan range and selects the closest value. WED is therefore supported for both landmark-based and custom scan ranges; it is not converted to body weight by a regional regression equation.
Only positive slice WED values are averaged; slices without phantom tissue
(WED = 0) are excluded, as in the GUI WED display.

Supported gestational ages are 8, 10, 15, 20, 25, 30, 35, and 38 weeks. Other positive gestational ages are matched to the nearest supported week; ties select the lower week. Breech fetal phantoms are available at 10, 15, 20, and 25 weeks. For other weeks, cephalic presentation is used.

## Protocol Names and Scan Ranges

Scan-range priority is **protocol name → start/end**. If a nonempty `protocol`
is supplied, its predefined anatomical range overrides both `start` and `end`,
which may be omitted. Otherwise both boundaries are required, either in cm or
as landmark IDs. A blank protocol is treated as omitted.

Supported names match the GUI: `Head`, `Neck`, `Chest`, `Abdomen`, `Pelvis`,
`AP` (abdomen-pelvis), and `CAP` (chest-abdomen-pelvis). Matching ignores case,
spaces, common separators, and the words CT, scan, and protocol. Common aliases
include `brain`, `thorax`, `abdomen/pelvis`, and `abdominopelvic`. Minor spelling
errors are matched conservatively; unknown or ambiguous names return HTTP 400.
An invalid name never falls back to the submitted start/end range.

For example, `"protocol": "Chest CT"` selects the Chest range without
`start` or `end`. `"protocol": "chset CT"` also matches Chest. WED-based phantom
selection uses the resolved protocol range for each candidate phantom.

```json
{
  "dose_target": "patient",
  "sex": "m",
  "height": 175,
  "weight": 75,
  "protocol": "Chest CT",
  "kvp": 120,
  "tcm_strength": 0,
  "head_body": 2,
  "ctdivol": 10
}
```

The response includes the submitted name in `protocol`, the resolved name in
`matched_protocol`, and the final `start_cm` and `end_cm` boundaries. Both name
fields are empty strings when only start/end were supplied, matching Batch output.

For example, `"protocol": "chset CT"` returns `"protocol": "chset CT"` and
`"matched_protocol": "Chest"`.

### Landmark IDs

`start` and `end` can be entered either as scan locations in cm or as anatomical landmark IDs, as shown below. If one value is a landmark ID, the other must also be a landmark ID.

![Anatomical landmark IDs](images/ncict4/landmark.png)

Common protocol ranges can be entered using the following landmark ID pairs:

| Protocol             | Start landmark ID | End landmark ID |
| -------------------- | ----------------- | --------------- |
| Head                 | 1001              | 1003            |
| Neck                 | 1002              | 1005            |
| Chest                | 1004              | 1007            |
| Abdomen              | 1006              | 1008            |
| Pelvis               | 1008              | 1009            |
| Abdomen-pelvis       | 1006              | 1009            |
| Chest-abdomen-pelvis | 1004              | 1009            |

Other valid landmark pairs, including `1001` to `1010`, may be entered directly for customized scan ranges.

After landmark conversion, the scan range must satisfy:

```text
0 <= start < end <= 190
```

## Example 1: Age and Sex

```json
{
  "dose_target": "patient",
  "age": 10,
  "sex": "f",
  "start": 0,
  "end": 20,
  "kvp": 120,
  "tcm_strength": 0,
  "head_body": 1,
  "ctdivol": 20
}
```

## Example 2: Age, Sex, and WED

```json
{
  "dose_target": "patient",
  "age": 10,
  "sex": "f",
  "wed": 25,
  "start": 0,
  "end": 20,
  "kvp": 120,
  "tcm_strength": 0,
  "head_body": 1,
  "ctdivol": 20
}
```

## Example 3: Age, Sex, Height, and Weight

```json
{
  "dose_target": "patient",
  "age": 20,
  "sex": "m",
  "height": 175,
  "weight": 80,
  "start": 0,
  "end": 20,
  "kvp": 120,
  "tcm_strength": 0,
  "head_body": 2,
  "ctdivol": 20
}
```

## Example 4: Fetus Dose

```json
{
  "dose_target": "fetus",
  "age": "38wk",
  "start": 1004,
  "end": 1009,
  "kvp": 120,
  "tcm_strength": 0,
  "head_body": 2,
  "ctdivol": 20
}
```

## Example 5: Mother Dose

Set `dose_target` to `mother`. Patient size fields are ignored because the pregnant phantom library uses a fixed maternal height of 164 cm.

```json
{
  "dose_target": "mother",
  "age": "30wk",
  "start": 1004,
  "end": 1009,
  "kvp": 120,
  "tcm_strength": 0,
  "head_body": 2,
  "ctdivol": 20
}
```

## Custom mA Example

For a custom mA profile, omit `tcm_strength` and provide `custom_ma`. An empty
string is also accepted for `tcm_strength`.

```json
{
  "dose_target": "patient",
  "age": 10,
  "sex": "f",
  "wed": 25,
  "start": 0,
  "end": 20,
  "kvp": 120,
  "head_body": 1,
  "ctdivol": 20,
  "custom_ma": [100, 200, 300, 400, 500, 600, 700]
}
```

If a numeric `tcm_strength` from 0 to 1 is supplied, `custom_ma` is ignored.

## Scanner-Specific Radial Correction

`ctdivol` is the required absolute dose input in every mode.

| Input | Output `radial_mode` |
| ----- | -------------------- |
| No profile or c/p pair | `ctdivol_only` |
| `ctdi_profile_id` with available c/p data | `scanner_library` |
| Positive `nctdic` and `nctdip` together | `explicit_cp` |

An explicit c/p pair takes priority over the profile's component values. A
supplied profile ID must still be recognized. Components use mGy/100 mAs;
`p_over_c` is calculated as `nctdip/nctdic` and is not an input. Profile
components are linearly interpolated between available kVp values. A profile
without a valid pair for the requested kVp and CTDI phantom returns HTTP 400.

For example, add `"ctdi_profile_id": "CTDI-07-002-02"` to the patient example
at 120 kVp with `head_body: 2`, or supply `"nctdic": 3.84` and
`"nctdip": 6.98`. These two choices produce the same radial correction.
CTDIvol-only input applies no scanner-specific correction. The validation
described in the GUI manual concerns adult-body conditions.

## JSON Output

Successful responses return HTTP `200` and a JSON object containing the submitted dose target, matched phantom information, and organ doses.

| Metadata key                | Definition                                                                 |
| --------------------------- | -------------------------------------------------------------------------- |
| `dose_target`             | Submitted dose target: `patient`, `fetus`, or `mother`.              |
| `age` | Submitted patient age in years or gestational age such as `22wk`; matched fetal age is reported separately. |
| `sex` | Submitted sex, normalized to f/m; ignored for fetus and mother. |
| `presentation`            | Resolved fetal presentation; blank for patient dose.                       |
| `phantom_group`           | Matched phantom group.                                                     |
| `matched_phantom_id`      | Matched phantom library ID, such as `1050005` or `2050005`.            |
| `wed_cm` | WED used for phantom matching in cm; omitted when unavailable or ignored. |
| `matched_height_cm`       | Matched phantom height in cm.                                              |
| `matched_weight_kg`       | Matched phantom weight in kg for patient dose.                             |
| `matched_fetal_age_weeks` | Matched gestational age in weeks for fetus or mother dose.                 |
| `protocol`                | Submitted protocol name; empty string when no name was supplied.           |
| `matched_protocol`        | Resolved predefined protocol name; empty string when no name was supplied. |
| `start_cm`, `end_cm`    | Final scan boundaries in cm after protocol or landmark conversion.         |
| `radial_mode` | `ctdivol_only`, `scanner_library`, or `explicit_cp`. |
| `ctdi_profile_id` | Submitted profile ID; empty string when omitted. |
| `nctdic`, `nctdip`, `p_over_c` | Resolved c/p values and their ratio; zero when no radial pair is used. |
| `ctdi_library_version` | Version of the CTDI data used by the server. |

Dose values are returned as JSON numbers without two-decimal rounding, preserving
the precision of the calculated results. Output dose keys include organ doses
in mGy and `effective dose msv` in mSv.
MC statistical uncertainty is reported in the GUI only, not in API responses
or Batch CSV output.

Detailed cardiac substructure doses are available only for NCI size-dependent
patient phantoms. For fetus and mother calculations, the cardiac substructure
keys remain in the response with JSON `null` values because the pregnant
phantoms do not contain separately tallied cardiac substructures. `heart wall`
is still returned as a calculated numeric dose and is not used as a substitute
for the unavailable substructures. `null` means unavailable, not zero.

**Compatibility change in the September 9, 2026 release:** earlier versions returned dose values
as two-decimal strings, such as `"0.08"`. Clients must now accept JSON numbers
and should not depend on a fixed number of decimal places. Small nonzero doses
are no longer rounded to `"0.00"` during response serialization. This correction
to response precision changes the precision and type of the reported values
without altering the underlying calculation algorithms or dose libraries.

The website sandbox provides a readable preview with two decimal places, using
three significant digits below 0.01 so small values remain visible. This is
display-only formatting. Select **Show full-precision JSON** to inspect the
unrounded response; use the API response, not the rounded preview, for further
calculations.

## Error Responses

Invalid requests return HTTP `400` with an `error` message. Common validation errors include:

- missing required input
- missing or invalid `dose_target`
- missing or invalid `sex` for patient dose
- patient age, height, weight, and WED all unavailable
- missing or invalid gestational age for fetus or mother dose
- invalid `presentation`
- invalid `kvp`, `tcm_strength`, `head_body`, or `ctdivol`
- mixed scan range format, such as one landmark ID and one cm location
- invalid scan range after landmark conversion
- unknown or ambiguous protocol name, or missing start/end without a protocol
- unknown CTDI profile, unavailable profile components, or incomplete/invalid c/p pair
- missing or invalid `custom_ma` when `tcm_strength` is omitted or blank

Server-side calculation or installation problems return HTTP `500` with an `error` message.
