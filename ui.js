import { store } from './store.js';
import { KONULAR, KONU_ID_CEVIRMENI, TERS_KONU_CEVIRMENI } from './constants.js';
import { soruGetirVeyaUret, denemeSinaviniHazirla } from './quiz.js';
import { getSavedQuestions, removeSavedQuestion, oncekiCozumDurumunuGetir } from './storage.js';

let sayacInterval;

export function sayaciBaslat() {
    let toplamSaniye = 130 * 60; // 130 dakika
    const sayacAlani = document.getElementById('denemeSayacAlani');
    const kalanSureMetin = document.getElementById('kalanSure');
    
    if(sayacAlani) sayacAlani.style.display = 'block';
    clearInterval(sayacInterval); 

    sayacInterval = setInterval(() => {
        toplamSaniye--;
        
        let dakika = Math.floor(toplamSaniye / 60);
        let saniye = toplamSaniye % 60;
        
        kalanSureMetin.innerText = `${dakika}:${saniye < 10 ? '0' : ''}${saniye}`;

        if (toplamSaniye <= 0) {
            clearInterval(sayacInterval);
            alert("Süre doldu! Kalemleri bırakın :) Sınavınız otomatik olarak sonlandırılıyor.");
            sinavSonucunuHesapla()
        }
    }, 1000);
}

export function sayaciDurdurVeGizle() {
    clearInterval(sayacInterval);
    const sayacAlani = document.getElementById('denemeSayacAlani');
    if(sayacAlani) sayacAlani.style.display = 'none';
}

export function ekranlariGizle() {
    document.getElementById('girisEkrani').style.display = 'none';
    document.getElementById('dersSecimEkrani').style.display = 'none';
    document.getElementById('testEkrani').style.display = 'none';
    document.getElementById('adminPaneli').style.display = 'none';
    document.getElementById('sonucKarnesiEkrani').style.display = 'none';

    const kayitliEkrani = document.getElementById('kayitliSorularEkrani');
    if (kayitliEkrani) kayitliEkrani.style.display = 'none';

    const konuEkrani = document.getElementById('konuSecimEkrani');
    if (konuEkrani) konuEkrani.style.display = 'none';
    
    const bbmaEkrani = document.getElementById('bbmaEkrani');
    if (bbmaEkrani) bbmaEkrani.style.display = 'none';
}

export function istatistikleriGuncelle() {
    const { soruGecmisi } = store.getState();
    let dogru = 0, yanlis = 0, bos = 0;

    soruGecmisi.forEach(s => {
        if (!s.verilenCevap) return;
        if (s.verilenCevap === 'BOS') bos++;
        else if (s.verilenCevap === s.dogruCevap) dogru++;
        else yanlis++;
    });

    const cevaplanan = dogru + yanlis + bos;
    const statEl = document.getElementById('altIstatistikler');
    if (statEl) {
        statEl.innerHTML = `Cevaplanan: <b>${cevaplanan}</b> | Doğru: <b class="stat-d">${dogru}</b> | Yanlış: <b class="stat-y">${yanlis}</b> | Boş: <b class="stat-b">${bos}</b>`;
    }
}

