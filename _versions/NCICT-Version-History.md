# NCICT Version History

_Scientific and maintenance update record for the National Cancer Institute dosimetry system for Computed Tomography._

Latest release: **October 14, 2026 — Scientific Update**
Record begins: **2011**

## 2026

### October 14, 2026 — Scientific Update

The macOS GUI uses a Universal build supporting Intel and Apple Silicon.

#### GUI and API

- Added scanner-specific radial dose correction that uses `CTDIc` and `CTDIp` to approximate bowtie-filter shape and correct reference-scanner organ doses while preserving CTDIvol. In ICRP adult validation, it reduced **the residual interscanner variation of conventional scanner-independent calculations from about 8% to 2%**; the algorithm and validation have been submitted for peer review.
- Added cephalic/breech fetal presentation selection for supported gestational ages.
- Expanded normalized CTDIw coverage by 22 additional scanner models, from 136 to 158, and added an `nCTDIc`/`nCTDIp` library for validated scanner/filter conditions, with support for user-defined `nCTDIc`/`nCTDIp` values.
- Corrected the NCI size-phantom muscle tally and replaced the ICRP blood-vessel surrogate with a dedicated tally.
- Updated WED and SSDE to use scan-average WED.
- Unified Batch and API input rules:
  - Added stable CTDI profile IDs and optional `ctdi_profile_id` or paired `nctdic`/`nctdip` inputs for radial correction while retaining CTDIvol as the absolute dose input.
  - Added flexible protocol-name matching, including common aliases such as `Chest CT`, `AP`, and `CAP`, and minor spelling errors. A supplied protocol overrides start/end; cm ranges and 1001–1010 landmark IDs remain supported.
  - Simplified phantom selection: provide the available patient information, and NCICT automatically selects the closest supported phantom and calculates dose. Height and weight take priority over WED; a missing height or weight is filled from the closest sex-specific ICRP reference, and WED matching uses the submitted scan range. Patient input requires at least one of age, height, weight, or WED.
  - Added explicit `dose_target` selection (`patient`, `fetus`, or `mother`) and optional `cephalic`/`breech` presentation. Gestational age is required for fetus and mother; irrelevant patient size fields are ignored, and omitted presentation defaults to `cephalic`.
  - Simplified optional inputs: omit WED when unavailable, and omit `tcm_strength` when supplying a `custom_ma` profile. Empty strings are also accepted.
  - Added submitted and matched protocol names to output while preserving numeric dose precision.
  - Updated CSV/HTTP examples and manuals to cover the simplified input rules and a wider range of patient and pregnancy cases.

#### GUI

- Added Monte Carlo statistical uncertainty for dose results, including propagated marrow and effective-dose uncertainty and a fixed 90% dose-coverage threshold.
- Corrected breech phantom images for supported gestational ages.
- Corrected radial-alpha loading, preserved CTDIvol during center/peripheral edits, and restored startup CTDIvol calculation from the displayed scanner settings.
- Optimized backend processing and preserved user-defined scan ranges when switching among ICRP, size-dependent, fetus, and pregnant-women phantoms.
- Leave unavailable fetal and maternal cardiac substructure doses blank in Batch output, with Heart wall dose reported separately.

#### API

- Return cardiac substructure doses as JSON `null` for fetus and mother, with Heart wall dose reported separately.

### September 9, 2026 — Maintenance Update

#### GUI

- Corrected a TCM organ-dose error in which strengths from 0.1 to 0.9 applied only the scan-average CTDIvol uniformly across the scan range, followed by an abrupt change to a slice-specific profile at 1.0. The GUI and Batch Manager now apply a continuously modulated CTDIvol profile normalized to the scan-average CTDIvol.
- Corrected an off-by-one scan-range error that included the scan-start boundary as an extra slice when averaging CTDIvol.
- Corrected custom mA mapping in Batch Manager so the complete profile, including its final value, is mapped and normalized over the actual scan slices.
- Corrected two adult phantom identifiers that could prevent exact matching with the dose, TCM, and image libraries.
- Fixed a startup error caused by a trailing blank line in the water-equivalent-diameter reference data.
- Improved decimal-format and Batch CSV compatibility across locales, including custom mA profiles and flexible column order.
- Improved scan-range editing and clarified fetal and maternal dose results.
- Added signed and notarized macOS distribution support and updated documentation links.

