const fs = require('fs');
const readline = require('readline');

// Terminalden girdi almak için arayüz
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisified soru sorma fonksiyonu
const soruSor = (soru) => new Promise(resolve => rl.question(soru, resolve));

// Rastgele, 6 haneli alfasayısal bir ID üreten fonksiyon
function rastgeleIdUret(ders) {
    const kisaDersKodu = ders.substring(0, 3).toUpperCase();
    const rastgeleKisim = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${kisaDersKodu}_${rastgeleKisim}`;
}

// İki metin arasındaki benzerlik oranını hesaplayan fonksiyon (%0 - %100) (Sørensen–Dice Katsayısı)
function metinBenzerlik(metin1, metin2) {
    if (!metin1 || !metin2) return 0;
    if (metin1 === metin2) return 100;

    const tokenize = (str) => {
        const bigrams = new Map();
        // Boşlukları kaldır, küçük harfe çevir
        const temiz = str.toLowerCase().replace(/\s+/g, '');
        for (let i = 0; i < temiz.length - 1; i++) {
            const bg = temiz.substring(i, i + 2);
            bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
        }
        return bigrams;
    };

    const map1 = tokenize(metin1);
    const map2 = tokenize(metin2);
    
    let kesisim = 0;
    let toplamSayi = 0;

    for (let [bg, count1] of map1) {
        toplamSayi += count1;
        if (map2.has(bg)) {
            kesisim += Math.min(count1, map2.get(bg));
        }
    }
    
    for (let count2 of map2.values()) {
        toplamSayi += count2;
    }

    if (toplamSayi === 0) return 0;
    return (200.0 * kesisim) / toplamSayi;
}

const dosyalar = [
    'tarih.json', 
    'cografya.json', 
    'guncel.json', 
    'matematik.json', 
    'turkce.json', 
    'vatandaslik.json'
];

async function baslat() {
    console.log("Kapsamlı temizlik, Benzerlik ve ID kontrolü başlıyor...\n");

    for (const dosyaAdi of dosyalar) {
        try {
            if (!fs.existsSync(dosyaAdi)) {
                console.log(`⚠️ ${dosyaAdi} bulunamadı, atlanıyor...`);
                continue;
            }

            const hamVeri = JSON.parse(fs.readFileSync(dosyaAdi, 'utf-8'));
            const dersAdi = dosyaAdi.split('.')[0];
            const istisnaDersler = ['turkce', 'matematik'];
            
            const benzersizSorular = [];

            // 1. AŞAMA: Geçersizleri Ele ve Benzerlik Kontrolü
            for (let i = 0; i < hamVeri.length; i++) {
                const soru = hamVeri[i];

                const metinYok = !soru.soruMetni || soru.soruMetni.trim() === "";
                const gorselYok = !soru.gorsel && !soru.gorsel_svg;

                if (metinYok && gorselYok) {
                    console.log(`⚠️ UYARI: ${dosyaAdi} içinde boş bir kayıt çöpe atıldı! (ID: ${soru.id || 'Bilinmiyor'})`);
                    continue; 
                }

                let eklenecek = true;

                // Havuzdaki (önceden onaylanmış) sorularla karşılaştır
                for (const onayliSoru of benzersizSorular) {
                    // Eğer yeni sorunun metni yoksa (sadece görselse), görsel linklerinin birebir aynı olup olmadığına bak
                    if (metinYok) {
                        if ((soru.gorsel && soru.gorsel === onayliSoru.gorsel) || 
                            (soru.gorsel_svg && soru.gorsel_svg === onayliSoru.gorsel_svg)) {
                            eklenecek = false;
                            break;
                        }
                        continue;
                    }

                    // Metin varsa benzerlik ölçümünü yap
                    if (onayliSoru.soruMetni) {
                        const oran = metinBenzerlik(soru.soruMetni, onayliSoru.soruMetni);

                        if (istisnaDersler.includes(dersAdi)) {
                            // --- TÜRKÇE VE MATEMATİK MANTIĞI ---
                            if (oran >= 95) {
                                console.log(`\n🚨 [${dersAdi.toUpperCase()}] YÜKSEK BENZERLİK TESPİTİ (%${oran.toFixed(1)})`);
                                console.log(`Orijinal Soru Metni: ${onayliSoru.soruMetni.substring(0, 100)}...`);
                                console.log(`Benzer Soru Metni: ${soru.soruMetni.substring(0, 100)}...`);
                                const cevap = await soruSor('Bu birbirine bağlı/benzer soruyu SİLMEK istiyor musunuz? (e/h): ');
                                if (cevap.trim().toLowerCase() === 'e') {
                                    eklenecek = false;
                                    break;
                                }
                            }
                            // %90-95 arası hiçbir şey yapma (kabul et)
                        } else {
                            // --- DİĞER DERSLER MANTIĞI ---
                            if (oran > 95) {
                                // Otomatik Sil
                                console.log(`🗑️ [${dersAdi.toUpperCase()}] Otomatik Silindi (Benzerlik: %${oran.toFixed(1)}) - ID: ${soru.id || 'Yok'}`);
                                eklenecek = false;
                                break;
                            } else if (oran >= 90 && oran <= 95) {
                                console.log(`\n⚠️ [${dersAdi.toUpperCase()}] ŞÜPHELİ BENZERLİK TESPİTİ (%${oran.toFixed(1)})`);
                                console.log(`Orijinal Soru: ${onayliSoru.soruMetni.substring(0, 100)}...`);
                                console.log(`Benzer Soru: ${soru.soruMetni.substring(0, 100)}...`);
                                const cevap = await soruSor('Bu soruyu SİLMEK istiyor musunuz? (e/h): ');
                                if (cevap.trim().toLowerCase() === 'e') {
                                    eklenecek = false;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (eklenecek) {
                    benzersizSorular.push(soru);
                }
            }

            // 2. AŞAMA: ID Çakışmalarını Kontrol Et ve Düzelt
            const kullanilanIdler = new Set();
            let degisenIdSayisi = 0;

            benzersizSorular.forEach(soru => {
                if (!soru.id || kullanilanIdler.has(soru.id)) {
                    soru.id = rastgeleIdUret(dersAdi);
                    kullanilanIdler.add(soru.id);
                    degisenIdSayisi++;
                } else {
                    kullanilanIdler.add(soru.id);
                }
            });
            
            // 3. AŞAMA: Temizlenmiş ve ID'leri onarılmış veriyi dosyaya yaz
            fs.writeFileSync(dosyaAdi, JSON.stringify(benzersizSorular, null, 2), 'utf-8');
            
            console.log(`✅ ${dosyaAdi}: ${hamVeri.length} sorudan ${benzersizSorular.length} adede düştü. ${degisenIdSayisi} adet eksik/çakışan ID yenilendi.`);
        } catch (hata) {
            console.log(`❌ ${dosyaAdi} işlenirken hata oluştu. Detay: ${hata.message}`);
        }
    }

    console.log("\nİşlem tamamlandı! Dosyalar güncellendi.");
    rl.close();
}

baslat();





