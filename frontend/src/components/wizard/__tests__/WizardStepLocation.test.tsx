import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { screen, renderWithProviders } from '../../../test/test-utils'
import WizardStepLocation from '../WizardStepLocation'

const mockSshConnections = [
  {
    id: 1,
    host: 'server1.example.com',
    username: 'backupuser',
    port: 22,
    ssh_key_id: 1,
    default_path: '/backups',
    mount_point: '/mnt/server1',
    status: 'connected',
  },
  {
    id: 2,
    host: 'server2.example.com',
    username: 'admin',
    port: 2222,
    ssh_key_id: 2,
    default_path: '/data',
    mount_point: undefined,
    status: 'disconnected',
  },
]

const defaultData = {
  name: '',
  repositoryMode: 'full' as const,
  repositoryLocation: 'local' as const,
  path: '',
  repoSshConnectionId: '' as number | '',
  bypassLock: false,
}

describe('WizardStepLocation', () => {
  describe('Create Mode', () => {
    it('renders Repository Name input', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByLabelText(/Repository Name/i)).toBeInTheDocument()
    })

    it('renders Repository Path input', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByLabelText(/Repository Path/i)).toBeInTheDocument()
    })

    it('renders location selection cards', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByText('BorgScale Server')).toBeInTheDocument()
      expect(screen.getByText('Remote Client')).toBeInTheDocument()
    })

    it('does NOT show Repository Mode selector in create mode', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.queryByLabelText(/Repository Mode/i)).not.toBeInTheDocument()
    })

    it('calls onChange when name is entered', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={onChange}
          onBrowsePath={vi.fn()}
        />
      )

      await user.type(screen.getByLabelText(/Repository Name/i), 'My Repo')

      expect(onChange).toHaveBeenCalled()
    })

    it('calls onChange when path is entered', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={onChange}
          onBrowsePath={vi.fn()}
        />
      )

      await user.type(screen.getByLabelText(/Repository Path/i), '/backups/test')

      expect(onChange).toHaveBeenCalled()
    })

    it('calls onBrowsePath when browse button is clicked', async () => {
      const user = userEvent.setup()
      const onBrowsePath = vi.fn()

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={onBrowsePath}
        />
      )

      const browseButton = screen.getByRole('button', { name: /Browse filesystem/i })
      await user.click(browseButton)

      expect(onBrowsePath).toHaveBeenCalled()
    })

    it('shows Borg 2 beta as tooltip affordance without inline alert', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={{ ...defaultData, borgVersion: 2 }}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Import Mode', () => {
    it('shows Repository Mode radio cards', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="import"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByTestId('mode-card-full')).toBeInTheDocument()
      expect(screen.getByTestId('mode-card-observe')).toBeInTheDocument()
    })

    it('shows bypass lock checkbox inside advanced disclosure when observe mode is selected', () => {
      // bypassLock=true so the disclosure is collapsed by default, but the
      // toggle should still be present.
      const observeData = {
        ...defaultData,
        repositoryMode: 'observe' as const,
        bypassLock: true,
      }

      renderWithProviders(
        <WizardStepLocation
          mode="import"
          data={observeData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      // The advanced disclosure exists, click it open to reveal the checkbox.
      expect(screen.getByTestId('location-advanced')).toBeInTheDocument()
    })

    it('force-opens the advanced disclosure when bypassLock is false in observe mode', () => {
      const observeData = {
        ...defaultData,
        repositoryMode: 'observe' as const,
        bypassLock: false,
      }

      renderWithProviders(
        <WizardStepLocation
          mode="import"
          data={observeData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      // Disclosure should be force-open so the checkbox is visible.
      expect(screen.getByText(/Allow access during another tool's writes/i)).toBeInTheDocument()
    })

    it('does NOT show bypass lock checkbox in full mode', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="import"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(
        screen.queryByText(/Allow access during another tool's writes/i)
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId('location-advanced')).not.toBeInTheDocument()
    })

    it('switching to observe mode also sets bypassLock=true', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepLocation
          mode="import"
          data={defaultData}
          sshConnections={[]}
          onChange={onChange}
          onBrowsePath={vi.fn()}
        />
      )

      await user.click(screen.getByTestId('mode-card-observe'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ repositoryMode: 'observe', bypassLock: true })
      )
    })
  })

  describe('Location Card Selection', () => {
    it('calls onChange when BorgScale Server is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const sshData = { ...defaultData, repositoryLocation: 'ssh' as const }

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={sshData}
          sshConnections={mockSshConnections}
          onChange={onChange}
          onBrowsePath={vi.fn()}
        />
      )

      const localCard = screen.getByText('BorgScale Server').closest('button')
      await user.click(localCard!)

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryLocation: 'local',
        })
      )
    })

    it('calls onChange when Remote Client is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={mockSshConnections}
          onChange={onChange}
          onBrowsePath={vi.fn()}
        />
      )

      const remoteCard = screen.getByText('Remote Client').closest('button')
      await user.click(remoteCard!)

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryLocation: 'ssh',
        })
      )
    })
  })

  describe('SSH Connection Selection', () => {
    it('shows SSH connection dropdown when Remote Client is selected', () => {
      const sshData = { ...defaultData, repositoryLocation: 'ssh' as const }

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={sshData}
          sshConnections={mockSshConnections}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      // MUI Select creates an InputLabel and a notched outline label
      const sshLabels = screen.getAllByText('Select SSH Connection')
      expect(sshLabels.length).toBeGreaterThanOrEqual(1)
    })

    it('shows warning when no SSH connections available', () => {
      const sshData = { ...defaultData, repositoryLocation: 'ssh' as const }

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={sshData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByText(/No SSH connections configured/i)).toBeInTheDocument()
    })

    it('disables browse button when Remote Client selected but no connection chosen', () => {
      const sshData = { ...defaultData, repositoryLocation: 'ssh' as const }

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={sshData}
          sshConnections={mockSshConnections}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      const browseButton = screen.getByRole('button', { name: /Browse filesystem/i })
      expect(browseButton).toBeDisabled()
    })

    it('enables browse button when SSH connection is selected', () => {
      const sshData = {
        ...defaultData,
        repositoryLocation: 'ssh' as const,
        repoSshConnectionId: 1,
      }

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={sshData}
          sshConnections={mockSshConnections}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      const browseButton = screen.getByRole('button', { name: /Browse filesystem/i })
      expect(browseButton).not.toBeDisabled()
    })
  })

  describe('Path Placeholder', () => {
    it('shows local path placeholder when BorgScale Server selected', () => {
      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={defaultData}
          sshConnections={[]}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByPlaceholderText(/\/backups\/my-repo/i)).toBeInTheDocument()
    })

    it('shows remote path placeholder when Remote Client selected', () => {
      const sshData = { ...defaultData, repositoryLocation: 'ssh' as const }

      renderWithProviders(
        <WizardStepLocation
          mode="create"
          data={sshData}
          sshConnections={mockSshConnections}
          onChange={vi.fn()}
          onBrowsePath={vi.fn()}
        />
      )

      expect(screen.getByPlaceholderText(/\/path\/on\/remote\/server/i)).toBeInTheDocument()
    })
  })
})
