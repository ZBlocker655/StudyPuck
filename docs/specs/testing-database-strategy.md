# Testing Strategy & Database Operations

## Project Context
StudyPuck requires a testing strategy that supports the SvelteKit + Cloudflare D1 + Auth.js stack while enabling confident database migrations and reliable CI/CD pipelines. The approach should handle both unit/integration testing and database-specific testing challenges.

## Testing Strategy Questions

### Question 1: Testing Philosophy & Scope
✅ **Decision**: Comprehensive testing with testable code design

**Selected approach**:
- **Unit tests**: Utilities, pure functions, business logic (SRS algorithm, language processing)
- **Integration tests**: Database operations, API routes, auth flows
- **UI/Component tests**: Svelte components, user interactions, form validation
- **E2E tests**: Critical user journeys (login → create card → review card)

**Philosophy**: Code designed for testability without strict TDD discipline
- **Testable architecture**: Separate business logic from UI components
- **Dependency injection**: Easy mocking of external services
- **Pure functions**: Predictable, easy-to-test utilities

**Learning benefits**:
- **Modern testing patterns**: Component testing, integration testing
- **Test-driven thinking**: Design for testability
- **Confidence building**: Safe refactoring and feature additions
- **Professional practices**: Industry-standard testing approaches

**Timeline impact**: +1-2 weeks for test setup and initial test suite, ongoing time investment per feature

### Question 2: Testing Framework Selection
✅ **Decision**: Vitest + Playwright

**Selected combination**:
- **Vitest**: Unit and integration testing
  - SvelteKit native integration
  - Lightning-fast test execution
  - Excellent TypeScript support
  - Hot module replacement for tests
  - Built-in mocking capabilities

- **Playwright**: E2E and component testing
  - Cross-browser testing (Chrome, Firefox, Safari)
  - Component testing for Svelte components
  - Powerful debugging and tracing
  - Auto-waiting and reliable selectors
  - API testing capabilities

**Architecture benefits**:
- **Best of both worlds**: Specialized tools for different testing layers
- **Modern ecosystem**: Latest testing technologies and patterns
- **TypeScript first**: Full type safety across test suites
- **Developer experience**: Excellent debugging and development workflow

**Learning opportunities**:
- **Vitest**: Modern unit testing patterns, mocking strategies
- **Playwright**: E2E testing best practices, browser automation
- **Integration**: How different testing tools work together

### Question 3: Database Testing Strategy
**How should Cloudflare D1 (SQLite) database operations be tested?**

**Database Testing Challenges**:
- **D1 vs SQLite**: Production uses D1, development uses local SQLite
- **Edge runtime**: Limited testing tools in Workers environment  
- **Test isolation**: Each test needs clean database state
- **Migration testing**: Schema changes and data integrity validation

**Database Testing Approaches**:

#### Option A: In-Memory SQLite (Fast & Isolated)
- **Setup**: Use sqlite3 `:memory:` database for tests
- **Benefits**: Extremely fast, perfect isolation, no file cleanup
- **Trade-offs**: Not identical to D1, memory-only (no persistence testing)

#### Option B: File-Based Test Databases  
- **Setup**: Create separate `.test.db` files per test suite
- **Benefits**: Closer to production, can test file operations
- **Trade-offs**: Slower than memory, requires cleanup between tests

#### Option C: D1 Local Simulator (Most Realistic)
- **Setup**: Use Wrangler's local D1 emulation for tests
- **Benefits**: Closest to production environment
- **Trade-offs**: Slower setup, requires Wrangler in test environment

#### Option D: Hybrid Approach (Recommended with Caveats)
✅ **Selected approach for StudyPuck**

**SQLite vs D1 Compatibility Analysis**:
Based on research, there are **some important differences** between SQLite and D1:

**Key Differences**:
- **API Access**: D1 uses HTTP API/Worker bindings, SQLite uses direct drivers
- **Feature Support**: Some SQLite extensions (FTS5, custom collations) may not be available in D1
- **Performance**: D1 has network latency, charges per row read (expensive COUNT queries)
- **Size Limits**: D1 has 10GB recommended limit, SQLite is disk-limited
- **Import/Export**: D1 requires SQL dumps, no direct .sqlite file import/export

