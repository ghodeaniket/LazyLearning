import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, Button } from 'react-native';
import { DynamicRenderer } from '../components/DynamicRenderer';
import { AgentCommunicationService } from '../services/agentCommunicationService';
import { createDefaultRegistry } from '../services/componentSetup';
import { createMessage } from '../services/protocolService';
import type { RenderScenarioMessage, FeedbackMessage } from '../types/protocol';
import type { RenderContext } from '../types/renderer';

export const AIAgentDemo: React.FC = () => {
  const [scenario, setScenario] = useState<RenderScenarioMessage | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [registry] = useState(() => createDefaultRegistry());
  const [agentService] = useState(() => new AgentCommunicationService());

  // Demo scenarios
  const loadBalancingScenario: RenderScenarioMessage = createMessage({
    type: 'render_scenario',
    concept: 'load_balancing',
    elements: [
      {
        id: 'server-1',
        type: 'server',
        props: { capacity: 100, currentLoad: 30 },
        position: { x: 50, y: 100 },
        interactions: [{ type: 'tap', onAction: 'server_info' }],
      },
      {
        id: 'server-2',
        type: 'server',
        props: { capacity: 100, currentLoad: 70 },
        position: { x: 200, y: 100 },
        interactions: [{ type: 'tap', onAction: 'server_info' }],
      },
      {
        id: 'pizza-1',
        type: 'pizza',
        props: { priority: 'high' },
        position: { x: 125, y: 250 },
        interactions: [{ type: 'drag', onAction: 'assign_pizza' }],
      },
      {
        id: 'explainer-1',
        type: 'explainer',
        props: {
          title: 'Load Balancing',
          description: 'Distribute work evenly across servers to maximize efficiency.',
          tips: [
            'Check server loads before assignment',
            'High priority items need quick processing',
            'Balance load to prevent overload',
          ],
        },
      },
      {
        id: 'metrics-1',
        type: 'metrics',
        props: {
          title: 'System Performance',
          metrics: [
            { label: 'Server 1 Load', value: 30, unit: '%', color: '#6BCF7F' },
            { label: 'Server 2 Load', value: 70, unit: '%', color: '#FFD93D' },
            { label: 'Efficiency', value: 85, unit: '%', color: '#4CAF50' },
          ],
        },
      },
    ],
    layout: { type: 'absolute' },
  });

  const renderContext: RenderContext = {
    onInteraction: useCallback((action: string, targetId: string, payload?: any) => {
      console.log('Interaction:', { action, targetId, payload });
      
      // Send user action to agent
      agentService.sendUserAction(action, targetId, payload);
      
      // Simulate agent feedback
      const feedbackMsg: FeedbackMessage = createMessage({
        type: 'feedback',
        isCorrect: true,
        message: `Good job! You ${action} on ${targetId}`,
        severity: 'success',
      });
      
      setFeedback(feedbackMsg.message);
    }, [agentService]),
    theme: 'light',
    screenSize: { width: 400, height: 800 },
  };

  // Set up agent message handlers
  React.useEffect(() => {
    const unsubscribeScenario = agentService.onMessage('render_scenario', (msg) => {
      setScenario(msg);
    });

    const unsubscribeFeedback = agentService.onMessage('feedback', (msg) => {
      setFeedback(msg.message);
    });

    return () => {
      unsubscribeScenario();
      unsubscribeFeedback();
    };
  }, [agentService]);

  const loadDemo = () => {
    setScenario(loadBalancingScenario);
    setFeedback('Demo loaded! Try interacting with the components.');
  };

  const clearDemo = () => {
    setScenario(null);
    setFeedback('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Agent Demo</Text>
        <Text style={styles.subtitle}>Test the dynamic component system</Text>
      </View>

      <View style={styles.controls}>
        <Button title="Load Demo Scenario" onPress={loadDemo} />
        <Button title="Clear" onPress={clearDemo} />
      </View>

      {feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      {scenario && (
        <View style={styles.scenarioContainer}>
          <DynamicRenderer
            scenario={scenario}
            registry={registry}
            context={renderContext}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  feedbackContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  feedbackText: {
    color: '#2e7d32',
    fontSize: 14,
  },
  scenarioContainer: {
    minHeight: 600,
    padding: 20,
  },
});