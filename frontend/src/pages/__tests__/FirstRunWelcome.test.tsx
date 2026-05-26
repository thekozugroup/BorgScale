import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen } from '../../test/test-utils'
import FirstRunWelcome from '../FirstRunWelcome'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

describe('FirstRunWelcome', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('renders three tiles', () => {
    renderWithProviders(<FirstRunWelcome />)
    expect(screen.getByTestId('firstrun-tile-new')).toBeInTheDocument()
    expect(screen.getByTestId('firstrun-tile-discover-local')).toBeInTheDocument()
    expect(screen.getByTestId('firstrun-tile-discover-remote')).toBeInTheDocument()
  })

  it('navigates to /repositories?wizard=new on tile click', () => {
    renderWithProviders(<FirstRunWelcome />)
    fireEvent.click(screen.getByTestId('firstrun-tile-new'))
    expect(navigateMock).toHaveBeenCalledWith('/repositories?wizard=new')
  })

  it('navigates to discover-local', () => {
    renderWithProviders(<FirstRunWelcome />)
    fireEvent.click(screen.getByTestId('firstrun-tile-discover-local'))
    expect(navigateMock).toHaveBeenCalledWith('/repositories?wizard=discover-local')
  })

  it('navigates to discover-remote', () => {
    renderWithProviders(<FirstRunWelcome />)
    fireEvent.click(screen.getByTestId('firstrun-tile-discover-remote'))
    expect(navigateMock).toHaveBeenCalledWith('/repositories?wizard=discover-remote')
  })

  it('navigates on Enter keypress (keyboard accessibility)', () => {
    renderWithProviders(<FirstRunWelcome />)
    const tile = screen.getByTestId('firstrun-tile-new')
    fireEvent.keyDown(tile, { key: 'Enter' })
    expect(navigateMock).toHaveBeenCalledWith('/repositories?wizard=new')
  })
})