#### API

- Corrected the same TCM organ-dose error so strengths from 0.1 to 1.0 apply a continuously modulated CTDIvol profile normalized to the scan-average CTDIvol.
- Corrected an off-by-one scan-range error that included the scan-start boundary as an extra slice when averaging CTDIvol.
- Corrected custom mA mapping so the complete profile, including its final value, is mapped and normalized over the actual scan slices.
- Corrected two adult phantom identifiers that could prevent exact matching with the dose and TCM libraries.
- Fixed a startup error caused by a trailing blank line in the water-equivalent-diameter reference data.
- Preserved the calculated precision of API dose results, including small nonzero doses previously rounded to zero in the response. This response-precision correction does not alter the underlying calculation algorithms or dose libraries.
- Changed dose values from two-decimal JSON strings to JSON numbers. Existing integrations must accept numeric dose values; field names, units, inputs, and phantom metadata are unchanged.

### May 2, 2026 — Scientific Update

#### GUI and batch processing

- Highlighted scan start and end lines in bold on hover.
- Updated GUI Batch calculations to use the same calculation workflow as the API.
- Updated GUI Batch CSV loading to use the same parameter names as the API JSON input.
- Removed required phantom-group and `dose_target` inputs; NCICT now infers patient, fetus, or mother dose from the age format and whether height is provided.
- Updated the recommended Batch CSV parameter order so scan start and end appear after WED.
- Added Batch CSV support for custom mA profiles by reading numeric cells from the `custom_ma` column through the end of the row when `tcm_strength` is `-1`.
- Added support for week-based pregnant phantom input in Batch CSV, such as `38wk`.
- Added closest-phantom matching in batch mode using age, height, weight, and WED.

#### API

- Added water-equivalent diameter (WED)-based phantom selection.
- Added internal handling for missing optional patient parameters, including height, weight, and WED.
- Added slice-specific `custom_ma` input when `tcm_strength` is set to `-1`.
- Standardized JSON input keys: `age`, `sex`, `height`, `weight`, `wed`, `start`, `end`, `kvp`, `tcm_strength`, `head_body`, and `ctdivol`.
- Removed required phantom-group and `dose_target` inputs; patient, fetus, and mother dose targets are inferred automatically.
- Added closest-phantom matching based on user-provided age, height, weight, and WED.
- Added scan range validation after landmark conversion.
- Improved API error responses for invalid input.

### April 24, 2026 — Scientific Update

- Corrected displayed DLP values that did not match CTDIvol multiplied by scan length.

### April 15, 2026 — Scientific Update

#### Phantom library

- Added 9 pediatric phantoms, bringing the size-dependent phantom library to 360 phantoms.
- Implemented detailed cardiac substructure models for all 360 size-dependent phantoms.

#### Dose calculation

- Recalculated the full dose library for 360 phantoms using the new cardiac models and six x-ray spectra.
- Adopted the ICRP Publication 133 skeletal dose response function.
- Adopted water-equivalent diameter (WED) for SSDE, calculated per slice from DICOM-converted voxel phantoms.
- Regenerated TCM profiles for all phantoms using 16 cm and 32 cm reference CTDI phantoms.
- Added nCTDIw values from CTDI survey data for Siemens X.cite, Definition Edge, Definition AS+, Definition Flash, Force, and Edge Plus; GE Revolution CT; and United Imaging uCT 760, uCT 820, and uCT 960+ scanners.
- Upgraded batch calculations to support exact height and weight selection of the 12 ICRP reference phantoms and cardiac substructure dose output for all 360 phantoms.

#### User interface

- Recolored 3D mesh phantoms and regenerated high-resolution phantom images.
- Enabled direct phantom map selection.
- Redesigned the GUI for improved visibility and usability.
- Replaced the Batch Mode menu with a dedicated button for improved accessibility.
- Allowed TCM strength to be entered directly in the text field.

#### Backend redesign

- Converted dose, TCM, and phantom image libraries from CSV to binary format for faster calculations.
- Redesigned the CTDI library for improved extensibility.

## 2024

### December 16, 2024 — Maintenance Update

- Fixed an issue where the Batch Run menu did not function correctly.

