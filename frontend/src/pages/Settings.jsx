import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import SettingCard from '../components/SettingCard';
import ToggleSwitch from '../components/ToggleSwitch';
import api, { authService } from '../services/authService';

const ROLE_LABELS = {
  captain: 'Captain',
  vice_captain: 'Vice Captain',
  surveillance_head: 'Surveillance Lead',
  engineer: 'Engineer',
  analyst: 'Analyst',
};

const Settings = () => {
  // AI Enhancement Settings
  const [enhancementStrength, setEnhancementStrength] = useState(75);
  const [dehazeFactor, setDehazeFactor] = useState(42);
  const [colorCorrection, setColorCorrection] = useState(true);
  const [lowLightBoost, setLowLightBoost] = useState(false);
  const [waterTurbidity, setWaterTurbidity] = useState('Deep Sea / Blue Water');

  // Threat Detection Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [debrisDetection, setDebrisDetection] = useState(true);
  const [diverRecognition, setDiverRecognition] = useState(true);
  const [subsurfaceDetection, setSubsurfaceDetection] = useState(true);
  const [exclusionList, setExclusionList] = useState(['Fish Shoals', 'Sea Kelp']);

  // Alert Rules
  const [autoAlertCommand, setAutoAlertCommand] = useState(true);
  const [soundNotification, setSoundNotification] = useState(true);
  const [countThreshold, setCountThreshold] = useState(3);
  const [cooldown, setCooldown] = useState(120);

  // Camera Processing
  const [fpsLimit, setFpsLimit] = useState('30 FPS');
  const [recordRawStream, setRecordRawStream] = useState(false);
  const [enhancedArchiving, setEnhancedArchiving] = useState(true);

  // System Admin
  const [aiModel, setAiModel] = useState('NEPTUNE-v4.2.0-STABLE');
  const [visionEngine, setVisionEngine] = useState('CUDA-ACCELERATED-V3');

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);

  const buildPayload = useCallback(
    () => ({
      enhancementStrength,
      dehazeFactor,
      colorCorrection,
      lowLightBoost,
      waterTurbidity,
      confidenceThreshold,
      debrisDetection,
      diverRecognition,
      subsurfaceDetection,
      exclusionList,
      autoAlertCommand,
      soundNotification,
      countThreshold,
      cooldown,
      fpsLimit,
      recordRawStream,
      enhancedArchiving,
      aiModel,
      visionEngine,
    }),
    [
      enhancementStrength,
      dehazeFactor,
      colorCorrection,
      lowLightBoost,
      waterTurbidity,
      confidenceThreshold,
      debrisDetection,
      diverRecognition,
      subsurfaceDetection,
      exclusionList,
      autoAlertCommand,
      soundNotification,
      countThreshold,
      cooldown,
      fpsLimit,
      recordRawStream,
      enhancedArchiving,
      aiModel,
      visionEngine,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSettingsLoading(true);
        const res = await api.get('/settings');
        if (cancelled || !res?.data) return;
        const d = res.data;
        setEnhancementStrength(d.enhancementStrength ?? 75);
        setDehazeFactor(d.dehazeFactor ?? 42);
        setColorCorrection(d.colorCorrection !== false);
        setLowLightBoost(!!d.lowLightBoost);
        setWaterTurbidity(d.waterTurbidity || 'Deep Sea / Blue Water');
        setConfidenceThreshold(
          typeof d.confidenceThreshold === 'number' ? d.confidenceThreshold : 0.85
        );
        setDebrisDetection(d.debrisDetection !== false);
        setDiverRecognition(d.diverRecognition !== false);
        setSubsurfaceDetection(d.subsurfaceDetection !== false);
        setExclusionList(Array.isArray(d.exclusionList) ? d.exclusionList : ['Fish Shoals', 'Sea Kelp']);
        setAutoAlertCommand(d.autoAlertCommand !== false);
        setSoundNotification(d.soundNotification !== false);
        setCountThreshold(d.countThreshold ?? 3);
        setCooldown(d.cooldown ?? 120);
        setFpsLimit(d.fpsLimit || '30 FPS');
        setRecordRawStream(!!d.recordRawStream);
        setEnhancedArchiving(d.enhancedArchiving !== false);
        setAiModel(d.aiModel || 'NEPTUNE-v4.2.0-STABLE');
        setVisionEngine(d.visionEngine || 'CUDA-ACCELERATED-V3');
        setSettingsError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSettingsError('Could not load settings from server.');
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyChanges = async () => {
    try {
      setSaveMsg(null);
      await api.put('/settings', buildPayload());
      setSaveMsg({ type: 'ok', text: 'Settings saved on server.' });
    } catch (e) {
      setSaveMsg({ type: 'err', text: e?.message || 'Save failed.' });
    }
  };

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deep-drishti-station-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profileUser = authService.getCurrentUser();
  const authLevelLabel = profileUser?.role
    ? ROLE_LABELS[profileUser.role] || profileUser.role.replace(/_/g, ' ')
    : '—';

  const addToExclusionList = (item) => {
    if (!exclusionList.includes(item)) {
      setExclusionList([...exclusionList, item]);
    }
  };

  const removeFromExclusionList = (item) => {
    setExclusionList(exclusionList.filter(i => i !== item));
  };

  return (
    <AppShell>
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
        <div className="flex flex-1 min-h-0 overflow-hidden flex-row">
          <main className="flex-1 overflow-y-auto bg-background-dark p-6 min-w-0 min-h-0">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-100 uppercase">System Configuration</h2>
                  <p className="text-sm text-slate-500">Modify AI behavioral logic and sensor processing parameters.</p>
                </div>
                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {settingsLoading && (
                    <span className="text-[10px] text-slate-500">Syncing…</span>
                  )}
                  {settingsError && (
                    <span className="text-[10px] text-amber-400">{settingsError}</span>
                  )}
                  {saveMsg && (
                    <span
                      className={`text-[10px] ${saveMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {saveMsg.text}
                    </span>
                  )}
                  <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleExportConfig}
                    disabled={settingsLoading}
                    className="border border-border-muted px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    Export config
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyChanges}
                    disabled={settingsLoading}
                    className="bg-primary px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-background-dark transition-colors hover:bg-cyan-400 disabled:opacity-50"
                  >
                    Apply changes
                  </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Enhancement Configuration */}
                <SettingCard title="AI Enhancement Configuration" icon="auto_fix_high">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] uppercase text-slate-400">
                      <span>Enhancement Strength</span>
                      <span className="text-primary font-mono">{enhancementStrength}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={enhancementStrength}
                      onChange={(e) => setEnhancementStrength(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] uppercase text-slate-400">
                      <span>Dehaze Factor</span>
                      <span className="text-primary font-mono">{dehazeFactor}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={dehazeFactor}
                      onChange={(e) => setDehazeFactor(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center justify-between p-3 border border-border-muted bg-background-dark/40 cursor-pointer hover:border-primary/50">
                      <span className="text-[11px] uppercase tracking-wide text-slate-300">Color Correction</span>
                      <ToggleSwitch checked={colorCorrection} onChange={setColorCorrection} size="small" aria-label="Color correction" />
                    </label>
                    <label className="flex items-center justify-between p-3 border border-border-muted bg-background-dark/40 cursor-pointer hover:border-primary/50">
                      <span className="text-[11px] uppercase tracking-wide text-slate-300">Low-Light Boost</span>
                      <ToggleSwitch checked={lowLightBoost} onChange={setLowLightBoost} size="small" aria-label="Low-light boost" />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] uppercase text-slate-500">Water Turbidity Mode</span>
                    <select 
                      value={waterTurbidity}
                      onChange={(e) => setWaterTurbidity(e.target.value)}
                      className="w-full bg-background-dark border border-border-muted text-slate-300 text-xs py-2 px-3 focus:border-primary outline-none uppercase tracking-tight"
                    >
                      <option>Coastal / Shallow</option>
                      <option>Deep Sea / Blue Water</option>
                      <option>Estuary / Low Visibility</option>
                      <option>Arctic / Particulate</option>
                    </select>
                  </div>
                </SettingCard>

                {/* Threat Detection Settings */}
                <SettingCard title="Threat Detection Settings" icon="radar">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] uppercase text-slate-400">
                      <span>Confidence Threshold</span>
                      <span className="text-primary font-mono">{confidenceThreshold}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] uppercase text-slate-500">Ignored Objects (Exclusion List)</span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {exclusionList.map((item, index) => (
                        <span 
                          key={index}
                          onClick={() => removeFromExclusionList(item)}
                          className="px-2 py-1 bg-primary text-background-dark text-[10px] font-bold uppercase tracking-tight cursor-pointer"
                        >
                          {item}
                        </span>
                      ))}
                      {['Whales', 'Driftwood'].map((item) => (
                        <span
                          key={item}
                          onClick={() => addToExclusionList(item)}
                          className="px-2 py-1 border border-dashed border-border-muted text-slate-500 text-[10px] font-bold uppercase tracking-tight hover:text-primary transition-colors cursor-pointer"
                        >
                          + {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide py-2 border-b border-border-muted/50">
                      <span className="text-slate-300">Debris Detection</span>
                      <ToggleSwitch checked={debrisDetection} onChange={setDebrisDetection} size="small" aria-label="Debris detection" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide py-2 border-b border-border-muted/50">
                      <span className="text-slate-300">Diver Signature Recognition</span>
                      <ToggleSwitch checked={diverRecognition} onChange={setDiverRecognition} size="small" aria-label="Diver signature recognition" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide py-2">
                      <span className="text-slate-300">Subsurface Craft Detection</span>
                      <ToggleSwitch checked={subsurfaceDetection} onChange={setSubsurfaceDetection} size="small" aria-label="Subsurface craft detection" />
                    </div>
                  </div>
                </SettingCard>

                {/* Alert Rules */}
                <SettingCard title="Alert Rules" icon="warning">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <ToggleSwitch checked={autoAlertCommand} onChange={setAutoAlertCommand} size="small" aria-label="Auto-alert command channel" />
                        <span className="text-[11px] uppercase text-slate-400 group-hover:text-slate-200">Auto-Alert Command</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <ToggleSwitch checked={soundNotification} onChange={setSoundNotification} size="small" aria-label="Sound notifications" />
                        <span className="text-[11px] uppercase text-slate-400 group-hover:text-slate-200">Sound Notification</span>
                      </label>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500">Count Threshold</span>
                        <input 
                          type="number" 
                          value={countThreshold}
                          onChange={(e) => setCountThreshold(parseInt(e.target.value))}
                          className="w-full bg-background-dark border border-border-muted text-slate-300 text-xs py-1.5 px-3 focus:border-primary outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500">Cooldown (sec)</span>
                        <input 
                          type="number" 
                          value={cooldown}
                          onChange={(e) => setCooldown(parseInt(e.target.value))}
                          className="w-full bg-background-dark border border-border-muted text-slate-300 text-xs py-1.5 px-3 focus:border-primary outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </SettingCard>

                {/* Camera Processing */}
                <SettingCard title="Camera Processing" icon="videocam">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500">FPS Limit (Internal)</span>
                        <select 
                          value={fpsLimit}
                          onChange={(e) => setFpsLimit(e.target.value)}
                          className="w-full bg-background-dark border border-border-muted text-slate-300 text-xs py-1.5 px-3 focus:border-primary outline-none"
                        >
                          <option>15 FPS</option>
                          <option>30 FPS</option>
                          <option>60 FPS</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <ToggleSwitch checked={recordRawStream} onChange={setRecordRawStream} size="small" aria-label="Record raw stream" />
                        <span className="text-[11px] uppercase text-slate-400 group-hover:text-slate-200">Record Raw Stream</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <ToggleSwitch checked={enhancedArchiving} onChange={setEnhancedArchiving} size="small" aria-label="Enhanced archiving" />
                        <span className="text-[11px] uppercase text-slate-400 group-hover:text-slate-200">Enhanced Archiving</span>
                      </label>
                    </div>
                  </div>
                </SettingCard>

                {/* System Admin */}
                <SettingCard title="Global System Management" icon="memory" isFullWidth>
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-slate-500">Primary AI Model</span>
                          <select 
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full bg-background-dark border border-border-muted text-slate-300 text-xs py-2 px-3 focus:border-primary outline-none"
                          >
                            <option>NEPTUNE-v4.2.0-STABLE</option>
                            <option>NEPTUNE-v4.3.1-BETA</option>
                            <option>ORCA-v1.0.0-DEEP</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-slate-500">Vision Engine</span>
                          <select 
                            value={visionEngine}
                            onChange={(e) => setVisionEngine(e.target.value)}
                            className="w-full bg-background-dark border border-border-muted text-slate-300 text-xs py-2 px-3 focus:border-primary outline-none"
                          >
                            <option>CUDA-ACCELERATED-V3</option>
                            <option>TENSOR-OPT-LITE</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto md:pt-5">
                      <button className="flex-1 md:flex-none px-6 py-2 bg-primary text-background-dark text-[11px] font-bold uppercase tracking-widest hover:bg-cyan-400">
                        Reload AI Models
                      </button>
                      <button className="flex-1 md:flex-none px-6 py-2 border border-rose-500/50 text-rose-500 text-[11px] font-bold uppercase tracking-widest hover:bg-rose-500/10">
                        Clear Cache
                      </button>
                    </div>
                  </div>
                </SettingCard>
              </div>
            </div>
          </main>

          {/* Right Context Panel */}
          <aside className="w-80 border-l border-border-muted bg-panel-dark/40 flex flex-col">
            <div className="p-5 border-b border-border-muted">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">Context Intelligence</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase">Real-time parameter documentation and status summary.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-8">
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                  Parameter Help
                </h4>
                <div className="p-4 bg-background-dark/50 border-l-2 border-primary">
                  <span className="text-[10px] font-bold text-primary uppercase block mb-1">Confidence Threshold</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed tracking-tight">
                    Sets the minimum statistical certainty required for the AI to classify a sonar/optical blip as a confirmed threat. Higher values reduce false positives but may delay detection in murky conditions. Recommended value for Sector Zulu-9 is <span className="text-slate-200">0.82 or higher</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Active Profile Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-border-muted/30">
                    <span className="text-[10px] text-slate-500 uppercase">Profile Hash</span>
                    <span className="text-[10px] text-slate-300 font-mono">0x4F8A...E2</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-muted/30">
                    <span className="text-[10px] text-slate-500 uppercase">Last Sync</span>
                    <span className="text-[10px] text-slate-300">02m 44s ago</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-muted/30">
                    <span className="text-[10px] text-slate-500 uppercase">Auth Level</span>
                    <span className="text-[10px] font-bold uppercase text-emerald-500">
                      {authLevelLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-muted/30">
                    <span className="text-[10px] text-slate-500 uppercase">Encryption</span>
                    <span className="text-[10px] text-slate-300">AES-256 Enabled</span>
                  </div>
                </div>
              </div>

              {/* Signal Stability Graph */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Signal Stability</h4>
                <div className="h-16 flex items-end gap-1 px-1">
                  {[60, 40, 80, 70, 90, 50, 65, 85, 45, 100].map((height, index) => (
                    <div 
                      key={index}
                      className={`w-full bg-primary/40 h-[${height}%] ${
                        index === 9 ? 'bg-primary' : ''
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                  <span>-60db</span>
                  <span>0db</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border-muted bg-panel-dark">
              <div className="text-[9px] text-slate-600 uppercase mb-2">Terminal Output</div>
              <div className="font-mono text-[10px] text-emerald-500/80 leading-tight space-y-1">
                <div>&gt; SYSLOG: AI_CORE_SYNC_SUCCESS</div>
                <div>&gt; WARN: PKT_LOSS_SECTOR_7 (0.02%)</div>
                <div>&gt; USER: OVERRIDE_INITIATED</div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="h-8 shrink-0 bg-background-dark border-t border-border-muted px-6 flex items-center justify-between">
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">System Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">Latency: 4ms</span>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
            Session ID: MAS-8821-XRA-99 | v4.2.0-STABLE_RELEASE
          </div>
        </footer>
      </div>
    </AppShell>
  );
};

export default Settings;
