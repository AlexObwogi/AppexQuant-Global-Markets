#!/bin/bash
# Find useMarketData() and add dataFreshness, connectionState
sed -i 's/const { availableInstruments, candleHistory } = useMarketData();/const { availableInstruments, candleHistory, dataFreshness, connectionState } = useMarketData();/g' src/components/strategy/StrategyScannerModal.tsx

# Find "Scanning Markets" header block, add a warning if stale
sed -i '/<div className="flex items-center justify-between text-xs mb-2 font-mono">/i \
          {(dataFreshness === "STALE" || dataFreshness === "DISCONNECTED") && (\
            <div className="mb-4 p-3 rounded-lg bg-color-danger/10 border border-color-danger/30 flex items-center gap-2 text-color-danger text-xs font-bold">\
              <AlertTriangle className="w-4 h-4 shrink-0" />\
              <span>LIVE DATA STALE. SCANNING PAUSED. Waiting for data integrity checks to pass...</span>\
            </div>\
          )}\
' src/components/strategy/StrategyScannerModal.tsx

# Wrap the progress logic in useEffect to pause if stale
sed -i 's/if (currentIndex < instrumentsToScan.length) {/if (dataFreshness !== "STALE" \&\& dataFreshness !== "DISCONNECTED" \&\& currentIndex < instrumentsToScan.length) {/g' src/components/strategy/StrategyScannerModal.tsx
