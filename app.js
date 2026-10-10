import { store } from './store.js';
import { getSavedTheme, getSavedBgColor, gunlukIstatistikleriAl, gunlukPaneliGuncelle, saveTheme, saveBgColor, saveQuestion, cozumuTarihleKaydet, getSavedQuestions, removeSavedQuestion } from './storage.js';
import { tumSorulariYukle, soruGetirVeyaUret } from './quiz.js';
import { ekraniGuncelle, ekranlariGizle, adminTablosunuDoldur, testiBaslat, geriDersSecime, geriKonuSecime, kayitliSorulariGoster, kayitliSoruyuSil, haftalikGrafigiCiz, sinavSonucunuHesapla, adminSoruAnalizPaneliniKur } from './ui.js';

// Global inline onclick çağrıları için window objesine bağlama
window.testiBaslat = testiBaslat;
window.geriDersSecime = geriDersSecime;
window.geriKonuSecime = geriKonuSecime;
window.kayitliSoruyuSil = kayitliSoruyuSil;
window.kayitliSorulariGoster = kayitliSorulariGoster;

window.soruyuKaydetTetikle = function() {
    const state = store.getState();
    const aktifSoru = state.soruGecmisi[state.aktifIndex];
    
    if(!aktifSoru) return;

    // Sorunun şu anki kayıt durumunu kontrol et
    const kaydedilenler = getSavedQuestions();
    const dahaOnceKaydedilmisMi = kaydedilenler.some(s => String(s.id) === String(aktifSoru.id));

    const kaydetBtn = document.getElementById('kaydetBtn');

    if (dahaOnceKaydedilmisMi) {
        // Zaten kayıtlıysa listeden çıkar ve butonu sarıya (eski haline) döndür
        removeSavedQuestion(aktifSoru.id);
        if(kaydetBtn) {
            kaydetBtn.innerHTML = `<i class="bi bi-bookmark-plus"></i> Soruyu Kaydet`;
            kaydetBtn.classList.replace('btn-success', 'btn-warning');
        }
    } else {
        // Kayıtlı değilse listeye ekle ve butonu yeşile döndür
        saveQuestion(aktifSoru);
        if(kaydetBtn) {
            kaydetBtn.innerHTML = `<i class="bi bi-bookmark-check-fill"></i> Kaydedildi`;
            kaydetBtn.classList.replace('btn-warning', 'btn-success');
        }
    }
};

window.itirazSil = function(id) {
    if(confirm("Silmek istiyor musunuz?")) { 
        store.dispatch({ type: 'ITIRAZ_SIL', payload: id }); 
        adminTablosunuDoldur(); 
    }
};

// Başlangıç Teması ve Arka Plan Rengi Entegrasyonu
if (getSavedTheme() === 'dark') document.body.classList.add('dark-theme');

const kayitliArkaplanRengi = getSavedBgColor();
const renkSecici = document.getElementById('arkaplanRenkSecici');
if (renkSecici && kayitliArkaplanRengi) {
    document.body.style.setProperty('background-color', kayitliArkaplanRengi, 'important');
    renkSecici.value = kayitliArkaplanRengi;
}

// Redux Subscription
store.subscribe(ekraniGuncelle);

// Event Listeners - Seçenek Butonları
document.querySelectorAll('.secenek-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const secilenSik = e.target.getAttribute('data-secenek');
        const aktifSoru = store.getState().soruGecmisi[store.getState().aktifIndex];
        if (aktifSoru.verilenCevap) return; 
        
        button.classList.remove('elenmis');
        const dogruMu = (secilenSik === aktifSoru.dogruCevap);

        const gunluk = gunlukIstatistikleriAl();
        if (dogruMu) gunluk.dogru += 1;
        else gunluk.yanlis += 1;
        
        localStorage.setItem('kpss_gunluk_istatistik', JSON.stringify(gunluk));
        gunlukPaneliGuncelle();
        cozumuTarihleKaydet(dogruMu ? 'dogru' : 'yanlis', aktifSoru.ders, aktifSoru.konu);

        store.dispatch({ type: 'CEVAP_KAYDET', payload: { cevap: secilenSik, puanDegisimi: dogruMu ? 5 : -5 } });
    });

    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const aktifSoru = store.getState().soruGecmisi[store.getState().aktifIndex];
        if (aktifSoru.verilenCevap) return;
        button.classList.toggle('elenmis');
    });
});

