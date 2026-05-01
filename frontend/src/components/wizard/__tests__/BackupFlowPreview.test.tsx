import { describe, expect, it } from 'vitest'
import { screen, renderWithProviders } from '../../../test/test-utils'
import BackupFlowPreview from '../BackupFlowPreview'

const mockSshConnection = {
  id: 1,
  host: 'backup.server.com',
  username: 'backupuser',
  port: 22,
}

describe('BackupFlowPreview', () => {
  describe('Local to Local Backup', () => {
    it('shows correct summary text', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
        />
      )

      expect(screen.getByText(/Back up local data to local repository/i)).toBeInTheDocument()
    })

    it('shows BorgScale Server as source', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
        />
      )

      // Both source and repo show "BorgScale Server" in local-to-local
      const borgUIServers = screen.getAllByText('BorgScale Server')
      expect(borgUIServers.length).toBeGreaterThanOrEqual(1)
    })

    it('shows BorgScale Server as repository location', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
        />
      )

      // Should show "BorgScale Server" twice - once for source and once for repo
      const borgUIServers = screen.getAllByText('BorgScale Server')
      expect(borgUIServers).toHaveLength(2)
    })

    it('shows repository path', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
        />
      )

      expect(screen.getByText('/backups/myrepo')).toBeInTheDocument()
    })

    it('shows directory count', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user', '/var/data', '/opt/app']}
        />
      )

      expect(screen.getByText('3 dirs')).toBeInTheDocument()
    })

    it('shows singular "dir" for one directory', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
        />
      )

      expect(screen.getByText('1 dir')).toBeInTheDocument()
    })
  })

  describe('Local to Remote Backup', () => {
    it('shows correct summary text', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="ssh"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
          repoSshConnection={mockSshConnection}
        />
      )

      expect(screen.getByText(/Back up local data to remote repository/i)).toBeInTheDocument()
    })

    it('shows SSH connection details for repository', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="ssh"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
          repoSshConnection={mockSshConnection}
        />
      )

      expect(screen.getByText('backupuser@backup.server.com')).toBeInTheDocument()
    })
  })

  describe('Remote to Local Backup (SSHFS)', () => {
    it('shows correct summary text', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="remote"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/remote/data']}
          sourceSshConnection={mockSshConnection}
        />
      )

      expect(
        screen.getByText(/Back up remote data to local repository via SSHFS/i)
      ).toBeInTheDocument()
    })

    it('shows SSHFS intermediate node', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="remote"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/remote/data']}
          sourceSshConnection={mockSshConnection}
        />
      )

      // "via SSHFS" appears in both summary text and flow
      const sshfsTexts = screen.getAllByText(/via SSHFS/i)
      expect(sshfsTexts.length).toBeGreaterThanOrEqual(1)
    })

    it('shows SSH connection details for source', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="remote"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/remote/data']}
          sourceSshConnection={mockSshConnection}
        />
      )

      expect(screen.getByText('backupuser@backup.server.com')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty repository path', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath=""
          sourceDirs={['/home/user']}
        />
      )

      // Should still render without error
      expect(screen.getByText(/Back up local data/i)).toBeInTheDocument()
    })

    it('handles empty source directories', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={[]}
        />
      )

      // Should not show directory count when empty
      expect(screen.queryByText(/dir/i)).not.toBeInTheDocument()
    })

    it('shows Remote Client when source is remote but no connection provided', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="local"
          dataSource="remote"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/remote/data']}
        />
      )

      expect(screen.getByText('Remote Client')).toBeInTheDocument()
    })

    it('shows Remote Storage when repository is remote but no connection provided', () => {
      renderWithProviders(
        <BackupFlowPreview
          repositoryLocation="ssh"
          dataSource="local"
          repositoryPath="/backups/myrepo"
          sourceDirs={['/home/user']}
        />
      )

      expect(screen.getByText('Remote Storage')).toBeInTheDocument()
    })
  })
})
