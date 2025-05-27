// Dynamic Component Renderer Types
// YAGNI: Only essential rendering capabilities for MVP

import type { ScenarioElement, LayoutSpec } from './protocol';

export interface ComponentRegistry {
  [key: string]: React.ComponentType<any>;
}

export interface RenderContext {
  onInteraction: (action: string, targetId: string, payload?: any) => void;
  theme: 'light' | 'dark';
  screenSize: { width: number; height: number };
}

export interface DynamicComponentProps {
  element: ScenarioElement;
  context: RenderContext;
}

export interface LayoutEngineProps {
  elements: ScenarioElement[];
  layout: LayoutSpec;
  context: RenderContext;
}
