import {
  parseAgentMessage,
  createMessage,
} from './protocolService';
import type {
  AgentMessage,
  AgentMessageType,
  UserActionMessage,
} from '../types/protocol';

type MessageHandler<T extends AgentMessage> = (message: T) => void;
type ErrorHandler = (error: Error) => void;
type SendHandler = (message: AgentMessage) => void;

interface QueuedMessage {
  message: AgentMessage;
  timestamp: number;
}

export class AgentCommunicationService {
  private connected = true;
  private messageQueue: QueuedMessage[] = [];
  private handlers: Map<AgentMessageType, MessageHandler<any>[]> = new Map();
  private errorHandlers: ErrorHandler[] = [];
  private sendHandler: SendHandler | null = null;

  constructor() {
    // Initialize handlers map
    const messageTypes: AgentMessageType[] = ['render_scenario', 'user_action', 'state_update', 'feedback'];
    messageTypes.forEach(type => this.handlers.set(type, []));
  }

  // Connection management
  connect(): void {
    this.connected = true;
    this.flushQueue();
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Message handling
  onMessage<T extends AgentMessage>(
    type: T['type'],
    handler: MessageHandler<T>
  ): () => void {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);

    // Return unsubscribe function
    return () => {
      const updatedHandlers = this.handlers.get(type) || [];
      const index = updatedHandlers.indexOf(handler);
      if (index > -1) {
        updatedHandlers.splice(index, 1);
      }
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);

    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  setSendHandler(handler: SendHandler): void {
    this.sendHandler = handler;
  }

  // Send messages
  sendUserAction(action: string, targetId: string, payload?: Record<string, unknown>): void {
    const message = createMessage<UserActionMessage>({
      type: 'user_action',
      action,
      targetId,
      payload,
    });

    this.sendMessage(message);
  }

  // Simulate incoming messages (for testing and development)
  simulateIncomingMessage(rawMessage: unknown): void {
    try {
      const message = parseAgentMessage(rawMessage);
      this.handleIncomingMessage(message);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  // Private methods
  private sendMessage(message: AgentMessage): void {
    if (!this.connected) {
      this.queueMessage(message);
      return;
    }

    if (this.sendHandler) {
      this.sendHandler(message);
    }
  }

  private queueMessage(message: AgentMessage): void {
    this.messageQueue.push({
      message,
      timestamp: Date.now(),
    });
  }

  private flushQueue(): void {
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(({ message }) => {
      if (this.sendHandler) {
        this.sendHandler(message);
      }
    });
  }

  private handleIncomingMessage(message: AgentMessage): void {
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.handleError(error as Error);
      }
    });
  }

  private handleError(error: Error): void {
    const wrappedError = new Error(`Invalid message: ${error.message}`);
    this.errorHandlers.forEach(handler => handler(wrappedError));
  }
}
