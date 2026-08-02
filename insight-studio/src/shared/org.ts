/**
 * 组织维度 mock 数据：项目与部门。
 * 后续接入真实主数据时替换为远端加载，调用方只依赖本模块的接口。
 */

export interface OrgProject {
  /** 项目代码（如 MD-AB023）。 */
  code: string
  name: string
}

export interface OrgDepartment {
  id: string
  name: string
}

export const PROJECTS: OrgProject[] = [
  { code: 'MD-AB023', name: '抗体蛋白纯化' },
  { code: 'MD-AB101', name: '荧光蛋白筛选' },
  { code: 'MD-AD007', name: 'ADMT 评估' },
  { code: 'MD-FL112', name: 'FLIPR 高通量' },
  { code: 'MD-BP310', name: 'Bioprocess Media' },
]

export const DEPARTMENTS: OrgDepartment[] = [
  { id: 'ab-disc', name: '抗体发现部' },
  { id: 'purify-1', name: '纯化一部' },
  { id: 'bio-ana', name: '生物分析部' },
  { id: 'proc-dev', name: '工艺开发部' },
]

/** 展示用项目标签：MD-AB023 · 抗体蛋白纯化；空 → 未分配项目。 */
export function projectLabel(code: string | undefined): string {
  if (!code) return '未分配项目'
  const p = PROJECTS.find((x) => x.code === code)
  return p ? `${p.code} · ${p.name}` : code
}

/** 展示用部门标签；空 → 未分配部门。 */
export function departmentLabel(id: string | undefined): string {
  if (!id) return '未分配部门'
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id
}
