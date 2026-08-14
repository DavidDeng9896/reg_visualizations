import { uuid } from '../../shared/id'

/** 外部数据库连接配置（本地持久化；密码仅存浏览器）。 */
export type SqlDialect = 'postgres' | 'mysql' | 'mariadb'

export interface DbConnectionProfile {
  id: string
  name: string
  dialect: SqlDialect
  host: string
  port: number
  database: string
  user: string
  /** 本地保存的密码；不会上传到 Analysis 文档。 */
  password: string
  ssl: boolean
  updatedAt: string
}

export const DEFAULT_PORTS: Record<SqlDialect, number> = {
  postgres: 5432,
  mysql: 3306,
  mariadb: 3306,
}

export function defaultProfile(partial?: Partial<DbConnectionProfile>): DbConnectionProfile {
  const dialect = partial?.dialect ?? 'postgres'
  return {
    id: partial?.id ?? uuid(),
    name: partial?.name ?? '我的数据库',
    dialect,
    host: partial?.host ?? '127.0.0.1',
    port: partial?.port ?? DEFAULT_PORTS[dialect],
    database: partial?.database ?? '',
    user: partial?.user ?? '',
    password: partial?.password ?? '',
    ssl: partial?.ssl ?? false,
    updatedAt: partial?.updatedAt ?? new Date().toISOString(),
  }
}
