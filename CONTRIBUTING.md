# Contributing to UZKV

Thank you for your interest in contributing to the Universal ZK-Proof Verifier (UZKV) project!

## 📋 Development Setup

1. **Install prerequisites** (see Phase 0 in [PROJECT-EXECUTION-PROD.md](./PROJECT-EXECUTION-PROD.md))
   - Node.js >= 20.0.0
   - pnpm >= 8.0.0
   - Rust (latest stable)
   - Foundry (forge, cast, anvil)
   - cargo-stylus

2. **Clone and install dependencies**

   ```bash
   git clone https://github.com/draxxycodes/uzkv.git
   cd uzkv
   pnpm install
   ```

3. **Run tests to verify setup**
   ```bash
   pnpm test
   ```

## 🎯 Code Standards

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` for formatting
- Use `cargo clippy -- -D warnings` for linting (zero warnings policy)
- All code must be `no_std` compatible for Stylus modules
- Document all public APIs with doc comments

### Solidity

- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use `forge fmt` for formatting
- Use NatSpec comments for all public functions
- Follow the Checks-Effects-Interactions pattern
- Prefer explicit over implicit

### TypeScript

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use Prettier for formatting (runs automatically via pre-commit hooks)
- Use ESLint for linting
- Prefer `const` over `let`, never use `var`
- Use TypeScript strict mode

## 🧪 Testing

All pull requests must include tests and maintain **>95% code coverage**.

### Test Structure

```
packages/
├── stylus/
│   └── tests/           # Rust unit and integration tests
├── contracts/
│   └── test/            # Solidity tests (Foundry)
└── sdk/
    └── src/__tests__/   # TypeScript tests (Jest)
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run Rust tests only
cd packages/stylus && cargo test

# Run Solidity tests only
cd packages/contracts && forge test

# Run TypeScript tests only
cd packages/sdk && pnpm test

# Run with coverage
pnpm test:coverage
```

## 📝 Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Scopes

- `groth16`: Groth16 verifier
- `plonk`: PLONK verifier
- `stark`: STARK verifier
- `contracts`: Solidity contracts
- `sdk`: TypeScript SDK
- `web`: Next.js demo app
- `infra`: Infrastructure/DevOps

### Examples

```bash
feat(groth16): implement pairing check optimization
fix(contracts): resolve storage collision in proxy
docs(sdk): add API documentation for batch verification
test(plonk): add fuzz tests for KZG verification
```

## 🔀 Pull Request Process

1. **Fork the repository** and create your branch from `main`

   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the code standards above

3. **Run tests** and ensure all pass

   ```bash
   pnpm test
   ```

4. **Run linters** and fix any issues

   ```bash
   pnpm lint
   pnpm format
   ```

5. **Commit your changes** using conventional commits

   ```bash
   git commit -m "feat(scope): description"
   ```

6. **Push to your fork** and submit a pull request

   ```bash
   git push origin feat/my-feature
   ```

7. **Ensure CI passes** - All checks must be green

8. **Request review** from maintainers

## 🚫 Pre-commit Hooks

Git hooks are automatically installed via lefthook. They will run before each commit:

- **Rust**: `cargo fmt --check`, `cargo clippy -- -D warnings`
- **Solidity**: `forge fmt --check`
- **TypeScript**: `prettier --check`
- **All files**: `typos` (spell checking)

To bypass hooks (emergency only):

```bash
LEFTHOOK=0 git commit -m "message"
```

⚠️ **WARNING**: Bypassing hooks is discouraged and should only be done in genuine emergencies.

## 📋 Code Review Guidelines

When reviewing pull requests, check for:

1. ✅ **Correctness**: Does the code work as intended?
2. ✅ **Tests**: Are there adequate tests with >95% coverage?
3. ✅ **Security**: Are there any security vulnerabilities?
4. ✅ **Performance**: Is the code optimized for gas/runtime?
5. ✅ **Documentation**: Are all APIs documented?
6. ✅ **Style**: Does it follow project conventions?
7. ✅ **No Mocks**: Production code must be real, not mocked

## 🐛 Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Include reproduction steps** and expected vs actual behavior
4. **Add relevant labels** (bug, security, etc.)

## 💡 Feature Requests

1. **Check existing issues** and discussions
2. **Use the feature request template**
3. **Explain the use case** and why it's needed
4. **Consider implementation** - PRs are welcome!

## 🔒 Security

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. **Email security@uzkv.io** (or DM maintainers)
3. **Include details** about the vulnerability
4. **Wait for response** before public disclosure

See [SECURITY.md](./SECURITY.md) for our security policy.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for making UZKV better! 🚀
