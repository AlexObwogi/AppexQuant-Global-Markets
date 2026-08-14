# Contributing to AppExQuant Markets Global

Thank you for your interest in contributing to AppExQuant Markets Global! We welcome high-quality contributions from quantitative researchers, systems engineers, and algorithmic traders.

Please follow these guidelines to ensure a smooth contribution process.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

1. Fork the repository and clone your fork locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Run the development environment:
   ```bash
   npm run dev
   ```

---

## Contribution Workflow

1. **Create an Issue**: Discuss your proposed change or bug fix via GitHub Issues before starting significant development.
2. **Create a Branch**: Use descriptive branch naming (`feature/`, `fix/`, `quant/`, `docs/`).
3. **Commit Standards**: Write clean, concise commit messages adhering to conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`).
4. **Run Tests & Linter**:
   ```bash
   npm run lint
   npm run build
   ```
5. **Submit Pull Request**: Open a Pull Request referencing the issue and filling out the PR template completely.

---

## Architectural Principles

- **Broker Agnosticism**: Strategies and quantitative signals must never be tightly coupled to a single broker. Use broker adapters.
- **Risk Isolation**: Risk management rules must execute independently of individual trading strategies.
- **Environment Separation**: Backtesting, paper trading, and live execution must remain strictly isolated.
