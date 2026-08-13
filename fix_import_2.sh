#!/bin/bash
sed -i '1s/^/import { analyzeMarketStructure } from ".\/marketStructureEngine";\n/' src/services/ai/confluenceEngine.ts