**Recommended Strategy**:
- **Unit tests**: Use **D1 local simulator** instead of pure SQLite to match production environment
- **Integration tests**: D1 local simulator for realistic API testing
- **Avoid**: In-memory SQLite for database logic tests (too divergent from D1)

**Why this approach**:
- **Consistency**: Same D1 behavior in unit and integration tests
- **Confidence**: Tests match production environment more closely
- **Learning value**: Experience with D1-specific patterns and limitations
- **Safety**: Avoid false positives from SQLite/D1 differences

**Implementation**:
```javascript
// Use Wrangler D1 simulator for all database tests
beforeEach(async () => {
  // Reset D1 test database state
  await d1TestDb.exec('DELETE FROM cards; DELETE FROM users;');
});
```

✅ **Decision**: D1 local simulator for all database tests (unit and integration)

**Final Database Testing Strategy**:
- **All database tests**: Use Wrangler D1 local simulator  
- **Rationale**: Avoid SQLite/D1 compatibility issues that could create false test confidence
- **Implementation**: Reset D1 test database state between tests
- **Benefits**: Consistent behavior, realistic testing, D1-specific learning

### Question 4: Authentication Testing
**How should Auth0 + Auth.js authentication be tested?**

**Auth Testing Challenges**:
- **External service**: Auth0 dependency for integration tests
- **Session management**: Testing Auth.js session flows
- **Protected routes**: Testing authenticated vs unauthenticated access
- **Token handling**: JWT validation and refresh logic

**Auth Testing Approaches**:

#### Option A: Mock Auth0 (Fast Unit Tests)
- **Mock authentication responses** for isolated component tests
- **Benefits**: Fast, no external dependencies, predictable
- **Use for**: Component tests, utility function tests

#### Option B: Test Auth0 Tenant (Realistic Integration)
- **Dedicated Auth0 environment** for testing with real flows
- **Benefits**: Tests real authentication behavior
- **Use for**: E2E tests, integration tests

#### Option C: Session Mocking (Component Testing)
- **Mock Auth.js sessions** for component and page tests
- **Benefits**: Test protected routes without full auth flow
- **Use for**: Component behavior testing

#### Option D: Hybrid Approach (Recommended)
✅ **Selected approach for StudyPuck**

**Authentication Testing Strategy**:
- **Unit tests**: Mock Auth0 responses and Auth.js sessions
- **Integration tests**: Use test Auth0 tenant for realistic flows  
- **E2E tests**: Full authentication flows with real Auth0
- **Component tests**: Mock sessions for protected UI components

**Why hybrid approach**:
- **Speed**: Mocked auth for fast feedback during development
- **Confidence**: Real Auth0 flows catch integration issues
- **Learning value**: Experience with both mocking strategies and real auth flows
- **Cost effective**: Minimize Auth0 test tenant usage while maintaining coverage

**Detailed Implementation Strategy**:

**1. Unit Tests (Mocked Auth)**:
```javascript
// Mock Auth.js session for component tests
const mockSession = {
  user: { id: 'test-user', email: 'test@example.com' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// Test protected components
test('study deck requires authentication', async () => {
  render(StudyDeck, { session: null });
  expect(screen.getByText('Please sign in')).toBeInTheDocument();
});
```

**2. Integration Tests (Test Auth0 Tenant)**:
```javascript
// Test API routes with real Auth0 JWT validation
test('POST /api/cards requires valid auth', async () => {
  const token = await getTestAuth0Token();
  const response = await fetch('/api/cards', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.status).toBe(200);
});
```

**3. E2E Tests (Full Auth Flows)**:
```javascript
// Test complete authentication user journey
test('user can sign in and create a study card', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Sign In');
  await page.fill('#email', process.env.TEST_USER_EMAIL);
  await page.fill('#password', process.env.TEST_USER_PASSWORD);
  await page.click('#submit');
  
  // Test authenticated functionality
  await expect(page.locator('text=Create New Card')).toBeVisible();
});
```

