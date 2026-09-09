export type CrystalType = "npc" | "spren" | "location" | "faction-quest";
export type StatusKind = "alive" | "missing" | "dead" | "paused";

export const crystalColor: Record<CrystalType, string> = {
  npc: "var(--crystal-npc)",
  spren: "var(--crystal-spren)",
  location: "var(--crystal-location)",
  "faction-quest": "var(--crystal-faction-quest)",
};

export const statusColor: Record<StatusKind, string> = {
  alive: "var(--status-alive)",
  missing: "var(--status-missing)",
  dead: "var(--status-dead)",
  paused: "var(--status-paused-text)",
};

export const statusDotColor: Record<StatusKind, string> = {
  ...statusColor,
  paused: "var(--status-paused-dot)",
};

export const statusLabel: Record<StatusKind, string> = {
  alive: "Vivo",
  missing: "Desaparecido",
  dead: "Muerto",
  paused: "En pausa",
};

export interface Campaign {
  id: string;
  name: string;
  system: string;
  status: StatusKind;
  meta: string;
  last: string;
}

export const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Shadesmar",
    system: "Cosmere RPG",
    status: "alive",
    meta: "Arco II · 4/7 sesiones",
    last: "hace 13 días",
  },
  {
    id: "c2",
    name: "El Precipicio de Hierro",
    system: "Cosmere RPG",
    status: "paused",
    meta: "Arco I · 2/6 sesiones",
    last: "hace 2 meses",
  },
  {
    id: "c3",
    name: "Los Herederos de Roshar",
    system: "Cosmere RPG",
    status: "alive",
    meta: "Arco III · 6/8 sesiones",
    last: "hace 4 días",
  },
  {
    id: "c4",
    name: "La Última Tormenta",
    system: "Cosmere RPG",
    status: "dead",
    meta: "Arco I · cerrada",
    last: "hace 8 meses",
  },
];

export type QuestStatus = "active" | "completed" | "failed" | "on_hold";

export const questStatusColor: Record<QuestStatus, string> = {
  active: "var(--status-alive)",
  completed: "var(--text-secondary)",
  failed: "var(--status-dead)",
  on_hold: "var(--status-missing)",
};

export const questStatusLabel: Record<QuestStatus, string> = {
  active: "Activa",
  completed: "Completada",
  failed: "Fallida",
  on_hold: "En pausa",
};

export interface Quest {
  id: string;
  campaignId: string;
  name: string;
  hook: string;
  crystal: CrystalType;
  status: QuestStatus;
  priority: 1 | 2 | 3;
}

export const quests: Quest[] = [
  {
    id: "q1",
    campaignId: "c1",
    name: "Sellar la fisura",
    hook: "el Mercado de Esferas se hunde con cada tormenta",
    crystal: "faction-quest",
    status: "active",
    priority: 1,
  },
  {
    id: "q2",
    campaignId: "c1",
    name: "Encontrar al Radiante perdido",
    hook: "los Vigías creen que huyó a Alethkar",
    crystal: "faction-quest",
    status: "on_hold",
    priority: 2,
  },
  {
    id: "q3",
    campaignId: "c1",
    name: "Pagar la deuda de Threnn",
    hook: "esferas infundidas antes de la próxima tormenta",
    crystal: "faction-quest",
    status: "active",
    priority: 2,
  },
  {
    id: "q4",
    campaignId: "c1",
    name: "Rastrear a la Voz Sin Rostro",
    hook: "sin pistas desde que dejó de hablar en sueños",
    crystal: "faction-quest",
    status: "failed",
    priority: 3,
  },
];

export interface Group {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  memberCount: number;
  obsidianPath: string;
}

export const groups: Group[] = [
  {
    id: "g1",
    campaignId: "c1",
    name: "Los Vigías de la Grieta",
    description:
      "Orden que custodia la fisura cognitiva bajo el Mercado de Esferas desde antes de la última alta tormenta.",
    memberCount: 6,
    obsidianPath: "Facciones/Los Vigias de la Grieta.md",
  },
  {
    id: "g2",
    campaignId: "c1",
    name: "Casa Corvain",
    description:
      "Familia mercantil de Kholinar, presta esferas infundidas a interés. Su cabeza murió en la Sesión 7.",
    memberCount: 4,
    obsidianPath: "Facciones/Casa Corvain.md",
  },
  {
    id: "g3",
    campaignId: "c1",
    name: "El Concilio del Muelle",
    description:
      "Consejo informal de fervorosos que administra los templos del distrito portuario.",
    memberCount: 3,
    obsidianPath: "Facciones/El Concilio del Muelle.md",
  },
];

export interface Location {
  id: string;
  campaignId: string;
  name: string;
  locationType: "planet" | "region" | "city" | "site" | "plane";
  parentId?: string;
  description: string;
  obsidianPath: string;
}

