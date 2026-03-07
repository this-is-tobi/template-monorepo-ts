import { createAuditLogger, createInMemoryAuditRepository } from './logger.js'

describe('audit logger', () => {
  it('should log an entry', async () => {
    const repo = createInMemoryAuditRepository()
    const audit = createAuditLogger({ repository: repo })

    const entry = await audit.log({
      actorId: 'user-1',
      action: 'create',
      resourceType: 'project',
      resourceId: 'proj-1',
      details: { name: 'My Project' },
    })

    expect(entry.id).toBeDefined()
    expect(entry.actorId).toBe('user-1')
    expect(entry.action).toBe('create')
    expect(entry.resourceType).toBe('project')
    expect(entry.resourceId).toBe('proj-1')
    expect(entry.createdAt).toBeDefined()
  })

  it('should logAsync without blocking', () => {
    const repo = createInMemoryAuditRepository()
    const audit = createAuditLogger({ repository: repo })

    // Should not throw
    audit.logAsync({
      actorId: 'user-1',
      action: 'delete',
      resourceType: 'user',
      resourceId: 'user-2',
    })

    // Give event loop a tick
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(repo.entries).toHaveLength(1)
        resolve()
      }, 10)
    })
  })

  it('should log to console.error when logAsync write fails', async () => {
    const repo = createInMemoryAuditRepository()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(repo, 'create').mockRejectedValueOnce(new Error('DB write failed'))

    const audit = createAuditLogger({ repository: repo })
    audit.logAsync({ actorId: 'u1', action: 'create', resourceType: 'org' })

    await new Promise<void>(resolve => setTimeout(resolve, 20))

    expect(consoleSpy).toHaveBeenCalledWith(
      '[audit] failed to write audit entry:',
      expect.any(Error),
    )
    consoleSpy.mockRestore()
  })
})

describe('in-memory audit repository', () => {
  it('should store and retrieve entries', async () => {
    const repo = createInMemoryAuditRepository()

    await repo.create({ actorId: 'user-1', action: 'create', resourceType: 'org' })
    await repo.create({ actorId: 'user-2', action: 'update', resourceType: 'project', resourceId: 'p1' })
    await repo.create({ actorId: 'user-1', action: 'delete', resourceType: 'org', resourceId: 'o1' })

    const all = await repo.query()
    expect(all).toHaveLength(3)
  })

  it('should filter by actorId', async () => {
    const repo = createInMemoryAuditRepository()
    await repo.create({ actorId: 'user-1', action: 'create', resourceType: 'org' })
    await repo.create({ actorId: 'user-2', action: 'create', resourceType: 'org' })

    const filtered = await repo.query({ actorId: 'user-1' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.actorId).toBe('user-1')
  })

  it('should filter by resourceType', async () => {
    const repo = createInMemoryAuditRepository()
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org' })
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'project' })

    const filtered = await repo.query({ resourceType: 'project' })
    expect(filtered).toHaveLength(1)
  })

  it('should filter by resourceId', async () => {
    const repo = createInMemoryAuditRepository()
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org', resourceId: 'o1' })
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org', resourceId: 'o2' })

    const filtered = await repo.query({ resourceId: 'o1' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.resourceId).toBe('o1')
  })

  it('should filter by action', async () => {
    const repo = createInMemoryAuditRepository()
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org' })
    await repo.create({ actorId: 'u1', action: 'delete', resourceType: 'org' })
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org' })

    const filtered = await repo.query({ action: 'delete' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.action).toBe('delete')
  })

  it('should support pagination', async () => {
    const repo = createInMemoryAuditRepository()
    for (let i = 0; i < 10; i++) {
      await repo.create({ actorId: 'u1', action: `action-${i}`, resourceType: 'test' })
    }

    const page1 = await repo.query({ limit: 3, offset: 0 })
    expect(page1).toHaveLength(3)

    const page2 = await repo.query({ limit: 3, offset: 3 })
    expect(page2).toHaveLength(3)
    expect(page2[0]!.action).toBe('action-3')
  })

  it('should count entries', async () => {
    const repo = createInMemoryAuditRepository()
    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org' })
    await repo.create({ actorId: 'u2', action: 'create', resourceType: 'org' })

    expect(await repo.count()).toBe(2)
    expect(await repo.count({ actorId: 'u1' })).toBe(1)
  })

  it('should count with date filters', async () => {
    const repo = createInMemoryAuditRepository()
    const past = new Date(Date.now() - 10_000).toISOString()

    await repo.create({ actorId: 'u1', action: 'create', resourceType: 'org' })
    await repo.create({ actorId: 'u1', action: 'update', resourceType: 'org' })

    // Both entries were created after `past`
    expect(await repo.count({ after: past })).toBe(2)
    // Both entries were created before `future`
    const future = new Date(Date.now() + 10_000).toISOString()
    expect(await repo.count({ before: future })).toBe(2)
    // None before `past`
    expect(await repo.count({ before: past })).toBe(0)
    // None after a far-future cutoff (exercises the false branch of the > after filter)
    const farFuture = new Date(Date.now() + 1_000_000).toISOString()
    expect(await repo.count({ after: farFuture })).toBe(0)
  })
})
