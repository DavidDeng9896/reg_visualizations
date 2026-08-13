import { describe, expect, it } from 'vitest'
import { DEFAULT_PORTS, defaultProfile } from '../../../src/modules/table/dbConnectionTypes'

describe('dbConnectionTypes', () => {
  it('MariaDB 默认端口为 3306', () => {
    expect(DEFAULT_PORTS.mariadb).toBe(3306)
    const p = defaultProfile({ dialect: 'mariadb' })
    expect(p.dialect).toBe('mariadb')
    expect(p.port).toBe(3306)
  })
})
