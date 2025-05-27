# AI Agent Learning Framework

## Overview
The AI Agent Learning Framework provides dynamic, personalized learning experiences through an intelligent agent that generates interactive scenarios based on system design concepts.

## Testing the Demo

### 1. Run the App
```bash
# iOS
npm run ios

# Android
npm run android

# or using Expo (if configured)
npx expo start
```

### 2. Navigate to AI Demo Tab
Once the app is running, you'll see a new "AI Demo" tab in the bottom navigation with a robot icon.

### 3. Demo Features

#### Load Demo Scenario
Click "Load Demo Scenario" to see:
- **Interactive Servers**: Visual representation of servers with load indicators
  - Tap servers to see info
  - Green = Low load, Yellow = Medium load, Red = High load
  
- **Draggable Pizzas**: Represent tasks/requests
  - High priority pizzas pulse
  - Drag to assign to servers
  
- **Concept Explainer**: Expandable learning content
  - Tap to expand/collapse
  - Shows tips and explanations
  
- **Live Metrics**: Real-time performance visualization
  - Animated progress bars
  - Color-coded metrics

### 4. Interactions
- **Tap** servers to get information
- **Drag** pizzas to assign them
- **Toggle** explainers for learning content
- Watch feedback messages appear after interactions

## Architecture

### Components
- `DynamicRenderer`: Renders components from agent specifications
- `ComponentRegistry`: Manages available component types
- `AgentCommunicationService`: Handles bidirectional messaging
- Base Components:
  - `InteractiveServer`: Server visualization with load
  - `InteractivePizza`: Draggable task representation
  - `ConceptExplainer`: Expandable learning content
  - `MetricsDisplay`: Real-time data visualization

### Protocol
Messages follow a structured format:
```typescript
{
  id: string,
  type: 'render_scenario' | 'user_action' | 'state_update' | 'feedback',
  timestamp: number,
  // type-specific fields
}
```

## Development

### Adding New Components
1. Create component in `components/base/`
2. Register in `componentSetup.ts`
3. Use in scenarios via type identifier

### Creating Scenarios
```typescript
const scenario: RenderScenarioMessage = {
  type: 'render_scenario',
  concept: 'your_concept',
  elements: [
    {
      id: 'unique-id',
      type: 'component-type',
      props: { /* component props */ },
      position: { x: 100, y: 200 }, // for absolute layout
      interactions: [{ type: 'tap', onAction: 'action_name' }]
    }
  ],
  layout: { type: 'absolute' } // or 'flex', 'grid'
};
```

## Features Implemented
- ✅ Dynamic component rendering
- ✅ Bidirectional agent communication
- ✅ Interactive visualizations
- ✅ Gesture support (tap, drag)
- ✅ Responsive sizing
- ✅ Smooth animations
- ✅ Offline message queuing
- ✅ Error handling

## Next Steps
- Implement Learning State Manager
- Add Agent Orchestration Logic
- Integrate LLM for dynamic content generation
- Create more concept scenarios