import React from 'react'
import results from '../data/mlFinal.json'

const format = value => value === '' || value == null ? '—' :
  Number.isFinite(Number(value)) ? (Number.isInteger(Number(value)) ? value : Number(value).toFixed(3)) : String(value).replaceAll('_', ' ')

function ResultsTable({ title, name, columns, note }) {
  return <section className="card">
    <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
    {note && <p className="text-xs text-slate-500 mb-4">{note}</p>}
    <div className="overflow-x-auto"><table className="w-full text-xs text-left">
      <thead><tr>{columns.map(([key, label]) => <th className="p-2 border-b text-slate-600" key={key}>{label}</th>)}</tr></thead>
      <tbody>{results[name].map((row, i) => <tr key={i} className="even:bg-slate-50">{columns.map(([key]) => <td className="p-2 border-b border-slate-100" key={key}>{format(row[key])}</td>)}</tr>)}</tbody>
    </table></div>
    <a className="text-xs text-flash-600 inline-block mt-3" href={`${import.meta.env.BASE_URL}data/ml-final-2026-09-11/${name}.csv`} download>Download source table</a>
  </section>
}

export default function MLResults() {
  return <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-slate-800 mb-1">ML Analysis Results</h2>
      <p className="text-sm text-slate-500">{results.version}. Results below retain the cohorts and validation methods recorded in the source tables.</p>
    </div>
    <ResultsTable title="Primary evaluable cohort" name="primary_cohort_summary" columns={[["metric","Metric"],["value","Value"],["n","Arms"],["details","Details"]]} />
    <ResultsTable title="Model performance" name="ML_main_results" note="LOPO = leave-one-publication-out. Arm 5-fold validation can share publications across folds. RF = random forest; LR = logistic regression. BA is balanced accuracy; low/high columns are the supplied confidence limits. These are the FINAL_FINAL results, not the separate older NESTED_ML run." columns={[["question","Cohort"],["feature_set","Features"],["model","Model"],["validation","Validation"],["n","Arms"],["papers","Papers"],["balanced_accuracy","BA"],["BA_low","BA low"],["BA_high","BA high"],["roc_auc","ROC AUC"]]} />
    <ResultsTable title="Apparent thresholds" name="threshold_summary_apparent" note="Descriptive optima fitted to the full analysis cohort. These are not clinical cutoffs. Direction ‘high’ means higher values predict sparing; ‘low’ means lower values predict sparing." columns={[["analysis","Analysis"],["threshold","Threshold"],["feature","Feature / units"],["direction","Direction"],["n","Arms"],["balanced_accuracy","Apparent BA"]]} />
    <ResultsTable title="Publication-grouped threshold validation" name="threshold_summary_publication_grouped" columns={[["analysis","Analysis"],["n","Arms"],["papers","Papers"],["OOF_BA","Out-of-fold BA"],["sensitivity","Sensitivity"],["specificity","Specificity"]]} />
    <ResultsTable title="Single-fraction dose modifying factors" name="DMF_summary_single_fraction" note="n counts DMF entries in the source summary; an arm may contribute more than one endpoint. Dispersion is standard deviation." columns={[["group","Group"],["n","Entries"],["mean_DMF","Mean DMF"],["sd_DMF","SD"],["median_DMF","Median"]]} />
    <ResultsTable title="NTS by fractionation regime" name="fractionation_regime_summary" note="NTS rate is a proportion. Intra-session splits remain a separate category." columns={[["comparison","Regime"],["n","Arms"],["NTS_yes","NTS yes"],["NTS_rate","NTS rate"]]} />
    <div className="card text-sm"><a className="text-flash-600" href={`${import.meta.env.BASE_URL}data/ml-final-2026-09-11/ml-input.csv`} download>Download cleaned ML input (338 rows)</a><p className="text-xs text-slate-500 mt-2">This workbook subset is distinct from the primary evaluable cohort above.</p></div>
  </div>
}
