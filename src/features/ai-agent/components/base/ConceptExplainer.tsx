import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { DynamicComponentProps } from '../../types/renderer';
import { sizing } from '../../utils/sizing';

export const ConceptExplainer: React.FC<DynamicComponentProps> = ({
  element,
  context,
}) => {
  const [expanded, setExpanded] = useState(false);
  const height = useSharedValue(sizing.responsive(60));
  const opacity = useSharedValue(1);

  const title = element.props.title as string || 'Concept';
  const description = element.props.description as string || '';
  const tips = element.props.tips as string[] || [];

  const toggleExpanded = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    height.value = withSpring(newExpanded ? sizing.responsive(200) : sizing.responsive(60));

    context.onInteraction('toggle', element.id, {
      expanded: newExpanded,
      concept: title,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      testID={`explainer-${element.id}`}
    >
      <Pressable onPress={toggleExpanded} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.arrow}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.description}>{description}</Text>
          {tips.length > 0 && (
            <View style={styles.tips}>
              {tips.map((tip, index) => (
                <Text key={index} style={styles.tip}>• {tip}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  arrow: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tips: {
    marginTop: 12,
  },
  tip: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});
