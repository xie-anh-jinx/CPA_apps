"""
Script untuk sinkronisasi dan penyesuaian master data 120 gudang/warehouse.
Memperbarui operational.warehouses di database Analytics dan gudang di Existing DB.
"""
import os
import sys
import psycopg2
from psycopg2.extras import execute_batch

KANTOR_MAP = {
    'HO - Balikpapan': '01',
    'Makasar': '02',
    'Kendari': '03',
    'Manado': '04',
    'Palu': '05',
    'Sampit': '06',
    'Banjarmasin': '07',
    'Mapa': '08'
}

RAW_DATA = """000	DAMAGE	HO - Balikpapan				
001	BALIKPAPAN	HO - Balikpapan	Rino Suhardianto			
Kawasan Industri Kariangau K.M 5,5

Jln. AMD Projakal No.77, Balikpapan 76134

Kalimantan Timur

002	BPN - REGULER	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
Jl. Sultan Hasanuddin, No. 2, RT. 5 Kel. Kariangau, Kec. Balikpapan Barat, Balikpapan 76134, Kalimantan Timur

003	BPN - TCI	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
Jl. Sultan Hasanuddin, No. 2, RT. 5 Kel. Kariangau, Kec. Balikpapan Barat, Balikpapan 76134, Kalimantan Timur

004	BPN - BUMA	HO - Balikpapan	Joyce Nardi Aru Sumomba	RM. Mahmood Iskandar Gufron		
Jl. Sultan Hasanuddin, No. 2, RT. 5 Kel. Kariangau, Kec. Balikpapan Barat, Balikpapan 76134, Kalimantan Timur

005	MAKASSAR	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
Kawasan Industri Parangloe Indah

Natura Cluster I Blok A No. 1, Makasar 90244

Sulawesi Selatan - Indonesia

007	KENDARI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
Jl. Patimura RT.03,RW.01 Komp.Ruko & Pergudangan Puuwuta Bizpark Blok G-9 & 10, Kelurahan Puuwatu, Kec Puuwatu (Samping Gudang PT.Alfa Midi) Kendari – Sulawesi Tenggara| Phone: 0401-3420777

009	PALU	Palu	Alexander Sugiman	Andi Sakti M. Actaviano		
Komplek Pergudangan Palu Indah Jl. R.E Martadinata KM. 5 Blok B-09 Kel. Layana Indah Kec. Mantikulore, Palu - Sulawesi Tengah

010	SAMPIT	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
Jl. Jendral Sudirman KM. 2,1. Samping SPBU KM 2. Sampit, Kalimantan Tengah – Indonesia, | Tel. (0531) 2617115

011	BANJARMASIN	Banjarmasin	Anton Yovie S	I Putu Yudhi Ariartha		
Banjarmasin Branch Komplek Pergudangan Central

Jl. A. Yani KM 13,5 No.99

Banjarmasin

012	AMBON, MALUKU & PAPUA	Mapa	Yan Christian Elkiopas Thyssen	Toar T. Toloh		
013	BITUNG	Manado	Onesimus Destu Simpan	Toar T. Toloh		
Jl. Poros Manado - Bitung

Desa Kauditan 2 Kec. Minahasa - Kab. Minahasa

014	SURABAYA	HO - Balikpapan				
PT. PANCA ADI ANEKA KIMIA ( PANADIA )

Jl. Kalianak Barat No. 59A

Surabaya 60183

Jawa Timur - Indonesia

016	BPN – KONSINYASI MMS MARTABE	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
024	MKSR KONSINYASI PT. ANTAM	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
025	KONSINYASI NHM	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
026	KONSINYASI PARAMA MURTI SITE OBI	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
027	KONSINYASI GETSEMANI SITE SEPO	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
028	KONSINYASI GETSEMANI SITE SMINGIT	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
029	KONSINYASI PARAMA MURTI SITE WAWONI	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
030	KONSINYASI TJAKRINDO	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
031	KONSINYASI ONE HOSE GORONTALO	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
032	KONSINYASI PT.HARMONIS	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
033	KONSINYASI SMA GAG	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
034	KONSINYASI BCI WAIPIRIT	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
035	KONSINYASI GETSEMANI SITE LANGKIKIMAN	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
036	KONSINYASI PT. SEMEN TONASA	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
037	KONSINYASI PARAMA GRUP SITE KETAPANG	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
038	KONSINYASI SMA WEDA	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
039	BPN - CPA 03	Sampit	Joyce Nardi Aru Sumomba	I Putu Yudhi Ariartha		
Jl. Sultan Hasanuddin, No. 2, RT. 5 Kel. Kariangau, Kec. Balikpapan Barat, Balikpapan 76134, Kalimantan Timur

040	BITUNG-DAMAGE	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
041	KENDARI-CPA01	Manado	Hermanto Tambing	Toar T. Toloh		
042	KONSINYASI STM MOROWALI	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
043	KONSINYASI STM WEDA	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
044	KONSINYASI SKM GEBE	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
045	MAKASSAR-DAMAGE	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
046	BPN – KONSINYASI MMS DOMPU (STM)	HO - Balikpapan	Joyce Nardi Aru Sumomba	Toar T. Toloh	+625427588275	
047	BITUNG - CPA 02	Makasar	Daniel Rainier Edward Selanno	Andi Sakti M. Actaviano		
048	BITUNG - CPA 03	Sampit	Daniel Rainier Edward Selanno	I Putu Yudhi Ariartha		
049	SAMPIT - CPA 01	Manado	Slamet Mulyadi	Toar T. Toloh		
050	BPN - CPA02	Makasar	Joyce Nardi Aru Sumomba	Andi Sakti M. Actaviano		
051	WORKSHOP - BPN	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
052	PINJAMAN SHELL - BPN	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
053	WORKSHOP - MKS	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
054	PINJAMAN SHELL - MKS	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
055	WORKSHOP - KENDARI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
056	PINJAMAN SHELL - KENDARI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
057	WORKSHOP - BITUNG	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
058	PINJAMAN SHELL - BITUNG	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
059	WORKSHOP - PALU	Palu	Alexander Sugiman	Andi Sakti M. Actaviano		
060	PINJAMAN SHELL - PALU	Palu	Alexander Sugiman	Andi Sakti M. Actaviano		
061	WORKSHOP - SAMPIT	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
062	PINJAMAN SHELL - SAMPIT	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
063	WORKSHOP - BANJARMASIN	Banjarmasin	Anton Yovie S	I Putu Yudhi Ariartha		
064	PINJAMAN SHELL - BANJARMASIN	Banjarmasin	Anton Yovie S	I Putu Yudhi Ariartha		
065	WORKSHOP - AMBON	Mapa	Yan Christian Elkiopas Thyssen	Toar T. Toloh		
066	PINJAMAN SHELL - AMBON	Mapa	Yan Christian Elkiopas Thyssen	Toar T. Toloh		
067	KIMU JKT	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
068	KONSINYASI PT BORNEO PRIMA - CPA 03	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
Sampit

069	SAMPIT-DAMAGE	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
070	GUDANG KONSINYASI TRACON INDUSTRY	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
071	KONSINYASI PT. SMA BAKAN	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
072	KONSINYASI ANAGA JAYA SARANA - TUHUP	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
073	PALU - CPA 01	Manado	Alexander Sugiman	Toar T. Toloh		
074	PALU - CPA 02	Makasar	Alexander Sugiman	Andi Sakti M. Actaviano		
075	PALU - CPA 03	Sampit	Alexander Sugiman	I Putu Yudhi Ariartha		
076	PALU-DAMAGE	Palu	Alexander Sugiman	Andi Sakti M. Actaviano		
077	BANJARMASIN-DAMAGE	Banjarmasin	Anton Yovie S	I Putu Yudhi Ariartha		
078	BPN - PSS	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
Jl. Sultan Hasanuddin, No. 2, RT. 5 Kel. Kariangau, Kec. Balikpapan Barat, Balikpapan 76134, Kalimantan Timur

079	KONSINYASI PT. VALE INDONESIA - KENDARI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano	0401-3420777	
080	KONSINYASI PT. ADARO INDONESIA	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
081	KONSINYASI PT. KPC SANGATTA	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
082	KONSINYASI PT. BERAU COAL	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
083	KONSINYASI PT SIS ADARO	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
084	KONSINYASI PT. BUMA ADARO	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
085	KONSINYASI PT. BUMA LATI	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
086	KONSINYASI PT. BUMA BINUNGAN	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
087	KONSINYASI PT. BUMA IPR	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
088	KONSINYASI PT. BUMA TABANG	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
089	KONSINYASI PT. BUMA KIDECO	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
090	KONSINYASI PT. BUMA KIDECO RANTIK	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
091	KONSINYASI PT. BUMA KIDECO SAMRANGA	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
092	KONSINYASI PT. THIES KIDECO	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati	0542-7588276	
093	KONSINYASI PT. THIESS SANGATTA	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati	0542-7588276	
094	KONSINYASI PT. SAPTAINDRA SEJATI (SIS) - ADM	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
095	KONSINYASI PT. SAPTAINDRA SEJATI (SIS) - ADO	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
096	KONSINYASI PT. KIDECO JAYA AGUNG	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
097	KONSINYASI PT. ARUTMIN INDONESIA	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
098	KONSINYASI PT. KALTIM PRIMA COAL	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
099	GUDANG SEMENTARA - BPN	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
100	KONSINYASI PT. VALE INDONESIA - SOROWAKO	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano	0401-3420777	
101	KONSINYASI PT. VALE INDONESIA - POMALAA	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano	0401-3420777	
102	KONSINYASI PT. VALE INDONESIA - MOROWALI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
103	KONSINYASI PT. ANTAM - POMALAA	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
104	KONSINYASI PT. VDNI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
105	KONSINYASI PT. OSS	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
106	KONSINYASI PT. BINTANG DELAPAN MINERAL	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
107	KONSINYASI PT. HENGJAYA MINERALINDO	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
108	KONSINYASI PT. WANATIARA PERSADA	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
109	KONSINYASI PT. HARITA NICKEL	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
110	KONSINYASI PT. FIRST PACIFIC MINING	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
111	KONSINYASI PT. COR INDUSTRI INDONESIA	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
112	KONSINYASI PT. GUNBUSTER NICKEL INDUSTRY	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
113	KONSINYASI PT. HUADI NICKEL ALLOY INDONESIA	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
114	GUDANG TRANSIT - BITUNG	Manado	Daniel Rainier Edward Selanno	Toar T. Toloh		
115	GUDANG TRANSIT - MAKASSAR	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
116	GUDANG TRANSIT - KENDARI	Kendari	Hermanto Tambing	Andi Sakti M. Actaviano		
117	GUDANG TRANSIT - PALU	Palu	Alexander Sugiman	Andi Sakti M. Actaviano		
118	GUDANG TRANSIT - SAMPIT	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha		
119	GUDANG TRANSIT - BANJARMASIN	Banjarmasin	Anton Yovie S	I Putu Yudhi Ariartha		
120	GUDANG TRANSIT - AMBON	Mapa	Yan Christian Elkiopas Thyssen	Toar T. Toloh		
121	GUDANG DEMO - BPN	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
122	KONSINYASI PT. BUMA TABANG 2	Sampit	Slamet Mulyadi	I Putu Yudhi Ariartha	0531-2617115	
123	PT. BUMA SITE BINUNGAN 2	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati	0542-5461800	
124	KONSINYASI PT. BUMA IPR 2	HO - Balikpapan	Joyce Nardi Aru Sumomba	Emy Yuliati		
125	MACMAHON - BALIKPAPAN	HO - Balikpapan	Andi Sakti M. Actaviano	RM. Mahmood Iskandar Gufron		
Jl. Sultan Hasanuddin, No. 2, RT. 5 Kel. Kariangau, Kec. Balikpapan Barat, Balikpapan 76134, Kalimantan Timur

126	KONSINYASI MAKKURAGA - MOROWALI	Makasar	Hermanto Tambing	Andi Sakti M. Actaviano		
Ganda - ganda, Kec Petasia, Kabupaten Morowali, Sulawesi Tengah 94971

127	KONSINYASI MAKKURAGA - PATTENE	Makasar	Ratih Yulianti	Andi Sakti M. Actaviano		
Pabbentengang, Kec. Marusu, Kab Maros Sulawesi Selatan 90552

128	PROMO - SOFIFI	Manado	Yohanes Montolalu	Toar T. Toloh		
129	SOFIFI - CPA02	Palu	Yohanes Montolalu	Toar T. Toloh		
"""