// Boş Bırak, Temizle, İleri, Geri Butonları
const bosBtnEl = document.getElementById('bosBirakBtn');
if (bosBtnEl) {
    bosBtnEl.addEventListener('click', () => {
        const aktifSoru = store.getState().soruGecmisi[store.getState().aktifIndex];
        if (aktifSoru.verilenCevap) return;
        store.dispatch({ type: 'CEVAP_KAYDET', payload: { cevap: 'BOS', puanDegisimi: 0 } });
    });
}

document.getElementById('temizleBtn').addEventListener('click', () => { 
    const state = store.getState();
    const aktifSoru = state.soruGecmisi[state.aktifIndex];
    
    if (aktifSoru.verilenCevap && aktifSoru.verilenCevap !== 'BOS') {
        const gunluk = gunlukIstatistikleriAl();
        if (aktifSoru.verilenCevap === aktifSoru.dogruCevap) {
            gunluk.dogru = Math.max(0, gunluk.dogru - 1);
        } else {
            gunluk.yanlis = Math.max(0, gunluk.yanlis - 1);
        }
        localStorage.setItem('kpss_gunluk_istatistik', JSON.stringify(gunluk));
        gunlukPaneliGuncelle();
    }
    store.dispatch({ type: 'CEVABI_TEMIZLE' }); 
});

document.getElementById('ileriBtn').addEventListener('click', () => { soruGetirVeyaUret(); });
document.getElementById('geriBtn').addEventListener('click', () => {
    const state = store.getState();
    if (state.aktifIndex > 0) store.dispatch({ type: 'INDEKS_GUNCELLE', payload: state.aktifIndex - 1 });
});

// Tema ve Arka Plan Değiştiriciler
const temaBtn = document.getElementById('temaDegistirBtn');
if (temaBtn) {
    temaBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const yeniTema = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        saveTheme(yeniTema);
    });
}

if (renkSecici) {
    renkSecici.addEventListener('input', (e) => {
        const secilenRenk = e.target.value;
        document.body.style.setProperty('background-color', secilenRenk, 'important');
        saveBgColor(secilenRenk);
    });
}

// İtiraz / Hata Bildirim Modalı
const modal = document.getElementById('itirazModali');
const adayNotuInput = document.getElementById('adayNotu');
document.getElementById('hataBildirBtn').addEventListener('click', () => { modal.style.display = 'flex'; adayNotuInput.value = ""; adayNotuInput.focus(); });
document.getElementById('modalKapat').addEventListener('click', () => { modal.style.display = 'none'; });
document.getElementById('modalGonder').addEventListener('click', () => {
    const state = store.getState();
    const aktifSoru = state.soruGecmisi[state.aktifIndex];
    const not = adayNotuInput.value.trim();
    if (not === "") { alert("Lütfen bir not yazın."); return; }
    store.dispatch({ type: 'ITIRAZ_EKLE', payload: { id: Date.now().toString(), soruId: aktifSoru.id, ders: aktifSoru.ders, konu: aktifSoru.konu, adayNotu: not, tarih: new Date().toLocaleString('tr-TR') } });
    modal.style.display = 'none';
    alert("Bildirimin başarıyla kaydedildi!");
});

// Oturum Yönetimi ve Navigasyon
if (localStorage.getItem('kpss_ogrenci_oturum') === 'aktif') { 
    ekranlariGizle(); 
    document.getElementById('dersSecimEkrani').style.display = 'block'; 
}

document.getElementById('adayGirisBtn').addEventListener('click', () => {
    if (document.getElementById('sifre').value === "1234") { localStorage.setItem('kpss_ogrenci_oturum', 'aktif'); ekranlariGizle(); document.getElementById('dersSecimEkrani').style.display = 'block'; } else { alert("Hatalı şifre!"); }
});

