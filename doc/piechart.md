# Pie Charts

> 来源：[LabKey Documentation - Pie Charts](https://www.labkey.org/Documentation/wiki-page.view?name=piechart)

---

## 目录

A pie chart shows the relative size of selected categories as different sized wedges of a circle or ring.

- [Create a Pie Chart](#create)
- [Pie Chart Customizations](#custom)
- [Change Layout](#layout)
- [Save and Export Charts](#save)



### Create a Pie Chart

- Navigate to the data grid you want to visualize.
- Select **(Charts) > Create Chart** to open the editor. Click **Pie**.
- The columns eligible for charting from your current grid view are listed.
- If you want to plot using a column that is not visible here, return to the data grid and use **(Grid Views) > Customize Grid** to add it.
- If your server is configured to [restrict charting to columns marked as "measures" or "dimensions"](https://www.labkey.org/Documentation/wiki-page.view?name=chartTrouble), you will only be able to use columns with those designations.
- Select the column to visualize and drag it to the **Categories** box.

createPie.png

- Click **Apply**. The size of the pie wedges will reflect the count of rows for each unique value in the column selected.

pieChartBasic.PNG

- Click **View Data** to see, filter, or export the underlying data.
- Click **View Chart** to return. If you applied any filters, you would see them immediately reflected in the chart.



### Pie Chart Customizations

- Customize your visualization using the **Chart Type** and **Chart Layout** links in the upper right.
- **Chart Type** reopens the creation dialog allowing you to:
- Change the **Categories** column selection.
- Note that you can also click another chart type on the left to switch how you visualize the data using the same selected columns when practical.
- Click **Apply** to update the chart with the selected changes.



### Change Layout

- **Chart Layout** offers the ability to change the look and feel of your chart.

lookFeelPie.PNG

- Customize any or all of the following options:
- Provide a **Title** to show above your chart. By default, the dataset name is used.
- Provide a **Subtitle**. By default, the categories column name is used. Note that changing this *label* does not change which column is used for wedge categories.
- Specify the width and height.
- Select a color palette. Options include Light, Dark, and Alternate. Mini squares showing the selected palette are displayed.
- Customizing the radii of the pie chart allows you to size the graph and if desired, include a hollow center space.
- Elect whether to show percentages within the wedges, the display color for them, and whether to hide those annotations when wedges are narrow. The default is to hide percentages when they are under 5%.
- Use the **Gradient %** slider and color to create a shaded look.
- Click **Apply** to update the chart with the selected changes.

pieChart2.PNG

### Save and Export Charts

- When your chart is ready, click **Save**.

savePie.PNG

- Name the chart, enter a description (optional), and choose whether to make it viewable by others. You will also see the default thumbnail which has been auto-generated, and can choose whether to use it. As with other charts, you can later [attach a custom thumbnail](https://www.labkey.org/Documentation/wiki-page.view?name=thumbnails) if desired.

Once you have created a pie chart, it will appear in the [Data Browser](https://www.labkey.org/Documentation/wiki-page.view?name=dataBrowser) and on the (Charts) menu for the source dataset. You can manage metadata about it as described in [Manage Data Views](https://www.labkey.org/Documentation/wiki-page.view?name=manageViews).

### Export Chart

Hover over the chart to reveal export option buttons in the upper right corner:

chartExport.PNG

Export your completed chart by clicking an option:

- **PDF**: generate a PDF file.
- **PNG**: create a PNG image.

