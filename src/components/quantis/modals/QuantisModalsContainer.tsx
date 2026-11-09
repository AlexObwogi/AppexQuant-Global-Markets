import React from 'react';
import { QuantisNavManagerModal } from './QuantisNavManagerModal';
import { DerivApiTokenModal } from './DerivApiTokenModal';
import { DerivOAuthModal } from './DerivOAuthModal';
import { UploadBotModal } from './UploadBotModal';
import { FreeBotsModal } from './FreeBotsModal';
import { QuickStrategyModal } from './QuickStrategyModal';
import { SmartScanModal } from './SmartScanModal';
import { AutoPilotModal } from './AutoPilotModal';
import { CopilotScannerModal } from './CopilotScannerModal';

export const QuantisModalsContainer: React.FC = () => {
  return (
    <>
      <QuantisNavManagerModal />
      <DerivApiTokenModal />
      <DerivOAuthModal />
      <UploadBotModal />
      <FreeBotsModal />
      <QuickStrategyModal />
      <SmartScanModal />
      <AutoPilotModal />
      <CopilotScannerModal />
    </>
  );
};
