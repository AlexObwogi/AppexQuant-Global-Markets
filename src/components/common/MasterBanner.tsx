import React from 'react';

export const MasterBanner: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center gap-4 py-8 px-4">
      {/* Raster Image Asset */}
      <img 
        src="/file_00000000004c81f48495c29562b1260a.png" 
        alt="AppexQuant Master Banner"
        className="w-full max-w-[480px] md:max-w-[1200px] h-auto object-contain"
        referrerPolicy="no-referrer"
      />
      {/* Top Corner Taglines */}
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold tracking-[0.2em] text-cyan-400 uppercase">INTELLIGENCE. EXECUTION. EDGE.</h2>
        <p className="text-[10px] tracking-[0.3em] text-slate-400 uppercase">TRADE SMARTER. AUTOMATE BETTER. GROW FURTHER.</p>
      </div>
    </div>
  );
};
