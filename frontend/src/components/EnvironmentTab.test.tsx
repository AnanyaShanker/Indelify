import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EnvironmentTab from './EnvironmentTab'

function makeImageFile(name: string): File {
  return new File(['fake image bytes'], name, { type: 'image/jpeg' })
}

describe('EnvironmentTab image cap', () => {
  it('caps uploads at 5 photos even when more are selected at once', () => {
    const { container, getByText } = render(
      <EnvironmentTab langPref="all" onResult={() => {}} />
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const files = Array.from({ length: 6 }, (_, i) => makeImageFile(`photo${i}.jpg`))

    fireEvent.change(input, { target: { files } })

    expect(getByText('5 photos selected · maximum reached')).toBeInTheDocument()
  })

  it('advertises the 5-photo limit in the empty-state hint', () => {
    const { getByText } = render(<EnvironmentTab langPref="all" onResult={() => {}} />)
    expect(getByText('JPG, PNG, WEBP · up to 5 photos')).toBeInTheDocument()
  })
})
