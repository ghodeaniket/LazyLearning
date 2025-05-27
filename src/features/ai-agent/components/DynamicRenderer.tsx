import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { RenderScenarioMessage } from '../types/protocol';
import type { RenderContext } from '../types/renderer';
import type { ComponentRegistry } from '../services/componentRegistry';

interface DynamicRendererProps {
  scenario: RenderScenarioMessage;
  registry: ComponentRegistry;
  context: RenderContext;
}

export const DynamicRenderer: React.FC<DynamicRendererProps> = ({
  scenario,
  registry,
  context,
}) => {
  const containerStyle = useMemo(() => {
    const baseStyle = {
      width: context.screenSize.width,
      minHeight: context.screenSize.height * 0.8,
    };

    switch (scenario.layout.type) {
      case 'absolute':
        return { ...baseStyle, position: 'relative' as const };
      case 'flex':
        return { ...baseStyle, flex: 1, flexDirection: 'column' as const };
      case 'grid':
        // Simple grid implementation - YAGNI: complex grid layouts can come later
        return { ...baseStyle, flexDirection: 'row' as const, flexWrap: 'wrap' as const };
      default:
        return baseStyle;
    }
  }, [scenario.layout, context.screenSize]);

  const renderElement = (element: typeof scenario.elements[0]) => {
    const Component = registry.get(element.type);

    if (!Component) {
      // Silently skip unknown components in production
      if (__DEV__) {
        console.warn(`Unknown component type: ${element.type}`);
      }
      return null;
    }

    const elementStyle = element.position ? {
      position: 'absolute' as const,
      left: element.position.x,
      top: element.position.y,
    } : undefined;

    return (
      <View key={element.id} style={elementStyle}>
        <Component element={element} context={context} />
      </View>
    );
  };

  return (
    <View testID="scenario-container" style={[styles.container, containerStyle]}>
      {scenario.elements.map(renderElement)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
});