### December 15, 2024 — Maintenance Update

- Added in-application links to the user manual and technical support forum (now NCI Dose Tools Discussions).

### June 26, 2024 — Scientific Update

- Corrected an x-ray spectrum index mismatch between 100 and 120 kVp.

### February 29, 2024 — Scientific Update

- Corrected TCM profile selection for body phantoms.

### January 25, 2024 — Scientific Update

- Corrected effective diameter and SSDE updates when the scan range changes.

### January 24, 2024 — Scientific Update

- Added head CTDI phantom-based TCM profiles to better simulate pediatric CT examinations.
- Removed muscle layers from frontal and rear phantom views to improve visualization of internal anatomy.

## 2023

### April 28, 2023 — Maintenance Update

- Revised frontal and rear views of ICRP phantoms.

## 2022

### December 14, 2022 — Scientific Update

### November 23, 2022

- Published NCICT 2.0: Lee et al., “CT organ dose calculator size adaptive for pediatric and adult patients,” *Biomedical Physics & Engineering Express*, 8:065020 (2022).

## 2021

### November 23, 2021 — Maintenance Update

- Fixed a crash caused by blank lines in batch input files, often introduced during CSV editing in Excel.

### November 20, 2021 — Scientific Update

- Displayed the tube current profile per image slice alongside phantom visualization.
- Displayed “Average CTDIvol” when TCM strength is greater than 0.
- Displayed “Custom CTDIvol” when CTDIvol is entered manually.
- Fixed multiple TCM-related issues in the batch module.

### October 27, 2021 — Maintenance Update

- Made height and weight fields read-only for body size-dependent phantoms; body size is adjusted using arrow controls.
- Enabled batch input for pregnant women phantoms and fetal phantoms.
- Added User Manual and User Forum menu items under the **Help** menu (the forum is now NCI Dose Tools Discussions).

### October 21, 2021 — Scientific Update

- Derived tube current (mA) from custom CTDIvol values and enabled TCM for the derived mA profile.

### September 15, 2021 — Scientific Update

- Fixed an issue where the program stopped when the batch input file was missing.
- Separated mA and rotation time from mAs to support proper TCM adjustment.
- Added an mA limit to prevent unrealistically high mA values for obese patients in TCM mode.
- Disabled TCM when custom CTDIvol is entered.

### May 20, 2021 — Scientific Update

- Added automatic selection of the best-matching phantom based on patient height and weight in batch mode.

### May 13, 2021 — Scientific Update

- Added batch calculation functionality using `ncict_batch_input.csv`.
- Implemented tube current modulation using generic modulation profiles.

### March 7, 2021 — Scientific Update

- Added effective diameter calculation for pregnant women phantoms.

## 2020

### March 12, 2020 — Maintenance Update

- Improved scan range dragging speed in the Windows version.

## 2019

### December 5, 2019 — Scientific Update

- Added maternal organ dose calculations in NCICT 3.0.20191205.
- Presented NCICT at RSNA 2019.

### March 1, 2019 — Scientific Update

- Added eight pregnant phantoms with fetal models.
- Enabled fetal organ dose calculations.
- Released NCICT 3.0 build 20190301.

## 2018

### November 18, 2018 — Scientific Update

- Added 98 adult phantoms, completing the full set of 351 phantoms.
- Presented NCICTX at AAPM 2018 and renamed the software to NCICT.

## 2016

### April 1, 2016 — Scientific Update

- Added 72 adult and 181 pediatric phantoms in NCICTX 20160401.
- Presented NCICTX at AAPM 2016.

## 2015

### December 1, 2015

- Published NCICT 1.0 in the *Journal of Radiological Protection*.
- Presented NCICT at RSNA 2015.

## 2014

### December 1, 2014 — Scientific Update

- Replaced the original NCI phantoms with ICRP pediatric and adult phantoms.

## 2012

### April 18, 2012 — Maintenance Update

- Translated the MATLAB version to Visual Basic 6.0 in NCICT 1.0.20120418.
- Implemented the batch routine for automated calculations.
- Initiated public beta testing under a non-official data agreement.

## 2011

### May 17, 2011 — Scientific Update

- Released the initial NCICT 1.0 version based on NCI phantoms and the MATLAB framework.
