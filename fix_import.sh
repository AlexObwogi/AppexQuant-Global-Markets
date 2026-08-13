#!/bin/bash
sed -i 's/import { analyzeMarketStructure } from ".\/marketStructureEngine";/import { analyzeMarketStructure } from ".\/marketStructureEngine";/g' src/services/ai/confluenceEngine.ts
sed -i '/import { determineMarketStructure/d' src/services/ai/confluenceEngine.ts
# I need to make sure analyzeMarketStructure is imported at all.
grep "analyzeMarketStructure" src/services/ai/confluenceEngine.ts || sed -i '1i import { analyzeMarketStructure } from "./marketStructureEngine";' src/services/ai/confluenceEngine.ts