document.getElementById('adminGirisBtn').addEventListener('click', () => {
    if (document.getElementById('sifre').value === "1234") { 
        ekranlariGizle(); 
        document.getElementById('siteLogosu').style.display = 'none'; // LOGOYU GİZLE
        document.getElementById('adminPaneli').style.display = 'block'; 
        adminTablosunuDoldur(); 
        adminSoruAnalizPaneliniKur(); 
    } else { 
        alert("Hatalı şifre!"); 
    }
});

// Sistemden çıkış yaparken ana sayfaya dönüleceği için logoyu geri getiriyoruz
function cikisYap() { 
    localStorage.removeItem('kpss_ogrenci_oturum'); 
    ekranlariGizle(); 
    document.getElementById('siteLogosu').style.display = 'flex'; // LOGOYU GERİ GETİR
    document.getElementById('girisEkrani').style.display = 'block';
}
document.getElementById('dersSecimCikisBtn').addEventListener('click', cikisYap);
document.getElementById('adminCikis').addEventListener('click', cikisYap);
document.getElementById('testEkraniCikisBtn').addEventListener('click', () => {
    const state = store.getState(); // Redux mağazasından aktif dersi öğreniyoruz
    
    if (state.aktifDers === 'Deneme') {
        // Eğer kullanıcı Genel Deneme Sınavı çözüyorsa
        if (confirm("Sınavı bitirip sonuç karnenizi görmek istediğinize emin misiniz?")) {
            sinavSonucunuHesapla();
        }
    } else {
        // Eğer kullanıcı normal ders/konu testi çözüyorsa
        if (confirm("Testi bitirip ders seçim ekranına dönmek istediğinize emin misiniz?")) {
            geriDersSecime();
        }
    }
});

document.querySelectorAll('.ders-sec-btn').forEach(b => {
    if(b.hasAttribute('data-ders')) {
        const dersAdi = b.getAttribute('data-ders');
        b.addEventListener('mouseenter', (e) => {
            const state = store.getState();
            const dersSoruSayisi = state.sorular.filter(s => s.ders === dersAdi).length;
            e.target.setAttribute('title', `toplam ${dersSoruSayisi} soru içerir`);
        });
        b.addEventListener('click', (e) => testiBaslat(dersAdi));
    }
});
document.getElementById('denemeYapBtn').addEventListener('click', () => { testiBaslat('Deneme'); });

// İlk Çalıştırma Kurulumları
gunlukPaneliGuncelle();
tumSorulariYukle();

// TIKLAMA DİNLEYİCİSİ (EVENT DELEGATION)
document.addEventListener('click', (e) => {
    const kaydetButonu = e.target.closest('#kaydetBtn');
    if (kaydetButonu && !kaydetButonu.disabled) {
        window.soruyuKaydetTetikle();
    }

    const gosterButonu = e.target.closest('#kayitliSorularGosterBtn');
    if (gosterButonu) {
        window.kayitliSorulariGoster();
    }
    
    const tiklananKelime = e.target.closest('.tiklanabilir-kelime');
    if (tiklananKelime) {
        tiklananKelime.classList.toggle('vurgulu-kelime');
    }
});

// Grafiği Göster/Kapat Butonları
const grafikBtn = document.getElementById('grafikGosterBtn');
if (grafikBtn) {
    grafikBtn.addEventListener('click', () => haftalikGrafigiCiz(false, 'benimGrafigimTest', 'grafikAlaniTest'));
}

const kapatBtnAna = document.getElementById('grafikKapatBtnAna');
if (kapatBtnAna) {
    kapatBtnAna.addEventListener('click', () => document.getElementById('grafikAlaniAna').style.display = 'none');
}

// Test ekranındaki grafik kapatma butonu
const kapatBtnTest = document.getElementById('grafikKapatBtnTest');
if (kapatBtnTest) {
    kapatBtnTest.addEventListener('click', () => document.getElementById('grafikAlaniTest').style.display = 'none');
}

