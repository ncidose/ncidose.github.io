# PHANTOM Library History

_Public release and maintenance record for the NCI computational phantom libraries._

Latest update: **August 20, 2026**
Latest official release: **August 11, 2026**
Record begins: **2010**

## 2026

### August 20, 2026

- Corrected the 20- and 25-week breech fetal surfaces to remain within the uterus.
- Fixed pregnant-phantom volume clipping by sizing single-resolution grids from
  the anatomical mesh bounds with padding, then regenerated all affected arm and
  armless NIfTI phantoms.
- Updated and validated the related metadata, MCNP files, and master workbook.

### August 11, 2026 — Official Release

- Renamed and reorganized PHANTOM folders so the main libraries are easier to
  browse: `nci-reference`, `nci-size`, `nci-pregnant`, and `icrp-reference`.
- Standardized release filenames across NIfTI, DICOMRT, Monte Carlo input files,
  and the master workbook, now named `phantom-mastertable.xlsx`.
- Updated the pregnant phantom release so arm/armless and single-/multi-resolution
  folders use a consistent naming pattern. Cephalic presentations are included for
  all gestational ages, with breech presentations included where available.
- Added starting MCNP input files for the pregnant multi-resolution phantoms, with
  one input file per gestational age and clear options for available fetal
  presentations.
- Simplified the ICRP armless folder so NIfTI files are stored directly in
  `icrp-reference/armless`, while DICOMRT files remain in the `dicomrt` subfolder.
- Consolidated folder-level notes into the PHANTOM user manual so the release
  package is cleaner and easier to navigate.
- Improved the NIfTI files so common imaging and analysis software can recognize
  them more consistently as label-map phantoms.
- Placed NCI reference-size NIfTI files directly in their arm/resolution folders,
  matching the layout used by the NCI size-dependent library.
- Updated adult phantom naming to use the `35` reference-adult age code, consistent
  with the ICRP adult reference convention.

### July 1, 2026

- Added an additional armless NCI size-dependent NIfTI set with a lower in-plane
  resolution and a higher slice resolution, covering all 362 size-dependent
  phantoms.
- Reorganized the download folder so users first choose the phantom library and
  then choose the available format or posture.
- Standardized the names of the smallest newborn size-dependent phantoms across
  the files and master table.
- Corrected the low-resolution newborn files so their body height and voxel spacing
  are consistent with the rest of the library.
- Added missing legacy binary files for the two smallest newborn phantoms.

### May 31, 2026

- Added compressed NIfTI (`.nii.gz`) versions of the NCI reference-size, size-dependent, and pregnant phantom libraries.
- Released NIfTI datasets for NCI reference-size phantoms with arms at high resolution; NCI pregnant woman phantoms at high resolution; and NCI size-dependent phantoms with and without arms at high and low resolution.
- The reference-size dataset includes **12 phantoms**, each size-dependent dataset includes **362 phantoms**, and the pregnant dataset includes **8 phantoms**.
- All NIfTI datasets preserve the organ-label information from the corresponding phantom library.
- Moved legacy binary voxel files to the archive area for compatibility with existing workflows at the time of this release.
- Recommended NIfTI for new downloads because it is smaller, easier to share, and can be read directly by common medical-imaging software.
- Compressed NIfTI made release of the full high-resolution NCI size-dependent library practical despite the size of the corresponding raw binary files.

## 2025

### December 10, 2025 — Official Release

- Expanded anatomical detail across the NCI reference-size and body size-dependent phantom libraries.
- Added refined cardiac substructures, including heart chambers, myocardium, coronary arteries, cardiac valves, and conduction nodes.
- Incorporated the full **362-phantom** body size-dependent library, including the 11 small pediatric phantoms added in the January 27, 2024 update.
- Unified the reference-size and body size-dependent master tables to improve consistency in organ names, organ IDs, and supporting information.
- Recalculated organ volumes and masses using a consistent workflow.
- Updated skeletal dose-response data used for marrow and endosteum dose estimation.

## 2024

### December 14, 2024 — Official Release

- Released the **362 size-specific phantoms** at low resolution.
- Released DICOM-RT datasets containing DICOM CT and RT Structure data for ICRP reference pediatric and adult phantoms, UF/NCI pregnant women with fetus phantoms, and UF/NCI reference-size phantoms.

### January 27, 2024

- Added 11 pediatric phantoms to the size-specific phantom library, bringing the
  total to **362**.

## 2022

### December 14, 2022 — Official Release

### January 25, 2022

- Adjusted ovary locations using measurements from Kelsey et al. (2013).
- Adjusted breast locations using CT images from the NWTS cohort.
- Applied the updates to both reference-size and body size-dependent phantom libraries.

## 2021

### December 8, 2021

- Released ICRP reference pediatric and adult phantoms in DICOM-RT format.
- Provided versions with and without arms.

## 2019

### January 1, 2019

- Developed methods to convert binary voxel phantoms to DICOM CT images and DICOM
  structure sets.
- Converted the reference-size and body size-dependent libraries.

## 2018

### November 13, 2018

- Updated the body-shape adjustment factor for selected size-dependent phantoms to
  improve consistency across the library.

### Selected updates, 2014–2018

- Separated arm structures to support armless phantom versions.
- Refined bone and marrow-related anatomy.
- Corrected overlap issues involving the ovaries, uterus, and colon.
- Completed the body size-dependent phantom library in collaboration with the University of Florida.

## 2010

### January 1, 2010

- Completed the 12 reference-size pediatric and adult male and female phantoms.
- Released the phantoms in binary voxel format.
