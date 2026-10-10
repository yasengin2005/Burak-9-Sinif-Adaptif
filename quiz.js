import { store } from './store.js';
import { KONU_ID_CEVIRMENI } from './constants.js';

export let aktifDenemePaketi = [];

export function soruGetirVeyaUret() {
    const state = store.getState();
    const { sorular, soruGecmisi, aktifIndex, aktifDers, aktifKonu, kullanilanSoruIdleri } = state;

    if (aktifDers === 'Deneme') {
        const siradakiSoru = aktifDenemePaketi[soruGecmisi.length]; 
        if (siradakiSoru) {
            store.dispatch({ type: 'YENI_SORU_EKLE', payload: siradakiSoru });
        } else {
            alert("Tebrikler! 130 Dakikalık / 120 Soruluk sınavı tamamladınız. Sonuçlar hesaplanıyor...");
            window.sinavSonucunuHesapla(); 
        }
        return; 
    }
    
    if (aktifIndex < soruGecmisi.length - 1) {
        store.dispatch({ type: 'INDEKS_GUNCELLE', payload: aktifIndex + 1 });
        return;
    }

    if (sorular.length === 0) {
        alert("Sorular henüz yüklenmedi, lütfen biraz bekleyip tekrar deneyin.");
        return;
    }

    // --- YENİ EKLENEN 120 SORULUK DENEME MANTIĞI ---
    if (aktifDers === 'Deneme') {
        // Geçmişteki soru sayısı, şu an kaçıncı soruda olduğumuzu verir (0, 1, 2... 119)
        const siradakiSoru = aktifDenemePaketi[soruGecmisi.length]; 
        
    if (siradakiSoru) {
                store.dispatch({ type: 'YENI_SORU_EKLE', payload: siradakiSoru });
            } else {
                // 120 soruluk paket bittiğinde burası çalışır
                alert("Tebrikler! 130 Dakikalık / 120 Soruluk sınavı tamamladınız. Sonuçlar hesaplanıyor...");
                
                // IMPORT YERİNE ARTIK BU ŞEKİLDE ÇAĞIRIYORUZ:
                window.sinavSonucunuHesapla(); 
            }
    }

    // NORMAL TEST VE BRANŞ DENEMELERİ (Eski Mantık)
    let havuz = sorular.filter(s => s.ders === aktifDers);

if (aktifKonu) {
    // Önce kısaltmayı bulmaya çalış, yoksa eski usul eşleşmeye devam et
    const kisaKonuAdi = KONU_ID_CEVIRMENI[aktifKonu] || aktifKonu;
    havuz = havuz.filter(s => s.konu === kisaKonuAdi || s.konu === aktifKonu);
}

    if (havuz.length === 0) {
        alert("Seçilen kriterlere (Ders/Konu) ait soru bulunamadı!");
        document.getElementById('testEkrani').style.display = 'none';
        document.getElementById('dersSecimEkrani').style.display = 'block';
        return;
    }

    let sorulmamisHavuz = havuz.filter(s => !kullanilanSoruIdleri.includes(String(s.id)));

    if (sorulmamisHavuz.length === 0) {
        alert("Tebrikler! Seçtiğiniz alandaki tüm soruları tamamladınız. Oturum baştan başlatılıyor.");
        store.dispatch({ type: 'DERS_SEC', payload: { ders: aktifDers, konu: aktifKonu } }); 
        setTimeout(() => soruGetirVeyaUret(), 100);
        return;
    }
    
    const secilenSoru = sorulmamisHavuz[Math.floor(Math.random() * sorulmamisHavuz.length)];
    store.dispatch({ type: 'YENI_SORU_EKLE', payload: secilenSoru });
}

export async function tumSorulariYukle() {
    const dersler = ['tarih', 'cografya', 'matematik', 'turkce', 'fizik', 'kimya', 'biyoloji', 'edebiyat', 'ingilizce'];
    let tumSorular = [];

    for (const ders of dersler) {
        try {
            const response = await fetch(`data/${ders}.json`);
            if (!response.ok) throw new Error(`${ders}.json bulunamadı.`);
            const sorular = await response.json();
            tumSorular = [...tumSorular, ...sorular];
            console.log(`${ders}.json yüklendi. (Soru sayısı: ${sorular.length})`);
        } catch (e) {
            console.warn(`Uyarı: ${ders}.json yüklenemedi veya boş.`, e.message);
        }
    }

    store.dispatch({ type: 'SORULARI_YUKLE', payload: tumSorular });
    console.log(`Toplam ${tumSorular.length} soru yüklendi.`);
}
// YARDIMCI FONKSİYONLAR
const rastgeleSec = (dizi, adet) => {
    const kopya = [...dizi].sort(() => 0.5 - Math.random());
    return kopya.slice(0, adet);
};

