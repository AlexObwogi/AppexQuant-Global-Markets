#!/bin/bash
sed -i 's/} else {/} else if (currentIndex >= instrumentsToScan.length) {/g' src/components/strategy/StrategyScannerModal.tsx
