import { getSavedClaims } from './storage.js';

const initialState = { 
    guncelPuan: 50, 
    sorular: [], 
    soruGecmisi: [], 
    aktifIndex: -1,
    aktifDers: null,
    aktifKonu: null,
    itirazlar: getSavedClaims(),
    kullanilanSoruIdleri: []
};

function testReducer(state = initialState, action) {
    switch (action.type) {
        case 'SORULARI_YUKLE': 
            return { ...state, sorular: action.payload };
        
        case 'DERS_SEC': 
            return { 
                ...state, 
                aktifDers: action.payload.ders, 
                aktifKonu: action.payload.konu || null, 
                soruGecmisi: [], 
                aktifIndex: -1, 
                guncelPuan: 50,
                kullanilanSoruIdleri: [] 
            };
            
        case 'YENI_SORU_EKLE': {
            const yeniKullanilanlar = [...state.kullanilanSoruIdleri, String(action.payload.id)];
            // Sadece son 50 sorunun ID'sini hafızada tutarak dizinin şişmesini engelliyoruz
            const son50Kullanilan = yeniKullanilanlar.slice(-50); 
            
            return { 
                ...state, 
                soruGecmisi: [...state.soruGecmisi, { ...action.payload, verilenCevap: null }], 
                aktifIndex: state.aktifIndex + 1,
                kullanilanSoruIdleri: son50Kullanilan 
            };
        }
            
        case 'INDEKS_GUNCELLE': 
            return { ...state, aktifIndex: action.payload };
        
        case 'CEVAP_KAYDET': {
            const gecmisKopya = [...state.soruGecmisi];
            gecmisKopya[state.aktifIndex].verilenCevap = action.payload.cevap;
            let yeniPuan = state.guncelPuan + action.payload.puanDegisimi;
            if (yeniPuan > 100) yeniPuan = 100;
            if (yeniPuan < 1) yeniPuan = 1;
            return { ...state, soruGecmisi: gecmisKopya, guncelPuan: yeniPuan };
        }
            
        case 'CEVABI_TEMIZLE': {
            const gecmisKopyaTemizle = [...state.soruGecmisi];
            const soru = gecmisKopyaTemizle[state.aktifIndex];
            if (!soru.verilenCevap) return state;
            
            let iadePuan = state.guncelPuan;
            if (soru.verilenCevap !== 'BOS') {
                if (soru.verilenCevap === soru.dogruCevap) iadePuan -= 5;
                else iadePuan += 5;
            }
            
            if (iadePuan > 100) iadePuan = 100;
            if (iadePuan < 1) iadePuan = 1;
            soru.verilenCevap = null;
            return { ...state, soruGecmisi: gecmisKopyaTemizle, guncelPuan: iadePuan };
        }
            
        case 'ITIRAZ_EKLE': {
            const guncelItirazlar = [...state.itirazlar, action.payload];
            localStorage.setItem('kpss_itirazlar', JSON.stringify(guncelItirazlar)); 
            return { ...state, itirazlar: guncelItirazlar };
        }
            
        case 'ITIRAZ_SIL': {
            const silinmisItirazlar = state.itirazlar.filter(i => i.id !== action.payload);
            localStorage.setItem('kpss_itirazlar', JSON.stringify(silinmisItirazlar));
            return { ...state, itirazlar: silinmisItirazlar };
        }
            
        default: return state;
    }
}

// Global Redux kütüphanesini kullanır
export const store = Redux.createStore(testReducer);