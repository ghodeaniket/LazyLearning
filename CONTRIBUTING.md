# Contributing to LazyLearner

## 🚀 Development Workflow

We follow the GitHub Flow branching strategy for simplicity and continuous delivery.

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/auth-implementation`)
- `fix/` - Bug fixes (e.g., `fix/login-validation`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `docs/` - Documentation updates (e.g., `docs/api-guide`)

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD pipeline changes

#### Examples
```bash
feat(auth): implement email/password authentication
fix(game): correct score calculation for hard mode
test(utils): add unit tests for game utilities
ci: add GitHub Actions workflow for iOS builds
```

### Pull Request Process

1. Create a feature branch from `main`
2. Write tests first (TDD approach)
3. Implement your feature
4. Ensure all tests pass (`npm test`)
5. Run linting (`npm run lint`)
6. Create a Pull Request with a clear description
7. Request review from at least one team member
8. Address review comments
9. Merge after approval and passing CI

### Testing Requirements

- Maintain minimum 70% code coverage
- Write tests for all new features
- Update tests when modifying existing code
- Run tests locally before pushing

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Keep files under 200 lines when possible
- Use TypeScript strictly

## 🛠️ Setup Instructions

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up iOS: `cd ios && pod install`
4. Run tests: `npm test`
5. Start development: `npm start`

## 📝 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update type definitions as needed
- Document complex algorithms

## 🐛 Reporting Issues

- Check existing issues first
- Use issue templates
- Provide reproduction steps
- Include environment details

## 💡 Suggesting Features

- Open a discussion first
- Provide use cases
- Consider MVP scope
- Align with project goals