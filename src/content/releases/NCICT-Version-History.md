# NCICT Version History

_Public release and maintenance record for the National Cancer Institute dosimetry system for Computed Tomography._

Latest update: **July 13, 2026**
Latest official release: **4.20260415**
Record begins: **2011**

## 2026

### July 13, 2026

#### CTDI library

- Updated the NCICT CTDI library to the 20260713 release.
- Expanded the scanner library from 173 to 245 scanner model entries, including additions from the Korean CTDI survey.

#### kVp handling

- Updated displayed nCTDIw calculation for user-entered kVp values.
- nCTDIw is now linearly interpolated between the tabulated CTDI library values at 80, 100, 120, and 140 kVp.
- For kVp values below 80 or above 140, nCTDIw is extrapolated from the nearest endpoint using the previous power-law scaling approach.
- Organ dose conversion coefficients are now interpolated or extrapolated using log-linear interpolation based on the 80, 100, and 120 kVp dose libraries.
- TCM profiles are now interpolated or extrapolated using log-linear interpolation based on the 80, 100, 120, and 140 kVp TCM libraries.
- Applied the same kVp interpolation and extrapolation logic to GUI calculations, GUI batch calculations, and API calculations.

### May 2, 2026

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

### April 24, 2026

- Corrected displayed DLP values that did not match CTDIvol multiplied by scan length.

### April 15, 2026 — Official Release 4.20260415

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

### December 16, 2024

- Fixed an issue where the Batch Run menu did not function correctly.

### December 15, 2024 — Official Release 3.0.20241215

- Added in-application links to the user manual and technical support forum (now NCI Dose Tools Discussions).

### June 26, 2024

- Corrected an x-ray spectrum index mismatch between 100 and 120 kVp.

### February 29, 2024

- Corrected TCM profile selection for body phantoms.

### January 25, 2024

- Corrected effective diameter and SSDE updates when the scan range changes.

### January 24, 2024 — Official Release 3.0.20240124

- Added head CTDI phantom-based TCM profiles to better simulate pediatric CT examinations.
- Removed muscle layers from frontal and rear phantom views to improve visualization of internal anatomy.

## 2023

### April 28, 2023

- Revised frontal and rear views of ICRP phantoms.

## 2022

### December 14, 2022 — Official Release 3.0.20221123

### November 23, 2022

- Published NCICT 2.0: Lee et al., “CT organ dose calculator size adaptive for pediatric and adult patients,” *Biomedical Physics & Engineering Express*, 8:065020 (2022).

## 2021

### November 23, 2021

- Fixed a crash caused by blank lines in batch input files, often introduced during CSV editing in Excel.

### November 20, 2021

- Displayed the tube current profile per image slice alongside phantom visualization.
- Displayed “Average CTDIvol” when TCM strength is greater than 0.
- Displayed “Custom CTDIvol” when CTDIvol is entered manually.
- Fixed multiple TCM-related issues in the batch module.

### October 27, 2021

- Made height and weight fields read-only for body size-dependent phantoms; body size is adjusted using arrow controls.
- Enabled batch input for pregnant women phantoms and fetal phantoms.
- Added User Manual and User Forum menu items under the **Help** menu (the forum is now NCI Dose Tools Discussions).

### October 21, 2021

- Derived tube current (mA) from custom CTDIvol values and enabled TCM for the derived mA profile.

### September 15, 2021

- Fixed an issue where the program stopped when the batch input file was missing.
- Separated mA and rotation time from mAs to support proper TCM adjustment.
- Added an mA limit to prevent unrealistically high mA values for obese patients in TCM mode.
- Disabled TCM when custom CTDIvol is entered.

### May 20, 2021

- Added automatic selection of the best-matching phantom based on patient height and weight in batch mode.

### May 13, 2021 — Official Release 3.0.20210513

- Added batch calculation functionality using `ncict_batch_input.csv`.
- Implemented tube current modulation using generic modulation profiles.

### March 7, 2021

- Added effective diameter calculation for pregnant women phantoms.

## 2020

### March 12, 2020 — Official Release 3.0.20200312

- Improved scan range dragging speed in the Windows version.

## 2019

### December 5, 2019

- Added maternal organ dose calculations in NCICT 3.0.20191205.
- Presented NCICT at RSNA 2019.

### March 1, 2019

- Added eight pregnant phantoms with fetal models.
- Enabled fetal organ dose calculations.
- Released NCICT 3.0 build 20190301.

## 2018

### November 18, 2018 — Official Release 2.0.20181118

- Added 98 adult phantoms, completing the full set of 351 phantoms.
- Presented NCICTX at AAPM 2018 and renamed the software to NCICT.

## 2016

### April 1, 2016

- Added 72 adult and 181 pediatric phantoms in NCICTX 20160401.
- Presented NCICTX at AAPM 2016.

## 2015

### December 1, 2015

- Published NCICT 1.0 in the *Journal of Radiological Protection*.
- Presented NCICT at RSNA 2015.

## 2014

### December 1, 2014 — Official Release 1.0.20141201

- Replaced the original NCI phantoms with ICRP pediatric and adult phantoms.

## 2012

### April 18, 2012

- Translated the MATLAB version to Visual Basic 6.0 in NCICT 1.0.20120418.
- Implemented the batch routine for automated calculations.
- Initiated public beta testing under a non-official data agreement.

## 2011

### May 17, 2011

- Released the initial NCICT 1.0 version based on NCI phantoms and the MATLAB framework.
