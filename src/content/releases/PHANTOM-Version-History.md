# PHANTOM Library History

_Public release and maintenance record for the NCI computational phantom libraries._

Latest update: **July 1, 2026**
Latest official release: **December 10, 2025**
Record begins: **2010**

## 2026

### July 1, 2026

- Added a new NCI size-dependent armless NIfTI dataset at **xy-low / z-high resolution** (`nci_size/armless_xylow_zhigh/niigz`, **362 phantoms**), voxelized from the source mesh library.
- Reorganized the download folder from a format-first layout (`niigz/`, `dicomrt/`, `mc-input/`, `_archive/`) to a **phantom-library-first** layout (`nci_size/`, `nci_reference/`, `nci_pregnant/`, `icrp_reference`), with format subfolders (`bin`, `niigz`, `dicomrt`, `mc-input`) nested under each posture and resolution folder. The `_archive` folder no longer exists as a separate top-level category.
- Unified the smallest neonate phantom identifiers to **00f050005** and **00m050005** across the master table and all size-dependent libraries. These were previously labeled **00f051004** and **00m051004** in some size-dependent tables.
- Corrected a voxel-count error in the `arm_lowres` and `armless_lowres` libraries for phantoms `00f050005` and `00m050005`, where the z-axis voxel count had not been recomputed for low resolution and resulted in doubled phantom height. Both libraries were revoxelized at the correct low-resolution spacing.
- Filled in previously missing `bin` files for `00f050005` and `00m050005` in `nci_size/arm_highres` and `nci_size/arm_lowres`.

### May 31, 2026

- Added compressed NIfTI (`.nii.gz`) versions of the NCI reference-size, size-dependent, and pregnant phantom libraries.
- Released NIfTI datasets for NCI reference-size phantoms with arms at high resolution; NCI pregnant woman phantoms at high resolution; and NCI size-dependent phantoms with and without arms at high and low resolution.
- The reference-size dataset includes **12 phantoms**, each size-dependent dataset includes **362 phantoms**, and the pregnant dataset includes **8 phantoms**.
- All NIfTI datasets preserve the voxelized organ-label data from the corresponding phantom library.
- Moved legacy binary voxel files to the `_archive` folder for compatibility with existing workflows at the time of this release.
- Recommended NIfTI for new downloads because it is smaller, contains header metadata, and can be read directly by common medical-imaging software.
- Compressed NIfTI made release of the full high-resolution NCI size-dependent library practical despite the size of the corresponding raw binary files.

## 2025

### December 10, 2025 — Official Release

- Expanded anatomical detail across the NCI reference-size and body size-dependent phantom libraries.
- Added refined cardiac substructures, including heart chambers, myocardium, coronary arteries, cardiac valves, and conduction nodes.
- Incorporated the full **362-phantom** body size-dependent library, including the 11 small pediatric phantoms added in the January 27, 2024 update.
- Unified the reference-size and body size-dependent organ master tables to improve consistency in organ definitions, IDs, and metadata.
- Recomputed voxel counts, organ volumes, and organ masses using a standardized workflow.
- Updated skeletal dose-response functions for marrow and endosteum dose estimation using the latest ICRP-approved data.

## 2024

### December 14, 2024 — Official Release

- Released the **362 size-specific phantoms** voxelized at low resolution.
- Released DICOM-RT datasets containing DICOM CT and RT Structure data for ICRP reference pediatric and adult phantoms, UF/NCI pregnant women with fetus phantoms, and UF/NCI reference-size phantoms.

### January 27, 2024

- Added 11 phantoms to the size-specific phantom library, bringing the total to **362**:
  - `00f050005.3dm`
  - `00f065005.3dm`
  - `00m050005.3dm`
  - `00m065005.3dm`
  - `01f065010.3dm`
  - `01f075010.3dm`
  - `01f095010.3dm`
  - `01m065010.3dm`
  - `01m075010.3dm`
  - `01m095010.3dm`
  - `05f115015.3dm`

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

- Developed methods to convert binary voxel phantoms to DICOM CT and DICOM Structure.
- Converted the reference-size and body size-dependent libraries.

## 2018

### November 13, 2018

- Adjusted gamma to 1.0 for the following phantoms: `05f105020`, `05f105025`, `05m095020`, `30f165050`, `30f165100`, `30f170080`, `30m160055`, `30m160060`, `30m165080`, `30m165085`, `30m165090`, `30m170055`, `30m175055`, `30m175060`, `30m175070`, `30m175075`, `30m175085`, `30m175090`, and `30m190075`.

### Selected updates, 2014–2018

- Separated and revoxelized arm structures for armless phantoms.
- Refined skeletal layers, including cortical bone and spongiosa.
- Corrected organ-overlap issues involving the ovaries, uterus, and colon.
- Completed the body size-dependent phantom library in collaboration with the University of Florida.

## 2010

### January 1, 2010

- Completed the 12 reference-size pediatric and adult male and female phantoms.
- Released the phantoms in binary voxel format.
