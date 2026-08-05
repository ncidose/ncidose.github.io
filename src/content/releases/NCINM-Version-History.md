# NCINM Release History

_Public release and maintenance record for the National Cancer Institute dosimetry system for Nuclear Medicine._

Latest update: **May 10, 2026**
Latest official release: **3.20260510**
Record begins: **2019**

## 2026

### May 10, 2026 — Official Release 3.20260510

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

### December 15, 2024 — Official Release 2.0.20241215

- Added in-application links to the user manual and technical support forum (now NCI Dose Tools Discussions).
- Corrected radionuclide selection when switching radiopharmaceuticals.

### January 24, 2024 — Official Release 2.0.20240124

- Added biokinetic models developed for pediatric thyroid cancer patients (Kwon et al., *Journal of Radiological Protection*, 2023).
- Added biokinetic models developed for adult thyroid cancer patients (Kwon et al., *Journal of Radiological Protection*, in press at the time of release).
- Removed biokinetic models derived from older ICRP Publications 53, 80, and 106 when updated data from **ICRP Publication 128** were available.

## 2022

### December 15, 2022

- Corrected mismatches between radionuclides and radiopharmaceuticals.
- Sorted radiopharmaceutical names alphabetically.
- Revised the effective-dose calculation algorithm.

### December 14, 2022 — Official Release 2.0.20221214

- Published NCINM 2.0: Villoing et al., “Organ dose calculator for diagnostic nuclear medicine patients based on the ICRP reference voxel phantoms and biokinetic models,” *Biomedical Physics & Engineering Express*, 9:015004 (2023).
- Included blood mass in target-organ mass for ICRP pediatric and adult phantoms when blood is the source region, consistent with **ICRP Publication 133**.
- Extended biokinetic data to **230 radiopharmaceuticals** from ICRP Publications 53, 80, 106, and 128.

### November 9, 2022

- Fixed issues related to radionuclide and radiopharmaceutical mismatches.
- Enabled copy and paste by mouse dragging.

### September 19, 2022

- Updated adult gastrointestinal-tract self- and cross-fire SAFs using **ICRP Publication 133**.
- Fixed an issue that prevented S-value export for ICRP phantoms.

### May 12, 2022

- Added biokinetic data for four additional radiopharmaceuticals.
- Corrected ovary-data issues in the ICRP 15-year-old female phantom.

### April 20, 2022

- Revised NCI phantom-based active marrow and endosteum SAFs and S values using the latest dose-response functions adopted by **ICRP Committee 2**.

### March 29, 2022

- Corrected logical errors in skeletal dose calculations.
- Removed effective-dose calculations based on ICRP Publication 60 tissue-weighting factors.
- Added effective-dose calculations using ICRP Publication 103 tissue-weighting factors to target-organ dose values automatically copied to the clipboard.
- Corrected blood-inclusive target-organ mass values.
- Extended biokinetic data to **101 radiopharmaceuticals** from ICRP Publications 53, 80, and 106.

## 2021

### November 29, 2021

- Implemented frontal images of ICRP voxel phantoms, replacing frontal images of NCI hybrid phantoms.

### November 13, 2021

- Corrected the zero-adipose-mass issue for the ICRP newborn female phantom.
- Fixed errors in the Windows installation file.
- Revised the user interface to be more compact.

### October 19, 2021

- Added biokinetic data for **62 radiopharmaceuticals**.
- Added User Manual and User Forum items under the Help menu (the forum is now NCI Dose Tools Discussions).

### May 15, 2021

- Added blood mass to target-organ mass in ICRP pediatric reference phantoms, consistent with adult ICRP phantoms in **ICRP Publication 133**.

### May 13, 2021 — Official Release 2.0.20210301

- Added biokinetic models for 12 radiopharmaceuticals extracted from multiple ICRP publications.
- Added S values from the 12 ICRP reference pediatric and adult phantoms.

## 2020

### July 20, 2020

- Published NCINM 1.0: Villoing et al., “NCINM: organ dose calculator for patients undergoing nuclear medicine procedures,” *Biomedical Physics & Engineering Express*, 6:055010 (2020).

### March 12, 2020 — Official Release

- Completed comprehensive benchmarking against **OLINDA/EXM 1.0** and **IDAC 2.1**.

## 2019

### August 22, 2019

- Created NCINM 1.0 based on the 12 NCI reference phantoms.
- Initiated alpha testing.
