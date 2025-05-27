import {
  parseAgentMessage,
  validateAgentMessage,
  createMessage,
} from '../services/protocolService';
import type {
  AgentMessage,
  RenderScenarioMessage,
  UserActionMessage,
} from '../types/protocol';

describe('Agent Communication Protocol', () => {
  describe('parseAgentMessage', () => {
    it('should parse valid render_scenario message', () => {
      const rawMessage = {
        id: 'msg-123',
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

      const parsed = parseAgentMessage(rawMessage);
      expect(parsed.type).toBe('render_scenario');
      expect((parsed as RenderScenarioMessage).concept).toBe('load_balancing');
      expect((parsed as RenderScenarioMessage).elements).toHaveLength(1);
    });

    it('should handle malformed messages gracefully', () => {
      const badMessage = { type: 'unknown' };
      expect(() => parseAgentMessage(badMessage)).toThrow('Invalid message format');
    });

    it('should validate required fields', () => {
      const incompleteMessage = {
        type: 'render_scenario',
        // missing required fields
      };
      expect(() => parseAgentMessage(incompleteMessage)).toThrow('Missing required fields');
    });
  });

  describe('validateAgentMessage', () => {
    it('should validate message structure', () => {
      const validMessage: RenderScenarioMessage = {
        id: 'msg-123',
        type: 'render_scenario',
        timestamp: Date.now(),
        concept: 'load_balancing',
        elements: [],
        layout: { type: 'absolute' },
      };

      expect(validateAgentMessage(validMessage)).toBe(true);
    });

    it('should reject invalid message types', () => {
      const invalidMessage = {
        id: 'msg-123',
        type: 'invalid_type',
        timestamp: Date.now(),
      };

      expect(validateAgentMessage(invalidMessage as any)).toBe(false);
    });
  });

  describe('createMessage', () => {
    it('should create user action message with proper structure', () => {
      const message = createMessage<UserActionMessage>({
        type: 'user_action',
        action: 'drop_pizza',
        targetId: 'delivery-1',
        payload: { pizzaId: 'pizza-123' },
      });

      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
      expect(message.type).toBe('user_action');
      expect(message.action).toBe('drop_pizza');
    });

    it('should generate unique message IDs', () => {
      const msg1 = createMessage({ type: 'user_action', action: 'test', targetId: '1' });
      const msg2 = createMessage({ type: 'user_action', action: 'test', targetId: '1' });

      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('Message Queue Behavior', () => {
    it('should handle message ordering', () => {
      const messages: AgentMessage[] = [];

      // Messages should be processed in order
      const msg1 = createMessage<UserActionMessage>({
        type: 'user_action',
        action: 'action1',
        targetId: 'target1',
      });

      const msg2 = createMessage<UserActionMessage>({
        type: 'user_action',
        action: 'action2',
        targetId: 'target2',
      });

      messages.push(msg1, msg2);

      expect(messages[0].timestamp).toBeLessThanOrEqual(messages[1].timestamp);
    });
  });
});
