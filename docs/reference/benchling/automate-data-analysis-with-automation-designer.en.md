# Automate Data Analysis with Automation Designer

> 原文链接: [https://help.benchling.com/hc/en-us/articles/46077729600909-Automate-Data-Analysis-with-Automation-Designer](https://help.benchling.com/hc/en-us/articles/46077729600909-Automate-Data-Analysis-with-Automation-Designer)

---
1. [Benchling](https://help.benchling.com/hc/en-us)
2. [Product Documentation](https://help.benchling.com/hc/en-us/categories/6455186023309-Product-Documentation)
3. [Analytics & Automation](https://help.benchling.com/hc/en-us/sections/39551530102925-Analytics-Automation)

# Automate Data Analysis with Automation Designer

- Updated
  May 22, 2026 20:34

Automation Designer is Benchling’s no-code/low-code flowchart-based tool that lets you build repeatable, automated data processing directly in your Analysis, from instrument connectivity to data transformation to analysis. Interactively define the analysis once and it runs automatically every time a run completes, without manually running the steps in between. The Automation Designer supports single-file and multi-file analyses, Python scripting via Custom Code, and lookup steps that enrich your data with entity and plate metadata from the Benchling Registry.

_**Note**: The Automation Designer requires Advanced Analysis and Connect licenses._

## Understand the Automation Designer flowchart

The Automation Designer uses a flowchart canvas to represent the steps in your analysis. Each step takes one or more inputs and produces one or more outputs, which can then flow into the next step. You build the flowchart in an Analysis, then save it as an Analysis Template that can be applied repeatedly to new data.

The flowchart supports the following step types:

[Files](https://help.benchling.com/hc/en-us/articles/35459286948877-How-to-use-Files)

- Import files from data catalog: brings instrument files into the Automation Designer as inputs
- Benchling Connect steps: convert raw instrument files using Benchling Instrument Connectors into the Automation Designer, transform JSON or CSV files into datasets, or pre-process files before conversion
- Convert CSV files to dataset: combines one or more CSV files into a single tabular dataset

Tables

- Create table from source: add a pre-existing table as a source step from a Benchling dataset, Insights dashboard block, Registry or plate schema, or an uploaded CSV

Analysis

- Define template variables: defines input values supplied at run time, such as booleans or plate identifiers
- Look up: enriches data with entity or plate metadata from the Benchling Registry
- Filters, transforms, joins, and unions: shape and combine datasets (added from the flowchart or the left sidebar)
- Charts: visualize the data (added from the left sidebar)
- Custom Code: embed a Python script as a step in the Automation Designer — see Custom Code in Automation Designer for details
- Outputs: define which charts, results, and datasets are sent to the Notebook entry when the template runs

Each of the step types above is covered in detail in the sections below.

## Build your analysis with Automation Designer

Before saving an Analysis Template, build an Analysis using realistic example data. This is where you configure every step, verify the data flow, and confirm that outputs look correct. Once the Analysis is working as expected, save it as a template.

## Add source data

![46077729577101](https://help.benchling.com/hc/article_attachments/46077729577101)

#### Add input files


1. In the new analysis open the automation designer by clicking on the**Flowchart **button
2. In the automation designer canvas, click**Add source step **and select**Import files from data catalog **from the Create file menu, then click**Next **
3. Fill out the information in the import files from data catalog window, then click**Save **

  - Click on the**+ icon **below files to add the file(s) that you want to import
  - Define a base file name using the textbox,

    -***Note**: The name that you define here will be used to name the step you see in the automation designer*



##### Process files with Benchling Connect in Automation Designer
If your analysis uses files retrieved through Benchling Connect, you can add Connect-powered processing steps directly in the flowchart to transform those files before they reach downstream analysis steps. These steps are available under the Connect category when adding a new step from an existing file step.

![46077706171533](https://help.benchling.com/hc/article_attachments/46077706171533)

**Convert instrument files to ASM files**

Use this step to convert a raw instrument output file into an ASM-formatted JSON file. This is the first stage of the standard Connect instrument data process and is typically followed by a Convert ASM files to CSV files step.

If you are bringing instrument data into Benchling and that instrument is supported with [Benchling Connect](https://help.benchling.com/hc/en-us/articles/22558210727565-Instruments-Supported-by-Benchling-Connect), you may want to convert it to ASM format so that it is in a standard format that is an intermediate format we can save so we can work in Benchling with it. To do this:

1. In the automation designer, hover over the circle to the right of the Output files on the Import files from data catalog step. Click the**arrow icon** that appears in the circle
2. In the Add step side panel, click on the**Convert instrument files to ASM files** option from the Connect menu and click**Next**
3. In the**Convert instrument files to ASM files** side-panel, use the dropdown to select the instrument vendor and optionally select the CSV transform type if you wish for your output to be transformed into a CSV then click**Save**

**Convert ASM files to CSV files**

Use this step to convert an Allotrope Simple Model (ASM) JSON file into a structured CSV that downstream dataset steps can work with. This is the second stage of the standard Connect instrument data process: raw instrument file → ASM → CSV.

1. In the automation designer, hover over the circle to the right of the Convert instrument files to ASM step. Click the**arrow icon **that appears in the circle
2. In the Add step side panel, click on**Convert ASM files to CSV files** under Connect
3. Configure the ASM-to-CSV transform that the conversion will perform
4. The step outputs a CSV file that can be passed into a**Convert CSV files to dataset** step

Commonly used transforms:

-***Well** – structured such that each row of the file represents a well of the plate*
- ***Sample** – structured such that each row of the file represents a sample*
- ***Measurement** – structured such that each row of the file represents a measurement*
- ***Datacube** – structured such that each row of the file represents a 2-dimensional data measurement (e.g. retention time x absorbance)*
- ***Group**– structured such that each row of the file represents the aggregate data derived from groups of wells representing experimental conditions*

***Note**: Not all transforms are supported by the ASM to CSV step. This is based on the specific connector for which the ASM originated. Reference the specific *[*Benchling Connect connector articles*](https://help.benchling.com/hc/en-us/articles/22558210727565-Instruments-Supported-by-Benchling-Connect)* for supported transforms.*

**Convert CSV files to Dataset**

Next you’ll want to create a [Dataset](https://help.benchling.com/hc/en-us/articles/35405512657037-What-is-a-Dataset) for each file that has been converted to CSV. To do this:

1. In the automation designer, hover over the circle to the right of the Output files row on the Convert instrument files to ASM step. Click the**arrow icon **that appears in the circle
2. In the Add step side panel, click on the**Convert CSV files to dataset **option from the Connect menu and click**Next **
3. Define the following attributes for your CSV file(s) and click**Save **

  -**Dataset name** - provide a descriptive name for the Dataset, this will allow you to search for it within Benchling
  -**CSV delimiter** - use the dropdown to select how you want values segregated in your file, note that if you need to use an option not listed in the dropdown, choose**Custom value **and define it in the next box
  -**Custom CSV delimiter** - use the textbox to define the custom CSV delimiter that you would like to use
  -**Data locale** - use the dropdown to select how you want the time and date formatting conventions represented
  -**Spreadsheet sheet name** - optionally used to the sheet/tab for multi-sheet Excel files


Once you finish this, a new step should appear on the automation designer. You will be able to see a preview of the files in the line that connects the outputs from the linked step to this step.

***Note**: Each input file is limited to 30 MB. For files larger than 30 MB, you can optionally use a Custom Code step instead.*

*

![46077729579021](https://help.benchling.com/hc/article_attachments/46077729579021)

*

**Convert JSON file to dataset**

Use this step to convert a JSON file directly into a tabular dataset, bypassing the ASM → CSV path. This is useful when your instrument or external tool produces a structured JSON output that maps cleanly to a flat table.

1. In the automation designer, hover over the circle to the right of the Output files on the Import files from data catalog step. Click the**arrow icon** that appears in the circle
2. In the Add step side panel, select**Convert JSON file to dataset** under**Connect**
3. Define the following configurations based on your JSON file and click**Save**

  -**Dataset name** - provide a descriptive name for the Dataset, this will allow you to search for it within Benchling
  -**Column Name **- May include another column value in name via '$' substitution (e.g. 'ColName $unit$')
  -**JSON path to Value** - Full path to the JSON leaf value to use for the column, (e.g. 'path/to/leaf').
  -**Include in Dataset?** – Yes/No
  -**Required?** - Yes/No


**Convert JSON file to datasets and JSON metadata files**

Use this step when your JSON file contains both measurement data and instrument- or run-level metadata that should be stored separately. The step splits the input into one or more datasets and one or more JSON metadata files.

1. In the automation designer, hover over the circle to the right of the Output files on the Import files from data catalog step. Click the**arrow icon** that appears in the circle
2. In the Add step side panel, select**Convert JSON file to datasets and JSON metadata files** under**Connect**
3. Define the following configurations based on your JSON file and click**Save**

  -**Dataset name** - provide a descriptive name for the Dataset, this will allow you to search for it within Benchling
  -**Column Name **- May include another column value in name via '$' substitution (e.g. 'ColName $unit$')
  -**JSON path to Value** - Full path to the JSON leaf value to use for the column, (e.g. 'path/to/leaf').
  -**Include in Dataset?** - Yes/No
  -**Required?** - Yes/No
  -**Include in output?** - Yes/No
  -**Output as metadata JSON file?** - Yes/No
  -**Transforms** - JOIN/PIVOT


**Extract or remove lines from files**

Use this step to pre-process a raw file before conversion, for example, to strip header lines, footer lines, or other non-data content that would otherwise cause a conversion step to fail.

1. In the automation designer, hover over the circle to the right of the Output files on the Import files from data catalog step. Click the**arrow icon** that appears in the circle
2. Select**Extract or remove lines from files** under**Connect**
3. Configure which lines to extract or remove

**Send outputs to connection**

If your analysis template generates instructions for other instruments, add a step that sends the output files to the instrument connection.

1. In the automation designer, find the block that you want to send to the connection and hover over the circle next to Output files. Click on the**arrow icon **that appears
2. In the Add step menu, click on the**Send to connection **option from the Connect menu, then click**Next **
3. Search for the instrument you want to send instructions to by typing the name of the connection into the textbox, once you make your selection click**Save **

#### Add input tables

Instead of importing raw files, you can add a pre-existing table directly as a source step. Automation Designer supports four table source types, each suited to a different kind of data.

Click**Add Source Step** and select the appropriate option under**Create table**:

![Screen Recording 2026-05-12 at 5.36.06 PM.gif](https://help.benchling.com/hc/article_attachments/46077706172173)

**Create table from dataset**

Use this option to bring in a dataset that has already been created in Benchling — for example, the output dataset from a previous run. The table reflects the dataset as it existed when it was added and does not update automatically if the dataset changes later.

1. Click**Add Source Step** and select**Create table from dataset**
2. Search for and select the dataset you want to use
3. Name the table

![46077706172813](https://help.benchling.com/hc/article_attachments/46077706172813)

***Note**: Because dataset content is fixed at the time of ingestion, this table type cannot be refreshed after it is added to the analysis.*

**Create table from Insights block**

Use this option to pull data from a block in an existing Insights dashboard — for example, a summary table or aggregated metric that your team maintains centrally. The table is static and reflects the block content at the time it was added.

1. Click**Add Source Step** and select**Create table from Insights block**
2. Select the Insights dashboard that contains the block you want to use
3. Select the specific block within that dashboard
4. Name the table

***Note**: Insights block tables are static. They do not automatically sync with updates to the underlying dashboard.*

![46077729580045](https://help.benchling.com/hc/article_attachments/46077729580045)

**Create table from Registry Schemas**

Use this option to create a table from structured entity data in the Benchling Registry. This is useful when your analysis needs to enrich run data with entity metadata — for example, pulling sample attributes, lot numbers, or sequence information associated with the entities in your experiment.

1. Click**Add Source Step** and select**Create table from Registry Schemas**
2. Select the entity schema or plate schema you want to query
3. The table is populated with all entities that match the selected schema

![46077706173325](https://help.benchling.com/hc/article_attachments/46077706173325)

**Create table from uploaded CSV**

Use this option to upload an external CSV file as a table. This is useful for lookup tables, reference ranges, or other structured data that lives outside of Benchling.

1. Click**Add Source Step** and select**Create table from uploaded CSV**
2. Upload the CSV file from your computer
3. Name the table

![46077706177165](https://help.benchling.com/hc/article_attachments/46077706177165)

**Convert CSV files to a dataset**

After importing files, add a conversion step to transform the raw CSV files into a tabular dataset that downstream steps can work with.

1. Add a new step from the**Import files from data catalog** node
2. Select**Convert CSV files to dataset** — note the pluralization in the step name, which confirms the step accepts multiple input files and produces a single output dataset
3. Configure the conversion settings for your file type

![Screen Recording 2026-05-12 at 5.21.22 PM.gif](https://help.benchling.com/hc/article_attachments/46077706177805)

**Define template variables**

If your analysis needs additional input values supplied at run time — such as a boolean flag, a plate identifier, or a text value — add a Define template variables step.

1. Add a**Define template variables** step to the flowchart
2. Select the variable type (Boolean, Text, Integer, Decimal or Benchling Type)

  - Benchling Types supported:

    - AA sequence
    - Container
    - Custom Entity
    - DNA sequence
    - Mixture
    - Molecule
    - Plate
    - RNA sequence
    - User


3. Provide an example value — this value is used during prototype execution and is replaced with the actual value each time the template runs

![Screen Recording 2026-05-12 at 5.18.37 PM.gif](https://help.benchling.com/hc/article_attachments/46077729587853)

***Note**: Variable types in Define template variables don't map 1:1 to run schema field types. For example, a multi-select text variable becomes a single-select text field in the auto-generated run schema. Review the generated run schema fields after saving the template to confirm the mapping is as expected.*

**Look up entity and plate metadata**

To enrich your data with additional information about entities or plates from the Benchling Registry, add a Look up step.

1. Add a**From** **Look up** step to the flowchart
2. Select the table within your Analysis you want to look up from
3. Select the entity schema or plate schema you want to look up
4. Map the lookup column from your dataset to the identifier in the selected schema
5. Select the additional fields you want to pull into the dataset
6. Click**Add table**

![46077729588877](https://help.benchling.com/hc/article_attachments/46077729588877)

**Build the rest of the analysis**

Add filters, transforms, joins, unions, and charts as needed to complete your [analysis](https://help.benchling.com/hc/en-us/articles/36096516002317-Analyze-data-with-Benchling-Analysis). These can be added from either the Flowchart Editor canvas or the left sidebar. If you need to embed a Python script for parsing, advanced calculations, or custom visualizations, add a Custom Code step — see the section below for details.

Outputs are configured when you save the analysis as a template in the next step, not during the Analysis build.



## Custom Code

Custom Code is a step type in the Automation Designer that lets you embed Python scripts directly into your Analysis workflows. It's designed for scenarios where Benchling's built-in no-code transformations aren't enough — such as parsing unsupported instrument file formats, performing advanced statistical calculations, or building specialized visualizations. Custom Code accepts files and datasets as inputs and returns datasets, files, or charts as outputs, all within the same Analysis flowchart.

![46082223473933](https://help.benchling.com/hc/article_attachments/46082223473933)



## Understand how Custom Code works

Custom Code runs as a step in the Automation Designer flowchart. Each step accepts one or more inputs — files, datasets, or a mix of both — and returns one or more outputs using the IOData class. Outputs can be pandas DataFrames (returned as datasets), BytesIO objects (returned as files), or figures (returned as charts).

The entry point for every Custom Code step is the custom_code function:

```
`def custom_code(inputs: list[IOData],**kwargs) -> list[IOData]:`
```

All outputs must be returned as a list of IOData objects, even when returning a single output:

```
`return [IOData(name="MY_OUTPUT", data=result_dataframe)]`
```

The IOData class has two attributes:

- name: A string identifier for the input or output object
- data: One of BytesIO (for files), a pandas DataFrame, or a Plotly graph_objects Figure

When multiple inputs are connected to a single Custom Code step, they arrive in the order the connections were made. You can reference them by index or by name. Mixed input types are supported — you can connect both datasets and files to the same step.

When an error occurs during execution, the editor displays the line number and exception message to help you identify and fix the issue.

If Custom Code is saved in an Analysis template or applied as an Analysis output, the Custom Code step is locked and cannot be edited.

## Create a Custom Code step

To add a Custom Code step to your Analysis:

1. Open your Analysis and click the **Flowchart Editor** button in the top-right corner
2. Locate the dataset or file step you want to use as input — this can be any step that outputs a dataset or file, including prior transformation steps or import steps
3. Hover over the output step, click it, and select**Custom Code** from the step type menu
4. If you want to pass multiple inputs into the step, draw additional connections from each input step to the same Custom Code step
5.

Write or paste your Python script inside the custom_code function in the code editor — the editor opens with default imports pre-loaded

![46082223474317](https://help.benchling.com/hc/article_attachments/46082223474317)


6. Click**Save** to save your script, then run the step

![Screen Recording 2026-05-12 at 12.19.55 PM.gif](https://help.benchling.com/hc/article_attachments/46082207188493)

## Understand error messages in Custom Code

When an error occurs during execution, Custom Code displays the error directly on the step in the flowchart. The error includes the line number and exception message from your script, so you can identify and fix the issue without leaving the Automation Designer.

Common causes of errors include type mismatches (for example, passing a decimal.Decimal value to a NumPy function without first converting it to float), referencing an input by an index that doesn't exist, or returning an output that isn't wrapped in a list of IOData objects.

## Use Custom Code for common workflows

### Parse instrument files

Use Custom Code to read and parse instrument data files that aren't supported natively by Benchling Connect's out-of-the-box connectors.

1. Create a new Analysis
2. In the Flowchart Editor, click**Add Source Step** and select**Import file from data catalog**
3. In the right sidebar, select the file from the data catalog and specify the file name
4. Add a new step from the imported file step and select**Custom Code**
5. Write your code to parse the input file and return the result as a list of IOData instances
6. Click**Save**

![File Parsing.gif](https://help.benchling.com/hc/article_attachments/46082223475341)

### Transform, merge, and calculate data

Apply transformations, merge or join datasets, and perform calculations that go beyond the built-in transformation steps available in Analysis.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select**Custom Code**
2. Write your transformation logic inside the custom_code function
3. Return the modified data as a list of IOData instances
4. Click**Save**

![Statistics.gif](https://help.benchling.com/hc/article_attachments/46082223475597)

### Create advanced visualizations

Build custom charts and figures using Plotly graph objects. This is useful for specialized visualizations such as chromatograms, heatmaps with custom annotations, or multi-panel figures that aren't available through the standard Analysis chart types.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select**Custom Code**
2. Write your code to construct a Plotly Figure using plotly.graph_objects.Figure
3. Return the figure as a list of IOData instances
4. Click**Save**

![Advanced Visualizations.gif](https://help.benchling.com/hc/article_attachments/46082207189133)

### Generate new output files

Create new files as outputs — such as formatted CSV exports, instrument instruction lists, or other file types — using BytesIO.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select**Custom Code**
2. Write your code to construct a BytesIO file object
3. Return the file as a list of IOData instances
4. Click**Save**

![Generate Output Files.gif](https://help.benchling.com/hc/article_attachments/46082223476621)



## Understand supported Python packages

Custom Code runs in a managed Benchling environment with a curated set of pre-installed Python packages. You can import any of the packages below directly in your code. You cannot install additional libraries via pip.       Package Version Description    allotropy 0.1.105 Python library by Benchling for converting instrument data into the Allotrope Simple Model (ASM)   biopython 1.86 Biological sequence analysis   lmfit 1.3.4 Non-linear curve fitting   matplotlib 3.10.3 Charting and visualizations   numpy 2.2.4 Numerical computing   openpyxl 3.1.5 Excel file reading/writing   pandas 2.2.3 Data manipulation and analysis   plotly 5.22.0 Interactive charting and visualizations   pyarrow 19.0.1 Apache Arrow integration   pydantic 1.10.21 Data validation and settings   seaborn 0.13.2 Charting and visualizations   scikit-learn 1.6.1 Machine learning   scipy 1.15.2 Scientific computing   statsmodels 0.14.4 Statistical modeling

To discover the exact package versions available in your tenant, run the following code in a Custom Code step:

```
`from io import BytesIO
import pandas as pd
from typing import NamedTuple
import plotly.graph_objects as go
from importlib.metadata import distributions

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData],**kwargs) -> list[IOData]:

    packages = [{"package": d.name, "version": d.version}

    for d in distributions()]

    df = pd.DataFrame(packages).sort_values("package")

    df = df.reset_index(drop=True)

    return [IOData("packages", df)]`
```



## Follow Custom Code best practices

#### Biological Sequence Handling

For DNA, RNA, and protein sequence operations, prefer Biopython over generic string handling. Biopython provides built-in sequence validation, codon usage tables, alignment tools, and robust handling of ambiguous bases.

#### Curve Fitting

For non-linear curve fitting tasks such as 4PL or 5PL regression, prefer lmfit over scipy.optimize. lmfit provides more intuitive parameter handling, better error estimates, easier bounds definition, and built-in fit reports.

#### Type Compatibility with NumPy

Benchling data may contain decimal.Decimal types. NumPy functions do not support Decimal directly. Always convert Decimal values to float before using numpy, scipy, or scikit-learn functions:

df['column'] = df['column'].astype(float)

### Find example code

Benchling maintains a public GitHub repository of Custom Code examples covering file parsing, data transformation, visualization, and file generation. Use it as a starting point for your own scripts or as a reference for working implementations.

Repository: [https://github.com/benchling/app-examples-python/tree/main/examples/custom-code-AD](https://github.com/benchling/app-examples-python/tree/main/examples/custom-code-AD)

To use an example:

1. Browse the examples/custom-code-AD/ directory in the repository
2. Find a snippet that matches your use case or adapt one as a starting template
3. Copy the script into the Custom Code editor in your Automation Designer
4. Adapt the code to match your data and desired outputs
5. Run and validate within your Analysis

## Custom Code steps in Analysis Templates

You can save an Analysis that contains Custom Code steps as an Analysis template. When you do, the Python script inside each Custom Code step is saved as part of the template. Anyone who creates a new Analysis from that template will start with the script pre-populated and ready to run or modify.

When a user creates a new Analysis from the template, the Custom Code step will appear in the flowchart with the saved script already loaded in the code editor.

## Migrate Analysis templates that contain Custom Code steps

Analysis templates that include Custom Code steps are supported in configuration migration. When you migrate a template from one tenant to another, the Python script inside each Custom Code step migrates automatically — no manual re-entry is required.


Note: Review the template to ensure the script does not contain hardcoded references to specific files, datasets, or tenant-specific values that may not be valid in a new Analysis.

## Understand limitations for Custom Code

Keep the following constraints in mind when using Custom Code:

- Execution time is limited to 15 minutes per run
- The execution environment does not have general network access
- You cannot install custom libraries — only the pre-installed packages listed above are available
- The Benchling SDK and API are not supported within the Custom Code execution environment
- Custom Code steps are not version-controlled — only the most recent version of your script is saved. Code change history can be downloaded from the audit log.
- When configuration migrating Analysis templates, variable input files and connected data sources are not migrated and must be reconnected in the destination tenant

## Save an Analysis as an Analysis Template

Once your Analysis is running correctly on example data, save it as an Analysis Template so it can be applied to new data automatically.

1. Click the **...** menu in the top-right corner of the Analysis
2. Select**Save as Analysis Template**
3. Name the template and select a Template Collection to save it to — end users need at least Read access to the template collection to use the template
4. Under**Starting Tables**, review the behavior assigned to each source step and confirm it is correct before saving:

  -**Static** — the table uses the same data every time the template runs. Use this for fixed reference data such as lookup tables or uploaded CSVs that do not change between runs
  -**Variable** — the table expects new data to be supplied each time the template runs. Use this for steps that accept files or datasets that vary per run, such as instrument output files

5. For each output you want automatically sent to the Notebook entry when the template runs, configure the output type (chart, result, or dataset) and the destination section
6. Click**Create**

***Note:**Once an Analysis Template is created, it cannot be edited. To make changes, duplicate your Analysis or build a new one, then save it as a new template.*



## Set up a run schema and execute with an Analysis Template

To trigger an Analysis Template from a Connect run in the Notebook, you need a run schema that is configured to use the template.

There are two paths to which you can add an Analysis Template to a run schema:

- Analysis Templates with Variable input tables
- Analysis Templates with Input Files, Static input tables, or Analysis variables

Note: Users configuring the run schema need at least Read access to the template collection that contains the Analysis Template.

### Analysis Templates with Variable Input Tables


1. Navigate to **Settings > Run Schemas** and create or open the run schema for your assay
2. Under the output file configuration, select**Record Dataset** to enable the run to create a dataset as output
3. Click**Configure Dataset** to define the dataset columns — if uploading from a sample file, column names and types are inferred automatically
4. Under**Analysis Template**, select the Analysis Template you saved
5. Complete the column mapping between the run's dataset output and the template's expected input columns
6. Save the run schema

![video_1280 (5).gif](https://help.benchling.com/hc/article_attachments/46077729590797)

If your run schema is configured to both**Record results** and**Record dataset**, the dataset is created directly from the results. The dataset configuration is populated automatically from the result schema and cannot be modified.

Note: Analysis Templates with additional inputs (file, static table) that**includes** a variable input table can be configured in this route, however, the inputs will be handled as static via this route.

#### Executing the Run


1. Open a Notebook entry and insert a run using the configured run schema
2. Click**Retrieve Data** to pull in the instrument file via Connect, or upload the file manually
3. Click**Preview Files** to review the incoming data
4. Click**Process Data** to execute the run — the Analysis Template runs automatically and outputs are inserted into the Notebook entry

![2025-02-28_06-21-38 copy (1).gif](https://help.benchling.com/hc/article_attachments/46077706186381)

### Analysis Templates with Input Files, Static input tables, or Analysis variables


1. Navigate to**Settings > Run Schemas** and create or open the run schema for your assay
2. In the configuration options, select**Analysis Template**, select the Analysis Template you saved with an input file, static input table or analysis variable source

Note: Templates with Analysis variables will automatically be included into the run schema configuration

![46077706187277](https://help.benchling.com/hc/article_attachments/46077706187277)

#### Executing the Run


1. Open a Notebook entry and insert a run using the configured run schema
2. If Analysis variables are included in the template, these appear as configuration options
3.**Create** the run in the entry
4.**Select** your File inputs (up to 24 files) from the following options:

  1. Select From Connection - Select Files that are synchronized to a specific connection
  2. Select From Data Catalog - Select Files that are stored in the Data Catalog, either have been synchronized to an existing connection or uploaded directly to Benchling
  3. Upload Files - Upload Files directly into the run
  4. Retrieve From Connection - Retrieve files from connections that do not automatically synchronize files. Specific for API connections such as Chromeleon, AVEVA PI, and Empower

5. Click**Execute Automation** to execute the run — the Analysis Template runs automatically and outputs are inserted into the Notebook entry

![Untitled Project (2).gif](https://help.benchling.com/hc/article_attachments/46077729595277)

## Limitations

Keep the following constraints in mind when building and running Analysis Templates:

- File size: The Convert CSV files to dataset step limits each file to 30 MB. For larger files, use a Custom Code step instead
- Analysis Templates cannot be edited after creation. To make changes, duplicate your Analysis or build a new one, then save it as a new template
- Analysis Templates with additional inputs (file, static table) that**includes** a variable input table can be configured to a run schema, however, the file inputs will be handled as static via this route.
- If the Notebook entry is being actively edited when an analysis completes, the analysis may be blocked from inserting outputs due to an entry lock. If this happens, retry from the progress bar — the lock is released automatically a few seconds after the last edit
- The analysis and any datasets it creates are saved to the same folder as the Notebook entry
- Custom Code step outputs work best when they return a fixed number of datasets and files each execution, even if some of those outputs are empty
- Template variable types don’t map 1:1 to run schema field types. Review the auto-generated run schema after saving a template to confirm field types are correct
