#!/usr/bin/env node

/**
 * Simple script to create GitHub issues without project linking
 * Use this if the main script has issues with project linking
 */

const { execSync } = require('child_process');

console.log('🚀 Creating GitHub issues for LazyLearner MVP Phase 1...\n');
console.log('ℹ️  Note: Issues will be created without project board linking.');
console.log('   You can manually add them to the project board later.\n');

// First, let's check if milestones exist
try {
  console.log('📋 Checking milestones...');
  execSync('gh api repos/:owner/:repo/milestones', { stdio: 'inherit' });
  console.log('✅ Milestones found\n');
} catch (error) {
  console.log('⚠️  No milestones found. Run setup-github-project.sh first!\n');
  process.exit(1);
}

const issues = [
  // Sprint 1-2: Authentication
  {
    title: '[TEST] E2E tests for authentication flow',
    body: `## Test Description
Write comprehensive E2E tests for the authentication flow following TDD principles.

## Test Cases
- [ ] Test successful signup with valid email/password
- [ ] Test signup validation (invalid email, weak password)
- [ ] Test successful login
- [ ] Test login with invalid credentials
- [ ] Test offline authentication
- [ ] Test session persistence across app restarts
- [ ] Test logout functionality

## Coverage Goals
Target 90% coverage for auth flow

## Related Features
- Email/password authentication
- Offline login capability
- Session management`,
    labels: 'test,auth,high-priority',
    milestone: 'Phase 1 - Sprint 1-2',
  },
  {
    title: '[FEATURE] Email/password authentication',
    body: `## Feature Description
Implement email/password authentication using Firebase Auth.

## User Story
As a user, I want to sign up and log in with my email and password so that I can access my personalized learning content.

## Acceptance Criteria
- [ ] User can sign up with email and password
- [ ] Email validation is implemented
- [ ] Password strength requirements (min 8 chars, 1 uppercase, 1 number)
- [ ] User can log in with existing credentials
- [ ] Proper error messages for invalid inputs
- [ ] Loading states during auth operations

## Technical Details
- Use Firebase Auth SDK
- Implement proper error handling
- Store auth tokens securely
- Follow React Native best practices for forms`,
    labels: 'feature,auth,high-priority',
    milestone: 'Phase 1 - Sprint 1-2',
  },
  {
    title: '[FEATURE] Offline login capability',
    body: `## Feature Description
Enable users to access the app offline using cached credentials.

## User Story
As a user, I want to access the app even when offline so that I can continue learning without internet.

## Acceptance Criteria
- [ ] Credentials are securely cached after first login
- [ ] User can access app offline if previously logged in
- [ ] Offline session expires after 7 days
- [ ] Sync user data when connection restored
- [ ] Clear indication of offline mode

## Technical Details
- Use encrypted AsyncStorage for credentials
- Implement offline session validation
- Handle sync conflicts gracefully`,
    labels: 'feature,auth,medium-priority',
    milestone: 'Phase 1 - Sprint 1-2',
  },
  {
    title: '[FEATURE] Basic user profile',
    body: `## Feature Description
Create a basic user profile screen with edit functionality.

## User Story
As a user, I want to view and edit my profile information so that I can personalize my learning experience.

## Acceptance Criteria
- [ ] Display user email and name
- [ ] Allow editing of display name
- [ ] Show learning statistics (streak, points)
- [ ] Profile picture upload (Phase 2)
- [ ] Preference settings (theme, notifications)

## Technical Details
- Create ProfileScreen component
- Use Redux for state management
- Implement form validation
- Store preferences locally`,
    labels: 'feature,auth,medium-priority',
    milestone: 'Phase 1 - Sprint 1-2',
  },

  // Sprint 3-4: Game
  {
    title: '[TEST] Game mechanics unit tests',
    body: `## Test Description
Comprehensive unit tests for Pizza Load Balancer game mechanics.

## Test Cases
- [ ] Score calculation for different scenarios
- [ ] Game over conditions (all servers overloaded)
- [ ] Difficulty progression logic
- [ ] Pizza delivery mechanics
- [ ] Server load calculations
- [ ] Time bonus calculations
- [ ] High score tracking

## Coverage Goals
Target 100% coverage for game logic

## Dependencies
- gameUtils.ts (already created)
- Game state management (to be implemented)`,
    labels: 'test,game,high-priority',
    milestone: 'Phase 1 - Sprint 3-4',
  },
  {
    title: '[FEATURE] Drag-and-drop pizza mechanics',
    body: `## Feature Description
Implement smooth drag-and-drop functionality for pizza delivery game.

## User Story
As a player, I want to drag pizzas to servers intuitively so that the game feels responsive and fun.

## Acceptance Criteria
- [ ] Smooth dragging with visual feedback
- [ ] Drop zones clearly indicated
- [ ] Invalid drop handling
- [ ] Touch and gesture support
- [ ] Visual feedback for successful delivery
- [ ] Animated pizza movement

## Technical Details
- Use React Native Gesture Handler
- Implement with Reanimated 3 for 60fps
- Handle multi-touch scenarios
- Accessibility considerations`,
    labels: 'feature,game,high-priority',
    milestone: 'Phase 1 - Sprint 3-4',
  },
  {
    title: '[FEATURE] Game scoring system',
    body: `## Feature Description
Implement comprehensive scoring system for the Pizza Load Balancer game.

## User Story
As a player, I want to see my score and track my progress so that I feel motivated to improve.

## Acceptance Criteria
- [ ] Real-time score display
- [ ] Points for successful deliveries
- [ ] Time bonus system
- [ ] Difficulty multipliers
- [ ] High score tracking (local)
- [ ] Score breakdown at game end

## Technical Details
- Use existing gameUtils functions
- Store high scores in AsyncStorage
- Implement score animations
- Create ScoreDisplay component`,
    labels: 'feature,game,high-priority',
    milestone: 'Phase 1 - Sprint 3-4',
  },
  {
    title: '[FEATURE] Three difficulty levels',
    body: `## Feature Description
Implement three distinct difficulty levels for the game.

## User Story
As a player, I want to choose difficulty levels so that I can play at my skill level.

## Acceptance Criteria
- [ ] Easy: 3 servers, 1 pizza/3 sec, 5 min duration
- [ ] Medium: 4 servers, 1 pizza/2 sec, 4 min duration
- [ ] Hard: 5 servers, 1 pizza/1 sec, 3 min duration
- [ ] Difficulty selection screen
- [ ] Different score multipliers per difficulty
- [ ] Visual indicators for difficulty

## Technical Details
- Create DifficultySelector component
- Adjust game parameters dynamically
- Store preferred difficulty
- Implement gradual difficulty increase`,
    labels: 'feature,game,medium-priority',
    milestone: 'Phase 1 - Sprint 3-4',
  },

  // Sprint 5-6: Learning
  {
    title: '[TEST] Content delivery tests',
    body: `## Test Description
Test the learning content delivery system including offline access.

## Test Cases
- [ ] Content loading from CDN
- [ ] Offline content availability
- [ ] Progress tracking accuracy
- [ ] Quiz functionality
- [ ] Content versioning
- [ ] Sync conflict resolution

## Coverage Goals
Target 85% coverage for content system

## Test Types
- Unit tests for content parsing
- Integration tests for offline sync
- E2E tests for learning flow`,
    labels: 'test,learning,high-priority',
    milestone: 'Phase 1 - Sprint 5-6',
  },
  {
    title: '[FEATURE] Core learning modules',
    body: `## Feature Description
Implement the three core learning modules with micro-lessons.

## User Story
As a learner, I want to access structured content about scaling concepts so that I can learn effectively.

## Modules
1. **Load Balancing Basics**
   - What is load balancing?
   - Types of load balancers
   - Real-world examples

2. **Caching Fundamentals**
   - Why caching matters
   - Cache strategies
   - Common pitfalls

3. **Database Scaling**
   - Vertical vs horizontal scaling
   - Sharding basics
   - Read replicas

## Acceptance Criteria
- [ ] 5-minute micro-lessons
- [ ] Interactive examples
- [ ] Progress indicators
- [ ] Offline availability`,
    labels: 'feature,learning,high-priority',
    milestone: 'Phase 1 - Sprint 5-6',
  },
  {
    title: '[FEATURE] Progress tracking',
    body: `## Feature Description
Implement comprehensive progress tracking for learning modules.

## User Story
As a learner, I want to see my learning progress so that I know what I've completed and what's next.

## Acceptance Criteria
- [ ] Track completed lessons
- [ ] Calculate learning streaks
- [ ] Show module completion percentage
- [ ] Daily learning goals
- [ ] Visual progress indicators
- [ ] Streak notifications

## Technical Details
- Store progress in local database
- Sync with Firebase when online
- Create ProgressTracker component
- Implement streak calculation logic`,
    labels: 'feature,learning,high-priority',
    milestone: 'Phase 1 - Sprint 5-6',
  },
  {
    title: '[FEATURE] Simple quiz system',
    body: `## Feature Description
Create a simple quiz system to reinforce learning.

## User Story
As a learner, I want to test my knowledge after lessons so that I can verify my understanding.

## Acceptance Criteria
- [ ] Multiple choice questions (4 options)
- [ ] Immediate feedback on answers
- [ ] Explanation for correct answers
- [ ] Score tracking per quiz
- [ ] Retry functionality
- [ ] 5 questions per module

## Technical Details
- Create Quiz component
- Store questions in JSON format
- Track quiz scores
- Implement question randomization`,
    labels: 'feature,learning,medium-priority',
    milestone: 'Phase 1 - Sprint 5-6',
  },
];

let successCount = 0;
let failCount = 0;

issues.forEach((issue, index) => {
  try {
    const command = `gh issue create --title "${issue.title}" --body "${issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --label "${issue.labels}" --milestone "${issue.milestone}"`;

    console.log(`Creating issue ${index + 1}/${issues.length}: ${issue.title}`);
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Created successfully\n');
    successCount++;

    // Add a small delay to avoid rate limiting
    execSync('sleep 1');
  } catch (error) {
    console.error(`❌ Failed to create issue: ${issue.title}`);
    console.error(error.message);
    failCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`   ✅ Successfully created: ${successCount} issues`);
console.log(`   ❌ Failed: ${failCount} issues`);

if (successCount > 0) {
  console.log('\n💡 Next steps:');
  console.log('   1. Visit https://github.com/ghodeaniket/LazyLearning/issues');
  console.log('   2. Manually add issues to your project board if needed');
  console.log('   3. Start working on Sprint 1-2: Authentication!');
}