export function ekraniGuncelle() {
    const state = store.getState();
    if (state.aktifIndex === -1) return;

    const aktifSoru = state.soruGecmisi[state.aktifIndex];

    const puanElementi = document.getElementById('guncelPuan');
    const puanEtiketi = document.getElementById('guncelPuanEtiketi');
    if (puanElementi) puanElementi.innerText = aktifSoru.zorlukPuani;
    if (puanEtiketi) puanEtiketi.innerText = "Sorunun Zorluk Derecesi: ";

    const uzunKonuAdi = TERS_KONU_CEVIRMENI[aktifSoru.konu] || aktifSoru.konu;
    const ustBaslik = state.aktifDers === 'Deneme' ? `DENEME - ${aktifSoru.ders} (${uzunKonuAdi})` : `${aktifSoru.ders} - ${uzunKonuAdi}`;
    document.querySelector('.ders-bilgisi').innerText = ustBaslik;

    const gecmisDurum = oncekiCozumDurumunuGetir(aktifSoru.id);
    let uyariGorseli = '';
    
    if (gecmisDurum) {
        let badgeSinifi = gecmisDurum === 'dogru' ? 'bg-success' : (gecmisDurum === 'BOS' ? 'bg-warning text-dark' : 'bg-danger');
        let mesaj = gecmisDurum === 'dogru' ? 'DOĞRU' : (gecmisDurum === 'BOS' ? 'BOŞ' : 'YANLIŞ');
        uyariGorseli = `
            <div class="text-center mb-3 fade-in">
                <span class="badge ${badgeSinifi} px-3 py-2 shadow-sm rounded-pill" style="font-size: 0.85rem;">
                    <i class="bi bi-clock-history"></i> Bu soruyu daha önce <b>${mesaj}</b> yapmıştın.
                </span>
            </div>
        `;
    }

    let soruIcerigi = uyariGorseli + aktifSoru.soruMetni
        .split(' ')
        .map(kelime => `<span class="tiklanabilir-kelime">${kelime}</span>`)
        .join(' ');

    if (aktifSoru.gorsel) { 
        soruIcerigi += `
            <div class="text-center mt-3 mb-2 fade-in">
                <img src="${aktifSoru.gorsel}" alt="Soru Görseli" class="img-fluid rounded shadow-sm" style="max-height: 700px; width: 100%; object-fit: contain;" />
            </div>
        `;
    } else if (aktifSoru.gorsel_svg) {
        soruIcerigi += `
            <div class="text-center mt-3 mb-2 fade-in" style="max-width: 300px; margin: auto;">
                ${aktifSoru.gorsel_svg}
            </div>
        `;
    }

    document.getElementById('soruMetni').innerHTML = soruIcerigi;
    
    const sonucMetni = document.getElementById('sonucMetni');
    const butonlar = document.querySelectorAll('.secenek-btn');
    const temizleBtn = document.getElementById('temizleBtn');
    const bosBirakBtn = document.getElementById('bosBirakBtn');
    
    sonucMetni.innerText = "";
    sonucMetni.className = "sonuc-metni";
    const zorlukBilgiEl = document.getElementById('zorlukBilgisi');
    if(zorlukBilgiEl) zorlukBilgiEl.style.visibility = 'hidden';
    
    temizleBtn.disabled = true;
    if(bosBirakBtn) bosBirakBtn.disabled = false;

    butonlar.forEach(btn => {
        const sikHarfi = btn.getAttribute('data-secenek');
        if (aktifSoru.secenekler && aktifSoru.secenekler[sikHarfi]) {
            btn.innerText = aktifSoru.secenekler[sikHarfi]; 
            btn.style.display = 'inline-block';
        } else {
            btn.style.display = 'none';
        }
        btn.className = 'secenek-btn';
        btn.disabled = false;
    });

    if (aktifSoru.verilenCevap) {
        butonlar.forEach(btn => btn.disabled = true);
        temizleBtn.disabled = false;
        if(bosBirakBtn) bosBirakBtn.disabled = true;

        if (aktifSoru.verilenCevap === 'BOS') {
            sonucMetni.innerText = "BOŞ BIRAKILDI";
            sonucMetni.classList.add('yazi-bos');
            butonlar.forEach(btn => {
                if (btn.getAttribute('data-secenek') === aktifSoru.dogruCevap) {
                    btn.classList.add('dogru');
                }
            });
        } else if (aktifSoru.verilenCevap === aktifSoru.dogruCevap) {
            sonucMetni.innerText = "DOĞRU!";
            sonucMetni.classList.add('yazi-dogru');
            butonlar.forEach(btn => { if (btn.getAttribute('data-secenek') === aktifSoru.dogruCevap) btn.classList.add('dogru'); });
        } else {
            sonucMetni.innerText = "YANLIŞ!";
            sonucMetni.classList.add('yazi-yanlis');
            butonlar.forEach(btn => {
                if (btn.getAttribute('data-secenek') === aktifSoru.verilenCevap) btn.classList.add('yanlis');
                if (btn.getAttribute('data-secenek') === aktifSoru.dogruCevap) btn.classList.add('dogru');
            });
        }
    }
    document.getElementById('geriBtn').disabled = (state.aktifIndex === 0);
    
    const kaydetBtn = document.getElementById('kaydetBtn');
    if (kaydetBtn) {
        const kaydedilenler = getSavedQuestions();
        const dahaOnceKaydedilmisMi = kaydedilenler.some(s => String(s.id) === String(aktifSoru.id));
        
        if (dahaOnceKaydedilmisMi) {
            kaydetBtn.innerHTML = `<i class="bi bi-bookmark-check-fill"></i> Kaydedildi`;
            kaydetBtn.disabled = false;
            kaydetBtn.classList.replace('btn-warning', 'btn-success');
        } else {
            kaydetBtn.innerHTML = `<i class="bi bi-bookmark-plus"></i> Soruyu Kaydet`;
            kaydetBtn.disabled = false;
            kaydetBtn.classList.replace('btn-success', 'btn-warning');
        }
    }
    istatistikleriGuncelle();
}

