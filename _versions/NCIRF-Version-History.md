# NCIRF Release History

_Scientific and maintenance update record for the National Cancer Institute dosimetry system for Radiography and Fluoroscopy._

Latest release: **September 10, 2026**
Latest scientific update: **September 10, 2026**
Record begins: **2022**

## 2026

### September 10, 2026 — Scientific Update

#### Scientific changes

##### GUI

- Introduced an integrated **custom x-ray spectrum generator powered by SpekPy 2.5.4** through the NCI-hosted SpekPy service. It supports **W, Mo, and Rh targets**; Internet access is required only when generating a new spectrum, while spectra already added or imported remain available offline.
- Added target-specific tube settings: **W from 20–125 kVp** using `spekcalc`, `casim`, or `spekpy-v1`, and **Mo or Rh from 20–50 kVp** using `casim`, with a user-selectable anode angle.
- Added an ordered **multi-filter editor with 12 available filter materials**: Al, Cu, Sn, Be, Air, Mo, Rh, Ag, Ti, Er, Gd, and Pb. Multiple filters can be combined and are applied in the displayed order.
- Added a normalized spectrum preview, optional matching to a specified **Al HVL**, and validation of spectrum names, target/model combinations, tube potential, filtration, service version, and returned energy data.
- Converted each generated spectrum onto NCIRF's fixed **62-value energy grid** for use with the existing Monte Carlo source definition and DAP-normalization workflow.
- Added persistent named custom spectra, portable `.ncirfspc` import/export, and self-contained Batch packages that save and reload companion spectrum files while retaining legacy `.spc` compatibility.

##### API

- Added **registered custom spectra for vendor- and protocol-specific beam modeling** in reference, size-dependent, and pregnant phantom calculations. Vendors can generate a spectrum in the GUI, export its `.ncirfspc` file, and submit it to the NCI Dose Tools administrator for server-side registration.
- Added authenticated **`GET /spectra`** to list the **114 built-in spectra** and custom spectra registered for the requesting company, with stable IDs, kVp, HVL, and available target, filtration, and generator metadata. Vendors can review this catalog before requesting additional beams.
- Added **`SpectrumID`** selection in `POST /param`, allowing equipment/protocol mappings to reuse a registered beam without resending SpekPy parameters or spectrum files for each calculation. Existing kVp/HVL-only requests continue to use the built-in library.
- Applied the GUI's spectrum-file validation, fixed **62-value energy grid**, and DAP-normalization workflow to registered custom beams. Dose requests use the stored spectrum; the API does not generate spectra online or accept client-supplied server file paths.
- Added **`matched.spectrum`** metadata to dose results for beam traceability while retaining the existing flat spectrum fields. Custom IDs are protected against reuse with changed beam content; changing a registered beam requires a new ID. Unknown or unauthorized IDs are rejected without silently substituting a built-in spectrum.

#### Corrections and maintenance changes

- **macOS and Windows correction:** Fixed x-ray spectrum sampling when energy bins have zero weight, preserving the intended energy distribution. The previous engine could overestimate some organ doses, particularly for low-energy spectra.

- Added **signed and notarized macOS distribution** support.
- Improved decimal-format and **Batch CSV compatibility across locales**.
- Corrected spectrum selection and reproducibility issues, including the size-dependent one-row shift, reused `SpectrumID` conflicts, and unsupported API kVp/HVL matching.
- Corrected effective dose calculation to avoid weighting the separately reported rectosigmoid dose as colon a second time.
- Restricted size-dependent phantom matching to the requested age and sex group.
- Clarified the Fetus interface and improved field-box editing feedback.

### May 10, 2026 — Scientific Update

#### GUI

- Added detailed pregnant phantoms with fetal models for gestational-age dose evaluation.
- Expanded the size-dependent phantom library to **362 phantoms**.
- Added a Monte Carlo calculation progress bar with percentage display, a stop button, and `Preparing Monte Carlo...` status while transport preparation is in progress.
- Automatically adjusted PSA limits based on SID and phantom size, with PSA support from **−90 to 90 degrees**.
- Improved phantom picture resolution and refreshed the size-dependent phantom map with clearer selectable cells and selected-cell highlighting.
- Added phantom selection by clicking the phantom map.
- Added field-box movement by dragging inside the box or clicking and dragging the field center.
- Added field-box resizing in top, frontal, and lateral phantom views by dragging a box edge. The field center remains fixed and the opposite edge changes symmetrically.
- Field-box edge resizing now updates Field Width and Field Height using the current PPA/PSA projection of the beam-normal field size.
- Added cursor up/down key support for numeric input fields.
- Improved calculation and user-interface response through backend optimization.

#### Batch Manager

