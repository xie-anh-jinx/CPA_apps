// Storage manager and data schemas for CPA Fleet Logbook
export interface VehicleRecord {
  id: string;
  location?: string;
  plate: string;
  oldPlate?: string;
  owner: string;
  address?: string;
  brand: string;
  type: string;
  tonage?: string;
  vehicleType?: string;
  jenis?: string;
  model?: string;
  year?: number | string;
  cylinder?: string;
  chassisNo?: string;
  engineNo?: string;
  color?: string;
  fuel?: string;
  plateColor?: string;
  bpkbNo?: string;
  keyNo?: string;
  testNo?: string;
  personInCharge?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxRecord {
  id: string;
  plate: string;
  owner?: string;
  stnkDate: string;
  taxDate: string;
  taxAmount?: number;
  renewedDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KirRecord {
  id: string;
  plate: string;
  owner?: string;
  testNo?: string;
  kirDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsuranceRecord {
  id: string;
  plate: string;
  owner?: string;
  vendor: string;
  policyNo: string;
  coverageName?: string;
  premium?: number;
  coverageValue?: number;
  tjh?: number;
  validFrom?: string;
  validTo: string;
  renewalDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForkliftRecord {
  id: string;
  location: string;
  brand: string;
  serialNo: string;
  model?: string;
  truckWeight?: string;
  capacity?: string;
  prodYear?: number | string;
  owner?: string;
  insuranceStatus?: string;
  capacityTon?: string;
  engineNo?: string;
  policyNo?: string;
  premium?: number;
  coverageValue?: number;
  validTo?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FleetDatabase {
  vehicle: VehicleRecord[];
  tax: TaxRecord[];
  kir: KirRecord[];
  insurance: InsuranceRecord[];
  forklift: ForkliftRecord[];
}

export const STORE_KEY = "cpa_fleet_logbook_v1";

export const INITIAL_TAX_SEED: TaxRecord[] = [
  { id: "t_1", plate: "KT 1648 KY", owner: "PT.CPA", stnkDate: "2026-11-15", taxDate: "2026-11-15", taxAmount: 2450000, notes: "Masa pajak segera berakhir" },
  { id: "t_2", plate: "DD 8815 RB", owner: "PT.CPA", stnkDate: "2028-10-10", taxDate: "2026-10-10", taxAmount: 4800000, notes: "Pajak Expired / Perlu Perpanjangan Segera" },
  { id: "t_3", plate: "KT 243 EM", owner: "PT.CPA", stnkDate: "2029-04-20", taxDate: "2027-04-20", taxAmount: 3650000, notes: "Kondisi Aman" },
  { id: "t_4", plate: "DD 8186 UF", owner: "PT.CPA", stnkDate: "2029-11-05", taxDate: "2026-11-05", taxAmount: 8900000, notes: "Truk Fighter - Urus Perpanjangan" },
  { id: "t_5", plate: "KT 8652 YV", owner: "PT.CRA", stnkDate: "2027-12-25", taxDate: "2026-12-25", taxAmount: 4200000, notes: "Site MSJ" },
  { id: "t_6", plate: "KT 8177 ZU", owner: "PT.CPA", stnkDate: "2027-10-25", taxDate: "2026-10-25", taxAmount: 9500000, notes: "Tronton Balikpapan" },
];

export const INITIAL_KIR_SEED: KirRecord[] = [
  { id: "k_1", plate: "DD 8186 UF", owner: "PT.CPA", testNo: "DA 71C21003407", kirDate: "2026-11-12", notes: "Uji berkala truk" },
  { id: "k_2", plate: "KT 8966 WC", owner: "PT.CPA", testNo: "CD.72C12003314", kirDate: "2026-10-15", notes: "Uji KIR Expired" },
  { id: "k_3", plate: "KT 8824 LU", owner: "PT.CPA", testNo: "CD 71C21007114", kirDate: "2026-11-20", notes: "Jatuh tempo 3 minggu" },
  { id: "k_4", plate: "KT 8177 ZU", owner: "PT.CPA", testNo: "CD 71 C 22009101", kirDate: "2026-12-10", notes: "KIR aman" },
];

export const INITIAL_INSURANCE_SEED: InsuranceRecord[] = [
  { id: "i_1", plate: "KT 1648 KY", owner: "PT.CPA", vendor: "PT Asuransi Wahana Tata (Aswata)", policyNo: "029.4050.302.2025.000101.00", premium: 3850000, coverageValue: 150000000, validTo: "2026-11-20", notes: "All Risk" },
  { id: "i_2", plate: "DD 8815 RB", owner: "PT.CPA", vendor: "PT Asuransi Sinar Mas", policyNo: "029.4050.302.2025.000102.00", premium: 5200000, coverageValue: 320000000, validTo: "2026-10-18", notes: "Polis Expired" },
  { id: "i_3", plate: "KT 243 EM", owner: "PT.CPA", vendor: "PT Asuransi Jasindo", policyNo: "029.4050.302.2025.000103.00", premium: 4500000, coverageValue: 280000000, validTo: "2027-05-10", notes: "Kondisi Aktif" },
  { id: "i_4", plate: "KT 8177 ZU", owner: "PT.CPA", vendor: "PT Asuransi Wahana Tata", policyNo: "029.4050.302.2025.000105.00", premium: 12500000, coverageValue: 850000000, validTo: "2026-11-08", notes: "Heavy Truck" },
];

export const VEHICLE_SEED: Omit<VehicleRecord, "id">[] = [
  {location:'BJM',plate:'KT 1648 KY',owner:'PT.CPA',brand:'TOYOTA',type:'AVANZA 1300 G (F601RM GMMFJJ)',tonage:'',vehicleType:'LV',jenis:'',model:'',year:2011,cylinder:'',chassisNo:'MHFM1BA3JBK377052',engineNo:'DJ58595',color:'SILVER METALIK',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'YOVIE',notes:'',address:''},
  {location:'',plate:'KT 8392 AA',owner:'SAMUEL C.H',brand:'ISUZU',type:'PRLC TBR 54/2499',tonage:'2.100 Kg',vehicleType:'PANTHER',jenis:'MB. BARANG',model:'PICK UP',year:2006,cylinder:'',chassisNo:'MHCTBR54B6K130519',engineNo:'E130519',color:'KUNING',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'CD 021017784',personInCharge:'OP w/h - YOVIE',notes:'003/CRA/PP/X/2026',address:''},
  {location:'PALU',plate:'DD 8815 RB',owner:'PT.CPA',brand:'MITSUBISHI',type:'TRITON 2.5L DC HDX-H (4X4) M/T',tonage:'2.850 Kg',vehicleType:'TRITON',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2018,cylinder:'',chassisNo:'MMBJNKL30JH069424',engineNo:'4D56UAV6265',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'ESRA',notes:'',address:''},
  {location:'',plate:'DN 5804 IM',owner:'LANNY CHOWINDRA',brand:'HONDA',type:'D1802N26L2 A/T',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2019,cylinder:'',chassisNo:'MH1JFZ213KK670852',engineNo:'JFZ2E-1669765',color:'HITAM',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'P-06702759',keyNo:'',testNo:'',personInCharge:'',notes:'PP 055/CPA/PP/I/2025 PO CPA NO.008/CPA-PO/I/2025',address:''},
  {location:'',plate:'DD 1909 QF',owner:'PT.CPA',brand:'TOYOTA',type:'AVANZA 1.3 G M/T',tonage:'',vehicleType:'AVANZA',jenis:'MOPEN',model:'MINIBUS',year:2018,cylinder:'',chassisNo:'MHKM5EA3JJK094257',engineNo:'1NRF370860',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'',notes:'',address:''},
  {location:'',plate:'DN 8386 AD',owner:'PT.CRA',brand:'MITSUBISHI',type:'COLT L300 PU FB-R (4X2) M/T',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2014,cylinder:'',chassisNo:'MHMLOPU39EK151502',engineNo:'4D56C-K52290',color:'HITAM KANZAI',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'DC 011014532',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DN 8859 NF',owner:'PT.CPA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2022,cylinder:'',chassisNo:'PAEL67MKNNB006053',engineNo:'4N14UAM2140',color:'HITAM',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'T03677021S1',keyNo:'',testNo:'',personInCharge:'',notes:'PP 055/CPA/PP/I/2025 PO CPA NO.008/CPA-PO/I/2025',address:''},
  {location:'SMD',plate:'KT 243 EM',owner:'PT.CPA',brand:'TOYOTA',type:'KIJANG INNOVA 2.0 G A/T LUX',tonage:'',vehicleType:'KIJANG INNOVA',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MHFJW8EM5K2365217',engineNo:'1TRA577875',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OMA',notes:'',address:'Komp Balikpapan Baru Blok AA-1B No. 02 & 03 RT.009, Kel Damai Baru'},
  {location:'',plate:'KT 1702 LN',owner:'PT.CPA',brand:'TOYOTA',type:'NEW AVANZA 1,3G AT',tonage:'',vehicleType:'AVANZA',jenis:'MOPEN',model:'MINIBUS',year:2012,cylinder:'',chassisNo:'MHKM1BB3JCK007933',engineNo:'DL63408',color:'SILVER METALIK',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'IBU DESI',notes:'ASURANSI MANDIRI OLEH IBU DESSY',address:''},
  {location:'AMBON',plate:'DD 8755 RD',owner:'PT.CPA',brand:'MITSUBISHI',type:'COLT L300 PU FB-R (4X2)',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2013,cylinder:'',chassisNo:'MHML0PU39DK138416',engineNo:'4D56CJX8386',color:'HITAM',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Yan',notes:'',address:''},
  {location:'',plate:'KT 1289 MP',owner:'PT.CPA',brand:'TOYOTA',type:'NEW AVANZA 1,3G MT',tonage:'',vehicleType:'AVANZA',jenis:'MOPEN',model:'MINIBUS',year:2012,cylinder:'',chassisNo:'MHKM1BA3JCK061003',engineNo:'DL05228',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'J 00160258 N',keyNo:'',testNo:'',personInCharge:'Yan',notes:'',address:''},
  {location:'KENDARI',plate:'DD 8115 XX',owner:'PT.CPA',brand:'MITSUBISHI',type:'MITSUBISHI-TRITON-DC HDX 4X4 M/T',tonage:'',vehicleType:'LV',jenis:'DoubleCab',model:'',year:2024,cylinder:'',chassisNo:'MMBJNLC10RH030208',engineNo:'4N16UAR9665',color:'PUTIH SOLID',fuel:'',plateColor:'',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'',notes:'',address:''},
  {location:'',plate:'DD 8186 UF',owner:'PT.CPA',brand:'MITSUBISHI',type:'FIGHTER FM65FSL HI GEAR 4X2 M/T',tonage:'16.100 Kg',vehicleType:'FIGHTER',jenis:'MB.BARANG',model:'TRUCK BAK BESI',year:2024,cylinder:'7545',chassisNo:'MHMFM65GGRK000263',engineNo:'6M60311681',color:'KUNING TAXI',fuel:'SOLAR',plateColor:'PUTIH',bpkbNo:'U07583690R',keyNo:'',testNo:'',personInCharge:'WH',notes:'',address:''},
  {location:'',plate:'DT 8573 IE',owner:'PT.CPA',brand:'MITSUBISHI',type:'FIGHTER FM65FSL HI GEAR 4X2 M/T',tonage:'16.100 Kg',vehicleType:'FIGHTER',jenis:'MB.BARANG',model:'TRUCK BAK BESI',year:2023,cylinder:'7545',chassisNo:'MHMFM65GGPK000160',engineNo:'6M60-300957',color:'KUNING TAXI',fuel:'SOLAR',plateColor:'PUTIH',bpkbNo:'T04077945',keyNo:'',testNo:'',personInCharge:'WH',notes:'',address:''},
  {location:'',plate:'KT 8966 WC',owner:'PT.CPA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2012,cylinder:'',chassisNo:'MHMLOPU39CK108268',engineNo:'D456C-H07586',color:'PUTIH',fuel:'SOLAR',plateColor:'PUTIH',bpkbNo:'',keyNo:'',testNo:'CD.72C12003314',personInCharge:'Ops WH',notes:'',address:''},
  {location:'',plate:'KT 8380 LG',owner:'PT.CPA',brand:'TOYOTA',type:'HILUX 2.5G DC (4X4) MT',tonage:'2.730 Kg',vehicleType:'HILUX',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2012,cylinder:'',chassisNo:'MROFR22G0C0751983',engineNo:'2KD-S162228',color:'PUTIH',fuel:'SOLAR',plateColor:'PUTIH',bpkbNo:'J06072357N',keyNo:'',testNo:'',personInCharge:'Akram',notes:'PO CPA NO.034/CPA-PO/I/2025',address:''},
  {location:'',plate:'DD 8684 SZ',owner:'PT.CPA',brand:'MITSUBISHI',type:'COLT DIESEL FE 74',tonage:'5.200 Kg',vehicleType:'COLT DIESEL',jenis:'MB.BARANG',model:'LIGHT TRUCK',year:2019,cylinder:'',chassisNo:'MHMFE74PSKK207276',engineNo:'4D34TT66169',color:'KUNING',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Heriadi',notes:'',address:''},
  {location:'',plate:'DD 8684 SK',owner:'PT.CPA',brand:'MITSUBISHI',type:'TRITON',tonage:'2.730 Kg',vehicleType:'TRITON',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2019,cylinder:'',chassisNo:'MMBKNL30KH047112',engineNo:'4D56UAY5161',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OPS. SALES',notes:'',address:''},
  {location:'',plate:'DD 1707 VG',owner:'PT.CPA',brand:'MITSUBISHI',type:'XPANDER 1.5L EXCEED-K (4X4) M/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MK2NCWHANKJ003602',engineNo:'4A91GX3123',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'HATTA',notes:'',address:''},
  {location:'',plate:'DT 4203 OF',owner:'PT.CPA',brand:'HONDA',type:'Y1G02NO2L0 A/T',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2019,cylinder:'',chassisNo:'MH1JFS114KK434168',engineNo:'JFS1E-1427090',color:'HITAM',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OPS. OFFICE',notes:'',address:''},
  {location:'SAMPIT',plate:'KH 8858 LE',owner:'PT.CPA',brand:'MITSUBISHI',type:'COLT / FE 84 GSN',tonage:'',vehicleType:'',jenis:'MB.BARANG',model:'',year:2024,cylinder:'',chassisNo:'MHMFE84EPRK001118',engineNo:'JFZ1E3036772',color:'KUNING',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'CC051015711',personInCharge:'Muadi',notes:'',address:''},
  {location:'',plate:'KT 8294 ZI',owner:'PT.CRA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2023,cylinder:'',chassisNo:'MK2L0PUMZPJ004443',engineNo:'4N14UAR1277',color:'HITAM',fuel:'SOLAR',plateColor:'PUTIH',bpkbNo:'V04506058N',keyNo:'A6864',testNo:'',personInCharge:'OPS WH',notes:'',address:''},
  {location:'',plate:'KT 1483 LW',owner:'PT.CPA',brand:'TOYOTA',type:'KIJANG INNOVA G(TGN40R-GKMDKD',tonage:'',vehicleType:'KIJANG',jenis:'MB.PENUMPANG',model:'MINIBUS',year:2013,cylinder:'',chassisNo:'MHFXW42G28D2270196',engineNo:'1TR7648060',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Ops Office',notes:'',address:''},
  {location:'',plate:'KH 1794 FY',owner:'PT.CPA',brand:'TOYOTA',type:'FORTUNER 2.4 G 4X2 M/T',tonage:'',vehicleType:'FORTUNER',jenis:'MB.PENUMPANG',model:'MINIBUS',year:2018,cylinder:'',chassisNo:'MHFJB8GS6J1551229',engineNo:'2GDC331721',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'YUDHI',notes:'',address:''},
  {location:'',plate:'KH 8337 FV',owner:'PT.CPA',brand:'MITSUBISHI',type:'TRITON 2.5L DC HDX-L (4X4) M/T',tonage:'2.850 Kg',vehicleType:'TRITON',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2021,cylinder:'',chassisNo:'MMBJNKL30MH039428',engineNo:'4D56BE4226',color:'SILVER METALIK',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'CC 051013774',personInCharge:'Markrting wil Barat',notes:'',address:''},
  {location:'',plate:'KH 8339 FV',owner:'PT.CPA',brand:'MITSUBISHI',type:'TRITON 2.5L DC HDX-L (4X4) M/T',tonage:'2.850 Kg',vehicleType:'TRITON',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2021,cylinder:'',chassisNo:'MMBJNKL30MH039426',engineNo:'4D56UBE4548',color:'SILVER METALIK',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'CC 051013773',personInCharge:'Markrting wil Timur',notes:'',address:''},
  {location:'',plate:'KH 8296 LN',owner:'PT.CPA',brand:'MITSUBISHI',type:'COLD DIESEL FE SHD-X K HI GEAR',tonage:'5.200 Kg',vehicleType:'COLT DIESEL',jenis:'MB.BARANG',model:'LIGHT TRUCK',year:2020,cylinder:'',chassisNo:'MHMFE75PRMK030789',engineNo:'4D34TX26286',color:'KUNING',fuel:'SOLAR',plateColor:'KUNING',bpkbNo:'R02912710M',keyNo:'',testNo:'',personInCharge:'WH (Maman)',notes:'',address:''},
  {location:'',plate:'KH 8145 FS',owner:'PT.CPA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2018,cylinder:'',chassisNo:'MK2LOPU39JJ003129',engineNo:'4D56CS75914',color:'HITAM',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'CC 051011071',personInCharge:'WH (Muadi)',notes:'',address:''},
  {location:'',plate:'KH 8279 LN',owner:'PT.CPA',brand:'MITSUBISHI',type:'COLT DIESEL FE 84G (4X2) MT',tonage:'5.200 Kg',vehicleType:'COLT DIESEL',jenis:'MB BARANG',model:'LIGHT TRUCK',year:2019,cylinder:'',chassisNo:'MHMFE84P8KK015790',engineNo:'4D34TT25818',color:'KUNING',fuel:'SOLAR',plateColor:'KUNING',bpkbNo:'P02943366M',keyNo:'',testNo:'CC 051012552',personInCharge:'WH ( Agus )',notes:'',address:''},
  {location:'',plate:'KH 5006 QC',owner:'PT.CPA',brand:'HONDA',type:'D1B02N26L2 A/T',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2019,cylinder:'',chassisNo:'MH1JFZ138KK034849',engineNo:'JFZ1E3036772',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Ops Office',notes:'',address:''},
  {location:'MANADO',plate:'DB 8210 LP',owner:'PT. CPA',brand:'TOYOTA',type:'HILUX PICK UP 2.4 DSL 4X4',tonage:'2.910 Kg',vehicleType:'HILUX',jenis:'MOBIL BARANG',model:'PICK UP',year:2023,cylinder:'',chassisNo:'MR0DBBCE1P6004171',engineNo:'2GD1392293',color:'PUTIH',fuel:'BENSIN',plateColor:'PUTIH',bpkbNo:'T05266965',keyNo:'',testNo:'',personInCharge:'OPS W/H BITUNG',notes:'',address:'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado'},
  {location:'',plate:'DB 1237 RP',owner:'PT. CPA',brand:'TOYOTA',type:'W100RE-LBDFJ 1,3 E CVT',tonage:'',vehicleType:'AVANZA',jenis:'MOPEN',model:'MINIBUS',year:2023,cylinder:'1329',chassisNo:'MHKAA1BY9PK032623',engineNo:'1NRG240668',color:'PUTIH',fuel:'BENSIN',plateColor:'PUTIH',bpkbNo:'U01184768',keyNo:'',testNo:'',personInCharge:'TOAR',notes:'PO.712/CPA-PO/X/2024',address:'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado'},
  {location:'',plate:'DB 8509 LP',owner:'PT.CPA',brand:'DAIHATSU',type:'Grand Max PU AC PS 1.5 MC',tonage:'2.540 Kg',vehicleType:'GRAND MAX',jenis:'MOBIL BARANG',model:'PICK UP',year:2023,cylinder:'1500CC',chassisNo:'MHKP3FA1JPK032367',engineNo:'2NR4A77911',color:'WHITE DSO',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OP W/H',notes:'REVISI PO CPA No.804/CPA-PO/XII/2024',address:'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado'},
  {location:'',plate:'DB 8501 LK',owner:'PT.CPA',brand:'HINO',type:'FG 260 JS PLUS BAK BESI',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB.BARANG',model:'TRUCK',year:2023,cylinder:'',chassisNo:'MJEFG8JS2PJP10993',engineNo:'J08EWEJ17761',color:'HIJAU',fuel:'SOLAR',plateColor:'',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OP W/H',notes:'REVISI PO CPA No.804/CPA-PO/XII/2024',address:'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado'},
  {location:'',plate:'DB 1516 RO',owner:'PT.CPA',brand:'TOYOTA',type:'W100RE-LBDFJ 1,3 E CVT',tonage:'',vehicleType:'',jenis:'MOPEN',model:'MINIBUS',year:2023,cylinder:'1329 CC',chassisNo:'MHKAA1BY3PK022573',engineNo:'1NRG224111',color:'PUTIH',fuel:'BENSIN',plateColor:'PUTIH',bpkbNo:'T04083717',keyNo:'',testNo:'',personInCharge:'OPS OFFICE',notes:'',address:'Jalan Ring Road Kel. Paal IV LK. VI Kec. Tikala - Manado'},
  {location:'',plate:'DB 8595 LO',owner:'PT.CPA',brand:'ISUZU',type:'D-MAX DC',tonage:'2.850 Kg',vehicleType:'HILUX',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MPATFS87JNT003682',engineNo:'R24E-X58094',color:'PUTIH',fuel:'SOLAR',plateColor:'',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'DTECH',notes:'',address:''},
  {location:'',plate:'DB 1570 RN',owner:'PT.CPA',brand:'TOYOTA',type:'MAGH10R-BRXLBD 2.0 G HV CVT',tonage:'',vehicleType:'',jenis:'MOPEN',model:'MINIBUS',year:2022,cylinder:'',chassisNo:'MHFABAAA0N0002323',engineNo:'M20ANA15582',color:'PUTIH METALIK',fuel:'BENSIN',plateColor:'PUTIH',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'ERU',notes:'',address:''},
  {location:'',plate:'DB 1773 LV',owner:'PT.CPA',brand:'TOYOTA',type:'AVANZA 1.3 6 M/T ( F653RM',tonage:'',vehicleType:'AVANZA',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MHKM5EA3JKK129811',engineNo:'1NRF479526',color:'PUTIH',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Nasrullah',notes:'',address:''},
  {location:'',plate:'DD 1693 XDP',owner:'PT.CPA',brand:'MITSUBISHI',type:'XPANDER 1.5L EXCEED-K (4X4) M/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MK2NCWHANKJ004941',engineNo:'4A91HC1948',color:'PUTIH MUTIARA',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'Q-00454865R',keyNo:'',testNo:'',personInCharge:'David',notes:'',address:''},
  {location:'',plate:'DB 8643 LJ',owner:'PT.CPA',brand:'MITSUBISHI',type:'TRITON 2.5L DC HDX-L (4X4) M/T',tonage:'2.850 Kg',vehicleType:'TRITON',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2019,cylinder:'',chassisNo:'MMBJNKL30KH058782',engineNo:'4D56UBA2136',color:'PUTIH SOLID',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Storeman Site Weda',notes:'',address:''},
  {location:'',plate:'DB 8821 LK',owner:'PT.CPA',brand:'HINO',type:'WU342R-HKMTJD3 M/T',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB.BARANG',model:'TRUCK',year:2020,cylinder:'',chassisNo:'MJEC1JG43L5191497',engineNo:'W04DTRR81843',color:'HIJAU',fuel:'SOLAR',plateColor:'KUNING',bpkbNo:'',keyNo:'',testNo:'DA 71C21003407',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DB 8643 QL',owner:'PT.CRA',brand:'SUZUKI',type:'ST150 PICK UP',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2012,cylinder:'',chassisNo:'MHYESL415CJ233592',engineNo:'G15AID849585',color:'HITAM',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'DC 12100514',personInCharge:'OP w/h',notes:'TLO Aswata Bpn',address:''},
  {location:'',plate:'DB 8021 LK',owner:'SAMUEL C.H',brand:'HINO',type:'WU34R2 HKMTJD/130 HD',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB.BARANG',model:'TRUCK',year:2011,cylinder:'',chassisNo:'MJEC1JG43B5034339',engineNo:'W04DTRJ38510',color:'HIJAU',fuel:'SOLAR',plateColor:'KUNING',bpkbNo:'',keyNo:'',testNo:'MO 47704',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DD 8727 ME',owner:'PT.CPA',brand:'MITSUBISHI',type:'COLT DIESEL FE 71 (4X2)',tonage:'5.200 Kg',vehicleType:'COLT DIESEL',jenis:'MB.BARANG',model:'LIGHT TRUCK',year:2008,cylinder:'',chassisNo:'MHMFE71P1P18K008325',engineNo:'4D34TD83097',color:'HITAM',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DB 5331 MF',owner:'SAMUEL C.H',brand:'HONDA',type:'NF11C1C M/T',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2012,cylinder:'',chassisNo:'MH1JBH11XCK197508',engineNo:'JBH1E1190962',color:'HITAM SILVER',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OP W/H',notes:'',address:''},
  {location:'',plate:'KT 3828 ZO',owner:'SAMUEL C.H',brand:'YAMAHA',type:'1 KP AT',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2012,cylinder:'',chassisNo:'MH31KP00ACJ183327',engineNo:'1KP-183801',color:'MERAH',fuel:'BENSIN',plateColor:'PUTIH',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OP office',notes:'',address:''},
  {location:'MAKASAR',plate:'DD 1240 XBC',owner:'PT.CPA',brand:'MITSUBISHI',type:'XPANDER 1.5L EXCEED-K (4X4) M/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2024,cylinder:'',chassisNo:'MK2NCLHATRJ000825',engineNo:'4A91KCG7409',color:'PUTIH MUTIARA',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'MURSIDIN',notes:'',address:''},
  {location:'',plate:'DD 1113 XBG',owner:'PT.CPA',brand:'MITSUBISHI',type:'Xpander 1.5L Exceed-L 4x2 A/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2023,cylinder:'1499 cc',chassisNo:'MK2NCLHATPJ004156',engineNo:'4A91KBX9283',color:'',fuel:'',plateColor:'',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Op Office',notes:'',address:'JL. Perintis Kemerdekan KM 16 Komp, RT 001 RW 006 Kel/Desa PAI, Kec Biringkanaya Kota'},
  {location:'',plate:'DB 8810 LC',owner:'SAMUEL C.H',brand:'HINO',type:'WU302R-HKMLHD3L/110SDL',tonage:'5.200 Kg',vehicleType:'COLT DIESEL',jenis:'MB.BARANG',model:'LIGHT TRUCK',year:2015,cylinder:'',chassisNo:'MJEC1JGX1F5026362',engineNo:'W04DTPJ62496',color:'HIJAU',fuel:'SOLAR',plateColor:'',bpkbNo:'',keyNo:'',testNo:'DA 011004119',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DD 8904 RM',owner:'PT.CPA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB.BARANG',model:'PICK UP',year:2019,cylinder:'',chassisNo:'MK2L0PU39KJ016202',engineNo:'4D56CT75470',color:'HITAM',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'DE 041025040',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DD 8814 RB',owner:'PT.CPA',brand:'MITSUBISHI',type:'TRITON 2.5L DC HDX-H (4X4) M/T',tonage:'2.850 Kg',vehicleType:'TRITON',jenis:'MB.BARANG',model:'DOUBLE CABIN',year:2018,cylinder:'',chassisNo:'MMBJNKL30JH071763',engineNo:'4D56UAW1728',color:'PUTIH SOLID',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'DE 011042973',personInCharge:'D-tech',notes:'',address:''},
  {location:'',plate:'DD 1918 QG',owner:'PT.CPA',brand:'TOYOTA',type:'FORTUNER 2.4 G 4X2 M/T',tonage:'',vehicleType:'FORTUNER',jenis:'MOPEN',model:'MINIBUS',year:2018,cylinder:'',chassisNo:'MHFJB8GS7J1551532',engineNo:'2GDC336084',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'SAKTI',notes:'',address:''},
  {location:'',plate:'DD 1733 MI',owner:'PT.CPA',brand:'MITSUBISHI',type:'XPANDER 1.5L EXCEED-K (4X4) M/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MK2NCWHANKJ002853',engineNo:'4A91GP7960',color:'PUTUH MUTIRA',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OPS KANTOR',notes:'',address:''},
  {location:'',plate:'DD 1841 VI',owner:'PT.CPA',brand:'MITSUBISHI',type:'XPANDER 1.5L EXCEED-K (4X4) M/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MK2NCWHANKJ003615',engineNo:'4A91GX2406',color:'PUTIH MUTIARA',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'ABU BAKAR',notes:'',address:''},
  {location:'',plate:'DD 1937 XGI',owner:'PT.CPA',brand:'MITSUBISHI',type:'XPANDER 1.5L EXCEED-K (4X4) M/T',tonage:'',vehicleType:'XPANDER',jenis:'MOPEN',model:'MINIBUS',year:2019,cylinder:'',chassisNo:'MK2NCWHANKJ004937',engineNo:'4A91HC2199',color:'PUTIH MUTIARA',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'JOKO SANTOSO',notes:'',address:''},
  {location:'BPN WAREHOUSE',plate:'KT 6071 HE',owner:'PT.CRA',brand:'HONDA',type:'L1F02N36L1 A/T',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2024,cylinder:'',chassisNo:'MH1JMC117RK466070',engineNo:'JMC1E1465176',color:'HITAM',fuel:'BENSIN',plateColor:'PUTIH',bpkbNo:'V04509275N',keyNo:'',testNo:'',personInCharge:'RAGIL',notes:'',address:''},
  {location:'',plate:'KT 4767 LK',owner:'SAMUEL C.H',brand:'HONDA',type:'NF 100 SLD',tonage:'',vehicleType:'SEPEDA MOTOR',jenis:'',model:'',year:2006,cylinder:'',chassisNo:'MH1HB411X6K277175',engineNo:'HB41E-1271459',color:'HITAM',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'KT 8548 LV',owner:'PT.CPA',brand:'ISUZU',type:'TBR 54 TURBO',tonage:'2.100 Kg',vehicleType:'PANTHER',jenis:'MB. BARANG',model:'PICK UP',year:2009,cylinder:'',chassisNo:'MHCTBR54B9K146435',engineNo:'E146435',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Yovie BJM',notes:'',address:''},
  {location:'',plate:'KT 8571 LQ',owner:'PT.CPA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB. BARANG',model:'PICK UP',year:2014,cylinder:'',chassisNo:'MHMLOPU39EK143164',engineNo:'4D56CK13452',color:'HITAM',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'CD 021045079',personInCharge:'OP w/h',notes:'',address:''},
  {location:'',plate:'DB 8161 AP',owner:'SAMUEL C.H',brand:'HINO',type:'FG8JJKB-GGJ / FG235JJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2010,cylinder:'',chassisNo:'MJEFG8JLKAJG16311',engineNo:'J08EUGJ19153',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'I-10762215S',keyNo:'',testNo:'MO 48460',personInCharge:'KARSING/YULIADI',notes:'',address:''},
  {location:'',plate:'DB 8951 LE',owner:'PT.CPA',brand:'HINO',type:'FG8JK1A-JGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2015,cylinder:'',chassisNo:'MJEFG8JK1FJJ10022',engineNo:'J08EWMJ10112',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'N-01768125',keyNo:'',testNo:'DA 71C17000220',personInCharge:'RICHO',notes:'',address:''},
  {location:'',plate:'DB 8952 LE',owner:'PT.CPA',brand:'HINO',type:'FG8JK1A-JGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2015,cylinder:'',chassisNo:'MJEFG8JK1FJJ10021',engineNo:'J08EWMJ10111',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'N-01768126',keyNo:'',testNo:'DA 71C17000221',personInCharge:'RIFAN',notes:'',address:''},
  {location:'',plate:'DB 8277 LE',owner:'PT.CPA',brand:'HINO',type:'FG8JL1A-JGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2015,cylinder:'',chassisNo:'MJEFG8JL1FJJ10153',engineNo:'J08EWMJ10123',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'M-12915276',keyNo:'',testNo:'DA 011005492',personInCharge:'LAONI/KIKI',notes:'',address:''},
  {location:'',plate:'DB 8278 LE',owner:'PT.CPA',brand:'HINO',type:'FG8JL1A-JGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2015,cylinder:'',chassisNo:'MJEFG8JL1FJJ10152',engineNo:'J08EWMJ10122',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'M-12915275',keyNo:'',testNo:'DA 011005493',personInCharge:'KARVI',notes:'',address:''},
  {location:'',plate:'DB 8219 LG',owner:'PT.CPA',brand:'HINO',type:'FG8JP1A-BGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2018,cylinder:'',chassisNo:'MJEFG8JP1JJB12658',engineNo:'J08EUGJ62413',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'N-01769486',keyNo:'',testNo:'DA 71C18001432',personInCharge:'ARIA',notes:'',address:''},
  {location:'',plate:'DB 8220 LG',owner:'PT.CPA',brand:'HINO',type:'FG8JP1A-BGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2018,cylinder:'',chassisNo:'MJEFG8JP1JJB12667',engineNo:'J08EUGJ62478',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'N-01769489',keyNo:'',testNo:'DA 71C18001433',personInCharge:'USMAN',notes:'',address:''},
  {location:'',plate:'DB 8221 LG',owner:'PT.CPA',brand:'HINO',type:'FG8JP1A-BGJ',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2018,cylinder:'',chassisNo:'MJEFG8JP1JJB12666',engineNo:'J08EUGJ62444',color:'HIJAU',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'N-01769488',keyNo:'',testNo:'DA 71C18001430',personInCharge:'NUR ALAN',notes:'',address:''},
  {location:'',plate:'KT 8824 LU',owner:'PT.CPA',brand:'HINO',type:'FG8JS1A-BGJ (4X2)',tonage:'15.100 Kg',vehicleType:'LONG BED',jenis:'MB. BARANG',model:'TRUCK',year:2021,cylinder:'',chassisNo:'MJEFG8JS1MJB12959',engineNo:'J08EUGJ79175',color:'HIJAU',fuel:'SOLAR',plateColor:'KUNING',bpkbNo:'Q 04745036 N',keyNo:'',testNo:'CD 71C21007114',personInCharge:'Maicel',notes:'',address:''},
  {location:'Site MSJ - Shena',plate:'KT 8652 YV',owner:'PT.CRA',brand:'TOYOTA',type:'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M',tonage:'2.910 Kg',vehicleType:'HILUX',jenis:'MB. BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MR0DB8CDXN0124259',engineNo:'2GD1168136',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'Q 09893366 N',keyNo:'',testNo:'CD 71 C 22008723',personInCharge:'Shena/MSJ',notes:'',address:''},
  {location:'Balikpapan HO',plate:'KT 8653 YV',owner:'PT.CRA',brand:'TOYOTA',type:'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M',tonage:'2.910 Kg',vehicleType:'HILUX',jenis:'MB. BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MR0DB8CD2N0124272',engineNo:'2GD1169112',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'Q 09893416 N',keyNo:'',testNo:'CD 71 C 22008722',personInCharge:'Dani / Bpn',notes:'',address:''},
  {location:'Site Melak - Irvan',plate:'KT 8655 YV',owner:'PT.CRA',brand:'TOYOTA',type:'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M',tonage:'2.910 Kg',vehicleType:'HILUX',jenis:'MB. BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MR0DB8CD4N0124340',engineNo:'2GD1173692',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'Q 09893422 N',keyNo:'',testNo:'CD 71 C 22008724',personInCharge:'Irvan Ginting/Melak',notes:'',address:''},
  {location:'Site Weda - Yohanes',plate:'KT 8657 YV',owner:'PT.CRA',brand:'TOYOTA',type:'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M',tonage:'2.910 Kg',vehicleType:'HILUX',jenis:'MB. BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MR0DB8CD9N0124317',engineNo:'2GD 1173746',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'Q 09894181 N',keyNo:'',testNo:'CD 71 C 22009066',personInCharge:'Johanes',notes:'',address:''},
  {location:'Site Satui - Saiful',plate:'KT 8658 YV',owner:'PT.CRA',brand:'TOYOTA',type:'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL M',tonage:'2.910 Kg',vehicleType:'HILUX',jenis:'MB. BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MR0DB8CD5N0184286',engineNo:'2GD1174367',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'Q 09893415 N',keyNo:'',testNo:'CD 71 C 22008725',personInCharge:'Rudi/Wahana',notes:'',address:''},
  {location:'Site Obi - Zaid',plate:'KT 8352 ZA',owner:'PT.CRA',brand:'MITSUBISHI',type:'TRITON 2.5 DC HDX-L (4X4) M/T',tonage:'2.910 Kg',vehicleType:'TRITON',jenis:'MB. BARANG',model:'DOUBLE CABIN',year:2022,cylinder:'',chassisNo:'MMBJNKL30NH083583',engineNo:'4D56UBH5509',color:'PUTIH',fuel:'SOLAR',plateColor:'HITAM',bpkbNo:'S 07106659 N',keyNo:'',testNo:'CD 71 C 23010704',personInCharge:'Zaid / OBI',notes:'',address:''},
  {location:'BPN WAREHOUSE',plate:'KT 8177 ZU',owner:'PT.CPA',brand:'HINO',type:'FM8JW2A-XGJ',tonage:'26.000 Kg',vehicleType:'TRONTON',jenis:'MB. BARANG',model:'TRUCK BAK BESI',year:2022,cylinder:'',chassisNo:'MJEFM8JW2NJX10065',engineNo:'J08EWDJ11085',color:'HIJAU',fuel:'SOLAR',plateColor:'KUNING',bpkbNo:'Q 09895036N - Ada',keyNo:'',testNo:'CD 71 C 22009101',personInCharge:'',notes:'',address:''},
  {location:'BERAU',plate:'KT 8469 ZI',owner:'PT.CRA',brand:'MITSUBISHI',type:'L300 PU FB-R (4X2) MT',tonage:'2.540 Kg',vehicleType:'L300',jenis:'MB. BARANG',model:'PICK UP',year:2023,cylinder:'',chassisNo:'MK2L0PUMZPJ004436',engineNo:'4N14UAR1236',color:'HITAM',fuel:'SOLAR',plateColor:'PUTIH',bpkbNo:'V00647471N',keyNo:'',testNo:'',personInCharge:'OPS WH',notes:'',address:''},
  {location:'',plate:'KT 1484 LB',owner:'PT.CPA',brand:'TOYOTA',type:'NEW AVANZA 1.3G MT',tonage:'',vehicleType:'AVANZA',jenis:'MOPEN',model:'MINBUS',year:2012,cylinder:'',chassisNo:'MHKM1BA3JCK032226',engineNo:'DK41792',color:'PUTIH MUTIARA',fuel:'BENSIN',plateColor:'HITAM',bpkbNo:'',keyNo:'',testNo:'',personInCharge:'Ops WH Berau',notes:'',address:''}
];

export const FORKLIFT_SEED: Omit<ForkliftRecord, "id">[] = [
  {location:'BPN',brand:'TCM',serialNo:'FORKLIFT - 30G02141',model:'FD100Z8',truckWeight:'12750 Kg',capacity:'10000 KG',prodYear:2012,owner:'PT.CPA BPN',insuranceStatus:'ASURANSI OK',capacityTon:'10 TON',engineNo:'6BG1298445',policyNo:'029.4050.302.2025.000001.00',premium:16384182,coverageValue:983188800,validTo:'2026-01-10',notes:'PO CPA NO.833/CPA-PO/XII/2024'},
  {location:'BPN',brand:'CATERPILLAR',serialNo:'CT14E-15945',model:'DP30ND',truckWeight:'4650 Kg',capacity:'3000 KG',prodYear:2014,owner:'PT.CPA BPN',insuranceStatus:'ASURANSI OK',capacityTon:'3 TON',engineNo:'',policyNo:'',premium:0,coverageValue:145000000,validTo:'2026-01-10',notes:'PO CPA NO.833/CPA-PO/XII/2024'},
  {location:'PALU',brand:'MITSUBISHI TRUCK',serialNo:'FORKLIFT - CF 18C-30022',model:'FD20ND',truckWeight:'3450 Kg',capacity:'2000 KG',prodYear:2015,owner:'PT.CPA PALU',insuranceStatus:'ASURANSI OK',capacityTon:'2 TON',engineNo:'',policyNo:'',premium:0,coverageValue:258500000,validTo:'2026-01-10',notes:'PO CPA NO.833/CPA-PO/XII/2024'},
  {location:'Makasar',brand:'MITSUBISHI TRUCK',serialNo:'FORKLIFT - CF14E-85152',model:'FD35ND',truckWeight:'5050 Kg',capacity:'3500 KG',prodYear:2015,owner:'PT.CPA MKZ',insuranceStatus:'ASURANSI OK',capacityTon:'3,5 TON',engineNo:'',policyNo:'',premium:0,coverageValue:314074200,validTo:'2026-01-10',notes:'PO CPA NO.833/CPA-PO/XII/2024'},
  {location:'MANADO',brand:'MITSUBISHI TRUCK',serialNo:'FORKLIFT - CF14E-85175',model:'FD35ND',truckWeight:'4780 Kg',capacity:'3500 KG',prodYear:2015,owner:'PT.CPA MDO',insuranceStatus:'ASURANSI OK',capacityTon:'3,5 TON',engineNo:'',policyNo:'',premium:0,coverageValue:314074200,validTo:'2026-01-10',notes:'PO CPA NO.833/CPA-PO/XII/2024'},
  {location:'SAMPIT',brand:'DOOSAN',serialNo:'FDA0D-1230-04925',model:'D 30G',truckWeight:'4460 Kg',capacity:'3000 KG',prodYear:2011,owner:'PT.CPA SPT',insuranceStatus:'',capacityTon:'3 TON',engineNo:'',policyNo:'',premium:0,coverageValue:0,validTo:'',notes:''},
  {location:'BPN',brand:'MITSUBISHI TRUCK',serialNo:'FORKLIFT - CF14J-15114',model:'FD 30PT',truckWeight:'4600 Kg',capacity:'3000 KG',prodYear:2024,owner:'PT.CPA BPN',insuranceStatus:'Leasing',capacityTon:'3 TON',engineNo:'',policyNo:'',premium:0,coverageValue:0,validTo:'',notes:'Leasing'},
  {location:'BPN',brand:'TOYOTA TRUCK',serialNo:'608FDJ35-86457',model:'62-8FD30',truckWeight:'4450 Kg',capacity:'2600 KG',prodYear:2022,owner:'PT. CPA BPN',insuranceStatus:'ASURANSI OK',capacityTon:'2,5 TON',engineNo:'',policyNo:'029.4050.302.2024.000016.00',premium:6068530,coverageValue:366300000,validTo:'2026-02-01',notes:'PO CPA NO.034/CPA-PO/I/2025'},
  {location:'KENDARI',brand:'TOYOTA TRUCK',serialNo:'FN : 608FDJ35-84624 5000 MM',model:'62-8FD30',truckWeight:'4450 Kg',capacity:'2600 KG',prodYear:2022,owner:'PT.CPA KDI',insuranceStatus:'ASURANSI OK',capacityTon:'2,5 TON',engineNo:'',policyNo:'',premium:0,coverageValue:375000000,validTo:'2026-02-01',notes:'PO CPA NO.034/CPA-PO/I/2025'},
  {location:'KENDARI',brand:'TOYOTA TRUCK',serialNo:'FN : 608FDJ35-88522 3000 MM',model:'62-8FD30',truckWeight:'4080 Kg',capacity:'3000 KG',prodYear:2023,owner:'PT.CPA KDI',insuranceStatus:'ASURANSI OK',capacityTon:'3 TON',engineNo:'',policyNo:'029.1050.302.2025.000001.00',premium:3120940,coverageValue:377400000,validTo:'2025-12-27',notes:''},
  {location:'BANJARMASIN',brand:'MITSUBISHI TRUCK',serialNo:'F14E-10450',model:'FD30ND',truckWeight:'4390 Kg',capacity:'-',prodYear:2008,owner:'PT.CPA BJM',insuranceStatus:'Proses',capacityTon:'2,5 TON',engineNo:'',policyNo:'',premium:0,coverageValue:0,validTo:'',notes:'PP 057/CRA/PP/I/2025 PO. 022 Aswata'},
  {location:'BPN',brand:'TCM',serialNo:'FORKLIFT - 2U907522',model:'FD30T3Z',truckWeight:'4510 Kg',capacity:'2900 KG',prodYear:2018,owner:'PT.CPA BPN',insuranceStatus:'',capacityTon:'3 TON',engineNo:'',policyNo:'',premium:0,coverageValue:0,validTo:'',notes:''}
];

export function formatRupiah(num?: number | null): string {
  if (num === undefined || num === null || isNaN(Number(num))) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(num));
}

export function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d);
  if (isNaN(target.getTime())) return null;
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function getFleetDB(): FleetDatabase {
  if (typeof window === "undefined") {
    return { vehicle: [], tax: [], kir: [], insurance: [], forklift: [] };
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        vehicle: Array.isArray(parsed.vehicle) ? parsed.vehicle : [],
        tax: Array.isArray(parsed.tax) ? parsed.tax : [],
        kir: Array.isArray(parsed.kir) ? parsed.kir : [],
        insurance: Array.isArray(parsed.insurance) ? parsed.insurance : [],
        forklift: Array.isArray(parsed.forklift) ? parsed.forklift : [],
      };
    }
  } catch (e) {
    console.error("Error reading fleet DB:", e);
  }

  // Fallback seed
  const vList = VEHICLE_SEED.map((v, i) => ({ ...v, id: `v_${i + 1}`, createdAt: new Date().toISOString() }));
  const fList = FORKLIFT_SEED.map((f, i) => ({ ...f, id: `f_${i + 1}`, createdAt: new Date().toISOString() }));
  const defaultDB: FleetDatabase = {
    vehicle: vList,
    tax: INITIAL_TAX_SEED,
    kir: INITIAL_KIR_SEED,
    insurance: INITIAL_INSURANCE_SEED,
    forklift: fList,
  };

  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(defaultDB));
  } catch (e) {
    console.error("Error writing seed to storage:", e);
  }

  return defaultDB;
}

export function saveFleetDB(data: Partial<FleetDatabase>): FleetDatabase {
  if (typeof window === "undefined") return { vehicle: [], tax: [], kir: [], insurance: [], forklift: [] };
  const current = getFleetDB();
  const updated: FleetDatabase = {
    vehicle: data.vehicle ?? current.vehicle,
    tax: data.tax ?? current.tax,
    kir: data.kir ?? current.kir,
    insurance: data.insurance ?? current.insurance,
    forklift: data.forklift ?? current.forklift,
  };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(updated));
    // Dispatch events to notify other components and tabs
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("fleet_db_updated", { detail: updated }));
  } catch (e) {
    console.error("Error saving fleet DB:", e);
  }
  return updated;
}
