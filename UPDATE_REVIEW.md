# September 2026 data update

Prepared on branch `update/ml-final-2026-09-15` in this separate working copy.
Original project: `/Users/lucywhitmore/CascadeProjects/flash-explorer`.
Baseline: `1a1c03b`, also tagged `backup/pre-ml-final-2026-09-15` in this copy.
The user reviewed the local preview and authorized a local commit. No push or deployment has been performed.

## Sources and choices

Source directory: `/Users/lucywhitmore/Downloads/ML_FINAL/FINAL_FINAL`.
The September 11 HUNTER_RESOLVED toxicity workbook's Data sheet supplies all
471 literature arms, including the revised 0–5 toxicity scores. It contains
326 evaluable non-tumour YES/NO arms, of which 221 are YES.
The cleaned workbook's ML_Input sheet is exported separately (338 rows).
It is not joined onto the literature by title/sub-experiment: those keys are
not unique. All source workbook cells remain unchanged.

The ML tab uses the eight named FINAL_FINAL analysis CSVs recorded in
`src/data/mlFinal.json`, including SHA-256 hashes of all inputs. It replaces
outdated hard-coded model scores, thresholds, DMF and fractionation results.
The separate ML_FINAL/NESTED_ML output has different cohort sizes and is not
combined with this run. No models were retrained.
The AI context uses the same source tables. Physics plot reference lines
use the apparent 47.62 Gy/s and 1 Gy/pulse electron thresholds.

Toxicity delta is conventional minus FLASH. Severity axes now run from 0 to 5.
ML results are presented as source tables, with explicit validation labels,
rather than retaining the old feature-group charts for incompatible results.

## Validation

- Production Vite build passed (bundle-size advisory remains).
- Actual PapaParse loader and summary functions: 471 total / 326 evaluable / 221 YES.
- All eight JSON analysis tables equal the imported source CSVs.
- Numeric paired toxicity scores stay within 0–5 and delta equals CONV minus FLASH.
- `git diff --check` passed.
- User reviewed the local browser preview and approved the update.

## Review and commit

From this directory:

```sh
git diff
npm run dev
# After reviewing:
git add README.md UPDATE_REVIEW.md .gitignore src public/data scripts
git commit -m "Update explorer from September 11 ML_FINAL sources"
```

The original project and deployed website remain unchanged until you choose
to publish. The backup tag can optionally be pushed before deployment.

## Reverse the update

Before committing, use the original project; it is untouched. To inspect or
build the baseline here without deleting the draft:

```sh
git worktree add ../flash-explorer-baseline backup/pre-ml-final-2026-09-15
```

After committing, undo the update with a new, history-preserving commit:

```sh
git revert <update-commit-hash>
```

If the update was deployed, the revert must also be pushed and deployed to
restore the live site. Avoid `git reset --hard`; it can discard unrelated work.
