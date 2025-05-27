import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AIAgentDemo } from '../screens/AIAgentDemo';

// Mock the components that use gesture handlers
jest.mock('../components/base/InteractivePizza', () => ({
  InteractivePizza: () => null,
}));

describe('AI Agent Integration', () => {
  it('should render demo screen', () => {
    const { getByText } = render(<AIAgentDemo />);

    expect(getByText('AI Agent Demo')).toBeTruthy();
    expect(getByText('Load Demo Scenario')).toBeTruthy();
  });

  it('should show feedback when demo loaded', () => {
    const { getByText } = render(<AIAgentDemo />);

    // Load demo
    fireEvent.press(getByText('Load Demo Scenario'));

    // Should show feedback
    expect(getByText(/Demo loaded/)).toBeTruthy();
  });

  it('should clear scenario', () => {
    const { getByText, queryByText } = render(<AIAgentDemo />);

    // Load demo
    fireEvent.press(getByText('Load Demo Scenario'));
    expect(queryByText(/Demo loaded/)).toBeTruthy();

    // Clear
    fireEvent.press(getByText('Clear'));
    expect(queryByText(/Demo loaded/)).toBeNull();
  });
});
