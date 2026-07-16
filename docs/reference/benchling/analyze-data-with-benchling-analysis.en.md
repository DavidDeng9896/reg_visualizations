# Analyze data with Benchling Analysis

> 原文链接: [https://help.benchling.com/hc/en-us/articles/36096516002317-Analyze-data-with-Benchling-Analysis](https://help.benchling.com/hc/en-us/articles/36096516002317-Analyze-data-with-Benchling-Analysis)

---
1. [Benchling](https://help.benchling.com/hc/en-us)
2. [Product Documentation](https://help.benchling.com/hc/en-us/categories/6455186023309-Product-Documentation)
3. [Analytics & Automation](https://help.benchling.com/hc/en-us/sections/39551530102925-Analytics-Automation)

# Analyze data with Benchling Analysis

![Anshi](https://help.benchling.com/system/photos/9321290433293/help-icon__1_.png)

Anshi

- Updated
  May 22, 2026 20:54

Benchling Analysis is a powerful data workspace that lets you import, transform, and visualize data from across the Benchling ecosystem. Use it to build reproducible analysis pipelines, apply statistical transformations, and generate charts that can be saved as outputs and embedded directly into Notebook entries. Analysis is designed for scientists who need flexible, code-free tools to explore and interpret experimental data.

## Create an Analysis

Creating a new Analysis is the first step to using the suite of tools that Benchling Analysis offers.

![Screenshot 2025-07-15 at 10.59.20 AM.png](https://help.benchling.com/hc/article_attachments/38214373513101)

1. Navigate to the **Global create icon** on the sidebar; click on **Insights** and select **Analysis**
2. Enter a Name and Project for the analysis
   1. Note that any data in the analysis, including data pulled from other projects, will be available to all users with access to the selected project
3. Click **Create**

## Navigate the left sidebar

The left sidebar in an Analysis displays all of the views associated with your analysis, organized by their type. Views that are datasets, files, or charts will appear in the sidebar, giving you a quick way to navigate between your work without returning to the main flowchart. Select any view in the sidebar to open it directly.

The left sidebar includes the following functionality:

- Create Analysis Tables -- Outlined in detail in Create an Analysis Table section below
- Direct view creation: create a new view from any parent or child view directly in the sidebar, without navigating to the flowchart
- Search: use the search bar in the sidebar to quickly find a specific view by name
- Deeper view nesting: views can be nested more than one level deep, making it easier to organize complex analyses
- Expand/Collapse All: expand or collapse all views shown in the left sidebar
- Go to Flowchart: click this option on any view to jump to that view's position in the Flowchart editor

![Analysis_Left-Sidebar_Improvements.gif](https://help.benchling.com/hc/article_attachments/46023901987981)

## Create an Analysis Table

Analysis Tables are the top-unit level of table data in an Analysis, although an Analysis can contain multiple Analysis Tables. Unlike Insights dashboards, Analysis Tables can only be modified from within the Analysis, and do not live update with data from outside the Analysis. They provide a foundation to filter, transform, and prepare data for graphing, data analysis, and export.

![](https://help.benchling.com/hc/article_attachments/44559058813965)

To create an Analysis Table,

1. Navigate to the Analysis in which you would like to create your table
2. Click the **+ button** next to Analysis Tables

From the resulting menu, there are multiple ways to create analysis tables from data within or outside of Benchling. The process for each method is described in the sections below.

### Create an Analysis Table from an Insights query

Use an existing Insights SQL query to create an Analysis Table. This option is only available to Benchling users with Data Warehouse licenses. **Note:** These queries are currently limited to returning 50,000 rows.

1. Select ‘From dashboard query’
2. Select the dashboard and block you wish to import into your table; you may choose to rename the table at this time. The data table will preview on the right hand pane
3. Click **Add table**

**![Screenshot 2025-05-01 at 10.10.39 AM.png](https://help.benchling.com/hc/article_attachments/36275865772045)**

### Create an Analysis Table from a Registry schema

Use Registry and Result schema data to create an Analysis Table.

1. Select ‘From Registry schema’
2. Select a Registry schema to start from. This will pull all entities from the selected schema into the table. Apply filters to narrow down the entities that are pulled into the table
3. Select the columns to include in the table. Entity links on the schema can be expanded to allow linked schema data to be pulled into the table
4. Click **Add Results** to add Results that are recorded against entities in the selected Registry schema
   - If there is more than one field on the Result schema that could link to the Registry schema, a dropdown will appear to specify which field of the Result schema that you want to join on.
   - Selecting ‘Only include latest results’ will pull the latest result captured per entity into the table, whereas ‘Include all results’ will include all result data captured against the entity
5. Click **Add table**

Notes about Registry schema tables:

- Up to 50,000 rows of data can be created.
- This method of table creation queries Benchling’s core database, and therefore does not have any sync latency
- When multi-select fields or related results with >1 value are selected, the data is split across multiple rows. Linked data is joined via a “left join”. To re-aggregate data in downstream analyses, we recommend selecting the “id” column when needed.
- **The created table is a snapshot of the data returned from the executed query at table creation. The data does not update over time.**

### Create an Analysis Table from Plate data

1. Select "From plate schema"
2. Select the schema for which you'd like to retrieve plate data.
3. Search for and select one or more plates you'd like to ingest by using their name identifiers.
4. Select the fields you'd like to retrieve from this data by navigating the list of available options.
5. Specify a name to be used for this new analysis table.
6. Click **Add table**

### Create an Analysis Table from a CSV file

Upload data directly into the Analysis tool by creating a table from a CSV file. **Note:**This method is currently limited to ingesting files up to 150MB. (There is no limitation on number of rows or columns.)

1. Select ‘From CSV’
2. Under Upload CSV, select Choose a file or drag and drop your file. A pop-up window will appear to select a file for upload. The file must be in a CSV format.
3. When a file is uploaded, a preview will appear on the right side of the screen, and the editable “Name table” field will automatically populate with the file name.
4. You can change the name of the Analysis Table from the default file name
5. Click **Add table**

### Create an Analysis Table by combining Analysis Tables

Join two Analysis Tables and/or Views to create a new Analysis Table.

1. Select ‘By combining tables’
2. Select your desired tables within the Analysis and choose the join type you wish to use:
   - Left Join: Join all rows from the left table, matching rows from the right
   - Inner Join: Join only matching rows from both tables
   - Right Join: Join all rows from the right table, matching rows on the left
   - Full Join: Join all rows from both tables
   - Append: Merge rows based on the index, without join keys
3. After selecting the desired join type, you will be prompted to choose the join keys that match columns between the tables
4. After selecting your chosen join keys, Benchling will preview the created table on the right side of the workspace. Rename your new table as desired and click ‘Add table’. The table will be added to your Analysis and can be manipulated or create views like any other Analysis Table
5. Click **Add table**

Once you have your table(s) created, you can create Analysis Views to chart and transform the data.

### Create an Analysis Table from Look Up

Create a new Analysis table by looking up data/metadata from existing Benchling schemas.

![](https://help.benchling.com/hc/article_attachments/44559031799565)

1. Select **From Look Up**
2. Select the desired table within the Analysis you wish to look up data/metadata from
3. Select the look up column from the Analysis Table selected above
4. Select an identifier format (Name, ID, Barcode) that will match the value in your selected lookup column
5. Choose the specific schema that matches the type of items in your lookup column

   ***Note:** Entities schemas are currently available to all users; additional schema types will be supported in the future*
6. After selecting the specific schema, you will be prompted to navigate the schema to include additional data/metadata based on the lookup column matching. If the schema doesn't match your data, the step may fail or return no results.
7. Click **Add table**

## Format Data for Analysis

Analysis works best with long data rather than wide data. Long data is where a row only contains a single observation (e.g. a well plate). Additional columns contain data point(s) about that observation. In other environments and applications,  wide data  is often used. This is where you might have many columns of data with datapoints in them, such as "Cell Line 1" and "Cell Line 2" being separate columns, each with "Concentration" values inside them. See below for examples. Wide data can be converted to long data by using the Unpivot transform.

Long format data is necessary to leverage various transforms in Analysis like aggregations, binning, grouping, etc.

**Example Long Data**

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Sample ID** | **Concentration** | **Cell Line** | **Type** | **Result** |
| 1 | 0.34 | 1 | Standard | 355 |
| 2 | 0.76 | 2 | Sample | 212 |
| 3 | 0.88 | 1 | Standard | 531 |
| 4 | 0.52 | 2 | Sample | 877 |

**Example Wide Data**

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| **Concentration Cell Line 1** | **Sample ID** | **Type** | **Concentration Cell Line 2** | **Sample ID** | **Type** | **...** |
| 0.34 | 1 | Standard | 0.76 | 2 | Standard | ... |
| 0.88 | 3 | Sample | 0.52 | 4 | Sample | ... |

### 

## Analysis Views

An Analysis View is a copy of an Analysis Table that can be modified using filters, transformations, and charting. Analysis Views are nested under the Analysis Table that they were created from, and if a filter is applied at the Analysis Table level, the filter will be applied to **all** Analysis Views for that Analysis Table.

Data modifications that are applied to an Analysis View will not propagate up to the parent Analysis Table or to other Analysis Views. However, they will propagate to an Analysis Table that is created through the “By combining tables” option using the Analysis View or when an Analysis View is promoted to an Analysis Table. Please see the section called Promoting Analysis Views for additional information.

![](https://help.benchling.com/hc/article_attachments/46023921659789)

## Create an Analysis View

Create a new Analysis View from an Analysis Table to apply transformations or visualization to the data

1. Navigate to the Analysis screen
2. Under the Analysis Table, select **New view**
3. Select the type of View that you want to create of the Analysis Table
4. A new View will be created in the format selected for further customization
5. To navigate out of the Analysis View, click **Flowchart or select a separate view in the left-sidebar**

### Rename an Analysis View

1. Select the Analysis View that you want to edit
2. Click into the text box in the top left corner of the View and click to edit the name of the View
3. The new Analysis View name will automatically be saved
   1. In a View that has already been created, you may have to click the **edit icon** to open the text box to edit, then click the **check mark** to save the new name

### Change an Analysis View type

If an Analysis View already exists, you can still change the View Type in the Analysis settings panel at any time. Analysis View Types include (but are not limited to) tables, bar charts, box plot, pie charts, heatmaps, and scatter plots.

1. Navigate to the Analysis
2. Select the View that you want to edit
3. Select the **edit** icon in the top right corner of the displayed View
4. Under “View Type” in the setting panel on the right, select the type of view you want to change to from the dropdown menu
5. The Analysis View will automatically save

![Screenshot 2025-05-01 at 10.22.59 AM.png](https://help.benchling.com/hc/article_attachments/36275838572301)

### 

### Promote an Analysis View to an Analysis Table

An Analysis View can be promoted to an Analysis Table. The Analysis Table will continue to reflect changes made to the Analysis View from which it was promoted. This is another way that you can create a new Analysis table. Promoting graphical View types (such as heatmaps or scatter plot types) promotes the underlying data table from which the graph was generated. This data table is visible in the editing mode of the Analysis view.

1. Select the View that you want to promote
2. Click the **... icon** in the top right corner of the View
3. Choose “Promote view to table”

![Screenshot 2025-05-01 at 10.25.10 AM.png](https://help.benchling.com/hc/article_attachments/36275865773069)

## Analysis Charting Capabilities

Benchling Analysis supports a range of chart types and configuration options to help you visualize and interpret your data. Once you've created an Analysis View and selected a chart type, you can configure axes, style your data points, customize colors, and chart legends — all without leaving the Analysis tool.

### Understand chart types

Analysis supports the following chart types. To select or change a chart type, navigate to the Analysis View and select View Type in the configuration sidebar on the right.

- Bar chart
- Line chart
- Scatter plot
- Box plot
- Heatmap
- Pie chart
- Regression — Note: Regressions are only available to users with access to Advanced Analysis (see Regressions section below)

### Configure a chart

Each chart view has a configuration sidebar on the right side of the screen that controls axis mapping, series, and styling options.

![](https://help.benchling.com/hc/article_attachments/46023921660173)

To configure a chart:

1. Navigate to the Analysis View you want to configure
2. Select the edit icon in the top right corner of the displayed View to open the configuration sidebar
3. Use the dropdown menus under the **Configure** section to map your X axis, Y axis, and Series columns
4. Under the **Style** section, adjust appearance options as needed (see Customize chart appearance below)
5. Click **Apply** to save your configuration

### Customize chart appearance

Analysis provides several options for customizing the visual appearance of your charts. These options are available in the Style section of the chart configuration sidebar and apply to all chart types except regressions, unless otherwise noted.

#### Color picking

Use the color picking tool to directly control the colors used for each data series in your chart. Rather than relying on the default color palette, you can assign specific colors to each series to match your preferred conventions or make charts easier to read at a glance.

To customize colors:

1. Open the chart configuration sidebar
2. Under **Style**, locate the **Color** section
3. Select the color swatch next to the series you want to change
4. Choose your preferred color from the color picker
5. Click **Apply** to save

#### Point styling

Customize the appearance of individual data points or markers on your chart, including their shape and opacity.

To adjust point styling:

1. Open the chart configuration sidebar
2. Under **Style**, locate the **Point** style section
3. Select the desired marker shape from the available options
4. Adjust the **Opacity** slider to set the transparency of the points
5. Click **Apply** to save

#### Custom axis labeling

Override the default column-name axis labels with custom text to make your charts clearer and more presentation-ready.

To set custom axis labels:

1. Open the chart configuration sidebar
2. Under the **Configure** section, locate the axis you want to relabel (X axis or Y axis)
3. Enter your preferred label text in the **Custom label** field
4. Click **Apply** to save

#### Legend settings

Control whether the legend is displayed, where it appears, and what label it shows.

To configure legend settings:

1. Open the chart configuration sidebar
2. Under **Style**, locate the **Legend** section
3. Use the toggle to show or hide the legend
4. If the legend is visible, use the position dropdown to choose Left, Right, Top, or Bottom
5. Optionally, enter a **Custom legend** label
6. Click **Apply** to save

## Flag data

Data flagging in Benchling Analysis allows you to manually annotate and comment on rows of data in table views. Each flag is accompanied with a comment and can be filtered as needed using normal filters in Analysis. Flagging is intended to be a manual process that is unique to a particular dataset and analysis at a specific point in time.  Conceptually, you should flag rows that are anomalous or need special treatment-- especially when the reason for special treatment is not something captured in the data itself. If it is captured in the data, regular filtering can be used for this purpose this is because filtering can be automated, data flagging can't. Every step of adding or removing flags (or deleting the associated steps) will be saved to the audit log so that all flag-related changes are recorded and can be reconstructed.

![](https://help.benchling.com/hc/article_attachments/36096496993933)

### Add flags to rows

To flag rows, click the checkbox that appears when you move your cursor to the row number at the left edge of the row. Select as many rows as needed.

![flags1.png](https://help.benchling.com/hc/article_attachments/37202810031501)

Click the **Flag** button that has appeared above the table. Enter a comment that explains why these rows are being flagged. Comments are required. The comment you enter will be applied to all the rows you selected. Once you submit, a flag column will be visible with the rows that were flagged along with a new Comment column.

![flags2.png](https://help.benchling.com/hc/article_attachments/37202830915469)

***Note:** Once you flag rows, all the preceding steps in an Analysis before the table in which rows are flagged will be locked. This means they will not be editable.*

### Filter out (or for) flagged rows

Once rows are flagged, it is easy to either filter those rows out or filter unflagged rows out by Adding a filter on the Flag column and selecting the appropriate logic for your needs. For example, you can filter out flagged rows by setting the filter to "Flag equals false".

![](https://help.benchling.com/hc/article_attachments/36096496995725)

### Remove flags

To remove flags, simply select the rows you wish to remove the flags from and click the Clear button instead. Clearing flags also requires a comment.

An alternative method to delete flags is to delete this step in the Filters and Transformations sidebar. As with any other transformation or filter in Analysis, changing flagged rows (adding or removing flags) will cause all downstream Analysis steps and transformations to rerun.

Once flags are added to a table in an analysis, there are several caveats to keep in mind.

- **Data Flagging steps**: Each flagging operation creates a "Flag rows" step in the list of Filters and Transformations.

![](https://help.benchling.com/hc/article_attachments/36096496996621)

- **Multiple flags:** You can add multiple flags to the same row. All of the added flags will be visible in the audit log. However, in the Analysis, only a single flag will be displayed in the flag column whether one or more flags are added, and only the most recent comment will be displayed in the comment column.
- **Locking**: All views and tables that precede a table with flagged rows will be locked. That is because changing prior transformations and filters might change downstream data, which may invalidate the meaning or validity of the flags. Therefore, to be safe, all preceding steps before the view with flagged rows are locked. The lock is lifted if the flags are removed. To make it easier to find which view contains flags that lock part of an analysis, view with flagged rows will have a Flag icon next to them.

![](https://help.benchling.com/hc/article_attachments/36096515972621)

- **Duplicating and Templates**: Because flags are specific to a specific dataset and analysis at a specific time, we do not recommend duplicating analyses with flags. If an analysis with flags is duplicated, the flags will be copied over exactly as well. The creation of templates from analyses with flagged rows is not allowed.
- **JOIN**s and **UNION**s: If either a JOIN or UNION step occurs anywhere after a data flagging step, the flags and comments will be converted to simple booleans and text, respectively. A second flag step created thereafter will create new flag and comment columns.

## Transform and filter data in Analysis

Analysis Views can be manipulated through the application of transformations and filters. Transformations can be used for many functions, including filtering and sorting columns and performing mathematical, statistical, and logical operations on your data.

### Add transformations to an Analysis View

Transformations are the primary means to manipulate the data tables loaded into an Analysis. They can be added to Analysis Views and can perform a number of powerful functions. To add a transformation:

1. Click the **+ icon** next to Filters & Transforms
2. Select the transformation that you wish to apply
3. Fill out the information in the transformation modal to appropriately transform your data, the click **Submit**

![Screenshot 2025-05-01 at 11.00.00 AM.png](https://help.benchling.com/hc/article_attachments/36275838574349)

### Standard transformations

Current standard transformation options include:  
  
**Add computed column** - Create a column with values defined by a combination of mathematical, statistical, logical, string, or datetime functions

**Add window function column(s)** - Apply a function over a subset of data

**Aggregate table** - Apply a mathematical aggregation function over a set of input values

**Bin data** - Divide numerical columns into a defined number of bins

**Convert column formats** - Change the data type of column to another type

**Find and replace text** - Change a defined string into a new value. Accepts strings or regular expressions

**Hide columns** - Changes the visibility of a column to hidden

**Pivot table** - Creates a table of grouped values from individual values

**Rename columns** - Changes the column header

**Reorder columns** - Changes the ordering of columns in a table

**Sort columns** - Sorts a column in ascending or descending order

**Unpivot table** - Flattens a table, converting aggregated columns into rows

If you have access to Advanced Analysis, you also have access to the transformations for Regression and Interpolation. Regressions and interpolations are powerful analysis tools that allow you to model data relationships and make predictions based on existing trends. Regressions help create mathematical models by fitting a curve to your data, enabling you to understand relationships and identify key parameters. Interpolations use these regression models to predict values for new data points, bridging gaps in your datasets. For more information about about the transformations, [see this article](https://help.benchling.com/hc/en-us/articles/30231230015373-Analysis-Functions-Overview).

The sections below cover how to create and configure regressions, interpret their results, and use interpolations to calculate new values seamlessly within Benchling.

## Regressions

***Note**: Regressions are only available for those that have access to Advanced Analysis.*

### Create a regression

1. Select **Regression** when adding a new view under an existing table containing the X and Y variables for the regression
2. A new regression will be created, and the editing view will open automatically
3. After creating the regression, you can modify the data from the existing table by filtering or transforming it within the regression view

### Configure a regression

The editing sidebar allows you to configure the scatter plot and edit the regression itself:![](https://help.benchling.com/hc/article_attachments/36096496969741)

1. Choose appropriate columns for the X and Y axes of the plot
2. Use the dropdown to select the regression model from one of the following
   - Linear
   - Quadratic
   - 4PL
3. Configure any optional configurations, such as:
   - Weights - Set weights for data points using the "Weights" dropdown. The default is equal weighting for all points. A link to more information is available in the dropdown popover.
   - 4PL constraints- For 4PL regressions, constraints can be set. The default setting is algorithmically determined constraints
4. Click the **Apply**button to generate the regression and the regression line will be added to the chart automatically

![](https://help.benchling.com/hc/article_attachments/36096496970253)

### Edit a regression

1. Click **Edit** to modify the model or weights
2. Make your changes and click **Apply** again to update the regression

### Regression Tables

Below the chart, the following tables are available:

![](https://help.benchling.com/hc/article_attachments/36096496971021)

- **Source Table**: Contains the data frame used for modeling.
- **Model Output Table**: Includes the data used for modeling, predictions, and residual calculations.
- **Model Variables Table**: Displays parameters resulting from the regression, including:
  - For linear regression: slope and y-intercept.
  - For 4PL regression: Min, Max, Hill Slope, and Inflection Point.
  - Confidence intervals for the parameters are also included.

## Flag outliers on regressions

Visual flagging tool allows you to use charts and graphs to identify and mark data points that appear to be significantly different from the rest of the data. This tool allows you to flag the unusual data points for further investigation or exclusion. You can apply visual flagging to regression charts.

**Note:** This feature is in beta, learn more
about what it means for a
[feature to be in beta](https://help.benchling.com/hc/en-us/articles/34725874943117-Understanding-Benchling-Release-Stages#:~:text=To%20ensure%20these%20updates%20are,readiness%2C%20stability%2C%20and%20support.)
by reading the linked article.

***Note**:*

- ***Enablement:** For more information about how to get access to Analysis features that are currently in beta, read our* [*Insights Labs article*](https://help.benchling.com/hc/en-us/articles/37074893033357-Insights-Labs)*.*
- ***Accessibility:** Feature is available for newly created Regressions or by re-running existing Regressions in the Flowchart editor.*

### Flag points

![Visual Flagging.gif](https://help.benchling.com/hc/article_attachments/43250045089037)

1. Create or open an Analysis view for a regression
2. Click on the graph near the point you would like to flag and drag your cursor. A lasso will appear, and you can drag this around the point or points that you would like to flag
3. After you have highlighted the point(s) of interest with the lasso tool, a menu will appear in the upper right corner of the graph
4. To flag the data points, click **Flag**
5. Enter a comment into the text box and click **Save**

Once you save your flagged points, theywill be represented on the graph stylistically with an “X” marker. The flagged points will be represented in the Source Table with two new columns, “Flag” (True/False) and “Comment” (Text).

***Note**: Point(s) can be flagged both from the chart preview and while editing/configuring the chart.*

### Unflag points

![](https://help.benchling.com/hc/article_attachments/43250000662797)

1. Lasso select flagged point or points that you would like to unflag
2. After you have highlighted the point(s) of interest with the lasso tool, a menu will appear in the upper right corner of the graph
3. To flag the data points, click **Clear**
4. Enter a comment into the text box and click **Save**
5. Points with cleared flags will return to the previous styling on the graph

### Exclude flagged values

Once points have been flagged via the tool they can be excluded from downstream calculations (e.g. regression fitting).

![](https://help.benchling.com/hc/article_attachments/43250000663693)

1. In the chart configuration, under the Regression section, an **Exclude Flagged Values** checkbox will appear
2. By checking the field, and clicking **Apply** to re-apply the regression fit, the fit will be re-calculated with the exclusion of the flagged point(s)
3. This will update the Model Variables table values to reflect the exclusion of the point(s)
4. By un-checking the **Exclude Flagged Values** checkbox and clicking **Apply**, excluded flagged points will be re-applied to the regression fit

***Note**: Point(s) excluded from regression fitting will still appear on the graph visually, however will be excluded from the calculation. If flagged points are wanted to be removed visually from the graph, users can configure a filter to filter by Flag = False*

## Interpolations

***Note**: Interpolations are only available for those that have access to Advanced Analysis.*

### Add an Interpolation

1. In the editing sidebar of a view other than the one in which the regression was originally created, scroll to the bottom and click the **+** next to **Transformations**
   - **Note**: Ensure you are working in a view separate from the one where the regression was originally created
2. Select **Calculate interpolation** from the menu
3. In the modal:
   - Choose the regression model to use
   - Select the input column from the view containing unknown values
   - Choose whether the input values should serve as X to predict Y or the reverse
   - Optionally, select a column to group interpolations by a Series variable
4. Click **Submit**

![](https://help.benchling.com/hc/article_attachments/36096515939981)

After the interpolation is complete, a new column named **Prediction** will appear on the rightmost side of the input table, containing the interpolated values.

![](https://help.benchling.com/hc/article_attachments/36096515942285)

The interpolation step will be represented as a chip in the list of applied transformations and can be modified by clicking the chip.

![](https://help.benchling.com/hc/article_attachments/36096496978829)

Promote the view with the interpolation to a table to add interpolated values to charts or other tables as needed.

## Analysis Filters

Users can add filters to Analysis Tables and Analysis Views. There is a 1:1 relationship between a filter and a column in an Analysis Table or Analysis View. That means a column can only have one filter associated with it, but there can be multiple conditions associated with that filter. An Analysis View will inherit any filters applied to its parent Table, and can have additional filters applied at the View level.

If you would like to apply certain filters to multiple columns, you will need to apply separate filters to each column. Filters are applied to the Analysis Table or Analysis View in the order that they are listed. To confirm the order in which filters and transforms are applied to your Analysis Tables and Views, please click the ‘View flowchart’ button in the top right corner of your Analysis.

#### Filter Conditions

Filter conditions define the criteria used in a filter to determine which data is displayed or hidden. Multiple filter conditions can be applied to a filter.

If you would like to apply certain filter conditions to multiple columns, you will need to apply separate filters with those conditions to each column.

**The Analysis tool supports the following conditions for filters:**

- Text Column “TC” filter options
  - TC **is null**
  - TC **is not null**
  - TC **equals** text
  - TC **does not equal** text
  - TC **contains** text
  - TC **does not contain** text
  - TC **starts with** text
  - TC **does not start with** text
  - TC **ends with** text
  - TC **does not end with** text

- Number Column “NC” filter options:
  - NC **is null**
  - NC **is not null**
  - NC **equals** #
  - NC **does not equal** #
  - NC **is less than** #
  - NC **is more than** #
  - NC **is at most** #
  - NC **is at least** #

**Note:** if you created an Analysis Table via csv upload, your number columns might appear as text columns. Create an Analysis View, then use the “Convert column formats” transformation to convert the column from text to an integer or decimal format. Then you can apply the number-based filter options!

### Add Filters and Filter Conditions

Filters are applied to an Analysis Table or Analysis View in the order they are listed. To add a filter or filter conditions to an Analysis Table:

1. Under the table title, click the blue **+ Add filter** text
2. Use the dropdown to select the column to which you would like to apply the filter and select your filter conditions.
   - **Note**: each filter can only designate a single column, you can use And/Or logic to set multiple conditions for that filter for that column, which will be the only filter you can apply to that view for that column
3. To add additional filter conditions to the filter, click the blue **+ Add conditions** button in the filter configuration modal and configure the filter condition
4. Click the **Apply** button

![Screenshot 2025-05-01 at 10.50.31 AM.png](https://help.benchling.com/hc/article_attachments/36275865778445)

### Edit a filter or filter conditions

1. Click into the desired filter listed under the Analysis Table title
2. Modify the filter and filter conditions as needed
3. Click the **Apply** button to save changes

### Remove a filter or filter conditions

1. To remove an entire filter, click the **x button** listed at the end of the filter
2. To remove one or more conditions of the filter, click into the filter and click the **trash can** icon next to the filter condition(s) you wish to remove
3. Click **Apply**

## Capture data from a completed Analysis

There are several ways that you can capture data from a completed Analysis. The methods are listed in the section below.

### Copy and download Analysis View data

Data can be copied or exported as a .csv from either an Analysis View or Analysis Table.

Instructions for Analysis Views:

1. Select the Analysis View that you want to copy or download
2. Click the **... button** in the top right corner of the table to show additional options
3. Select “Copy to clipboard” to copy up to the **first 1,000 rows**
4. Select “Download as CSV” to download a CSV file of the Analysis View

### Create outputs from an Analysis table

There are multiple ways to create an output from an Analysis table. Each of these start by clicking the **Create outputs**button on the Analysis. This opens a Output from analysis screen that lets you select different Analysis tables and define what type of output you'd like to create as well as to see a preview of your output at the right. Once you create an output of a chart or table, that Analysis view (and any upstream tables that are part of that view) will lock.

![](https://help.benchling.com/hc/article_attachments/36096496987277)

### Save analysis tables to Results schemas

Since Results schemas are predefined with a certain set of columns, it could be useful to save an analysis table into a Results schema so the data can be queried together with other data in the schema. To do this from a Benchling Analysis Table, follow the following steps:

1. From the Outputs menu, use the checkboxes at the left to select which tables or charts you'd like to save
2. Use the dropdown next to the selected tables to select the **As result**option
3. In the modal that opens up, choose which Results schema you're saving the data to
4. Map the columns of the table to the fields of the Results schema using the drop-down options
5. Select an Entry or Worksheet to save it to, then click **Create outputs**

### Embed charts in Notebook entries

You can embed charts and tables directly in Notebook entries. This allows you to contextualize the visual outcome(s) of an experiment with the process and other information associated with it in a single location.

1. From the Outputs menu, use the checkboxes at the left to select the charts you'd like to embed
2. Use the dropdown next to the selected charts to select the **As chart** option
3. Select the notebook entry you wish to send the items to. Search for it by name in the **Entry** box
4. In order to embed these items, you'll need to create one or more new Sections in the entry
   - Create as many sections as you like with the **+ Add Section**button. Click the six dot ![](https://help.benchling.com/hc/article_attachments/36096496989965) icon to drag and drop the items to be embedded into the sections you prefer
5. Click **Create Outputs**

The charts and tables you selected are now in the notebook entry! Once this is done, the data sources and analysis steps that lead to the creation of the items you embedded will be locked, so that the view in the Analysis is the same as what is embedded in the Notebook.

![](https://help.benchling.com/hc/article_attachments/36096515960589)

If you do not want to directly embed the chart in the Notebook entry, you can @-mention an Analysis. Type "@" to bring up the search and begin typing the name of an analysis. Click on it to create the tag.

Once this is done, the link will appear in the Outputs section in the left sidebar of the associated analysis with a timestamp. This allows traceability of when Analyses are linked to notebook entries.

For customers with access to [Bioprocess](https://help.benchling.com/hc/en-us/articles/26951387803661), you can also embed charts and outputs in Worksheets. The process is similar how you embed a chart into a Notebook, however for Worksheets the chart will be embedded into a new post-run Step.

### Create Datasets

Datasets are another form of output that you can create. They are tabular semi-structured data objects that are searchable and live in folders rather than within schemas. [Learn more about Datasets in this article](https://help.benchling.com/hc/en-us/articles/35405512657037-What-is-a-Dataset).

1. From the Outputs menu, use the checkboxes at the left to select the tables you'd like to make into Datasets
2. Use the dropdown next to the selected charts to select the **As Dataset** option
3. Select the notebook entry you wish to send the items to. Search for it by name in the **Entry** box
4. In order to embed these items, you'll need to create one or more new Sections in the entry
5. Click **Create Outputs**

## Repeat an Analysis in Benchling Insights

In Benchling Analysis, you can reuse data transformations and chart configurations on new sets of data to repeat analyses, saving time and ensuring consistency. This can be done through copying an existing analysis, replacing data sources, or applying saved templates. the sections below will walk you through each method, enabling you to efficiently rerun your analyses with updated data.

### Copy and Replace an Analysis

Duplicating an existing analysis is useful if you want to reuse the entire setup, including data transformations and visualizations, but with new or updated data sources or if you only have access to Standard Analysis. To copy an Analysis follow the steps below:

1. Open the analysis you want to copy
2. Click the **... menu** at the top-right corner of the analysis
3. Select **Duplicate**
4. In the pop-up window, choose a new location and name for the copied analysis
5. The new analysis will be named **“Copy of [Original Analysis Name]”** and will be identical to the original, but independent of it  
     
   ![Screenshot 2025-05-01 at 11.32.43 AM.png](https://help.benchling.com/hc/article_attachments/36275865787661)
6. Once you've duplicated the Analysis, if you'd like to replace the original data tables with new data open the copied Analysis and go to the table that you want to replace
7. Click the **... menu** next to the analysis table
8. Select **Replace Table**
9. Choose the method to bring in the new data (e.g., CSV upload, Registry, Notebook entry, or other sources)
10. The new data will be used in place of the previous table, and all associated transformations will be automatically rerun on the new data

![Screenshot 2025-05-01 at 11.34.43 AM.png](https://help.benchling.com/hc/article_attachments/36275865790093)

## Analysis Templates

For more standardized workflows, saving an analysis as a template allows you to apply the same transformations and visualizations to different data repeatedly.

***Note:**Analysis templates are only available for those that have access to Advanced Analysis.*

To save an Analysis as a template, follow the steps below:

1. Configure your analysis with the necessary transformations and visualizations
2. Click the **... menu** at the top-right corner of the analysis
3. Select **Save as Analysis Template**  
     
   **![Screenshot 2025-05-01 at 11.38.34 AM.png](https://help.benchling.com/hc/article_attachments/36275838589325)**
4. Name your template and use the dropdown to save it to a **Template Collection**
5. For each Analysis Table, choose whether it’s variable (for new data each time) or static (using the original data)
   - **Variable**: Allows you to select new data each time the template is applied, ideal for scenarios where data changes frequently.
   - **Static**: Uses the original data tables from the template, which is useful for consistent data structures like plate maps or acceptance criteria limits.
6. Use the checkboxes to select which tables to export
7. Click the **Create**button
8. To apply an Analysis Template, open a new Analysis and use the **+ button** to bring in all the tables you need
9. Once you have all your tables populated, click on the **... menu** and select **Apply Analysis Template**  
     
   **![Screenshot 2025-05-01 at 11.42.23 AM.png](https://help.benchling.com/hc/article_attachments/36275838591501)**
10. Use the dropdown to select the saved template from your Template Collection
11. Map your data to the template and click **Save**
12. Once you've finished mapping, click the **Apply** button to run the saved transformations and views on the new data

Once an analysis template is created, it can no longer be changed. So you can be sure that any analysis that used that template followed an identical set of steps. Additionally, if you templatize the creation of outputs, all of those tables involved in the creation of the output will be locked once you apply the template.

**Notes and Limitations**

- If you apply an Analysis Template to the automatically generated Bioprocess data tables for a given Recipe Template, the tables will be predictably structured with the same table types and column names every time.
- Templates cannot be edited after creation.
- If you apply an Analysis Template to different data tables, you'll need to map the new data to the template's inputs. The data doesn't have to match exactly, but column mapping is required. Analysis Templates cannot be run until all expected columns for all input tables are mapped.
- Analysis Templates are limited to 500 steps.

## Permissions for Creating Advanced Analysis Templates

Advanced Analysis templates follow the same permission structure as Notebook entry templates. Permissions are managed through **template collections**, which control who can create and access templates across Benchling.

**Who Can Create Analysis Templates?**

Users who have permission to create Notebook entry templates within a template collection also have permission to create Advanced Analysis templates in that same collection.

**Note:** There is no separate permission specifically for Advanced Analysis template creation.

## Custom Code

Custom Code is a step type in the Automation Designer that lets you embed Python scripts directly into your Analysis workflows. It's designed for scenarios where Benchling's built-in no-code transformations aren't enough — such as parsing unsupported instrument file formats, performing advanced statistical calculations, or building specialized visualizations. Custom Code accepts files and datasets as inputs and returns datasets, files, or charts as outputs, all within the same Analysis flowchart.

![](https://help.benchling.com/hc/article_attachments/46068367618957)

## Understand how Custom Code works

Custom Code runs as a step in the Automation Designer flowchart. Each step accepts one or more inputs — files, datasets, or a mix of both — and returns one or more outputs using the IOData class. Outputs can be pandas DataFrames (returned as datasets), BytesIO objects (returned as files), or figures (returned as charts).

The entry point for every Custom Code step is the custom\_code function:

```
def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
```

All outputs must be returned as a list of IOData objects, even when returning a single output:

```
return [IOData(name="MY_OUTPUT", data=result_dataframe)]
```

The IOData class has two attributes:

- name: A string identifier for the input or output object
- data: One of BytesIO (for files), a pandas DataFrame, or a Plotly graph\_objects Figure

When multiple inputs are connected to a single Custom Code step, they arrive in the order the connections were made. You can reference them by index or by name. Mixed input types are supported — you can connect both datasets and files to the same step.

When an error occurs during execution, the editor displays the line number and exception message to help you identify and fix the issue.

If Custom Code is saved in an Analysis template or applied as an Analysis output, the Custom Code step is locked and cannot be edited.

## Create a Custom Code step

To add a Custom Code step to your Analysis:

1. Open your Analysis and click the **Flowchart Editor** button in the top-right corner
2. Locate the dataset or file step you want to use as input — this can be any step that outputs a dataset or file, including prior transformation steps or import steps
3. Hover over the output step, click it, and select **Custom Code** from the step type menu
4. If you want to pass multiple inputs into the step, draw additional connections from each input step to the same Custom Code step
5. Write or paste your Python script inside the custom\_code function in the code editor — the editor opens with default imports pre-loaded

   ![](https://help.benchling.com/hc/article_attachments/46068415401485)
6. Click **Save** to save your script, then run the step

![Screen Recording 2026-05-12 at 12.19.55 PM.gif](https://help.benchling.com/hc/article_attachments/46068367621645)

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

![File Parsing.gif](https://help.benchling.com/hc/article_attachments/46068415402125)

### Transform, merge, and calculate data

Apply transformations, merge or join datasets, and perform calculations that go beyond the built-in transformation steps available in Analysis.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select **Custom Code**
2. Write your transformation logic inside the custom\_code function
3. Return the modified data as a list of IOData instances
4. Click **Save**

![Statistics.gif](https://help.benchling.com/hc/article_attachments/46068415403533)

### Create advanced visualizations

Build custom charts and figures using Plotly graph objects. This is useful for specialized visualizations such as chromatograms, heatmaps with custom annotations, or multi-panel figures that aren't available through the standard Analysis chart types.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select **Custom Code**
2. Write your code to construct a Plotly Figure using plotly.graph\_objects.Figure
3. Return the figure as a list of IOData instances
4. Click **Save**

![Advanced Visualizations.gif](https://help.benchling.com/hc/article_attachments/46068415404685)

### Generate new output files

Create new files as outputs — such as formatted CSV exports, instrument instruction lists, or other file types — using BytesIO.

1. In the Flowchart Editor, add a new step from a dataset and/or file step and select **Custom Code**
2. Write your code to construct a BytesIO file object
3. Return the file as a list of IOData instances
4. Click **Save**

![Generate Output Files.gif](https://help.benchling.com/hc/article_attachments/46068415405453)

## Understand supported Python packages

Custom Code runs in a managed Benchling environment with a curated set of pre-installed Python packages. You can import any of the packages below directly in your code. You cannot install additional libraries via pip.

| Package | Version | Description |
| --- | --- | --- |
| allotropy | 0.1.105 | Python library by Benchling for converting instrument data into the Allotrope Simple Model (ASM) |
| biopython | 1.86 | Biological sequence analysis |
| lmfit | 1.3.4 | Non-linear curve fitting |
| matplotlib | 3.10.3 | Charting and visualizations |
| numpy | 2.2.4 | Numerical computing |
| openpyxl | 3.1.5 | Excel file reading/writing |
| pandas | 2.2.3 | Data manipulation and analysis |
| plotly | 5.22.0 | Interactive charting and visualizations |
| pyarrow | 19.0.1 | Apache Arrow integration |
| pydantic | 1.10.21 | Data validation and settings |
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

Repository: <https://github.com/benchling/app-examples-python/tree/main/examples/custom-code-AD>

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

#### Was this article helpful?

Yes
No

Have more questions? [Submit a request](https://help.benchling.com/hc/en-us/requests/new)