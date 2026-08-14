# 21. Risk Management Engine

The Risk Management Engine acts as an mandatory security firewall between generated trading signals and broker order execution.

## Risk Control Flow

```mermaid
flowchart TD
    Signal[Generated Signal] --> Check1{Max Drawdown Limit Check}
    Check1 -->|Exceeded| Reject[Reject Order & Log Risk Event]
    Check1 -->|Passed| Check2{Position Exposure Limit Check}
    Check2 -->|Exceeded| Reject
    Check2 -->|Passed| Check3{Daily Loss Circuit Breaker}
    Check3 -->|Triggered| Reject
    Check3 -->|Passed| Approve[Approve Order for Execution]
```

## Enforced Controls

- **Position Sizing**: Automatically clamps leverage and order volume against available account equity.
- **Maximum Drawdown Protection**: Halts all automated strategy execution if portfolio drawdown crosses institutional thresholds.
- **Circuit Breakers**: Immediate manual or programmatic kill-switch capability across all active bots.
