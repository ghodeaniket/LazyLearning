import type {
  AgentMessage,
  AgentMessageType,
  BaseAgentMessage,
  RenderScenarioMessage,
  UserActionMessage,
  StateUpdateMessage,
  FeedbackMessage,
} from '../types/protocol';

// Simple ID generation - YAGNI: no need for complex UUID
let messageCounter = 0;
const generateMessageId = (): string => {
  return `msg-${Date.now()}-${++messageCounter}`;
};

// Parse and validate incoming messages
export function parseAgentMessage(rawMessage: unknown): AgentMessage {
  if (!rawMessage || typeof rawMessage !== 'object') {
    throw new Error('Invalid message format');
  }

  const message = rawMessage as Record<string, unknown>;

  // Validate base fields
  if (!message.type || typeof message.type !== 'string') {
    throw new Error('Missing required fields: type');
  }

  // Add missing base fields if needed
  const baseMessage: BaseAgentMessage = {
    id: message.id as string || generateMessageId(),
    type: message.type as AgentMessageType,
    timestamp: message.timestamp as number || Date.now(),
  };

  // Validate specific message types
  switch (baseMessage.type) {
    case 'render_scenario':
      return parseRenderScenarioMessage({ ...message, ...baseMessage });
    case 'user_action':
      return parseUserActionMessage({ ...message, ...baseMessage });
    case 'state_update':
      return parseStateUpdateMessage({ ...message, ...baseMessage });
    case 'feedback':
      return parseFeedbackMessage({ ...message, ...baseMessage });
    default:
      throw new Error('Invalid message format');
  }
}

function parseRenderScenarioMessage(message: any): RenderScenarioMessage {
  if (!message.concept || !message.elements || !message.layout) {
    throw new Error('Missing required fields for render_scenario');
  }

  return {
    id: message.id,
    type: 'render_scenario',
    timestamp: message.timestamp,
    concept: message.concept,
    elements: message.elements,
    layout: message.layout,
  };
}

function parseUserActionMessage(message: any): UserActionMessage {
  if (!message.action || !message.targetId) {
    throw new Error('Missing required fields for user_action');
  }

  return {
    id: message.id,
    type: 'user_action',
    timestamp: message.timestamp,
    action: message.action,
    targetId: message.targetId,
    payload: message.payload,
  };
}

function parseStateUpdateMessage(message: any): StateUpdateMessage {
  if (!message.updates) {
    throw new Error('Missing required fields for state_update');
  }

  return {
    id: message.id,
    type: 'state_update',
    timestamp: message.timestamp,
    updates: message.updates,
  };
}

function parseFeedbackMessage(message: any): FeedbackMessage {
  if (message.isCorrect === undefined || !message.message || !message.severity) {
    throw new Error('Missing required fields for feedback');
  }

  return {
    id: message.id,
    type: 'feedback',
    timestamp: message.timestamp,
    isCorrect: message.isCorrect,
    message: message.message,
    severity: message.severity,
  };
}

// Validate message structure
export function validateAgentMessage(message: unknown): message is AgentMessage {
  try {
    parseAgentMessage(message);
    return true;
  } catch {
    return false;
  }
}

// Create new messages with proper structure
export function createMessage<T extends AgentMessage>(
  messageData: Omit<T, 'id' | 'timestamp'>
): T {
  return {
    ...messageData,
    id: generateMessageId(),
    timestamp: Date.now(),
  } as T;
}
