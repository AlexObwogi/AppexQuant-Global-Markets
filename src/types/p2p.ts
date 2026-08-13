/**
 * AppexQuant Markets Global - P2P Marketplace & Merchant Infrastructure Types
 */

export type P2PAsset = 'USDT' | 'BTC' | 'ETH' | 'USD' | 'KES';
export type P2PFiat = 'USD' | 'KES' | 'EUR' | 'GBP';
export type OfferType = 'BUY' | 'SELL';

export type MerchantStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'TOP_MERCHANT' | 'SUSPENDED';

export type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_MARKED'
  | 'PAYMENT_CONFIRMED'
  | 'ASSET_RELEASE_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED'
  | 'FROZEN';

export interface P2PMerchant {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  status: MerchantStatus;
  completionRate: number; // e.g. 98.5
  completedOrders: number;
  avgReleaseMinutes: number;
  positiveFeedbackRate: number;
  supportedPaymentMethods: string[];
  accountAgeDays: number;
  minLimit: number;
  maxLimit: number;
}

export interface P2POffer {
  id: string;
  merchantId: string;
  merchant: P2PMerchant;
  type: OfferType; // BUY (user buys from merchant) or SELL (user sells to merchant)
  asset: P2PAsset;
  fiat: P2PFiat;
  price: number;
  availableAmount: number;
  minOrderLimit: number;
  maxOrderLimit: number;
  paymentMethods: string[];
  paymentTimeLimitMinutes: number;
  terms: string;
  isActive: boolean;
  createdAt: string;
}

export interface P2POrder {
  id: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  merchantId: string;
  type: OfferType;
  asset: P2PAsset;
  fiat: P2PFiat;
  cryptoAmount: number;
  fiatAmount: number;
  unitPrice: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentReference?: string;
  buyerMarkedPaid: boolean;
  sellerConfirmedPaid: boolean;
  disputeReason?: string;
  createdAt: string;
  expiresAt: string;
}

export interface P2PChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  isSystem: boolean;
  message: string;
  timestamp: string;
}

export interface P2PDispute {
  id: string;
  orderId: string;
  raisedByUserId: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_RELEASED' | 'RESOLVED_REFUNDED';
  createdAt: string;
}
