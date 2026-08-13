#!/bin/bash

# We just need to ensure that when it returns to "LIVE" it resumes.
# In StrategyScannerModal.tsx, the effect uses `if (dataFreshness !== 'STALE' && dataFreshness !== 'DISCONNECTED') { ... }`
# which automatically resumes when dataFreshness becomes 'LIVE' or 'RECENT'.

# Let's verify the patch was correct.
cat src/components/strategy/StrategyScannerModal.tsx | grep -n -A 10 "LIVE DATA STALE"
