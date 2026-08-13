#!/bin/bash
# First, insert import
sed -i '11i import { MarketIntelligencePanel } from "../components/market/MarketIntelligencePanel";' src/views/MarketsView.tsx

# Delete lines 397 to end-3 (the closing tags for the right column).
# Let's use awk or perl.
perl -0777 -pi -e 's/<\!-- Instrument Specifications -->.*?(?=<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};)/<MarketIntelligencePanel instrument={selectedInstrument} candles={activeCandles} dataFreshness={dataFreshness} \/>\n        /s' src/views/MarketsView.tsx
