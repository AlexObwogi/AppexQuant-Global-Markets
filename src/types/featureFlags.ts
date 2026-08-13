/**
 * AppexQuant Markets Global - Feature Flags Architecture
 */

export interface FeatureFlags {
  AI_SIGNALS: boolean;
  LIVE_TRADING: boolean;
  EA_MARKETPLACE: boolean;
  NEWS_ENGINE: boolean;
  COMMUNITY: boolean;
  NEW_EXECUTION_ENGINE: boolean;
  RISK_ENGINE_STRICT: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
  AI_SIGNALS: false,
  LIVE_TRADING: false,
  EA_MARKETPLACE: false,
  NEWS_ENGINE: false,
  COMMUNITY: false,
  NEW_EXECUTION_ENGINE: false,
  RISK_ENGINE_STRICT: true,
};
