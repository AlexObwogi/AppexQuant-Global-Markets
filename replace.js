import fs from 'fs';
let code = fs.readFileSync('src/views/MarketsView.tsx', 'utf8');

const startStr = "{/* Instrument Specifications */}";
const startIndex = code.indexOf(startStr);

if (startIndex !== -1) {
  const endStr = "      </div>\n    </div>\n  );\n};";
  const endIndex = code.lastIndexOf(endStr);
  
  if (endIndex !== -1) {
    const replacement = "<MarketIntelligencePanel \n            instrument={selectedInstrument} \n            candles={activeCandles} \n            dataFreshness={dataFreshness} \n          />\n        </div>\n";
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    // Let's ensure only one import is there
    code = code.replace(/import { MarketIntelligencePanel } from "..\/components\/market\/MarketIntelligencePanel";\n/g, '');
    code = code.replace(/import React, { useState, useEffect, useMemo } from 'react';/, "import React, { useState, useEffect, useMemo } from 'react';\nimport { MarketIntelligencePanel } from '../components/market/MarketIntelligencePanel';");
    
    fs.writeFileSync('src/views/MarketsView.tsx', code);
    console.log('Replaced successfully');
  } else {
    console.log('End not found');
  }
} else {
  console.log('Start not found');
}
