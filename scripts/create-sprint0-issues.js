#!/usr/bin/env node

/**
 * Script to create Sprint 0 (Infrastructure) issues for LazyLearner
 * These are the missing infrastructure tasks from Phase 1
 */

const { execSync } = require('child_process');

console.log('🏗️  Creating Sprint 0 Infrastructure Issues...\n');

const sprint0Issues = [
  {
    title: '[CHORE] Firebase project configuration',
    body: `## Task Description
Set up Firebase project and configure all necessary services for the LazyLearner MVP.

## Checklist
- [ ] Create Firebase project in console
- [ ] Install Firebase SDK and dependencies
- [ ] Configure Firebase in React Native app
- [ ] Set up environment variables for dev/staging/prod
- [ ] Configure Firebase for iOS (GoogleService-Info.plist)
- [ ] Configure Firebase for Android (google-services.json)
- [ ] Test Firebase connection

## Services to Enable
- Authentication
- Firestore Database
- Cloud Functions
- Analytics
- Crashlytics

## Documentation
- Document Firebase setup in README
- Add environment setup guide
- Create Firebase security rules`,
    labels: 'chore,high-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[FEATURE] Firestore database with offline persistence',
    body: `## Feature Description
Configure Firestore database with offline persistence for seamless offline experience.

## Requirements
- [ ] Enable Firestore in Firebase console
- [ ] Configure offline persistence
- [ ] Design database schema for users, progress, and scores
- [ ] Implement data models
- [ ] Create Firestore service layer
- [ ] Add sync conflict resolution
- [ ] Test offline/online transitions

## Database Collections
1. **users**
   - Profile data
   - Preferences
   - Authentication info

2. **progress**
   - Learning progress
   - Completed modules
   - Quiz scores

3. **gameScores**
   - High scores per game
   - Statistics
   - Achievements

## Technical Details
- Use Firestore offline persistence
- Implement optimistic updates
- Handle network state changes
- Add data validation rules`,
    labels: 'feature,high-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[CHORE] Cloud Functions setup for backend',
    body: `## Task Description
Set up Cloud Functions for serverless backend operations.

## Functions to Implement
- [ ] User registration webhook
- [ ] Score validation and leaderboard updates
- [ ] Progress sync function
- [ ] Content delivery API
- [ ] Analytics aggregation

## Setup Tasks
- [ ] Initialize Cloud Functions in project
- [ ] Configure TypeScript for functions
- [ ] Set up local emulator for testing
- [ ] Create deployment scripts
- [ ] Configure environment variables
- [ ] Set up function triggers

## Security
- Implement request validation
- Add rate limiting
- Configure CORS properly
- Add authentication checks`,
    labels: 'chore,high-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[CHORE] Sentry error tracking integration',
    body: `## Task Description
Integrate Sentry for comprehensive error tracking and monitoring.

## Implementation
- [ ] Create Sentry project
- [ ] Install Sentry React Native SDK
- [ ] Configure for iOS and Android
- [ ] Set up source maps
- [ ] Configure error boundaries
- [ ] Add performance monitoring
- [ ] Set up release tracking

## Configuration
- Different DSNs for dev/staging/prod
- User context tracking
- Breadcrumb configuration
- Filtering sensitive data
- Alert rules setup

## Testing
- Test crash reporting
- Verify source maps work
- Check performance tracking
- Validate user privacy`,
    labels: 'chore,medium-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[CHORE] Firebase Analytics setup',
    body: `## Task Description
Implement Firebase Analytics for user behavior tracking.

## Events to Track
- [ ] App launches
- [ ] Screen views
- [ ] Game sessions (start, complete, score)
- [ ] Learning module progress
- [ ] Quiz completions
- [ ] User engagement metrics

## Implementation
- [ ] Install Firebase Analytics
- [ ] Create analytics service
- [ ] Define custom events
- [ ] Add screen tracking
- [ ] Configure user properties
- [ ] Set up conversion events

## Privacy
- Implement opt-out mechanism
- Document data collection
- GDPR compliance checks`,
    labels: 'chore,medium-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[FEATURE] JWT token management system',
    body: `## Feature Description
Implement secure JWT token management for authentication.

## Requirements
- [ ] Token generation in Cloud Functions
- [ ] Secure token storage in app
- [ ] Token refresh mechanism
- [ ] Token expiration handling
- [ ] Logout token cleanup
- [ ] Multi-device token management

## Implementation
- [ ] Create token service
- [ ] Implement secure storage using Keychain/Keystore
- [ ] Add token interceptor for API calls
- [ ] Handle 401 responses
- [ ] Implement refresh flow
- [ ] Add token validation

## Security
- Use secure storage APIs
- Implement token rotation
- Add device fingerprinting
- Monitor suspicious activity`,
    labels: 'feature,auth,high-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[FEATURE] Encrypted local storage setup',
    body: `## Feature Description
Implement encrypted storage for sensitive data.

## Requirements
- [ ] Research and choose encryption library
- [ ] Implement encryption service
- [ ] Secure storage for credentials
- [ ] Encrypted game progress cache
- [ ] Secure preference storage
- [ ] Migration strategy for updates

## Implementation
- [ ] Use react-native-keychain for credentials
- [ ] Implement encryption wrapper for AsyncStorage
- [ ] Create secure storage API
- [ ] Add data migration utilities
- [ ] Test on iOS and Android
- [ ] Performance benchmarking

## Security Considerations
- Key generation and management
- Encryption algorithm selection
- IV handling
- Data integrity checks`,
    labels: 'feature,high-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[FEATURE] API rate limiting implementation',
    body: `## Feature Description
Implement rate limiting for API security and resource management.

## Requirements
- [ ] Client-side rate limiting
- [ ] Server-side rate limiting in Cloud Functions
- [ ] Different limits per endpoint
- [ ] User-based quotas
- [ ] Grace period handling
- [ ] Rate limit headers

## Implementation
- [ ] Create rate limiting middleware
- [ ] Implement token bucket algorithm
- [ ] Add Redis for distributed limiting
- [ ] Configure per-user limits
- [ ] Add monitoring and alerts
- [ ] Create admin override mechanism

## User Experience
- Show remaining quota to users
- Graceful degradation
- Offline queue for rate-limited requests
- Clear error messages`,
    labels: 'feature,medium-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
  {
    title: '[TEST] Infrastructure integration tests',
    body: `## Test Description
Comprehensive tests for all infrastructure components.

## Test Coverage
- [ ] Firebase connection tests
- [ ] Offline/online transition tests
- [ ] Authentication flow tests
- [ ] Error tracking verification
- [ ] Analytics event tests
- [ ] Security tests

## Test Types
1. **Integration Tests**
   - Firebase service integration
   - Offline sync scenarios
   - Authentication flows
   - Error reporting

2. **Security Tests**
   - Token expiration
   - Encryption/decryption
   - Rate limiting
   - Data privacy

3. **Performance Tests**
   - Startup time with Firebase
   - Offline data access speed
   - Sync performance

## Automation
- Add to CI/CD pipeline
- Nightly security scans
- Performance benchmarks`,
    labels: 'test,high-priority',
    milestone: 'Phase 1 - Sprint 0',
  },
];

let successCount = 0;
let failCount = 0;

// First check if Sprint 0 milestone exists
console.log('Checking for Sprint 0 milestone...');
try {
  execSync('gh api repos/:owner/:repo/milestones | grep "Phase 1 - Sprint 0"', { stdio: 'pipe' });
  console.log('✅ Sprint 0 milestone found\n');
} catch {
  console.log('❌ Sprint 0 milestone not found. Creating it...');
  try {
    execSync('gh api repos/:owner/:repo/milestones --method POST -f title="Phase 1 - Sprint 0" -f description="Project Setup & Infrastructure" -f due_on="2025-06-08T00:00:00Z"', { stdio: 'pipe' });
    console.log('✅ Sprint 0 milestone created\n');
  } catch (error) {
    console.error('Failed to create milestone:', error.message);
  }
}

sprint0Issues.forEach((issue, index) => {
  try {
    // Create without milestone for now
    const command = `gh issue create --title "${issue.title}" --body "${issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --label "${issue.labels}"`;

    console.log(`Creating issue ${index + 1}/${sprint0Issues.length}: ${issue.title}`);
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
console.log(`   ✅ Successfully created: ${successCount} Sprint 0 issues`);
console.log(`   ❌ Failed: ${failCount} issues`);

if (successCount > 0) {
  console.log('\n🎯 Sprint 0 Status:');
  console.log('   ✅ Project structure and dependencies (Already done)');
  console.log('   ✅ Testing framework setup (Already done)');
  console.log('   ✅ CI/CD pipeline (Already done)');
  console.log('   📋 Firebase and cloud infrastructure (New issues created)');
  console.log('   📋 Security implementations (New issues created)');
  console.log('\n⚠️  Note: Sprint 0 milestone needs to be created manually:');
  console.log('   gh api repos/:owner/:repo/milestones --method POST \\');
  console.log('     -f title="Phase 1 - Sprint 0" \\');
  console.log('     -f description="Project Setup & Infrastructure (Week 1-2)" \\');
  console.log('     -f due_on="2025-06-08T00:00:00Z"');
  console.log('\n💡 Next: Complete these infrastructure tasks before starting Sprint 1-2!');
}
