import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { DynamicComponentProps } from '../../types/renderer';
import { animations, springConfig } from '../../utils/animations';
import { sizing } from '../../utils/sizing';

export const InteractiveServer: React.FC<DynamicComponentProps> = ({
  element,
  context,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    opacity.value = animations.fadeIn().opacity;
    scale.value = animations.scaleIn().scale;
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    if (element.interactions?.find(i => i.type === 'tap')) {
      scale.value = animations.scaleIn(0.95, springConfig.bouncy).scale;
      setTimeout(() => {
        scale.value = animations.scaleIn(1, springConfig.bouncy).scale;
      }, 100);

      context.onInteraction('tap', element.id, {
        type: 'server',
        capacity: element.props.capacity,
      });
    }
  };

  const size = sizing.componentSize.medium();
  const capacity = element.props.capacity as number || 100;
  const load = element.props.currentLoad as number || 0;
  const loadPercentage = (load / capacity) * 100;

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            width: size,
            height: size,
            backgroundColor: getServerColor(loadPercentage),
          },
        ]}
        testID={`server-${element.id}`}
      >
        <Text style={styles.icon}>🖥️</Text>
        <View style={styles.loadBar}>
          <View
            style={[
              styles.loadFill,
              { width: `${loadPercentage}%` },
            ]}
          />
        </View>
        <Text style={styles.loadText}>{load}/{capacity}</Text>
      </Animated.View>
    </Pressable>
  );
};

const getServerColor = (loadPercentage: number): string => {
  if (loadPercentage > 80) {return '#FF6B6B';}
  if (loadPercentage > 60) {return '#FFD93D';}
  return '#6BCF7F';
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  loadBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  loadFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  loadText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
});
