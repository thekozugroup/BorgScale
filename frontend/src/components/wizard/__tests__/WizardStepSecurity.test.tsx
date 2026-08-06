import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { screen, renderWithProviders } from '../../../test/test-utils'
import WizardStepSecurity from '../WizardStepSecurity'

const defaultData = {
  encryption: 'repokey',
  passphrase: '',
  remotePath: '',
  selectedKeyfile: null as File | null,
}

describe('WizardStepSecurity', () => {
  describe('Create Mode', () => {
    it('renders encryption tiles', () => {
      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={vi.fn()} />
      )

      expect(screen.getByTestId('encryption-tile-encrypted')).toBeInTheDocument()
      expect(screen.getByTestId('encryption-tile-keyfile')).toBeInTheDocument()
      expect(screen.getByTestId('encryption-tile-none')).toBeInTheDocument()
    })

    it('keeps the advanced dropdown hidden by default when encryption matches a tile', () => {
      const tileMatchData = { ...defaultData, encryption: 'repokey-blake2' }
      renderWithProviders(
        <WizardStepSecurity mode="create" data={tileMatchData} onChange={vi.fn()} />
      )

      // Advanced disclosure container exists but the select is collapsed.
      expect(screen.getByTestId('security-advanced')).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('force-opens the advanced disclosure for non-tile encryption values', () => {
      const customData = { ...defaultData, encryption: 'repokey-chacha20-poly1305' }
      renderWithProviders(<WizardStepSecurity mode="create" data={customData} onChange={vi.fn()} />)

      // Force-open: the Select trigger is now in the DOM.
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders passphrase input', () => {
      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={vi.fn()} />
      )

      expect(screen.getByPlaceholderText(/Enter passphrase/i)).toBeInTheDocument()
    })

    it('renders remote borg path input', () => {
      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={vi.fn()} />
      )

      expect(screen.getByLabelText(/Remote Borg Path/i)).toBeInTheDocument()
    })

    it('calls onChange when passphrase is entered', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={onChange} />
      )

      await user.type(screen.getByPlaceholderText(/Enter passphrase/i), 'mysecret')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          passphrase: expect.any(String),
        })
      )
    })

    it('shows security warning when no encryption is selected', () => {
      const noEncryptionData = { ...defaultData, encryption: 'none' }

      renderWithProviders(
        <WizardStepSecurity mode="create" data={noEncryptionData} onChange={vi.fn()} />
      )

      expect(screen.getByText(/Security Warning/i)).toBeInTheDocument()
      expect(screen.getByText(/stored without encryption/i)).toBeInTheDocument()
    })

    it('hides passphrase input when encryption is none', () => {
      const noEncryptionData = { ...defaultData, encryption: 'none' }

      renderWithProviders(
        <WizardStepSecurity mode="create" data={noEncryptionData} onChange={vi.fn()} />
      )

      expect(screen.queryByPlaceholderText(/Enter passphrase/i)).not.toBeInTheDocument()
    })

    it('does NOT show encryption warning in create mode', () => {
      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={vi.fn()} />
      )

      expect(screen.queryByText(/Encryption settings cannot be changed/i)).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('does NOT render encryption method dropdown', () => {
      renderWithProviders(<WizardStepSecurity mode="edit" data={defaultData} onChange={vi.fn()} />)

      // In edit mode, encryption dropdown should not be shown
      expect(screen.queryByLabelText(/Encryption Method/i)).not.toBeInTheDocument()
    })

    it('shows encryption info alert', () => {
      renderWithProviders(<WizardStepSecurity mode="edit" data={defaultData} onChange={vi.fn()} />)

      expect(screen.getByText(/Encryption settings cannot be changed/i)).toBeInTheDocument()
    })

    it('shows passphrase as optional', () => {
      renderWithProviders(<WizardStepSecurity mode="edit" data={defaultData} onChange={vi.fn()} />)

      expect(
        screen.getByPlaceholderText(/Leave blank to keep last saved passphrase/i)
      ).toBeInTheDocument()
    })

    it('shows helper text about keeping existing passphrase', () => {
      renderWithProviders(<WizardStepSecurity mode="edit" data={defaultData} onChange={vi.fn()} />)

      expect(screen.getByText(/leave blank to keep last saved passphrase/i)).toBeInTheDocument()
    })
  })

  describe('Import Mode', () => {
    it('hides the Encryption Method dropdown by default when value matches a tile', () => {
      const tileMatchData = { ...defaultData, encryption: 'repokey-blake2' }
      renderWithProviders(
        <WizardStepSecurity mode="import" data={tileMatchData} onChange={vi.fn()} />
      )

      // Tiles are present; the original Select is collapsed under Advanced.
      expect(screen.getByTestId('encryption-tile-encrypted')).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('does NOT show encryption settings warning', () => {
      renderWithProviders(
        <WizardStepSecurity mode="import" data={defaultData} onChange={vi.fn()} />
      )

      // Import mode should not show the "cannot change encryption" warning
      expect(screen.queryByText(/Encryption settings cannot be changed/i)).not.toBeInTheDocument()
    })

    it('renders keyfile upload option', () => {
      const keyfileData = { ...defaultData, encryption: 'keyfile' }
      renderWithProviders(
        <WizardStepSecurity mode="import" data={keyfileData} onChange={vi.fn()} />
      )

      expect(screen.getByText(/Encryption key file \(optional\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Choose key file/i)).toBeInTheDocument()
    })

    it('shows selected keyfile name', () => {
      const dataWithKeyfile = {
        ...defaultData,
        encryption: 'keyfile',
        selectedKeyfile: new File([''], 'my-key.key', { type: 'application/octet-stream' }),
      }

      renderWithProviders(
        <WizardStepSecurity mode="import" data={dataWithKeyfile} onChange={vi.fn()} />
      )

      expect(screen.getByText(/Selected: my-key.key/i)).toBeInTheDocument()
    })

    it('shows success message when keyfile is selected', () => {
      const dataWithKeyfile = {
        ...defaultData,
        encryption: 'keyfile',
        selectedKeyfile: new File([''], 'my-key.key', { type: 'application/octet-stream' }),
      }

      renderWithProviders(
        <WizardStepSecurity mode="import" data={dataWithKeyfile} onChange={vi.fn()} />
      )

      expect(screen.getByText(/Your key file will be uploaded after import/i)).toBeInTheDocument()
    })
  })

  describe('Encryption Selection', () => {
    it('can select keyfile encryption via tile', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={onChange} />
      )

      await user.click(screen.getByTestId('encryption-tile-keyfile'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          // Borg v1 default keyfile variant
          encryption: 'keyfile-blake2',
        })
      )
    })

    it('can select no encryption via tile', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={onChange} />
      )

      await user.click(screen.getByTestId('encryption-tile-none'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          encryption: 'none',
        })
      )
    })

    it('selects the borg v2 recommended encryption when borgVersion=2', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepSecurity mode="create" borgVersion={2} data={defaultData} onChange={onChange} />
      )

      await user.click(screen.getByTestId('encryption-tile-encrypted'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ encryption: 'repokey-aes-ocb' })
      )
    })
  })

  describe('Remote Borg Path', () => {
    it('calls onChange when remote path is entered', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={onChange} />
      )

      await user.type(screen.getByLabelText(/Remote Borg Path/i), '/usr/local/bin/borg')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          remotePath: expect.any(String),
        })
      )
    })

    it('shows placeholder for remote borg path', () => {
      renderWithProviders(
        <WizardStepSecurity mode="create" data={defaultData} onChange={vi.fn()} />
      )

      expect(screen.getByPlaceholderText(/\/usr\/local\/bin\/borg/i)).toBeInTheDocument()
    })
  })
})
