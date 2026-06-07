"use client";

import React, { useState, useEffect } from "react";

// 格式化完整數字（帶千分位）
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString("zh-TW");
}

export function SliderInput({
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
  const [localValue, setLocalValue] = useState(value);
  const [currentMax, setCurrentMax] = useState(max);

  // 當外部傳入的值變動時（例如載入劇本），同步更新局部狀態與最大值上限
  useEffect(() => {
    setLocalValue(value);
    if (value > currentMax) {
      setCurrentMax(Math.ceil(value * 1.5));
    }
  }, [value]);

  // 同步外部的最大值上限變動
  useEffect(() => {
    if (max > currentMax || (max !== currentMax && value <= max)) {
      setCurrentMax(max);
    }
  }, [max]);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalValue(val);
    if (val > currentMax) {
      setCurrentMax(Math.ceil(val * 1.5));
    }
  };

  const handleRangeCommit = () => {
    onChange(localValue);
  };

  const handleInputBlur = () => {
    let finalVal = localValue;
    if (finalVal < min) finalVal = min;
    if (finalVal > currentMax) {
      setCurrentMax(Math.ceil(finalVal * 1.5));
    }
    setLocalValue(finalVal);
    onChange(finalVal);
  };

  const handleIncrement = () => {
    const newVal = localValue + step;
    if (newVal > currentMax) {
      setCurrentMax(Math.ceil(newVal * 1.5));
    }
    setLocalValue(newVal);
    onChange(newVal);
  };

  const handleDecrement = () => {
    const newVal = Math.max(min, localValue - step);
    setLocalValue(newVal);
    onChange(newVal);
  };

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDecrement}
            className="w-6 h-6 flex items-center justify-center rounded-md border transition-all text-xs font-bold select-none cursor-pointer"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
          >
            -
          </button>
          <input
            type="number"
            id={id}
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleInputBlur();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="input-field text-right !w-28 !py-1 !px-2 text-sm number-display"
            min={min}
            max={currentMax}
            step={step}
          />
          <button
            type="button"
            onClick={handleIncrement}
            className="w-6 h-6 flex items-center justify-center rounded-md border transition-all text-xs font-bold select-none cursor-pointer"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
          >
            +
          </button>
          <span className="text-sm ml-1 shrink-0 w-5" style={{ color: "var(--text-muted)" }}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={localValue}
        onChange={handleRangeChange}
        onMouseUp={handleRangeCommit}
        onTouchEnd={handleRangeCommit}
        min={min}
        max={currentMax}
        step={step}
        className="w-full cursor-ew-resize"
      />
      {hint && <p className="text-[11px] mt-1.5 opacity-60 leading-relaxed" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}


export function CompactInput({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    let finalVal = localVal;
    if (min !== undefined && finalVal < min) finalVal = min;
    if (max !== undefined && finalVal > max) finalVal = max;
    setLocalVal(finalVal);
    onChange(finalVal);
  };

  return (
    <div>
      <label className="text-xs block mb-1 font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={localVal}
          onChange={(e) => setLocalVal(Number(e.target.value))}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBlur();
              (e.target as HTMLInputElement).blur();
            }
          }}
          step={step}
          min={min}
          max={max}
          className="input-field !py-1.5 !px-2 text-sm number-display flex-1 text-right"
        />
        <span className="text-xs shrink-0 w-4" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  colorHex,
  bgColorHex,
}: {
  icon: string;
  title: string;
  colorHex: string;
  bgColorHex: string;
}) {
  return (
    <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm" style={{ background: bgColorHex, color: colorHex }}>
        {icon}
      </span>
      {title}
    </h2>
  );
}

export function SubSectionHeader({
  title,
  colorHex,
  children,
}: {
  title: string;
  colorHex: string;
  children?: React.ReactNode;
}) {
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

export function InfoBox({
  children,
  colorHex,
  dashed = false,
  className = "",
}: {
  children: React.ReactNode;
  colorHex: string;
  dashed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`p-3.5 rounded-xl mb-4 ${className}`}
      style={{
        background: `${colorHex}08`,
        border: `1px ${dashed ? "dashed" : "solid"} ${colorHex}30`,
      }}
    >
      {children}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  colorClass,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  colorClass: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 ${colorClass}`}></div>
    </label>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl sm:text-3xl font-bold number-display" style={{ color: color || "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}
