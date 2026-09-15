"""Export reviewed ML_FINAL sources without modifying source workbooks."""
import csv
import hashlib
import json
import sys
from pathlib import Path
import openpyxl

source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
out = root / 'public' / 'data' / 'ml-final-2026-09-11'
out.mkdir(parents=True, exist_ok=True)
sources = {}

def record(path):
    sources[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()

def export_sheet(filename, sheet, target):
    path = source / filename
    record(path)
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(book[sheet].values)
    assert len(set(rows[0])) == len(rows[0]), 'Duplicate headers'
    with (out / target).open('w', newline='') as f:
        csv.writer(f).writerows(rows)
    return [dict(zip(rows[0], row)) for row in rows[1:]]

rows = export_sheet('FLASH_toxicity_0to5_FINAL_ADJUDICATED_HUNTER_RESOLVED_2026-09-11.xlsx', 'Data', 'literature.csv')
ml_rows = export_sheet('lit_review_structured_v86_ML_cleaned_HUNTER_RESOLVED_2026-09-11.xlsx', 'ML_Input', 'ml-input.csv')
tables = {}
for name in ['ML_main_results', 'primary_cohort_summary', 'DMF_summary_single_fraction', 'fractionation_regime_summary', 'threshold_summary_apparent', 'threshold_summary_publication_grouped', 'oxygen_NTS_summary', 'anesthesia_NTS_summary']:
    path = source / (name + '.csv')
    record(path)
    (out / path.name).write_bytes(path.read_bytes())
    tables[name] = list(csv.DictReader(path.open()))
evaluable = [r for r in rows if r['tissue_class'] != 'tumor' and r['healthy_tissue_effect'] in ('YES', 'NO')]
assert len(rows) == 471
assert len(evaluable) == 326
assert sum(r['healthy_tissue_effect'] == 'YES' for r in evaluable) == 221
assert len(ml_rows) == 338
for r in rows:
    try:
        f, c, d = (float(r[k]) for k in ('functional_toxicity_severity_flash', 'functional_toxicity_severity_conv', 'functional_delta_score'))
    except (ValueError, TypeError):
        continue
    assert 0 <= f <= 5 and 0 <= c <= 5
    assert c - f == d
tables['version'] = 'ML_FINAL / FINAL_FINAL · 11 September 2026'
tables['sources'] = sources
(root / 'src' / 'data').mkdir(exist_ok=True)
(root / 'src' / 'data' / 'mlFinal.json').write_text(json.dumps(tables, indent=2) + '\n')
print(f'Validated {len(rows)} arms, {len(evaluable)} evaluable, 221 YES, {len(ml_rows)} ML input rows; toxicity range and direction checked.')
