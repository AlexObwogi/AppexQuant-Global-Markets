/**
 * AppexQuant Markets Global - P2P Engine & Mock Data Repository
 */

import { P2POffer, P2PMerchant, P2POrder, P2PChatMessage, P2PDispute } from '../../types/p2p.ts';

export const INITIAL_MERCHANTS: P2PMerchant[] = [
  {
    id: 'mer_1',
    userId: 'usr_m1',
    name: 'Apex Liquidity Group',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    status: 'TOP_MERCHANT',
    completionRate: 99.4,
    completedOrders: 3420,
    avgReleaseMinutes: 3.2,
    positiveFeedbackRate: 99.1,
    supportedPaymentMethods: ['M-Pesa', 'Bank Transfer', 'Airtel Money'],
    accountAgeDays: 730,
    minLimit: 10,
    maxLimit: 15000
  },
  {
    id: 'mer_2',
    userId: 'usr_m2',
    name: 'SwiftPay Global FX',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    status: 'VERIFIED',
    completionRate: 98.7,
    completedOrders: 1850,
    avgReleaseMinutes: 5.0,
    positiveFeedbackRate: 98.0,
    supportedPaymentMethods: ['Bank Transfer', 'M-Pesa'],
    accountAgeDays: 450,
    minLimit: 50,
    maxLimit: 8000
  },
  {
    id: 'mer_3',
    userId: 'usr_m3',
    name: 'Zenith Fast Escrow',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
    status: 'VERIFIED',
    completionRate: 97.9,
    completedOrders: 920,
    avgReleaseMinutes: 4.1,
    positiveFeedbackRate: 97.5,
    supportedPaymentMethods: ['M-Pesa', 'Wise', 'Bank Transfer'],
    accountAgeDays: 280,
    minLimit: 20,
    maxLimit: 5000
  }
];

export const INITIAL_OFFERS: P2POffer[] = [
  {
    id: 'off_1',
    merchantId: 'mer_1',
    merchant: INITIAL_MERCHANTS[0],
    type: 'SELL', // Merchant is selling USDT to user
    asset: 'USDT',
    fiat: 'KES',
    price: 132.50,
    availableAmount: 12500,
    minOrderLimit: 500,
    maxOrderLimit: 100000,
    paymentMethods: ['M-Pesa', 'Bank Transfer'],
    paymentTimeLimitMinutes: 15,
    terms: 'Fast automated release upon M-Pesa confirmation. No third-party payments allowed. Name must match account.',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'off_2',
    merchantId: 'mer_1',
    merchant: INITIAL_MERCHANTS[0],
    type: 'BUY', // Merchant is buying USDT from user
    asset: 'USDT',
    fiat: 'KES',
    price: 131.80,
    availableAmount: 8400,
    minOrderLimit: 1000,
    maxOrderLimit: 50000,
    paymentMethods: ['M-Pesa'],
    paymentTimeLimitMinutes: 15,
    terms: 'Instant M-Pesa payout directly to your verified phone number.',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'off_3',
    merchantId: 'mer_2',
    merchant: INITIAL_MERCHANTS[1],
    type: 'SELL',
    asset: 'USDT',
    fiat: 'USD',
    price: 1.002,
    availableAmount: 25000,
    minOrderLimit: 100,
    maxOrderLimit: 10000,
    paymentMethods: ['Bank Transfer', 'Wise'],
    paymentTimeLimitMinutes: 30,
    terms: 'Wire transfer must include reference order ID.',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'off_4',
    merchantId: 'mer_3',
    merchant: INITIAL_MERCHANTS[2],
    type: 'SELL',
    asset: 'BTC',
    fiat: 'USD',
    price: 68450.00,
    availableAmount: 1.5,
    minOrderLimit: 50,
    maxOrderLimit: 10000,
    paymentMethods: ['Bank Transfer'],
    paymentTimeLimitMinutes: 30,
    terms: 'Secure Bitcoin escrow release upon verified wire clearance.',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const P2P_STORAGE_KEY = 'appex_p2p_state_v1';

export interface P2PStateStore {
  offers: P2POffer[];
  orders: P2POrder[];
  chats: Record<string, P2PChatMessage[]>;
  disputes: P2PDispute[];
  userMerchantApplication?: {
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    businessName: string;
    submittedAt: string;
  };
}

export function getStoredP2PState(): P2PStateStore {
  try {
    const raw = localStorage.getItem(P2P_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    offers: INITIAL_OFFERS,
    orders: [],
    chats: {},
    disputes: [],
    userMerchantApplication: { status: 'NONE', businessName: '', submittedAt: '' }
  };
}

export function saveStoredP2PState(state: P2PStateStore): void {
  try {
    localStorage.setItem(P2P_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // storage error fallback
  }
}
