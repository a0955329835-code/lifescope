import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function LegalPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold mb-6">法律與服務條款 (Placeholder)</h1>
            
            <div className="space-y-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>1. 服務聲明</h2>
                <p className="leading-relaxed">
                  本平台（LifeScope）提供之所有試算工具、圖表與數據結果，均為基於數學模型與歷史數據之模擬運算，僅供使用者個人財務規劃之參考。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>2. 免責聲明（重要）</h2>
                <p className="leading-relaxed">
                  本平台<strong>絕不提供任何特定金融商品之買賣建議、投資分析或推薦</strong>，亦不構成任何形式之投資顧問服務。所有運算結果不保證未來實際投資績效。投資市場具有風險，使用者應自行查證並承擔所有投資決策之最終結果與責任。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>3. 隱私權政策</h2>
                <p className="leading-relaxed">
                  目前版本之「劇本存檔」功能，資料全數存放於您個人裝置之瀏覽器中（localStorage）。我們不會將您的財務參數明細上傳至我們的伺服器。若未來開通雲端備份功能，我們將會另行通知並取得您的同意。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>4. 資料準確性</h2>
                <p className="leading-relaxed">
                  「租屋 vs 買房」與「複利試算」等模型均存在簡化之假設條件（如：固定通膨率、忽略不預期支出、未計入房屋交易摩擦成本等）。真實世界之財務狀況更為複雜，請勿將本平台結果作為唯一決策依據。
                </p>
              </section>
            </div>
            
            <div className="mt-8 pt-6 border-t border-dashed" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                最後更新日期：2024年4月 (此為測試站台之預設條款)
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
