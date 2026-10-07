const BASE = process.env.BASE ?? "http://localhost:8080/api";
let cookie = "";

async function api(path, method = "GET", data) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok)
    throw new Error(`${method} ${path} ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

await api("/admin/login", "POST", { token: process.env.ADMIN_TOKEN });

async function campaign(data) {
  const all = await api("/campaigns");
  return (
    all.find((c) => c.name === data.name) ?? api("/campaigns", "POST", data)
  );
}

for (const extra of [
  {
    name: "Las brasas de Karsk",
    system: "Pathfinder 2e",
    description: "Una ciudad minera que se quema por dentro.",
    status: "paused",
  },
  {
    name: "Crónicas del Velo",
    system: "Cosmere RPG",
    description: "Cinco viajeros entre mundos que no deberían tocarse.",
    status: "finished",
  },
]) {
  const c = await campaign(extra);
  if (c.status !== extra.status)
    await api(`/campaigns/${c.id}`, "PUT", { ...extra, vault_path: "" });
}

const camp = await campaign({
  name: "La luz de Valdris",
  system: "D&D 5e",
  description: "Un puerto que vive de su faro, y alguien que quiere apagarlo.",
  status: "active",
});
const C = `/campaigns/${camp.id}`;
const existing = await api(`${C}/npcs`);
if (existing?.length) {
  console.log("La luz de Valdris ya tiene datos, no se vuelve a sembrar");
  process.exit(0);
}

const loc = {};
for (const [name, location_type, parent, description] of [
  [
    "Valdris",
    "city",
    null,
    "Puerto amurallado sobre un acantilado. Vive del comercio de aceite de ballena y de la luz de su faro, que guía a los barcos entre los arrecifes de la Garganta.",
  ],
  [
    "El faro de Valdris",
    "site",
    "Valdris",
    "Torre de piedra negra con una lámpara alquímica que nunca se apagó en trescientos años. Ahora titila.",
  ],
  [
    "Puerto Gris",
    "site",
    "Valdris",
    "Muelles, tabernas y almacenes de la casa Ashmoor. Aquí se compra todo, incluidas las lealtades.",
  ],
  [
    "Mansión Ashmoor",
    "site",
    "Valdris",
    "Casa noble en lo alto de la ciudad. Desde la muerte del viejo lord, Teodric gobierna con prisa.",
  ],
  [
    "Arrecifes de la Garganta",
    "region",
    null,
    "Kilómetros de roca afilada bajo el agua. Sin el faro, ningún barco entra a Valdris de noche.",
  ],
]) {
  const l = await api(`${C}/locations`, "POST", {
    name,
    location_type,
    parent_location_id: parent ? loc[parent] : null,
    description,
    notes: "",
  });
  loc[name] = l.id;
}

const groups = {};
for (const [name, alineacion, description] of [
  [
    "Casa Ashmoor",
    "Ambicioso",
    "Dueños de los almacenes de aceite. Si el faro se apaga, el puerto queda a su merced.",
  ],
  [
    "Hermandad de la Marea",
    "Leal",
    "Sacerdotes que cuidan la lámpara del faro y llevan la cuenta de cada barco que entra.",
  ],
  [
    "Los Barqueros",
    "Neutral",
    "Contrabandistas que conocen pasos entre los arrecifes que no figuran en ningún mapa.",
  ],
]) {
  groups[name] = (
    await api(`${C}/groups`, "POST", {
      name,
      alineacion,
      description,
      notes: "",
    })
  ).id;
}

const arcOld = await api(`${C}/arcs`, "POST", {
  name: "La niebla del puerto",
  order: 1,
  status: "cerrado",
  summary:
    "El grupo llega a Valdris y descubre que los naufragios de la temporada no fueron accidentes.",
});
const arc = await api(`${C}/arcs`, "POST", {
  name: "La luz que se apaga",
  order: 2,
  status: "en_curso",
  summary: "Evitar que la casa Ashmoor tome el faro.",
});

const npc = {};
for (const n of [
  [
    "Brannoc el Ciego",
    "Cartógrafo",
    "vivo",
    "Puerto Gris",
    "Dibujó los arrecifes de memoria después de perder la vista en un naufragio. Vende mapas a quien pague, incluso a los Ashmoor.",
  ],
  [
    "Capitán Oldric Fen",
    "Capitán de la guardia portuaria",
    "vivo",
    "Puerto Gris",
    "Honesto, cansado y con deudas. La casa Ashmoor le paga el sueldo desde que el consejo vació las arcas.",
  ],
  [
    "El Barquero",
    null,
    "activo",
    "Arrecifes de la Garganta",
    "Nadie sabe su nombre. Cruza los arrecifes de noche, sin luz, y cobra en secretos.",
  ],
  [
    "Hermana Ilsa Draeven",
    "Sacerdotisa de la marea",
    "vivo",
    "El faro de Valdris",
    "Guardiana de la lámpara. Desconfía del grupo, pero más de Teodric.",
  ],
  [
    "Isolde Wren",
    "Alquimista",
    "vivo",
    "El faro de Valdris",
    "Prepara el aceite que alimenta la lámpara. Le faltan ingredientes y no sabe quién se los lleva.",
  ],
  [
    "Teodric Ashmoor",
    "Heredero de la casa Ashmoor",
    "vivo",
    "Mansión Ashmoor",
    "Encantador en público, impaciente en privado. Quiere el faro para cobrar peaje a cada barco.",
  ],
  [
    "Maren Voss",
    "Escribana del consejo",
    "desaparecido",
    "Valdris",
    "Quemó una carta la noche que desapareció. Los guardias dicen que se fue en una barca sin luz.",
  ],
  [
    "Lord Aldous Ashmoor",
    "Antiguo señor de la casa",
    "muerto",
    "Mansión Ashmoor",
    "Murió de fiebre, según su hijo. El médico que firmó el certificado se mudó al día siguiente.",
  ],
]) {
  const [name, rol, status, where, body] = n;
  const created = await api(`${C}/npcs`, "POST", {
    name,
    npc_kind: "npc",
    detail_level: "full",
    status,
    rol,
    location_id: loc[where],
    description: body,
    notes: "",
    attributes: {},
    skills: {},
  });
  npc[name] = created.id;
}

const quest = {};
for (const [title, description, status, priority] of [
  [
    "El aceite del faro",
    "Encontrar quién roba los ingredientes de Isolde antes de que el faro se apague.",
    "active",
    5,
  ],
  [
    "El veneno del banquete",
    "Probar que Teodric envenenó a su padre.",
    "active",
    4,
  ],
  [
    "La carta de Maren",
    "Averiguar qué decía la carta que Maren quemó.",
    "active",
    3,
  ],
  [
    "Los naufragios de otoño",
    "Descubrir quién movió las boyas de la Garganta.",
    "completed",
    2,
  ],
]) {
  quest[title] = (
    await api(`${C}/quests`, "POST", {
      title,
      description,
      status,
      priority,
      notes: "",
    })
  ).id;
}

const pcs = [];
for (const [player_name, character_name, race, clazz, hp] of [
  ["Fer", "Lyra Vance", "Semielfa", "Barda", [24, 31]],
  ["Lulu", "Tobias Crane", "Humano", "Clérigo de la Tormenta", [38, 38]],
  ["Dani", "Kael Morrow", "Tiefling", "Pícaro", [19, 27]],
]) {
  pcs.push(
    await api(`${C}/player-characters`, "POST", {
      player_name,
      character_name,
      race,
      class: clazz,
      status: "vivo",
      backstory: "",
      progression_notes: "",
      attributes: {},
      skills: {},
      current_hp: hp[0],
      max_hp: hp[1],
    }),
  );
}

const sessions = [];
for (const [num, arcId, date, summary] of [
  [
    1,
    arcOld.id,
    "2026-08-08",
    "Llegada a Valdris\n\nEl barco del grupo casi se estrella en la Garganta. El Barquero los guía a puerto a cambio de un favor.",
  ],
  [
    2,
    arcOld.id,
    "2026-08-22",
    "Boyas movidas\n\nBrannoc les muestra que las boyas de los arrecifes no están donde deberían.",
  ],
  [
    3,
    arc.id,
    "2026-09-05",
    "El banquete\n\nTeodric celebra su herencia. Ilsa advierte que la lámpara titila desde la muerte del viejo lord.",
  ],
  [
    4,
    arc.id,
    "2026-09-19",
    "La escribana\n\nMaren desaparece. En su chimenea, restos de una carta con el sello del consejo.",
  ],
  [
    5,
    arc.id,
    "2026-10-03",
    "El aceite que falta\n\nIsolde descubre que le faltan tres frascos de esencia de ámbar. La lámpara aguanta una semana, como mucho.",
  ],
]) {
  sessions.push(
    await api(`${C}/sessions`, "POST", {
      arc_id: arcId,
      session_number: num,
      sub_number: 0,
      session_type: "session",
      date,
      summary,
      prep_notes: "",
    }),
  );
}
const last = sessions.at(-1);
for (const name of [
  "Isolde Wren",
  "Hermana Ilsa Draeven",
  "Teodric Ashmoor",
  "Capitán Oldric Fen",
]) {
  await api(`/sessions/${last.id}/npcs`, "POST", { npc_id: npc[name] });
}
for (const title of ["El aceite del faro", "El veneno del banquete"]) {
  await api(`/sessions/${last.id}/quests`, "POST", { quest_id: quest[title] });
}

const enc = await api(`${C}/encounters`, "POST", {
  name: "Emboscada en el faro",
  session_id: last.id,
  status: "activo",
  round: 2,
});
for (const [i, pc] of pcs.entries()) {
  await api(`/encounters/${enc.id}/participants`, "POST", {
    pc_id: pc.id,
    initiative_value: [17, 12, 21][i],
    current_hp: pc.current_hp,
    max_hp: pc.max_hp,
  });
}
for (const [name, init, hp] of [
  ["Matón de Ashmoor", 14, [11, 16]],
  ["Matón de Ashmoor", 9, [16, 16]],
]) {
  await api(`/encounters/${enc.id}/participants`, "POST", {
    display_name: name,
    initiative_value: init,
    current_hp: hp[0],
    max_hp: hp[1],
  });
}

console.log("OK", camp.id);
