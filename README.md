# Emerging Trends in Data Workforce Development: A Graphic Perspective

An interactive D3.js website exploring salaries and employment across data-related jobs worldwide from 2020 to 2023.

Built by **Deepthi Kavitha** for the Data Visualization course in the M.S. in Computer and Information Science program at the **University of Massachusetts Dartmouth**.

**Live site:** https://deep-visualization.github.io/Salary-Benchmarking-for-Data-Domain-Jobs/

---

## What you can explore

### Main page (`index.html`)

| Visualization | Question it answers | Interactions |
|---|---|---|
| **World salary map** | Which countries pay the most for data jobs? | Year buttons (All years, 2020–2023), hover for each country's average salary and number of job records, scroll to zoom, drag to pan |
| **Salary trends line chart** | How has average pay changed for each job category from 2020 to 2023? | Click a category (or its line) to highlight it and show yearly values; hover a point for the exact average and record count |
| **Average salary by job category** (bar chart) | Which job categories pay the most overall? | Hover for values |
| **Parallel coordinates plot** | How do salaries spread across experience levels and years? | Click a legend item to isolate one experience level; "All" resets |

### Comparison pages (via "click here" on the main page → `button.html`)

| Page | What it shows |
|---|---|
| `salary.html` | Bar charts of average salary by company size, work setting (remote, hybrid, in-person) and experience level, switched with a dropdown |
| `mixed.html` | Grouped bar chart of salary by company size and experience level, with checkboxes to filter both |
| `job category.html` | Line chart of job counts across experience levels for each job category, with category filters |
| `job tittle.html` | Heatmap of job titles by experience level, with job-title filters |

---

## Data

- **`jobs_in_data.csv`**: 9,355 data-job records from 2020 to 2023, with job title, job category, salary in local currency and in USD, experience level, employment type, work setting, company location, employee residence and company size.
- **Records per year:** 2020: 71 · 2021: 197 · 2022: 1,634 · 2023: 7,453.
- **Summary files** (`sal_*.csv`, `experience_job_*.csv`): pre-aggregated averages and counts used by the comparison pages. `salary.py` creates the `sal_*.csv` files with pandas.
- **Source:** _add the original dataset link here_.

---

## How it's built

- **D3.js v7** for every chart and the map, written in plain HTML, CSS and JavaScript (no framework or build step).
- **Python and pandas** (`salary.py`) to pre-compute the summary CSVs.
- **World map shapes** loaded from the public [world.geo.json](https://github.com/johan/world.geo.json) dataset.
- **GitHub Pages** for hosting.

### Design notes

- **Map:** sequential yellow-to-red scale in $20k steps, with countries that have no records shown as hatched so "no data" is never confused with "low salary." Country outlines with reversed winding are corrected before drawing so no shape fills the whole globe.
- **Line chart:** one color per job category, with the matching button beside it. Every yearly average is marked with a point. Points based on fewer than 10 records are drawn hollow, because some categories have very few records in early years (Cloud and Database has 5 in total).
- **Page theme:** a grey-and-white palette in `theme.css`, shared by every page and kept separate from the chart colors.
- **Small touches:** sections fade in as you scroll, tooltips follow the cursor, and the layout adapts to smaller screens.

---

## Project structure

```
index.html                 Main page: map, line chart, bar chart, parallel coordinates
theme.css                  Page colors shared by every page
style.css                  Main page layout and chart styling
Location_Analysis.js       World salary map
Histogram_Analysis.js      Salary trends line chart
Bar_Chart_Comparison.js    Average salary by job category
Parallel_Coord_Analysis.js Parallel coordinates by experience level
button.html                Menu of comparison pages
salary.html                Salary by company size, work setting and experience level
mixed.html                 Company size × experience level
job category.html          Experience level × job category
job tittle.html            Experience level × job title heatmap
salary.py                  Builds the sal_*.csv summary files
*.csv                      Data files
image.jpg                  Background image for the menu page
```

---

## Run it locally

The charts load CSV files, which browsers block when a page is opened directly from your computer, so serve the folder with a small local web server.

```bash
# from the project folder
python -m http.server 8000
```

Then open **http://localhost:8000/index.html**.

In VS Code you can instead install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.

An internet connection is needed, because D3 and the map shapes load from the web.

---

## Limitations

- Averages in early years, especially 2020 and 2021, rest on few records and can swing a lot.
- Company location is used for the map, which can differ from where the employee lives.
- `salary.py` averages the `salary` column, which is in each job's local currency, rather than `salary_in_usd`. About 8% of records are not in USD, so the comparison-page averages differ slightly from true USD averages. Changing `'salary'` to `'salary_in_usd'` in the script and re-running it would fix this.
- Very small countries and territories (for example Singapore, Andorra and Gibraltar) aren't in the map shapes, so they don't appear on the map.

---

## Author

**Deepthi Kavitha** · M.S. Computer and Information Science, University of Massachusetts Dartmouth
[LinkedIn](https://www.linkedin.com/in/deepthigokuldhas) · [GitHub](https://github.com/Deep-Visualization)
