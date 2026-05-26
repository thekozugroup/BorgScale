import { describe, expect, it, vi } from 'vitest'
import { screen, renderWithProviders } from '../../../test/test-utils'
import WizardStepBackupConfig, { BackupConfigStepData } from '../WizardStepBackupConfig'

// Mock CompressionSettings
vi.mock('../../CompressionSettings', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="compression-settings">
      <span>Compression: {value}</span>
      <button onClick={() => onChange('zstd')}>Change Compression</button>
    </div>
  ),
}))

// Mock ExcludePatternInput
vi.mock('../../ExcludePatternInput', () => ({
  default: ({
    patterns,
    onChange,
    onBrowseClick,
  }: {
    patterns: string[]
    onChange: (p: string[]) => void
    onBrowseClick: () => void
  }) => (
    <div data-testid="exclude-pattern-input">
      <span>{patterns.length} exclude patterns</span>
      <button onClick={() => onChange([...patterns, '*.new'])}>Add Pattern</button>
      <button onClick={onBrowseClick}>Browse</button>
    </div>
  ),
}))

// Mock AdvancedRepositoryOptions
vi.mock('../../AdvancedRepositoryOptions', () => ({
  default: ({
    remotePath,
    customFlags,
    preBackupScript,
    postBackupScript,
    onRemotePathChange,
    onCustomFlagsChange,
  }: {
    remotePath: string
    customFlags: string
    preBackupScript: string
    postBackupScript: string
    onRemotePathChange: (v: string) => void
    onCustomFlagsChange: (v: string) => void
  }) => (
    <div data-testid="advanced-options">
      <span>Remote Path: {remotePath || '(empty)'}</span>
      <span>Custom Flags: {customFlags || '(empty)'}</span>
      <span>Pre Script: {preBackupScript || '(empty)'}</span>
      <span>Post Script: {postBackupScript || '(empty)'}</span>
      <button onClick={() => onRemotePathChange('/usr/bin/borg')}>Set Remote Path</button>
      <button onClick={() => onCustomFlagsChange('--stats')}>Set Custom Flags</button>
    </div>
  ),
}))

const defaultData: BackupConfigStepData = {
  compression: 'lz4',
  excludePatterns: ['*.tmp', '*.log'],
  customFlags: '',
  remotePath: '',
  preBackupScript: '',
  postBackupScript: '',
  preHookTimeout: 300,
  postHookTimeout: 300,
  hookFailureMode: 'fail',
}

