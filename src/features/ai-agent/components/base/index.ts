// Base component library for AI Agent
// Export all interactive components

export { InteractiveServer } from './InteractiveServer';
export { InteractivePizza } from './InteractivePizza';
export { ConceptExplainer } from './ConceptExplainer';
export { MetricsDisplay } from './MetricsDisplay';

// Component type mapping for registration
export const baseComponents = {
  server: 'InteractiveServer',
  pizza: 'InteractivePizza',
  explainer: 'ConceptExplainer',
  metrics: 'MetricsDisplay',
} as const;
