const fs = require('fs');

const YENI_SORULAR_DOSYASI = 'yeni_sorular.json';

const KONU_ID_CEVIRMENI = {
  "İslamiyet Öncesi Türk Tarihi": "iott",
  "İlk Türk-İslam Devletleri ve Beylikleri": "itidb",
  "Osmanlı Devleti Kuruluş ve Yükselme Dönemi": "osm_kurulus",
  // ... (diğer tüm konular)
  "Küreselleşen Dünya": "kuresel"
};

// Rastgele ID üreten fonksiyon
function rastgeleIdUret(ders) {
    const kisaDersKodu = ders ? ders.substring(0, 3).toUpperCase() : 'MIX';
    const rastgeleKisim = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${kisaDersKodu}_${rastgeleKisim}`;
}

// 🧹 REFERANS TEMİZLEYİCİ REGEX FONKSİYONU
function referanslariTemizle(metin) {
    if (typeof metin !== 'string') return metin;
    
    // Açılış köşeli parantezi, 'cite:' yazısı ve kapanış parantezi arasındaki her şeyi yok eder.
    // [^\]]* kısmı "kapanış parantezi olmayan her şey" demektir.
    let temizMetin = metin.replace(/\s*\[\s*cite:[^\]]*\]/gi, '');
    
    // Fazladan kalan çift boşlukları teke indirip kenarları kırpar
    return temizMetin.replace(/\s{2,}/g, ' ').trim();
}

function aktarimiBaslat() {
    console.log("📥 Gelen Kutusu (yeni_sorular.json) okunuyor...\n");

    // 1. Gelen kutusu dosyasını kontrol et
    if (!fs.existsSync(YENI_SORULAR_DOSYASI)) {
        fs.writeFileSync(YENI_SORULAR_DOSYASI, '[]', 'utf-8');
        console.log(`⚠️ ${YENI_SORULAR_DOSYASI} bulunamadı, senin için boş bir tane oluşturdum.`);
        console.log("Lütfen NotebookLM'den aldığın soruları bu dosyanın içine yapıştırıp tekrar çalıştır.");
        return;
    }

    let yeniSorular;
    try {
        const dosyaIcerigi = fs.readFileSync(YENI_SORULAR_DOSYASI, 'utf-8').trim();
        yeniSorular = dosyaIcerigi ? JSON.parse(dosyaIcerigi) : [];
    } catch (e) {
        console.log(`❌ ${YENI_SORULAR_DOSYASI} okunurken hata oluştu. JSON formatı bozuk (Muhtemelen kopyalarken virgül hatası oldu).`);
        return;
    }

    if (!Array.isArray(yeniSorular) || yeniSorular.length === 0) {
        console.log("ℹ️ Gelen kutusu tertemiz! Eklenecek yeni soru yok.");
        return;
    }

    // 2. Yeni soruları "ders" alanına göre gruplandır
    const dersGruplari = {};
    yeniSorular.forEach(soru => {
        if (!soru.ders || !soru.soruMetni) {
            console.log(`⚠️ UYARI: 'ders' veya 'soruMetni' eksik olan bir soru atlandı.`);
            return;
        }
        const dersAdi = soru.ders.toLowerCase();
        if (!dersGruplari[dersAdi]) {
            dersGruplari[dersAdi] = [];
        }
        dersGruplari[dersAdi].push(soru);
    });

    let toplamEklenen = 0;
    let toplamAtilan = 0;

    // 3. Her ders için kendi orijinal JSON dosyasını açıp kontrol et
    for (const ders in dersGruplari) {
        const hedefDosyaAdi = `${ders}.json`;
        let mevcutSorular = [];

        if (fs.existsSync(hedefDosyaAdi)) {
            try {
                mevcutSorular = JSON.parse(fs.readFileSync(hedefDosyaAdi, 'utf-8'));
            } catch (e) {
                console.log(`❌ ${hedefDosyaAdi} dosyası okunamadı. Atlanıyor.`);
                continue;
            }
        } else {
            console.log(`ℹ️ ${hedefDosyaAdi} adında bir dosya yoktu, yeni oluşturulacak.`);
        }

        // Mevcut soruları hızlı filtreleme için bir hafızaya al
        const mevcutMetinler = new Set(mevcutSorular.map(s => s.soruMetni ? s.soruMetni.trim() : ""));
        let buDerseEklenen = 0;
        let buDerstenAtilan = 0;

        // Yeni soruları sırayla ana dosyaya entegre et
        dersGruplari[ders].forEach(yeniSoru => {
            // 🧹 Soru metnini ve seçenekleri veritabanına girmeden önce temizle
            yeniSoru.soruMetni = referanslariTemizle(yeniSoru.soruMetni);
            
            if (yeniSoru.secenekler) {
                for (const harf in yeniSoru.secenekler) {
                    yeniSoru.secenekler[harf] = referanslariTemizle(yeniSoru.secenekler[harf]);
                }
            }
            if (ders === 'tarih' && yeniSoru.konu && KONU_ID_CEVIRMENI[yeniSoru.konu]) {
                yeniSoru.konu = KONU_ID_CEVIRMENI[yeniSoru.konu];
            }

            const temizMetin = yeniSoru.soruMetni; // Zaten trimlenmiş ve temizlenmiş hâli
            
            if (mevcutMetinler.has(temizMetin)) {
                // Bu soru zaten var! Çöpe atıyoruz.
                buDerstenAtilan++;
                toplamAtilan++;
            } else {
                // Soru yepyeni! ID ver ve asıl veritabanına ekle
                yeniSoru.id = rastgeleIdUret(ders);
                mevcutSorular.push(yeniSoru);
                mevcutMetinler.add(temizMetin); // Aynı kutu içinde kendini tekrar etmişse onu da yakalar
                buDerseEklenen++;
                toplamEklenen++;
            }
        });

        // 4. Güncellenmiş listeyi orijinal ders dosyasına kaydet
        if (buDerseEklenen > 0) {
            fs.writeFileSync(hedefDosyaAdi, JSON.stringify(mevcutSorular, null, 2), 'utf-8');
            console.log(`✅ ${hedefDosyaAdi}: ${buDerseEklenen} YENİ soru eklendi. (${buDerstenAtilan} mükerrer çöpe atıldı).`);
        } else {
            console.log(`➖ ${hedefDosyaAdi}: Tüm sorular zaten ekliydi. Hiçbiri eklenmedi (${buDerstenAtilan} mükerrer çöpe atıldı).`);
        }
    }

    // 5. İşlem bitti, Gelen Kutusunu boşalt ki bir sonraki kopyalamaya hazır olsun
    fs.writeFileSync(YENI_SORULAR_DOSYASI, '[\n  \n]', 'utf-8');
    
    console.log(`\n🎉 BİTTİ! Toplam ${toplamEklenen} yeni soru başarıyla sisteme dağıtıldı.`);
    console.log(`🗑️ Seni uğraştıracak ${toplamAtilan} adet mükerrer soru anında imha edildi.`);
    console.log(`✨ 'yeni_sorular.json' dosyası referanslardan arındırıldı ve temizlendi, yeni soruları bekliyor.`);
}

aktarimiBaslat();