**Auth Testing Architecture**:

**Test Utilities**:
- **Mock session helper**: Consistent mock sessions across tests
- **Test token generator**: Helper for creating valid test JWTs  
- **Auth state utilities**: Setup/teardown authenticated test states

**Test Auth0 Tenant Setup**:
- **Dedicated tenant**: `studypuck-test.auth0.com`
- **Test users**: Predefined users for consistent E2E testing
- **Limited scope**: Minimal configuration to reduce complexity

**Session Mocking Patterns**:
- **Component isolation**: Mock sessions for UI component tests
- **Route protection**: Test unauthorized access handling
- **Role-based testing**: Mock different user roles/permissions

**Benefits of this approach**:
- **Fast development**: Mocked tests provide immediate feedback
- **Integration confidence**: Real Auth0 tests catch configuration issues  
- **Learning opportunity**: Experience with authentication testing patterns
- **Maintainable**: Clear separation between mock and integration tests
- **CI/CD friendly**: Fast mocked tests, selective integration test runs

✅ **Decision**: Hybrid authentication testing approach
- **Fast feedback**: Mocked auth for unit and component tests
- **Integration confidence**: Test Auth0 tenant for realistic flows
- **Complete coverage**: E2E tests with full authentication user journeys

### Question 3: Database Testing Strategy
**How should database operations and migrations be tested with Cloudflare D1?**

**Database Testing Challenges**:
- **D1 is SQLite**: Local development vs production differences
- **Edge runtime**: Limited testing tools for Workers environment
- **Migrations**: Testing schema changes and data integrity
- **Isolation**: Test database setup and teardown

**Database Testing Approaches**:
- **In-memory SQLite**: Fast tests with sqlite3 `:memory:`
- **File-based test DB**: Separate test database file per test suite
- **D1 local simulator**: Use Wrangler's local D1 emulation
- **Mock database**: Mock all database calls for unit tests

### Question 4: Authentication Testing
**How should Auth0 + Auth.js authentication be tested?**

**Auth Testing Challenges**:
- **External service**: Auth0 dependency for integration tests
- **Session management**: Testing Auth.js session flows
- **Protected routes**: Testing authenticated vs unauthenticated access
- **Token handling**: JWT validation and refresh logic

**Auth Testing Approaches**:
- **Mock Auth0**: Mock authentication responses for fast tests
- **Test Auth0 tenant**: Dedicated Auth0 environment for testing
- **Session mocking**: Mock Auth.js sessions for component tests
- **E2E auth flows**: Real authentication in end-to-end tests

### Question 5: CI/CD Integration
**How should testing integrate with the GitHub + Cloudflare Pages deployment pipeline?**

**CI/CD Testing Requirements**:
- **Pre-deployment testing**: Run tests before deploying to production
- **Database migrations**: Test migrations before applying to production
- **Environment parity**: Ensure tests match production environment
- **Performance testing**: Database query performance validation

**Pipeline Integration Approaches**:

#### Option A: GitHub Actions Only (Complete Control)
- **Full test pipeline** in GitHub Actions before Cloudflare deployment
- **Benefits**: Complete control, rich ecosystem, detailed reporting
- **Trade-offs**: Longer pipeline, separate from deployment process

#### Option B: Cloudflare Pages CI (Integrated)
- **Built-in testing** as part of Cloudflare Pages deployment
- **Benefits**: Tight integration, faster feedback
- **Trade-offs**: Limited testing tools, less flexibility

#### Option C: Hybrid Pipeline (Recommended)
✅ **Selected approach for StudyPuck**

**GitHub Actions + Cloudflare Pages Integration Strategy**:

