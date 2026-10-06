# Reviewed 80-publication dataset update

Prepared in the separate working copy at
`/Users/lucywhitmore/Downloads/FLASH_ML_1fx_paper/flash-explorer-update`.
Original project: `/Users/lucywhitmore/CascadeProjects/flash-explorer`.
Pre-update baseline: `1a1c03b`, also tagged `backup/pre-ml-final-2026-09-15` locally.

## Source and scope

The user requested the latest reviewed dataset with **80 publications**, excluding
the later 81-publication draft. Source: `/Users/lucywhitmore/Downloads/ML_FINAL/FINAL_FINAL`.

- `FLASH_toxicity_0to5_FINAL_ADJUDICATED_HUNTER_RESOLVED_2026-09-11.xlsx`, `Data`: **466 populated literature arms across 80 normalized titles**.
- `lit_review_structured_v86_ML_cleaned_HUNTER_RESOLVED_2026-09-11.xlsx`, `ML_Input`: **331 populated rows**, exported separately.
- Primary evaluable cohort: **326 non-tumour YES/NO arms from 66 titles; 221 YES and 105 NO**.

These workbooks are byte-identical to the September 30 WORKING baseline copies.
The September 30 NEW_VERSION workbooks add five Paillas comparisons from an
81st study under review; they are intentionally excluded from this release.

The previous September export counted five entirely empty literature rows and
seven empty ML rows, giving misleading totals of 471 and 338. The importer now
excludes empty formatted rows and rejects populated rows without a citation title.
The browser ignores empty CSV records and normalizes title whitespace before
counting or grouping publications. No populated source records are removed.

## Analysis provenance

Eight source analysis CSVs supply the ML/results tables, with SHA-256 hashes in
`src/data/mlFinal.json`. Workbooks and source results are unchanged. The cleaned
ML subset is not joined onto the literature by non-unique title/sub-experiment keys.
No models were retrained. Results retain the cohort and validation labels in the
source files; they are not relabeled as the separate nested-ML analysis.

Toxicity severity uses 0–5 and delta is conventional minus FLASH. Physics
reference lines use the source apparent thresholds (47.62 Gy/s across modalities and
1 Gy/pulse for electrons). AI context uses the same imported result tables and loaded dataset.

Fractionation charts and filters now use the reviewed regime field, retaining
all ten intra-session splits separately even when num_fractions is 1. The single
fraction group includes all 286 source arms; multi-day fractions include 30 arms.

## Reproduce and verify

```sh
python scripts/import_ml_final.py /Users/lucywhitmore/Downloads/ML_FINAL/FINAL_FINAL
npm test
npm run build
git diff --check
```

Regression checks cover cohort counts, blank CSV records, publication-title
whitespace, equality of displayed/downloadable analysis tables, and paired
toxicity ranges and direction. All five tests and the production build passed.
The build retains the existing bundle-size advisory.
Browser review confirmed **466 arms · 80 papers**, 80 publications on
Overview, and 331 rows in the cleaned-ML download label.

## Publish and rollback

The GitHub Actions workflow `.github/workflows/deploy.yml` builds on pushes to
`main` and publishes `dist` to `gh-pages`; GitHub Pages serves that branch.

To roll back after publishing, revert the update commits with new commits on
`main` and let the workflow redeploy. Preserve unrelated work and avoid force pushes.
