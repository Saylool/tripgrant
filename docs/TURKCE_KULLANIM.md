# TripGrant’ı kullan

Uygulama adresi: **http://127.0.0.1:5173**. Şu an demo, gerçek işlemlerle bilgisayarındaki yerel Solana test ağında çalışıyor. Test tokenlarının parasal değeri yok.

Uygulamayı tekrar açmak için proje klasöründeki `TripGrant.command` dosyasını çalıştırabilir veya `npm run demo` komutunu kullanabilirsin. Önceki denemelerin korunur. İlk kurulum başka bir bilgisayarda yapılacaksa önce `npm ci` gerekir.

## Üç rol

| Ekrandaki ad | İşlevi                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Sponsor      | Öğrenci adına bütçe ayırır. `Create a grant` ile yeni destek oluşturur.               |
| Student      | Kendisine ayrılan bütçeyi görür, belge yükler ve harcama talebi gönderir.             |
| Reviewer     | Asıl belgeyi ve uygunluğu kontrol eder, ödenecek tutarı onaylar veya talebi reddeder. |

Üstteki **View as** bölümünden roller arasında geçiş yap. Demo için üç ayrı test cüzdanı hazırdır.

## 100 → 72 + 28 denemesi

1. **Sponsor:** `Create a grant` seç. Etkinlik, hedef şehir ve amacı gir. Bütçeyi `100` bırak. `Review grant`, ardından `Confirm & fund grant` seç.
2. **Student:** Oluşturduğun etkinliği aç. `Use a synthetic demo receipt` ile temsili belgeyi hazırla. Harcama tutarını `72` girip `Submit expense` seç.
3. **Reviewer:** Aynı desteği aç. `Download receipt` ile belgeyi indir. Demo belgesi açıkça temsili olarak işaretlenmiştir. İnceleme kutusunu işaretle ve `Review settlement` seç.
4. Onay ekranında öğrenciye `72`, sponsora `28` gideceğini gör. `Approve & settle` seç.
5. Sonuç **Paid** olur. `View confirmed transaction` gerçek işlem kaydını gösterir.

Kalan bakiye ve ödeme aynı işlemde gönderilir. Aynı destek ikinci kez ödenemez. Onaylanan tutar `0` olursa bütçenin tamamı geri döner. İnceleme süresi dolduğunda `Return unused budget` iade işlemini başlatır; yalnızca zaman geçmesi kendiliğinden para göndermez.

## Yarışma için hazır olanlar

İngilizce arayüz, çalışan Solana programı, yerel demo, sınamalar, İngilizce sunum ve demo anlatım metinleri proje klasöründe hazır. Sunum ve demo metinleri `docs/PITCH.md` ve `docs/DEMO_SCRIPT.md` içinde.

Henüz yapılmayanlar: herkese açık devnet dağıtımı, internetten erişilen uygulama yayını, sunum/demo video kaydı ve yarışmaya başvuru. Devnet SOL servisi bu oturumda kota hatası verdi. Üniversite uygunluğu ve gerçek öğrenci belgeleri senin bilgilerinle doğrulanmalı; temsili veriler gerçek kullanıcı veya pilot çalışma olarak sunulmamalı.
