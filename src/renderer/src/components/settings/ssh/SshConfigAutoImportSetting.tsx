import { useAppStore } from '@/store/index'
import { isSshConfigAutoImportEnabled } from '../../../../../shared/ssh-config-auto-import-settings'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { getSshConfigAutoImportEntries } from './ssh-search'

export function SshConfigAutoImportSetting(): React.JSX.Element {
  const enabled = useAppStore((s) => isSshConfigAutoImportEnabled(s.settings))
  const updateSettings = useAppStore((s) => s.updateSettings)
  const entry = getSshConfigAutoImportEntries()[0]
  return (
    <SearchableSetting
      title={entry.title}
      description={entry.description}
      keywords={entry.keywords}
    >
      <SettingsSwitchRow
        label={entry.title}
        description={entry.description}
        checked={enabled}
        onChange={() => void updateSettings({ sshConfigAutoImport: !enabled })}
      />
    </SearchableSetting>
  )
}
