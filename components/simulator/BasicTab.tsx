"use client";

import React from "react";
import { BasicParams } from "@/lib/calculator";
import {
  SectionHeader,
  SliderInput,
  SubSectionHeader,
  ToggleSwitch,
  InfoBox,
} from "./SimulatorInputs";
import LeverageBlock from "./LeverageBlock";

interface BasicTabProps {
  basicParams: BasicParams;
  updateBasic: <K extends keyof BasicParams>(key: K, val: BasicParams[K]) => void;
  isLeverageEnabled: boolean;
  setIsLeverageEnabled: (v: boolean) => void;
  computedMonthlyLoan: number;
}

export default function BasicTab({
  basicParams,
  updateBasic,
  isLeverageEnabled,
  setIsLeverageEnabled,
  computedMonthlyLoan,
}: BasicTabProps) {
  return (
    <>
      <SectionHeader
        icon="⚙"
        title="現況與收支設定"
        colorHex="var(--accent-primary)"
        bgColorHex="var(--accent-primary-dim)"
      />
      <SliderInput
        id="monthlyIncome"
        label="月收入"
        value={basicParams.monthlyIncome}
        onChange={(v) => updateBasic("monthlyIncome", v)}
        min={0}
        max={2000000}
        step={5000}
        unit="元"
      />
      <SliderInput
        id="monthlyExpense"
        label="月支出"
        value={basicParams.monthlyExpense}
        onChange={(v) => updateBasic("monthlyExpense", v)}
        min={0}
        max={1000000}
        step={5000}
        unit="元"
      />
      <SliderInput
        id="monthlyInvestment"
        label="月投資額"
        value={basicParams.monthlyInvestment}
        onChange={(v) => updateBasic("monthlyInvestment", v)}
        min={0}
        max={1000000}
        step={5000}
        unit="元"
      />

      <LeverageBlock
        isLeverageEnabled={isLeverageEnabled}
        setIsLeverageEnabled={setIsLeverageEnabled}
        basicParams={basicParams}
        updateBasic={updateBasic}
        computedMonthlyLoan={computedMonthlyLoan}
      />

      <SubSectionHeader title="🌟 人生重大事件 (Life Events)" colorHex="#ec4899">
        <ToggleSwitch
          checked={basicParams.isEventsEnabled || false}
          onChange={(v) => updateBasic("isEventsEnabled", v)}
          colorClass="peer-checked:bg-pink-500"
        />
      </SubSectionHeader>

      {basicParams.isEventsEnabled && (
        <InfoBox colorHex="#ec4899" dashed>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => {
                const newEvents = [
                  ...(basicParams.customEvents || []),
                  { year: 5, name: "買車", amount: -800000 },
                ];
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
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-white/50 dark:bg-black/20 border border-pink-500/20"
                >
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
                    className={`input-field !py-1 !px-2 text-xs w-28 text-right font-medium ${
                      ev.amount >= 0 ? "text-green-500" : "text-red-400"
                    }`}
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
  );
}