export const locations: Location[] = [
  {
    id: "l1",
    campaignId: "c1",
    name: "Roshar",
    locationType: "planet",
    description: "Planeta natal de la campaña.",
    obsidianPath: "Locaciones/Roshar.md",
  },
  {
    id: "l2",
    campaignId: "c1",
    name: "Alethkar",
    locationType: "region",
    parentId: "l1",
    description: "Principado donde transcurre la mayor parte de la trama.",
    obsidianPath: "Locaciones/Alethkar.md",
  },
  {
    id: "l3",
    campaignId: "c1",
    name: "Kholinar",
    locationType: "city",
    parentId: "l2",
    description: "Capital de Alethkar, sede de la Fisura.",
    obsidianPath: "Locaciones/Kholinar.md",
  },
  {
    id: "l4",
    campaignId: "c1",
    name: "Templo del Muelle",
    locationType: "site",
    parentId: "l3",
    description: "Templo de los fervorosos, hogar de Velen.",
    obsidianPath: "Locaciones/Kholinar/Templo del Muelle.md",
  },
  {
    id: "l5",
    campaignId: "c1",
    name: "Mercado de Esferas",
    locationType: "site",
    parentId: "l3",
    description: "Distrito comercial bajo el que se abre la grieta cognitiva.",
    obsidianPath: "Locaciones/Kholinar/Mercado de Esferas.md",
  },
  {
    id: "l6",
    campaignId: "c1",
    name: "Shadesmar",
    locationType: "plane",
    description: "Reflejo cognitivo de Roshar, hogar de los spren.",
    obsidianPath: "Locaciones/Shadesmar.md",
  },
];

export const locationTypeLabel: Record<Location["locationType"], string> = {
  planet: "Planeta",
  region: "Región",
  city: "Ciudad",
  site: "Sitio",
  plane: "Plano",
};

export interface NpcLink {
  role: string;
  npcId: string;
}

export interface Npc {
  id: string;
  campaignId: string;
  name: string;
  role: string;
  description: string;
  crystal: CrystalType;
  crystalLabel: string;
  status: StatusKind;
  statusNote?: string;
  location: string;
  faction: string;
  initials: string;
  obsidianPath: string;
  links?: NpcLink[];
  appearances?: string[];
  relatedQuestIds?: string[];
}

export const npcs: Npc[] = [
  {
    id: "n1",
    campaignId: "c1",
    name: "Velen Tormentaluz",
    role: "Fervoroso del muelle",
    description:
      "Guarda las esferas del templo y las cuentas de la Casa Corvain. Sabe que la fisura respira. Habla en acertijos cuando hay testigos; directo si se le paga en esferas infundidas.",
    crystal: "npc",
    crystalLabel: "Humano",
    status: "alive",
    location: "Kholinar · Templo del Muelle",
    faction: "Los Vigías de la Grieta",
    initials: "VT",
    obsidianPath: "NPCs/Velen Tormentaluz.md",
    links: [
      { role: "VINCULADO", npcId: "n4" },
      { role: "ACREEDOR", npcId: "n3" },
    ],
    appearances: ["S03", "S05", "S06", "S07"],
    relatedQuestIds: ["q1"],
  },
  {
    id: "n2",
    campaignId: "c1",
    name: "Threnn el Contable",
    role: "Guarda las esferas del templo",
    description:
      "Lleva los libros de la Casa Corvain. Le debe favores a Velen y no lo oculta.",
    crystal: "npc",
    crystalLabel: "Humano",
    status: "alive",
    statusNote: "visto en S07 · Mercado de Esferas",
    location: "Kholinar · Mercado de Esferas",
    faction: "Casa Corvain",
    initials: "TC",
    obsidianPath: "NPCs/Threnn el Contable.md",
    links: [{ role: "LE DEBE A", npcId: "n1" }],
    appearances: ["S07"],
    relatedQuestIds: ["q3"],
  },
  {
    id: "n3",
    campaignId: "c1",
    name: "Maestro Corvain",
    role: "Acreedor, deuda impaga",
    description:
      "Cabeza de la Casa Corvain hasta su muerte en S07. Su deuda con Velen sigue sin saldar.",
    crystal: "npc",
    crystalLabel: "Humano",
    status: "dead",
    statusNote: "murió en S07 · el muelle",
    location: "Kholinar",
    faction: "Casa Corvain",
    initials: "MC",
    obsidianPath: "NPCs/Maestro Corvain.md",
    links: [{ role: "DEUDOR DE", npcId: "n1" }],
    appearances: ["S07"],
  },
  {
    id: "n4",
    campaignId: "c1",
    name: "Ishara-nal",
    role: "Spren vinculada a Velen",
    description:
      "Spren de honor vinculada a Velen. El pacto entre ambos no fue revelado al resto del grupo.",
    crystal: "spren",
    crystalLabel: "Spren",
    status: "alive",
    statusNote: "spren · vinculada a Velen",
    location: "Shadesmar",
    faction: "—",
    initials: "IN",
    obsidianPath: "NPCs/Ishara-nal.md",
    links: [{ role: "VINCULADA A", npcId: "n1" }],
  },
  {
    id: "n5",
    campaignId: "c1",
    name: "La Voz Sin Rostro",
    role: "Entidad cognitiva, origen desconocido",
    description:
      "Entidad cognitiva que hablaba a través de sueños. Sin rastro desde la Sesión 5.",
    crystal: "spren",
    crystalLabel: "Ent. cognitiva",
    status: "missing",
    statusNote: "sin rastro desde S05",
    location: "Kholinar",
    faction: "—",
    initials: "VR",
    obsidianPath: "NPCs/La Voz Sin Rostro.md",
    appearances: ["S05"],
    relatedQuestIds: ["q4"],
  },
];

