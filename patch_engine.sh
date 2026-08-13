#!/bin/bash
sed -i 's/strategy.markets.includes/((strategy.markets || strategy.symbols).includes/g' src/services/ai/strategyEngine.ts
sed -i 's/strategy.markets.join/((strategy.markets || strategy.symbols).join/g' src/services/ai/strategyEngine.ts
