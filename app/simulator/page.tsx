"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProjectionChart from "@/components/charts/ProjectionChart";
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
  const initialTab = searchParams.get("tab") === "housing" ? "housing" : "basic";

  const [activeTab, setActiveTab] = useState<"basic" | "housing">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "housing" || tabParam === "basic") {
      setActiveTab(tabParam);
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
                    <SliderInput id="currentAssets" label="現有資產" value={basicParams.currentAssets} onChange={(v) => updateBasic("currentAssets", v)} min={0} max={10000000} step={100000} unit="元" />
                    <SliderInput id="monthlyIncome" label="月收入" value={basicParams.monthlyIncome} onChange={(v) => updateBasic("monthlyIncome", v)} min={0} max={500000} step={1000} unit="元" />
                    <SliderInput id="monthlyExpense" label="月支出" value={basicParams.monthlyExpense} onChange={(v) => updateBasic("monthlyExpense", v)} min={0} max={300000} step={1000} unit="元" />
                    <SliderInput id="monthlyInvestment" label="月投資額" value={basicParams.monthlyInvestment} onChange={(v) => updateBasic("monthlyInvestment", v)} min={0} max={200000} step={1000} unit="元" />
                    
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
                ) : (
                  <>
                    <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "var(--accent-secondary-dim)", color: "var(--accent-secondary)" }}>🏠</span>
                      全局資金與時程
                    </h2>
                    <SliderInput id="initialCapital" label="初始總資金" value={housingParams.initialCapital} onChange={(v) => updateHousing("initialCapital", v)} min={1000000} max={30000000} step={500000} unit="元" hint="這筆彈藥在租屋會全數投資，買房則先付頭期額度，剩餘才投資。" />
                    <SliderInput id="yearsToCompare" label="比較年數" value={housingParams.yearsToCompare} onChange={(v) => updateHousing("yearsToCompare", v)} min={5} max={50} step={5} unit="年" />
                    <SliderInput id="investReturn" label="投資報酬率" value={housingParams.investReturn} onChange={(v) => updateHousing("investReturn", v)} min={0} max={15} step={0.5} unit="%" hint="未動用資金與每月結餘投入市場的預期報酬率" />
                    
                    <div className="mt-8 mb-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span className="w-1.5 h-4 rounded-full" style={{ background: "var(--accent-secondary)" }} />
                        買房專屬參數
                      </h3>
                      <SliderInput id="housePrice" label="預計購買總價" value={housingParams.housePrice} onChange={(v) => updateHousing("housePrice", v)} min={3000000} max={50000000} step={500000} unit="元" />
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
                      <SliderInput id="monthlyRent" label="預計租屋月租金" value={housingParams.monthlyRent} onChange={(v) => updateHousing("monthlyRent", v)} min={5000} max={80000} step={1000} unit="元" />
                      <SliderInput id="rentIncreaseRate" label="年租金漲幅" value={housingParams.rentIncreaseRate} onChange={(v) => updateHousing("rentIncreaseRate", v)} min={0} max={5} step={0.5} unit="%" />
                    </div>
                  </>
                )}

                {/* Save Scenario */}
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

                  {/* Monte Carlo Teaser */}
                  <div className="glass-card p-6 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-40" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)" }} />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎲</span>
                          <h3 className="font-semibold">蒙地卡羅壓力測試</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}>即將推出</span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          固定報酬率太理想了。真實世界充滿隨機性——你的計畫經得起 1,000 次壓力測試嗎？
                        </p>
                      </div>
                      <div className="shrink-0 ml-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl opacity-50 animate-float">
                          🔒
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
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
              )}
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
