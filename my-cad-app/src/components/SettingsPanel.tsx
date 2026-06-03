import React from 'react';
import { Settings2, Download, Play, Pause } from 'lucide-react';

interface SettingsPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  linesCount: number;
  setLinesCount: (val: number) => void;
  amplitude: number;
  setAmplitude: (val: number) => void;
  frequency: number;
  setFrequency: (val: number) => void;
  spacing: number;
  setSpacing: (val: number) => void;
  noiseOffset: number;
  setNoiseOffset: (val: number) => void;
  seed: number;
  setSeed: (val: number) => void;
  zRange: [number, number];
  setZRange: (val: [number, number]) => void;
  previewZ: number;
  isAnimating: boolean;
  setIsAnimating: (val: boolean) => void;
  exportRadius: number;
  setExportRadius: (val: number) => void;
  exportHeight: number;
  setExportHeight: (val: number) => void;
  exportThickness: number;
  setExportThickness: (val: number) => void;
  generateAndDownloadSTL: () => void;
}

export function SettingsPanel({
  activeTab, setActiveTab, linesCount, setLinesCount, amplitude, setAmplitude,
  frequency, setFrequency, spacing, setSpacing, noiseOffset, setNoiseOffset,
  seed, setSeed, zRange, setZRange, previewZ, isAnimating, setIsAnimating,
  exportRadius, setExportRadius, exportHeight, setExportHeight,
  exportThickness, setExportThickness, generateAndDownloadSTL
}: SettingsPanelProps) {

  return (
    <div className="w-full md:w-[380px] h-[50dvh] md:h-full bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col z-10">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 p-2 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('2d')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${activeTab === '2d' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Settings2 size={18} /> Настройки 2D
        </button>
        <button
          onClick={() => setActiveTab('3d')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${activeTab === '3d' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Download size={18} /> Экспорт в 3D
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
        <div>
        {activeTab === '2d' ? (
          <>
            <div className="p-4 bg-slate-800/50 rounded-xl mb-6">
               <div className="flex justify-between items-center mb-2">
                 <div>
                   <div className="text-cyan-400 font-medium">Диапазон шума (Z)</div>
                   <div className="text-xs text-slate-500">Начало: {zRange[0].toFixed(1)} / Конец: {zRange[1].toFixed(1)}</div>
                 </div>
                 <button
                   className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600/80 transition-all"
                   onClick={() => setIsAnimating(!isAnimating)}
                 >
                   {isAnimating ? <Pause size={18} className="text-slate-200" /> : <Play size={18} className="text-slate-200" />}
                 </button>
               </div>

               {/* Custom Double Slider */}
               <div className="double-slider-container mb-2 relative h-4">
                   <div className="double-slider-track absolute w-full h-1 bg-slate-700 top-1/2 -translate-y-1/2 rounded-full"></div>
                   <div
                     className="double-slider-range absolute h-1 bg-cyan-500 top-1/2 -translate-y-1/2 rounded-full"
                     style={{
                       left: `${(zRange[0] / 10) * 100}%`,
                       width: `${((zRange[1] - zRange[0]) / 10) * 100}%`
                     }}
                   ></div>
                   <input
                     type="range"
                     min="0" max="10" step="0.1"
                     value={zRange[0]}
                     onChange={(e) => setZRange([Math.min(Number(e.target.value), zRange[1] - 0.1), zRange[1]])}
                     className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:appearance-none"
                   />
                   <input
                     type="range"
                     min="0" max="10" step="0.1"
                     value={zRange[1]}
                     onChange={(e) => setZRange([zRange[0], Math.max(Number(e.target.value), zRange[0] + 0.1)])}
                     className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:appearance-none"
                   />
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Количество линий</span>
                <span className="font-mono text-cyan-400">{linesCount}</span>
              </div>
              <input type="range" min="10" max="100" value={linesCount} onChange={(e) => setLinesCount(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Амплитуда изгиба</span>
                <span className="font-mono text-cyan-400">{amplitude}</span>
              </div>
              <input type="range" min="10" max="300" value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Частота волн</span>
                <span className="font-mono text-cyan-400">{frequency.toFixed(1)}</span>
              </div>
              <input type="range" min="0.1" max="15" step="0.1" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Интервал (разлет)</span>
                <span className="font-mono text-cyan-400">{spacing}</span>
              </div>
              <input type="range" min="1" max="50" step="1" value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Различие изгибов</span>
                <span className="font-mono text-cyan-400">{noiseOffset.toFixed(3)}</span>
              </div>
              <input type="range" min="0" max="0.5" step="0.001" value={noiseOffset} onChange={(e) => setNoiseOffset(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-slate-800/50 rounded-xl mb-4 text-sm text-slate-300">
              Перетащите область холста для вращения 3D-просмотра.
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Радиус кольца (мм)</span>
                <span className="font-mono text-cyan-400">{exportRadius}</span>
              </div>
              <input type="range" min="5" max="30" value={exportRadius} onChange={(e) => setExportRadius(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Высота кольца (мм)</span>
                <span className="font-mono text-cyan-400">{exportHeight}</span>
              </div>
              <input type="range" min="2" max="20" value={exportHeight} onChange={(e) => setExportHeight(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Толщина линии (мм)</span>
                <span className="font-mono text-cyan-400">{exportThickness.toFixed(1)}</span>
              </div>
              <input type="range" min="0.2" max="3" step="0.1" value={exportThickness} onChange={(e) => setExportThickness(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <button
              onClick={generateAndDownloadSTL}
              className="w-full py-4 mt-6 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white rounded-xl font-medium transition-all flex justify-center items-center gap-2"
            >
              <Download size={20} /> Скачать STL
            </button>
          </>
        )}
        </div>

        {/* Seed Button at bottom */}
        <div className="pt-4 mt-4">
          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1000) + 1)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl font-medium transition-all flex justify-center items-center gap-2"
          >
            <Settings2 size={18} /> Новая форма (Seed)
          </button>
        </div>
      </div>
    </div>
  );
}
