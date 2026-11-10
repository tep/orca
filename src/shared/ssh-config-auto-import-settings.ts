export type SshConfigAutoImportSettings = {
  /** Passive ~/.ssh/config import at launch, hosts-menu open and SSH settings open; default true. Explicit Sync still imports. */
  sshConfigAutoImport?: boolean
}

export function isSshConfigAutoImportEnabled(
  settings: SshConfigAutoImportSettings | null | undefined
): boolean {
  return settings?.sshConfigAutoImport !== false
}
