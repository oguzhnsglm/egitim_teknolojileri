export type RegionCode =
  | 'REG-MARMARA'
  | 'REG-EGE'
  | 'REG-AKDENIZ'
  | 'REG-IC-ANADOLU'
  | 'REG-KARADENIZ'
  | 'REG-DOGU-ANADOLU'
  | 'REG-GUNEYDOGU';

export interface RegionDefinition {
  code: RegionCode;
  name: string;
  provinces: string[];
  description?: string;
}

export const REGIONS: RegionDefinition[] = [
  {
    code: 'REG-MARMARA',
    name: 'Marmara',
    description: 'Trakya dan Yalova ya uzanan Bogazlar bolgesi',
    provinces: ['TR-10', 'TR-11', 'TR-16', 'TR-17', 'TR-22', 'TR-34', 'TR-39', 'TR-41', 'TR-54', 'TR-59', 'TR-77'],
  },
  {
    code: 'REG-EGE',
    name: 'Ege',
    description: 'Gediz ve Menderes havzalari ile Ege sahilleri',
    provinces: ['TR-03', 'TR-09', 'TR-20', 'TR-35', 'TR-43', 'TR-45', 'TR-48', 'TR-64'],
  },
  {
    code: 'REG-AKDENIZ',
    name: 'Akdeniz',
    description: 'Toros eteklerinden Cukurova ya uzanan sicak sahil kusagi',
    provinces: ['TR-01', 'TR-07', 'TR-15', 'TR-31', 'TR-32', 'TR-33', 'TR-46', 'TR-80'],
  },
  {
    code: 'REG-IC-ANADOLU',
    name: 'Ic Anadolu',
    description: 'Orta Anadolu platosu ve Konya ovasi',
    provinces: ['TR-06', 'TR-18', 'TR-26', 'TR-38', 'TR-40', 'TR-42', 'TR-50', 'TR-51', 'TR-58', 'TR-66', 'TR-68', 'TR-70', 'TR-71'],
  },
  {
    code: 'REG-KARADENIZ',
    name: 'Karadeniz',
    description: 'Yesil yaylalar ve Karadeniz dag silsilesi',
    provinces: [
      'TR-05',
      'TR-08',
      'TR-14',
      'TR-19',
      'TR-28',
      'TR-29',
      'TR-37',
      'TR-52',
      'TR-53',
      'TR-55',
      'TR-57',
      'TR-60',
      'TR-61',
      'TR-67',
      'TR-69',
      'TR-74',
      'TR-78',
      'TR-81',
    ],
  },
  {
    code: 'REG-DOGU-ANADOLU',
    name: 'Dogu Anadolu',
    description: 'Yuksek platolar ve serhat illeri',
    provinces: ['TR-04', 'TR-12', 'TR-13', 'TR-23', 'TR-24', 'TR-25', 'TR-30', 'TR-36', 'TR-44', 'TR-49', 'TR-62', 'TR-65', 'TR-75', 'TR-76'],
  },
  {
    code: 'REG-GUNEYDOGU',
    name: 'Guneydogu Anadolu',
    description: 'Firat ve Dicle havzalarinin sicak ovasi',
    provinces: ['TR-02', 'TR-21', 'TR-27', 'TR-47', 'TR-56', 'TR-63', 'TR-72', 'TR-73', 'TR-79'],
  },
];

export const REGION_BY_CODE: Record<RegionCode, RegionDefinition> = REGIONS.reduce(
  (acc, region) => {
    acc[region.code] = region;
    return acc;
  },
  {} as Record<RegionCode, RegionDefinition>,
);

export const PROVINCE_TO_REGION: Record<string, RegionCode> = REGIONS.reduce(
  (acc, region) => {
    region.provinces.forEach((provinceCode) => {
      acc[provinceCode] = region.code;
    });
    return acc;
  },
  {} as Record<string, RegionCode>,
);