// Kavram Modali Kapatma İşlevi
const kavramKapatBtn = document.getElementById('kavramModalKapat');
if (kavramKapatBtn) {
    kavramKapatBtn.addEventListener('click', () => document.getElementById('kavramModali').style.display = 'none');
}

// EKLENEN SATIR: Sayfa açılır açılmaz grafiği sessizce altta oluşturur
haftalikGrafigiCiz(true, 'benimGrafigimAna', 'grafikAlaniAna');

// Sor: Gemini Butonu İşlevi

// YARDIMCI FONKSİYON: Metin içindeki HTML etiketlerini (<u>, <b> vb.) temizler
function metniTemizle(htmlMetin) {
    if (!htmlMetin) return "";
    const geciciDiv = document.createElement("div");
    geciciDiv.innerHTML = htmlMetin;
    return geciciDiv.textContent || geciciDiv.innerText || "";
}

// YARDIMCI FONKSİYON: Tüm arama ve yapay zeka yönlendirmelerini tek elden yönetir
function soruyuArastir(hedefUrl, pencereAdi, aramaMotoruMu = false) {
    const state = store.getState();
    const aktifSoru = state.soruGecmisi[state.aktifIndex];
    
    if (!aktifSoru) return;

    let kopyalanacakMetin = "";
    
    // 1. DÜZELTME: Soru metnindeki <u>, <br> gibi HTML etiketlerini temizliyoruz
    const temizSoruMetni = metniTemizle(aktifSoru.soruMetni);

    if (aramaMotoruMu) {
        kopyalanacakMetin = temizSoruMetni;
    } else {
        kopyalanacakMetin = `Şu KPSS sorusunu benim için detaylıca çözüp açıklar mısın?\n\n`;
        kopyalanacakMetin += `Ders: ${aktifSoru.ders}\nKonu: ${aktifSoru.konu}\n\n`;
        kopyalanacakMetin += `Soru: ${temizSoruMetni}\n\n`;
        
        if (aktifSoru.secenekler) {
            Object.entries(aktifSoru.secenekler).forEach(([harf, metin]) => {
                // Şıktaki HTML etiketlerini de temizliyoruz
                let temizSecenek = metniTemizle(metin);
                
                // 2. DÜZELTME: Eğer seçenek zaten "A) ", "B)" gibi başlıyorsa o kısmı kesip atıyoruz
                const regex = new RegExp(`^${harf}[\\)\\-\\. ]\\s*`, 'i');
                temizSecenek = temizSecenek.replace(regex, '');
                
                kopyalanacakMetin += `${harf}) ${temizSecenek}\n`;
            });
        }
    }

    // Pano (Clipboard) İşlemi ve Yönlendirme
    navigator.clipboard.writeText(kopyalanacakMetin).then(() => {
        let nihaiUrl = hedefUrl;
        
        if (aramaMotoruMu) {
            nihaiUrl += encodeURIComponent(kopyalanacakMetin);
        }

        const acilanPencere = window.open(nihaiUrl, pencereAdi);
        if (acilanPencere) {
            acilanPencere.focus();
        }
        
        if (!aramaMotoruMu) {
            alert(`${pencereAdi} için soru kopyalandı! Açılan sekmede kutucuğa yapıştırarak (Ctrl+V) sorabilirsin.`);
        }
    }).catch(err => {
        console.error("Kopyalama başarısız oldu: ", err);
        alert("Bağlantı açılamadı. Lütfen tarayıcı izinlerinizi kontrol edin.");
    });
}

// BÜTÜN BUTONLARIN TETİKLEYİCİLERİ (Event Listeners)
const geminiBtn = document.getElementById('geminiSorBtn');
if (geminiBtn) geminiBtn.addEventListener('click', () => soruyuArastir('https://gemini.google.com/app', 'GeminiSohbetim', false));

