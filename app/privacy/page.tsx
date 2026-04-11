import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold mb-6">隱私權政策 (Privacy Policy)</h1>
            
            <div className="space-y-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>1. 資料收集與儲存</h2>
                <p className="leading-relaxed">
                  目前版本之「LifeScope」平台，在未註冊且免費使用的狀態下，我們不會主動收集您的個人敏感識別資訊。
                  您所輸入的各項財務參數（如：現有資產、月收支、投資比例等），僅會暫時儲存於您個人裝置之瀏覽器中（localStorage）。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>2. 資料的傳輸與雲端運算</h2>
                <p className="leading-relaxed">
                  所有的「基礎複利試算」與「租屋 vs 買房對比」，皆完全在您的瀏覽器端執行，資料不會回傳至我們的伺服器。
                  未來若開通雲端備份或蒙地卡羅運算功能，相關參數將會以無身分識別（Anonymized）的形式傳送至我們的運算節點（AWS），運算結果僅供您即時查詢，平台不會將這些數據另作他用或販售給第三方。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>3. Cookie 與類似技術</h2>
                <p className="leading-relaxed">
                  為了提供「劇本存檔」功能以及維持您偏好設定的運作，我們使用了瀏覽器的 Web Storage 技術。若您清除瀏覽器快取，暫存在您裝置上的劇本將會被移除。我們未導入任何第三方追蹤型廣告 Cookie。
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
