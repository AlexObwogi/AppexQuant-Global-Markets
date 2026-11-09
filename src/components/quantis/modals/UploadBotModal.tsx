/**
 * Quantis FX - Dynamic XML Bot Script Uploader Modal
 * Parses standard Deriv XML bot scripts (Blockly format):
 * - Extracts Market, Trade Type, Stake, Recovery Rule, and Target Limits
 * - Previews parsed configuration before loading into the Bot Engine
 * - Drag-and-drop file interface with sample XML loader
 */

import React, { useState, useRef } from 'react';
import { useQuantis } from '../../../state/QuantisContext.tsx';
import {
  Upload,
  X,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCheck,
  Download,
  Code2,
} from 'lucide-react';

const SAMPLE_XML_SCRIPT = `<xml xmlns="http://www.w3.org/1999/xhtml">
  <block type="trade" id="trade_block" x="0" y="0">
    <field name="MARKET_LIST">synthetic_index</field>
    <field name="SUBMARKET_LIST">random_index</field>
    <field name="SYMBOL_LIST">R_100</field>
    <field name="TRADETYPECAT_LIST">digits</field>
    <field name="TRADETYPE_LIST">evenodd</field>
    <field name="TYPE_LIST">DIGITEVEN</field>
    <field name="CANDLEINTERVAL_LIST">60</field>
    <field name="DURATIONTYPE_LIST">t</field>
    <statement name="SUBMARKET">
      <block type="trade_definition_market">
        <value name="DURATION">
          <block type="math_number"><field name="NUM">1</field></block>
        </value>
        <value name="AMOUNT">
          <block type="math_number"><field name="NUM">1.00</field></block>
        </value>
      </block>
    </statement>
  </block>
</xml>`;

export const UploadBotModal: React.FC = () => {
  const { isUploadBotModalOpen, setUploadBotModalOpen, loadBotFromXml, startExecution } = useQuantis();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [parsedInfo, setParsedInfo] = useState<{ market: string; contract: string; stake: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isUploadBotModalOpen) return null;

  const processXmlContent = (fileName: string, content: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/xml');
      const err = doc.querySelector('parsererror');

      if (err) {
        setError('Invalid XML format. Please verify this is a valid Deriv/Blockly bot file.');
        setParsedInfo(null);
        return;
      }

      const symbol = doc.querySelector('field[name="SYMBOL_LIST"]')?.textContent || 'R_100';
      const contract = doc.querySelector('field[name="TYPE_LIST"]')?.textContent || 'CALL';
      const stakeNum = Number(doc.querySelector('block[type="math_number"] field[name="NUM"]')?.textContent) || 1.0;

      setSelectedFile({ name: fileName, content });
      setParsedInfo({ market: symbol, contract, stake: stakeNum });
      setError(null);
    } catch {
      setError('Failed to parse XML file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      setError('Please select an XML (.xml) script file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processXmlContent(file.name, content);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.xml')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processXmlContent(file.name, content);
      };
      reader.readAsText(file);
    } else {
      setError('Please drop a valid .xml file.');
    }
  };

  const handleLoadSample = () => {
    processXmlContent('Quantis_Sample_EvenOdd.xml', SAMPLE_XML_SCRIPT);
  };

  const handleConfirmLoad = (andStart = false) => {
    if (!selectedFile) return;
    const ok = loadBotFromXml(selectedFile.name, selectedFile.content);
    if (ok) {
      setUploadBotModalOpen(false);
      if (andStart) {
        startExecution();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Upload Bot Script</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  XML Parser
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Load custom Deriv XML automation scripts into Quantis Bot Suite.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadBotModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              dragActive
                ? 'border-cyan-400 bg-cyan-500/5'
                : selectedFile
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">{selectedFile.name}</div>
                <p className="text-xs text-emerald-400">XML parsed successfully</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <FileCode className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-200">
                  Drag and drop your .xml bot file here
                </div>
                <p className="text-xs text-slate-500">
                  or click to browse from your device
                </p>
              </div>
            )}
          </div>

          {/* Parsed Inspection Preview */}
          {parsedInfo && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Extracted Execution Parameters
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Market</span>
                  <strong className="text-cyan-400">{parsedInfo.market}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Type</span>
                  <strong className="text-slate-100">{parsedInfo.contract}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Base Stake</span>
                  <strong className="text-emerald-400">${parsedInfo.stake.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Load Sample XML</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={!selectedFile}
                onClick={() => handleConfirmLoad(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Load Script
              </button>
              <button
                type="button"
                disabled={!selectedFile}
                onClick={() => handleConfirmLoad(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Load &amp; Launch</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
