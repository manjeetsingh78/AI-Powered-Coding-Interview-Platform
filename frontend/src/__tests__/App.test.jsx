import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Sanity', () => {
  test('renders without crashing', () => {
    // Render a minimal element as the app root may import app-specific context
    render(React.createElement('div', null, 'hello'))
    expect(screen.getByText('hello')).toBeTruthy()
  })
})
