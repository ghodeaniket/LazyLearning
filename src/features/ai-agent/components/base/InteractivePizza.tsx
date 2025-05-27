import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import type { DynamicComponentProps } from '../../types/renderer';
import { animations } from '../../utils/animations';
import { sizing } from '../../utils/sizing';

export const InteractivePizza: React.FC<DynamicComponentProps> = ({
  element,
  context,
}) => {
  const translateX = useSharedValue(element.position?.x || 0);
  const translateY = useSharedValue(element.position?.y || 0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = animations.fadeIn().opacity;
    scale.value = animations.scaleIn().scale;

    // Pulse animation for high priority
    if (element.props.priority === 'high') {
      scale.value = animations.pulse().scale;
    }
  }, [element.props.priority, opacity, scale]);

  const handleDragEnd = (x: number, y: number) => {
    context.onInteraction('drag', element.id, {
      type: 'pizza',
      endPosition: { x, y },
      priority: element.props.priority,
    });
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      scale.value = animations.scaleIn(1.1).scale;
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      scale.value = animations.scaleIn(1).scale;
      runOnJS(handleDragEnd)(event.translationX, event.translationY);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const size = sizing.componentSize.small();
  const priority = element.props.priority as string || 'medium';

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            width: size,
            height: size,
            backgroundColor: getPizzaColor(priority),
          },
        ]}
        testID={`pizza-${element.id}`}
      >
        <Text style={styles.icon}>🍕</Text>
        <Text style={styles.priority}>{priority[0].toUpperCase()}</Text>
      </Animated.View>
    </PanGestureHandler>
  );
};

const getPizzaColor = (priority: string): string => {
  switch (priority) {
    case 'high': return '#FF4757';
    case 'medium': return '#FFA502';
    case 'low': return '#FECA57';
    default: return '#FFA502';
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    fontSize: 20,
  },
  priority: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 16,
    height: 16,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
