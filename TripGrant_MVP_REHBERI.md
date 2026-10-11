# TripGrant — uygulanabilir ilk sürüm

Bu belge araştırma aşamasındaki geliştirme taslağıdır. 11 Ekim 2026'da çalışan uygulama ve Solana programı oluşturuldu; güncel kurulum ve sınamalar [README](README.md) ve [doğrulama kaydında](docs/VALIDATION.md) bulunur. Demo gerçek işlemlerle yerel Solana ağında çalışır; devnet yayını henüz yapılmadı. Ana karar ve kaynak karşılaştırması [araştırma raporunda](/Users/samet/Desktop/solanahacheton/PROJE_FIKRI_ARASTIRMASI.md) bulunur.

## Ürün cümlesi

Öğrenci etkinlik seyahat desteği için ayrılmış bütçeyi göster; uygun harcama onaylandığında öğrenciye tek ödeme yap ve kullanılmayan kısmı fonlayana döndür.

İlk sürüm yalnızca Solana devnet'te, temsili etkinlik ve belgelerle çalışır. Bu etkinlik UBC, LLVM veya Arf ile ortaklık olarak gösterilmeyecek.

## Üç kullanıcı ve üç ekran

| Kullanıcı | Ekran | Yapacağı iş |
|---|---|---|
| Fonlayan | Destek oluştur | Sabit alıcı, inceleyen, tavan ve tarihler seç; bütçeyi yatır |
| Öğrenci | Desteğim | Ayrılan tutarı gör; gider tutarı ve belgeyi sun; ödeme sonucunu izle |
| Yetkili inceleyen | İncele | Katılım ve harcama uygunluğunu değerlendir; son tutarı onayla |

Öğrenci ekranındaki dört tutar: ayrılan, talep edilen, onaylanan, ödenen. “Ayrılan bütçe” tek başına harcamanın kabul edileceği veya kesin ödeme hakkı olduğu anlamına gelmez.

