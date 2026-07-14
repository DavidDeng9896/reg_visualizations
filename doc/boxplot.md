# Box Plots

> 来源：[LabKey Documentation - Box Plots](https://www.labkey.org/Documentation/wiki-page.view?name=boxplot)

---

## 目录

  - [Create a Box Plot](#create-a-box-plot)
  - [Box Plot Customizations](#box-plot-customizations)
  - [Change Layout](#change-layout)
  - [Save and Export Plots](#save-and-export-plots)
  - [Export Chart](#export-chart)
  - [Rules Used to Render the Box Plot](#rules-used-to-render-the-box-plot)
  - [Developer Extensions](#developer-extensions)
  - [Video](#video)
  - [Related Topics](#related-topics)

A box plot, or box-and-whisker plot, is a graphical representation of the range of variability for a measurement. The central quartiles (25% to 75% of the full range of values) are shown as a box, and there are line extensions ('whiskers') representing the outer quartiles. Outlying values are typically shown as individual points.

- [Create a Box Plot](#create)
- [Box Plot Customizations](#custom)
- [Change Layout](#layout)
- [Save and Export Plots](#save)
- [Rules Used to Render the Box Plot](#rules)
- [Developer Extensions](#dev)

### Create a Box Plot

- Navigate to the data grid you want to visualize.
- Select **(Charts) > Create Chart** to open the editor. Click **Box**.
- The columns eligible for charting from your current grid view are listed.
 - If you want to plot using a column that is not visible here, return to the data grid and use **(Grid Views) > Customize Grid** to add it.
 - If your server is configured to [restrict charting to columns marked as "measures" or "dimensions"](https://www.labkey.org/Documentation/wiki-page.view?name=chartTrouble), you will only be able to use columns with those designations.
- Select the column to use on the **Y axis** and drag it to the **Y Axis** box.

![createBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=createBox.PNG)

Only the Y Axis field is required to create a basic single-box plot, but there are additional options.

- Select another column and choose how to use this column:
 - **X Axis Categories**: Create a plot with multiple boxes along the x-axis, one per value in the selected column.
 - **Color**: Display values in the plot with a different color for each column value. Useful when displaying all points or displaying outliers as points.
 - **Shape**: Change the shape of points based on the value in the selected column. 5 different shapes are available.
- Here we make it the X-Axis Category and click **Apply** to see a box plot for each cohort.

![boxPlotBasic.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=boxPlotBasic.PNG)

- Click **View Data** to see, filter, or export the underlying data.
- Click **View Chart** to return. If you applied any filters, you would see them immediately reflected in the plot.

### Box Plot Customizations

- Customize your visualization using the **Chart Type** and **Chart Layout** links in the upper right.
- **Chart Type** reopens the creation dialog allowing you to:
 - Change any column selection (hover and click the X to delete the current election). You can also drag and drop columns between selection boxes to change positions.
 - Add new columns, such as to group points by color and shape. Don't forget to change the layout as described below to fully see these changes.
 - Click **Apply** to see your changes and switch dialogs.
- **Chart Layout** offers options to change the look of your chart, including these changes to make our color and shape distinctions clearer:
 - Set **Show Points** to **All** *AND*:
 - Check **Jitter Points** to spread the points out horizontally.
 - Click **Apply** to update the chart with the selected changes.
- Below we see a plot with all data shown as points, jittered to spread them out and show the different colors and shapes of points. Notice the legend in the upper right. Hover over any point for details about it.
- You may also notice that the outline of the overall box plot has not changed from the basic fill version shown above. This enhanced chart is giving additional information without losing the big picture of the basic plot.

![boxPlotMore.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=boxPlotMore.PNG)

### Change Layout

- **Chart Layout** offers the ability to change the look and feel of your chart.

![lookFeelBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=lookFeelBox.PNG)

There are 4 tabs:

- **General**:
 - Provide a **Title** to show above your plot. By default, the dataset name is used, and you can return to this default at an time by clicking the refresh icon.
 - Provide a **Subtitle** to show below the title.
 - Specify the width and height.
 - Elect whether to display single points for all data, only for outliers, or not at all.
 - Check the box to jitter points.
 - You can also customize the colors, opacity, width and fill for points or lines.
 - **Margins (px)**: If the default chart margins cause axis labels to overlap, or you want to adjust them for other reasons, you can specify them explicitly in pixels. Specify any one or all of the top, bottom, left, and right margins. See an example [here](https://www.labkey.org/Documentation/wiki-page.view?name=lineplot#margins).
- **X-Axis**:
 - **Label**: Change the display label for the X axis (notice this does not change which column provides the data). Click the **(Refresh)** icon to restore the original label based on the column name.
- **Y-Axis**:
 - **Label**: Change the display label for the Y axis as for the X axis.
 - **Scale Type**: Choose log or linear scale for the Y axis.
 - **Range**: Let the range be determined automatically or specify a manual range (min/max values) for the Y axis.
- **[Developer](#dev)**: *Only available to users that have the "Platform Developers" site role.*
 - A developer can provide a JavaScript function that will be called when a data point in the chart is clicked.
 - Provide **Source** and click **Enable** to enable it.
 - Click the **Help** tab for more information on the parameters available to such a function.
 - Learn more [below](#dev).

Click **Apply** to update the chart with the selected changes.

### Save and Export Plots

- When your chart is ready, click **Save**.

![saveBox.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=saveBox.PNG)

- Name the plot, enter a description (optional), and choose whether to make it viewable by others. You will also see the default thumbnail which has been auto-generated. You can elect **None**. As with other charts, you can later [attach a custom thumbnail](https://www.labkey.org/Documentation/wiki-page.view?name=thumbnails) if desired.

Once you have created a box plot, it will appear in the [Data Browser](https://www.labkey.org/Documentation/wiki-page.view?name=dataBrowser) and on the (Charts) menu for the source dataset. You can manage metadata about it as described in [Manage Data Views](https://www.labkey.org/Documentation/wiki-page.view?name=manageViews).

### Export Chart

Hover over the chart to reveal export option buttons in the upper right corner:

![chartExport.PNG](https://www.labkey.org/Documentation/wiki-download.view?entityId=32d6eba7-ed56-1034-b734-fe851e088836&name=chartExport.PNG)

Export your completed chart by clicking an option:

- **PDF**: generate a PDF file.
- **PNG**: create a PNG image.
- **Script**: pop up a window displaying the JavaScript for the chart which you can then copy and paste into a wiki. See [Tutorial: Visualizations in JavaScript](https://www.labkey.org/Documentation/wiki-page.view?name=exportChartJS) for a tutorial on this feature.

### Rules Used to Render the Box Plot

The following rules are used to render the box plot. Hover over a box to see a pop-up.

- Min/Max are the highest and lowest data points still within 1.5 of the interquartile range.
- Q1 marks the lower quartile boundary.
- Q2 marks the median.
- Q3 marks the upper quartile boundary.
- Values outside of the range are considered outliers and are rendered as dots by default. The options and grouping menus offer you control of whether and how single dots are shown.

### Developer Extensions

Developers (users with the ["Platform Developers" role](https://www.labkey.org/Documentation/wiki-page.view?name=devRoles)) can extend plots that display points to run a JavaScript function when a point is clicked. For example, it might show a widget of additional information about the specific data that point represents. Supported for box plots, scatter plots, line plots, and time charts. To use this function, open the **Chart Layout** editor and click the **Developer** tab. Provide **Source** in the window provided, click **Enable**, then click **Save** to close the panel. Click the **Help** tab to see the following information on the parameters available to such a function. Your code should define a single function to be called when a data point in the chart is clicked. The function will be called with the following parameters:

- **data**: the set of data values for the selected data point. Example: { YAxisMeasure: {displayValue: "250", value: 250}, XAxisMeasure: {displayValue: "0.45", value: 0.45000}, ColorMeasure: {value: "Color Value 1"}, PointMeasure: {value: "Point Value 1"} }
- **measureInfo**: the schema name, query name, and measure names selected for the plot. Example: { schemaName: "study", queryName: "Dataset1", yAxis: "YAxisMeasure", xAxis: "XAxisMeasure", colorName: "ColorMeasure", pointName: "PointMeasure" }
- **clickEvent**: information from the browser about the click event (i.e. target, position, etc.)

### Video

- [Video Overview: Using the Chart Designer](https://youtu.be/cGYKibglIXw) *(16.3)*

### Related Topics

- [Bar Charts](https://www.labkey.org/Documentation/wiki-page.view?name=barchart)
- [Line Plots](https://www.labkey.org/Documentation/wiki-page.view?name=lineplot)
- [Pie Charts](https://www.labkey.org/Documentation/wiki-page.view?name=piechart)
- [Scatter Plots](https://www.labkey.org/Documentation/wiki-page.view?name=scatterplot)
- [Time Charts](https://www.labkey.org/Documentation/wiki-page.view?name=timeChart)
- [Quick Charts](https://www.labkey.org/Documentation/wiki-page.view?name=quickchart)
