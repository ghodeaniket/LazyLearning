import { AgentCommunicationService } from '../services/agentCommunicationService';
import type {
  RenderScenarioMessage,
  UserActionMessage,
  StateUpdateMessage,
  FeedbackMessage,
} from '../types/protocol';

describe('AgentCommunicationService', () => {
  let service: AgentCommunicationService;

  beforeEach(() => {
    service = new AgentCommunicationService();
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Message Handling', () => {
    it('should handle incoming render_scenario messages', (done) => {
      const testMessage: RenderScenarioMessage = {
        id: 'test-1',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [
          {
            id: 'server-1',
            type: 'server',
            props: { capacity: 100 },
          },
        ],
        layout: { type: 'absolute' },
      };

      service.onMessage('render_scenario', (message) => {
        expect(message).toEqual(testMessage);
        done();
      });

      service.simulateIncomingMessage(testMessage);
    });

    it('should send user action messages', () => {
      const mockSend = jest.fn();
      service.setSendHandler(mockSend);

      const action: Omit<UserActionMessage, 'id' | 'timestamp'> = {
        type: 'user_action',
        action: 'drop_pizza',
        targetId: 'delivery-1',
        payload: { pizzaId: 'pizza-123' },
      };

      service.sendUserAction(action.action, action.targetId, action.payload);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_action',
          action: 'drop_pizza',
          targetId: 'delivery-1',
        })
      );
    });
  });

  describe('State Synchronization', () => {
    it('should maintain message order', () => {
      const messages: any[] = [];

      service.onMessage('state_update', (message) => {
        messages.push(message);
      });

      const update1: StateUpdateMessage = {
        id: 'update-1',
        type: 'state_update',
        timestamp: 1000,
        updates: { progress: 0.3 },
      };

      const update2: StateUpdateMessage = {
        id: 'update-2',
        type: 'state_update',
        timestamp: 2000,
        updates: { progress: 0.6 },
      };

      service.simulateIncomingMessage(update1);
      service.simulateIncomingMessage(update2);

      expect(messages[0].timestamp).toBeLessThan(messages[1].timestamp);
      expect(messages[0].updates.progress).toBe(0.3);
      expect(messages[1].updates.progress).toBe(0.6);
    });

    it('should handle feedback messages', (done) => {
      const feedbackMessage: FeedbackMessage = {
        id: 'feedback-1',
        type: 'feedback',
        timestamp: Date.now(),
        isCorrect: true,
        message: 'Great job!',
        severity: 'success',
      };

      service.onMessage('feedback', (message) => {
        expect(message.isCorrect).toBe(true);
        expect(message.severity).toBe('success');
        done();
      });

      service.simulateIncomingMessage(feedbackMessage);
    });
  });

  describe('Connection Management', () => {
    it('should track connection state', () => {
      expect(service.isConnected()).toBe(true);

      service.disconnect();
      expect(service.isConnected()).toBe(false);

      service.connect();
      expect(service.isConnected()).toBe(true);
    });

    it('should queue messages when disconnected', () => {
      const mockSend = jest.fn();
      service.setSendHandler(mockSend);

      service.disconnect();

      service.sendUserAction('test', 'target-1');
      expect(mockSend).not.toHaveBeenCalled();

      service.connect();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_action',
          action: 'test',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', () => {
      const errorHandler = jest.fn();
      service.onError(errorHandler);

      const malformedMessage = { type: 'unknown' };
      service.simulateIncomingMessage(malformedMessage as any);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid message'),
        })
      );
    });

    it('should continue processing after errors', () => {
      const validHandler = jest.fn();
      service.onMessage('feedback', validHandler);

      // Send invalid message first
      service.simulateIncomingMessage({ type: 'invalid' } as any);

      // Then send valid message
      const validMessage: FeedbackMessage = {
        id: 'test',
        type: 'feedback',
        timestamp: Date.now(),
        isCorrect: true,
        message: 'Test',
        severity: 'info',
      };
      service.simulateIncomingMessage(validMessage);

      expect(validHandler).toHaveBeenCalled();
    });
  });
});
