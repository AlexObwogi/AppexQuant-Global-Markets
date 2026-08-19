import { useState, useEffect, useCallback, useRef } from 'react';
import { tradeSpeechVoice, SpeechSettings } from '../services/audio/speechVoiceService.ts';
import { ExecutionOrder } from '../types/execution.ts';
import { OpenPosition } from '../services/ea/positionEngine.ts';

export function useTradeVoiceStatus() {
  const [settings, setSettings] = useState<SpeechSettings>(() => tradeSpeechVoice.getSettings());
  const isSupported = tradeSpeechVoice.isSupported();

  // Keep track of previously seen orders and positions to detect transitions without redundant speech
  const previousOrdersRef = useRef<Map<string, string>>(new Map()); // id -> state
  const previousPositionsRef = useRef<Map<string, OpenPosition>>(new Map()); // id -> position
  const isInitialOrdersLoadRef = useRef(true);
  const isInitialPositionsLoadRef = useRef(true);

  // Sync settings whenever component mounts
  useEffect(() => {
    setSettings(tradeSpeechVoice.getSettings());
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SpeechSettings>) => {
    const updated = tradeSpeechVoice.saveSettings(newSettings);
    setSettings({ ...updated });
  }, []);

  const toggleVoice = useCallback(() => {
    const nextState = !settings.enabled;
    const updated = tradeSpeechVoice.saveSettings({ enabled: nextState });
    setSettings({ ...updated });
    if (nextState) {
      tradeSpeechVoice.speak('Voice status active', 'success', true);
    }
  }, [settings.enabled]);

  const testVoice = useCallback(() => {
    tradeSpeechVoice.testVoiceCue();
  }, []);

  /**
   * Monitor orders list for newly filled or cancelled orders
   */
  const processOrdersDelta = useCallback((orders: ExecutionOrder[]) => {
    if (!orders || !Array.isArray(orders)) return;

    if (isInitialOrdersLoadRef.current) {
      // Seed existing orders so we don't spam speech on page load
      orders.forEach(o => {
        previousOrdersRef.current.set(o.requestId, o.state);
      });
      isInitialOrdersLoadRef.current = false;
      return;
    }

    orders.forEach(order => {
      const prevState = previousOrdersRef.current.get(order.requestId);
      const currentState = order.state;

      // Order transitioned into FILLED or PARTIALLY_FILLED
      if (currentState === 'FILLED' && prevState && prevState !== 'FILLED') {
        tradeSpeechVoice.announceOrderExecuted({
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          fillPrice: order.fillPrice,
          price: order.price,
        });
      } else if (currentState === 'CANCELLED' && prevState && prevState !== 'CANCELLED') {
        tradeSpeechVoice.announceOrderCancelled(order.symbol);
      }

      previousOrdersRef.current.set(order.requestId, currentState);
    });
  }, []);

  /**
   * Monitor positions list for closed positions
   */
  const processPositionsDelta = useCallback((currentPositions: OpenPosition[]) => {
    if (!currentPositions || !Array.isArray(currentPositions)) return;

    if (isInitialPositionsLoadRef.current) {
      currentPositions.forEach(p => {
        previousPositionsRef.current.set(p.id, p);
      });
      isInitialPositionsLoadRef.current = false;
      return;
    }

    const currentMap = new Map<string, OpenPosition>();
    currentPositions.forEach(p => currentMap.set(p.id, p));

    // Check if any position from previous check is now missing (i.e. closed)
    previousPositionsRef.current.forEach((prevPos, posId) => {
      if (!currentMap.has(posId)) {
        // Position was closed!
        tradeSpeechVoice.announcePositionClosed({
          symbol: prevPos.symbol,
          unrealizedPl: prevPos.unrealizedPl,
          reason: 'Closed',
        });
      }
    });

    // Update reference
    previousPositionsRef.current = currentMap;
  }, []);

  return {
    settings,
    isVoiceEnabled: settings.enabled,
    isSupported,
    updateSettings,
    toggleVoice,
    testVoice,
    processOrdersDelta,
    processPositionsDelta,
    announceOrderExecuted: tradeSpeechVoice.announceOrderExecuted.bind(tradeSpeechVoice),
    announceOrderSubmitted: tradeSpeechVoice.announceOrderSubmitted.bind(tradeSpeechVoice),
    announceOrderCancelled: tradeSpeechVoice.announceOrderCancelled.bind(tradeSpeechVoice),
    announcePositionClosed: tradeSpeechVoice.announcePositionClosed.bind(tradeSpeechVoice),
  };
}
