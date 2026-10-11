# Fikir seçimi — çalışma notları

## Kullanıcı bağlamı

- Tek kişi; yazılım geliştirmeyi AI araçlarıyla yapmak istiyor.
- Üniversite ve ulaşabildiği kulüpler henüz belirtilmedi. Öğrenci statüsü, ödül için ayrı bir uygunluk koşulu.
- Fikir araştırması talebi: 1–2 saat. Başlangıç 11 Ekim 2026 09:55:27 UTC / 12:55:27 TRT.
- Kodun AI ile yazılması, ürünün AI ürünü olmasını gerektirmiyor. Colosseum SSS, tamamen AI kodlama araçlarıyla MVP kuran kuruculara yatırım yaptıklarını açıkça belirtiyor.

## Taramanın kapsamı

- Beş ana hackathonun resmî ödül/mansiyon yazılarından ilk olarak 337 URL çıktı.
- Bir URL, proje yerine genel dizine gidiyordu; çıkarılınca 336 proje bağlantısı kaldı.
- 251 ayrı ürün açıklamasına erişildi. 85 eski bağlantı, ağırlıkla Renaissance sayısal adresleri, erişilemedi.
- Bu sayı otomatik ön tarama kapsamıdır; 251 projenin kodunun incelendiği anlamına gelmez.
- İndirme günlüğündeki store.fun kaydı iki satıra bölünmüştü; birleştirip JSON olarak doğrulandı. Temiz kayıt `project_sample_clean.jsonl` içinde.
- Ödül sonucu, güncel ürün açıklaması ve ekibin performans iddiası birbirinden ayrılmalı.

## Öne çıkan aday: TripGrant

Öğrenci konferansı/hackathon seyahat desteklerinin önceden ayrılan USDC bütçesini, uygun harcama onayını, sınırlandırılmış ödemesini ve kullanılmayan tutarın dönüşünü birleştiren küçük ürün.

Somut ihtiyaç kaynağı: University Blockchain Conference, seyahat ve konaklama desteğini Solana USDC ile ödüyor. Hak edilen tutar uygun belgeli harcama ile kişinin tavanının küçük olanı. Yerinde check-in şartı, belge teslimi ve etkinlikten sonraki 60 güne kadar ödeme takvimi var. Bütçe aşımında programı oransal azaltma veya kapatma hakkı saklı. Bu, bireysel görüşme yapılmış olduğunu veya tüm gecikmenin banka kaynaklı olduğunu kanıtlamaz.

Hipotez: Bazı kripto topluluğu organizatörleri küçük destekler için bütçeyi kişi bazında önceden ayırmak ve onay sonrası ödeme işini azaltmak ister. Öğrenci, yalnızca söz verilmiş tutar ile gerçekten fonlanmış tutarı ayırt edebilirse yolculuk kararını daha bilinçli verebilir.

En dar MVP: bir etkinlik, bir fonlayan, bir öğrenci, bir onaylayan, tek devnet USDC, tek talep, tek final ödeme. İkinci ödeme engeli, tavan kontrolü ve süre sonrası geri alma gerçek program kuralları olmalı.

Yakın rakipler: Magna (hibe aşamaları/kanıt/ödeme), Streamflow (token dağıtımı/escrow), Zoneless (stablecoin marketplace payouts), Hawamoni (öğrenci ortak treasury). UBC/College.xyz başvuru ve destek sürecinin kendisi de alternatiftir. Rekabet avantajı yeni escrow icadı değil, bu dar öğrenci destek sürecinin daha anlaşılır ve küçük organizatörlere uygun uygulanmasıdır; bu fark henüz kullanıcılarla doğrulanmadı.

MVP, öğrencinin bileti peşin finanse edilmesini çözmez. Avans ya da alacak teminatlı kredi iddiası eklenmemeli. İnsan değerlendirme süresini de zincir tek başına kısaltmaz; sadece onay sonrası stablecoin aktarımı ve ayrılan bütçe denetimi hedeflenir.

Solana Foundation escrow programının depositor receipt withdrawal modelini okuduk: çekim yapanın receipt.depositor olması gerekiyor. Bu yüzden hazır şablonun sponsor→öğrenci, kısmi ödeme, tavan ve expiry-refund akışını doğrudan sunduğu varsayılamaz.

## Diğer adaylar

- CampusGrant: kulüp/proje mikrohibesi için iki aşamalı kanıt ve ödeme. Hedef kullanıcı yakın olabilir; Magna/Hawamoni/Superteam Earn ile benzerlik daha yüksek.
- ReceiveReady: ilk stablecoin ödülünü alacak öğrencinin ağ, token ve alıcı adresi kontrollerini anlaşılır hale getiren ödeme öncesi yardımcı. Daha kolay yapılır, fakat yalnızca SDK referansının arayüzü olarak kalırsa özgünlük ve iş modeli zayıf.
- ReproPay: belli bir açık veri analizini yeniden çalıştıran öğrencilere onayla mikroödeme. Echo/DeSciCrowd/Argus ve bounty araçlarıyla karşılaştırılmalı; uzman doğrulama ve kod çalıştırma kapsamı kısa süre için riskli.

## Elenen geniş kategoriler

Genel AI cüzdanı, x402 geçidi/analitik, GitHub bounty escrow, yeni öğrenci kredi protokolü, kampüs USDC kasası, salt NFT diploma/katılım belgesi, fiziksel DePIN ağı, sıfırdan banka/fiat ramp, genel AI güvenlik denetimi. Bunların bazılarında çok yakın projeler var; diğerleri mevcut teslim süresine ve tek kişiye uygun değil.

## Doğrulanacak karar koşulları

1. En az iki destek/etkinlik sorumlusuna ulaşılabiliyor mu?
2. En az üç öğrenci, fonlanmış tutarı ve henüz onay bekleyen tutarı yardımsız ayırt edebiliyor mu?
3. Organizasyonlar gerçekten kişi bazında bütçe ayırmaya istekli mi, yoksa nakit esnekliğini korumak için istemiyor mu?
4. İlk birkaç geliştirme saatinde gerçek devnet deposit→onaylı ödeme→kalan iade ve yetkisiz işlem reddi çalışabiliyor mu?

Bunlar yapılmış test sonuçları değil; önerilen seçme/eleme ölçütleri.
