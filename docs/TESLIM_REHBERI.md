# TripGrant — teslim hazırlığı

Çalışan ürün hazır. Başvuruda kullanacağın ad **TripGrant**, kısa açıklama ise şöyle olabilir:

> Student travel grants on Solana: reserve a budget, review private expense evidence, then reimburse the approved amount and return unused funds atomically.

## Hesaplar ve son tarihler

11 Ekim 2026'da tekrar kontrol edildi. Önceki araştırmadaki University Track tarihi değişmiş; canlı ilan artık **15 Ekim 23:59** gösteriyor. Ana yarışma ve Türkiye Local Track daha erken kapandığı için üç teslimi de **12 Ekim akşamına** yetiştirmek hedefimiz.

| Teslim                        | Türkiye saatiyle son tarih | Bağlantı                                                                                                  |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Ana Crypto World's Fair       | 13 Ekim 2026, 09:59        | [Colosseum kayıt/giriş](https://colosseum.com/arena/hackathon/register?entry=worldsfair)                  |
| Superteam Türkiye Local Track | 13 Ekim 2026, 09:59        | [Local Track](https://superteam.fun/earn/listing/submit-crypto-worlds-fair-project-for-turkish-builders/) |
| Arf University Track          | 15 Ekim 2026, 23:59        | [University Track](https://superteam.fun/earn/listing/arf-superteam-turkiye-university-track/)            |

Başvuru sahibinin verdiği bilgiler: **Piri Reis Üniversitesi**, GitHub hesabı **[Saylool](https://github.com/Saylool)**. Ad-soyad, Telegram ve X bilgileri henüz bu taslağa eklenmedi. Colosseum ve Superteam Earn ayrı hesaplar; ülke bilgisi Colosseum'da **Turkey** olmalı.

Son tarihler için kaynaklar: [ana yarışmanın resmî kuralları](https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf), yukarıdaki canlı Earn ilanları. Earn formundaki website ve X alanları University Track için zorunlu, Local Track için isteğe bağlı görünüyor. Dolayısıyla University başvurusu için gerçek, erişilebilir uygulama ve X bağlantıları gerekiyor; mevcut localhost adresi başvuru bağlantısı olarak kullanılmamalı.

## Hazır dosyalar

11 Ekim'deki teslim hazırlığında [kaynak deposu](https://github.com/Saylool/tripgrant) ve [jüriye açık proje sayfası](https://saylool.github.io/tripgrant/) yayımlandı. [Colosseum TripGrant taslağı](https://colosseum.com/arena/projects/tripgrant) da oluşturuldu. Bunların oluşturulması **nihai başvurunun gönderildiği anlamına gelmiyor**.

İngilizce [pitch videosu](https://saylool.github.io/tripgrant/videos/pitch.mp4) 1:45, [demo anlatımı](https://saylool.github.io/tripgrant/videos/demo.mp4) 2:13. Gerçek uygulama ekranları üzerinde sentetik İngilizce anlatım var; sürekli ekran kaydı veya başvuru sahibinin kendi sesi değildir. Colosseum'un canlı formu videolar için **YouTube, Loom veya Vimeo** istiyor. Pitch alanı takımın kendisini tanıtmasını; demo alanı çalışan ürünün gösterilmesini istiyor. Bu iki gerekliliğe uygun son sürümler yüklenip platform bağlantıları kullanılmalı; doğrudan MP4 bağlantıları o iki alana konmamalı.

Ana formda accelerator başvurusu ayrıca seçilen, isteğe bağlı bir bölüm olarak görünüyor; şu an seçilmedi. Kişisel başvuru profili, Telegram iletişimi ve Earn'ün zorunlu X alanı kullanıcıdan gelecek bilgilerle tamamlanmalı.

- [README](../README.md): ürün, kurulum, devnet geçişi ve sınırlar.
- [İngilizce pitch](PITCH.md): yaklaşık iki dakikalık sunum metni.
- [İngilizce demo anlatımı](DEMO_SCRIPT.md): uygulama üzerinde kaydedilecek demo akışı.
- [Doğrulama kaydı](VALIDATION.md): 48 başarılı sınama ve gerçek yerel ağ işlemi.
- [Türkçe kullanım](TURKCE_KULLANIM.md): üç rolü denemek için adımlar.
- [İngilizce başvuru taslakları](BASVURU_METINLERI.md): form açıklamalarına kopyalanabilecek ürün metinleri.

## Teslimden önce tamamlanacaklar

1. Sponsor, öğrenci ve inceleyen için üç ayrı devnet cüzdanıyla gerçek devnet akışını dene. Dağıtım cüzdanına test SOL ve sponsora test USDC gerekir; adımlar README'de bulunuyor. Mevcut ekran görüntüleri yerel ağdaki TEST tokenlarıyla çekildi.
2. Kaynak deposunu jüriye erişilebilir hale getir. `.local`, `.tooling`, `.env`, özel anahtarlar ve kişisel belgeler depoya yüklenmemeli; bu dosyalar zaten Git dışında bırakıldı.
3. Cüzdan modunu herkese açık HTTPS adresinde çalıştır ve yeni bir tarayıcı oturumundan açıldığını kontrol et. Herkese açık ortamda `DEMO_MODE=false` ve doğrulanmış devnet programı kullanılmalı.
4. Pitch ve demoyu iki ayrı İngilizce video olarak kaydet. Metinler hazır; video kaydı henüz yapılmadı. Demo gerçek işlem sonucunu ve kullandığı ağı göstermeli.
5. Başvuruda üniversite kaydını ve kendi profil bilgilerini kullan. Demo öğrencisi Ada Y. temsili bir kişidir. Gerçek görüşme, pilot veya ortaklık yapılmadan bunlar varmış gibi yazma.
6. [Ana hackathon](https://colosseum.com/worldsfair), [Türkiye Local Track](https://superteam.fun/earn/listing/submit-crypto-worlds-fair-project-for-turkish-builders/) ve [Arf University Track](https://superteam.fun/earn/listing/arf-superteam-turkiye-university-track/) teslimlerini araştırma raporundaki akışa göre tamamla. Güncel koşullar ve son tarihler için doğrudan ilanları kullan; bütün formlarda aynı proje adı ve çalışan bağlantılar yer alsın.

Yarışma araştırması ve kaynakları [proje seçimi raporunda](../PROJE_FIKRI_ARASTIRMASI.md), Türkiye organizasyon rehberi ise [Superteam Türkiye sayfasında](https://tr.superteam.fun/colosseum). Başvuru sahibi iki platforma kendi giriş yaptı; Colosseum profili ve proje taslağı kaydedildi. Ana yarışmaya veya Earn'deki iki yarışma ilanına nihai proje başvurusu henüz gönderilmedi.