def parse_data(raw_text):
    entries = []
    lines = raw_text.strip().split('\n')
    cur = None
    for line in lines:
        parts = line.split('\t')
        if len(parts) >= 2 and parts[0].strip().isdigit() and len(parts[0].strip()) == 3:
            if cur:
                entries.append(cur)
            cur = {
                'id_gudang': parts[0].strip(),
                'nama_gudang': parts[1].strip(),
                'kantor': parts[2].strip() if len(parts) > 2 else '',
                'kontak_person': parts[3].strip() if len(parts) > 3 else '',
                'dsm': parts[4].strip() if len(parts) > 4 else '',
                'telpon': parts[5].strip() if len(parts) > 5 else '',
                'alamat': parts[6].strip() if len(parts) > 6 else ''
            }
        elif cur:
            if line.strip():
                if cur['alamat']:
                    cur['alamat'] += '\n' + line.strip()
                else:
                    cur['alamat'] = line.strip()
    if cur:
        entries.append(cur)
    return entries

def main():
    entries = parse_data(RAW_DATA)
    print(f"Total entries parsed: {len(entries)}")
    if len(entries) != 120:
        print(f"ERROR: Expected 120 entries, got {len(entries)}")
        sys.exit(1)

    # 1. Connect to cpa_analytics DB
    analytics_conn = psycopg2.connect(
        host="cpa_db_analytics",
        port=5432,
        dbname="cpa_analytics",
        user="cpa_admin",
        password="cpa_secure_2024"
    )
    analytics_cur = analytics_conn.cursor()

    # Upsert into operational.warehouses
    analytics_sql = """
    INSERT INTO operational.warehouses (
        id_gudang, nama_gudang, id_kantor, nama_kantor,
        kontak_person, dsm, telpon, alamat, is_active, synced_at
    ) VALUES (
        %(id_gudang)s, %(nama_gudang)s, %(id_kantor)s, %(nama_kantor)s,
        %(kontak_person)s, %(dsm)s, %(telpon)s, %(alamat)s, true, NOW()
    ) ON CONFLICT (id_gudang) DO UPDATE SET
        nama_gudang = EXCLUDED.nama_gudang,
        id_kantor = EXCLUDED.id_kantor,
        nama_kantor = EXCLUDED.nama_kantor,
        kontak_person = EXCLUDED.kontak_person,
        dsm = EXCLUDED.dsm,
        telpon = EXCLUDED.telpon,
        alamat = EXCLUDED.alamat,
        is_active = EXCLUDED.is_active,
        synced_at = NOW();
    """

    analytics_params = []
    for e in entries:
        id_kantor = KANTOR_MAP.get(e['kantor'], '')
        analytics_params.append({
            'id_gudang': e['id_gudang'],
            'nama_gudang': e['nama_gudang'],
            'id_kantor': id_kantor,
            'nama_kantor': e['kantor'],
            'kontak_person': e['kontak_person'],
            'dsm': e['dsm'],
            'telpon': e['telpon'],
            'alamat': e['alamat']
        })

    execute_batch(analytics_cur, analytics_sql, analytics_params)
    analytics_conn.commit()

    analytics_cur.execute("SELECT count(*) FROM operational.warehouses;")
    total_wh = analytics_cur.fetchone()[0]
    print(f"Successfully upserted into operational.warehouses! Total rows now: {total_wh}")

    # 2. Update existing DB cpa_existing.gudang
    try:
        existing_conn = psycopg2.connect(
            host="cpa_db_existing",
            port=5432,
            dbname="cpa_existing",
            user="postgres",
            password="postgres123"
        )
        existing_cur = existing_conn.cursor()
        existing_sql = """
        UPDATE gudang SET
            gudang = %(nama_gudang)s,
            id_kantor = %(id_kantor)s,
            telpon = %(telpon)s,
            alamat = %(alamat)s
        WHERE id_gudang = %(id_gudang)s;
        """
        execute_batch(existing_cur, existing_sql, analytics_params)
        existing_conn.commit()
        print("Successfully updated existing DB gudang table!")
        existing_conn.close()
    except Exception as ex:
        print(f"Note on existing DB update: {ex}")

    analytics_conn.close()
    print("ALL DONE!")

if __name__ == "__main__":
    main()

