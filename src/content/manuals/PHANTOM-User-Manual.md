# PHANTOM — NCI Computational Human Phantom Libraries

## Introduction

**PHANTOM** is a collection of **reference-grade computational human phantom libraries**
developed by physicists at the National Cancer Institute (NCI) in collaboration with
external partners. These phantoms are designed to support **population-based radiation
dose estimation, benchmarking, and research or regulatory-facing analyses**, and serve
as the anatomical foundation for NCI dose tools (NCICT, NCINM, and NCIRF).

The PHANTOM libraries represent reference and body size–dependent pediatric, adult,
and pregnant populations and are intended for **Monte Carlo–based radiation transport
simulations**, rather than patient-specific clinical modeling.

> **Intended use**
> PHANTOM libraries are intended for reference dosimetry and computational research.
> They are **not intended** for patient-specific clinical treatment planning or
> site-customized anatomical modeling.

<img src="images/phantom-family.png" alt="NCI computational human phantom family spanning pediatric, adult, and pregnant anatomies" width="760">

---

## Available Phantom Libraries

The PHANTOM libraries currently available are summarized below.
A cross mark (×) indicates availability in the current release folder.

| File format | UF/NCI reference size phantoms | UF/NCI body size-dependent phantoms<sup>1</sup> | ICRP reference phantoms | UF/NCI pregnant women phantoms |
|---|:---:|:---:|:---:|:---:|
| Number of phantoms | 12 | 362 | 12 | 8 |
| Arms<sup>2</sup> | w and w/o | w and w/o | w and w/o | w and w/o |
| Binary voxel (legacy) | × | × (low res) | Available from ICRP 110 and 143 | |
| NIfTI (`.nii.gz`) | × | × (incl. xy-low/z-high) |  | × |
| DICOMRT<sup>3</sup> | × |  | × | × |
| MC input available | MCNP (w arms) |  | Geant4 (w/o arms) |  |
| Reference | [Lee 2010](https://pubmed.ncbi.nlm.nih.gov/20019401/) | [Geyer 2014](https://pubmed.ncbi.nlm.nih.gov/25144322/) | [ICRP 110](https://www.icrp.org/publication.asp?id=icrp%20publication%20110), [ICRP 143](https://pubmed.ncbi.nlm.nih.gov/33000625/) | [Maynard 2014](https://pubmed.ncbi.nlm.nih.gov/25030913/) |

<sup>1</sup> The reference-size, body size–dependent, and pregnant woman phantom
libraries are available in compressed NIfTI (`.nii.gz`) format, the recommended format
for new downloads. Legacy binary voxel files are retained under each library's
**bin/** folder for compatibility with existing Monte Carlo workflows.

<sup>2</sup> Phantoms with the arms removed are intended for imaging geometries in which
the patient’s arms are raised.

<sup>3</sup> DICOMRT files are provided for selected supported libraries under each
library's **dicomrt** folder, e.g.
**nci_reference/armless_highres/dicomrt**, **icrp_reference/armless_highres/dicomrt**,
and **nci_pregnant/arm_highres/dicomrt**. DICOM-CT and RT STRUCTURE files can be
directly imported into Treatment Planning Systems (TPS).
Recommended citation for DICOMRT files: [Griffin 2019](https://pubmed.ncbi.nlm.nih.gov/31158829/)

<img src="images/phantoms-height-weight-map.png" alt="Height and weight distribution of the NCI body size-dependent computational phantom library" width="760">

Selected DICOM CT and RT Structure Set libraries can be imported into compatible
treatment-planning systems for visualization and supported research workflows.

<img src="images/phantoms-dicomrt-treatment-planning.png" alt="NCI computational phantom DICOM CT and RT Structure Set displayed in a treatment-planning system" width="760">

---

## Folder Naming Convention

The PHANTOM download directory uses a phantom-library folder first, then a
posture/resolution subfolder, then a file-format subfolder:

**III_SSS/AAA_RRR/format**

- **nci_size/arm_highres/niigz**, **nci_size/armless_lowres/{bin, niigz}**
  Body size–dependent phantom folders. **armless_xylow_zhigh** is a mixed
  resolution (xy-plane at low resolution, z-axis at high resolution).

- **nci_reference/arm_highres/{bin, niigz, mc-input}**,
  **nci_reference/armless_highres/{bin, dicomrt}**
  Reference-size phantom folders.

- **nci_pregnant/arm_highres/{niigz, dicomrt}**
  Pregnant woman phantom folders.

- **icrp_reference/armless_highres/{dicomrt, mc-input}**
  ICRP reference phantom folders.

Not every posture/resolution folder includes every format; see **Available Phantom
Libraries** above for what is available per library.

Monte Carlo input folders use code-specific names rather than the voxel-library
naming pattern: **mcnp-nci-reference-arm** (under `nci_reference/arm_highres/mc-input`)
and **geant4-icrp-noarm** (under `icrp_reference/armless_highres/mc-input`).

The naming fields are:

- **III_SSS**: phantom library, one of **nci_size**, **nci_reference**,
  **nci_pregnant**, **icrp_reference**
- **AAA_RRR**: arm posture and voxel resolution, e.g. **arm_highres**,
  **armless_lowres**, **armless_xylow_zhigh**
- **format**: one of **bin**, **niigz**, **dicomrt**, **mc-input**

---

## Master Table

The file **_mastertable_ref&size.xlsx** contains anatomical and material data
required for Monte Carlo radiation transport simulations. The file includes the
following tabs:

- **about**
  Contents of this master table

- **summary_arm**
  Organ voxel tags, organ names, and material card identifiers for UF/NCI phantoms
  with arms attached

- **density_reference**
  Organ and tissue density for the reference size phantoms

- **material**
  Material identifiers, material types, elemental compositions, and mass fractions

- **dose response function**
  Photon dose response functions (absorbed dose per unit fluence) for active marrow
  and endosteum

- **marrow_fraction**
  Fractions of active marrow and endosteum assigned to individual skeletal sites

These tables ensure **consistent, reproducible mapping** between voxelized anatomy,
material definitions, and dosimetric response functions across NCI dose tools.

---

## Monte Carlo Input Files

Monte Carlo input files are available under an **mc-input** subfolder within the
relevant library folder in the PHANTOM download directory. These files are
code-specific resources for selected established reference workflows.

The current release includes:

- **nci_reference/arm_highres/mc-input/mcnp-nci-reference-arm/**
  MCNP input decks for the NCI reference-size phantoms with arms. This folder contains
  12 numbered input files (`01`–`12`) and 12 corresponding lattice files (`*.lat`).

- **icrp_reference/armless_highres/mc-input/geant4-icrp-noarm/**
  Geant4 input package for ICRP reference phantoms without arms. This folder contains
  `Ref_noa_icrp_bin_G4.tar.gz`.

These inputs are provided as reference starting points for established Monte Carlo
workflows. Users should review and modify local file paths, source definitions,
scoring setup, compiler settings, and code-version assumptions before running
simulations.

---

## NIfTI (`.nii.gz`) Voxel Phantom Files

NIfTI (`.nii.gz`) is the recommended format for newly downloaded voxel phantom files.
Each file is a gzip-compressed NIfTI image containing the 3D integer voxel-label array
for one phantom. The voxel values correspond to organ or tissue tag numbers used by
the PHANTOM master table.

The current NIfTI release is located under each library's **niigz** subfolder in the
PHANTOM download directory:

Reference-size phantoms:

- **nci_reference/arm_highres/niigz**

Body size–dependent phantoms:

- **nci_size/arm_highres/niigz**
- **nci_size/arm_lowres/niigz**
- **nci_size/armless_highres/niigz**
- **nci_size/armless_lowres/niigz**
- **nci_size/armless_xylow_zhigh/niigz** — xy-plane at low resolution, z-axis at high resolution

Pregnant woman phantoms:

- **nci_pregnant/arm_highres/niigz**

Legacy binary voxel files are retained under each library's **bin** subfolder. NIfTI
was adopted as the recommended distribution format for several reasons:

- NIfTI is a standard medical-imaging format that can be opened directly by common
  tools such as 3D Slicer, ImageJ/Fiji, ITK-SNAP, MATLAB, and Python packages.
- NIfTI headers store image dimensions, voxel spacing, data type, and orientation
  information, while raw binary files require separate metadata to be interpreted
  correctly.
- Compressed NIfTI files are smaller and easier to transfer than the corresponding
  raw binary voxel files.
- In previous releases, the raw binary file size was too large to practically release
  the full high-resolution NCI body size–dependent phantom library (**n = 362**) via
  Google Drive. The compressed `.nii.gz` format makes this high-resolution release
  practical while preserving the integer organ-label voxel data.

### What Information Is Included

Each NIfTI file stores:

- **3D voxel-label data**
  The image array contains integer organ or tissue labels. A voxel value should be
  interpreted as a label ID, not as CT number, attenuation, or density.

- **Image dimensions**
  The number of voxels along each image axis is stored in the NIfTI header.

- **Voxel spacing**
  The physical voxel size is stored in the NIfTI header and can be read by standard
  NIfTI-compatible software.

- **Data type**
  The label array is stored as an integer image. When processing the files, preserve
  the integer labels and avoid interpolation unless a label-preserving method is used.

- **Spatial orientation information**
  NIfTI headers include affine/orientation information used by visualization and image
  processing software.

The NIfTI file does **not** replace the master table. Organ names, material
assignments, tissue densities, elemental compositions, and marrow or dose-response
data should be obtained from **_mastertable_ref&size.xlsx**.

### Reading NIfTI Files

#### 3D Slicer

1. Open **3D Slicer**.
2. Use **Add Data** or drag the `.nii.gz` file into the Slicer window.
3. Load the file as a volume. For label-based visualization, set or convert the volume
   to a label map as needed.
4. Use the volume display or segmentation tools to inspect individual label regions.

Because PHANTOM files are label images, avoid smoothing or linear interpolation when
resampling. Use nearest-neighbor interpolation for any label-preserving operation.

#### ImageJ / Fiji

1. Open **ImageJ** or **Fiji**.
2. Import the `.nii.gz` file using a NIfTI-compatible importer, such as the NIfTI
   plugin or Bio-Formats importer, depending on the local installation.
3. Inspect the image stack as a 3D label volume.
4. Use thresholding or label-value selection to isolate a specific organ ID.

When using ImageJ/Fiji, keep the image as an integer label image where possible. Some
operations may convert the data to floating point; this is acceptable for display but
should be avoided for saving label-preserving phantom data.

#### ITK-SNAP

1. Open **ITK-SNAP**.
2. Load the `.nii.gz` file as the main image.
3. Use the label-inspection tools to identify voxel values and inspect organ regions.

#### Python

The recommended Python package for reading NIfTI files is `nibabel`.

```python
import nibabel as nib
import numpy as np

nii_path = "30f165060_armless_highres.nii.gz"
img = nib.load(nii_path)

# Preserve integer labels. Avoid get_fdata() unless floating-point data are desired.
labels = np.asanyarray(img.dataobj)

print("shape:", labels.shape)
print("voxel spacing:", img.header.get_zooms()[:3])
print("data type:", labels.dtype)
print("affine:")
print(img.affine)

organ_id = 125
organ_mask = labels == organ_id
print("organ voxel count:", int(organ_mask.sum()))
```

#### MATLAB

MATLAB can read NIfTI files with `niftiread` and inspect header metadata with
`niftiinfo`.

```matlab
info = niftiinfo("30f165060_armless_highres.nii.gz");
labels = niftiread(info);

disp(size(labels))
disp(info.PixelDimensions)
disp(class(labels))

organ_id = 125;
organ_mask = labels == organ_id;
nnz(organ_mask)
```

### Converting Legacy Binary Voxel Files to NIfTI

Legacy binary voxel files are retained under each library's **bin** folder for users
who need to reproduce previous workflows. These files are raw arrays and do not carry their own
metadata. To convert a binary file to NIfTI, the following information must be known
from the phantom documentation or master table:

- array dimensions, e.g., number of voxels in x, y, and z
- voxel spacing in physical units
- integer data type, such as `uint16` or `int32`
- byte order
- array storage order and orientation

Example Python conversion:

```python
import nibabel as nib
import numpy as np

binary_path = "phantom.raw"
nii_path = "phantom.nii.gz"

# Replace these values with the dimensions and voxel spacing for the phantom.
shape = (512, 256, 180)       # x, y, z
spacing = (1.0, 1.0, 1.0)     # mm
dtype = np.dtype("<u2")       # little-endian unsigned 16-bit integer

data = np.fromfile(binary_path, dtype=dtype)
data = data.reshape(shape, order="C")

affine = np.diag([spacing[0], spacing[1], spacing[2], 1.0])
img = nib.Nifti1Image(data, affine)
img.header.set_data_dtype(data.dtype)
nib.save(img, nii_path)
```

The `shape`, `spacing`, `dtype`, and array order must match the original binary
phantom. If these values are incorrect, the converted NIfTI file may open but the
anatomical labels can be transposed, flipped, or assigned to the wrong physical
locations.

### Converting NIfTI Back to Raw Binary

Some Monte Carlo pipelines may still require raw binary input. A NIfTI label image can
be exported back to a raw binary array after confirming the required data type and
array order for the target code.

```python
import nibabel as nib
import numpy as np

img = nib.load("phantom.nii.gz")
labels = np.asanyarray(img.dataobj)

# Match the data type expected by the receiving Monte Carlo workflow.
labels = labels.astype(np.uint16, copy=False)
labels.tofile("phantom.raw")
```

After conversion, confirm the voxel count, unique label values, and organ-label
mapping against **_mastertable_ref&size.xlsx** before using the file for dose
calculation.

---

## Features Under Development

The following enhancements are under active development and may be released in
future versions:

- Additional organ substructure models beyond the current cardiac substructure release
  (e.g., brain substructures)
- Implementation of lymphatic node models in the body size–dependent phantom library
