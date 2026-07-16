import type { AnalysisTable } from '@/shared/types/analysis'
import { uid } from '@/shared/utils/id'
import { withRowIds } from '@/shared/utils/schema'

/** Built-in demo dataset for one-click acceptance */
export function createDemoTable(): AnalysisTable {
  const rows = withRowIds([
    { compound: 'CmpA', dose: 0.1, response: 12, plate: 'P1', well_row: 'A', well_col: 1 },
    { compound: 'CmpA', dose: 0.3, response: 28, plate: 'P1', well_row: 'A', well_col: 2 },
    { compound: 'CmpA', dose: 1, response: 55, plate: 'P1', well_row: 'A', well_col: 3 },
    { compound: 'CmpA', dose: 3, response: 78, plate: 'P1', well_row: 'A', well_col: 4 },
    { compound: 'CmpA', dose: 10, response: 92, plate: 'P1', well_row: 'A', well_col: 5 },
    { compound: 'CmpB', dose: 0.1, response: 8, plate: 'P1', well_row: 'B', well_col: 1 },
    { compound: 'CmpB', dose: 0.3, response: 18, plate: 'P1', well_row: 'B', well_col: 2 },
    { compound: 'CmpB', dose: 1, response: 40, plate: 'P1', well_row: 'B', well_col: 3 },
    { compound: 'CmpB', dose: 3, response: 66, plate: 'P1', well_row: 'B', well_col: 4 },
    { compound: 'CmpB', dose: 10, response: 85, plate: 'P1', well_row: 'B', well_col: 5 },
    { compound: 'CmpC', dose: 0.1, response: 5, plate: 'P2', well_row: 'C', well_col: 1 },
    { compound: 'CmpC', dose: 0.3, response: 15, plate: 'P2', well_row: 'C', well_col: 2 },
    { compound: 'CmpC', dose: 1, response: 35, plate: 'P2', well_row: 'C', well_col: 3 },
    { compound: 'CmpC', dose: 3, response: 58, plate: 'P2', well_row: 'C', well_col: 4 },
    { compound: 'CmpC', dose: 10, response: 80, plate: 'P2', well_row: 'C', well_col: 5 },
  ])

  return {
    id: uid('tbl'),
    name: 'demo_dose_response.csv',
    source: { type: 'csv', fileName: 'demo_dose_response.csv' },
    columns: [
      { field: 'compound', title: 'compound', dataType: 'string' },
      { field: 'dose', title: 'dose', dataType: 'number' },
      { field: 'response', title: 'response', dataType: 'number' },
      { field: 'plate', title: 'plate', dataType: 'string' },
      { field: 'well_row', title: 'well_row', dataType: 'string' },
      { field: 'well_col', title: 'well_col', dataType: 'number' },
    ],
    rows,
    tableFilters: [],
    views: [],
  }
}

export const DEMO_CSV_TEXT = `compound,dose,response,plate,well_row,well_col
CmpA,0.1,12,P1,A,1
CmpA,0.3,28,P1,A,2
CmpA,1,55,P1,A,3
CmpA,3,78,P1,A,4
CmpA,10,92,P1,A,5
CmpB,0.1,8,P1,B,1
CmpB,0.3,18,P1,B,2
CmpB,1,40,P1,B,3
CmpB,3,66,P1,B,4
CmpB,10,85,P1,B,5
CmpC,0.1,5,P2,C,1
CmpC,0.3,15,P2,C,2
CmpC,1,35,P2,C,3
CmpC,3,58,P2,C,4
CmpC,10,80,P2,C,5
`
