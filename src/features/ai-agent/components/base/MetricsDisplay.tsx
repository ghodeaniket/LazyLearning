import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { DynamicComponentProps } from '../../types/renderer';

interface Metric {
  label: string;
  value: number;
  unit?: string;
  color?: string;
}

export const MetricsDisplay: React.FC<DynamicComponentProps> = ({
  element,
}) => {
  const metrics = element.props.metrics as Metric[] || [];

  return (
    <View style={styles.container} testID={`metrics-${element.id}`}>
      <Text style={styles.title}>{element.props.title || 'Metrics'}</Text>
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <MetricItem key={index} metric={metric} />
        ))}
      </View>
    </View>
  );
};

const MetricItem: React.FC<{ metric: Metric }> = ({ metric }) => {
  const animatedValue = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(metric.value, { duration: 1000 });
    width.value = withTiming(Math.min(metric.value, 100), { duration: 1000 });
  }, [metric.value, animatedValue, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.metricItem}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{metric.label}</Text>
        <Text style={styles.metricValue}>
          {metric.value}{metric.unit || ''}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            barStyle,
            { backgroundColor: metric.color || '#4CAF50' },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  metricsGrid: {
    gap: 12,
  },
  metricItem: {
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
