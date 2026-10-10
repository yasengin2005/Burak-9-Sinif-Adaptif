export const getSavedClaims = () => JSON.parse(localStorage.getItem('kpss_itirazlar')) || [];
export const getSavedTheme = () => localStorage.getItem('kpss_tema') || 'light';
export const getSavedBgColor = () => localStorage.getItem('kpss_arkaplan_rengi');
export const saveTheme = (theme) => localStorage.setItem('kpss_tema', theme);
export const saveBgColor = (color) => localStorage.setItem('kpss_arkaplan_rengi', color);

export function gunlukIstatistikleriAl() {
    const bugun = new Date().toLocaleDateString('tr-TR');
    let kayit = JSON.parse(localStorage.getItem('kpss_gunluk_istatistik'));
    
    if (!kayit || kayit.tarih !== bugun) {
        kayit = { tarih: bugun, dogru: 0, yanlis: 0 };
        localStorage.setItem('kpss_gunluk_istatistik', JSON.stringify(kayit));
    }
    return kayit;
}

export function gunlukPaneliGuncelle() {
    // Mevcut güncel istatistikleri storage'dan al
    const gunluk = JSON.parse(localStorage.getItem('kpss_gunluk_istatistik')) || { dogru: 0, yanlis: 0 };
    
    const dogruEl = document.getElementById('gunlukDogru');
    const yanlisEl = document.getElementById('gunlukYanlis');
    const toplamEl = document.getElementById('gunlukToplam'); // Yeni eklediğimiz span

    // Verileri HTML elemanlarına yazdır
    if (dogruEl) dogruEl.innerText = gunluk.dogru + ' D';
    if (yanlisEl) yanlisEl.innerText = gunluk.yanlis + ' Y';
    
    // Toplam soru sayısını hesapla ve ekrana bas
    if (toplamEl) {
        toplamEl.innerText = gunluk.dogru + gunluk.yanlis;
    }
}


// Kayıtlı soruları getir
export const getSavedQuestions = () => {
    return JSON.parse(localStorage.getItem('kpss_kaydedilen_sorular')) || [];
};

// Yeni soruyu kaydet (Aynı soru daha önce eklendiyse tekrar eklemez)
export const saveQuestion = (soruObj) => {
    const saved = getSavedQuestions();
    const isAlreadySaved = saved.some(s => String(s.id) === String(soruObj.id));
    
    if (!isAlreadySaved) {
        saved.push(soruObj);
        localStorage.setItem('kpss_kaydedilen_sorular', JSON.stringify(saved));
    }
};
// Kayıtlı soruyu sil
export const removeSavedQuestion = (id) => {
    let saved = getSavedQuestions();
    saved = saved.filter(s => String(s.id) !== String(id));
    localStorage.setItem('kpss_kaydedilen_sorular', JSON.stringify(saved));
};

export function cozumuTarihleKaydet(durum, ders, konu) {
    let gecmis = JSON.parse(localStorage.getItem('haftalikCozumler')) || [];
    gecmis.push({
        tarih: new Date().toISOString(),
        durum: durum,
        ders: ders || 'Belirtilmemiş',
        konu: konu || 'Belirtilmemiş'
    });
    localStorage.setItem('haftalikCozumler', JSON.stringify(gecmis));
}

// storage.js içine eklenecek
export function sureyiKaydet(saniye) {
    const bugun = new Date().toLocaleDateString('tr-TR');
    const veri = JSON.parse(localStorage.getItem('kpss_gunluk_sure')) || { tarih: bugun, toplamSaniye: 0 };
    
    // Eğer tarih değiştiyse sıfırla
    if (veri.tarih !== bugun) {
        veri.tarih = bugun;
        veri.toplamSaniye = saniye;
    } else {
        veri.toplamSaniye += saniye;
    }
    localStorage.setItem('kpss_gunluk_sure', JSON.stringify(veri));
}

export function getGunlukSure() {
    const bugun = new Date().toLocaleDateString('tr-TR');
    const veri = JSON.parse(localStorage.getItem('kpss_gunluk_sure'));
    return (veri && veri.tarih === bugun) ? veri.toplamSaniye : 0;
}

// Sorunun sadece ID'sini ve son durumunu kaydeder (Çok az yer kaplar)
export function soruyuHafifKaydet(soruId, durum) {
    // durum: 'dogru', 'yanlis' veya 'BOS' olmalı
    let gecmis = JSON.parse(localStorage.getItem('basitSoruGecmisi')) || {};
    gecmis[soruId] = durum;
    localStorage.setItem('basitSoruGecmisi', JSON.stringify(gecmis));
}

// O sorunun daha önce çözülüp çözülmediğini döndürür
export function oncekiCozumDurumunuGetir(soruId) {
    let gecmis = JSON.parse(localStorage.getItem('basitSoruGecmisi')) || {};
    return gecmis[soruId] || null;
}