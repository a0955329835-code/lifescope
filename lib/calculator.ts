// LifeScope — 複利試算核心邏輯
// 所有基礎運算放前端（公開數學公式，不怕抄）

export interface BasicParams {
  currentAssets: number;      // 現有資產 (TWD)
  monthlyIncome: number;      // 月收入
  monthlyExpense: number;     // 月支出
  monthlyInvestment: number;  // 月投資額
  annualReturn: number;       // 年化報酬率 (%)
  investmentYears: number;    // 投資年數
  inflationRate: number;      // 通膨率 (%)
  salaryGrowthRate: number;   // 年調薪幅度 (%)
  leverageAmount?: number;    // 借貸本金 (預設 0)
  leverageRate?: number;      // 借貸年利率 (%)
  leverageYears?: number;     // 借貸年限
}

export interface HousingParams {
  initialCapital: number;     // 初始總資金 (用來付頭期款，剩下的投資)
  housePrice: number;         // 房價
  downPaymentPercent: number; // 頭期款 (%)
  loanRate: number;           // 房貸年利率 (%)
  loanYears: number;          // 貸款年數
  monthlyRent: number;        // 月租金
  rentIncreaseRate: number;   // 年租金漲幅 (%)
  investReturn: number;       // 投資年化報酬率 (%)
  maintenanceRate: number;    // 房屋年維護成本 (% of house price)
  houseAppreciationRate: number; // 房價年漲幅 (%)
  yearsToCompare: number;     // 比較年數
}

export interface YearlyData {
  year: number;
  assets: number;         // 名目資產
  realAssets: number;     // 通膨調整後資產 (實質購買力)
  invested: number;       // 累計投入本金
  returns: number;        // 累計報酬
}

export interface HousingCompareData {
  year: number;
  rentNetWorth: number;    // 租屋方案淨資產
  buyNetWorth: number;     // 買房方案淨資產
  rentCumCost: number;     // 租屋方案累計住居成本
  buyCumCost: number;      // 買房方案累計住居成本
}

export interface LifeStage {
  endYear: number;
  familySize: number; // 1-6 人
}

export const FAMILY_MULTIPLIERS: Record<number, number> = {
  1: 1.0, 2: 1.6, 3: 2.2, 4: 2.8, 5: 3.4, 6: 4.0
};

function getFamilyMultiplier(year: number, lifeStages?: LifeStage[]): number {
  if (!lifeStages || lifeStages.length === 0) return 1.0;
  for (const stage of lifeStages) {
    if (year <= stage.endYear) return FAMILY_MULTIPLIERS[stage.familySize] || 1.0;
  }
  return FAMILY_MULTIPLIERS[lifeStages[lifeStages.length - 1]?.familySize] || 1.0;
}

// 格式化金額為台幣格式
export function formatTWD(amount: number): string {
  if (Math.abs(amount) >= 1e8) {
    return `${(amount / 1e8).toFixed(2)} 億`;
  }
  if (Math.abs(amount) >= 1e4) {
    return `${(amount / 1e4).toFixed(1)} 萬`;
  }
  return Math.round(amount).toLocaleString('zh-TW');
}

// 格式化完整數字（帶千分位）
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('zh-TW');
}

/**
 * 試算信貸/房貸每月本息攤還金額
 * 採用等額本息攤還法
 */
export function calculateMonthlyLoanPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;
  // P * r * (1+r)^n / ((1+r)^n - 1)
  const power = Math.pow(1 + monthlyRate, totalMonths);
  return principal * monthlyRate * power / (power - 1);
}

/**
 * 基礎複利試算
 * 每月投入固定金額，以年化報酬率複利成長
 */
export function calculateProjection(params: BasicParams, lifeStages?: LifeStage[]): YearlyData[] {
  const {
    currentAssets,
    monthlyInvestment,
    annualReturn,
    investmentYears,
    inflationRate,
    salaryGrowthRate = 0,
    leverageAmount = 0,
    leverageRate = 0,
    leverageYears = 0,
  } = params;

  const monthlyRate = annualReturn / 100 / 12;
  const data: YearlyData[] = [];
  
  // 借貸邏輯：期初資產增加
  let assets = currentAssets + leverageAmount;
  let totalInvested = currentAssets; // 本金不含借款
  
  // 預算每月還款額 (等額本息)
  const monthlyLoanPayment = calculateMonthlyLoanPayment(leverageAmount, leverageRate, leverageYears);
  
  // 記錄剩餘貸款本金 (概算，用於扣除淨資產)
  let remainingLoan = leverageAmount;

  data.push({
    year: 0,
    assets: Math.round(assets - remainingLoan), // 圖表顯示真實淨資產
    realAssets: Math.round(assets - remainingLoan),
    invested: Math.round(totalInvested),
    returns: 0,
  });

  for (let year = 1; year <= investmentYears; year++) {
    const salaryFactor = Math.pow(1 + salaryGrowthRate / 100, year - 1);
    const adjustedInvestment = monthlyInvestment * salaryFactor;
    
    // 如果還在貸款期間，這筆現金流必須被扣除 (排擠投資)
    const isPayingLoan = year <= leverageYears;
    const loanDeduction = isPayingLoan ? monthlyLoanPayment : 0;

    for (let month = 0; month < 12; month++) {
      // 每月資產增長 = 先計算本月投資報酬，再加入(或扣除)現金流
      assets = assets * (1 + monthlyRate) + adjustedInvestment - loanDeduction;
      
      // 更新剩餘貸款本金 (精確扣除每月已還本金)
      if (isPayingLoan && remainingLoan > 0) {
        const monthlyLoanInterest = remainingLoan * (leverageRate / 100 / 12);
        const principalPaid = monthlyLoanPayment - monthlyLoanInterest;
        remainingLoan = Math.max(0, remainingLoan - principalPaid);
      }
      
      totalInvested += adjustedInvestment;
    }

    const discountFactor = Math.pow(1 + inflationRate / 100, year);
    const netAssets = assets - remainingLoan; // 扣除未償還的負債

    data.push({
      year,
      assets: Math.round(netAssets),
      realAssets: Math.round(netAssets / discountFactor),
      invested: Math.round(totalInvested),
      returns: Math.round(netAssets - totalInvested),
    });
  }

  return data;
}

