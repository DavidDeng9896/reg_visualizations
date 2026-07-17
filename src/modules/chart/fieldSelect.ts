/** Native CONFIGURE field select helpers (Round 17+ EP slim). */

/** Stable id for CONFIGURE required-slot alert; wire via aria-describedby. */
export const CFG_MISS_ALERT_ID = 'chart-cfg-miss'

export function columnSelectLabel(col: { title: string; dataType: string }): string {
  return `${col.title} (${col.dataType})`
}

/** Map native `<select>` empty option to undefined for clearable chart fields. */
export function fromNativeSelectValue(value: string): string | undefined {
  return value === '' ? undefined : value
}

/** Bind optional chart fields to native `<select>` (empty string = cleared). */
export function toNativeSelectValue(value: string | undefined): string {
  return value ?? ''
}

/** When required slots are missing, point controls at the cfg-miss alert. */
export function cfgMissDescribedBy(hasMiss: boolean): string | undefined {
  return hasMiss ? CFG_MISS_ALERT_ID : undefined
}

/** Read selected option values from a native (multi-)select. */
export function selectedOptionValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions, (opt) => opt.value)
}
