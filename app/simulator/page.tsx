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
  calculateProjection,
  calculateHousingCompare,
  calculateFIREAge,
  formatTWD,
  formatNumber,
  calculateMonthlyMortgage,
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
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            id={id}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="input-field text-right !w-28 !py-1.5 text-base number-display"
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
      {hint && (
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
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

function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "housing" ? "housing" : searchParams.get("tab") === "mc" ? "mc" : "basic";

  const [activeTab, setActiveTab] = useState<"basic" | "housing" | "mc">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "housing" || tabParam === "basic" || tabParam === "mc") {
      setActiveTab(tabParam as any);
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
  });

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
    scenarioId: "custom",
    blackSwanYear: 0,
    blackSwanDrop: 30,
  });
  const [mcResult, setMcResult] = useState<any>(null);
  const [isLoadingMC, setIsLoadingMC] = useState(false);

  const updateMC = useCallback((key: string, val: any) => {
    setMcParams((p) => ({ ...p, [key]: val }));
  }, []);

  const runMonteCarlo = async () => {
    setIsLoadingMC(true);
    try {
      const activeScenario = CRISIS_SCENARIOS.find(s => s.id === mcParams.scenarioId);
      const startYear = mcParams.blackSwanYear;
      
      const scenarioEvents = activeScenario?.id === "custom"
        ? (startYear > 0 ? [{ year: startYear, drop: mcParams.blackSwanDrop }] : [])
        : (startYear > 0 ? (activeScenario?.events.map(ev => ({ year: startYear + ev.year, drop: ev.drop })) || []) : []);

      const payload = {
        initialAssets: basicParams.currentAssets,
        monthlyContribution: mcParams.phase === "accumulation" ? basicParams.monthlyInvestment : 0,
        monthlyWithdrawal: mcParams.phase === "decumulation" ? basicParams.monthlyExpense : 0,
        years: basicParams.investmentYears,
        expectedReturn: basicParams.annualReturn,
        volatility: mcParams.volatility,
        inflationMean: basicParams.inflationRate,
        blackSwanEvents: scenarioEvents
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
    } catch (e) {
      alert("模擬失敗，請稍後再試或檢查網路！");
    } finally {
      setIsLoadingMC(false);
    }
  };

  const updateBasic = useCallback((key: keyof BasicParams, val: number) => {
    setBasicParams((p) => ({ ...p, [key]: val }));
  }, []);

  const updateHousing = useCallback((key: keyof HousingParams, val: number) => {
    setHousingParams((p) => ({ ...p, [key]: val }));
  }, []);

  // Compute results
  const projectionData = useMemo(() => calculateProjection(basicParams), [basicParams]);
  const housingData = useMemo(() => calculateHousingCompare(housingParams), [housingParams]);
  const fireYears = useMemo(() => calculateFIREAge(basicParams), [basicParams]);

  const computedMortgage = useMemo(() => {
    const downPayment = housingParams.housePrice * (housingParams.downPaymentPercent / 100);
    const loanAmount = housingParams.housePrice - downPayment;
    return Math.round(calculateMonthlyMortgage(loanAmount, housingParams.loanRate, housingParams.loanYears));
  }, [housingParams.housePrice, housingParams.downPaymentPercent, housingParams.loanRate, housingParams.loanYears]);

  const finalAssets = projectionData[projectionData.length - 1]?.assets || 0;
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
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              財務<span style={{ color: "var(--accent-primary)" }}>沙盤推演</span>
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              拖動滑桿即時看到你的財務未來走向。所有運算在你的瀏覽器中完成，資料不會上傳。
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 rounded-xl w-fit" style={{ background: "var(--bg-secondary)" }}>
            <button
              id="tab-basic"
              className={`tab-button ${activeTab === "basic" ? "active" : ""}`}
              onClick={() => setActiveTab("basic")}
            >
              📈 複利試算
            </button>
            <button
              id="tab-housing"
              className={`tab-button ${activeTab === "housing" ? "active" : ""}`}
              onClick={() => setActiveTab("housing")}
            >
              🏠 租屋 vs 買房
            </button>
            <button
              id="tab-mc"
              className={`tab-button ${activeTab === "mc" ? "active" : ""}`}
              onClick={() => setActiveTab("mc")}
            >
              🎲 蒙地卡羅壓測
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel: Controls */}
            <div className="lg:col-span-4">
              <div className="glass-card p-6 sticky top-20">
                {activeTab === "basic" ? (
                  <>
                    <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}>⚙</span>
                      現況與收支設定
                    </h2>
                    <SliderInput id="currentAssets" label="現有資產" value={basicParams.currentAssets} onChange={(v) => updateBasic("currentAssets", v)} min={0} max={150000000} step={500000} unit="元" />
                    <SliderInput id="monthlyIncome" label="月收入" value={basicParams.monthlyIncome} onChange={(v) => updateBasic("monthlyIncome", v)} min={0} max={2000000} step={5000} unit="元" />
                    <SliderInput id="monthlyExpense" label="月支出" value={basicParams.monthlyExpense} onChange={(v) => updateBasic("monthlyExpense", v)} min={0} max={1000000} step={5000} unit="元" />
                    <SliderInput id="monthlyInvestment" label="月投資額" value={basicParams.monthlyInvestment} onChange={(v) => updateBasic("monthlyInvestment", v)} min={0} max={1000000} step={5000} unit="元" />

                    <div className="mt-8 mb-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span className="w-1.5 h-4 rounded-full" style={{ background: "var(--accent-primary)" }} />
                        市場預估參數
                      </h3>
                      <SliderInput id="investmentYears" label="投資年數" value={basicParams.investmentYears} onChange={(v) => updateBasic("investmentYears", v)} min={1} max={50} step={1} unit="年" />
                      <SliderInput id="annualReturn" label="年化報酬率" value={basicParams.annualReturn} onChange={(v) => updateBasic("annualReturn", v)} min={0} max={20} step={0.5} unit="%" hint="如台股 0050 等大盤型 ETF 歷史平均約 6~8%" />
                      <SliderInput id="inflationRate" label="通膨率" value={basicParams.inflationRate} onChange={(v) => updateBasic("inflationRate", v)} min={0} max={10} step={0.5} unit="%" hint="台灣長期平均通膨率約 1.5~2%" />
                    </div>
                  </>
                ) : activeTab === "housing" ? (
                  <>
                    <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "var(--accent-secondary-dim)", color: "var(--accent-secondary)" }}>🏠</span>
                      全局資金與時程
                    </h2>
                    <SliderInput id="initialCapital" label="初始總資金" value={housingParams.initialCapital} onChange={(v) => updateHousing("initialCapital", v)} min={1000000} max={150000000} step={500000} unit="元" hint="這筆彈藥在租屋會全數投資，買房則先付頭期額度，剩餘才投資。" />
                    <SliderInput id="yearsToCompare" label="比較年數" value={housingParams.yearsToCompare} onChange={(v) => updateHousing("yearsToCompare", v)} min={5} max={50} step={5} unit="年" />
                    <SliderInput id="investReturn" label="投資報酬率" value={housingParams.investReturn} onChange={(v) => updateHousing("investReturn", v)} min={0} max={15} step={0.5} unit="%" hint="未動用資金與每月結餘投入市場的預期報酬率" />

                    <div className="mt-8 mb-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span className="w-1.5 h-4 rounded-full" style={{ background: "var(--accent-secondary)" }} />
                        買房專屬參數
                      </h3>
                      <SliderInput id="housePrice" label="預計購買總價" value={housingParams.housePrice} onChange={(v) => updateHousing("housePrice", v)} min={3000000} max={300000000} step={1000000} unit="元" />
                      <SliderInput id="downPaymentPercent" label="頭期款成數" value={housingParams.downPaymentPercent} onChange={(v) => updateHousing("downPaymentPercent", v)} min={10} max={50} step={5} unit="%" />
                      <SliderInput id="loanRate" label="房貸利率" value={housingParams.loanRate} onChange={(v) => updateHousing("loanRate", v)} min={1} max={5} step={0.1} unit="%" hint="目前首購房貸地板價約 2.185 起" />
                      <SliderInput id="loanYears" label="貸款年限" value={housingParams.loanYears} onChange={(v) => updateHousing("loanYears", v)} min={10} max={40} step={5} unit="年" />

                      <div className="p-3 mt-3 mb-4 rounded-xl" style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px dashed rgba(139, 92, 246, 0.3)" }}>
                        <p className="text-sm font-medium flex justify-between items-center" style={{ color: "var(--accent-secondary)" }}>
                          <span className="flex items-center gap-1">💡 每月房貸本息攤還試算</span>
                          <span className="text-base font-bold">即約 {formatNumber(computedMortgage)} 元</span>
                        </p>
                      </div>

                      <SliderInput id="houseAppreciationRate" label="房價年漲幅" value={housingParams.houseAppreciationRate} onChange={(v) => updateHousing("houseAppreciationRate", v)} min={-5} max={10} step={0.5} unit="%" hint="過去十數年多數都會區平均大於通膨，保守可設 2~3%" />
                      <SliderInput id="maintenanceRate" label="年維護成本" value={housingParams.maintenanceRate} onChange={(v) => updateHousing("maintenanceRate", v)} min={0} max={3} step={0.1} unit="%" hint="抓房價 0.5~1% 作為房屋稅金與修繕基金" />
                    </div>

                    <div className="mt-8 mb-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span className="w-1.5 h-4 rounded-full" style={{ background: "var(--accent-primary)" }} />
                        租屋專屬參數
                      </h3>
                      <SliderInput id="monthlyRent" label="預計租屋月租金" value={housingParams.monthlyRent} onChange={(v) => updateHousing("monthlyRent", v)} min={5000} max={500000} step={5000} unit="元" />
                      <SliderInput id="rentIncreaseRate" label="年租金漲幅" value={housingParams.rentIncreaseRate} onChange={(v) => updateHousing("rentIncreaseRate", v)} min={0} max={5} step={0.5} unit="%" />
                    </div>
                  </>
                ) : activeTab === "mc" ? (
                  <>
                    <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>⚙</span>
                      人生階段選擇與現況連動
                    </h2>

                    <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                      <button
                        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${mcParams.phase === "accumulation" ? "bg-white text-slate-900 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                        onClick={() => updateMC("phase", "accumulation")}
                      >
                        💪 財富累積期
                      </button>
                      <button
                        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${mcParams.phase === "decumulation" ? "bg-white text-slate-900 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                        onClick={() => updateMC("phase", "decumulation")}
                      >
                        🌴 退休提領期
                      </button>
                    </div>

                    {mcParams.phase === "accumulation" ? (
                      <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
                        💡 模擬工作期間：每月持續投入「月投資額」，不會變賣資產生活。破產機率為 0。
                      </div>
                    ) : (
                      <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
                        ⚠️ 模擬退休期間：停止工作投入。每月強制變賣資產來支付「月支出」。測驗資產存活率。
                      </div>
                    )}

                    <SliderInput id="currentAssets" label="現有總資產" value={basicParams.currentAssets} onChange={(v) => updateBasic("currentAssets", v)} min={0} max={150000000} step={500000} unit="元" />

                    {mcParams.phase === "accumulation" ? (
                      <SliderInput id="monthlyInvestment" label="每月繼續投資" value={basicParams.monthlyInvestment} onChange={(v) => updateBasic("monthlyInvestment", v)} min={0} max={1000000} step={5000} unit="元" />
                    ) : (
                      <SliderInput id="monthlyExpense" label="退休每月支出" value={basicParams.monthlyExpense} onChange={(v) => updateBasic("monthlyExpense", v)} min={0} max={1000000} step={5000} unit="元" />
                    )}

                    <div className="mb-4 mt-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {ETF_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => {
                              updateBasic("annualReturn", preset.return);
                              updateMC("volatility", preset.vol);
                            }}
                            className="px-2.5 py-1 text-xs rounded-full border transition-colors hover:bg-white/5"
                            style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                      <SliderInput id="annualReturn" label="預期平均年化報酬率" value={basicParams.annualReturn} onChange={(v) => updateBasic("annualReturn", v)} min={0} max={20} step={0.5} unit="%" />
                      <SliderInput id="volatility" label="預估波動率 (市場風險)" value={mcParams.volatility} onChange={(v) => updateMC("volatility", v)} min={0} max={40} step={1} unit="%" hint="大盤歷史波動約 15%。如果你的資產配置含公債可降至 5~10%。" />
                    </div>

                    <SliderInput id="investmentYears" label="模擬年數" value={basicParams.investmentYears} onChange={(v) => updateBasic("investmentYears", v)} min={1} max={50} step={1} unit="年" />

                    <div className="mt-8 mb-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span className="w-1.5 h-4 rounded-full bg-red-500" />
                        歷史災難壓力測試 (黑天鵝劇本)
                      </h3>

                      <div className="mb-4">
                        <select
                          className="w-full p-2.5 rounded-lg border text-sm appearance-none outline-none"
                          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                          value={mcParams.scenarioId}
                          onChange={(e) => updateMC("scenarioId", e.target.value)}
                        >
                          {CRISIS_SCENARIOS.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-9 mt--8 pointer-events-none text-xs" style={{ transform: "translateY(-27px)" }}>▼</div>
                      </div>

                      {mcParams.scenarioId !== "none" && (
                        <div className="p-4 rounded-xl mb-2" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px dashed rgba(239, 68, 68, 0.2)" }}>
                          <div className="mb-4 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            💡 {CRISIS_SCENARIOS.find(s => s.id === mcParams.scenarioId)?.description}
                          </div>
                          <SliderInput id="blackSwanYear" label="劇本引爆時機 (第 X 年發生)" value={mcParams.blackSwanYear} onChange={(v) => updateMC("blackSwanYear", v)} min={0} max={basicParams.investmentYears} step={1} unit="年" hint="0 代表此劇本尚未觸發。拉動滑桿決定災難何時降臨。" />
                          {mcParams.scenarioId === "custom" && mcParams.blackSwanYear > 0 && (
                            <SliderInput id="blackSwanDrop" label="當年單次崩盤跌幅" value={mcParams.blackSwanDrop} onChange={(v) => updateMC("blackSwanDrop", v)} min={10} max={80} step={5} unit="%" />
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={runMonteCarlo}
                      disabled={isLoadingMC}
                      className="w-full mt-4 py-3.5 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50"
                      style={{ background: "var(--accent-primary)", color: "white" }}
                    >
                      {isLoadingMC ? (
                        <span className="animate-pulse">🚀 啟動 1,000 次運算中...</span>
                      ) : (
                        "🔥 執行 1,000 次蒙地卡羅模擬"
                      )}
                    </button>
                  </>
                ) : null}

                {/* Save Scenario */}
                {activeTab !== "mc" && (
                  <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                      💾 儲存劇本（{scenarios.length}/3）
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="劇本名稱..."
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        className="input-field !py-2 text-sm flex-1"
                        maxLength={20}
                      />
                      <button onClick={handleSave} className="btn-accent !py-2 !px-4 text-sm shrink-0">
                        存檔
                      </button>
                    </div>
                    {saveMessage && (
                      <p className="text-xs mt-2" style={{ color: "var(--accent-primary)" }}>{saveMessage}</p>
                    )}

                    {/* Scenario List */}
                    {scenarios.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {scenarios.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg text-sm" style={{ background: "var(--bg-secondary)" }}>
                            <button
                              onClick={() => handleLoad(s)}
                              className="text-left flex-1 truncate font-medium hover:text-[var(--accent-primary)] transition-colors"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {s.name}
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="ml-2 text-xs px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                              style={{ color: "var(--text-muted)" }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Results */}
            <div className="lg:col-span-8 space-y-6">
              {activeTab === "basic" ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                      label="最終資產"
                      value={formatTWD(finalAssets)}
                      sub={`${basicParams.investmentYears} 年後`}
                      color="var(--accent-primary)"
                    />
                    <StatCard
                      label="累計投入"
                      value={formatTWD(totalInvested)}
                      sub="本金總額"
                    />
                    <StatCard
                      label="投資報酬"
                      value={formatTWD(totalReturns)}
                      sub={`報酬率 ${totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(0) : 0}%`}
                      color="var(--accent-success)"
                    />
                    <StatCard
                      label="月被動收入"
                      value={formatTWD(monthlyPassiveIncome)}
                      sub="4% 法則估算"
                      color="var(--accent-secondary)"
                    />
                  </div>

                  {/* FIRE Age */}
                  {fireYears !== null && (
                    <div className="glass-card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-float" style={{ background: "var(--accent-primary-dim)" }}>
                        🔥
                      </div>
                      <div>
                        <p className="text-base" style={{ color: "var(--text-secondary)" }}>預計達成財務自由</p>
                        <p className="text-3xl font-bold my-1">
                          <span style={{ color: "var(--accent-primary)" }}>{fireYears}</span> 年後
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          被動收入 ≥ 通膨調整後年支出（4% 法則）
                        </p>
                      </div>
                    </div>
                  )}
                  {fireYears === null && (
                    <div className="glass-card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(239, 68, 68, 0.15)" }}>
                        ⚠️
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>以目前參數，100 年內無法達成財務自由</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          試試提高月投資額或年化報酬率
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Chart */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>
                      資產成長曲線
                    </h3>
                    <ProjectionChart data={projectionData} />
                  </div>
                </>
              ) : activeTab === "housing" ? (
                <>
                  {/* Housing Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                      label="租屋淨資產"
                      value={formatTWD(housingFinal?.rentNetWorth || 0)}
                      sub={`${housingParams.yearsToCompare} 年後`}
                      color={housingDiff > 0 ? "var(--accent-primary)" : "var(--text-secondary)"}
                    />
                    <StatCard
                      label="買房淨資產"
                      value={formatTWD(housingFinal?.buyNetWorth || 0)}
                      sub={`${housingParams.yearsToCompare} 年後`}
                      color={housingDiff <= 0 ? "var(--accent-primary)" : "var(--text-secondary)"}
                    />
                    <StatCard
                      label="差額"
                      value={`${housingDiff > 0 ? "租屋勝" : "買房勝"} ${formatTWD(Math.abs(housingDiff))}`}
                      color={housingDiff > 0 ? "var(--accent-success)" : "var(--accent-secondary)"}
                    />
                    <StatCard
                      label="月房貸"
                      value={formatTWD(housingParams.housePrice * (1 - housingParams.downPaymentPercent / 100) * (housingParams.loanRate / 100 / 12) * Math.pow(1 + housingParams.loanRate / 100 / 12, housingParams.loanYears * 12) / (Math.pow(1 + housingParams.loanRate / 100 / 12, housingParams.loanYears * 12) - 1))}
                      sub={`vs 月租 ${formatTWD(housingParams.monthlyRent)}`}
                    />
                  </div>

                  {/* Compare Chart */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>
                      淨資產對比曲線
                    </h3>
                    <CompareChart
                      data={housingData}
                      loanYears={housingParams.loanYears}
                      yearsToCompare={housingParams.yearsToCompare}
                    />
                  </div>

                  {/* Key Assumptions */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                      📋 模型假設說明
                    </h3>
                    <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      <li>• <b>核心公平假設</b>：設定兩者每月拿出口袋的現金總額完全相同（取房貸與租金的大者為每月預算）。較便宜的一方，會將每月盈餘全額投入市場產生複利。</li>
                      <li>• 首月兩方案的起跑淨資產完全相同（皆等於「初始總資金」）。</li>
                      <li>• 租屋方案沒有房子，資產 100% 來自投資市值。買房方案的資產 = 房屋市值 + 投資市值 - 剩餘房貸。</li>
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
                        真實市場不會永遠每年穩定成長。蒙地卡羅演算法將根據波動率與「基礎參數」設定，並透過 AWS 雲端運算瞬間隨機模擬 1,000 種不同的經濟走勢路徑，並統整出你的財富生存機率。
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
                        <h3 className="font-semibold text-base mb-4 flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                          <span>1,000 次千禧年平行宇宙扇形軌跡 (Fan Chart)</span>
                        </h3>
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
