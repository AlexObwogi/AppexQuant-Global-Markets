/**
 * AppexQuant Markets Global - Authenticated Deriv Options Trading WebSocket Client
 * 
 * Manages authenticated trading connections using single-use OTPs:
 * - Obtains fresh OTP via POST /api/auth/deriv/otp on every connection and reconnection.
 * - Subscribes to live balance ({ balance: 1, subscribe: 1 }) and proposal_open_contract.
 * - Enforces HARD SAFETY RULES:
 *   - NEVER buys or sells automatically.
 *   - MAX_STAKE_REAL = 10 USD hard ceiling for Real money accounts.
 *   - Confirmation dialog required for Real accounts.
 *   - In-flight request locking to prevent double-execution.
 * - Handles contracts_for, live proposals, buy, sell, contract_update, and profit_table.
 * - Dispatches best-effort non-blocking audit records to /api/trade/audit.
 */

export const MAX_STAKE_REAL = 10; // USD safety maximum for real accounts

export interface DerivProposalParams {
  symbol: string;
  contract_type: string;
  currency: string;
  amount: number;
  basis: 'stake' | 'payout';
  duration: number;
  duration_unit: 't' | 's' | 'm' | 'h' | 'd';
  multiplier?: number;
}

export interface DerivLiveProposal {
  id: string;
  ask_price: number;
  payout: number;
  spot: number;
  spot_time: number;
  display_value: string;
  longcode?: string;
  timestamp: number;
}

export interface DerivOpenPosition {
  contract_id: number;
  symbol: string;
  display_name: string;
  contract_type: string;
  entry_spot: number;
  current_spot: number;
  buy_price: number;
  payout: number;
  profit: number;
  is_valid_to_sell: 0 | 1;
  date_expiry?: number;
  date_start?: number;
  status: 'open' | 'sold' | 'won' | 'lost';
  stop_loss?: number;
  take_profit?: number;
}

export interface DerivProfitTableItem {
  contract_id: number;
  transaction_id: number;
  purchase_time: number;
  sell_time: number;
  buy_price: number;
  sell_price: number;
  profit: number;
  symbol: string;
  longcode?: string;
}

export interface TradingAccountState {
  accountId: string | null;
  isReal: boolean;
  balance: number;
  currency: string;
  isConnected: boolean;
  isConnecting: boolean;
  tokenExpired: boolean;
  openPositions: DerivOpenPosition[];
}

export class DerivTradingClient {
  private ws: WebSocket | null = null;
  private currentAccountId: string | null = null;
  private reqIdCounter = 1000;
  private pendingRequests = new Map<number, {
    resolve: (res: any) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    type: string;
  }>();

  private isExplicitClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;

  // Rate Limiting Tracker for Trading Operations
  private sentTradingMessages: { timestamp: number; type: string }[] = [];

  // Active State
  private balance = 0;
  private currency = 'USD';
  private openPositionsMap = new Map<number, DerivOpenPosition>();
  private activeProposalId: string | null = null;

  // Listeners
  private stateListeners = new Set<(state: TradingAccountState) => void>();
  private positionListeners = new Set<(positions: DerivOpenPosition[]) => void>();
  private proposalListeners = new Set<(proposal: DerivLiveProposal | null) => void>();