export function adminTablosunuDoldur() {
    const itirazlar = store.getState().itirazlar;
    const listeDiv = document.getElementById('itirazListesi');
    if (itirazlar.length === 0) { listeDiv.innerHTML = "<p>Şu an için kaydedilmiş hata bildirimi yok.</p>"; return; }
    let html = `<table><thead><tr><th>Tarih</th><th>Soru ID</th><th>Ders / Konu</th><th>Not</th><th>İşlem</th></tr></thead><tbody>`;
    itirazlar.forEach(i => html += `<tr><td>${i.tarih}</td><td>${i.soruId}</td><td>${i.ders} - ${i.konu}</td><td>${i.adayNotu}</td><td><button onclick="itirazSil('${i.id}')">Sil</button></td></tr>`);
    listeDiv.innerHTML = html + `</tbody></table>`;
}

export function geriDersSecime() {
    ekranlariGizle();
    document.getElementById('dersSecimEkrani').style.display = 'block';
}

export function geriKonuSecime() {
    ekranlariGizle();
    const konuEkrani = document.getElementById('konuSecimEkrani');
    if (konuEkrani) {
        konuEkrani.style.display = 'block';
    }
}

export function testiBaslat(dersAdi, konuAdi = null, bbmaGecildi = false) { 
    document.getElementById('siteLogosu').style.display = 'none';
    const konular = KONULAR[dersAdi] || [];
    
    if (!konuAdi && konular.length > 0 && dersAdi !== 'Deneme') {
        ekranlariGizle();
        let konuEkrani = document.getElementById('konuSecimEkrani');
        
        if (!konuEkrani) {
            konuEkrani = document.createElement('div');
            konuEkrani.id = 'konuSecimEkrani';
            konuEkrani.className = 'card shadow-sm border-0 rounded-4 w-100 fade-in';
            konuEkrani.style.maxWidth = '800px';
            document.body.appendChild(konuEkrani);
        }

        const dersIsmiGosterim = dersAdi === 'cografya' ? 'COĞRAFYA' : dersAdi.toUpperCase();

        let html = `
            <div class="card-body p-4 p-md-5">
                <h4 class="fw-bold text-primary mb-3">${dersIsmiGosterim} - Konu Seçimi</h4>
                <p class="text-muted mb-4">Lütfen ağırlık vermek istediğiniz konuyu seçin veya karışık ilerleyin.</p>
                <button class="btn btn-success w-100 py-3 mb-4 rounded-3 fw-bold shadow-sm hover-lift" onclick="testiBaslat('${dersAdi}', 'TUM_KONULAR')">
                    <i class="bi bi-shuffle me-2"></i> Tüm Konulardan Karışık Çöz
                </button>
                <div class="row g-2">
        `;

        const state = store.getState();
        const tumSorular = state.sorular;

        konular.forEach(konu => {
            const guvenliKonu = konu.replace(/'/g, "\\'");
            const kisaKonuKodu = KONU_ID_CEVIRMENI[konu] || konu; 
            
            // 2. Filtrelemeyi artık bu kısa koda göre yap
            const konuSoruSayisi = tumSorular.filter(s => s.ders === dersAdi && s.konu === kisaKonuKodu).length;
            html += `
                <div class="col-6 col-md-4">
                    <button title="${konuSoruSayisi} soru içerir" class="btn btn-outline-secondary w-100 h-100 p-2 rounded-3 text-break hover-lift" style="font-size: 0.9em; font-weight: 500;" onclick="testiBaslat('${dersAdi}', '${guvenliKonu}')">${konu}</button>
                </div>`;
        });

        html += `
                </div>
                <div class="mt-4 pt-3 border-top text-center">
                    <button class="btn btn-danger px-4 rounded-3 fw-bold shadow-sm" onclick="geriDersSecime()">
                        <i class="bi bi-arrow-left"></i> İptal / Geri
                    </button>
                </div>
            </div>
        `;

        konuEkrani.innerHTML = html;
        konuEkrani.style.display = 'block';
        return; 
    }

    const secilenKonu = (konuAdi === 'TUM_KONULAR') ? null : konuAdi;

    if (konuAdi && konuAdi !== 'TUM_KONULAR' && dersAdi !== 'Deneme' && !bbmaGecildi) {
        bbmaEkraniniGoster(dersAdi, secilenKonu);
        return; 
    }
    
    if (dersAdi === 'Deneme') {
        denemeSinaviniHazirla();
        sayaciBaslat(); 
    } else {
        sayaciDurdurVeGizle(); 
    }

    const kisaKonuID = secilenKonu ? (KONU_ID_CEVIRMENI[secilenKonu] || secilenKonu) : null;

    store.dispatch({ type: 'DERS_SEC', payload: { ders: dersAdi, konu: kisaKonuID } }); 
    ekranlariGizle(); 
    document.getElementById('testEkrani').style.display = 'block'; 
    soruGetirVeyaUret();
}

export function kayitliSorulariGoster() {
    ekranlariGizle();
    const ekran = document.getElementById('kayitliSorularEkrani');
    const liste = document.getElementById('kayitliSorularListesi');
    const sorular = getSavedQuestions();

    if (sorular.length === 0) {
        liste.innerHTML = `<div class="col-12"><div class="alert alert-info text-center py-4"><i class="bi bi-info-circle fs-3 d-block mb-2"></i> Henüz daha sonra incelemek için kaydettiğiniz bir soru bulunmuyor.</div></div>`;
    } else {
        let html = '';
        sorular.forEach(soru => {
            html += `
                <div class="col-12 col-lg-6">
                    <div class="card h-100 border-info shadow-sm">
                        <div class="card-header bg-light text-primary fw-bold text-uppercase" style="font-size: 0.85rem;">
                            ${soru.ders} - ${soru.konu}
                        </div>
                        <div class="card-body">
                           <div class="mb-3">
                                ${soru.soruMetni}
                                ${soru.gorsel ? `<div class="text-center mt-2"><img src="${soru.gorsel}" class="img-fluid rounded border" style="max-height: 200px;"></div>` : ''}
                                ${soru.gorsel_svg ? `<div class="text-center mt-2" style="max-width: 250px; margin: auto;">${soru.gorsel_svg}</div>` : ''}
                            </div>
                            <div class="p-2 rounded bg-success-subtle border border-success">
                                <span class="fw-bold text-success"><i class="bi bi-check-circle-fill"></i> Doğru Cevap: ${soru.dogruCevap}</span>
                                <br> ${soru.secenekler[soru.dogruCevap]}
                            </div>
                        </div>
                        <div class="card-footer bg-transparent border-top-0 pt-0">
                            <button class="btn btn-outline-danger w-100 btn-sm fw-bold" onclick="kayitliSoruyuSil('${soru.id}')">
                                <i class="bi bi-trash3"></i> Listeden Çıkar (Öğrendim)
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        liste.innerHTML = html;
    }
    ekran.style.display = 'block';
}

export function kayitliSoruyuSil(id) {
    if(confirm("Bu soruyu listeden çıkarmak istiyor musunuz?")) {
        removeSavedQuestion(id);
        kayitliSorulariGoster(); 
    }
}

export function haftalikGrafigiCiz(otomatikYukleme = false, canvasId = 'benimGrafigimAna', containerId = 'grafikAlaniAna') {
    const veriler = JSON.parse(localStorage.getItem('haftalikCozumler')) || [];
    
    if (veriler.length === 0) {
        if (!otomatikYukleme) {
            alert("Grafik oluşturulabilmesi için henüz yeterli soru çözmediniz. Lütfen birkaç soru cevapladıktan sonra tekrar deneyin.");
        }
        document.getElementById(containerId).style.display = 'none';
        return;
    }

    const gunlukToplamlar = {};

    veriler.forEach(kayit => {
        const tarih = new Date(kayit.tarih);
        const gunEtiketi = tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

        if (!gunlukToplamlar[gunEtiketi]) {
            gunlukToplamlar[gunEtiketi] = { dogru: 0, yanlis: 0 };
        }

        const durum = kayit.durum || kayit.sonuc || (typeof kayit.cevap === 'string' ? kayit.cevap : null);
        
        if (durum === 'dogru') {
            gunlukToplamlar[gunEtiketi].dogru++;
        } else if (durum === 'yanlis') {
            gunlukToplamlar[gunEtiketi].yanlis++;
        } else {
            gunlukToplamlar[gunEtiketi].dogru++;
        }
    });

    const etiketler = Object.keys(gunlukToplamlar); 
    const dogrular = etiketler.map(etiket => gunlukToplamlar[etiket].dogru);
    const yanlislar = etiketler.map(etiket => gunlukToplamlar[etiket].yanlis);

    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const chartName = canvasId + 'Chart';
    if(window[chartName]) window[chartName].destroy();

    window[chartName] = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: etiketler,
            datasets: [
                {
                    label: 'Doğru',
                    data: dogrular,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: 'Yanlış',
                    data: yanlislar,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    borderRadius: 3
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false, 
            scales: {
                x: { stacked: true, beginAtZero: true, title: { display: true, text: 'Soru Sayısı' } },
                y: { stacked: true }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const toplam = dogrular[index] + yanlislar[index];
                            return '\nToplam Çözülen: ' + toplam;
                        }
                    }
                }
            },
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const tiklananTarih = etiketler[index];
                    
                    if(document.getElementById('detayGrafigiAna')) {
                        detayGrafigiCiz(tiklananTarih); 
                    }
                }
            }
        }
    });

    document.getElementById(containerId).style.display = 'block';

    if (canvasId === 'benimGrafigimAna' && document.getElementById('detayGrafigiAna')) {
        detayGrafigiCiz();
    }
}

export async function bbmaEkraniniGoster(dersAdi, konuAdi) {
    ekranlariGizle();
    const bbmaEkrani = document.getElementById('bbmaEkrani');
    const kelimeListesiDiv = document.getElementById('bbmaKelimeListesi');
    const baslaBtn = document.getElementById('bbmaTestiBaslatBtn');
    
    kelimeListesiDiv.innerHTML = '<div class="spinner-border text-info" role="status"></div>';
    bbmaEkrani.style.display = 'block';

    try {
        const response = await fetch(`./data/kavramlar/bbma_${dersAdi}.json`);
        const data = await response.json();
        
        const guvenliKonuID = KONU_ID_CEVIRMENI[konuAdi] || konuAdi; 
        const konuKavramlari = data[guvenliKonuID]; 

        if (konuKavramlari) {
            kelimeListesiDiv.innerHTML = '';
            Object.keys(konuKavramlari).forEach(kelime => {
                const btn = document.createElement('button');
                btn.className = 'bbma-btn';
                btn.innerText = kelime;
                btn.onclick = () => hazirCevabiGoster(kelime, konuKavramlari[kelime]);
                kelimeListesiDiv.appendChild(btn);
            });
        } else {
            kelimeListesiDiv.innerHTML = '<p class="text-muted">Bu konu için henüz ısınma kavramları eklenmemiş.</p>';
        }
    } catch (error) {
        console.error("BBMA Hatası:", error);
    }

    baslaBtn.onclick = () => testiBaslat(dersAdi, konuAdi, true);
}

export function hazirCevabiGoster(kelime, aciklama) {
    const modal = document.getElementById('kavramModali');
    const arananKelimeBaslik = document.getElementById('kavramArananKelime');
    const cevapAlani = document.getElementById('kavramCevapAlani');

    arananKelimeBaslik.innerText = `"${kelime}"`;
    cevapAlani.innerHTML = `<div class="p-3 bg-light rounded shadow-sm border-start border-info border-4">${aciklama}</div>`;
    modal.style.display = 'flex';
}

export function detayGrafigiCiz(secilenTarih = null, secilenDers = null) {
    const veriler = JSON.parse(localStorage.getItem('haftalikCozumler')) || [];
    if (veriler.length === 0) return;

    let filtrelenmisVeriler = veriler;
    let baslik = "Tüm Zamanlar - Genel Dağılım";
    let gruplamaAnahtari = 'ders'; 

    if (secilenTarih) {
        filtrelenmisVeriler = veriler.filter(kayit => {
            const tarih = new Date(kayit.tarih);
            const gunEtiketi = tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            return gunEtiketi === secilenTarih;
        });
        baslik = `${secilenTarih} - Ders Dağılımı`;
    }

    if (secilenDers) {
        filtrelenmisVeriler = filtrelenmisVeriler.filter(k => k.ders === secilenDers);
        baslik = secilenTarih ? `${secilenTarih} - ${secilenDers.toUpperCase()} Konuları` : `Tüm Zamanlar - ${secilenDers.toUpperCase()} Konuları`;
        gruplamaAnahtari = 'konu';
    }

    const istatistikler = {};
    filtrelenmisVeriler.forEach(kayit => {
        const anahtar = kayit[gruplamaAnahtari] || 'Belirtilmemiş';
        if (!istatistikler[anahtar]) istatistikler[anahtar] = { dogru: 0, yanlis: 0 };
        
        const durum = kayit.durum || (typeof kayit.cevap === 'string' ? kayit.cevap : 'dogru');
        if (durum === 'dogru') istatistikler[anahtar].dogru++;
        else if (durum === 'yanlis') istatistikler[anahtar].yanlis++;
        else istatistikler[anahtar].dogru++; 
    });

    const etiketler = Object.keys(istatistikler);
    const dogrular = etiketler.map(e => istatistikler[e].dogru);
    const yanlislar = etiketler.map(e => istatistikler[e].yanlis);

    const geriBtn = document.getElementById('detayGeriBtn');
    if (geriBtn) {
        if (secilenDers) {
            geriBtn.style.display = 'inline-block';
            geriBtn.onclick = () => detayGrafigiCiz(secilenTarih, null);
        } else if (secilenTarih) {
            geriBtn.style.display = 'inline-block';
            geriBtn.onclick = () => detayGrafigiCiz(null, null);
        } else {
            geriBtn.style.display = 'none';
        }
    }

    const baslikElementi = document.getElementById('detayGrafikBaslik');
    if(baslikElementi) baslikElementi.innerText = baslik;

    const canvas = document.getElementById('detayGrafigiAna');
    if (!canvas) return; 
    const ctx = canvas.getContext('2d');
    
    if (window.detayChart) window.detayChart.destroy();

    window.detayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiketler,
            datasets: [
                {
                    label: 'Doğru',
                    data: dogrular,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    borderRadius: 3
                },
                {
                    label: 'Yanlış',
                    data: yanlislar,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    borderRadius: 3
                }
            ]
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, beginAtZero: true },
                y: { stacked: true }
            },
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const tiklananIndex = activeElements[0].index;
                    const tiklananDeger = etiketler[tiklananIndex];
                    
                    if (!secilenDers && tiklananDeger !== 'Belirtilmemiş') {
                        detayGrafigiCiz(secilenTarih, tiklananDeger);
                    }
                }
            }
        }
    });
}

export function sinavSonucunuHesapla() {
    sayaciDurdurVeGizle(); 
    
    const state = store.getState();
    const sorular = state.soruGecmisi;

    const sonuclar = {
        turkce: { ad: "Türkçe", d: 0, y: 0, b: 0 },
        matematik: { ad: "Matematik", d: 0, y: 0, b: 0 },
        tarih: { ad: "Tarih", d: 0, y: 0, b: 0 },
        cografya: { ad: "Coğrafya", d: 0, y: 0, b: 0 },
        vatandaslik: { ad: "Vatandaşlık", d: 0, y: 0, b: 0 },
        guncel: { ad: "Güncel Bilgiler", d: 0, y: 0, b: 0 }
    };

    let toplamD = 0, toplamY = 0, toplamB = 0;

    sorular.forEach(s => {
        if (!s.verilenCevap || s.verilenCevap === 'BOS') {
            if(sonuclar[s.ders]) sonuclar[s.ders].b++;
            toplamB++;
        } else if (s.verilenCevap === s.dogruCevap) {
            if(sonuclar[s.ders]) sonuclar[s.ders].d++;
            toplamD++;
        } else {
            if(sonuclar[s.ders]) sonuclar[s.ders].y++;
            toplamY++;
        }
    });

    let html = '';
    let gyNet = 0; 
    let gkNet = 0; 

    for (let ders in sonuclar) {
        let net = sonuclar[ders].d - (sonuclar[ders].y / 4);
        if (net < 0) net = 0; 

        if (ders === 'turkce' || ders === 'matematik') {
            gyNet += net;
        } else {
            gkNet += net;
        }

        html += `
            <tr>
                <td class="text-start fw-bold text-secondary">${sonuclar[ders].ad}</td>
                <td class="text-success fw-medium">${sonuclar[ders].d}</td>
                <td class="text-danger fw-medium">${sonuclar[ders].y}</td>
                <td class="text-warning text-dark fw-medium">${sonuclar[ders].b}</td>
                <td class="fw-bold">${net.toFixed(2)}</td>
            </tr>
        `;
    }

    const toplamNet = toplamD - (toplamY / 4);

    document.getElementById('karneTablosuGövdesi').innerHTML = html;
    document.getElementById('karneToplamDogru').innerText = toplamD;
    document.getElementById('karneToplamYanlis').innerText = toplamY;
    document.getElementById('karneToplamBos').innerText = toplamB;
    document.getElementById('karneToplamNet').innerText = toplamNet > 0 ? toplamNet.toFixed(2) : "0.00";

    let tahminiPuan = 0;
    if(toplamNet > 0) {
        tahminiPuan = 50 + (gyNet * 0.44) + (gkNet * 0.38); 
        if(tahminiPuan > 100) tahminiPuan = 100; 
    }

    document.getElementById('tahminiPuan').innerText = tahminiPuan.toFixed(3);

    ekranlariGizle();
    document.getElementById('sonucKarnesiEkrani').style.display = 'block';
}

window.sinavSonucunuHesapla = sinavSonucunuHesapla;

// ui.js dosyasına eklenecekler

export function adminSoruAnalizPaneliniKur() {
    const accordionContainer = document.getElementById('dersAccordion');
    if (!accordionContainer) return;

    // YENİ EKLENEN: Ders ID'lerini Türkçe ve büyük harfli ekrana yansıtmak için
    const DERS_ADLARI = {
        turkce: "TÜRKÇE",
        matematik: "MATEMATİK",
        tarih: "TARİH",
        cografya: "COĞRAFYA",
        vatandaslik: "VATANDAŞLIK",
        guncel: "GÜNCEL BİLGİLER"
    };

    let html = '';
    let accordionIndex = 0;

    for (const ders in KONULAR) {
        const konular = KONULAR[ders];
        
        // DEĞİŞEN KISIM: Çeviriden bul, bulamazsan normal büyült
        const dersBaslik = DERS_ADLARI[ders] || ders.toUpperCase(); 
        
        html += `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading${accordionIndex}">
                <button class="accordion-button collapsed fw-bold text-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${accordionIndex}">
                    ${dersBaslik}
                </button>
            </h2>
            <div id="collapse${accordionIndex}" class="accordion-collapse collapse" data-bs-parent="#dersAccordion">
                <div class="accordion-body p-0">
                    <div class="list-group list-group-flush">
        `;

        konular.forEach(konu => {
            const kisaKonuId = KONU_ID_CEVIRMENI[konu] || konu;
            html += `<button class="list-group-item list-group-item-action analiz-konu-btn" style="font-size: 0.85em;" data-ders="${ders}" data-konu="${kisaKonuId}">${konu}</button>`;
        });

        html += `
                    </div>
                </div>
            </div>
        </div>`;
        accordionIndex++;
    }

    accordionContainer.innerHTML = html;

    // Tıklama olayları kısmı aynı kalacak...
    document.querySelectorAll('.analiz-konu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.analiz-konu-btn').forEach(b => b.classList.remove('active', 'bg-primary', 'text-white'));
            e.target.classList.add('active', 'bg-primary', 'text-white');

            const secilenDers = e.target.getAttribute('data-ders');
            const secilenKonu = e.target.getAttribute('data-konu');
            analizGridiniDoldur(secilenDers, secilenKonu);
        });
    });
}

export function analizGridiniDoldur(ders, konuId) {
    const tumSorular = store.getState().sorular;
    const filtrelenmis = tumSorular.filter(s => s.ders === ders && s.konu === konuId);
    const gridContainer = document.getElementById('analizGrid');

    if (filtrelenmis.length === 0) {
        gridContainer.innerHTML = `<div class="col-12"><div class="alert alert-warning shadow-sm"><i class="bi bi-exclamation-triangle"></i> Bu konuya ait henüz sisteme yüklenmiş bir soru bulunmuyor. Notlarınıza göre yeni sorular üretebilirsiniz.</div></div>`;
        return;
    }

    let html = '';
    filtrelenmis.forEach((soru, index) => {
    let seceneklerHtml = '';
        if(soru.secenekler) {
            for(const [harf, metin] of Object.entries(soru.secenekler)) {
                const isDogru = harf === soru.dogruCevap;
                
                // Şıkkın kendi içindeki "A) ", "B. ", "C-" gibi yapıları temizliyoruz
                const regex = new RegExp(`^${harf}[\\)\\-\\. ]\\s*`, 'i');
                const temizMetin = metin.replace(regex, '');
                
                // Kendi formatımızı (Harf + Temiz Metin) basıyoruz
                seceneklerHtml += `
                <div class="analiz-secenek ${isDogru ? 'text-success fw-bold' : 'text-muted'}">
                    <span class="fw-bold text-dark me-1">${harf})</span>${temizMetin}
                </div>`;
            }
        }

        html += `
        <div class="col fade-in">
            <div class="card h-100 analiz-soru-kart p-3 rounded-3">
                <div class="d-flex justify-content-between align-items-start mb-2 border-bottom pb-2">
                    <span class="fw-bold text-dark">Soru ${index + 1}</span>
                    <span class="badge bg-secondary user-select-all" style="font-size:0.65rem;" title="Kopyalamak için tıkla">${soru.id}</span>
                </div>
                <div class="mb-3" style="font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap;">${soru.soruMetni}</div>
                ${soru.gorsel ? `<div class="text-center mb-2"><img src="${soru.gorsel}" class="img-fluid rounded" style="max-height:120px;"></div>` : ''}
                <div class="mt-auto bg-light p-2 rounded border">
                    ${seceneklerHtml}
                </div>
            </div>
        </div>`;
    });

    gridContainer.innerHTML = html;
}