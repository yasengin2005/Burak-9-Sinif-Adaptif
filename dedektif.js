const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const STOP_WORDS = new Set([
    "ve", "veya", "ile", "için", "gibi", "kadar", "olan", "olmayan", 
    "aşağıdakilerden", "hangisi", "hangisidir", "hangisinde", "hangileri",
    "değildir", "vardır", "yoktur", "bir", "nedir", "nelerdir", "buna", "göre",
    "arasında", "yer", "alır", "almaz", "olarak", "ise", "da", "de", "ki"
]);

function kelimeleriCikar(metin) {
    if (!metin) return new Set();
    const temizMetin = metin
        .toLocaleLowerCase('tr-TR')
        .replace(/[.,!?()[\]{}"':;]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    const kelimeler = temizMetin.split(' ')
        .filter(k => k.length > 2 && !STOP_WORDS.has(k));
    
    return new Set(kelimeler);
}

function jaccardBenzerligi(kume1, kume2) {
    if (kume1.size === 0 || kume2.size === 0) return 0;
    
    let kesisim = 0;
    for (let kelime of kume1) {
        if (kume2.has(kelime)) kesisim++;
    }
    
    const birlesim = kume1.size + kume2.size - kesisim;
    return kesisim / birlesim;
}

async function taramayiBaslat() {
    const dataKlasoru = path.join(__dirname, 'data');
    const dersDosyalari = ['tarih.json', 'cografya.json', 'matematik.json', 'turkce.json', 'vatandaslik.json', 'guncel.json'];
    
    // YENİ: Çift Eşik Sistemi
    const OTOMATIK_SIL_ESIGI = 0.95; // %95 ve üzeri acımadan silinir
    const MANUEL_KONTROL_ESIGI = 0.90; // %90-94 arası sana sorulur

    for (const dosya of dersDosyalari) {
        const dosyaYolu = path.join(dataKlasoru, dosya);
        
        if (!fs.existsSync(dosyaYolu)) continue;

        let sorular = JSON.parse(fs.readFileSync(dosyaYolu, 'utf-8'));
        let silinenSayisi = 0;
        let otomatikSilinen = 0;
        let manuelSilinen = 0;

        console.log(`\n🔍 Taranıyor: ${dosya} (${sorular.length} soru)`);

        for (let i = 0; i < sorular.length; i++) {
            for (let j = i + 1; j < sorular.length; j++) {
                const soruA = sorular[i];
                const soruB = sorular[j];

                if (soruA.konu !== soruB.konu) continue;

                const kumeA = kelimeleriCikar(soruA.soruMetni);
                const kumeB = kelimeleriCikar(soruB.soruMetni);
                const skor = jaccardBenzerligi(kumeA, kumeB);

                // DURUM 1: %95 ve üzeri (Otomatik İmha)
                if (skor >= OTOMATIK_SIL_ESIGI) {
                    console.log(`\n🗑️ %${(skor * 100).toFixed(1)} KESİN KOPYA! Otomatik silindi. (Konu: ${soruA.konu})`);
                    console.log(`\x1b[32m[Orijinal Kaldı]\x1b[0m ${soruA.soruMetni.substring(0, 70)}...`);
                    console.log(`\x1b[31m[Kopya Silindi]\x1b[0m ${soruB.soruMetni.substring(0, 70)}...`);
                    
                    sorular.splice(j, 1);
                    silinenSayisi++;
                    otomatikSilinen++;
                    j--; // Dizi kaydığı için indeksi geri al
                } 
                // DURUM 2: %90 - %94.9 arası (Manuel Kontrol)
                else if (skor >= MANUEL_KONTROL_ESIGI) {
                    console.log(`\n🚨 %${(skor * 100).toFixed(1)} ŞÜPHELİ BENZERLİK! (Konu: ${soruA.konu})`);
                    console.log(`\x1b[36m[A - ID: ${soruA.id}]\x1b[0m ${soruA.soruMetni}`);
                    console.log(`\x1b[33m[B - ID: ${soruB.id}]\x1b[0m ${soruB.soruMetni}`);
                    
                    const cevap = await new Promise(resolve => {
                        rl.question('\nNe yapalım? (A\'yı sil: a / B\'yi sil: b / İkisi de kalsın (Geç): g): ', resolve);
                    });

                    if (cevap.toLowerCase() === 'a') {
                        sorular.splice(i, 1);
                        silinenSayisi++;
                        manuelSilinen++;
                        i--; // i silindiği için i'yi geri al
                        console.log('✅ Soru A silindi.');
                        break; // i silindiği için j döngüsünü kır
                    } else if (cevap.toLowerCase() === 'b') {
                        sorular.splice(j, 1);
                        silinenSayisi++;
                        manuelSilinen++;
                        j--; // j silindiği için j'yi geri al
                        console.log('✅ Soru B silindi.');
                    } else {
                        console.log('⏩ Pas geçildi.');
                    }
                }
            }
        }

        if (silinenSayisi > 0) {
            fs.writeFileSync(dosyaYolu, JSON.stringify(sorular, null, 4), 'utf-8');
            console.log(`\n💾 ${dosya} güncellendi! Toplam ${silinenSayisi} çöp temizlendi. (${otomatikSilinen} otomatik, ${manuelSilinen} manuel)`);
        }
    }
    
    console.log('\n🎉 Tüm tarama tamamlandı! Soru bankan pırıl pırıl oldu.');
    rl.close();
}

taramayiBaslat();