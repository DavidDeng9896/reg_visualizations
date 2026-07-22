# Custom Code in Automation Designer

> 原文链接: https://help.benchling.com/hc/en-us/articles/45805331624717-Custom-Code-in-Automation-Designer
> 抓取时间: 2026-07-22
> 图片来源: Benchling Help Center（图片地址保留原文链接）

---
Custom Code is a step type in the Automation Designer that lets you embed Python scripts directly into your Analysis workflows. It's designed for scenarios where Benchling's built-in no-code transformations aren't enough — such as parsing unsupported instrument file formats, performing advanced statistical calculations, or building specialized visualizations. Custom Code accepts files and datasets as inputs and returns datasets, files, or charts as outputs, all within the same Analysis flowchart.

*Note: Custom Code* *requires Advanced Analysis*

![](https://help.benchling.com/hc/article_attachments/45805343726093)

 

## Understand how Custom Code works

Custom Code runs as a step in the Automation Designer flowchart. Each step accepts one or more inputs — files, datasets, or a mix of both — and returns one or more outputs using the IOData class. Outputs can be pandas DataFrames (returned as datasets), BytesIO objects (returned as files), or figures (returned as charts).

The entry point for every Custom Code step is the custom_code function:

```
def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
```

All outputs must be returned as a list of IOData objects, even when returning a single output:

```
return [IOData(name="MY_OUTPUT", data=result_dataframe)]
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
3. Hover over the output step, click it, and select **Custom Code** from the step type menu
4. If you want to pass multiple inputs into the step, draw additional connections from each input step to the same Custom Code step
5. 

Write or paste your Python script inside the custom_code function in the code editor — the editor opens with default imports pre-loaded

![](https://help.benchling.com/hc/article_attachments/45805343726605)

6. Click **Save** to save your script, then run the step

![Screen Recording 2026-05-12 at 12.19.55 PM.gif](https://help.benchling.com/hc/article_attachments/45805343727245)

##  

## Understand error messages in Custom Code

When an error occurs during execution, Custom Code displays the error directly on the step in the flowchart. The error includes the line number and exception message from your script, so you can identify and fix the issue without leaving the Automation Designer.

Common causes of errors include type mismatches (for example, passing a decimal.Decimal value to a NumPy function without first converting it to float), referencing an input by an index that doesn't exist, or returning an output that isn't wrapped in a list of IOData objects.

##  

## Use Custom Code for common workflows

### Parse instrument files

Use Custom Code to read and parse instrument data files that aren't supported natively by Benchling Connect's out-of-the-box connectors.

1. Create a new Analysis
2. In the Flowchart Editor, click **Add Source Step** and select **Import file from data catalog**

3. In the right sidebar, select the file from the data catalog and specify the file name
4. Add a new step from the imported file step and select **Custom Code**

5. Write your code to parse the input file and return the result as a list of IOData instances
6. Click **Save**

![File Parsing.gif](https://help.benchling.com/hc/article_attachments/45805331620237)

### Transform, merge, and calculate data

Apply transformations, merge or join datasets, and perform calculations that go beyond the built-in transformation steps available in Analysis.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select **Custom Code**

2. Write your transformation logic inside the custom_code function
3. Return the modified data as a list of IOData instances
4. Click **Save**

![Statistics.gif](https://help.benchling.com/hc/article_attachments/45805343730317)

### Create advanced visualizations

Build custom charts and figures using Plotly graph objects. This is useful for specialized visualizations such as chromatograms, heatmaps with custom annotations, or multi-panel figures that aren't available through the standard Analysis chart types.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select **Custom Code**

2. Write your code to construct a Plotly Figure using plotly.graph_objects.Figure
3. Return the figure as a list of IOData instances
4. Click **Save**

![Advanced Visualizations.gif](https://help.benchling.com/hc/article_attachments/45805343733133)

### Generate new output files

Create new files as outputs — such as formatted CSV exports, instrument instruction lists, or other file types — using BytesIO.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select **Custom Code**

2. Write your code to construct a BytesIO file object
3. Return the file as a list of IOData instances
4. Click **Save**

![Generate Output Files.gif](https://help.benchling.com/hc/article_attachments/45805331621901)

## Understand supported Python packages

Custom Code runs in a managed Benchling environment with a curated set of pre-installed Python packages. You can import any of the packages below directly in your code. You cannot install additional libraries via pip.

| Package | Version | Description |
|---|---|---|
| allotropy | 0.1.105 | Python library by Benchling for converting instrument data into the Allotrope Simple Model (ASM) |
| biopython | 1.86 | Biological sequence analysis |
| flowkit | 1.3.1 | Flow cytometry data analysis |
| kaleido | 0.2.1 | Static image export for Plotly figures |
| lmfit | 1.3.4 | Non-linear curve fitting |
| matplotlib | 3.10.3 | Charting and visualizations |
| numpy | 2.4.3 | Numerical computing |
| openpyxl | 3.1.5 | Excel file reading/writing |
| pandas | 2.2.3 | Data manipulation and analysis |
| plotly | 5.22.0 | Interactive charting and visualizations |
| pyarrow | 19.0.1 | Apache Arrow integration |
| pycorn | 0.19 | AKTA chromatography file parsing |
| pydantic | 2.12.5 | Data validation and settings |
| rdkit | 2025.9.3 | Cheminformatics and molecular modeling |
| seaborn | 0.13.2 | Charting and visualizations |
| scikit-learn | 1.6.1 | Machine learning |
| scipy | 1.15.2 | Scientific computing |
| statsmodels | 0.14.4 | Statistical modeling |

 

To discover the exact package versions available in your tenant, run the following code in a Custom Code step:

```
from io import BytesIO
import pandas as pd
from typing import NamedTuple
import plotly.graph_objects as go
from importlib.metadata import distributions

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    
    packages = [{"package": d.name, "version": d.version}
    
    for d in distributions()]
    
    df = pd.DataFrame(packages).sort_values("package")
    
    df = df.reset_index(drop=True)
    
    return [IOData("packages", df)]
```

## Follow best practices

#### Biological Sequence Handling

For DNA, RNA, and protein sequence operations, prefer Biopython over generic string handling. Biopython provides built-in sequence validation, codon usage tables, alignment tools, and robust handling of ambiguous bases.

#### Curve Fitting

For non-linear curve fitting tasks such as 4PL or 5PL regression, prefer lmfit over scipy.optimize. lmfit provides more intuitive parameter handling, better error estimates, easier bounds definition, and built-in fit reports.

#### Type Compatibility with NumPy

Benchling data may contain decimal.Decimal types. NumPy functions do not support Decimal directly. Always convert Decimal values to float before using numpy, scipy, or scikit-learn functions:

df['column'] = df['column'].astype(float)

## Find example code

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

## Understand limitations

Keep the following constraints in mind when using Custom Code:

- Execution time is limited to 15 minutes per run
- The execution environment does not have general network access
- You cannot install custom libraries — only the pre-installed packages listed above are available
- The Benchling SDK and API are not supported within the Custom Code execution environment
- Custom Code steps are not version-controlled — only the most recent version of your script is saved. Code change history can be downloaded from the audit log.
- When configuration migrating Analysis templates, variable input files and connected data sources are not migrated and must be reconnected in the destination tenant
