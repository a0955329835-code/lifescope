"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProjectionChart from "@/components/charts/ProjectionChart";
import FanChart from "@/components/charts/FanChart";
import CompareChart from "@/components/charts/CompareChart";
import {
  BasicParams,
  HousingParams,
  LifeStage,
  FAMILY_MULTIPLIERS,
  calculateProjection,
  calculateHousingCompare,
  calculateFIREAge,
  formatTWD,
  formatNumber,
  calculateMonthlyMortgage,
  calculateMonthlyLoanPayment,
} from "@/lib/calculator";
import {
  getScenarios,
  saveScenario,
  deleteScenario,
  canSaveMore,
  Scenario,
} from "@/lib/scenarios";

const ETF_PRESETS = [
  { name: "VOO/SPY (美股大盤)", return: 10, vol: 15 },
  { name: "QQQ (納斯達克)", return: 13, vol: 20 },
  { name: "VT (全球股市)", return: 8, vol: 14 },
  { name: "0050 (台灣50)", return: 9, vol: 16 },
  { name: "保守股債配置", return: 6, vol: 8 }
];

const CRISIS_SCENARIOS = [
  { id: "none", name: "祈禱世界和平 (無突發崩盤)", events: [], description: "風平浪靜地度過，僅受預設市場波動率影響。" },
  { id: "custom", name: "設定單次破釜沉舟打擊 (自訂)", events: [], description: "由你自行決定在未來的哪一年，遭遇多達多少比例的單次毀滅性崩盤。" },
  { id: "dotcom_2008", name: "千禧年雙重打擊 (網路泡沫 + 金融海嘯)", events: [{ year: 0, drop: 40 }, { year: 8, drop: 50 }], description: "模擬爆發當年遭遇網路泡沫 (-40%)，好不容易存活了 8 年，立刻又遭遇金融海嘯 (-50%) 的煉獄期。" },
  { id: "great_depression", name: "1929 經濟大恐慌 (連跌三年重創)", events: [{ year: 0, drop: 30 }, { year: 1, drop: 25 }, { year: 2, drop: 25 }], description: "模擬美股史上最慘烈的連環熊市，爆發後連續三年分別遭遇 -30%、-25%、-25% 的毀滅性連擊。" },
  { id: "covid_inflation", name: "新冠恐慌與通膨緊縮 (短期雙跌)", events: [{ year: 0, drop: 30 }, { year: 2, drop: 25 }], description: "模擬爆發當年引發疫情式閃崩 (-30%)，短暫恢復後，短短兩年內隨即迎來通膨緊縮股災 (-25%)。" },
];

