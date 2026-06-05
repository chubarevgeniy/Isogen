import React from 'react';
import { Settings2, Download, RotateCcw, Box, Play, Pause, Layers, Cuboid, Circle, Square } from 'lucide-react';

interface SettingsPanelProps {
  previewMode: 'flat' | '3d' | 'stl';
  setPreviewMode: (mode: 'flat' | '3d' | 'stl') => void;
  isStlOutdated: boolean;
  isExporting: boolean;
  generateSTL: () => void;
  noiseType: 'value' | 'perlin';
  setNoiseType: (val: 'value' | 'perlin') => void;
      outerShape: 'circle' | 'square';
  setOuterShape: (val: 'circle' | 'square') => void;
  lineAngle: number;
  setLineAngle: (val: number) => void;
  linesCount: number;
  setLinesCount: (val: number) => void;
  amplitude: number;
  setAmplitude: (val: number) => void;
  frequencyX: number;
  setFrequencyX: (val: number) => void;
  spacing: number;
  setSpacing: (val: number) => void;
  noiseOffsetY: number;
  noiseOffsetZ: number;
  setNoiseOffsetY: (val: number) => void;
  setNoiseOffsetZ: (val: number) => void;
  seed: number;
  setSeed: (val: number) => void;
  zStart: number;
  setZStart: (val: number) => void;
  zLength: number;
  setZLength: (val: number) => void;
  zMultiplier: number;
  setZMultiplier: (val: number) => void;
  previewZ: number;
  isAnimating: boolean;
  setIsAnimating: (val: boolean) => void;
  exportRadius: number;
  setExportRadius: (val: number) => void;
  exportHeight: number;
  setExportHeight: (val: number) => void;
  exportThickness: number;
  setExportThickness: (val: number) => void;
  exportQuality: number;
  setExportQuality: (val: number) => void;
  downloadSTL: () => void;
  clearSTL: () => void;
  stlUrl: string | null;
}