- Added progress percentage display beside the Run checkbox.
- Updated saved Batch CSV output to include input parameters, completion progress, dose columns, and error columns.
- Unified reference, size-dependent, and pregnant phantom batch managers into one **Batch Manager**.
- Added a unified Phantom Library input for arm-raised, arm-lowered, arm-rotated, size-dependent, and pregnant libraries.
- Added editable Batch Manager cells with immediate reflection in the main GUI.
- Added detailed column tooltips on Batch Manager header hover.
- Added `f`/`m` sex input support while retaining compatibility with `F`/`M` and `1`/`2` during CSV loading.
- Automatically snaps reference-phantom age to the nearest supported reference age.
- Automatically derives the size-phantom group from age and sex.
- Automatically matches size-phantom height and weight to the nearest available phantom grid.
- Added pregnant phantom week input such as `8wk`, `10wk`, and `15wk`.
- Reflected each completed batch-row result in the main GUI.
- Removed the output-save prompt at batch-run start.
- Stores completed batch dose and error results internally and displays them when a completed row is selected.
- Sending the current GUI setup to Batch Manager preserves completed dose and error results when available, adding the row as `100%`; otherwise, the row is added as input only with `0%`.
- Added Run checkbox support with Select All and Deselect All controls.
- Added CSV save and load with headers.
- Uses `Dose` and `Error` column prefixes in saved Batch CSV output.
- Saves incomplete rows with `0%` progress and blank result fields.
- Restores saved completed dose and error results during Batch CSV loading.

#### API

- Added support for reference, size-dependent, and pregnant phantom libraries through the same API endpoint.
- Added the NCIRF4 API project for REST-style JSON dose calculations.
- Added JSON object input through `/param` using NCIRF4 batch-style keys such as `PhtLib`, `Age`, `kVp`, `HVL`, `SID`, `DAP`, `Hist`, and `Thread`.
- Added JSON output with matched phantom metadata, dose values, and error percentages.
- Added local REST Client examples in `ncirf4api_test.http`.

## 2024

### December 17, 2024 — Maintenance Update

#### Bug fixes

- Fixed a calculation failure for the first size-specific phantom: female, 85 cm, 10 kg.
- Resolved Windows packaging issues.
- Corrected missing thread information in `ncirf_batch_input_sizespecific.csv`.

### December 15, 2024 — Scientific Update

#### New features

- Added more than **360 pediatric and adult male and female phantoms** covering a wide range of body sizes.
- Accelerated peak skin dose calculation; stable results are achievable with approximately 10<sup>5</sup> histories using dose-map smoothing.
- Added patient-table thickness input for explicit Monte Carlo calculations.
- Added automatic selection of the best-matching x-ray spectrum in **Batch Manager**.
- Added numeric patient-age input in Batch Manager as an alternative to age-group selection for reference phantoms.
- Added in-application links to the user manual and technical support forum (now NCI Dose Tools Discussions).

#### Bug fixes from the July 18, 2024 beta

- Corrected the x-ray spectrum selection shift.
- Fixed missing liver voxel tags for phantoms `2085015`, `1145030`, and `1175050`.
- Corrected GUI parameter updates when double-clicking a Batch Manager entry.
- Corrected slight underestimation of active marrow and endosteum doses in abdominal skeletons.
- Corrected field-height visualization for 15-year-old and adult phantoms.

### March 1, 2024 — Scientific Update

- Corrected GEANT4 simulation of field width and field height.
- Corrected Monte Carlo particle accounting for generated and collimated particles.

### February 8, 2024 — Maintenance Update

- Added support for batch configurations with HVL formatted as `X.X0`.
- Added peak skin dose to batch output.

### January 24, 2024 — Scientific Update

- Implemented peak skin dose calculation using Monte Carlo radiation transport.
- Added an **arms-rotated** phantom library to better simulate upper-extremity radiography examinations.

## 2023

### November 16, 2023 — Scientific Update

- Fixed a hardcoded cone-beam divergence issue.
- Enabled arm-rotated posture for upper-extremity radiography simulations.

### August 12, 2023 — Scientific Update

- Fixed errors in Batch Manager-based runs.
- Increased the maximum number of threads to **24**.

### May 6, 2023 — Maintenance Update

- Added direct MCNP input-file generation from Batch Manager.
- Corrected minor visualization issues.

## 2022

### December 14, 2022 — Scientific Update

### April 18, 2022 — Scientific Update

- Corrected simulation handling of custom beam-angle inputs.

### March 17, 2022 — Maintenance Update

- Verified NCIRF operation on Windows virtual machines using Parallels.
- Fixed GEANT4 path-handling errors on non-English Windows systems.

### March 7, 2022 — Scientific Update

- Added two reference phantom libraries: arms raised and arms lowered.
- Set the default initial phantom to newborn male.
- Fixed an error that occurred when no file was selected.
