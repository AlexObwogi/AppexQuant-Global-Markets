/**
 * AppexQuant Markets Global - Recent Deposit & Withdrawal Transactions Table
 * Paginated historical statement viewer with live Deriv API fetching, filtering, and status badges.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../utils/apiFetch.ts';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Filter,
} from 'lucide-react';

export interface TransactionRecord {
  id: string;
  transactionId: string;
  actionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'BUY' | 'SELL';
  amount: number;
  currency: string;
  balanceAfter: number;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
  loginid: string;
}

export const TransactionHistoryTable: React.FC = () => {
  const { state } = useGlobalState();
  const isBalanceHidden = state.isBalanceHidden;

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/auth/deriv/statement?action=${activeFilter}&limit=100`, {
        method: 'GET',
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.data?.transactions) {
          setTransactions(json.data.transactions);
          setLastSyncedAt(json.data.lastSyncedAt || new Date().toISOString());
        }
      }
    } catch (err) {
      console.warn('[TransactionTable] Statement fetch error:', err);
    } finally {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  useEffect(() => {
    fetchTransactions();
    setCurrentPage(1);
  }, [activeFilter]);

  // Search filter
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.currency.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'deposit' && tx.actionType === 'DEPOSIT') ||
        (activeFilter === 'withdrawal' && tx.actionType === 'WITHDRAWAL') ||
        (activeFilter === 'transfer' && tx.actionType === 'TRANSFER');

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, activeFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // CSV Export handler
  const handleExportCsv = () => {
    if (filteredList.length === 0) return;
    const headers = ['Transaction ID', 'Action Type', 'Amount', 'Currency', 'Balance After', 'Status', 'Timestamp', 'Description'];
    const rows = filteredList.map((tx) => [
      tx.transactionId,
      tx.actionType,
      tx.amount,
      tx.currency,
      tx.balanceAfter,
      tx.status,
      tx.timestamp,
      `"${tx.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Deriv_Transactions_${activeFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAmount = (amt: number, currency: string) => {
    if (isBalanceHidden) return '••••••';
    const prefix = amt > 0 ? '+' : '';
    return `${prefix}${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatBalance = (bal: number, currency: string) => {
    if (isBalanceHidden) return '••••••';
    return `$ ${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card variant="surface" className="p-4 sm:p-5 space-y-4 shadow-sm border border-border-color dark:border-[#2B3139]">
      {/* Table Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-color/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
                Cashier Transaction Statement
              </h3>
              <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                DERIV STATEMENT API
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Paginated historical log of deposits, withdrawals, and inter-wallet transfers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={isLoading}
            className="p-2 rounded-lg bg-bg-hover hover:bg-bg-hover/80 border border-border-color text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh transaction statement"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00a86b]' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredList.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bg-hover hover:bg-bg-hover/80 border border-border-color text-xs font-bold text-text-primary transition-colors cursor-pointer disabled:opacity-40"
            title="Export transaction log to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-hover/50 p-2 rounded-xl border border-border-color/40">
        {/* Action Filter Pills */}
        <div className="flex space-x-1 bg-bg-surface p-1 rounded-lg border border-border-color/60 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#00a86b] text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('deposit')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeFilter === 'deposit'
                ? 'bg-[#00a86b] text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Deposits
          </button>
          <button
            onClick={() => setActiveFilter('withdrawal')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeFilter === 'withdrawal'
                ? 'bg-[#ff444f] text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Withdrawals
          </button>
          <button
            onClick={() => setActiveFilter('transfer')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeFilter === 'transfer'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Transfers
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search TXN ID or method..."
            className="w-full bg-bg-surface border border-border-color rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary outline-none font-mono focus:border-[#00a86b]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-border-color">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-hover border-b border-border-color text-[10px] font-mono uppercase text-text-secondary tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-3">Transaction ID</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Description / Channel</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-right">Balance After</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color/60 font-mono">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-text-secondary font-sans">
                  No matching transaction records found.
                </td>
              </tr>
            ) : (
              paginatedItems.map((tx) => (
                <tr key={tx.id} className="hover:bg-bg-hover/60 transition-colors">
                  <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                    {new Date(tx.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-text-primary whitespace-nowrap">
                    {tx.transactionId}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      {tx.actionType === 'DEPOSIT' && (
                        <span className="p-1 rounded bg-emerald-500/15 text-emerald-400">
                          <ArrowDownLeft className="w-3 h-3" />
                        </span>
                      )}
                      {tx.actionType === 'WITHDRAWAL' && (
                        <span className="p-1 rounded bg-rose-500/15 text-rose-400">
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      )}
                      {tx.actionType === 'TRANSFER' && (
                        <span className="p-1 rounded bg-sky-500/15 text-sky-400">
                          <ArrowLeftRight className="w-3 h-3" />
                        </span>
                      )}
                      <span className="font-bold uppercase text-[10px]">
                        {tx.actionType}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary font-sans text-xs max-w-xs truncate" title={tx.description}>
                    {tx.description}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                    tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatAmount(tx.amount, tx.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-primary whitespace-nowrap">
                    {formatBalance(tx.balanceAfter, tx.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {tx.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {tx.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3 animate-pulse" /> Pending
                      </span>
                    )}
                    {tx.status === 'FAILED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-text-secondary font-mono">
        <div className="flex items-center space-x-2">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-bg-surface border border-border-color rounded px-2 py-1 text-xs text-text-primary outline-none"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
          <span>
            Showing {filteredList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(filteredList.length, currentPage * pageSize)} of {filteredList.length} items
          </span>
        </div>

        <div className="flex items-center space-x-1.5 self-end sm:self-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-bg-surface hover:bg-bg-hover border border-border-color text-text-primary disabled:opacity-40 transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 py-1 font-bold text-text-primary">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-bg-surface hover:bg-bg-hover border border-border-color text-text-primary disabled:opacity-40 transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};