Destek oluşturulduktan sonra alıcı, inceleyen, tavan, token ve tarihler değişmez. Programın geliştirme sürümünde kodu güncelleme yetkisi bulunuyorsa bu açıkça gösterilir. Fonların her koşulda değişmez veya güven garantili olduğu iddia edilmez. [Solana program yetkileri](https://solana.com/docs/programs/deploying)

## En küçük zincir modeli

Tek etkinlik için ayrı bir karmaşık yönetim sistemi gerekmiyor. Her destek bir kayıt ve programın kontrolündeki token hesabıyla temsil edilebilir.

Kayıt alanları: benzersiz destek kimliği, fonlayan, öğrenci, inceleyen, izin verilen test tokenının mint'i, tavan, talep tutarı, son onay tutarı, belge özeti/hash, belge teslim sonu, sonuçlandırma sonu ve durum.

Durumlar: `Funded → Submitted → Paid / Rejected`; sonuçlandırılmamış kayıt, kapanışta `Expired` olabilir. `Paid`, `Rejected` ve `Expired` son durumlardır. Sonuçlandırılmış kaydı yeniden açma yok.

Fon miktarı tavanla aynı olacak. Sonradan ek fonlama, çoklu sponsor ve parça parça ödeme yok. Token miktarları en küçük biriminde tam sayı tutulacak; para hesabında kayan noktalı sayılar kullanılmayacak.

| İşlem | İmza | Programın uygulayacağı temel koşul |
|---|---|---|
| Oluştur ve fonla | Fonlayan | Destek kimliği yeni; tutar pozitif; tarihler sıralı; doğru token; bütçe aynı işlemde aktarılır |
| Harcamayı sun | Öğrenci | Durum Funded; doğru öğrenci; belge teslim süresi geçmemiş; tek talep |
| Sonuçlandır | İnceleyen | Durum Submitted; doğru inceleyen; onay ≤ talep ve tavan; sonuçlandırma süresi geçmemiş |
| Süre sonrası iade | Herhangi bir çağıran | Sonuçlandırma süresi geçmiş; kayıt hâlâ açık; hedef yalnızca kayıtlı fonlayan |

Sonuçlandırma tek işlemde onaylanan tutarı sabit öğrenci hesabına, kalan tutarı sabit fonlayan hesabına yollar. Sıfır onay, bütün bütçenin iadesi ve Rejected durumu demektir. Belgeyi kimin değerlendirdiği açık bir güven varsayımıdır; program fişin gerçekliğini kendi başına belirleyemez.

Talep sonu ile sonuçlandırma sonu ayrı olmalı: Zamanında belge sunan öğrencinin inceleme için ek süresi bulunur. Sonuçlandırma sonu geçtiğinde onay artık kabul edilmez; iade çağrısı kabul edilir. Bu sınır ekranda açıkça anlatılır. Tüm saat kontrolleri zincirin saatinden alınır.

**Zaman dolması kendiliğinden işlem göndermez.** MVP'de açık bir “Süresi dolan bütçeyi iade et” işlemi bulunur. İleride otomasyon eklenebilir. [Solana işlem modeli](https://solana.com/docs/core/transactions)

Programa ait token hesabına sonradan doğrudan gönderilen ek tokenlar için de açık kural gerekir: Hak edilen öğrenci tutarı tavanı aşamaz; sonuçlandırma/iade sonunda hesapta kalan ekstra tokenlar kayıtlı fonlayana gider. Başka mint ve yanlış token hesabı kabul edilmez. Hesap kapama ve kira tutarı da belgelenir.

Son ödeme kaydı korunmalı: Token hesabı kapatılabilse bile destek kaydı veya benzersiz kimliğin kullanılmış olduğu bilgisi kalır. Bütün kaydı silip aynı kimlikle yeniden oluşturulmasına izin vermek, ikinci ödeme engeli iddiasıyla çelişir.

## Web tarafı ve belgeler

TypeScript ile üç küçük ekran ve mevcut bir Solana cüzdan bağlantısı yeterli. Gereksiz hesap sistemi ve çok sayıda SDK eklenmeyecek. Program için güncel resmî geliştirme araçları seçilecek; sürümler depo içinde sabitlenecek. [World's Fair kaynakları](https://colosseum.com/worldsfair/resources)

Gerçek belgeler, öğrenci numarası, kimlik ve bilet ayrıntıları açık zincire yüklenmez. İlk demo sentetik belge kullanır. Sonraki pilotta yetkili erişimle saklanan belgeler ve imzalı oturum gerekir; dosya bağlantısını yalnızca gizlemek erişim kontrolü sayılmaz.

Hash, incelenen belge sürümünü ilişkilendirebilir; belge doğruluğunu kanıtlamaz. Cüzdanlar, tutarlar ve durumlar zincirde görünür olduğundan ürüne “tamamen özel” denmeyecek.

Onay ekranı işlem başarılı görünene kadar “ödendi” yazmamalı. Ağ gecikmesi veya tekrar denemede mevcut zincir durumu okunmalı. Yerel tarayıcı belleğinde bakiye değiştirmek gerçek ödeme yerine geçmez.

## İlk geliştirme oturumundaki karar testi

İlk 3–4 saatin hedefi gerçek test ağı üzerinde çekirdeği kanıtlamak. Kurulum ve derleme de bu sürenin içindedir. Aşağıdaki akış olmadan görsel tasarıma saatler harcanmamalı:

**100 test tokenı yatır → öğrenci 72 talep etsin → yetkili 72 onaylasın → öğrenci +72, fonlayan +28 → aynı kayıt ikinci ödeme yapamasın.**

USDC adı kullanılacaksa doğru devnet mint'i resmî kaynaktan doğrulanmalı. Yerel testlerde özel test mint'i kullanılabilir, ancak arayüzde açıkça böyle adlandırılmalı. Gerçek para gerekmiyor. [Circle test tokenı kaynağı](https://faucet.circle.com/?chain=SOL)

11 Ekim kontrolünde Circle'ın Solana devnet USDC mint'i `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. Faucet, adres/ağ başına iki saatte 20 test USDC sağladığını belirtiyor. İlk devnet akışını **10 → 7,2 + 2,8** ile göstermek yeterli; 100 → 72 + 28 temsili anlatım ve yerel test örneğidir. Pitch'teki demo tutarı gerçek kayıtla eşleştirilmeli. [Resmî token adresleri](https://developers.circle.com/stablecoins/usdc-contract-addresses), [faucet](https://faucet.circle.com/?chain=SOL)

Solana Foundation escrow örneği eğitim ve kod inceleme kaynağı olabilir; doğrudan uygun ürün altyapısı sayılmamalı. Makbuz sahibinin çekim modelini bu uygulamanın üçüncü kişiye kısmi ödeme modeline uyarlamak ayrıca tasarım gerektirir. [Program açıklaması](https://github.com/solana-foundation/escrow/blob/main/docs/PROGRAM_OVERVIEW.md)

Çekirdek yetişmezse yeni özellik eklemek yerine ReceiveReady yedeğine geçmek değerlendirilmeli. Bu bir uygulanabilirlik sınırı; AI ile geliştirme tamamlanma garantisi vermez.

## Gerekli davranış kontrolleri

Bunlar planlanan kontrollerdir, geçmiş veya başarılı test sonucu değildir.

1. 100 → 72 + 28 bakiyeleri ve son durum birlikte doğru değişiyor.
2. Yetkisiz cüzdan öğrenci adına talep sunamıyor ve onay veremiyor.
3. Talep veya tavan üstü onay, fon hareketi olmadan reddediliyor.
4. Alıcı veya iade hedefi başka hesapla değiştirilemiyor.
5. Yanlış mint, token hesabı sahibi veya token programı reddediliyor.
6. İkinci ödeme, tekrar talep ve aynı destek kimliğini yeniden oluşturma reddediliyor.
7. Belge teslim sınırından önce ve sonra doğru davranış var.
8. Onay kapanıştan önce mümkün; kapanışta ve sonra mümkün değil.
9. Erken iade reddediliyor; süre sonrası iade sabit fonlayana gidiyor.
10. Sıfır onay bütün tutarı iade ediyor, destek yeniden açılamıyor.
11. İki sonuçlandırma veya iade/sonuçlandırma yarışında yalnızca geçerli tek işlem başarılı oluyor.
12. Başarısız aktarımda bakiye ve durum birlikte geri alınıyor; belirsiz ağ sonucunda UI zincirden yeniden doğruluyor.
13. Doğrudan ek token gönderilmesi ve hesap kapanışı bakiye kaybı yaratmıyor.
14. Öğrenci UI'da ayrılan bütçeyle henüz hak edilmiş tutarı karıştırmıyor.

## Kullanıcı doğrulaması

Kod AI tarafından yazılabilir. Araştırmada eksik kalan asıl bilgi, insanların bu ürünü isteyip istemediği.

İki organizatöre aynı somut örneği göster: “Bir öğrenci için 100 ayırıp gider onaylandığında 72 ödeme ve 28 iade sizin sürecinizde faydalı olur mu? Bütçeyi önceden tutmaya razı olur musunuz? Hangi mevcut adımı ortadan kaldırır?”

Üç öğrenciye tutar panelini gösterip “Şu an hangi tutarı alabilirsin, hangi tutar koşula bağlı?” diye sor. Yanıtları kaydet, yanlış anlaşılan ifadeyi düzelt. Sadece beğeni ve varsayımsal ilgiye kullanıcı veya gelir denmeyecek.

## İki dakikalık İngilizce pitch taslağı

Bu metin, özellikler çalıştıktan sonra doğrulanmış biçimde kullanılabilir. Bugün çalışan ürün veya ortaklık iddiası değildir.

> Student travel grants have a familiar sequence: an award, a spending cap, receipts, review, and reimbursement. UBC already pays student travel support in USDC on Solana. LLVM's travel-grant guidance also describes past international payment difficulties.
>
> TripGrant focuses on a smaller problem: showing whether an individual student's budget is actually funded, then connecting an authorized expense decision to payment.
>
> In our devnet demonstration, an organizer reserves 100 test USDC for one student. The student submits 72 in eligible expenses. The designated reviewer approves that amount. One transaction pays 72 to the student and returns 28 to the funder. The same grant cannot pay twice.
>
> The reviewer decides whether the documents and attendance are acceptable. Solana enforces the recipient, the cap, and the final payment state. We do not finance the airfare upfront or claim that blockchain makes a receipt truthful.
>
> Existing tools already handle grants and token distribution. Our hypothesis is that small, crypto-native student events need a simpler travel-support workflow. We will test that with organizers and students before expanding the product.

Gerçek görüşmeler yapılırsa son paragrafa sadece doğrulanan geri bildirim ve buna bağlı değişiklik eklenir. Kaynak: [UBC](https://www.universityblockchain.org/travel-grants), [LLVM](https://foundation.llvm.org/grants-scholarships).

## Üç dakikadan kısa demo

| Süre | Göster |
|---|---|
| 0:00–0:25 | Öğrencinin fonlanmış bütçe ve henüz onaylanmamış gider farkı |
| 0:25–0:55 | Fonlayanın 100 test USDC yatırması ve işlem bağlantısı |
| 0:55–1:20 | Öğrencinin temsili 72 tutarındaki gideri sunması |
| 1:20–1:55 | Yetkili onay, 72 ödeme ve 28 iade; zincirdeki bakiye değişimi |
| 1:55–2:20 | İkinci ödeme denemesinin reddi; kısa açıklama |
| 2:20–2:45 | Ayrı kayıtta süre sonrası iade ve ürünün sınırları |

README içinde devnet program adresi, kullanılan test mint'i, kurulum, üç rol, yeniden üretilebilir demo, yapılan testlerin gerçek sonuçları ve bilinen sınırlar yer almalı. İngilizce sunum ve repo erişimi üç başvuruda da kontrol edilmeli. İşlem linkleri ve demo verisi açıkça test ağı olarak etiketlenmeli.

## Projeyi savunurken kullanılacak sınırlar

| Muhtemel jüri sorusu | Dürüst cevap |
|---|---|
| Bir form ve tablo aynı işi yapamaz mı? | Belge toplama ve inceleme yapılabilir. Zincirdeki fark, gerçekten ayrılmış token bütçesini ve ödeme/iade kurallarını uygulamak. Önceden fonlama talebi yoksa bu fark zayıflar. |
| Magna ve başka hibe araçlarından nasıl ayrışıyor? | Temel mekanizma yeni değil. İddiamız küçük öğrenci etkinliğinde tavan, uygun gider, fonlanmış bütçe ve kalan iadenin daha kolay yönetilmesi; bunu kullanıcı testiyle kanıtlamamız gerekiyor. |
| Öğrencinin bileti almaya parası yoksa? | İlk sürüm avans veya kredi vermiyor; yolculuk öncesi finansman problemini çözmüyor. |
| Onaylayan yanlış karar verirse? | İnsan incelemesine güven gerekiyor. Program belge doğruluğunu değil, yetkiyi ve fon hareketini denetliyor. |
| Bir öğrenci aynı fişi başka destek için kullanırsa? | İlk sürüm aynı destekten ikinci ödemeyi önlüyor. Farklı programlar arasında çift finansmanı tespit ettiği iddia edilmiyor. |
| Bu kurumlar müşteriniz mi? | UBC ve LLVM yalnızca kamuya açık ihtiyaç kaynakları. Ortaklık, pilot ve kullanıcı sayısı ancak gerçekten elde edildiyse söylenir. |
| Nasıl gelir elde edecek? | Organizatör için etkinlik başına hizmet veya entegrasyon ücreti araştırılacak. Ödeme isteği henüz doğrulanmadı. |

Projenin en güçlü sunumu, kuralların başarılı çalıştığı bir ödeme ile gerçek bir organizatörün hangi adımının kolaylaştığını birlikte göstermektir. Yalnızca güzel arayüz, ihtiyacı ve farkı kanıtlamaz.
