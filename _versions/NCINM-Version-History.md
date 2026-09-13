# NCINM Release History

_Scientific and maintenance update record for the National Cancer Institute dosimetry system for Nuclear Medicine._

Latest release: **September 9, 2026**
Latest scientific update: **May 10, 2026**
Record begins: **2019**

## 2026

### September 9, 2026 — Maintenance Update

#### Dose calculation corrections

- Corrected the Adult Male gonadal residence time for In-111-labelled human immunoglobulin from `75 h` to the ICRP Publication 128 value of `0.075 h`, preventing substantial overestimation of gonadal and effective dose.
- Corrected ICRP Publication 103 remainder-tissue weights so the 13 remainder tissues receive the full combined weight of `0.12` and the complete tissue-weighting factors sum to `1.0`.
- Corrected remainder-source volume weighting for overlapping blood and kidney source definitions, and corrected the API to use ICRP source-organ volumes when the ICRP phantom library is selected.
- Prevented negative interpolation artifacts in S values from propagating to calculations or exports.
- Corrected synchronization between edited Remainder cumulated activity and residence time so subsequent calculations use the edited value consistently.

#### Calculation safeguards

- Prevented concurrent API requests from mixing shared calculation state.
- Made S-value loading failures return an explicit API error instead of continuing with unavailable calculation data.

### August 22, 2026 — Maintenance Update

- Added dot- and comma-decimal input support to the GUI, Batch Manager, and API.
- Added comma- and semicolon-delimited batch CSV import while keeping exported CSV files comma-delimited with dot decimals.
- Clarified source and target table headers, including maternal source-region and fetal target-region labels on the Fetus tab.

### August 12, 2026 — Maintenance Update

#### macOS security and distribution

- Signed both the macOS application and distribution disk image (DMG) with the National Cancer Institute's Apple-issued Developer ID Application certificate.
- Enabled the Hardened Runtime, notarized the signed DMG through Apple's notarization service, and stapled the notarization ticket to the DMG.
- Both the DMG and application can be verified by macOS Gatekeeper and no longer trigger the usual unidentified-developer blocking message when the distributed files are unmodified.

### May 10, 2026 — Scientific Update

#### GUI

- Expanded the radionuclide S-value library to **1,070 radionuclides** based on photon and electron emissions from **ICRP Publication 107**.
- Added a fetus phantom library with gestational ages of **8, 10, 15, 20, 25, 30, 35, and 38 weeks**.
- Added mother-to-fetus SAF-based S values for maternal source regions and fetal target organs.
- Added fetal target-organ masses and maternal source-region volumes, including placenta and amniotic-fluid source regions.
- Updated high-quality phantom display views, including fetus phantom views for the new gestational ages.
- Updated the radionuclide menu and standardized radiopharmaceutical-name loading.
- Improved performance through backend optimization.
- Updated source and target listboxes with header rows, adjusted column widths, and automatic shading for source rows with non-zero residence time.
- Kept the Radiopharmaceutical tab blank for fetus phantom calculations because pregnancy-specific radiopharmaceutical biokinetic models are not currently defined. Fetus calculations use the Radionuclide tab with user-entered maternal source-region data.

#### Batch Manager

- Added a Batch Manager for CSV-based dose calculations from the NCINM3 GUI.
- Added radiopharmaceutical fuzzy matching for clinical-style names and common radionuclide notation variants such as `F-18`, `18F`, `Tc-99m`, and `99mTc`.
- Added the example batch input file `ncinmBatchInput.csv`.
- Batch calculations use the same NCI and ICRP radiopharmaceutical workflow as the API.
- Automatically matches a radiopharmaceutical name read from batch CSV to the closest library entry using fuzzy matching.
- Added nearest-age phantom matching.
- Batch output is saved as CSV and includes resolved input values, radiopharmaceutical match information, and organ-dose columns.
- Updated dose-output column names to use the `Dose` prefix, such as `Dose Adipose`.

#### API

- Added radiopharmaceutical fuzzy matching for clinical-style names and common radionuclide notation variants.
- Updated API input to named JSON fields with common aliases for phantom library, sex, age, radiopharmaceutical, and administered activity.
- Expanded API output with `input`, `phantom_age_match`, `radiopharmaceutical_match`, and `dose_mGy` JSON sections.
- Added arbitrary patient-age matching to the nearest available NCINM phantom age group.
- Automatically matches a radiopharmaceutical name received in JSON input to the closest library entry.
- Documented support for the NCI and ICRP radiopharmaceutical workflow. Fetus calculations are handled in the GUI through the Radionuclide tab with user-entered maternal source-region data.
- Added local API test file `_ncinm3api_test.http`.