const STAGE_LABELS = ["🧒 年輕養成期", "👨‍👩‍👧 家庭壯年期", "🧓 退休空巢期"];
const FAMILY_OPTIONS = [
  { value: 1, label: "👤 單身 (1人)" },
  { value: 2, label: "👥 兩人世界" },
  { value: 3, label: "👨‍👩‍👧 核心家庭 (3人)" },
  { value: 4, label: "👨‍👩‍👧‍👦 四口之家" },
  { value: 5, label: "🏡 大家庭 (5人)" },
  { value: 6, label: "🏡 三代同堂 (6人+)" },
];

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  id,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  id: string;
  hint?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            id={id}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="input-field text-right !w-24 !py-1 text-sm number-display"
            min={min}
            max={max}
            step={step}
          />
          <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      {hint && <p className="text-[11px] mt-1.5 opacity-60 leading-relaxed" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

// --- Unified UI Components ---

function SectionHeader({ icon, title, colorHex, bgColorHex }: { icon: string, title: string, colorHex: string, bgColorHex: string }) {
  return (
    <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm" style={{ background: bgColorHex, color: colorHex }}>
        {icon}
      </span>
      {title}
    </h2>
  );
}

function SubSectionHeader({ title, colorHex, children }: { title: string, colorHex: string, children?: React.ReactNode }) {
  return (
    <div className="mt-8 mb-5 border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span className="w-1.5 h-4 rounded-full shadow-sm" style={{ background: colorHex }} />
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

function InfoBox({ children, colorHex, dashed = false, className = "" }: { children: React.ReactNode, colorHex: string, dashed?: boolean, className?: string }) {
  return (
    <div
      className={`p-3.5 rounded-xl mb-4 ${className}`}
      style={{
        background: `${colorHex}08`,
        border: `1px ${dashed ? 'dashed' : 'solid'} ${colorHex}30`
      }}
    >
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, colorClass }: { checked: boolean, onChange: (checked: boolean) => void, colorClass: string }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 ${colorClass}`}></div>
    </label>
  );
}

// --- End Unified UI Components ---


function LeverageBlock({ 
  isLeverageEnabled, 
  setIsLeverageEnabled, 
  basicParams, 
  updateBasic, 
  computedMonthlyLoan 
}: { 
  isLeverageEnabled: boolean;
  setIsLeverageEnabled: (v: boolean) => void;
  basicParams: BasicParams;
  updateBasic: (k: keyof BasicParams, v: number) => void;
  computedMonthlyLoan: number;
}) {
  return (
    <>
      <SubSectionHeader title="⚖️ 財務槓桿策略 (信貸)" colorHex="#3b82f6">
        <ToggleSwitch
          checked={isLeverageEnabled}
          onChange={(v) => {
            setIsLeverageEnabled(v);
            if (!v) updateBasic("leverageAmount", 0);
          }}
          colorClass="peer-checked:bg-blue-500"
        />
      </SubSectionHeader>

      {isLeverageEnabled && (
        <InfoBox colorHex="#3b82f6" dashed>
          <div className="p-2.5 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
            ⚠️ <b>現金流提醒：</b> 系統已自動從「月投資額」中扣除貸款本息。若投資額不足，將會自動變賣資產償還。
          </div>
          <SliderInput id="leverageAmount" label="借貸本金" value={basicParams.leverageAmount || 0} onChange={(v) => updateBasic("leverageAmount", v)} min={0} max={20000000} step={100000} unit="元" />
          <SliderInput id="leverageRate" label="貸款年利率" value={basicParams.leverageRate || 0} onChange={(v) => updateBasic("leverageRate", v)} min={1} max={15} step={0.1} unit="%" />
          <SliderInput id="leverageYears" label="貸款年限" value={basicParams.leverageYears || 0} onChange={(v) => updateBasic("leverageYears", v)} min={1} max={30} step={1} unit="年" />
          <SliderInput id="leverageRecurYears" label="自動續借頻率" value={basicParams.leverageRecurYears || 0} onChange={(v) => updateBasic("leverageRecurYears", v)} min={0} max={10} step={1} unit="年" hint="0 代表不續借。每隔 X 年自動補足本金並重置債務。" />
          
          {(basicParams.leverageAmount || 0) > 0 && (basicParams.leverageYears || 0) > 0 && (
            <div className="mt-5 p-2.5 rounded-lg text-xs font-medium flex justify-between items-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <span>💡 試算每月還本付息：</span>
              <span className="text-sm font-bold">約 {formatNumber(computedMonthlyLoan)} 元</span>
            </div>
          )}
        </InfoBox>
      )}
    </>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl sm:text-3xl font-bold number-display" style={{ color: color || "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function CompactInput({
  label, value, onChange, unit, step = 1, min, max,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit: string; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="text-xs block mb-1 font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          min={min}
          max={max}
          className="input-field !py-1.5 text-sm number-display flex-1 text-right"
        />
        <span className="text-xs shrink-0 w-4" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
    </div>
  );
}

function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "housing" ? "housing" : searchParams.get("tab") === "mc" ? "mc" : "basic";

  const [activeTab, setActiveTab] = useState<"basic" | "housing" | "mc">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "housing" || tabParam === "basic" || tabParam === "mc") {
      setActiveTab(tabParam as "basic" | "housing" | "mc");
    } else {
      setActiveTab("basic");
    }
  }, [searchParams]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Basic params
  const [basicParams, setBasicParams] = useState<BasicParams>({
    currentAssets: 500000,
    monthlyIncome: 50000,
    monthlyExpense: 30000,
    monthlyInvestment: 15000,
    annualReturn: 7,
    investmentYears: 30,
    inflationRate: 2,
    salaryGrowthRate: 3,
    leverageAmount: 0,
    leverageRate: 2.5,
    leverageYears: 7,
    leverageRecurYears: 0,
    isEventsEnabled: false,
    customEvents: [],
  });

  const [isLeverageEnabled, setIsLeverageEnabled] = useState(false);

  // Life stages (global)
  const [lifeStages, setLifeStages] = useState<LifeStage[]>([
    { endYear: 10, familySize: 1 },
    { endYear: 30, familySize: 3 },
    { endYear: 50, familySize: 2 },
  ]);

  // Housing params
  const [housingParams, setHousingParams] = useState<HousingParams>({
    initialCapital: 5000000,
    housePrice: 15000000,
    downPaymentPercent: 20,
    loanRate: 2.1,
    loanYears: 30,
    monthlyRent: 18000,
    rentIncreaseRate: 2,
    investReturn: 7,
    maintenanceRate: 1,
    houseAppreciationRate: 2,
    yearsToCompare: 50,
  });

  useEffect(() => {
    setScenarios(getScenarios());
  }, []);

  const [mcParams, setMcParams] = useState({
    phase: "accumulation",
    volatility: 15,
    isScenarioEnabled: false,
    scenarioId: "custom",
    blackSwanYear: 0,
    blackSwanDrop: 30,
    isJumpEnabled: false,
    jumpProbability: 5,
    jumpImpact: 20,
    isDynamic: false,
    dynamicRatio: 20,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mcResult, setMcResult] = useState<any>(null);
  const [isLoadingMC, setIsLoadingMC] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMC = useCallback((key: string, val: any) => {
    setMcParams((p) => ({ ...p, [key]: val }));
  }, []);

  const runMonteCarlo = async () => {
    setIsLoadingMC(true);
    try {
      let scenarioEvents: { year: number, drop: number }[] = [];
      if (mcParams.isScenarioEnabled && mcParams.scenarioId !== "none") {
        const activeScenario = CRISIS_SCENARIOS.find(s => s.id === mcParams.scenarioId);
        const startYear = mcParams.blackSwanYear;

        scenarioEvents = activeScenario?.id === "custom"
          ? (startYear > 0 ? [{ year: startYear, drop: mcParams.blackSwanDrop }] : [])
          : (startYear > 0 ? (activeScenario?.events.map(ev => ({ year: startYear + ev.year, drop: ev.drop })) || []) : []);
      }

      const payload = {
        initialAssets: basicParams.currentAssets,
        monthlyContribution: mcParams.phase === "accumulation" ? basicParams.monthlyInvestment : 0,
        monthlyWithdrawal: mcParams.phase === "decumulation" ? basicParams.monthlyExpense : 0,
        years: basicParams.investmentYears,
        expectedReturn: basicParams.annualReturn,
        volatility: mcParams.volatility,
        inflationMean: basicParams.inflationRate,
        blackSwanEvents: scenarioEvents,
        jumpProbability: mcParams.isJumpEnabled ? mcParams.jumpProbability : 0,
        jumpImpact: mcParams.jumpImpact,
        isDynamic: mcParams.isDynamic,
        dynamicRatio: mcParams.dynamicRatio,
        lifeStages: lifeStages,
        salaryGrowthRate: basicParams.salaryGrowthRate,
        leverageAmount: isLeverageEnabled ? (basicParams.leverageAmount || 0) : 0,
        leverageRate: isLeverageEnabled ? (basicParams.leverageRate || 0) : 0,
        leverageYears: isLeverageEnabled ? (basicParams.leverageYears || 0) : 0,
        leverageRecurYears: isLeverageEnabled ? (basicParams.leverageRecurYears || 0) : 0,
      };

      const API_URL = process.env.NEXT_PUBLIC_MC_API_URL;
      if (!API_URL) {
        throw new Error("Missing API URL configured in environment variables.");
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setMcResult(data);
    } catch {
      alert("模擬失敗，請稍後再試或檢查網路！");
    } finally {
      setIsLoadingMC(false);
    }
  };

  const updateBasic = useCallback(<K extends keyof BasicParams>(key: K, val: BasicParams[K]) => {
    setBasicParams((p) => ({ ...p, [key]: val }));
  }, []);

  const updateHousing = useCallback((key: keyof HousingParams, val: number) => {
    setHousingParams((p) => ({ ...p, [key]: val }));
  }, []);

  // Compute results
  const projectionData = useMemo(() => calculateProjection(basicParams, lifeStages), [basicParams, lifeStages]);
  const housingData = useMemo(() => calculateHousingCompare(housingParams), [housingParams]);
  const fireYears = useMemo(() => calculateFIREAge(basicParams, lifeStages), [basicParams, lifeStages]);

  const computedMonthlyLoan = useMemo(() => {
    return Math.round(calculateMonthlyLoanPayment(basicParams.leverageAmount || 0, basicParams.leverageRate || 0, basicParams.leverageYears || 0));
  }, [basicParams.leverageAmount, basicParams.leverageRate, basicParams.leverageYears]);

  const computedMortgage = useMemo(() => {
    const downPayment = housingParams.housePrice * (housingParams.downPaymentPercent / 100);
    const loanAmount = housingParams.housePrice - downPayment;
    return Math.round(calculateMonthlyMortgage(loanAmount, housingParams.loanRate, housingParams.loanYears));
  }, [housingParams.housePrice, housingParams.downPaymentPercent, housingParams.loanRate, housingParams.loanYears]);

  const finalAssets = projectionData[projectionData.length - 1]?.assets || 0;
  const finalPortfolio = projectionData[projectionData.length - 1]?.portfolioValue || 0;
  const finalLoan = projectionData[projectionData.length - 1]?.loanBalance || 0;
  const totalInvested = projectionData[projectionData.length - 1]?.invested || 0;
  const totalReturns = projectionData[projectionData.length - 1]?.returns || 0;
  const monthlyPassiveIncome = finalAssets * 0.04 / 12;

  const housingFinal = housingData[housingData.length - 1];
  const housingDiff = housingFinal ? housingFinal.rentNetWorth - housingFinal.buyNetWorth : 0;

  const handleSave = () => {
    if (!saveName.trim()) {
      setSaveMessage("請輸入劇本名稱");
      return;
    }
    if (!canSaveMore()) {
      setSaveMessage("免費版最多存 3 組劇本");
      return;
    }
    const result = saveScenario({
      name: saveName.trim(),
      params: basicParams,
      housingParams,
      mcParams,
      lifeStages,
    });
    if (result) {
      setScenarios(getScenarios());
      setSaveName("");
      setSaveMessage("✅ 已儲存！");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const handleLoad = (scenario: Scenario) => {
    setBasicParams(scenario.params);
    if (scenario.housingParams) {
      setHousingParams(scenario.housingParams);
    }
    if (scenario.mcParams) {
      setMcParams((prev) => ({
        ...prev,
        ...scenario.mcParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isJumpEnabled: (scenario.mcParams as any).isJumpEnabled || false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isScenarioEnabled: (scenario.mcParams as any).isScenarioEnabled || false,
      }));
    }
    if (scenario.lifeStages) {
      setLifeStages(scenario.lifeStages);
    }
    setIsLeverageEnabled((scenario.params.leverageAmount || 0) > 0);
    setSaveMessage(`✅ 已載入「${scenario.name}」`);
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleDelete = (id: string) => {
    deleteScenario(id);
    setScenarios(getScenarios());
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              財務<span style={{ color: "var(--accent-primary)" }}>沙盤推演</span>
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              拖動滑桿即時看到你的財務未來走向。所有運算在你的瀏覽器中完成，資料不會上傳。
            </p>
          </div>

          {/* === Global Config Band === */}
          <div className="glass-card p-5 mb-6 relative overflow-hidden" style={{ border: "1px solid var(--accent-primary-dim)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--accent-primary)" }}>
                  <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                  全局基礎參數
                </span>
                <span className="text-xs opacity-70" style={{ color: "var(--text-muted)" }}>（以下設定會影響所有分頁的計算）</span>
              </div>
              
              {/* ETF 預設移動至此 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium mr-1" style={{ color: "var(--text-secondary)" }}>快速套用市場假設：</span>
                {ETF_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => { 
                      updateBasic("annualReturn", preset.return); 
                      updateMC("volatility", preset.vol); 
                    }}
                    className="px-2.5 py-1 text-[11px] rounded-full border transition-all hover:bg-white/5 active:scale-95"
                    style={{ 
                      borderColor: basicParams.annualReturn === preset.return ? "var(--accent-primary)" : "var(--border-subtle)", 
                      background: basicParams.annualReturn === preset.return ? "var(--accent-primary-dim)" : "transparent",
                      color: basicParams.annualReturn === preset.return ? "var(--accent-primary)" : "var(--text-secondary)",
                      fontWeight: basicParams.annualReturn === preset.return ? 600 : 400
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
              <CompactInput label="現有資產" value={basicParams.currentAssets} onChange={(v) => updateBasic("currentAssets", v)} unit="元" step={100000} min={0} max={150000000} />
              <CompactInput label="計畫年數" value={basicParams.investmentYears} onChange={(v) => updateBasic("investmentYears", v)} unit="年" step={1} min={1} max={50} />
              <CompactInput label="年化報酬率" value={basicParams.annualReturn} onChange={(v) => updateBasic("annualReturn", v)} unit="%" step={0.5} min={0} max={20} />
              <CompactInput label="通膨率" value={basicParams.inflationRate} onChange={(v) => updateBasic("inflationRate", v)} unit="%" step={0.5} min={0} max={10} />
              <CompactInput label="年調薪幅度" value={basicParams.salaryGrowthRate} onChange={(v) => updateBasic("salaryGrowthRate", v)} unit="%" step={0.5} min={0} max={10} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--bg-secondary)" }}>
            <button id="tab-basic" className={`tab-button ${activeTab === "basic" ? "active" : ""}`} onClick={() => setActiveTab("basic")}>
              📈 複利試算
            </button>
            <button id="tab-housing" className={`tab-button ${activeTab === "housing" ? "active" : ""}`} onClick={() => setActiveTab("housing")}>
              🏠 租屋 vs 買房
            </button>
            <button id="tab-mc" className={`tab-button ${activeTab === "mc" ? "active" : ""}`} onClick={() => setActiveTab("mc")}>
              🎲 蒙地卡羅壓測
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ===== Left Panel: Tab-Specific Controls ===== */}
            <div className="lg:col-span-4">
              <div className="glass-card p-6 sticky top-20">
                {/* --- 複利試算 --- */}
                {activeTab === "basic" && (
                  <>
                    <SectionHeader icon="⚙" title="現況與收支設定" colorHex="var(--accent-primary)" bgColorHex="var(--accent-primary-dim)" />
                    <SliderInput id="monthlyIncome" label="月收入" value={basicParams.monthlyIncome} onChange={(v) => updateBasic("monthlyIncome", v)} min={0} max={2000000} step={5000} unit="元" />
                    <SliderInput id="monthlyExpense" label="月支出" value={basicParams.monthlyExpense} onChange={(v) => updateBasic("monthlyExpense", v)} min={0} max={1000000} step={5000} unit="元" />
                    <SliderInput id="monthlyInvestment" label="月投資額" value={basicParams.monthlyInvestment} onChange={(v) => updateBasic("monthlyInvestment", v)} min={0} max={1000000} step={5000} unit="元" />
                    
                    <LeverageBlock 
                      isLeverageEnabled={isLeverageEnabled} 
                      setIsLeverageEnabled={setIsLeverageEnabled}
                      basicParams={basicParams}
                      updateBasic={updateBasic}
                      computedMonthlyLoan={computedMonthlyLoan}
                    />

                    <SubSectionHeader title="🌟 人生重大事件 (Life Events)" colorHex="#ec4899">
                      <ToggleSwitch checked={basicParams.isEventsEnabled || false} onChange={(v) => updateBasic("isEventsEnabled", v)} colorClass="peer-checked:bg-pink-500" />
                    </SubSectionHeader>

                    {basicParams.isEventsEnabled && (
                      <InfoBox colorHex="#ec4899" dashed>
                        <div className="flex justify-end mb-3">
                          <button
                            onClick={() => {
                              const newEvents = [...(basicParams.customEvents || []), { year: 5, name: "買車", amount: -800000 }];
                              updateBasic("customEvents", newEvents);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10 border border-pink-500/30 hover:border-pink-500 transition-colors text-pink-600 dark:text-pink-400"
                          >
                            ＋ 新增事件
                          </button>
                        </div>

                        {(basicParams.customEvents || []).length === 0 ? (
                          <p className="text-xs text-center text-pink-600/70 dark:text-pink-400/70 py-4">
                            尚未新增事件。可加入結婚、買車或收到遺產等一次性現金流。
                          </p>
                        ) : (
                          <div className="space-y-3 mb-4">
                            {(basicParams.customEvents || []).map((ev, i) => (
                              <div key={i} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-white/50 dark:bg-black/20 border border-pink-500/20">
                                <div className="flex items-center gap-1 w-20">
                                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>第</span>
                                  <input
                                    type="number"
                                    value={ev.year}
                                    onChange={(e) => {
                                      const newEvents = [...(basicParams.customEvents || [])];
                                      newEvents[i].year = Math.max(1, Number(e.target.value));
                                      updateBasic("customEvents", newEvents);
                                    }}
                                    className="input-field !py-1 !px-2 text-xs text-center flex-1 min-w-0"
                                  />
                                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>年</span>
                                </div>
                                <input
                                  type="text"
                                  value={ev.name}
                                  onChange={(e) => {
                                    const newEvents = [...(basicParams.customEvents || [])];
                                    newEvents[i].name = e.target.value;
                                    updateBasic("customEvents", newEvents);
                                  }}
                                  className="input-field !py-1 !px-2 text-xs flex-1 min-w-[80px]"
                                  placeholder="事件名稱"
                                />
                                <input
                                  type="number"
                                  value={ev.amount}
                                  onChange={(e) => {
                                    const newEvents = [...(basicParams.customEvents || [])];
                                    newEvents[i].amount = Number(e.target.value);
                                    updateBasic("customEvents", newEvents);
                                  }}
                                  className={`input-field !py-1 !px-2 text-xs w-28 text-right font-medium ${ev.amount >= 0 ? "text-green-500" : "text-red-400"}`}
                                  placeholder="金額 (+收入/-支出)"
                                />
                                <button
                                  onClick={() => {
                                    const newEvents = [...(basicParams.customEvents || [])];
                                    newEvents.splice(i, 1);
                                    updateBasic("customEvents", newEvents);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/20 text-red-500 transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] opacity-60 leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>
                          💡 正數代表一筆意外之財 (如遺產)，負數代表大筆支出 (如買車)。這將在該年直接加減您的淨資產與投入本金。
                        </p>
                      </InfoBox>
                    )}

                  </>
                )}

                {/* --- 租屋 vs 買房 --- */}
                {activeTab === "housing" && (
                  <>
                    <SectionHeader icon="🏠" title="全局資金與時程" colorHex="var(--accent-secondary)" bgColorHex="var(--accent-secondary-dim)" />
                    <SliderInput id="initialCapital" label="初始總資金" value={housingParams.initialCapital} onChange={(v) => updateHousing("initialCapital", v)} min={1000000} max={150000000} step={500000} unit="元" hint="租屋全數投資；買房先付頭期，剩餘投資。" />
                    <SliderInput id="yearsToCompare" label="比較年數" value={housingParams.yearsToCompare} onChange={(v) => updateHousing("yearsToCompare", v)} min={5} max={50} step={5} unit="年" />
                    <SliderInput id="investReturn" label="投資報酬率" value={housingParams.investReturn} onChange={(v) => updateHousing("investReturn", v)} min={0} max={15} step={0.5} unit="%" hint="未動用資金與每月結餘投入市場的預期報酬率" />

                    <SubSectionHeader title="買房專屬參數" colorHex="var(--accent-secondary)" />
                    <SliderInput id="housePrice" label="預計購買總價" value={housingParams.housePrice} onChange={(v) => updateHousing("housePrice", v)} min={3000000} max={300000000} step={1000000} unit="元" />
                      <SliderInput id="downPaymentPercent" label="頭期款成數" value={housingParams.downPaymentPercent} onChange={(v) => updateHousing("downPaymentPercent", v)} min={10} max={50} step={5} unit="%" />
                      <SliderInput id="loanRate" label="房貸利率" value={housingParams.loanRate} onChange={(v) => updateHousing("loanRate", v)} min={1} max={5} step={0.1} unit="%" hint="目前首購房貸地板價約 2.185 起" />
                      <SliderInput id="loanYears" label="貸款年限" value={housingParams.loanYears} onChange={(v) => updateHousing("loanYears", v)} min={10} max={40} step={5} unit="年" />

                      <InfoBox colorHex="#8b5cf6" dashed>
                        <p className="text-sm font-medium flex justify-between items-center" style={{ color: "var(--accent-secondary)" }}>
                          <span>💡 每月房貸本息攤還試算</span>
                          <span className="text-base font-bold">{formatNumber(computedMortgage)} 元</span>
                        </p>
                      </InfoBox>

                      <SliderInput id="houseAppreciationRate" label="房價年漲幅" value={housingParams.houseAppreciationRate} onChange={(v) => updateHousing("houseAppreciationRate", v)} min={-5} max={10} step={0.5} unit="%" hint="保守預估 2~3%" />
                      <SliderInput id="maintenanceRate" label="年維護成本" value={housingParams.maintenanceRate} onChange={(v) => updateHousing("maintenanceRate", v)} min={0} max={3} step={0.1} unit="%" hint="抓房價 0.5~1% 作為稅金與修繕基金" />

                    <SubSectionHeader title="租屋專屬參數" colorHex="var(--accent-primary)" />
                    <SliderInput id="monthlyRent" label="預計月租金" value={housingParams.monthlyRent} onChange={(v) => updateHousing("monthlyRent", v)} min={5000} max={500000} step={5000} unit="元" />
                    <SliderInput id="rentIncreaseRate" label="年租金漲幅" value={housingParams.rentIncreaseRate} onChange={(v) => updateHousing("rentIncreaseRate", v)} min={0} max={5} step={0.5} unit="%" />
                  </>
                )}

                {/* --- 蒙地卡羅 --- */}
                {activeTab === "mc" && (
                  <>
                    <SectionHeader icon="🎲" title="壓力測試參數" colorHex="#f59e0b" bgColorHex="rgba(245, 158, 11, 0.15)" />

                    <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                      <button
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mcParams.phase === "accumulation" ? "bg-white text-slate-900 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                        onClick={() => updateMC("phase", "accumulation")}
                      >
                        💪 財富累積期
                      </button>
                      <button
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mcParams.phase === "decumulation" ? "bg-white text-slate-900 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                        onClick={() => updateMC("phase", "decumulation")}
                      >
                        🌴 退休提領期
                      </button>
                    </div>

                    <InfoBox colorHex="#94a3b8">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {mcParams.phase === "accumulation"
                          ? "💡 模擬工作期間：每月持續投入月投資額，不會變賣資產。破產機率為 0。"
                          : "⚠️ 模擬退休期間：停止工作投入，每月變賣資產支付月支出，測驗資產存活率。"}
                      </p>
                    </InfoBox>

                    {mcParams.phase === "accumulation" ? (
                      <SliderInput id="monthlyInvestment" label="每月繼續投資" value={basicParams.monthlyInvestment} onChange={(v) => updateBasic("monthlyInvestment", v)} min={0} max={1000000} step={5000} unit="元" />
                    ) : (
                      <SliderInput id="monthlyExpense" label="退休每月支出" value={basicParams.monthlyExpense} onChange={(v) => updateBasic("monthlyExpense", v)} min={0} max={1000000} step={5000} unit="元" />
                    )}

                    <LeverageBlock 
                      isLeverageEnabled={isLeverageEnabled} 
                      setIsLeverageEnabled={setIsLeverageEnabled}
                      basicParams={basicParams}
                      updateBasic={updateBasic}
                      computedMonthlyLoan={computedMonthlyLoan}
                    />

                    <SubSectionHeader title="📈 市場風險設定" colorHex="#f97316" />
                    <SliderInput id="volatility" label="預估波動率 (市場風險)" value={mcParams.volatility} onChange={(v) => updateMC("volatility", v)} min={0} max={40} step={1} unit="%" hint="大盤歷史波動約 15%。含公債配置可降至 5~10%。" />

                    <SubSectionHeader title="歷史災難壓力測試 (黑天鵝劇本)" colorHex="#ef4444">
                      <ToggleSwitch checked={mcParams.isScenarioEnabled} onChange={(v) => updateMC("isScenarioEnabled", v)} colorClass="peer-checked:bg-red-500" />
                    </SubSectionHeader>

                    {mcParams.isScenarioEnabled && (
                      <div className="mb-4">
                        <select
                          className="w-full p-2.5 rounded-lg border text-sm outline-none mb-3 font-medium transition-colors hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                          value={mcParams.scenarioId}
                          onChange={(e) => updateMC("scenarioId", e.target.value)}
                        >
                          {CRISIS_SCENARIOS.filter(s => s.id !== "none").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <InfoBox colorHex="#ef4444" dashed>
                          <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            💡 {CRISIS_SCENARIOS.find(s => s.id === mcParams.scenarioId)?.description || CRISIS_SCENARIOS.find(s => s.id === "custom")?.description}
                          </p>
                          <SliderInput id="blackSwanYear" label="劇本引爆時機 (第 X 年)" value={mcParams.blackSwanYear} onChange={(v) => updateMC("blackSwanYear", v)} min={1} max={basicParams.investmentYears} step={1} unit="年" hint="拉動決定災難何時降臨。" />
                          {mcParams.scenarioId === "custom" && (
                            <SliderInput id="blackSwanDrop" label="當年崩盤跌幅" value={mcParams.blackSwanDrop} onChange={(v) => updateMC("blackSwanDrop", v)} min={10} max={80} step={5} unit="%" />
                          )}
                        </InfoBox>
                      </div>
                    )}

                    <SubSectionHeader title="跳躍擴散模型 (每年隨機崩盤)" colorHex="#6366f1">
                      <ToggleSwitch checked={mcParams.isJumpEnabled} onChange={(v) => updateMC("isJumpEnabled", v)} colorClass="peer-checked:bg-indigo-500" />
                    </SubSectionHeader>

                    {mcParams.isJumpEnabled && (
                      <InfoBox colorHex="#6366f1" dashed>
                        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>💡 除下方指定的歷史劇本外，每年額外觸發無預警黑天鵝的機率與跌幅。</p>
                        <SliderInput id="jumpProbability" label="每年發生機率" value={mcParams.jumpProbability} onChange={(v) => updateMC("jumpProbability", v)} min={1} max={20} step={1} unit="%" />
                        <SliderInput id="jumpImpact" label="單次崩盤跌幅" value={mcParams.jumpImpact} onChange={(v) => updateMC("jumpImpact", v)} min={5} max={50} step={5} unit="%" />
                      </InfoBox>
                    )}

                    <SubSectionHeader title="動態提領防禦 (Dynamic Spending)" colorHex="#10b981">
                      <ToggleSwitch checked={mcParams.isDynamic} onChange={(v) => updateMC("isDynamic", v)} colorClass="peer-checked:bg-emerald-500" />
                    </SubSectionHeader>

                    {mcParams.isDynamic && (
                      <InfoBox colorHex="#10b981" dashed>
                        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>🛡️ 當遭遇市場下跌的年份，系統將自動縮減該年度的生活費，此防禦機制可大幅提升退休資產的存活機率！</p>
                        <SliderInput id="dynamicRatio" label="縮減提領比例" value={mcParams.dynamicRatio} onChange={(v) => updateMC("dynamicRatio", v)} min={5} max={50} step={5} unit="%" />
                      </InfoBox>
                    )}

                    <button
                      onClick={runMonteCarlo}
                      disabled={isLoadingMC}
                      className="w-full mt-5 py-3.5 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50"
                      style={{ background: "var(--accent-primary)", color: "white" }}
                    >
                      {isLoadingMC ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          量化模擬中...
                        </span>
                      ) : "🚀 執行 1,000 次蒙地卡羅模擬"}
                    </button>
                  </>
                )}

                {/* Save Scenario - for basic and housing */}
                {activeTab !== "mc" && (
                  <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>💾 儲存劇本（{scenarios.length}/3）</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="劇本名稱..."
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        className="input-field !py-2 text-sm flex-1"
                        maxLength={20}
                      />
                      <button onClick={handleSave} className="btn-accent !py-2 !px-4 text-sm shrink-0">存檔</button>
                    </div>
                    {saveMessage && <p className="text-xs mt-2" style={{ color: "var(--accent-primary)" }}>{saveMessage}</p>}
                    {scenarios.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {scenarios.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg text-sm" style={{ background: "var(--bg-secondary)" }}>
                            <button onClick={() => handleLoad(s)} className="text-left flex-1 truncate font-medium hover:text-[var(--accent-primary)] transition-colors" style={{ color: "var(--text-secondary)" }}>{s.name}</button>
                            <button onClick={() => handleDelete(s.id)} className="ml-2 text-xs px-2 py-1 rounded hover:bg-red-500/20 transition-colors" style={{ color: "var(--text-muted)" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ===== Right Panel: Results ===== */}
            <div className="lg:col-span-8 space-y-6">

              {/* === Life Path Panel (basic + mc only) === */}
              {(activeTab === "basic" || activeTab === "mc") && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <span className="w-1.5 h-4 rounded-full bg-violet-500" />
                    🧬 人生路徑發展 (Life Path)
                    <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>— 設定各階段家庭規模，自動套用經濟學遞減開支模型</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {lifeStages.map((stage, i) => (
                      <div key={i} className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{STAGE_LABELS[i]}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>至第</span>
                          <input
                            type="number"
                            value={stage.endYear}
                            onChange={(e) => { const v = [...lifeStages]; v[i] = {...v[i], endYear: Math.max(1, Math.min(50, Number(e.target.value)))}; setLifeStages(v); }}
                            className="input-field !w-20 !py-1 text-sm text-center"
                            min={1} max={50}
                          />
                          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>年</span>
                        </div>
                        <select
                          value={stage.familySize}
                          onChange={(e) => { const v = [...lifeStages]; v[i] = {...v[i], familySize: Number(e.target.value)}; setLifeStages(v); }}
                          className="w-full p-2 rounded-lg border text-sm"
                          style={{ background: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                        >
                          {FAMILY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          開支乘數：<span className="font-semibold" style={{ color: "var(--accent-primary)" }}>{FAMILY_MULTIPLIERS[stage.familySize]}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === Tab-specific Results === */}
              {activeTab === "basic" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard 
                      label="最終淨資產" 
                      value={formatTWD(finalAssets)} 
                      sub={`${basicParams.investmentYears} 年後`} 
                      color="var(--accent-primary)" 
                    />
                    <StatCard 
                      label="最終投資市值" 
                      value={formatTWD(finalPortfolio)} 
                      sub={finalLoan > 0 ? `(含未還貸款 ${formatTWD(finalLoan)})` : "投資總規模"} 
                      color="#3b82f6" 
                    />
                    <StatCard label="投資報酬" value={formatTWD(totalReturns)} sub={`報酬率 ${totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(0) : 0}%`} color="var(--accent-success)" />
                    <StatCard label="月被動收入" value={formatTWD(monthlyPassiveIncome)} sub="4% 法則估算" color="var(--accent-secondary)" />
                  </div>

                  {fireYears !== null ? (
                    <div className="glass-card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-float" style={{ background: "var(--accent-primary-dim)" }}>🔥</div>
                      <div>
                        <p className="text-base" style={{ color: "var(--text-secondary)" }}>預計達成財務自由</p>
                        <p className="text-3xl font-bold my-1"><span style={{ color: "var(--accent-primary)" }}>{fireYears}</span> 年後</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>被動收入 ≥ 通膨調整後年支出（4% 法則）</p>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(239, 68, 68, 0.15)" }}>⚠️</div>
                      <div>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>以目前參數，100 年內無法達成財務自由</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>試試提高月投資額或年化報酬率</p>
                      </div>
                    </div>
                  )}

                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>資產成長曲線</h3>
                    <ProjectionChart data={projectionData} events={basicParams.isEventsEnabled ? basicParams.customEvents : []} />
                  </div>
                </>
              ) : activeTab === "housing" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="租屋淨資產" value={formatTWD(housingFinal?.rentNetWorth || 0)} sub={`${housingParams.yearsToCompare} 年後`} color={housingDiff > 0 ? "var(--accent-primary)" : "var(--text-secondary)"} />
                    <StatCard label="買房淨資產" value={formatTWD(housingFinal?.buyNetWorth || 0)} sub={`${housingParams.yearsToCompare} 年後`} color={housingDiff <= 0 ? "var(--accent-primary)" : "var(--text-secondary)"} />
                    <StatCard label="差額" value={`${housingDiff > 0 ? "租屋勝" : "買房勝"} ${formatTWD(Math.abs(housingDiff))}`} color={housingDiff > 0 ? "var(--accent-success)" : "var(--accent-secondary)"} />
                    <StatCard label="月房貸" value={formatTWD(housingParams.housePrice * (1 - housingParams.downPaymentPercent / 100) * (housingParams.loanRate / 100 / 12) * Math.pow(1 + housingParams.loanRate / 100 / 12, housingParams.loanYears * 12) / (Math.pow(1 + housingParams.loanRate / 100 / 12, housingParams.loanYears * 12) - 1))} sub={`vs 月租 ${formatTWD(housingParams.monthlyRent)}`} />
                  </div>
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>淨資產對比曲線</h3>
                    <CompareChart data={housingData} loanYears={housingParams.loanYears} yearsToCompare={housingParams.yearsToCompare} />
                  </div>
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>📋 模型假設說明</h3>
                    <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      <li>• <b>核心公平假設</b>：兩者每月拿出口袋的現金總額完全相同，較便宜的一方將每月盈餘全額投入市場。</li>
                      <li>• 首月兩方案的起跑淨資產完全相同（皆等於「初始總資金」）。</li>
                      <li>• 租屋方案資產 100% 來自投資市值；買房方案 = 房屋市值 + 投資市值 - 剩餘房貸。</li>
                      <li>• 為求單純化，未計入交易成本落差（仲介費、土增稅、契稅等）。</li>
                      <li>• 本比較僅供推演參考，不構成買賣建議。</li>
                    </ul>
                  </div>
                </>
              ) : activeTab === "mc" ? (
                <>
                  {!mcResult ? (
                    <div className="glass-card p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
                      <div className="text-6xl mb-4 opacity-50 animate-float">🎲</div>
                      <h3 className="text-xl font-bold mb-2">準備好進行真實世界壓力測試了嗎？</h3>
                      <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                        真實市場不會永遠每年穩定成長。蒙地卡羅演算法將根據波動率與基礎參數，透過 AWS 雲端瞬間模擬 1,000 種不同的經濟走勢，統整出你的財富生存機率。
                      </p>
                      <button
                        onClick={runMonteCarlo}
                        className="mt-6 px-6 py-2 rounded-full font-medium"
                        style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}
                      >
                        點擊左側開始測試
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-center">
                          <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 ${mcResult.successRate > 90 ? 'bg-green-500' : mcResult.successRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>財務安全大動脈 (成功率)</p>
                          <p className="text-4xl font-bold" style={{ color: mcResult.successRate > 90 ? 'var(--accent-success)' : mcResult.successRate > 70 ? '#f59e0b' : '#ef4444' }}>
                            {mcResult.successRate}%
                          </p>
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>1,000 次模擬中未破產機率</p>
                        </div>
                        <div className="glass-card p-5 flex flex-col justify-center">
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>中位數淨資產 (P50)</p>
                          <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{formatTWD(mcResult.medianEndingWealth)}</p>
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>第 {basicParams.investmentYears} 年有 50% 機率高於此值</p>
                        </div>
                        <div className="glass-card p-5 flex flex-col justify-center">
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>極端慘況底線 (P10)</p>
                          <p className="text-3xl font-bold text-red-400">
                            {formatTWD(mcResult.percentilePaths[mcResult.percentilePaths.length - 1].p10)}
                          </p>
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>連跌加上黑天鵝的最差 10% 運氣</p>
                        </div>
                      </div>
                      <div className="glass-card p-5">
                        <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>1,000 次平行宇宙扇形軌跡 (Fan Chart)</h3>
                        <FanChart data={mcResult.percentilePaths} />
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex text-center items-center justify-center pt-20">載入中...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}
