import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DynamicRenderer } from '../components/DynamicRenderer';
import { ComponentRegistry } from '../services/componentRegistry';
import type { ScenarioElement, RenderScenarioMessage } from '../types/protocol';
import type { RenderContext } from '../types/renderer';

// Mock components for testing
import { View, Text, Pressable } from 'react-native';

const MockServer = ({ element }: any) => (
  <View testID={`server-${element.id}`}>
    <Text>Server: {element.props.capacity}</Text>
  </View>
);

const MockPizza = ({ element, context }: any) => (
  <Pressable
    testID={`pizza-${element.id}`}
    onPress={() => context.onInteraction('tap', element.id)}
  >
    <Text>Pizza: {element.props.priority}</Text>
  </Pressable>
);

describe('DynamicRenderer', () => {
  let registry: ComponentRegistry;
  let mockContext: RenderContext;

  beforeEach(() => {
    registry = new ComponentRegistry();
    registry.register('server', MockServer);
    registry.register('pizza', MockPizza);

    mockContext = {
      onInteraction: jest.fn(),
      theme: 'light',
      screenSize: { width: 400, height: 800 },
    };
  });

  describe('Component Rendering', () => {
    it('should render server components from scenario spec', () => {
      const scenario: RenderScenarioMessage = {
        id: 'test-scenario',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [
          {
            id: 'server-1',
            type: 'server',
            props: { capacity: 100 },
            position: { x: 50, y: 100 },
          },
        ],
        layout: { type: 'absolute' },
      };

      const { getByTestId } = render(
        <DynamicRenderer
          scenario={scenario}
          registry={registry}
          context={mockContext}
        />
      );

      expect(getByTestId('server-server-1')).toBeTruthy();
    });

    it('should render multiple component types', () => {
      const scenario: RenderScenarioMessage = {
        id: 'test-scenario',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [
          {
            id: 'server-1',
            type: 'server',
            props: { capacity: 100 },
          },
          {
            id: 'pizza-1',
            type: 'pizza',
            props: { priority: 'high' },
          },
        ],
        layout: { type: 'absolute' },
      };

      const { getByTestId } = render(
        <DynamicRenderer
          scenario={scenario}
          registry={registry}
          context={mockContext}
        />
      );

      expect(getByTestId('server-server-1')).toBeTruthy();
      expect(getByTestId('pizza-pizza-1')).toBeTruthy();
    });

    it('should handle unknown component types gracefully', () => {
      const scenario: RenderScenarioMessage = {
        id: 'test-scenario',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [
          {
            id: 'unknown-1',
            type: 'unknown' as any,
            props: {},
          },
        ],
        layout: { type: 'absolute' },
      };

      const { queryByTestId } = render(
        <DynamicRenderer
          scenario={scenario}
          registry={registry}
          context={mockContext}
        />
      );

      expect(queryByTestId('unknown-unknown-1')).toBeNull();
    });
  });

  describe('Layout Management', () => {
    it('should apply absolute positioning', () => {
      const scenario: RenderScenarioMessage = {
        id: 'test-scenario',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [
          {
            id: 'server-1',
            type: 'server',
            props: { capacity: 100 },
            position: { x: 100, y: 200 },
          },
        ],
        layout: { type: 'absolute' },
      };

      const { getByTestId } = render(
        <DynamicRenderer
          scenario={scenario}
          registry={registry}
          context={mockContext}
        />
      );

      const container = getByTestId('scenario-container');
      const styles = Array.isArray(container.props.style)
        ? container.props.style
        : [container.props.style];

      const hasRelativePosition = styles.some(style =>
        style && typeof style === 'object' && style.position === 'relative'
      );
      expect(hasRelativePosition).toBe(true);
    });

    it('should handle responsive sizing', () => {
      const smallContext = {
        ...mockContext,
        screenSize: { width: 320, height: 480 },
      };

      const { getByTestId } = render(
        <DynamicRenderer
          scenario={{
            id: 'test',
            type: 'render_scenario',
            timestamp: Date.now(),
            concept: 'test',
            elements: [],
            layout: { type: 'absolute' },
          }}
          registry={registry}
          context={smallContext}
        />
      );

      expect(getByTestId('scenario-container')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('should forward interactions to context', () => {
      const scenario: RenderScenarioMessage = {
        id: 'test-scenario',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [
          {
            id: 'pizza-1',
            type: 'pizza',
            props: { priority: 'high' },
            interactions: [
              { type: 'tap', onAction: 'select_pizza' },
            ],
          },
        ],
        layout: { type: 'absolute' },
      };

      const { getByTestId } = render(
        <DynamicRenderer
          scenario={scenario}
          registry={registry}
          context={mockContext}
        />
      );

      fireEvent.press(getByTestId('pizza-pizza-1'));
      expect(mockContext.onInteraction).toHaveBeenCalledWith('tap', 'pizza-1');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of elements', () => {
      const elements: ScenarioElement[] = Array.from({ length: 100 }, (_, i) => ({
        id: `server-${i}`,
        type: 'server',
        props: { capacity: 100 },
        position: { x: i * 10, y: i * 10 },
      }));

      const scenario: RenderScenarioMessage = {
        id: 'test-scenario',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements,
        layout: { type: 'absolute' },
      };

      const startTime = Date.now();
      const { getByTestId } = render(
        <DynamicRenderer
          scenario={scenario}
          registry={registry}
          context={mockContext}
        />
      );
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
      expect(getByTestId('scenario-container')).toBeTruthy();
    });
  });
});