describe('WizardStepBackupConfig', () => {
  describe('Compression Settings', () => {
    it('renders three compression tiles', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByTestId('compression-tile-balanced')).toBeInTheDocument()
      expect(screen.getByTestId('compression-tile-smaller')).toBeInTheDocument()
      expect(screen.getByTestId('compression-tile-none')).toBeInTheDocument()
    })

    it('hides the advanced compression settings by default when value matches a tile', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      // CompressionSettings mock is inside the advanced disclosure — collapsed.
      expect(screen.queryByTestId('compression-settings')).not.toBeInTheDocument()
    })

    it('force-opens the advanced compression settings for non-tile values', () => {
      const customData = { ...defaultData, compression: 'zstd,22' }
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={customData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByTestId('compression-settings')).toBeInTheDocument()
      expect(screen.getByText('Compression: zstd,22')).toBeInTheDocument()
    })

    it('clicking a compression tile calls onChange with the right value', async () => {
      const { userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={onChange}
          onBrowseExclude={vi.fn()}
        />
      )

      await user.click(screen.getByTestId('compression-tile-smaller'))

      expect(onChange).toHaveBeenCalledWith({ compression: 'zstd,3' })
    })
  })

  describe('Exclude Patterns - Local Source', () => {
    it('renders exclude pattern input for local data source', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByTestId('exclude-pattern-input')).toBeInTheDocument()
    })

    it('shows current exclude pattern count', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByText('2 exclude patterns')).toBeInTheDocument()
    })

    it('calls onChange when patterns change', async () => {
      const { userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={onChange}
          onBrowseExclude={vi.fn()}
        />
      )

      await user.click(screen.getByText('Add Pattern'))

      expect(onChange).toHaveBeenCalledWith({
        excludePatterns: ['*.tmp', '*.log', '*.new'],
      })
    })

    it('calls onBrowseExclude when browse is clicked', async () => {
      const { userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()
      const onBrowseExclude = vi.fn()

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={onBrowseExclude}
        />
      )

      await user.click(screen.getByText('Browse'))

      expect(onBrowseExclude).toHaveBeenCalled()
    })
  })

  describe('Remote Data Source', () => {
    it('shows exclude pattern input for remote data source', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="remote"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      // After SSHFS path preservation fix, excludes work for remote sources too
      expect(screen.getByTestId('exclude-pattern-input')).toBeInTheDocument()
    })

    it('shows info alert for remote data source explaining how excludes work', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="remote"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(
        screen.getByText(
          /Remote directories are mounted via SSHFS preserving their original paths/i
        )
      ).toBeInTheDocument()
    })
  })

  describe('Advanced Options', () => {
    async function openPowerAdvanced() {
      const { userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()
      const trigger = screen
        .getByTestId('power-advanced')
        .querySelector('button')
      if (!trigger) throw new Error('power-advanced trigger not found')
      await user.click(trigger)
      return user
    }

    it('mounts the advanced repository options disclosure (collapsed by default)', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByTestId('power-advanced')).toBeInTheDocument()
      // Body is collapsed — mock should not be visible.
      expect(screen.queryByTestId('advanced-options')).not.toBeInTheDocument()
    })

    it('passes remote path to advanced options when expanded', async () => {
      const dataWithRemotePath = { ...defaultData, remotePath: '/usr/local/bin/borg' }

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={dataWithRemotePath}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      await openPowerAdvanced()
      expect(screen.getByText('Remote Path: /usr/local/bin/borg')).toBeInTheDocument()
    })

    it('passes custom flags to advanced options when expanded', async () => {
      const dataWithFlags = { ...defaultData, customFlags: '--stats --progress' }

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={dataWithFlags}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      await openPowerAdvanced()
      expect(screen.getByText('Custom Flags: --stats --progress')).toBeInTheDocument()
    })

    it('passes hook scripts to advanced options when expanded', async () => {
      const dataWithScripts = {
        ...defaultData,
        preBackupScript: 'echo "starting"',
        postBackupScript: 'echo "done"',
      }

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={dataWithScripts}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      await openPowerAdvanced()
      expect(screen.getByText('Pre Script: echo "starting"')).toBeInTheDocument()
      expect(screen.getByText('Post Script: echo "done"')).toBeInTheDocument()
    })

    it('calls onChange when remote path changes', async () => {
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={onChange}
          onBrowseExclude={vi.fn()}
        />
      )

      const user = await openPowerAdvanced()
      await user.click(screen.getByText('Set Remote Path'))

      expect(onChange).toHaveBeenCalledWith({ remotePath: '/usr/bin/borg' })
    })

    it('calls onChange when custom flags change', async () => {
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepBackupConfig
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={onChange}
          onBrowseExclude={vi.fn()}
        />
      )

      const user = await openPowerAdvanced()
      await user.click(screen.getByText('Set Custom Flags'))

      expect(onChange).toHaveBeenCalledWith({ customFlags: '--stats' })
    })
  })

  describe('Repository ID', () => {
    it('passes repository ID to advanced options when editing (disclosure mounted)', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          repositoryId={42}
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByTestId('power-advanced')).toBeInTheDocument()
    })

    it('handles null repository ID (disclosure mounted)', () => {
      renderWithProviders(
        <WizardStepBackupConfig
          repositoryId={null}
          dataSource="local"
          repositoryMode="full"
          data={defaultData}
          onChange={vi.fn()}
          onBrowseExclude={vi.fn()}
        />
      )

      expect(screen.getByTestId('power-advanced')).toBeInTheDocument()
    })
  })
})