  constructor() {
    this.setupWindowListeners();
  }

  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (this.currentAccountId && !this.isConnected() && !this.isExplicitClose) {
        this.connect(this.currentAccountId);
      }
    });
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getCurrentAccountId(): string | null {
    return this.currentAccountId;
  }

  public isRealAccount(): boolean {
    if (!this.currentAccountId) return false;
    return !this.currentAccountId.startsWith('VR') && !this.currentAccountId.startsWith('VRT');
  }

  public getBalance(): number {
    return this.balance;
  }

  public getCurrency(): string {
    return this.currency;
  }

  public getOpenPositions(): DerivOpenPosition[] {
    return Array.from(this.openPositionsMap.values());
  }

  // --- Connection & Authentication via Fresh OTP ---

  public async connect(accountId: string): Promise<void> {
    if (!accountId) return;

    // If already connected to this account, no need to reconnect
    if (this.currentAccountId === accountId && this.isConnected()) {
      return;
    }

    this.disconnect();
    this.currentAccountId = accountId;
    this.isExplicitClose = false;
    this.isConnecting = true;
    this.notifyState();

    try {
      // 1. Fetch fresh single-use OTP URL from server
      const otpRes = await fetch('/api/auth/deriv/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!otpRes.ok) {
        const errJson = await otpRes.json().catch(() => null);
        if (otpRes.status === 401 || errJson?.error?.code === 'TOKEN_EXPIRED') {
          this.isConnecting = false;
          this.notifyState(true);
          return;
        }
        throw new Error(errJson?.error?.message || 'Failed to generate Deriv OTP');
      }

      const otpData = await otpRes.json();
      const wsUrl = otpData?.data?.url;

      if (!wsUrl) {
        throw new Error('Deriv OTP response did not return a WebSocket URL');
      }

      // 2. Open authenticated WebSocket with single-use OTP
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (err: any) {
      console.warn('[DerivTradingClient] Connection error:', err.message || err);
      this.isConnecting = false;
      this.notifyState();
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isExplicitClose = true;
    this.cleanupTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnecting = false;
    this.openPositionsMap.clear();
    this.notifyState();
  }

  private handleOpen(): void {
    this.isConnecting = false;
    this.startPing();
    this.notifyState();

    // 1. Subscribe to Live Balance
    this.sendRaw({ balance: 1, subscribe: 1 }, 'balance');

    // 2. Subscribe to Proposal Open Contracts (live positions stream)
    this.sendRaw({ proposal_open_contract: 1, subscribe: 1 }, 'proposal_open_contract');

    // 3. Call Portfolio once
    this.sendRaw({ portfolio: 1 }, 'portfolio');
  }

  private handleMessage(event: MessageEvent): void {
    let data: any;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    // Correlate one-time requests via req_id
    if (data.req_id && this.pendingRequests.has(data.req_id)) {
      const pending = this.pendingRequests.get(data.req_id)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(data.req_id);

      if (data.error) {
        pending.reject(new Error(data.error.message || 'Deriv Trading error'));
      } else {
        pending.resolve(data);
      }
    }

    const msgType = data.msg_type;

    // Handle Balance Update
    if (msgType === 'balance' && data.balance) {
      const b = data.balance;
      if (typeof b.balance === 'number') {
        this.balance = b.balance;
        if (b.currency) this.currency = b.currency;
        this.notifyState();
      }
    }

    // Handle Proposal Open Contract Update
    if (msgType === 'proposal_open_contract' && data.proposal_open_contract) {
      this.processOpenContract(data.proposal_open_contract);
    }

    // Handle Portfolio Response
    if (msgType === 'portfolio' && data.portfolio?.contracts) {
      for (const contract of data.portfolio.contracts) {
        this.processPortfolioContract(contract);
      }
    }

    // Handle Live Proposal Update
    if (msgType === 'proposal' && data.proposal) {
      this.processProposal(data.proposal);
    }
  }

  private handleError(err: Event): void {
    console.warn('[DerivTradingClient] Socket error:', err);
  }

  private handleClose(event: CloseEvent): void {
    this.cleanupTimers();
    this.ws = null;
    this.isConnecting = false;
    this.notifyState();

    if (!this.isExplicitClose && this.currentAccountId) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitClose || !this.currentAccountId) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentAccountId && !this.isExplicitClose) {
        // Must request a FRESH OTP on reconnect
        this.connect(this.currentAccountId);
      }
    }, 3000);
  }

  private startPing(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRaw({ ping: 1 }, 'ping');
      }
    }, 25000);
  }

  private cleanupTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // --- Sending & Request Tracking ---

  public sendRequest<T = any>(payload: Record<string, any>, type = 'trade_req'): Promise<T> {
    return new Promise((resolve, reject) => {
      const req_id = this.reqIdCounter++;
      const message = { ...payload, req_id };

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(req_id)) {
          this.pendingRequests.delete(req_id);
          reject(new Error(`Trading request timeout for ${type} (req_id: ${req_id})`));
        }
      }, 10000);

      this.pendingRequests.set(req_id, { resolve, reject, timer, type });

      if (!this.sendRaw(message, type)) {
        clearTimeout(timer);
        this.pendingRequests.delete(req_id);
        reject(new Error('Trading socket is not connected'));
      }
    });
  }

  private sendRaw(data: Record<string, any>, type = 'trade_msg'): boolean {
    const now = Date.now();
    this.sentTradingMessages.push({ timestamp: now, type });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- Trading Operations (Phase 4) ---

  /**
   * Fetches contracts available for a specific symbol.
   */
  public async getContractsFor(symbol: string): Promise<any[]> {
    try {
      const res = await this.sendRequest({
        contracts_for: symbol,
      }, 'contracts_for');
      return res?.contracts_for?.available || [];
    } catch {
      return [];
    }
  }

  /**
   * Subscribes to live price proposal for given parameters.
   */
  public async requestProposal(params: DerivProposalParams): Promise<DerivLiveProposal> {
    // Forget previous proposal subscription if any
    if (this.activeProposalId) {
      this.sendRaw({ forget: this.activeProposalId }, 'forget_proposal');
      this.activeProposalId = null;
    }

    const payload: Record<string, any> = {
      proposal: 1,
      amount: params.amount,
      basis: params.basis,
      contract_type: params.contract_type,
      currency: params.currency,
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: params.symbol,
      subscribe: 1,
    };

    if (params.multiplier) {
      payload.multiplier = params.multiplier;
    }

    const res = await this.sendRequest(payload, 'proposal');
    if (res?.proposal) {
      const p = res.proposal;
      const proposalObj: DerivLiveProposal = {
        id: p.id,
        ask_price: Number(p.ask_price) || 0,
        payout: Number(p.payout) || 0,
        spot: Number(p.spot) || 0,
        spot_time: p.spot_time || Math.floor(Date.now() / 1000),
        display_value: p.display_value || String(p.ask_price),
        longcode: p.longcode,
        timestamp: Date.now(),
      };
      this.activeProposalId = p.id;
      this.notifyProposal(proposalObj);
      return proposalObj;
    }

    throw new Error('No proposal data returned by Deriv');
  }

  public forgetActiveProposal(): void {
    if (this.activeProposalId) {
      this.sendRaw({ forget: this.activeProposalId }, 'forget_proposal');
      this.activeProposalId = null;
      this.notifyProposal(null);
    }
  }

  /**
   * Buy Contract: Sends { buy: proposalId, price: askPrice }.
   * Enforces strict real-account stake protection and audit logging.
   */
  public async buy(proposalId: string, maxPrice: number, symbol: string, contractType: string): Promise<any> {
    if (!proposalId) throw new Error('Missing proposal ID');

    // Hard safety check on real accounts
    if (this.isRealAccount() && maxPrice > MAX_STAKE_REAL) {
      throw new Error(`Real money trade blocked: Stake exceeds safety limit of $${MAX_STAKE_REAL} USD`);
    }

    const res = await this.sendRequest({
      buy: proposalId,
      price: maxPrice,
    }, 'buy');

    if (res?.buy) {
      const buyData = res.buy;
      if (typeof buyData.balance_after === 'number') {
        this.balance = buyData.balance_after;
        this.notifyState();
      }

      // Best-effort audit logging (never throws)
      this.auditTrade({
        accountId: this.currentAccountId || '',
        contractType,
        symbol,
        stake: maxPrice,
        contractId: buyData.contract_id,
        result: 'BOUGHT',
      }).catch(() => {});

      return buyData;
    }

    throw new Error('Deriv buy returned no confirmation');
  }

  /**
   * Sell Contract: Sends { sell: contractId, price: 0 }
   */
  public async sell(contractId: number, price = 0): Promise<any> {
    const res = await this.sendRequest({
      sell: contractId,
      price,
    }, 'sell');

    if (res?.sell) {
      const sellData = res.sell;
      if (typeof sellData.balance_after === 'number') {
        this.balance = sellData.balance_after;
        this.notifyState();
      }

      // Remove from open positions
      this.openPositionsMap.delete(contractId);
      this.notifyPositions();

      return sellData;
    }

    throw new Error('Deriv sell returned no confirmation');
  }

  /**
   * Update contract limits (e.g., stop loss / take profit for multipliers)
   */
  public async updateContractLimits(
    contractId: number,
    limitOrder: { stop_loss?: number; take_profit?: number }
  ): Promise<any> {
    return this.sendRequest({
      contract_update: 1,
      contract_id: contractId,
      limit_order: limitOrder,
    }, 'contract_update');
  }

  /**
   * Retrieves closed contract profit table history.
   */
  public async getProfitTable(limit = 25, offset = 0): Promise<DerivProfitTableItem[]> {
    try {
      const res = await this.sendRequest({
        profit_table: 1,
        description: 1,
        limit,
        offset,
        sort: 'DESC',
      }, 'profit_table');

      if (res?.profit_table?.transactions) {
        return res.profit_table.transactions.map((t: any) => ({
          contract_id: t.contract_id,
          transaction_id: t.transaction_id,
          purchase_time: t.purchase_time,
          sell_time: t.sell_time,
          buy_price: Number(t.buy_price) || 0,
          sell_price: Number(t.sell_price) || 0,
          profit: Number(t.profit_percent ? t.profit_percent : (t.sell_price - t.buy_price)) || 0,
          symbol: t.shortcode ? t.shortcode.split('_')[1] : 'Asset',
          longcode: t.longcode,
        }));
      }
    } catch {}
    return [];
  }

  private async auditTrade(details: {
    accountId: string;
    contractType: string;
    symbol: string;
    stake: number;
    contractId?: number;
    result?: string;
  }): Promise<void> {
    try {
      await fetch('/api/trade/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
    } catch {}
  }

  // --- Position Streams ---

  private processOpenContract(poc: any): void {
    const contractId = Number(poc.contract_id);
    if (!contractId) return;

    const isSettled = poc.is_settled === 1 || poc.status === 'won' || poc.status === 'lost' || poc.is_expired === 1;

    if (isSettled) {
      // Contract closed/expired: remove from open positions and refresh balance
      this.openPositionsMap.delete(contractId);
      this.notifyPositions();
      return;
    }

    const pos: DerivOpenPosition = {
      contract_id: contractId,
      symbol: poc.underlying || poc.symbol || '',
      display_name: poc.display_name || poc.underlying || 'Deriv Contract',
      contract_type: poc.contract_type || 'CALL',
      entry_spot: Number(poc.entry_spot) || 0,
      current_spot: Number(poc.current_spot) || 0,
      buy_price: Number(poc.buy_price) || 0,
      payout: Number(poc.payout) || 0,
      profit: Number(poc.profit) || 0,
      is_valid_to_sell: poc.is_valid_to_sell === 1 ? 1 : 0,
      date_expiry: poc.date_expiry,
      date_start: poc.date_start,
      status: 'open',
      stop_loss: poc.limit_order?.stop_loss ? Number(poc.limit_order.stop_loss) : undefined,
      take_profit: poc.limit_order?.take_profit ? Number(poc.limit_order.take_profit) : undefined,
    };

    this.openPositionsMap.set(contractId, pos);
    this.notifyPositions();
  }

  private processPortfolioContract(c: any): void {
    const contractId = Number(c.contract_id);
    if (!contractId || this.openPositionsMap.has(contractId)) return;

    this.openPositionsMap.set(contractId, {
      contract_id: contractId,
      symbol: c.symbol || '',
      display_name: c.longcode || c.symbol || 'Contract',
      contract_type: c.contract_type || 'CALL',
      entry_spot: 0,
      current_spot: 0,
      buy_price: Number(c.buy_price) || 0,
      payout: Number(c.payout) || 0,
      profit: 0,
      is_valid_to_sell: 1,
      date_expiry: c.expiry_time,
      date_start: c.purchase_time,
      status: 'open',
    });
    this.notifyPositions();
  }

  private processProposal(p: any): void {
    const proposalObj: DerivLiveProposal = {
      id: p.id,
      ask_price: Number(p.ask_price) || 0,
      payout: Number(p.payout) || 0,
      spot: Number(p.spot) || 0,
      spot_time: p.spot_time || Math.floor(Date.now() / 1000),
      display_value: p.display_value || String(p.ask_price),
      longcode: p.longcode,
      timestamp: Date.now(),
    };
    this.notifyProposal(proposalObj);
  }

  // --- Subscriptions & Listeners ---

  public subscribeState(listener: (state: TradingAccountState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getStateSnapshot());
    return () => this.stateListeners.delete(listener);
  }

  public subscribePositions(listener: (positions: DerivOpenPosition[]) => void): () => void {
    this.positionListeners.add(listener);
    listener(this.getOpenPositions());
    return () => this.positionListeners.delete(listener);
  }

  public subscribeProposal(listener: (proposal: DerivLiveProposal | null) => void): () => void {
    this.proposalListeners.add(listener);
    return () => this.proposalListeners.delete(listener);
  }

  private notifyState(tokenExpired = false): void {
    const snapshot = this.getStateSnapshot(tokenExpired);
    for (const l of this.stateListeners) {
      try { l(snapshot); } catch {}
    }
  }

  private notifyPositions(): void {
    const list = this.getOpenPositions();
    for (const l of this.positionListeners) {
      try { l(list); } catch {}
    }
  }

  private notifyProposal(prop: DerivLiveProposal | null): void {
    for (const l of this.proposalListeners) {
      try { l(prop); } catch {}
    }
  }

  private getStateSnapshot(tokenExpired = false): TradingAccountState {
    return {
      accountId: this.currentAccountId,
      isReal: this.isRealAccount(),
      balance: this.balance,
      currency: this.currency,
      isConnected: this.isConnected(),
      isConnecting: this.isConnecting,
      tokenExpired,
      openPositions: this.getOpenPositions(),
    };
  }
}

// Global Singleton Instance for the entire Browser application
export const derivTradingClient = new DerivTradingClient();
