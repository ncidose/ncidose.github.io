# NCINM 3
_**NCI Dosimetry System for Nuclear Medicine**_

Current documented release: **NCINM3.20260510**

![NCINM 3 main window showing fetus phantom selection, source-region data, and target-organ dose output](images/ncinm3-main-window.png)

---

## Introduction

The **National Cancer Institute Dosimetry System for Nuclear Medicine (NCINM)**
is a reference internal dosimetry program developed by the National Cancer
Institute (NCI) for estimating organ absorbed doses and effective dose from
nuclear medicine procedures.

NCINM3 uses pre-calculated S values and, when available, predefined biokinetic
data to calculate organ doses for selected computational human phantoms. The
current release includes NCI, ICRP, and fetus phantom libraries, with
mother-to-fetus S values for fetal dose calculations. It supports
population-based dose evaluation, benchmarking, and research workflows. It is
not intended for patient-specific clinical decision support.

---

## Calculation Workflow

| Step | Description |
|---|---|
| 1 | Select the phantom library and available phantom characteristics |
| 2 | Select a radionuclide or radiopharmaceutical, depending on the selected phantom library |
| 3 | Enter administered activity |
| 4 | Review or edit the source-region table |
| 5 | Review the target-organ dose output table |
| 6 | Optionally select source-region rows and click **Export S Values** |
| 7 | Optionally run multiple NCI or ICRP radiopharmaceutical cases through Batch Manager |

---

## 1. Phantom Selection

NCINM3 supports three phantom libraries:

- **NCI phantoms**
- **ICRP phantoms**
- **Fetus phantoms**

Each library has its own tab. Select the desired phantom library first, then
choose the available phantom characteristics for that library.

For NCI and ICRP phantoms, select sex and age. The age radio-button captions are:

- 0
- 1
- 5
- 10
- 15
- 35

The 35-year selection corresponds to the adult phantom.

For fetus phantoms, select gestational age:

- 8 weeks
- 10 weeks
- 15 weeks
- 20 weeks
- 25 weeks
- 30 weeks
- 35 weeks
- 38 weeks

Fetus calculations represent maternal source regions irradiating fetal target
organs using mother-to-fetus S values.

The phantom display updates automatically when the phantom library, sex, or age
selection is changed.

---

## 2. Radionuclides And Radiopharmaceuticals

NCINM3 provides two calculation pathways.

### 2.1 Radionuclide Tab

Use the **Radionuclide** tab when source-region residence times or cumulated
activities are known and will be entered manually.

Select the radionuclide from the popup menu, then enter source-region residence
times or cumulated activities in the source-region table.

The radionuclide library contains 1070 radionuclides with photon and/or electron
emissions based on ICRP Publication 107 radiation spectrum data.

For fetus phantom calculations, use this tab and enter maternal source-region
data manually. In this mode, source regions correspond to maternal organs and
target regions correspond to fetal organs.

### 2.2 Radiopharmaceutical Tab

Use the **Radiopharmaceutical** tab when predefined biokinetic data should be
loaded automatically for NCI or ICRP phantom calculations.

When a radiopharmaceutical is selected, NCINM3 identifies the matching
radionuclide from the leading radionuclide name in the radiopharmaceutical text
and automatically loads the corresponding source-region residence-time data.

For fetus phantom calculations, this tab is intentionally blank because
pregnancy-specific radiopharmaceutical biokinetic models are not currently
defined.

---

## 3. Administered Activity

Administered activity can be entered in **MBq** or **mCi**. The two fields are
linked:

- Entering MBq and pressing Enter updates mCi using `1 mCi = 37 MBq`
- Entering mCi and pressing Enter updates MBq

The default activity is:

| Unit | Default |
|---|---:|
| MBq | 3700 |
| mCi | 100 |

---

## 4. Source-Region Biokinetic Data

The source-region table has column headers:

| Column | Purpose |
|---|---|
| Source | Source organ or region |
| Resid Time h | Residence time in hours |
| Cum Act MBq-s | Cumulated activity in MBq-s |

For radionuclide-based calculations, users enter residence time or cumulated
activity manually. NCINM3 converts between them using:

```text
cumulated activity (MBq-s) = administered activity (MBq) x residence time (h) x 3600
```

For radiopharmaceutical-based calculations, source-region residence times are
loaded automatically after the radiopharmaceutical is selected. This pathway is
available for NCI and ICRP phantom calculations.

For fetus phantom calculations, source regions are maternal organs. The fetus
library includes 70 maternal source regions, including placenta and amniotic
fluid, plus a remainder source. Enter the source-region residence times or
cumulated activities manually.

Rows with non-zero residence time are shaded automatically. If the residence
time is changed back to zero, the row returns to the default background.

For S-value export, select one or more source-region rows in this table. There
is no separate S-value export column.

---

## 5. Target-Organ Dose Output

The target-region output table has column headers:

| Column | Purpose |
|---|---|
| Target | Target organ or tissue |
| Mass g | Target-organ mass in grams |
| Dose mGy | Absorbed dose in mGy |
| Dose/Act mGy/MBq | Absorbed dose per administered activity |

NCINM3 calculates dose from S values, administered activity, and source-region
residence time. Effective dose is reported in the final row for NCI and ICRP
phantom calculations.

For fetus phantom calculations, the output table reports absorbed dose to fetal
target organs using mother-to-fetus S values.

---

## 6. Export S Values

To export S values:

1. Select one or more source-region rows in the source-region table.
2. Click **Export S Values**.
3. Save the generated CSV file.

The exported file contains S values in `mGy/MBq-s` for the selected source
regions and the currently selected phantom. For fetus phantoms, the exported
values are mother-to-fetus S values for the selected maternal source regions and
fetal target organs. The CSV columns are `Source Region`, `Target Region`, and
`S Value (mGy/MBq-s)`.

---

## 7. Batch Manager

Batch Manager runs multiple NCI or ICRP radiopharmaceutical dose calculations
from a CSV input file.

When NCINM3 reads a radiopharmaceutical name from the batch CSV, it
automatically matches the submitted text to the closest library entry using
fuzzy matching. This allows clinical-style names and common radionuclide
notation variants such as `F-18`, `18F`, `Tc-99m`, and `99mTc`.

Batch Manager also matches the submitted patient age to the nearest available
phantom age group. The output CSV includes resolved input values,
radiopharmaceutical match information, and organ dose columns.

Fetus phantom calculations are not currently supported through the
radiopharmaceutical Batch Manager because pregnancy-specific
radiopharmaceutical biokinetic models are not currently defined.

---

## 8. Clear Tables

Click **Clear Tables** to reset administered activity to the default values,
clear source-region residence times and cumulated activities, clear dose output,
and refresh the phantom display.