/**
 * 計算每月房貸還款額（等額本息）
 * PMT = P × r(1+r)^n / ((1+r)^n - 1)
 */
export function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * 計算剩餘房貸餘額
 */
function remainingLoanBalance(principal: number, annualRate: number, totalYears: number, yearsPaid: number): number {
  const r = annualRate / 100 / 12;
  const n = totalYears * 12;
  const p = yearsPaid * 12;
  if (r === 0) return principal * (1 - p / n);
  const factor1 = Math.pow(1 + r, n);
  const factor2 = Math.pow(1 + r, p);
  return principal * (factor1 - factor2) / (factor1 - 1);
}

/**
 * 租屋 vs 買房 淨資產比較
 */
export function calculateHousingCompare(params: HousingParams): HousingCompareData[] {
  const {
    initialCapital,
    housePrice,
    downPaymentPercent,
    loanRate,
    loanYears,
    monthlyRent,
    rentIncreaseRate,
    investReturn,
    maintenanceRate,
    houseAppreciationRate,
    yearsToCompare,
  } = params;

  const downPayment = housePrice * (downPaymentPercent / 100);
  const loanAmount = housePrice - downPayment;
  const monthlyMortgage = calculateMonthlyMortgage(loanAmount, loanRate, loanYears);
  const monthlyInvestRate = investReturn / 100 / 12;

  const data: HousingCompareData[] = [];

  // --- 租屋方案 ---
  let rentInvestAssets = initialCapital; // 租屋者將全部初始資金投入市場
  let rentCumCost = 0;
  let currentRent = monthlyRent;

  // --- 買房方案 ---
  let buyExtraInvestAssets = initialCapital - downPayment; // 買房者用掉頭期款，剩下投資
  let buyCumCost = downPayment; 
  let currentHouseValue = housePrice;

  // Year 0
  data.push({
    year: 0,
    rentNetWorth: Math.round(rentInvestAssets),
    buyNetWorth: Math.round(currentHouseValue + buyExtraInvestAssets - loanAmount), // 等於 initialCapital
    rentCumCost: 0,
    buyCumCost: Math.round(downPayment),
  });

  for (let year = 1; year <= yearsToCompare; year++) {
    const yearlyMaintenance = housePrice * (maintenanceRate / 100);

    for (let month = 0; month < 12; month++) {
      // 核心公平對比邏輯：確保兩者每月拿出口袋的現金流(支出+存款)完全一樣
      const buyMonthlyCost = (year <= loanYears ? monthlyMortgage : 0) + (yearlyMaintenance / 12);
      const rentMonthlyCost = currentRent;
      
      const monthlyBudget = Math.max(buyMonthlyCost, rentMonthlyCost);
      const buyExtraCash = monthlyBudget - buyMonthlyCost;
      const rentExtraCash = monthlyBudget - rentMonthlyCost;

      rentInvestAssets = rentInvestAssets * (1 + monthlyInvestRate) + rentExtraCash;
      rentCumCost += rentMonthlyCost;

      buyExtraInvestAssets = buyExtraInvestAssets * (1 + monthlyInvestRate) + buyExtraCash;
      buyCumCost += buyMonthlyCost;
    }

    // 租金與房價上漲
    currentRent = currentRent * (1 + rentIncreaseRate / 100);
    currentHouseValue = currentHouseValue * (1 + houseAppreciationRate / 100);

    const remainingLoan = year < loanYears
      ? remainingLoanBalance(loanAmount, loanRate, loanYears, year)
      : 0;

    const buyNetWorth = currentHouseValue + buyExtraInvestAssets - remainingLoan;
    const rentNetWorth = rentInvestAssets;

    data.push({
      year,
      rentNetWorth: Math.round(rentNetWorth),
      buyNetWorth: Math.round(buyNetWorth),
      rentCumCost: Math.round(rentCumCost),
      buyCumCost: Math.round(buyCumCost),
    });
  }

  return data;
}

/**
 * 計算達成財務自由所需年數
 * 財務自由 = 資產 × 4% 被動收入 >= 年支出
 */
export function calculateFIREAge(params: BasicParams, lifeStages?: LifeStage[]): number | null {
  const { currentAssets, monthlyInvestment, monthlyExpense, annualReturn, inflationRate, salaryGrowthRate = 0 } = params;
  const monthlyRate = annualReturn / 100 / 12;
  const yearlyExpense = monthlyExpense * 12;
  let assets = currentAssets;

  for (let year = 1; year <= 100; year++) {
    const salaryFactor = Math.pow(1 + salaryGrowthRate / 100, year - 1);
    const adjustedInvestment = monthlyInvestment * salaryFactor;

    for (let month = 0; month < 12; month++) {
      assets = assets * (1 + monthlyRate) + adjustedInvestment;
    }
    // 4% 法則：年被動收入 = 資產 × 4%，考慮通膨 × 家庭規模乘數
    const familyMult = getFamilyMultiplier(year, lifeStages);
    const adjustedExpense = yearlyExpense * familyMult * Math.pow(1 + inflationRate / 100, year);
    if (assets * 0.04 >= adjustedExpense) {
      return year;
    }
  }
  return null; // 100 年內無法達成
}