**GitHub Actions Workflow**:
```yaml
name: Test and Deploy
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Setup test environment
        run: |
          # Setup Wrangler for D1 local testing
          npx wrangler d1 execute test-db --local --file=schema.sql
          # Setup test Auth0 environment variables
          echo "AUTH_SECRET=${{ secrets.AUTH_SECRET }}" >> .env.test
      
      - name: Run unit tests
        run: pnpm turbo test:unit --filter=web
      
      - name: Run integration tests  
        run: pnpm turbo test:integration --filter=web
        env:
          DATABASE_URL: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/test.sqlite"
          AUTH0_TEST_DOMAIN: ${{ secrets.AUTH0_TEST_DOMAIN }}
      
      - name: Run E2E tests (on PR only)
        if: github.event_name == 'pull_request'
        run: pnpm turbo test:e2e --filter=web
        env:
          PLAYWRIGHT_BASE_URL: "http://localhost:5173"
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: studypuck
          directory: apps/web/build
```

**Testing Pipeline Strategy**:

**1. Fast Feedback Loop**:
- **Every push**: Unit tests (mocked, <2 min)
- **Every push**: Integration tests with D1 local (<5 min)
- **Pull requests only**: E2E tests (realistic, <10 min)

**2. Environment Management**:
```javascript
// Test environment configuration
const testConfig = {
  development: {
    database: '.wrangler/state/v3/d1/test.sqlite',
    auth: 'mocked',
    ai: 'mocked'
  },
  integration: {
    database: 'wrangler d1 local',
    auth: 'test-tenant', 
    ai: 'test-api-keys'
  },
  e2e: {
    database: 'preview-db',
    auth: 'test-tenant',
    ai: 'test-api-keys'
  }
};
```

**3. Database Migration Testing**:
```bash
# Migration testing pipeline
test-migrations:
  - name: Test database migrations
    run: |
      # Create clean test database
      npx wrangler d1 execute test-db --local --command="DROP TABLE IF EXISTS cards;"
      # Apply all migrations
      npx wrangler d1 execute test-db --local --file=migrations/*.sql
      # Run data integrity tests
      pnpm test:migrations
```

**4. Preview Environment Testing**:
- **Cloudflare Pages preview deployments** for each PR
- **Automated tests** against preview URLs
- **Database migrations** tested on temporary D1 instances

**CI/CD Integration Benefits**:

**Development Workflow**:
- **Immediate feedback**: Fast unit tests on every commit
- **Confidence building**: Integration tests catch D1/Auth issues
- **Production safety**: E2E tests validate user journeys before merge

**Deployment Safety**:
- **Zero-downtime deployments**: Tests pass before Cloudflare deployment
- **Migration validation**: Database schema changes tested before production
- **Rollback capability**: Previous version available if issues detected

**Cost Optimization**:
- **GitHub Actions**: 2000 free minutes/month for private repos
- **Selective E2E testing**: Only on PRs to minimize Auth0 test usage
- **Preview deployments**: Cloudflare Pages built-in feature (free tier)

**Learning Opportunities**:
- **Modern CI/CD patterns**: GitHub Actions workflows and deployment gates
- **Test environment management**: Multiple test configurations and data isolation
- **Cloudflare integration**: Pages deployment automation and D1 testing
- **Professional practices**: Industry-standard testing pipelines

✅ **Decision**: Hybrid CI/CD integration approach
- **GitHub Actions**: Comprehensive testing pipeline with environment management
- **Cloudflare Pages**: Automated deployment after successful tests  
- **Preview environments**: PR-based testing with temporary D1 instances
- **Cost-optimized**: Fast feedback with selective comprehensive testing

**Final Testing Strategy Summary**:

**Complete Testing Architecture for StudyPuck**:
1. ✅ **Philosophy**: Comprehensive testing with testable code design
2. ✅ **Framework**: Vitest + Playwright for optimal developer experience
3. ✅ **Database**: D1 local simulator for consistency with production
4. ✅ **Authentication**: Hybrid approach (mocked + test tenant + E2E)
5. ✅ **CI/CD**: GitHub Actions + Cloudflare Pages with preview testing

**Implementation Timeline**:
- **Week 1**: Basic test setup (Vitest + Playwright configuration)
- **Week 2**: Unit test patterns and D1 simulator integration  
- **Week 3**: Authentication testing utilities and test Auth0 tenant
- **Week 4**: CI/CD pipeline and preview environment testing

**Ready for implementation** with clear testing strategy supporting confident development and deployment.