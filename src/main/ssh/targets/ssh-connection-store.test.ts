import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SshConnectionStore } from './ssh-connection-store'
import { createMockStore } from './testing/ssh-connection-store-test-fixture'
import type { SshTarget } from '../../../shared/ssh-types'

const { loadUserSshConfigMock, sshConfigHostsToTargetsMock } = vi.hoisted(() => ({
  loadUserSshConfigMock: vi.fn(),
  sshConfigHostsToTargetsMock: vi.fn()
}))

vi.mock('../config/ssh-config-parser', () => ({
  loadUserSshConfig: loadUserSshConfigMock,
  loadUserSshConfigWithText: () => {
    const hosts = loadUserSshConfigMock()
    return { hosts, text: JSON.stringify(hosts ?? []) }
  },
  sshConfigHostsToTargets: sshConfigHostsToTargetsMock
}))

describe('SshConnectionStore', () => {
  let mockStore: ReturnType<typeof createMockStore>
  let sshStore: SshConnectionStore

  beforeEach(() => {
    mockStore = createMockStore()
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the fixture implements the Store methods SshConnectionStore calls.
    sshStore = new SshConnectionStore(mockStore as never, { config: async () => null })
    loadUserSshConfigMock.mockReset()
    sshConfigHostsToTargetsMock.mockReset()
  })

  describe('importFromSshConfig', () => {
    function candidate(overrides: Partial<SshTarget> & { configHost: string }): SshTarget {
      return {
        id: `tmp-${overrides.configHost}`,
        label: overrides.configHost,
        host: `${overrides.configHost}.example.com`,
        port: 22,
        username: '',
        ...overrides
      }
    }

    it('keeps a case-only alias variant suppressed after the host was deleted', async () => {
      const added = sshStore.addTarget({
        label: 'Prod',
        configHost: 'Prod',
        host: 'prod.example.com',
        port: 22,
        username: 'me'
      })
      sshStore.removeTarget(added.id)
      loadUserSshConfigMock.mockReturnValue([{ host: 'prod' }])
      sshConfigHostsToTargetsMock.mockReturnValue([candidate({ configHost: 'prod' })])

      const result = (await sshStore.importFromSshConfig()).targets

      expect(result).toEqual([])
      expect(mockStore.addSshTarget).toHaveBeenCalledTimes(1)
    })

    it('lifts a tombstone stored under different casing when the host is re-added', () => {
      const added = sshStore.addTarget({
        label: 'Prod',
        configHost: 'Prod',
        host: 'prod.example.com',
        port: 22,
        username: 'me'
      })
      sshStore.removeTarget(added.id)
      sshStore.addTarget({
        label: 'prod',
        configHost: 'prod',
        host: 'prod.example.com',
        port: 22,
        username: 'me'
      })

      expect(sshStore.listSuppressedSshConfigAliases()).toEqual([])
    })

    it('skips only the automatic import when sshConfigAutoImport is off', async () => {
      mockStore.settings.sshConfigAutoImport = false
      loadUserSshConfigMock.mockReturnValue([{ host: 'build-1' }])
      sshConfigHostsToTargetsMock.mockReturnValue([candidate({ configHost: 'build-1' })])

      expect((await sshStore.importFromSshConfig({ automatic: true })).targets).toEqual([])
      expect(mockStore.addSshTarget).not.toHaveBeenCalled()

      const explicit = (await sshStore.importFromSshConfig()).targets
      expect(explicit.map((t) => t.configHost)).toEqual(['build-1'])
    })
  })

  describe('deleted config host tombstones', () => {
    function candidate(overrides: Partial<SshTarget> & { configHost: string }): SshTarget {
      return {
        id: `tmp-${overrides.configHost}`,
        label: overrides.configHost,
        host: `${overrides.configHost}.example.com`,
        port: 22,
        username: '',
        ...overrides
      }
    }

    it('reAdopt clears all tombstones and re-imports the deleted host', async () => {
      mockStore.addDeletedSshConfigAlias('mini')
      loadUserSshConfigMock.mockReturnValue([{ host: 'mini' }])
      sshConfigHostsToTargetsMock.mockReturnValue([candidate({ configHost: 'mini' })])

      const result = (await sshStore.importFromSshConfig({ reAdopt: true })).targets

      expect(mockStore.clearDeletedSshConfigAliases).toHaveBeenCalled()
      expect(mockStore.addSshTarget).toHaveBeenCalledWith(
        expect.objectContaining({ configHost: 'mini', source: 'ssh-config' })
      )
      expect(result).toHaveLength(1)
    })
  })
})