## 2024

### December 15, 2024 — Scientific Update

- Added in-application links to the user manual and technical support forum (now NCI Dose Tools Discussions).
- Corrected radionuclide selection when switching radiopharmaceuticals.

### January 24, 2024 — Scientific Update

- Added biokinetic models developed for pediatric thyroid cancer patients (Kwon et al., *Journal of Radiological Protection*, 2023).
- Added biokinetic models developed for adult thyroid cancer patients (Kwon et al., *Journal of Radiological Protection*, in press at the time of release).
- Removed biokinetic models derived from older ICRP Publications 53, 80, and 106 when updated data from **ICRP Publication 128** were available.

## 2022

### December 15, 2022 — Scientific Update

- Corrected mismatches between radionuclides and radiopharmaceuticals.
- Sorted radiopharmaceutical names alphabetically.
- Revised the effective-dose calculation algorithm.

### December 14, 2022 — Scientific Update

- Published NCINM 2.0: Villoing et al., “Organ dose calculator for diagnostic nuclear medicine patients based on the ICRP reference voxel phantoms and biokinetic models,” *Biomedical Physics & Engineering Express*, 9:015004 (2023).
- Included blood mass in target-organ mass for ICRP pediatric and adult phantoms when blood is the source region, consistent with **ICRP Publication 133**.
- Extended biokinetic data to **230 radiopharmaceuticals** from ICRP Publications 53, 80, 106, and 128.

### November 9, 2022 — Scientific Update

- Fixed issues related to radionuclide and radiopharmaceutical mismatches.
- Enabled copy and paste by mouse dragging.

### September 19, 2022 — Scientific Update

- Updated adult gastrointestinal-tract self- and cross-fire SAFs using **ICRP Publication 133**.
- Fixed an issue that prevented S-value export for ICRP phantoms.

### May 12, 2022 — Scientific Update

- Added biokinetic data for four additional radiopharmaceuticals.
- Corrected ovary-data issues in the ICRP 15-year-old female phantom.

### April 20, 2022 — Scientific Update

- Revised NCI phantom-based active marrow and endosteum SAFs and S values using the latest dose-response functions adopted by **ICRP Committee 2**.

### March 29, 2022 — Scientific Update

- Corrected logical errors in skeletal dose calculations.
- Removed effective-dose calculations based on ICRP Publication 60 tissue-weighting factors.
- Added effective-dose calculations using ICRP Publication 103 tissue-weighting factors to target-organ dose values automatically copied to the clipboard.
- Corrected blood-inclusive target-organ mass values.
- Extended biokinetic data to **101 radiopharmaceuticals** from ICRP Publications 53, 80, and 106.

## 2021

### November 29, 2021 — Maintenance Update

- Implemented frontal images of ICRP voxel phantoms, replacing frontal images of NCI hybrid phantoms.

### November 13, 2021 — Scientific Update

- Corrected the zero-adipose-mass issue for the ICRP newborn female phantom.
- Fixed errors in the Windows installation file.
- Revised the user interface to be more compact.

### October 19, 2021 — Scientific Update

- Added biokinetic data for **62 radiopharmaceuticals**.
- Added User Manual and User Forum items under the Help menu (the forum is now NCI Dose Tools Discussions).

### May 15, 2021 — Scientific Update

- Added blood mass to target-organ mass in ICRP pediatric reference phantoms, consistent with adult ICRP phantoms in **ICRP Publication 133**.

### May 13, 2021 — Scientific Update

- Added biokinetic models for 12 radiopharmaceuticals extracted from multiple ICRP publications.
- Added S values from the 12 ICRP reference pediatric and adult phantoms.

## 2020

### July 20, 2020

- Published NCINM 1.0: Villoing et al., “NCINM: organ dose calculator for patients undergoing nuclear medicine procedures,” *Biomedical Physics & Engineering Express*, 6:055010 (2020).

### March 12, 2020 — Scientific Update

- Completed comprehensive benchmarking against **OLINDA/EXM 1.0** and **IDAC 2.1**.

## 2019

### August 22, 2019 — Scientific Update

- Created NCINM 1.0 based on the 12 NCI reference phantoms.
- Initiated alpha testing.
