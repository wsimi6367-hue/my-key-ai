// Référentiel géographique : les 14 communes du District d'Abidjan (Commune > Zone > Quartier),
// puis les autres villes (Ville > Ville > Quartier ; dans le Sheet, Commune = Zone = Ville).
// Identique à l'onglet « Quartiers » du Google Sheet. À tenir synchronisé.
export const GEO = {
  "Cocody": {
    "Cocody Centre": [
      "Cocody Centre",
      "Ambassades",
      "Danga",
      "Cité des Arts",
      "Blockhaus",
      "Mermoz",
      "Saint-Jean",
      "Cocody Village",
      "Cité Universitaire"
    ],
    "Deux-Plateaux": [
      "Vallon",
      "ENA",
      "Rue des Jardins",
      "Aghien",
      "Sideci",
      "Latrille",
      "Zoo",
      "Les Perles",
      "Dokui"
    ],
    "Angré": [
      "Angré Château",
      "Angré 7e Tranche",
      "Angré 8e Tranche",
      "Angré 9e Tranche",
      "Angré Djibi",
      "Angré Les Oscars",
      "Angré Star",
      "Angré Cité Latrille (Manguiers)",
      "Angré CNPS",
      "Angré Petro Ivoire"
    ],
    "Riviera": [
      "Riviera 1",
      "Riviera 2",
      "Riviera 3",
      "Riviera 4",
      "Riviera Golf",
      "Riviera M'Badon",
      "Riviera Bonoumin",
      "Riviera Attoban",
      "Riviera Allabra",
      "Riviera Triangle",
      "Riviera Anono",
      "Riviera Palmeraie",
      "Palmeraie Extension",
      "Beverly Hills"
    ],
    "Faya": [
      "Riviera Faya",
      "Génie 2000",
      "Cité SIR",
      "Abatta",
      "Akouédo"
    ],
    "Est Cocody": [
      "M'Pouto",
      "Djorogobité 1",
      "Djorogobité 2",
      "Sicogi Espérance",
      "Anono Village",
      "Bonoumin Village"
    ]
  },
  "Abobo": {
    "Abobo Centre": [
      "Abobo Gare",
      "Abobo Mairie",
      "Abobo Baoulé",
      "Abobo Té",
      "Samaké",
      "Kennedy",
      "Habitat",
      "Sogefiha",
      "Belleville"
    ],
    "Abobo Nord": [
      "PK 18",
      "N'Dotré",
      "Akeikoi",
      "Anonkoua-Kouté",
      "Clouetcha",
      "Agbékoi",
      "Biabou"
    ],
    "Abobo Sud / Est": [
      "Avocatier",
      "Sagbé",
      "Plateau Dokui",
      "Abobo Derrière Rail",
      "Abobo Banco"
    ]
  },
  "Adjamé": {
    "Adjamé": [
      "Adjamé Village",
      "Williamsville",
      "220 Logements",
      "Liberté",
      "Bracodi",
      "Mairie",
      "Paillet",
      "Dallas",
      "Renault",
      "Habitat Extension",
      "Fraternité",
      "Mirador"
    ]
  },
  "Attécoubé": {
    "Attécoubé": [
      "Attécoubé Centre",
      "Locodjro",
      "Abobo-Doumé",
      "Santé",
      "Agban",
      "Boribana",
      "Jérusalem",
      "Mossikro",
      "Sébroko",
      "Cité Fairmont"
    ]
  },
  "Koumassi": {
    "Koumassi": [
      "Koumassi Centre",
      "Remblais",
      "Grand Campement",
      "Divo",
      "Sicogi",
      "Prodomo",
      "Soweto",
      "Aklomiabla",
      "Cité Inchallah",
      "Zone Industrielle"
    ]
  },
  "Marcory": {
    "Marcory": [
      "Zone 4",
      "Biétry",
      "Marcory Résidentiel",
      "Anoumabo",
      "Remblais",
      "Hibiscus",
      "Sans-Fil",
      "Champroux",
      "Konan Raphaël",
      "Marcory Centre"
    ]
  },
  "Plateau": {
    "Plateau": [
      "Plateau Centre",
      "Cité Administrative",
      "Indénié",
      "Plateau Corniche / Lagune"
    ]
  },
  "Port-Bouët": {
    "Port-Bouët": [
      "Port-Bouët Centre",
      "Vridi",
      "Vridi Cité",
      "Gonzagueville",
      "Jean Folly",
      "Derrière Wharf",
      "Adjouffou",
      "Anani",
      "Aéroport",
      "Phare",
      "Abouabou",
      "Zimbabwe"
    ]
  },
  "Treichville": {
    "Treichville": [
      "Treichville Centre (Avenues)",
      "Biafra",
      "Arras",
      "Belleville",
      "Zone 2",
      "Zone 3",
      "Habitat",
      "Sicogi"
    ]
  },
  "Yopougon": {
    "Yopougon Attié": [
      "Sicogi",
      "Andokoi",
      "Yopougon Gare",
      "Selmer",
      "Wassakara"
    ],
    "Banco Nord": [
      "GFCI",
      "Sopim",
      "Nouveau Quartier",
      "Banco II",
      "Millionnaire"
    ],
    "Banco Sud": [
      "Toits Rouges",
      "Petit Toit Rouge",
      "Sideci",
      "Quartier Maroc",
      "Siporex"
    ],
    "Kouté": [
      "Kouté Village",
      "Camp Militaire",
      "Sogefiha Kouté",
      "Ananeraie"
    ],
    "Zone Industrielle": [
      "Zone Industrielle",
      "Gesco",
      "Koweït"
    ],
    "Hôpital": [
      "Mamie Adjoua",
      "Mamie Faitai",
      "Lem",
      "Phénix"
    ],
    "Niangon Nord": [
      "Niangon Nord",
      "Port-Bouët 2",
      "Niangon Sud à gauche",
      "Azito",
      "Béago"
    ],
    "Niangon Sud": [
      "Niangon Sud à droite",
      "Niangon Sud Sicogi",
      "Niangon Lokoa",
      "Cité Verte",
      "Lièvre Rouge",
      "Niangon Adjamé",
      "Adiopodoumé"
    ]
  },
  "Anyama": {
    "Anyama": [
      "Anyama Centre",
      "Anyama Ébrié",
      "Anyama Adjamé",
      "Belleville",
      "Thomasset",
      "Attinguié",
      "Ahoué"
    ]
  },
  "Bingerville": {
    "Bingerville": [
      "Bingerville Centre",
      "Akandjé",
      "Feh Kessé",
      "Gbagba",
      "Adjamé-Bingerville",
      "Santé",
      "Eloka",
      "Cité Green City"
    ]
  },
  "Songon": {
    "Songon": [
      "Songon Agban",
      "Songon Kassemblé",
      "Songon M'Brathé",
      "Songon Dagbé",
      "Songon Té",
      "Songon Village"
    ]
  },
  "Brofodoumé": {
    "Brofodoumé": [
      "Brofodoumé Centre"
    ]
  },
  "Grand-Bassam": {
    "Grand-Bassam": [
      "Quartier France",
      "Impérial",
      "Moossou",
      "Azuretti",
      "Mondoukou",
      "Centre-ville"
    ]
  },
  "Assinie": {
    "Assinie": [
      "Assinie-Mafia",
      "Assinie-France",
      "Assouindé",
      "Centre-ville"
    ]
  },
  "Bonoua": {
    "Bonoua": [
      "Centre-ville"
    ]
  },
  "Jacqueville": {
    "Jacqueville": [
      "Centre-ville"
    ]
  },
  "Dabou": {
    "Dabou": [
      "Centre-ville"
    ]
  },
  "Sikensi": {
    "Sikensi": [
      "Centre-ville"
    ]
  },
  "Yamoussoukro": {
    "Yamoussoukro": [
      "Habitat",
      "Morofé",
      "Dioulabougou",
      "N'Zuessy",
      "Assabou",
      "Kokrénou",
      "220 Logements",
      "Millionnaire",
      "Centre-ville"
    ]
  },
  "Fresco": {
    "Fresco": [
      "Centre-ville"
    ]
  },
  "Sassandra": {
    "Sassandra": [
      "Centre-ville"
    ]
  },
  "San-Pédro": {
    "San-Pédro": [
      "Bardot",
      "Cité",
      "Lac",
      "Séwéké",
      "Balmer",
      "Centre-ville"
    ]
  },
  "Bouaké": {
    "Bouaké": [
      "Commerce",
      "Koko",
      "Air France",
      "Belleville",
      "Dar-Es-Salam",
      "Kennedy",
      "Nimbo",
      "Ahougnansou",
      "Centre-ville"
    ]
  },
  "Korhogo": {
    "Korhogo": [
      "Centre-ville"
    ]
  }
};