export function SettingsPanel({
  previewMode, setPreviewMode,
  isStlOutdated, isExporting, generateSTL,
  noiseType, setNoiseType, outerShape, setOuterShape, lineAngle, setLineAngle,
  linesCount, setLinesCount, amplitude, setAmplitude,
  frequencyX, setFrequencyX, spacing, setSpacing, noiseOffsetY, setNoiseOffsetY, noiseOffsetZ, setNoiseOffsetZ,
  seed, setSeed, zStart, setZStart, zLength, setZLength, zMultiplier, setZMultiplier, previewZ, isAnimating, setIsAnimating,
  exportRadius, setExportRadius, exportHeight, setExportHeight,
  exportThickness, setExportThickness, exportQuality, setExportQuality, downloadSTL, clearSTL, stlUrl
}: SettingsPanelProps) {

  return (
    <div className="w-full md:w-[380px] h-[50dvh] md:h-full bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col z-10">
      {/* View Mode Toggle */}
      <div className="flex border-b border-slate-800 p-2 gap-1 shrink-0 bg-slate-950">
        <button
          onClick={() => setPreviewMode('flat')}
          className={`flex-1 py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-xs font-medium ${previewMode === 'flat' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Layers size={16} /> Flat
        </button>
        <button
          onClick={() => setPreviewMode('3d')}
          className={`flex-1 py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-xs font-medium ${previewMode === '3d' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Cuboid size={16} /> 3D Wireframe
        </button>
        <button
          onClick={() => setPreviewMode('stl')}
          className={`flex-1 py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-xs font-medium ${previewMode === 'stl' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Box size={16} /> Solid (STL)
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">

          {/* Shape Settings */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Форма контура</h3>
             <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
               <button
                 onClick={() => setOuterShape('circle')}
                 className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-medium ${outerShape === 'circle' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
               >
                 <Circle size={16} /> Круг
               </button>
               <button
                 onClick={() => setOuterShape('square')}
                 className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-medium ${outerShape === 'square' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
               >
                 <Square size={16} /> Квадрат
               </button>
             </div>
          </div>

          <div className="h-px bg-slate-800 w-full" />

          {/* Dimensional Settings */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Размеры</h3>

             <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{outerShape === 'circle' ? 'Радиус' : 'Размер стороны / 2'} (мм)</span>
                  <span className="font-mono text-cyan-400">{exportRadius}</span>
                </div>
                <input type="range" min="5" max="150" value={exportRadius} onChange={(e) => setExportRadius(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Высота кольца (мм)</span>
                  <span className="font-mono text-cyan-400">{exportHeight}</span>
                </div>
                <input type="range" min="2" max="20" value={exportHeight} onChange={(e) => setExportHeight(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>
          </div>

          <div className="h-px bg-slate-800 w-full" />

          {/* Noise / Pattern Settings */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Форма узора</h3>

             <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-4">
               <button
                 onClick={() => setNoiseType('value')}
                 className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-medium ${noiseType === 'value' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
               >
                 Гладкий (Value)
               </button>
               <button
                 onClick={() => setNoiseType('perlin')}
                 className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-medium ${noiseType === 'perlin' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
               >
                 Перлин (Perlin)
               </button>
             </div>



            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Угол линий (градусы)</span>
                <span className="font-mono text-cyan-400">{lineAngle}°</span>
              </div>
              <input type="range" min="0" max="360" value={lineAngle} onChange={(e) => setLineAngle(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Количество линий</span>
                <span className="font-mono text-cyan-400">{linesCount}</span>
              </div>
              <input type="range" min="10" max="100" value={linesCount} onChange={(e) => setLinesCount(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Амплитуда изгиба</span>
                <span className="font-mono text-cyan-400">{amplitude}</span>
              </div>
              <input type="range" min="1" max="100" value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Частота волн (X)</span>
                <span className="font-mono text-cyan-400">{frequencyX.toFixed(1)}</span>
              </div>
              <input type="range" min="0.1" max="15" step="0.1" value={frequencyX} onChange={(e) => setFrequencyX(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Интервал (разлет)</span>
                <span className="font-mono text-cyan-400">{spacing}</span>
              </div>
              <input type="range" min="0.5" max="15" step="0.5" value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>


            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Различие изгибов (Z)</span>
                <span className="font-mono text-cyan-400">{noiseOffsetZ.toFixed(3)}</span>
              </div>
              <input type="range" min="0" max="5.0" step="0.01" value={noiseOffsetZ} onChange={(e) => setNoiseOffsetZ(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Различие изгибов (Y)</span>
                <span className="font-mono text-cyan-400">{noiseOffsetY.toFixed(3)}</span>
              </div>
              <input type="range" min="0" max="0.1" step="0.001" value={noiseOffsetY} onChange={(e) => setNoiseOffsetY(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div className="p-4 bg-slate-800 rounded-xl mt-4 space-y-4">
              <div className="flex justify-between items-center">
                 <div className="text-cyan-400 font-medium">Диапазон шума (Z)</div>
                 <button
                   className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600/80 transition-all"
                   onClick={() => setIsAnimating(!isAnimating)}
                 >
                   {isAnimating ? <Pause size={18} className="text-slate-200" /> : <Play size={18} className="text-slate-200" />}
                 </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Начало шума (Z)</span>
                  <span className="font-mono text-cyan-400">{zStart.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="10" step="0.1" value={zStart} onChange={(e) => setZStart(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Длина шума (Z)</span>
                  <span className="font-mono text-cyan-400">{zLength.toFixed(2)}</span>
                </div>
                <input type="range" min="0.01" max="0.5" step="0.01" value={zLength} onChange={(e) => setZLength(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Сила смещения (Z)</span>
                  <span className="font-mono text-cyan-400">{zMultiplier.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="5" step="0.1" value={zMultiplier} onChange={(e) => setZMultiplier(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 1000) + 1)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg text-sm font-medium transition-all flex justify-center items-center gap-2"
              >
                <Settings2 size={16} /> Новая форма (Seed)
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-800 w-full" />

          {/* Export Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Настройки экспорта</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Толщина линии (мм)</span>
                  <span className="font-mono text-cyan-400">{exportThickness.toFixed(1)}</span>
                </div>
                <input type="range" min="0.2" max="3" step="0.1" value={exportThickness} onChange={(e) => setExportThickness(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Качество STL по Z (мм)</span>
                  <span className="font-mono text-cyan-400">{exportQuality.toFixed(2)}</span>
                </div>
                <input type="range" min="0.1" max="2.0" step="0.1" value={exportQuality} onChange={(e) => setExportQuality(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>
          </div>

        </div>

        {/* Fixed Bottom Action */}
        <div className="pt-6 mt-6 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-2">
          {stlUrl && !isStlOutdated ? (
            <button
              onClick={downloadSTL}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white rounded-xl font-medium transition-all flex justify-center items-center gap-2 shadow-lg shadow-cyan-900/50"
            >
              <Download size={18} /> Скачать STL файл
            </button>
          ) : (
            <button
              onClick={generateSTL}
              disabled={isExporting}
              className={`w-full py-3 rounded-xl font-medium transition-all flex justify-center items-center gap-2 ${
                 isExporting
                   ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                   : 'bg-slate-700 hover:bg-slate-600 active:scale-95 text-white'
              }`}
            >
              {isExporting ? (
                 <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
               ) : (
                 <Box size={18} />
               )}
              {isExporting ? "Генерация..." : (stlUrl ? "Обновить 3D модель" : "Сгенерировать 3D модель")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
