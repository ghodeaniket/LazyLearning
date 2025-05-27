import { ComponentRegistry } from './componentRegistry';
import {
  InteractiveServer,
  InteractivePizza,
  ConceptExplainer,
  MetricsDisplay,
} from '../components/base';

// Setup function to register all base components
export function setupBaseComponents(registry: ComponentRegistry): void {
  // Register interactive game components
  registry.register('server', InteractiveServer);
  registry.register('pizza', InteractivePizza);

  // Register learning components
  registry.register('explainer', ConceptExplainer);
  registry.register('metrics', MetricsDisplay);

  // Register aliases for flexibility
  registry.register('concept', ConceptExplainer);
  registry.register('visualization', MetricsDisplay);
}

// Create and setup a default registry
export function createDefaultRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();
  setupBaseComponents(registry);
  return registry;
}