const chatgptBtn = document.getElementById('chatgptSorBtn');
if (chatgptBtn) chatgptBtn.addEventListener('click', () => soruyuArastir('https://chatgpt.com/', 'ChatGPTSohbetim', false));

const deepseekBtn = document.getElementById('deepseekSorBtn');
if (deepseekBtn) deepseekBtn.addEventListener('click', () => soruyuArastir('https://chat.deepseek.com/', 'DeepSeekSohbetim', false));

const googleBtn = document.getElementById('googleSorBtn');
// ?q= parametresi sayesinde Google'da direkt arama yapar
if (googleBtn) googleBtn.addEventListener('click', () => soruyuArastir('https://www.google.com/search?q=', 'GoogleArama', true));

const wikiBtn = document.getElementById('wikiSorBtn');
// Türkçe (tr) wikipedia sayfasına yönlendirir
if (wikiBtn) wikiBtn.addEventListener('click', () => soruyuArastir('https://tr.wikipedia.org/w/index.php?search=', 'WikiArama', true));

let sayacInterval;

export function sayaciBaslat() {
    let toplamSaniye = 130 * 60; // 130 dakika
    const sayacAlani = document.getElementById('denemeSayacAlani');
    const kalanSureMetin = document.getElementById('kalanSure');
    
    // Sayaç alanını görünür yap
    if(sayacAlani) sayacAlani.style.display = 'block';
    clearInterval(sayacInterval); // Önceki açık kaldıysa temizle

    sayacInterval = setInterval(() => {
        toplamSaniye--;
        
        let dakika = Math.floor(toplamSaniye / 60);
        let saniye = toplamSaniye % 60;
        
        // Saniye tek haneliyse başına sıfır koy (örn: 12:05)
        kalanSureMetin.innerText = `${dakika}:${saniye < 10 ? '0' : ''}${saniye}`;

        // Süre bittiğinde
        if (toplamSaniye <= 0) {
            clearInterval(sayacInterval);
            alert("Süre doldu! Sınavınız otomatik olarak sonlandırılıyor.");
            // Burada testi bitirip sonuç ekranına atacak fonksiyonu çağıracağız
        }
    }, 1000);
}

export function sayaciDurdurVeGizle() {
    clearInterval(sayacInterval);
    const sayacAlani = document.getElementById('denemeSayacAlani');
    if(sayacAlani) sayacAlani.style.display = 'none';
}

document.getElementById('arkaplanRenkSecici').addEventListener('input', function(e) {
    const secilenRenk = e.target.value;
    document.body.style.backgroundColor = secilenRenk;
    // Kartların arka planı da aynı veya bir ton açığı/koyusu olabilir
    document.documentElement.style.setProperty('--card-bg-color', secilenRenk); 
});

document.getElementById('yaziRenkSecici').addEventListener('input', function(e) {
    const secilenYaziRengi = e.target.value;
    document.body.style.color = secilenYaziRengi;
    document.documentElement.style.setProperty('--main-text-color', secilenYaziRengi);
});

const btnHata = document.getElementById('btnHataSekmesi');
const btnAnaliz = document.getElementById('btnAnalizSekmesi');
const alanHata = document.getElementById('hataBildirimAlani');
const alanAnaliz = document.getElementById('soruAnalizAlani');

if (btnHata && btnAnaliz) {
    btnHata.addEventListener('click', () => {
        // Hata sekmesine 'active' ve dolu kırmızı ekle, diğerini outline yap
        btnHata.className = 'btn btn-danger fw-bold active';
        btnAnaliz.className = 'btn btn-outline-danger fw-bold';
        
        alanHata.style.display = 'block';
        alanAnaliz.style.display = 'none';
    });

    btnAnaliz.addEventListener('click', () => {
        // Analiz sekmesine 'active' ve dolu kırmızı ekle, diğerini outline yap
        btnAnaliz.className = 'btn btn-danger fw-bold active';
        btnHata.className = 'btn btn-outline-danger fw-bold';
        
        alanAnaliz.style.display = 'flex'; 
        alanHata.style.display = 'none';
    });
}