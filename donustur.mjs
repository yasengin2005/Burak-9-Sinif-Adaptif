import fs from 'fs';
// constants.js dosyasından çeviriciyi içeri aktarıyoruz
// (Eğer constants.js farklı bir klasördeyse './constants.js' yolunu ona göre ayarlayın)
import { KONU_ID_CEVIRMENI } from './constants.js'; 

const dosyalar = ['cografya.json', 'matematik.json', 'turkce.json', 'vatandaslik.json', 'guncel.json'];

dosyalar.forEach(dosyaAdi => {
  try {
    const hamVeri = fs.readFileSync(`./data/${dosyaAdi}`, 'utf8');
    const sorular = JSON.parse(hamVeri);

    const guncelSorular = sorular.map(soru => {
      if (KONU_ID_CEVIRMENI[soru.konu]) {
        soru.konu = KONU_ID_CEVIRMENI[soru.konu];
      }
      return soru;
    });

    const yeniDosyaAdi = dosyaAdi.replace('.json', '_son.json');
    fs.writeFileSync(yeniDosyaAdi, JSON.stringify(guncelSorular, null, 2));
    
    console.log(`✅ ${dosyaAdi} başarıyla dönüştürüldü -> ${yeniDosyaAdi}`);
    
  } catch (hata) {
    console.error(`❌ ${dosyaAdi} işlenirken bir hata oluştu:`, hata.message);
  }
});

console.log("Tüm işlemler tamamlandı!");