const sayiyiGarantile = (secilenler, tumDersSorulari, hedef) => {
    if (secilenler.length < hedef) {
        const eksikSayisi = hedef - secilenler.length;
        const kalanlar = tumDersSorulari.filter(s => !secilenler.some(ms => ms.id === s.id));
        secilenler.push(...rastgeleSec(kalanlar, eksikSayisi));
    }
    return secilenler.slice(0, hedef);
};

export function ozelDenemePaketiOlustur() {
    const state = store.getState();
    const tumSorular = state.sorular;
    const cozulenIdler = state.kullanilanSoruIdleri || [];

    const temizHavuz = tumSorular.filter(s => !cozulenIdler.includes(String(s.id)));
    const havuz = {
        turkce: temizHavuz.filter(s => s.ders === 'turkce'),
        matematik: temizHavuz.filter(s => s.ders === 'matematik'),
        tarih: temizHavuz.filter(s => s.ders === 'tarih'),
        cografya: temizHavuz.filter(s => s.ders === 'cografya'),
        vatandaslik: temizHavuz.filter(s => s.ders === 'vatandaslik'),
        guncel: temizHavuz.filter(s => s.ders === 'guncel')
    };

    const konulariAl = (dersDizisi) => [...new Set(dersDizisi.map(s => s.konu))];
    let denemeSorulari = [];

    // TÜRKÇE (30)
    let turkceSorular = [];
    konulariAl(havuz.turkce).forEach(konu => {
        let adet = (konu.toLowerCase().includes('paragraf') || konu.toLowerCase().includes('dil bilgisi')) ? 4 : 2;
        turkceSorular.push(...rastgeleSec(havuz.turkce.filter(s => s.konu === konu), adet));
    });
    denemeSorulari.push(...sayiyiGarantile(turkceSorular, havuz.turkce, 30));

    // MATEMATİK (30)
    let matSorular = [];
    konulariAl(havuz.matematik).filter(k => !k.toLowerCase().includes('grafik')).forEach(konu => {
        matSorular.push(...rastgeleSec(havuz.matematik.filter(s => s.konu === konu), 1));
    });
    denemeSorulari.push(...sayiyiGarantile(matSorular, havuz.matematik, 30));

    // TARİH (27)
    denemeSorulari.push(...sayiyiGarantile(rastgeleSec(havuz.tarih, 27), havuz.tarih, 27));

    // COĞRAFYA (18)
    let cogSorular = [];
    let cogKonular = konulariAl(havuz.cografya);
    if (cogKonular.length > 0) {
        cogSorular.push(...rastgeleSec(havuz.cografya.filter(s => s.konu === cogKonular[0]), 2));
        for (let i = 1; i < cogKonular.length; i++) {
            cogSorular.push(...rastgeleSec(havuz.cografya.filter(s => s.konu === cogKonular[i]), 1));
        }
    }
    denemeSorulari.push(...sayiyiGarantile(cogSorular, havuz.cografya, 18));

    // VATANDAŞLIK (9)
    let vatSorular = [];
    let vatKonular = konulariAl(havuz.vatandaslik);
    vatKonular.pop();
    vatKonular.forEach(konu => vatSorular.push(...rastgeleSec(havuz.vatandaslik.filter(s => s.konu === konu), 1)));
    denemeSorulari.push(...sayiyiGarantile(vatSorular, havuz.vatandaslik, 9));

    // GÜNCEL (6)
    let guncelSorular = [];
    rastgeleSec(konulariAl(havuz.guncel), 6).forEach(konu => {
        guncelSorular.push(...rastgeleSec(havuz.guncel.filter(s => s.konu === konu), 1));
    });
    denemeSorulari.push(...sayiyiGarantile(guncelSorular, havuz.guncel, 6));

    return denemeSorulari;
}

export function denemeSinaviniHazirla() {
    aktifDenemePaketi = ozelDenemePaketiOlustur();
}