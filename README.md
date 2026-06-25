# FLASH RT Explorer

Interactive browser-based database explorer for the **in-vivo FLASH radiotherapy living literature review**.

🔗 **Live app:** https://lucywhitmore96.github.io/flash-explorer/

## Features

| Tab | Description |
|-----|-------------|
| **Overview** | Summary stats — total arms, publications, NTS rate, particle breakdown, publications over time |
| **Data Explorer** | Full searchable/filterable table of all 481 experimental arms |
| **Physics Plots** | Interactive scatter plot of any two physics parameters (dose rate, DPP, dose, PRF, …), coloured by NTS outcome, with threshold reference lines |
| **Subgroups** | FLASH NTS rate broken down by particle, tissue group, species, fractionation, and oxygen condition |
| **Query Builder** | Build a custom subgroup query by combining any filters; shows NTS rate + 95% Wilson CI + matching paper list |

## Dataset

The database (`public/lit_review_structured_v85.csv`) was compiled as part of:

> Whitmore et al. (2026) — *Machine learning analysis of in-vivo FLASH radiotherapy: predictors of normal-tissue sparing* (manuscript in preparation)

Each row is one experimental arm from a published in-vivo FLASH RT paper. Key fields:

- **Physics:** `flash_avg_dose_rate_Gy_s`, `flash_dose_per_pulse_Gy`, `total_dose_Gy`, `flash_prf_Hz`, `flash_pulse_width_us`, `flash_irradiation_time_s`
- **Biology:** `species`, `tissue_class`, `particle_group`, `oxygen_condition`
- **Outcome:** `target_normal_tissue_sparing_binary` (1 = FLASH sparing observed, 0 = not observed)

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173/flash-explorer/

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository named `flash-explorer`
2. In `vite.config.js`, confirm `base: '/flash-explorer/'` matches your repo name
3. Run:
   ```bash
   npm run deploy
   ```
   This builds and pushes to the `gh-pages` branch automatically.

Or enable the included GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deployment on every push to `main`.

## Updating the dataset

Replace `public/lit_review_structured_v85.csv` with the new version and update the filename in `src/hooks/useFlashData.js`.

## Tech stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [PapaParse](https://www.papaparse.com/) (CSV parsing)
- [Lucide React](https://lucide.dev/) (icons)
- Deployed via [gh-pages](https://github.com/tschaub/gh-pages)
