// localStorage 劇本管理
export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  params: {
    currentAssets: number;
    monthlyIncome: number;
    monthlyExpense: number;
    monthlyInvestment: number;
    annualReturn: number;
    investmentYears: number;
    inflationRate: number;
  };
  housingParams?: {
    housePrice: number;
    downPaymentPercent: number;
    loanRate: number;
    loanYears: number;
    monthlyRent: number;
    rentIncreaseRate: number;
    investReturn: number;
    maintenanceRate: number;
    yearsToCompare: number;
    initialCapital: number;
    houseAppreciationRate: number;
  };
  mcParams?: {
    phase: string;
    volatility: number;
    scenarioId: string;
    blackSwanYear: number;
    blackSwanDrop: number;
    jumpProbability: number;
    jumpImpact: number;
    isDynamic: boolean;
    dynamicRatio: number;
  };
}

const STORAGE_KEY = 'lifescope_scenarios';
const MAX_FREE_SCENARIOS = 3;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function getScenarios(): Scenario[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveScenario(scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Scenario | null {
  const existing = getScenarios();
  if (existing.length >= MAX_FREE_SCENARIOS) {
    return null; // 免費版上限
  }
  const newScenario: Scenario = {
    ...scenario,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, newScenario]));
  return newScenario;
}

export function updateScenario(id: string, updates: Partial<Omit<Scenario, 'id' | 'createdAt'>>): Scenario | null {
  const scenarios = getScenarios();
  const index = scenarios.findIndex(s => s.id === id);
  if (index === -1) return null;
  scenarios[index] = {
    ...scenarios[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  return scenarios[index];
}

export function deleteScenario(id: string): boolean {
  const scenarios = getScenarios();
  const filtered = scenarios.filter(s => s.id !== id);
  if (filtered.length === scenarios.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function canSaveMore(): boolean {
  return getScenarios().length < MAX_FREE_SCENARIOS;
}
