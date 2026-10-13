import zlib from "node:zlib";

const BASE = process.env.BASE ?? "http://localhost:8080/api";
let cookie = "";

async function raw(path, method = "GET", body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { cookie, ...headers },
    body,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok)
    throw new Error(`${method} ${path} ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? (JSON.parse(text) ?? []) : null;
}
const api = (path, method = "GET", data) =>
  raw(
    path,
    method,
    data === undefined ? undefined : JSON.stringify(data),
    data === undefined ? {} : { "content-type": "application/json" },
  );

function crc32(buf) {
  let c,
    crc = ~0;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}
function png([r, g, b], w = 96, h = 96) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    rows[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const t = (x + y) / (w + h);
      rows[o] = Math.round(r * (0.4 + t * 0.6));
      rows[o + 1] = Math.round(g * (0.4 + t * 0.6));
      rows[o + 2] = Math.round(b * (0.4 + t * 0.6));
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function image(entity, id, color) {
  const form = new FormData();
  form.append("file", new Blob([png(color)], { type: "image/png" }), "x.png");
  await raw(`/${entity}/${id}/image`, "POST", form);
}

await api("/admin/login", "POST", { token: process.env.ADMIN_TOKEN });

const created = [];
function log(msg) {
  created.push(msg);
}

async function ensure(listPath, nameKey, items, build, createPath) {
  const existing = await api(listPath);
  const byName = new Map((existing ?? []).map((e) => [e[nameKey], e]));
  const out = {};
  for (const item of items) {
    const name = item[nameKey] ?? item.name;
    let e = byName.get(name);
    if (!e) {
      e = await api(createPath ?? listPath, "POST", build(item));
      log(`${createPath ?? listPath}: ${name}`);
    }
    out[name] = e;
  }
  return out;
}

async function seedCampaign(C, w) {
  const ids = { arc: {}, loc: {}, group: {}, npc: {}, pc: {}, quest: {}, lore: {}, session: {}, currency: {}, item: {} };

  const fill = async (map, path, nameKey) => {
    for (const e of (await api(`${C}${path}`)) ?? []) map[e[nameKey]] = e.id;
  };
  await fill(ids.arc, "/arcs", "title");
  await fill(ids.loc, "/locations", "name");
  await fill(ids.group, "/groups", "name");
  await fill(ids.npc, "/npcs", "name");
  await fill(ids.pc, "/player-characters", "character_name");
  await fill(ids.quest, "/quests", "title");
  await fill(ids.lore, "/lore", "title");
  await fill(ids.currency, "/currencies", "name");
  await fill(ids.item, "/items", "name");
  for (const s of (await api(`${C}/sessions`)) ?? [])
    if (s.session_type !== "oneshot")
      ids.session[`${s.session_number}.${s.sub_number}`] = s.id;

  for (const t of w.npcTypes ?? []) {
    const have = await api(`${C}/npc-types`);
    if (!have.some((x) => x.label === t.label))
      await api(`${C}/npc-types`, "POST", t);
  }
  for (const t of w.loreCategories ?? []) {
    const have = await api(`${C}/lore-categories`);
    if (!have.some((x) => x.label === t.label))
      await api(`${C}/lore-categories`, "POST", t);
  }
  const npcTypes = Object.fromEntries(
    (await api(`${C}/npc-types`)).map((t) => [t.label, t.key]),
  );
  const loreCats = Object.fromEntries(
    (await api(`${C}/lore-categories`)).map((c) => [c.label, c.id]),
  );

  if (w.wardails) await api(`${C}/wardails`, "PUT", { wardails: w.wardails });

  Object.assign(
    ids.arc,
    Object.fromEntries(
    Object.entries(
      await ensure(
        `${C}/arcs`,
        "title",
        w.arcs ?? [],
        (a) => ({
          name: a.title,
          order: a.order,
          subarc_order: a.subarc ?? null,
          status: a.status,
          summary: a.summary,
        }),
      ),
    ).map(([k, v]) => [k, v.id]),
  ));

  ids.loc ??= {};
  for (const l of w.locations ?? []) {
    const have = await api(`${C}/locations`);
    let e = have.find((x) => x.name === l.name);
    if (!e) {
      e = await api(`${C}/locations`, "POST", {
        name: l.name,
        location_type: l.type,
        parent_location_id: l.parent ? ids.loc[l.parent] : null,
        description: l.description ?? "",
        notes: l.notes ?? "",
      });
      log(`location: ${l.name}`);
    }
    ids.loc[l.name] = e.id;
  }

  ids.group ??= {};
  for (const g of w.groups ?? []) {
    const have = await api(`${C}/groups`);
    let e = have.find((x) => x.name === g.name);
    if (!e) {
      e = await api(`${C}/groups`, "POST", {
        name: g.name,
        alineacion: g.alineacion ?? "",
        description: g.description ?? "",
        notes: g.notes ?? "",
      });
      log(`group: ${g.name}`);
    }
    ids.group[g.name] = e.id;
  }

  ids.npc ??= {};
  for (const n of w.npcs ?? []) {
    const have = await api(`${C}/npcs`);
    let e = have.find((x) => x.name === n.name);
    if (!e) {
      e = await api(`${C}/npcs`, "POST", {
        name: n.name,
        npc_kind: n.kind ? (npcTypes[n.kind] ?? n.kind) : "npc",
        detail_level: n.detail ?? "full",
        status: n.status ?? "vivo",
        location_id: n.location ? ids.loc[n.location] : null,
        origen: n.origen ?? null,
        rol: n.rol ?? null,
        subtipo: n.subtipo ?? null,
        description: n.description ?? "",
        notes: n.notes ?? "",
        attributes: n.attributes ?? {},
        skills: n.skills ?? {},
        current_hp: n.hp?.[0] ?? null,
        max_hp: n.hp?.[1] ?? null,
      });
      log(`npc: ${n.name}`);
    }
    ids.npc[n.name] = e.id;
  }

  ids.pc ??= {};
  for (const p of w.players ?? []) {
    const have = await api(`${C}/player-characters`);
    let e = have.find((x) => x.character_name === p.name);
    if (!e) {
      e = await api(`${C}/player-characters`, "POST", {
        player_name: p.player,
        character_name: p.name,
        race: p.race ?? "",
        class: p.class ?? "",
        status: p.status ?? "vivo",
        description: p.description ?? "",
        backstory: p.backstory ?? "",
        progression_notes: p.progression ?? "",
        attributes: p.attributes ?? {},
        skills: p.skills ?? {},
        current_hp: p.hp?.[0] ?? null,
        max_hp: p.hp?.[1] ?? null,
      });
      log(`player: ${p.name}`);
    }
    ids.pc[p.name] = e.id;
  }

  for (const g of w.groups ?? []) {
    const gid = ids.group[g.name];
    const members = await api(`/groups/${gid}/members`);
    for (const m of g.npcs ?? [])
      if (!members.some((x) => x.npc_id === ids.npc[m]))
        await api(`/groups/${gid}/members`, "POST", { npc_id: ids.npc[m] });
    const pcMembers = await api(`/groups/${gid}/pc-members`);
    for (const m of g.players ?? [])
      if (!pcMembers.some((x) => x.pc_id === ids.pc[m]))
        await api(`/groups/${gid}/pc-members`, "POST", { pc_id: ids.pc[m] });
    if (g.leader) {
      const cur = await api(`/groups/${gid}`);
      if (cur.lider_npc_id !== ids.npc[g.leader])
        await api(`/groups/${gid}`, "PUT", {
          name: cur.name,
          alineacion: cur.alineacion,
          description: cur.description,
          notes: cur.notes,
          lider_npc_id: ids.npc[g.leader],
        });
    }
  }

  for (const [from, to, role] of w.relations ?? []) {
    const have = await api(`/npcs/${ids.npc[from]}/relations`);
    if (!have.some((r) => r.to_npc_id === ids.npc[to] && r.role === role))
      await api(`/npcs/${ids.npc[from]}/relations`, "POST", {
        to_npc_id: ids.npc[to],
        role,
      });
  }
  for (const [npc, pc, role] of w.links ?? [])
    await api(`/npcs/${ids.npc[npc]}/players/${ids.pc[pc]}`, "PUT", {
      role: role ?? "",
    });

  ids.quest ??= {};
  for (const q of w.quests ?? []) {
    const have = await api(`${C}/quests`);
    let e = have.find((x) => x.title === q.title);
    if (!e) {
      e = await api(`${C}/quests`, "POST", {
        title: q.title,
        description: q.description ?? "",
        notes: q.notes ?? "",
        status: q.status ?? "active",
        priority: q.priority ?? null,
      });
      log(`quest: ${q.title}`);
    }
    ids.quest[q.title] = e.id;
    for (const [npc, role] of q.npcs ?? [])
      await api(`/quests/${e.id}/npcs/${ids.npc[npc]}`, "PUT", { role });
  }

  ids.lore ??= {};
  for (const l of w.lore ?? []) {
    const have = await api(`${C}/lore`);
    let e = have.find((x) => x.title === l.title);
    if (!e) {
      e = await api(`${C}/lore`, "POST", {
        title: l.title,
        body: l.body,
        category_id: l.category ? loreCats[l.category] : null,
        arc_id: l.arc ? ids.arc[l.arc] : null,
        location_id: l.location ? ids.loc[l.location] : null,
      });
      log(`lore: ${l.title}`);
    }
    ids.lore[l.title] = e.id;
  }

  ids.session ??= {};
  for (const s of w.sessions ?? []) {
    const have = await api(`${C}/sessions`);
    const key = (x) => `${x.session_type}:${x.session_number}:${x.sub_number}`;
    const body = {
      arc_id: s.arc ? ids.arc[s.arc] : null,
      session_number: s.number,
      sub_number: s.sub ?? 0,
      session_type: s.type ?? "session",
      title: s.title ?? "",
      planned: s.planned ?? false,
      date: s.date ?? "",
      summary: s.summary ?? "",
      prep_notes: s.prep ?? "",
    };
    let e = have.find((x) => key(x) === key(body));
    if (!e) {
      e = await api(`${C}/sessions`, "POST", body);
      log(`session: ${s.type ?? "session"} ${s.number}.${s.sub ?? 0}`);
    }
    ids.session[s.ref ?? `${s.number}.${s.sub ?? 0}`] = e.id;
    const linked = await api(`/sessions/${e.id}/npcs`);
    for (const n of s.npcs ?? [])
      if (!linked.some((x) => x.npc_id === ids.npc[n]))
        await api(`/sessions/${e.id}/npcs`, "POST", { npc_id: ids.npc[n] });
    const linkedQuests = await api(`/sessions/${e.id}/quests`);
    for (const q of s.quests ?? [])
      if (!linkedQuests.some((x) => x.quest_id === ids.quest[q]))
        await api(`/sessions/${e.id}/quests`, "POST", {
          quest_id: ids.quest[q],
        });
  }

  ids.currency ??= {};
  for (const c of w.currencies ?? []) {
    const have = await api(`${C}/currencies`);
    let e = have.find((x) => x.name === c.name);
    if (!e) {
      e = await api(`${C}/currencies`, "POST", {
        name: c.name,
        symbol: c.symbol,
        rate_to_base: c.rate ?? null,
        is_base: c.base ?? false,
        location_ids: (c.where ?? []).map((l) => ids.loc[l]),
      });
      log(`currency: ${c.name}`);
    }
    ids.currency[c.name] = e.id;
  }
  const prices = (ps) =>
    (ps ?? []).map(([cur, amount]) => ({
      currency_id: ids.currency[cur],
      amount,
    }));
  ids.item ??= {};
  for (const it of w.items ?? []) {
    const have = await api(`${C}/items`);
    let e = have.find((x) => x.name === it.name);
    if (!e) {
      e = await api(`${C}/items`, "POST", {
        name: it.name,
        description: it.description ?? "",
        effect: it.effect ?? "",
        category: it.category ?? "",
        rarity: it.rarity ?? "",
        weight: it.weight ?? null,
        prices: prices(it.prices),
      });
      log(`item: ${it.name}`);
    }
    ids.item[it.name] = e.id;
  }
  for (const [kind, owner, item, qty, notes] of w.inventory ?? []) {
    const base =
      kind === "pc"
        ? `/player-characters/${ids.pc[owner]}`
        : `/npcs/${ids.npc[owner]}`;
    await api(`${base}/items/${ids.item[item]}`, "PUT", {
      quantity: qty,
      notes: notes ?? "",
    });
  }
  for (const [where, item, notes, ps] of w.shops ?? [])
    await api(`/locations/${ids.loc[where]}/items/${ids.item[item]}`, "PUT", {
      notes: notes ?? "",
      prices: prices(ps),
    });

  for (const s of w.secrets ?? []) {
    const have = await api(`${C}/secrets`);
    if (have.some((x) => x.title === s.title)) continue;
    await api(`${C}/secrets`, "POST", {
      title: s.title,
      body: s.body,
      status: s.status ?? "hidden",
      revealed_session_id: s.revealedIn ? ids.session[s.revealedIn] : null,
      npc_id: s.npc ? ids.npc[s.npc] : null,
      location_id: s.location ? ids.loc[s.location] : null,
      lore_entry_id: s.lore ? ids.lore[s.lore] : null,
      known_by_npc_ids: (s.knownBy ?? []).map((n) => ids.npc[n]),
    });
    log(`secret: ${s.title}`);
  }

  for (const n of w.notes ?? []) {
    const have = await api(`${C}/loose-notes`);
    if (have.some((x) => x.title === n.title)) continue;
    await api(`${C}/loose-notes`, "POST", {
      title: n.title,
      body: n.body,
      pending: n.pending ?? true,
    });
    log(`note: ${n.title}`);
  }

  const tlIds = {};
  for (const t of w.timelines ?? []) {
    const have = await api(`${C}/timelines`);
    let e = have.find((x) => x.name === t.name);
    if (!e) {
      e = await api(`${C}/timelines`, "POST", {
        name: t.name,
        description: t.description ?? "",
        color: t.color,
        start_label: t.start ?? "",
        end_label: t.end ?? "",
      });
      log(`timeline: ${t.name}`);
    }
    tlIds[t.name] = e.id;
    const events = await api(`${C}/timeline-events`);
    for (const ev of t.events ?? []) {
      if (events.some((x) => x.title === ev.title)) continue;
      await api(`${C}/timeline-events`, "POST", {
        timeline_id: e.id,
        title: ev.title,
        description: ev.description ?? "",
        date_label: ev.date ?? "",
        end_date_label: ev.end ?? "",
        sort_key: ev.sort,
        arc_id: ev.arc ? ids.arc[ev.arc] : null,
        session_id: ev.session ? ids.session[ev.session] : null,
        location_id: ev.location ? ids.loc[ev.location] : null,
        group_id: ev.group ? ids.group[ev.group] : null,
        lore_entry_id: ev.lore ? ids.lore[ev.lore] : null,
      });
      log(`event: ${ev.title}`);
    }
  }

  for (const en of w.encounters ?? []) {
    const have = await api(`${C}/encounters`);
    if (have.some((x) => x.name === en.name)) continue;
    const e = await api(`${C}/encounters`, "POST", {
      name: en.name,
      session_id: en.session ? ids.session[en.session] : null,
      status: en.status ?? "planificado",
      round: en.round ?? 1,
    });
    log(`encounter: ${en.name}`);
    for (const p of en.participants) {
      await api(`/encounters/${e.id}/participants`, "POST", {
        pc_id: p.pc ? ids.pc[p.pc] : null,
        npc_id: p.npc ? ids.npc[p.npc] : null,
        display_name: p.enemy ?? null,
        initiative_value: p.init ?? null,
        current_hp: p.hp?.[0] ?? null,
        max_hp: p.hp?.[1] ?? null,
        turn_type: p.turn ?? null,
        notes: p.notes ?? "",
        attributes: p.attributes ?? {},
        skills: p.skills ?? {},
      });
    }
  }

  const entity = {
    npc: ["npcs", "npc"],
    pc: ["player-characters", "pc"],
    loc: ["locations", "loc"],
    group: ["groups", "group"],
    arc: ["arcs", "arc"],
    quest: ["quests", "quest"],
    lore: ["lore", "lore"],
    item: ["items", "item"],
  };
  for (const [name, color] of w.images ?? []) {
    for (const [, [path, key]] of Object.entries(entity)) {
      const id = ids[key]?.[name];
      if (!id) continue;
      const cur = await api(`/${path}/${id}`);
      if (!cur.image_path) {
        await image(path, id, color);
        log(`image: ${name}`);
      }
    }
  }
}

const campaigns = await api("/campaigns");
const byName = (n) => campaigns.find((c) => c.name === n);

const aa = byName("AA");
if (aa) {
  await api(`/campaigns/${aa.id}`, "DELETE");
  log("campaña AA borrada");
}

const MD = {
  tabla: `| Aspecto | Valor |\n|---|---|\n| Población | ~40.000 |\n| Gobierno | Consejo de gremios |\n| Defensa | Murallas y una guardia mal pagada |`,
  callout: `> [!WARNING] Secreto del máster\n> Esto no debe salir de la mesa hasta la sesión 6.`,
};

await seedCampaign(`/campaigns/${byName("Screenshot QA").id}`, {
  wardails:
    "- Violencia contra niños\n- Ahogamiento\n\n> [!WARNING] Hablar antes de la sesión si aparece una tormenta en el mar.",
  loreCategories: [{ label: "Bestiario", color: "#8a5a44" }],
  currencies: [
    { name: "Marco de plata", symbol: "mp", base: true, where: ["Ciudad de Urithiru"] },
    { name: "Cobre del puente", symbol: "cb", rate: 0.1 },
    { name: "Esfera de luz", symbol: "✦", rate: 25 },
  ],
  items: [
    {
      name: "Esfera de la Amarine",
      description:
        "Una esfera del tamaño de un puño, con una tormenta diminuta atrapada adentro.\n\n*Brilla más cerca de los espíritus.*",
      effect: "Ilumina 9 m. Una vez por tormenta puede almacenar un hechizo de nivel 1.",
      category: "Reliquia",
      rarity: "Muy rara",
      weight: 0.4,
      prices: [["Esfera de luz", 4], ["Marco de plata", 900]],
    },
    {
      name: "Puente \"Segundo Aliento\" (kit)",
      description: "Cuerdas, tablones y clavos para cruzar una grieta de hasta 12 m.",
      effect: "+2 a chequeos de escalada mientras se arma.",
      category: "Equipo",
      rarity: "Común",
      weight: 18.5,
      prices: [["Marco de plata", 35], ["Cobre del puente", 350]],
    },
    {
      name: "Poción de calma: 3/4 de dosis",
      description: "Sabe a menta y a tormenta.",
      effect: "Termina un efecto de miedo.",
      category: "Consumible",
      rarity: "Poco común",
      weight: 0.2,
      prices: [["Marco de plata", 60]],
    },
    {
      name: "Diario del Teniente",
      description: "Tapas de cuero, la mitad de las páginas arrancadas.",
      category: "Misceláneo",
      rarity: "Única",
    },
  ],
  inventory: [
    ["pc", "Adolin Kholin", "Esfera de la Amarine", 1, "Heredada de su padre"],
    ["pc", "Kaladin Tormenta", "Puente \"Segundo Aliento\" (kit)", 2, ""],
    ["npc", "Runa la portadora", "Poción de calma: 3/4 de dosis", 3, "Para su cuadrilla"],
  ],
  shops: [
    ["Ciudad de Urithiru", "Puente \"Segundo Aliento\" (kit)", "Stock bajo, llega en tormenta", [["Marco de plata", 40]]],
    ["Ciudad de Urithiru", "Poción de calma: 3/4 de dosis", "", []],
  ],
  secrets: [
    {
      title: "Quién movió las boyas",
      body: "Fue **Teniente Salgodón**, por orden de alguien con el sello del consejo.\n\n- Pagó con esferas robadas.\n- Lo sabe *Kas de la Corte*.",
      status: "hidden",
      npc: "Teniente Salgodón",
      location: "Llanuras Quebradas",
      knownBy: ["Kas de la Corte"],
    },
    {
      title: "El faro nunca se apagó: Cristalina lo sostiene",
      body: "La niña no es humana. Su canto mantiene viva la lámpara.\n\n---\n\nSi muere, el faro cae con ella.",
      status: "revealed",
      revealedIn: "2.0",
      npc: "Cristalina, la niña del faro",
      knownBy: ["Espíritu del Bosque", "Runa la portadora"],
    },
    {
      title: "Pregunta abierta: ¿quién es \"El Cuarto\"?",
      body: "Nadie respondió todavía. #misterio",
      status: "hidden",
    },
  ],
  links: [
    ["Cristalina, la niña del faro", "Shallan de Casa Tavar", "espíritu vinculado"],
    ["Kas de la Corte", "Adolin Kholin", "mentor"],
    ["Runa la portadora", "Kaladin Tormenta", ""],
  ],
  relations: [
    ["Runa la portadora", "Teniente Salgodón", "RIVAL"],
    ["Kas de la Corte", "Runa la portadora", "ALIADO"],
  ],
  npcs: [
    {
      name: "Dra. O'Neil / «La Sombra» [#7]: ¿?",
      kind: "monstruo",
      status: "activo",
      location: "Sea de Reshi",
      origen: "Reshi",
      rol: "Cazarrecompensas",
      subtipo: "Espectro",
      description:
        "Nombre pensado para romper cosas: barras, dos puntos, corchetes, almohadilla, signos de pregunta y comillas angulares.\n\n---\n\nCuando habla, la sala se queda sin eco.",
      notes: "Probar que el export lo guarda con un nombre de archivo seguro.",
      hp: [40, 40],
      attributes: { fuerza: 12, astucia: 18 },
      skills: { sigilo: 17 },
    },
  ],
  lore: [
    {
      title: "Cantos del abismo",
      category: "Bestiario",
      location: "Llanuras Quebradas",
      body: "## Qué son\n\nLos segadores cantan en frecuencias que el hierro devuelve.\n\n### Señales\n\n1. Silencio de pájaros.\n2. Olor a metal mojado.\n3. Las esferas titilan.\n\n" + MD.tabla,
    },
  ],
  quests: [
    {
      title: "Escoltar a la niña del faro",
      description:
        "Cristalina debe llegar a Urithiru antes de que cierre el paso de la Amarine.\n\n**Riesgos**\n\n- Segadores en el camino.\n- Una tormenta alta.\n\n" + MD.callout,
      notes: "Prioridad máxima si el grupo pierde a Runa.",
      status: "on_hold",
      priority: 5,
      npcs: [["Cristalina, la niña del faro", "protegida"], ["Runa la portadora", "guía"]],
    },
  ],
  timelines: [
    {
      name: "Cronología de la campaña",
      events: [
        {
          title: "El puente cae",
          description: "Durante la tercera tormenta.",
          date: "Día 41",
          sort: 40,
          location: "Llanuras Quebradas",
        },
      ],
    },
    {
      name: "Historia antigua",
      description: "Lo que pasó antes de que existiera la mesa.",
      color: "#8a6a3c",
      start: "Era del Primer Canto",
      end: "Año 0",
      events: [
        {
          title: "Se levanta la torre",
          description: "Diez niveles, diez gemas.",
          date: "Era del Primer Canto",
          end: "Año -300",
          sort: 1,
          location: "Ciudad de Urithiru",
          lore: "La Tormenta Despertada",
        },
        {
          title: "La grieta",
          date: "Año -12",
          sort: 2,
          arc: "Herencia de Esporas",
        },
      ],
    },
  ],
  notes: [
    {
      title: "Reglas de la casa: caídas",
      body: "Daño de caída máx. 20. Si cae al abismo, tirar *Atletismo* para agarrarse.",
      pending: false,
    },
    {
      title: "Idea: un encuentro en el abismo con luz negra",
      body: "- Todos pierden la visión de color.\n- Las esferas sólo se ven con ecolocalización.",
    },
  ],
  encounters: [
    {
      name: "Cruce con segadores",
      session: "2.0",
      status: "cerrado",
      round: 4,
      participants: [
        { pc: "Kaladin Tormenta", init: 18, hp: [18, 32] },
        { npc: "Runa la portadora", init: 11, hp: [22, 30], notes: "Cubre el flanco" },
        {
          enemy: "Segador del abismo (joven)",
          init: 14,
          hp: [31, 60],
          turn: "lento",
          attributes: { fuerza: 22, agilidad: 9 },
          skills: { acechar: 14 },
          notes: "Resistencia a cortante",
        },
      ],
    },
  ],
  images: [
    ["Kas de la Corte", [200, 150, 90]],
    ["Shallan de Casa Tavar", [90, 140, 200]],
    ["Ciudad de Urithiru", [120, 120, 200]],
    ["Casa Kholin", [180, 60, 60]],
    ["La Tormenta Despertada", [70, 90, 160]],
    ["Escoltar a la niña del faro", [200, 200, 90]],
    ["Cantos del abismo", [60, 140, 120]],
    ["Esfera de la Amarine", [230, 230, 120]],
  ],
});

await seedCampaign(`/campaigns/${byName("La luz de Valdris").id}`, {
  links: [
    ["Hermana Ilsa Draeven", "Tobias Crane", "mentora"],
    ["Brannoc el Ciego", "Lyra Vance", "informante"],
    ["El Barquero", "Kael Morrow", "deuda"],
  ],
  relations: [
    ["Teodric Ashmoor", "Maren Voss", "SILENCIÓ A"],
    ["Hermana Ilsa Draeven", "Isolde Wren", "PROTEGE"],
  ],
  notes: [
    {
      title: "Escena sin resolver: el banquete",
      body: "Teodric ofrece un brindis y nadie nota que su copa nunca se vacía.",
    },
  ],
  images: [
    ["Teodric Ashmoor", [160, 70, 70]],
    ["El faro de Valdris", [220, 200, 120]],
    ["Casa Ashmoor", [90, 60, 120]],
  ],
});

await seedCampaign(`/campaigns/${byName("Las brasas de Karsk").id}`, {
  wardails:
    "- Incendios y quemaduras graves\n- Trabajo infantil en las minas\n\nSi alguien se siente incómodo, la escena se corta sin preguntas.",
  npcTypes: [
    { label: "Monstruo", color: "#b8433a" },
    { label: "Aliado", color: "#3a8f6a" },
  ],
  loreCategories: [{ label: "Bestiario", color: "#8a5a44" }],
  arcs: [
    {
      title: "Humo bajo la montaña",
      order: 1,
      status: "cerrado",
      summary:
        "Los mineros enferman de «tos negra»: es veneno de fuego, no polvo. Descubren que el capataz lo sabía --- y lo calló.\n\n## Resultado\n\nEl pozo 7 queda sellado; el consejo pierde dos asientos.",
    },
    {
      title: "La ciudad que arde por dentro",
      order: 2,
      status: "en_curso",
      summary:
        "Las vetas de ceniza avanzan bajo Karsk. Hay quien las alimenta: el \"Círculo del Hollín\" prepara algo para el solsticio.",
    },
    {
      title: "El pozo 7: lo que no se selló",
      order: 2,
      subarc: 1,
      status: "planificado",
      summary: "Subarco: una expedición a las galerías clausuradas.",
    },
  ],
  locations: [
    { name: "Plano de la Brasa", type: "plane", description: "Una dimensión de ceniza tibia donde la roca respira." },
    { name: "Mundo de Ethrel", type: "planet", description: "Planeta de inviernos largos y minas profundas." },
    { name: "Cordillera Rescoldo", type: "region", parent: "Mundo de Ethrel", description: "Montañas que humean aun en verano." },
    { name: "Karsk", type: "city", parent: "Cordillera Rescoldo", description: "Ciudad minera de tres niveles.\n\n" + MD.tabla, notes: "El nivel inferior no figura en los mapas oficiales." },
    { name: "Pozo 7", type: "site", parent: "Karsk", description: "Galería sellada con bloques de granito y tres cerrojos." },
    { name: "La Fragua Rota", type: "site", parent: "Karsk", description: "Taberna, herrería y salón del gremio. Siempre huele a hierro caliente." },
    { name: "Mercado de Cenizas", type: "site", parent: "Karsk", description: "Se vende de todo, siempre bajo una capa de hollín." },
  ],
  groups: [
    { name: "Círculo del Hollín", alineacion: "Caótico", description: "Secta que cree que la montaña quiere ser despertada.", notes: "No saben que Voss los usa.", leader: "Maestra Voss", npcs: ["Maestra Voss", "Cuervo"] },
    { name: "Gremio de Mineros de Karsk", alineacion: "Leal", description: "Gremio histórico con mil doscientos miembros.", leader: "Taren Brasaviva", npcs: ["Taren Brasaviva", "Hilda Pico-Corto"], players: ["Sera Ironvale"] },
    { name: "Guardia de la Cantera", alineacion: "Neutral", description: "Guardias pagados por el consejo; dudosa lealtad.", npcs: ["Sargento Doran"] },
  ],
  npcs: [
    { name: "Taren Brasaviva", rol: "Jefe del gremio", origen: "Karsk", status: "vivo", location: "La Fragua Rota", hp: [38, 52], description: "Forjador retirado a la fuerza por una quemadura que le comió la mano izquierda.\n\nHabla poco y siempre pregunta antes de pedir.", notes: "Esconde un diario con nombres.", attributes: { fuerza: 16, carisma: 14 }, skills: { forja: 19, liderazgo: 15 } },
    { name: "Maestra Voss", rol: "Alquimista del Círculo", origen: "Aletia", subtipo: "Pirómana", status: "activo", location: "Pozo 7", hp: [44, 44], description: "Dice que quiere *salvar* la ciudad, y es posible que lo crea.", notes: "Tiene una copia del mapa del nivel inferior." },
    { name: "Hilda Pico-Corto", rol: "Capataz de turno", origen: "Karsk", status: "vivo", location: "Pozo 7", hp: [28, 28], description: "Enana que cuenta chistes malos mientras revisa los puntales." },
    { name: "Sargento Doran", rol: "Guardia de la cantera", status: "desaparecido", location: "Mercado de Cenizas", description: "Dejó de presentarse el día del sello.", notes: "Última vez visto con una caja de lámparas." },
    { name: "Cuervo", kind: "Monstruo", subtipo: "Espectro de ceniza", status: "activo", location: "Plano de la Brasa", hp: [60, 60], description: "No parpadea. Cuando habla, las brasas se acercan.", attributes: { fuerza: 20, astucia: 12 }, skills: { terror: 18, acechar: 16 } },
    { name: "Pequeña Ember", kind: "Aliado", subtipo: "Salamandra", status: "vivo", location: "La Fragua Rota", hp: [8, 8], description: "Una salamandra del tamaño de un gato. Roba pan." },
    { name: "Vendedora de \"humo dulce\"", status: "vivo", location: "Mercado de Cenizas", rol: "Mercader", description: "Vende pastillas que huelen a vainilla y causan sueños de fuego." },
    { name: "El Archivo de Karsk", kind: "referencia", detail: "minor", status: "activo", description: "No es una persona: es un lugar al que se refieren las notas.", notes: "Se usa como destino de wikilinks." },
  ],
  players: [
    {
      name: "Sera Ironvale", player: "Ana", race: "Enana", class: "Guardiana", hp: [34, 41],
      description: "Armadura abollada, escudo con la marca del gremio.",
      backstory:
        "# Hija del pozo 3\n\nSera nació en las galerías. Su madre fue **capataz** y murió cuando el puntal cedió.\n\n## Lo que no cuenta\n\n- Vio quién cortó la cuerda.\n- Tiene una carta firmada.\n\n> «Las minas no matan. Matan quienes las vacían.»",
      progression: "## Nivel 3\n\n- Dote: *Escudo reactivo*.\n- Se unió al gremio.\n\n## Nivel 4\n\n- Aprendió a leer la ceniza.",
      attributes: { fuerza: 16, constitucion: 18 }, skills: { atletismo: 9, supervivencia: 8 },
    },
    {
      name: "Dax Rellano", player: "Marcos", race: "Humano", class: "Pícaro", hp: [26, 31],
      backstory: "Fue ladrón de lámparas en el mercado. Una noche robó la equivocada: tenía una salamandra dentro.",
      progression: "Nivel 3: *Golpe furtivo 2d6*.",
    },
    {
      name: "Elowen Cinder", player: "Lu", race: "Semielfa", class: "Clériga de Sarenrae", status: "activo", hp: [31, 31],
      backstory: "Llegó a Karsk buscando a un hermano que ya no existe. Ahora cura a los mineros en la Fragua.",
    },
  ],
  links: [
    ["Pequeña Ember", "Dax Rellano", "compañera"],
    ["Taren Brasaviva", "Sera Ironvale", "mentor"],
    ["Maestra Voss", "Elowen Cinder", ""],
  ],
  relations: [
    ["Maestra Voss", "Cuervo", "INVOCA"],
    ["Taren Brasaviva", "Hilda Pico-Corto", "AMIGO"],
    ["Sargento Doran", "Maestra Voss", "DEUDOR"],
  ],
  quests: [
    {
      title: "Sellar el pozo 7",
      description: "Hacer que el consejo apruebe el sello definitivo.\n\n1. Reunir tres firmas.\n2. Convencer a Taren.\n3. Evitar que Voss se entere.",
      notes: "Falta la firma del consejero Hale.",
      status: "active", priority: 5,
      npcs: [["Taren Brasaviva", "aliado"], ["Maestra Voss", "oposición"]],
    },
    {
      title: "Encontrar al sargento Doran",
      description: "Hay una caja de lámparas, un guardia desaparecido y un mercado que cobra silencio.",
      status: "active", priority: 3,
      npcs: [["Sargento Doran", "objetivo"], ["Vendedora de \"humo dulce\"", "testigo"]],
    },
    { title: "Rescatar a los atrapados del nivel 3", description: "Un derrumbe. Doce mineros.", status: "completed", priority: 4, npcs: [["Hilda Pico-Corto", "capataz"]] },
    { title: "Atrapar a la salamandra", description: "Fracasó: la salamandra se escapó, y se hizo amiga de Dax.", status: "failed", priority: 1 },
    { title: "Negociar con el Círculo", description: "En pausa hasta que se sepa quién los dirige.", status: "on_hold", priority: 2, npcs: [["Maestra Voss", "contacto"]] },
  ],
  lore: [
    { title: "La tos negra", category: "Historia", arc: "Humo bajo la montaña", location: "Pozo 7", body: "## Qué es\n\nNo es polvo: es **veneno de fuego** filtrado de la veta.\n\n### Síntomas\n\n- Tos con hollín.\n- Quemaduras internas.\n- Sueños de fuego.\n\n" + MD.callout },
    { title: "El Plano de la Brasa", category: "Magia", location: "Plano de la Brasa", body: "Un plano adyacente donde la ceniza es suelo y la brasa es cielo.\n\n- Entrada: grietas calientes.\n- Habitantes: espectros de ceniza." },
    { title: "Fundación de Karsk", category: "Historia", location: "Karsk", body: "Karsk se fundó sobre la primera veta hallada por **Berrin Pico-Corto**, abuela de Hilda.\n\n---\n\nEl nombre viene de *kar-sk*: «donde la roca arde»." },
    { title: "Rituales del Círculo del Hollín", category: "Religión", body: "Se celebran en el solsticio. Cantan, arrojan lámparas y esperan que la montaña responda." },
    { title: "Espectro de ceniza", category: "Bestiario", body: "**CR** 5. Resiste fuego, vulnerable a agua bendita.\n\n| Rasgo | Valor |\n|---|---|\n| HP | 60 |\n| CA | 17 |" },
    { title: "Costumbres de la Fragua", category: "Cultura", location: "La Fragua Rota", body: "En la Fragua nadie paga su primera ronda. Quien lo intenta, paga todas." },
  ],
  sessions: [
    { number: 1, ref: "1", arc: "Humo bajo la montaña", date: "2026-05-02", summary: "El grupo llega a Karsk\n\nUna tos que no era polvo. Sera reconoce el pozo donde nació.", prep: "- Mostrar el mapa del nivel 1.\n- Presentar a Taren.", npcs: ["Taren Brasaviva", "Hilda Pico-Corto"], quests: ["Rescatar a los atrapados del nivel 3"] },
    { number: 2, ref: "2", arc: "Humo bajo la montaña", date: "2026-05-16", summary: "El derrumbe del nivel 3\n\nDoce mineros atrapados. Dax salva a cinco y roba una lámpara.", npcs: ["Hilda Pico-Corto", "Pequeña Ember"], quests: ["Rescatar a los atrapados del nivel 3", "Atrapar a la salamandra"] },
    { number: 2, sub: 1, type: "interlude", ref: "2.1", arc: "Humo bajo la montaña", date: "2026-05-20", summary: "Interludio: la carta de Sera\n\nSera relee la carta firmada y decide guardársela." },
    { number: 3, ref: "3", arc: "La ciudad que arde por dentro", date: "2026-06-06", summary: "El sello y el silencio\n\nEl consejo sella el pozo 7. Voss aplaude en la última fila.", npcs: ["Maestra Voss", "Taren Brasaviva"], quests: ["Sellar el pozo 7"] },
    { number: 4, type: "planning", ref: "4", arc: "La ciudad que arde por dentro", date: "2026-06-20", summary: "", prep: "## Plan\n\n- Tensar el pozo 7.\n- Presentar al Cuervo.\n- Dejar una pista del Círculo." },
    { number: 1, type: "oneshot", ref: "O1", title: "La noche de las lámparas", planned: false, date: "2026-07-04", summary: "Una noche suelta en el mercado: todos pierden sus lámparas.", npcs: ["Vendedora de \"humo dulce\""] },
    { number: 2, type: "oneshot", ref: "O2", title: "Cumple de Ember", planned: true, summary: "Fiesta sorpresa, con pastel ignífugo." },
  ],
  currencies: [
    { name: "Corona de hierro", symbol: "ch", base: true, where: ["Karsk", "Mercado de Cenizas"] },
    { name: "Ficha de turno", symbol: "ft", rate: 0.25, where: ["Pozo 7"] },
  ],
  items: [
    { name: "Lámpara de seguridad", description: "Llama encerrada en malla de bronce.", effect: "No enciende gases. Dura 8 h.", category: "Equipo", rarity: "Común", weight: 2, prices: [["Corona de hierro", 5], ["Ficha de turno", 20]] },
    { name: "Pastillas de humo dulce", description: "Huelen a vainilla. Dejan sueños de fuego.", effect: "Desventaja en Voluntad durante 1 h.", category: "Consumible", rarity: "Poco común", weight: 0.1, prices: [["Corona de hierro", 2]] },
    { name: "Hacha de veta", description: "Hoja de obsidiana negra.", effect: "+1d6 fuego contra espectros de ceniza.", category: "Arma", rarity: "Rara", weight: 3.5, prices: [["Corona de hierro", 450]] },
  ],
  inventory: [
    ["pc", "Sera Ironvale", "Hacha de veta", 1, "Forjada por Taren"],
    ["pc", "Dax Rellano", "Lámpara de seguridad", 2, "Una es robada"],
    ["npc", "Taren Brasaviva", "Hacha de veta", 1, ""],
  ],
  shops: [
    ["La Fragua Rota", "Lámpara de seguridad", "", []],
    ["Mercado de Cenizas", "Pastillas de humo dulce", "Solo de noche", [["Corona de hierro", 3]]],
  ],
  secrets: [
    { title: "Voss financia al Círculo", body: "Con dinero del propio gremio.", status: "hidden", npc: "Maestra Voss", location: "Pozo 7", knownBy: ["Cuervo"] },
    { title: "La caja de lámparas", body: "Dentro: mapas del nivel inferior y una llave de bronce.", status: "revealed", revealedIn: "3", npc: "Sargento Doran", location: "Mercado de Cenizas", knownBy: ["Vendedora de \"humo dulce\""] },
  ],
  notes: [
    { title: "Pendiente: ¿qué hacía el Círculo en la sesión 2?", body: "Ver si Dax los vio.", pending: true },
    { title: "Referencias de ambiente", body: "- Humo bajo las puertas.\n- Sonido de martillos a lo lejos.\n- Olor a hierro caliente.", pending: false },
  ],
  timelines: [
    {
      name: "Cronología de Karsk",
      description: "La historia de la ciudad.",
      color: "#c0543a",
      start: "Año 1 de Karsk",
      events: [
        { title: "Se funda la ciudad", date: "Año 1", sort: 1, location: "Karsk", lore: "Fundación de Karsk" },
        { title: "El gran derrumbe", date: "Año 112", sort: 2, location: "Pozo 7", description: "Treinta muertos. Se sellan las galerías bajas." },
        { title: "Estalla la tos negra", date: "Año 240", sort: 3, arc: "Humo bajo la montaña", lore: "La tos negra" },
        { title: "Se sella el pozo 7", date: "Año 241", sort: 4, session: "3", group: "Gremio de Mineros de Karsk" },
      ],
    },
  ],
  encounters: [
    { name: "Derrumbe del nivel 3", session: "2", status: "cerrado", round: 5, participants: [
      { pc: "Sera Ironvale", init: 16, hp: [34, 41] },
      { pc: "Dax Rellano", init: 19, hp: [26, 31] },
      { npc: "Hilda Pico-Corto", init: 12, hp: [28, 28] },
      { enemy: "Puntal que cede", init: 8, notes: "Cae en la ronda 3" },
    ] },
    { name: "El Cuervo aparece", session: "3", status: "planificado", round: 1, participants: [
      { npc: "Cuervo", init: 15, hp: [60, 60] },
      { enemy: "Espectro menor ×2", init: 11, hp: [18, 18], attributes: { fuerza: 10 }, skills: { terror: 8 }, turn: "rapido" },
    ] },
  ],
  images: [
    ["Taren Brasaviva", [190, 110, 60]],
    ["Maestra Voss", [120, 60, 150]],
    ["Cuervo", [50, 50, 60]],
    ["Sera Ironvale", [90, 120, 170]],
    ["Dax Rellano", [60, 140, 90]],
    ["Karsk", [170, 90, 60]],
    ["Pozo 7", [70, 70, 70]],
    ["Círculo del Hollín", [200, 70, 40]],
    ["Humo bajo la montaña", [140, 140, 140]],
    ["La tos negra", [100, 130, 90]],
    ["Sellar el pozo 7", [200, 180, 80]],
    ["Hacha de veta", [60, 60, 80]],
  ],
});

await seedCampaign(`/campaigns/${byName("Crónicas del Velo").id}`, {
  wardails: "- Pérdida de un ser querido\n- Sacrificio forzado",
  loreCategories: [{ label: "Investiduras", color: "#7a6ad1" }],
  arcs: [
    { title: "Viajeros sin mundo", order: 1, status: "cerrado", summary: "Cinco personas cruzan el Velo por accidente y quedan atrapadas entre mundos que no deberían tocarse." },
    { title: "El precio del regreso", order: 2, status: "cerrado", summary: "Para volver, uno de ellos debe quedarse. La mesa decide quién." },
  ],
  locations: [
    { name: "El Velo", type: "plane", description: "Una niebla que recuerda. Quien entra no pierde su pasado: lo ve." },
    { name: "Roshar de ceniza", type: "planet", description: "Una versión de Roshar donde las tormentas no cesan." },
    { name: "Costa Rota", type: "region", parent: "Roshar de ceniza", description: "Acantilados, arrecifes y torres caídas." },
    { name: "Torre del Susurro", type: "site", parent: "Costa Rota", description: "Una torre cuyos pisos se reordenan cada noche." },
    { name: "Puerto del Humo", type: "city", parent: "Costa Rota", description: "Ciudad portuaria construida sobre barcos viejos." },
  ],
  groups: [
    { name: "Los Cartógrafos del Velo", alineacion: "Neutral", description: "Dibujan lo que cambia.", leader: "Ysolde la Archivista", npcs: ["Ysolde la Archivista", "Perro de niebla"], players: ["Iko Marenne"] },
    { name: "Hijos de la Tormenta", alineacion: "Caótico", description: "Creen que las tormentas son voces.", npcs: ["Voz del Trueno"] },
  ],
  npcs: [
    { name: "Ysolde la Archivista", kind: "entidad-cognitiva", subtipo: "Escriba cognitivo", origen: "Torre del Susurro", rol: "Archivista", location: "Torre del Susurro", hp: [30, 30], description: "Un cognitivo con forma de mujer anciana, hecha de tinta y silencio.\n\n> «Todo lo que se escribe, se recuerda. Todo lo que se recuerda, cambia.»", notes: "Tiene un libro en blanco que nadie debe abrir.", skills: { historia: 20, escritura: 18 } },
    { name: "Perro de niebla", kind: "spren", subtipo: "Canino", status: "vivo", location: "El Velo", description: "Aparece cuando alguien miente." },
    { name: "Voz del Trueno", rol: "Profeta", origen: "Costa Rota", status: "activo", location: "Puerto del Humo", description: "Predice tormentas con una puntería sospechosa.", notes: "Está vendido al comité del puerto." },
    { name: "Capitán Aldeo Rey", rol: "Capitán", origen: "Puerto del Humo", status: "muerto", location: "Puerto del Humo", description: "Murió en el cruce. Su barco sigue navegando solo." },
    { name: "La Voz del Velo", kind: "referencia", detail: "minor", status: "activo", description: "Una presencia, no un personaje.", notes: "Referencia en notas." },
  ],
  players: [
    { name: "Iko Marenne", player: "Fer", race: "Alethi", class: "Cartógrafa", hp: [28, 28], backstory: "# Una niña con tinta en los dedos\n\nIko dibujó un mapa que no estaba en ninguna parte. Ahora el mapa la dibuja a ella.", progression: "- Primer Ideal: *Mapearé lo que cambia*.\n- Investidura: Progresión." },
    { name: "Bastian Orlo", player: "Lulu", race: "Veden", class: "Guerrero", hp: [45, 52], backstory: "Soldado que cree que todo es una guerra que todavía no empezó." },
    { name: "Nuri", player: "Dani", race: "Singer", class: "Escudera", status: "muerto", backstory: "Se quedó en el Velo para que los demás pudieran volver.", progression: "Murió en la sesión 8: su sacrificio cerró el arco." },
  ],
  links: [
    ["Perro de niebla", "Iko Marenne", "spren"],
    ["Ysolde la Archivista", "Bastian Orlo", ""],
  ],
  relations: [
    ["Voz del Trueno", "Ysolde la Archivista", "TEME A"],
    ["Capitán Aldeo Rey", "Voz del Trueno", "TRAICIONADO POR"],
  ],
  quests: [
    { title: "Cruzar el Velo", description: "Volver al mundo de origen antes de que se cierre el paso.", status: "completed", priority: 5, npcs: [["Ysolde la Archivista", "guía"]] },
    { title: "Elegir quién se queda", description: "El precio del regreso: uno debe quedarse en el Velo.", status: "completed", priority: 5 },
    { title: "Recuperar el barco de Aldeo", description: "El barco navega solo. ¿Se le puede subir alguien?", status: "failed", priority: 1, npcs: [["Capitán Aldeo Rey", "dueño"]] },
  ],
  lore: [
    { title: "Qué es el Velo", category: "Investiduras", location: "El Velo", body: "No es un lugar: es un **estado de memoria**.\n\n- No hay dirección.\n- El tiempo se dobla.\n- Cada persona ve lo suyo." },
    { title: "Historia de los Cartógrafos", category: "Historia", body: "Se fundaron tras la caída de la torre. Su lema: *dibujar lo que cambia*." },
    { title: "Los Hijos de la Tormenta", category: "Religión", body: "Veneran el trueno como voz. Cada tormenta es un mensaje, y cada mensaje, una orden." },
  ],
  sessions: [
    { number: 1, ref: "1", arc: "Viajeros sin mundo", date: "2025-11-01", summary: "El cruce\n\nCinco personas, un barco y una niebla. Nadie recuerda cómo subieron.", npcs: ["Capitán Aldeo Rey"] },
    { number: 2, ref: "2", arc: "Viajeros sin mundo", date: "2025-11-15", summary: "La torre\n\nYsolde los recibe. Hay un libro en blanco.", npcs: ["Ysolde la Archivista"], quests: ["Cruzar el Velo"] },
    { number: 3, ref: "3", arc: "El precio del regreso", date: "2025-12-06", summary: "El precio\n\nUno de ellos debe quedarse.", npcs: ["Perro de niebla"], quests: ["Elegir quién se queda"] },
    { number: 3, sub: 1, type: "interlude", ref: "3.1", arc: "El precio del regreso", date: "2025-12-08", summary: "Interludio: la despedida de Nuri\n\nLa última noche en el Puerto del Humo." },
  ],
  currencies: [{ name: "Esfera de luz", symbol: "◈", base: true, where: ["Puerto del Humo"] }],
  items: [
    { name: "Mapa que no existe", description: "Un mapa que se dibuja mientras lo miras.", effect: "Muestra el camino de regreso una vez por tormenta.", category: "Reliquia", rarity: "Única", prices: [] },
    { name: "Esfera del Velo", description: "Una esfera de niebla.", category: "Misceláneo", rarity: "Rara", weight: 0.1, prices: [["Esfera de luz", 80]] },
  ],
  inventory: [["pc", "Iko Marenne", "Mapa que no existe", 1, "Se actualiza solo"]],
  shops: [["Puerto del Humo", "Esfera del Velo", "Solo en luna llena", [["Esfera de luz", 90]]]],
  secrets: [{ title: "El libro en blanco", body: "Si alguien escribe su nombre, desaparece del mundo.", status: "hidden", npc: "Ysolde la Archivista", knownBy: ["Ysolde la Archivista"] }],
  notes: [{ title: "Epílogo", body: "La mesa decidió: Nuri se queda. Todos lloraron, nadie quiso decirlo.", pending: false }],
  timelines: [
    { name: "Cruce del Velo", color: "#7a6ad1", start: "Día 0", end: "Día 31", events: [
      { title: "Cruzan el Velo", date: "Día 0", sort: 1, arc: "Viajeros sin mundo", session: "1" },
      { title: "Llegan a la Torre del Susurro", date: "Día 6", sort: 2, location: "Torre del Susurro", session: "2" },
      { title: "El sacrificio de Nuri", date: "Día 31", sort: 3, arc: "El precio del regreso", session: "3" },
    ] },
  ],
  encounters: [{ name: "Tormenta en el Velo", session: "3", status: "cerrado", round: 3, participants: [
    { pc: "Bastian Orlo", init: 14, hp: [45, 52] },
    { pc: "Nuri", init: 17, hp: [0, 30], notes: "Se queda." },
    { enemy: "Espectro de niebla", init: 10, hp: [20, 20] },
  ] }],
  images: [
    ["Iko Marenne", [90, 130, 190]],
    ["Ysolde la Archivista", [180, 180, 200]],
    ["El Velo", [140, 140, 180]],
    ["Qué es el Velo", [120, 110, 190]],
    ["Mapa que no existe", [200, 170, 90]],
  ],
});

console.log(created.length, "cambios");
for (const line of created) console.log(" -", line);
