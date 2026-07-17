/** Whether sidebar chrome (search/tree/footer) should be inert behind a modal dialog. */

export function sidebarChromeInert(dialogOpen: boolean): boolean {
  return dialogOpen
}
