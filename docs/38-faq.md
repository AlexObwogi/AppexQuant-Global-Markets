# 38. Frequently Asked Questions (FAQ)

### General

**Q: What is AppExQuant Markets Global?**  
A: AppExQuant is an institutional quantitative technology platform for market intelligence, algorithmic strategy research, risk management, and automated trade execution.

**Q: Is AppExQuant an online broker?**  
A: No. AppExQuant is software infrastructure. It connects to external brokers (such as Deriv via OAuth) to execute trades and ingest market data.

### Authentication & Security

**Q: How does authentication work?**  
A: AppExQuant utilizes server-side OAuth 2.0 PKCE with Deriv. Session tokens are securely issued as HttpOnly cookies (`session_token`), ensuring credentials never reside in client-side storage or JavaScript state.

**Q: Are my broker credentials stored by AppExQuant?**  
A: No. OAuth tokens are managed securely through server-to-server exchanges and session cookies.

### Quantitative & Trading

**Q: Can AppExQuant guarantee trading profits?**  
A: **No.** Trading financial markets involves substantial risk of loss. Automated systems and backtest results do not guarantee future performance.

**Q: How do I add a new trading strategy?**  
A: Strategies adhere to our standardized quantitative feature and signal contracts, allowing them to plug cleanly into the signal engine and risk firewall without modifying broker adapters.
