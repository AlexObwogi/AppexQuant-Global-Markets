#!/bin/bash
sed -i 's/import { determineMarketStructure } from ".\/strategyEngine";/import { analyzeMarketStructure } from ".\/marketStructureEngine";/g' src/services/ai/confluenceEngine.ts
sed -i 's/const structure = determineMarketStructure(candles);/const structure = analyzeMarketStructure(candles).structure;/g' src/services/ai/confluenceEngine.ts
sed -i 's/const htfStructure = determineMarketStructure(htfCandles);/const htfStructure = analyzeMarketStructure(htfCandles).structure;/g' src/services/ai/confluenceEngine.ts
sed -i 's/instrument.symbolName/instrument.name/g' src/services/ai/confluenceEngine.ts