export interface PlayerCharacter {
  id: string;
  campaignId: string;
  playerName: string;
  characterName: string;
  backstory: string;
  progressionNotes: string;
  obsidianPath: string;
}

export const playerCharacters: PlayerCharacter[] = [
  {
    id: "p1",
    campaignId: "c1",
    playerName: "Marina",
    characterName: "Tovash Encendehojas",
    backstory:
      "Ojos claros venida a menos, huyó de su casa antes de que la comprometieran en matrimonio. Guarda un cuchillo de su padre que no explica.",
    progressionNotes:
      "Vinculó un spren de honor en la Sesión 6. Todavía no descubrió su Ideal Segundo.",
    obsidianPath: "Jugadores/Marina/Tovash Encendehojas.md",
  },
  {
    id: "p2",
    campaignId: "c1",
    playerName: "Facu",
    characterName: "Brannt del Muelle",
    backstory:
      "Estibador ojos oscuros, perdió a su hermano en un colapso de esferas años atrás. Desconfía de la nobleza por principio.",
    progressionNotes:
      "Aliado de Velen desde la Sesión 3. Sospecha de Threnn pero no tiene pruebas.",
    obsidianPath: "Jugadores/Facu/Brannt del Muelle.md",
  },
  {
    id: "p3",
    campaignId: "c1",
    playerName: "Ro",
    characterName: "Cifra",
    backstory:
      "Spren de conocimiento con forma casi humana, no recuerda quién fue su vínculo original.",
    progressionNotes:
      "Se unió al grupo en la Sesión 5, después de que La Voz Sin Rostro desapareciera.",
    obsidianPath: "Jugadores/Ro/Cifra.md",
  },
];

export interface SessionEntry {
  n: string;
  date: string;
  text: string;
  tags: string;
}

export interface Arc {
  id: string;
  campaignId: string;
  label: string;
  summary: string;
  meta: string;
  status: StatusKind;
  obsidianPath: string;
  sessions: SessionEntry[];
}

export const arcs: Arc[] = [
  {
    id: "a1",
    campaignId: "c1",
    label: "Arco I · El Naufragio",
    summary:
      "Llegada a Kholinar y primer contacto con los Vigías de la Grieta.",
    meta: "3 sesiones",
    status: "dead",
    obsidianPath: "Arcos/Arco 1 - El Naufragio.md",
    sessions: [
      {
        n: "S01",
        date: "10 may",
        text: "Los PJ llegan a Kholinar tras el naufragio del Wanderjar.",
        tags: "#llegada #kholinar",
      },
      {
        n: "S02",
        date: "24 may",
        text: "Primer contacto con los Vigías de la Grieta.",
        tags: "#vigias #alianza",
      },
      {
        n: "S03",
        date: "07 jun",
        text: "Velen Tormentaluz se une como aliado condicional.",
        tags: "#velen #npc-nuevo",
      },
    ],
  },
  {
    id: "a2",
    campaignId: "c1",
    label: "Arco II · Las Tormentas Menores",
    summary:
      "La grieta cognitiva bajo el Mercado de Esferas se ensancha con cada alta tormenta.",
    meta: "4 de 7 sesiones",
    status: "alive",
    obsidianPath: "Arcos/Arco 2 - Las Tormentas Menores.md",
    sessions: [
      {
        n: "S05",
        date: "13 jul",
        text: "La Voz Sin Rostro desaparece sin dejar rastro.",
        tags: "#misterio",
      },
      {
        n: "S06",
        date: "10 ago",
        text: "Los PJ exploran la grieta cognitiva del Mercado de Esferas.",
        tags: "#grieta #exploracion",
      },
      {
        n: "S07",
        date: "24 ago",
        text: "Los PJ negociaron con Threnn. Maestro Corvain murió en la refriega del muelle.",
        tags: "#threnn #muerte",
      },
    ],
  },
];
