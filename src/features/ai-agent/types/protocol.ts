// Agent Communication Protocol Types
// Following YAGNI: Only essential message types for MVP

export type AgentMessageType = 
  | 'render_scenario'
  | 'user_action'
  | 'state_update'
  | 'feedback';

export interface BaseAgentMessage {
  id: string;
  type: AgentMessageType;
  timestamp: number;
}

// Agent -> App: Render a learning scenario
export interface RenderScenarioMessage extends BaseAgentMessage {
  type: 'render_scenario';
  concept: string;
  elements: ScenarioElement[];
  layout: LayoutSpec;
}

// App -> Agent: User performed an action
export interface UserActionMessage extends BaseAgentMessage {
  type: 'user_action';
  action: string;
  targetId: string;
  payload?: Record<string, unknown>;
}

// Agent -> App: Update learning state
export interface StateUpdateMessage extends BaseAgentMessage {
  type: 'state_update';
  updates: {
    understanding?: number; // 0-1 scale
    progress?: number; // 0-1 scale
    nextHint?: string;
  };
}

// Agent -> App: Provide feedback on action
export interface FeedbackMessage extends BaseAgentMessage {
  type: 'feedback';
  isCorrect: boolean;
  message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
}

// Scenario building blocks
export interface ScenarioElement {
  id: string;
  type: 'server' | 'pizza' | 'balancer' | 'text' | 'metric';
  props: Record<string, unknown>;
  position?: { x: number; y: number };
  interactions?: InteractionSpec[];
}

export interface InteractionSpec {
  type: 'drag' | 'tap' | 'longPress';
  onAction: string; // Action identifier for agent
}

export interface LayoutSpec {
  type: 'absolute' | 'grid' | 'flex';
  containerStyle?: Record<string, unknown>;
}

export type AgentMessage = 
  | RenderScenarioMessage 
  | UserActionMessage 
  | StateUpdateMessage 
  | FeedbackMessage;