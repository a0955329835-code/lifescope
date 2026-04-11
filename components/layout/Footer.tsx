import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "var(--gradient-button)" }}>
                <span className="font-bold" style={{ color: "var(--bg-primary)" }}>L</span>
              </div>
              <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Life<span style={{ color: "var(--accent-primary)" }}>Scope</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              用機率思維，規劃你的財務人生。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>功能</h4>
            <ul className="space-y-2">
              <li><a href="/simulator" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>複利試算器</a></li>
              <li><a href="/simulator?tab=housing" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>租屋 vs 買房</a></li>
              <li><span className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}>蒙地卡羅模擬 <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}>即將推出</span></span></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>法律資訊</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>隱私權政策</Link></li>
              <li><Link href="/terms" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>服務條款</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="p-4 rounded-xl" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--accent-warning)" }}>⚠️ 免責聲明：</span>
              本工具僅提供客觀數據運算與情境模擬，所有試算結果均基於使用者自行輸入之假設參數，不代表未來實際投資績效。
              本站不提供任何特定金融商品之買賣建議、投資分析或投資推薦，亦不構成《證券投資信託及顧問法》所規範之投資顧問服務。
              投資有風險，使用者應自行判斷並承擔所有投資決策之結果。
            </p>
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} LifeScope. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
