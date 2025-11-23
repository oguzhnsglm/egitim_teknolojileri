import { REGIONS } from './regions';

export const TEAM_PRESETS = [
  { name: 'Kirmizi Simsekler', color: '#ef4444' },
  { name: 'Mavi Ufuk', color: '#3b82f6' },
  { name: 'Yesil Vadi', color: '#22c55e' },
  { name: 'Altin Hilal', color: '#facc15' },
];

export const CITY_PRESETS = REGIONS.map(({ code, name }) => ({
  code,
  name,
  region: name,
}));

export const QUESTION_PRESETS = [
  {
    prompt: "Istanbul'un tarihi yarimadasini cevreleyen su kitlesi hangisidir?",
    choices: ['Ege Denizi', 'Marmara Denizi', 'Karadeniz', 'Halic'],
    correctIndex: 1,
    cityCode: 'REG-MARMARA',
  },
  {
    prompt: "Ankara hangi yuzyilda Turkiye Cumhuriyeti'nin baskenti olmustur?",
    choices: ['18. yuzyil', '19. yuzyil', '20. yuzyil', '21. yuzyil'],
    correctIndex: 2,
    cityCode: 'REG-IC-ANADOLU',
  },
  {
    prompt: "Adana'nin meshur tas koprusunun adi nedir?",
    choices: ['Tas Kopru', 'Varda Koprusu', 'Galata Koprusu', 'Seyhan Koprusu'],
    correctIndex: 0,
    cityCode: 'REG-AKDENIZ',
  },
  {
    prompt: "Izmir'de 1922'de gerceklesen buyuk yangina ne ad verilir?",
    choices: ['Gavur Dagi Yangini', 'Izmir Yangini', 'Efes Yangini', 'Kadifekale Yangini'],
    correctIndex: 1,
    cityCode: 'REG-EGE',
  },
  {
    prompt: 'Bursa hangi devletin ilk baskentlerinden biridir?',
    choices: ['Selcuklu Devleti', 'Osmanli Devleti', 'Hitit Devleti', 'Anadolu Beylikleri'],
    correctIndex: 1,
    cityCode: 'REG-MARMARA',
  },
  {
    prompt: 'Eskisehir ve cevresinde cikarilan, cam yapiminda kullanilan mineral hangisidir?',
    choices: ['Bor', 'Krom', 'Tuz', 'Linyit'],
    correctIndex: 0,
    cityCode: 'REG-IC-ANADOLU',
  },
  {
    prompt: "Antalya'daki antik tiyatrolariyla unlu antik kent hangisidir?",
    choices: ['Efes', 'Perge', 'Side', 'Aspendos'],
    correctIndex: 3,
    cityCode: 'REG-AKDENIZ',
  },
  {
    prompt: "Trabzon'da bulunan ve Fatih Sultan Mehmet tarafindan fethedilen manastir hangisidir?",
    choices: ['Sumela Manastiri', 'Aya Triada', 'Aya Yorgi', 'Aziz Nikola'],
    correctIndex: 0,
    cityCode: 'REG-KARADENIZ',
  },
  {
    prompt: "Turkiye'nin en genis karstik alanlarindan birine sahip bolgesi hangisidir?",
    choices: ['Marmara', 'Ege', 'Akdeniz', 'Dogu Anadolu'],
    correctIndex: 2,
    region: 'Akdeniz',
  },
  {
    prompt: "Milli Mucadele'nin basladigi kabul edilen tarih hangisidir?",
    choices: ['23 Nisan 1920', '19 Mayis 1919', '30 Agustos 1922', '29 Ekim 1923'],
    correctIndex: 1,
    region: 'Karadeniz',
  },
  {
    prompt: 'Konya hangi unlu mutasavvifin turbesiyle taninir?',
    choices: ['Haci Bektas Veli', 'Yunus Emre', 'Mevlana', 'Ahmet Yesevi'],
    correctIndex: 2,
    cityCode: 'REG-IC-ANADOLU',
  },
  {
    prompt: 'Canakkale Bogazi hangi iki denizi birbirine baglar?',
    choices: ['Karadeniz-Marmara', 'Marmara-Ege', 'Ege-Akdeniz', 'Akdeniz-Karadeniz'],
    correctIndex: 1,
    cityCode: 'REG-MARMARA',
  },
  {
    prompt: "Diyarbakir'in UNESCO Dunya Mirasi Listesi'nde yer alan yapisi hangisidir?",
    choices: ['Hasankeyf', 'Mardin Kalesi', 'Diyarbakir Surlari', 'Ishak Pasa Sarayi'],
    correctIndex: 2,
    cityCode: 'REG-GUNEYDOGU',
  },
  {
    prompt: "Gaziantep'in meshur tatlisi hangisidir?",
    choices: ['Baklava', 'Kunefe', 'Kadayif', 'Lokum'],
    correctIndex: 0,
    cityCode: 'REG-GUNEYDOGU',
  },
  {
    prompt: 'Van Golunun ozelligi nedir?',
    choices: ['Tatli su', 'Soda icerikli', 'En derin gol', 'En buyuk gol'],
    correctIndex: 1,
    cityCode: 'REG-DOGU-ANADOLU',
  },
  {
    prompt: 'Erzurum Kongresi hangi yil yapilmistir?',
    choices: ['1918', '1919', '1920', '1921'],
    correctIndex: 1,
    cityCode: 'REG-DOGU-ANADOLU',
  },
  {
    prompt: "Balikesir'in hangi ilcesi Ayvalik zeytinyagi ile unludur?",
    choices: ['Edremit', 'Ayvalik', 'Bandirma', 'Gonen'],
    correctIndex: 1,
    cityCode: 'REG-MARMARA',
  },
  {
    prompt: "Denizli'nin UNESCO Dunya Mirasi Listesi'nde yer alan dogal yapisi hangisidir?",
    choices: ['Salda Golu', 'Pamukkale', 'Kaklik Magarasi', 'Acigol'],
    correctIndex: 1,
    cityCode: 'REG-EGE',
  },
  {
    prompt: "Edirne'nin sembolu sayilan cami hangisidir?",
    choices: ['Uc Serefeli Cami', 'Selimiye Camii', 'Eski Cami', 'Muradiye Camii'],
    correctIndex: 1,
    cityCode: 'REG-MARMARA',
  },
  {
    prompt: "Kayseri'nin antik cagdaki adi nedir?",
    choices: ['Efes', 'Kayseria', 'Mazaka', 'Sivas'],
    correctIndex: 2,
    cityCode: 'REG-IC-ANADOLU',
  },
  {
    prompt: 'Malatya hangi meyveyle unludur?',
    choices: ['Elma', 'Kayisi', 'Kiraz', 'Uzum'],
    correctIndex: 1,
    cityCode: 'REG-DOGU-ANADOLU',
  },
  {
    prompt: "Manisa'nin tarihi adi nedir?",
    choices: ['Magnesia', 'Smyrna', 'Efes', 'Pergamon'],
    correctIndex: 0,
    cityCode: 'REG-EGE',
  },
  {
    prompt: 'Samsun hangi onemli olay icin baslangic noktasi kabul edilir?',
    choices: ['Cumhuriyetin ilani', 'Kurtulus Savasi', 'Lozan Antlasmasi', 'Saltanatin kaldirilmasi'],
    correctIndex: 1,
    cityCode: 'REG-KARADENIZ',
  },
  {
    prompt: "Tekirdag'in meshur koftesi hangi ilceye aittir?",
    choices: ['Corlu', 'Cerkezkoy', 'Malkara', 'Merkez'],
    correctIndex: 0,
    cityCode: 'REG-MARMARA',
  },
  {
    prompt: "Kirklareli'nin siniri olan ulke hangisidir?",
    choices: ['Yunanistan', 'Bulgaristan', 'Romanya', 'Makedonya'],
    correctIndex: 1,
    cityCode: 'REG-MARMARA',
  },
];
