import { render, screen, fireEvent } from '@testing-library/react'
import SettingsModal from '@/app/components/SettingsModal'

const baseProps = {
  topic: 'Ancient Rome',
  provider: 'claude' as const,
  onSave: jest.fn(),
  onClose: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

describe('SettingsModal', () => {
  test('renders with current topic pre-filled', () => {
    render(<SettingsModal {...baseProps} />)
    expect(screen.getByDisplayValue('Ancient Rome')).toBeInTheDocument()
  })

  test('renders with current provider selected', () => {
    render(<SettingsModal {...baseProps} />)
    expect(screen.getByDisplayValue('Claude')).toBeInTheDocument()
  })

  test('calls onSave with updated topic and provider', () => {
    render(<SettingsModal {...baseProps} />)
    const input = screen.getByDisplayValue('Ancient Rome')
    fireEvent.change(input, { target: { value: 'Deep Ocean' } })
    fireEvent.click(screen.getByText('Save'))
    expect(baseProps.onSave).toHaveBeenCalledWith('Deep Ocean', 'claude')
  })

  test('calls onSave with changed provider', () => {
    render(<SettingsModal {...baseProps} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'openai' } })
    fireEvent.click(screen.getByText('Save'))
    expect(baseProps.onSave).toHaveBeenCalledWith('Ancient Rome', 'openai')
  })

  test('calls onClose when × is clicked', () => {
    render(<SettingsModal {...baseProps} />)
    fireEvent.click(screen.getByText('×'))
    expect(baseProps.onClose).toHaveBeenCalled()
    expect(baseProps.onSave).not.toHaveBeenCalled()
  })

  test('calls onClose when backdrop is clicked', () => {
    render(<SettingsModal {...baseProps} />)
    // The backdrop is the outermost div; click it directly
    const backdrop = screen.getByTestId('settings-backdrop')
    fireEvent.click(backdrop)
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  test('does not close when clicking inside the card', () => {
    render(<SettingsModal {...baseProps} />)
    const card = screen.getByTestId('settings-card')
    fireEvent.click(card)
    expect(baseProps.onClose).not.toHaveBeenCalled()
  })

  test('Save is disabled when topic is blank', () => {
    render(<SettingsModal {...baseProps} topic="" />)
    expect(screen.getByText('Save').closest('button')).toBeDisabled()
  })
})
