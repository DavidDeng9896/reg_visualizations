/** Native CONFIGURE field select helpers (Round 17 EP slim pilot). */

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
