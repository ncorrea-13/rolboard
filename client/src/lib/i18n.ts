import { useEffect, useState } from "react";

export type Lang = "es" | "en";

const STORAGE_KEY = "lang";
const LANG_EVENT = "langchange";

const dict = {
  es: {
    "login.label": "Código de acceso",
    "login.error": "Código incorrecto",
    "login.cancel": "Cancelar",
    "login.confirm": "Entrar",
    "login.enterAsAdmin": "Clave",
    "adminSecret.label": "Clave",
    "adminSecret.error": "Clave incorrecta",
    "adminSecret.cancel": "Cancelar",
    "adminSecret.confirm": "Confirmar",
    "adminSecret.logout": "Cerrar sesión de admin",

    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.edit": "Editar",
    "common.back": "Volver",
    "common.close": "Cerrar",
    "common.remove": "Quitar",

    "imageUpload.upload": "Subir imagen",
    "imageUpload.replace": "Reemplazar",

    "app.modal.confirm": "Confirmar",
    "app.modal.campaignCode": "Código de la campaña",
    "app.modal.newCampaign": "Nueva campaña",

    "newSessionForm.defaultSummary": "Sesión sin historial todavía.",
    "newSessionForm.session": "Sesión",
    "newSessionForm.date": "Fecha",

    "campaignSelector.title": "Rolboard",
    "campaignSelector.one": "campaña",
    "campaignSelector.many": "campañas",
    "campaignSelector.new": "Nueva campaña",
    "campaignSelector.newCard": "+ Crear campaña",

    "newCampaignForm.name": "Nombre de la campaña",
    "newCampaignForm.namePlaceholder": "ej. La Fisura de Kholinar",
    "newCampaignForm.system": "Sistema",
    "newCampaignForm.systemPlaceholder": "ej. Cosmere RPG",
    "newCampaignForm.vaultDir": "Directorio del vault",
    "newCampaignForm.noVault": "Sin vault (campaña solo dashboard)",
    "newCampaignForm.confirm": "Crear campaña",

    "campaignSettings.title": "Ajustes de la campaña",
    "campaignSettings.status": "Estado",
    "campaignSettings.statusActive": "Activa",
    "campaignSettings.statusPaused": "Pausada",
    "campaignSettings.statusFinished": "Finalizada",
    "campaignSettings.save": "Guardar cambios",
    "campaignSettings.accessCodeTitle": "Nuevo código de acceso",
    "campaignSettings.accessCodePlaceholder": "Código",
    "campaignSettings.accessCodeSave": "Guardar código",
    "campaignSettings.accessCodeSaved": "Código actualizado",
    "campaignSettings.openSettings": "Ajustes",

    "appShell.hideSidebar": "Ocultar barra lateral",
    "appShell.showSidebar": "Mostrar barra lateral",

    "sidebar.backToCampaigns": "Volver a campañas",
    "sidebar.resumen": "Resumen",
    "sidebar.arcos": "Arcos",
    "sidebar.sesiones": "Sesiones",
    "sidebar.npcs": "NPCs",
    "sidebar.jugadores": "Jugadores",
    "sidebar.locaciones": "Locaciones",
    "sidebar.facciones": "Facciones",
    "sidebar.quests": "Quests",
    "sidebar.encuentros": "Encuentros",
    "sidebar.wardails": "Wardails",

    "skillsEditor.newField": "Nuevo campo…",
    "skillsEditor.add": "Agregar",

    "characterSheet.attributes": "Atributos",
    "characterSheet.noAttributes": "Sin atributos cargados.",
    "characterSheet.others": "Otros (armadura, defensa, etc.)",
    "characterSheet.skills": "Habilidades",
    "characterSheet.noSkills": "Sin habilidades cargadas.",

    "entityDetail.deactivate": "Dar de baja",
    "entityDetail.obsidianNote": "Nota de Obsidian",
    "entityDetail.openInObsidian": "Abrir en Obsidian",
    "entityDetail.viewRenderedNote": "Ver nota renderizada",
    "entityDetail.noContent": "Sin contenido para mostrar.",

    "arcsList.title": "Arcos",
    "arcsList.count": "arcos",
    "arcsList.new": "Nuevo arco",
    "arcsList.searchPlaceholder": "Buscar arco…",

    "encountersList.title": "Encuentros",
    "encountersList.count": "encuentros",
    "encountersList.new": "Nuevo encuentro",
    "encountersList.round": "Ronda",
    "encountersList.noSession": "Sin sesión asociada",
    "encountersList.empty": "Sin encuentros todavía.",

    "factionsList.title": "Facciones",
    "factionsList.count": "facciones",
    "factionsList.new": "Nueva facción",
    "factionsList.members": "miembros",
    "factionsList.searchPlaceholder": "Buscar facción…",

    "locationsList.title": "Locaciones",
    "locationsList.count": "locaciones",
    "locationsList.new": "Nueva locación",
    "locationsList.searchPlaceholder": "Buscar locación…",

    "npcList.searchPlaceholder": "Buscar nombre, locación…",
    "npcList.new": "Nuevo NPC",
    "npcList.typeFilterLabel": "TIPO",
    "npcList.statusFilterLabel": "STATUS",
    "npcList.colName": "Nombre",
    "npcList.colType": "Tipo",
    "npcList.colLocation": "Ubicación actual",
    "npcList.colStatus": "Status",
    "npcList.empty": "Ningún NPC coincide con el filtro.",
    "npcList.prev": "Anterior",
    "npcList.next": "Siguiente",
    "npcList.page": "Página",
    "npcList.of": "de",

    "playersList.title": "Jugadores",
    "playersList.count": "personajes",
    "playersList.new": "Nuevo personaje",
    "playersList.playedBy": "Jugado por",
    "playersList.searchPlaceholder": "Buscar personaje…",

    "questsList.title": "Quests",
    "questsList.count": "quests",
    "questsList.new": "Nueva quest",
    "questsList.searchPlaceholder": "Buscar quest…",

    "common.description": "Descripción",
    "common.summary": "Resumen",
    "common.add": "Agregar",

    "entityDetails.arcosBreadcrumb": "ARCOS",
    "entityDetails.faccionesBreadcrumb": "FACCIONES",
    "entityDetails.locacionesBreadcrumb": "LOCACIONES",

    "arcDetail.closeArc": "Cerrar arco",
    "arcDetail.startArc": "Iniciar arco",
    "arcDetail.sessions": "Sesiones",

    "factionDetail.alignment": "Alineación",
    "factionDetail.leader": "Líder",
    "factionDetail.members": "Miembros",
    "factionDetail.remove": "Sacar",
    "factionDetail.noMembers": "Sin miembros todavía.",
    "factionDetail.addNpcPlaceholder": "Agregar NPC…",
    "factionDetail.players": "Jugadores",
    "factionDetail.noPlayers": "Sin jugadores todavía.",
    "factionDetail.addPlayerPlaceholder": "Agregar jugador…",

    "locationDetail.hierarchy": "Jerarquía",
    "locationDetail.subLocations": "Sub-locaciones",
    "locationDetail.noSubLocations": "Sin sub-locaciones registradas.",

    "questDetail.priorityHigh": "Alta",
    "questDetail.priorityMedium": "Media",
    "questDetail.priorityLow": "Baja",
    "questDetail.hook": "Gancho",
    "questDetail.priority": "Prioridad",
    "questDetail.notes": "Notas del DM",

    "npcDetail.viewSheet": "Ver ficha",
    "npcDetail.firstAppearance": "Primera aparición",
    "npcDetail.lastSeen": "Visto por última vez",
    "npcDetail.links": "Vínculos",
    "npcDetail.appearances": "Apariciones",
    "npcDetail.relatedQuests": "Quests relacionadas",
    "npcDetail.sheetPrefix": "Ficha",

    "playerDetail.breadcrumb": "JUGADORES",
    "playerDetail.backstory": "Trasfondo",
    "playerDetail.viewFullBackstory": "Ver historia completa",
    "playerDetail.progressionNotes": "Notas de progresión",
    "playerDetail.viewProgression": "Ver avances",
    "playerDetail.historyTitlePrefix": "Historia",
    "playerDetail.progressTitlePrefix": "Avances",

    "sessionsTimeline.title": "Sesiones",
    "sessionsTimeline.sessionsWord": "sesiones",
    "sessionsTimeline.in": "en",
    "sessionsTimeline.plan": "Planificar sesión",
    "sessionsTimeline.play": "Jugar sesión",
    "sessionsTimeline.noArc": "Sin arco",
    "sessionsTimeline.noDate": "sin fecha",
    "sessionsTimeline.planned": "Planificada",

    "planSession.defaultSummary": "Sin notas de preparación todavía.",
    "planSession.planning": "Planificando",
    "planSession.tentativeDate": "Fecha tentativa (opcional)",
    "planSession.prepNotesLabel": "Notas de preparación (admite Markdown)",
    "planSession.prepPlaceholder":
      "Qué querés que pase, ganchos preparados, escenas planeadas…",
    "planSession.expectedNpcs": "NPCs esperados",
    "planSession.noNpcsYet": "Sin NPCs cargados todavía en esta campaña.",
    "planSession.expectedQuests": "Quests esperadas",
    "planSession.noQuestsYet": "Sin quests cargadas todavía en esta campaña.",
    "planSession.note":
      'La sesión queda marcada como "planificada" hasta que la abras y la confirmes como jugada, con fecha real y resumen.',

    "common.editing": "Editando",
    "common.unsavedChanges": "cambios sin guardar",
    "common.discard": "Descartar",
    "common.name": "Nombre",
    "common.type": "Tipo",
    "common.status": "Estado",

    "arcEdit.new": "Nuevo arco",
    "arcEdit.nameLabel": "Nombre del arco",
    "arcEdit.namePlaceholder": "ej. Arco III · La Marea Alta",
    "arcEdit.numberLabel": "Número de arco",
    "arcEdit.subarcPrefix": 'Subarco (opcional, ej. 1 para "Arco',
    "arcEdit.subarcPlaceholder": "vacío = arco principal",
    "arcEdit.obsidianPathLabel": "Ruta en Obsidian",

    "factionEdit.new": "Nueva facción",
    "factionEdit.image": "Emblema",
    "factionEdit.noLeader": "Sin líder",

    "locationEdit.new": "Nueva locación",
    "locationEdit.image": "Imagen",
    "locationEdit.parentLocation": "Ubicación padre",
    "locationEdit.noParent": "— sin padre —",

    "npcEdit.new": "Nuevo NPC",
    "npcEdit.detailLevel": "Nivel de detalle",
    "npcEdit.portrait": "Retrato",
    "npcEdit.detailFull": "Completo",
    "npcEdit.detailMinor": "Menor",
    "npcEdit.sprenType": "Tipo de spren",
    "npcEdit.sprenPlaceholder": "ej. Honorspren",
    "npcEdit.ethnicity": "Etnia",
    "npcEdit.ethnicityPlaceholder": "ej. Alethi",
    "npcEdit.linkWithNpc": "Vínculo con otro NPC",
    "npcEdit.linkRolePlaceholder": "Rol (ej. VINCULADO)",
    "npcEdit.noLink": "— sin vínculo —",
    "npcEdit.noLocation": "— sin ubicación —",
    "npcEdit.markedDead": "NPC marcado como muerto",
    "npcEdit.missingOrigin": "Falta la ubicación de origen",
    "npcEdit.warningBody":
      "Podés guardar igual; el campo queda marcado como incompleto en la ficha.",

    "playerEdit.new": "Nuevo personaje",
    "playerEdit.characterName": "Nombre del personaje",
    "playerEdit.player": "Jugador",
    "playerEdit.race": "Raza",
    "playerEdit.class": "Clase",
    "playerEdit.currentHp": "HP actual",
    "playerEdit.maxHp": "HP máximo",
    "playerEdit.markedDead": "Personaje marcado como muerto",
    "playerEdit.missingRace": "Falta definir la raza",

    "questEdit.new": "Nueva quest",
    "questEdit.title": "Título",
    "questEdit.hookLabel": "Gancho narrativo (admite Markdown)",
    "questEdit.notesLabel": "Notas del DM (privadas, admite Markdown)",

    "common.supportsMarkdown": "(admite Markdown)",

    "sessionEdit.confirmingPlay": "Confirmando como jugada",
    "sessionEdit.sessionPrefix": "Sesión",
    "sessionEdit.confirmPlayed": "Confirmar como jugada",
    "sessionEdit.planned": "Planificado",
    "sessionEdit.tentativeDateLabel": "Fecha tentativa",
    "sessionEdit.notSet": "sin definir",
    "sessionEdit.whatHappened": "Lo que pasó",
    "sessionEdit.realDate": "Fecha real",
    "sessionEdit.recapLabel": "Historial de lo jugado (admite Markdown)",
    "sessionEdit.recapPlaceholder": "Qué pasó realmente…",
    "sessionEdit.prepNotesKeptSeparate":
      "Las notas de preparación quedan guardadas aparte, no se pisan.",
    "sessionEdit.deleteSession": "Borrar sesión",
    "sessionEdit.arc": "Arco",
    "sessionEdit.history": "Historial",
    "sessionEdit.prepNotesOnly": "Notas de preparación",
    "sessionEdit.originalPrepNotes": "Notas de preparación originales",
    "sessionEdit.playedSuffix": "· jugada",
    "sessionEdit.plannedSuffix": "· planificada",
    "sessionEdit.markAsPlayed": "Marcar como jugada",

    "encounterDetail.breadcrumb": "ENCUENTROS",
    "encounterDetail.addRound": "+1 ronda",
    "encounterDetail.startCombat": "Iniciar combate",
    "encounterDetail.closeCombat": "Cerrar combate",
    "encounterDetail.participants": "Participantes",
    "encounterDetail.noTurnAssigned": "Sin turno asignado",
    "encounterDetail.noParticipantsYet": "Sin participantes todavía.",
    "encounterDetail.addFighter": "Agregar peleador",
    "encounterDetail.optPc": "Personaje",
    "encounterDetail.optCustom": "Enemigo genérico",
    "encounterDetail.chooseNpc": "Elegir NPC…",
    "encounterDetail.choosePc": "Elegir personaje…",
    "encounterDetail.customNamePlaceholder": "Nombre (ej. Bandido 3)",
    "encounterDetail.actedTitle": "Jugó su turno esta ronda",
    "encounterDetail.removeTitle": "Sacar del encuentro",
    "encounterDetail.fast": "Rápido",
    "encounterDetail.slow": "Lento",
    "encounterDetail.viewFullSheet": "Ver ficha completa",
    "encounterDetail.sheetTitle": "Ficha (atributos y habilidades)",
    "encounterDetail.kindPc": "PJ",
    "encounterDetail.noName": "Sin nombre",
    "encounterDetail.fastPcs": "Rápidos · PJs",
    "encounterDetail.fastNpcs": "Rápidos · PNJs",
    "encounterDetail.slowPcs": "Lentos · PJs",
    "encounterDetail.slowNpcs": "Lentos · PNJs",

    "common.toastErrorSaving": "Error guardando",
    "common.toastErrorCreating": "Error creando",
    "common.toastErrorDeleting": "Error borrando",
    "common.nounNpc": "NPC",
    "common.nounFaction": "facción",
    "common.nounLocation": "locación",
    "common.nounArc": "arco",
    "common.nounQuest": "quest",
    "common.nounSession": "sesión",
    "common.nounCharacter": "personaje",
    "common.nounEncounter": "encuentro",

    "toast.reindexed": "Vault reindexado",
    "toast.errorReindexing": "Error reindexando el vault",
    "toast.errorLoading": "No se pudieron cargar los datos",
    "npcTypes.manage": "Tipos",
    "npcTypes.title": "Tipos de NPC",
    "npcTypes.hint": "El nombre y el color se pueden cambiar cuando quieras. En el vault se usa la clave en `tipo:`.",
    "npcTypes.newPlaceholder": "Nuevo tipo (ej. Monstruo)",
    "npcTypes.add": "Añadir",
    "npcTypes.delete": "Borrar tipo",
    "npcTypes.color": "Color",
    "npcTypes.confirmDelete": "¿Borrar este tipo?",
    "npcTypes.inUse": "No se puede borrar: hay NPCs con este tipo",
    "npcTypes.errorSaving": "Error guardando el tipo",
    "wardails.title": "Wardails",
    "wardails.subtitle": "Temas sensibles de esta campaña",
    "wardails.empty": "Todavía no definiste wardails para esta campaña.",
    "wardails.placeholder": "Un tema por línea, o usá > [!WARNING] para destacar los más delicados",
    "wardails.saved": "Wardails guardados",
    "wardails.errorSaving": "Error guardando los wardails",
    "footer.github": "Repositorio en GitHub",
    "footer.portfolio": "Portfolio de Nicolás Correa",
    "footer.help": "Ayuda",
    "splash.tagline": "Tu compañero de campañas de rol",
    "splash.enter": "Entrar",
    "splash.repo": "Repositorio",
    "splash.credits": "Créditos",
    "help.title": "Ayuda",
    "help.back": "Volver",
    "help.contents": "Contenido",
    "help.docs": "Documentación técnica en GitHub",

    "confirm.deactivateNpc":
      "¿Dar de baja este NPC? Deja de verse en la campaña, no se borra.",
    "confirm.deactivateCharacter":
      "¿Dar de baja este personaje? Deja de verse en la campaña, no se borra.",
    "confirm.deleteSession": "¿Borrar esta sesión? No se puede deshacer.",
    "confirm.deleteEncounter": "¿Borrar este encuentro? No se puede deshacer.",
    "confirm.deactivateEntityBase": "¿Dar de baja este",
    "confirm.deactivateEntitySuffix":
      "? Deja de verse en la campaña, no se borra.",

    "dashboard.reindexing": "Reindexando…",
    "dashboard.reindexVault": "Reindexar vault",
    "dashboard.currentArc": "Arco actual",
    "dashboard.lastSession": "Última sesión",
    "dashboard.activeQuests": "Quests activas",
    "dashboard.viewAllFem": "Ver todas",
    "dashboard.viewAllMasc": "Ver todos",
    "dashboard.recentNpcs": "NPCs recientes",
  },
  en: {
    "login.label": "Access code",
    "login.error": "Incorrect code",
    "login.cancel": "Cancel",
    "login.confirm": "Enter",
    "login.enterAsAdmin": "Key",
    "adminSecret.label": "Key",
    "adminSecret.error": "Incorrect key",
    "adminSecret.cancel": "Cancel",
    "adminSecret.confirm": "Confirm",
    "adminSecret.logout": "Log out of admin",

    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.close": "Close",
    "common.remove": "Remove",

    "imageUpload.upload": "Upload image",
    "imageUpload.replace": "Replace",

    "app.modal.confirm": "Confirm",
    "app.modal.campaignCode": "Campaign code",
    "app.modal.newCampaign": "New campaign",

    "newSessionForm.defaultSummary": "Session with no history yet.",
    "newSessionForm.session": "Session",
    "newSessionForm.date": "Date",

    "campaignSelector.title": "Rolboard",
    "campaignSelector.one": "campaign",
    "campaignSelector.many": "campaigns",
    "campaignSelector.new": "New campaign",
    "campaignSelector.newCard": "+ Create campaign",

    "newCampaignForm.name": "Campaign name",
    "newCampaignForm.namePlaceholder": "e.g. The Kholinar Rift",
    "newCampaignForm.system": "System",
    "newCampaignForm.systemPlaceholder": "e.g. Cosmere RPG",
    "newCampaignForm.vaultDir": "Vault directory",
    "newCampaignForm.noVault": "No vault (dashboard-only campaign)",
    "newCampaignForm.confirm": "Create campaign",

    "campaignSettings.title": "Campaign settings",
    "campaignSettings.status": "Status",
    "campaignSettings.statusActive": "Active",
    "campaignSettings.statusPaused": "Paused",
    "campaignSettings.statusFinished": "Finished",
    "campaignSettings.save": "Save changes",
    "campaignSettings.accessCodeTitle": "New access code",
    "campaignSettings.accessCodePlaceholder": "Code",
    "campaignSettings.accessCodeSave": "Save code",
    "campaignSettings.accessCodeSaved": "Code updated",
    "campaignSettings.openSettings": "Settings",

    "appShell.hideSidebar": "Hide sidebar",
    "appShell.showSidebar": "Show sidebar",

    "sidebar.backToCampaigns": "Back to campaigns",
    "sidebar.resumen": "Summary",
    "sidebar.arcos": "Arcs",
    "sidebar.sesiones": "Sessions",
    "sidebar.npcs": "NPCs",
    "sidebar.jugadores": "Players",
    "sidebar.locaciones": "Locations",
    "sidebar.facciones": "Factions",
    "sidebar.quests": "Quests",
    "sidebar.encuentros": "Encounters",
    "sidebar.wardails": "Wardails",

    "skillsEditor.newField": "New field…",
    "skillsEditor.add": "Add",

    "characterSheet.attributes": "Attributes",
    "characterSheet.noAttributes": "No attributes loaded.",
    "characterSheet.others": "Others (armor, defense, etc.)",
    "characterSheet.skills": "Skills",
    "characterSheet.noSkills": "No skills loaded.",

    "entityDetail.deactivate": "Deactivate",
    "entityDetail.obsidianNote": "Obsidian note",
    "entityDetail.openInObsidian": "Open in Obsidian",
    "entityDetail.viewRenderedNote": "View rendered note",
    "entityDetail.noContent": "No content to show.",

    "arcsList.title": "Arcs",
    "arcsList.count": "arcs",
    "arcsList.new": "New arc",
    "arcsList.searchPlaceholder": "Search arc…",

    "encountersList.title": "Encounters",
    "encountersList.count": "encounters",
    "encountersList.new": "New encounter",
    "encountersList.round": "Round",
    "encountersList.noSession": "No associated session",
    "encountersList.empty": "No encounters yet.",

    "factionsList.title": "Factions",
    "factionsList.count": "factions",
    "factionsList.new": "New faction",
    "factionsList.members": "members",
    "factionsList.searchPlaceholder": "Search faction…",

    "locationsList.title": "Locations",
    "locationsList.count": "locations",
    "locationsList.new": "New location",
    "locationsList.searchPlaceholder": "Search location…",

    "npcList.searchPlaceholder": "Search name, location…",
    "npcList.new": "New NPC",
    "npcList.typeFilterLabel": "TYPE",
    "npcList.statusFilterLabel": "STATUS",
    "npcList.colName": "Name",
    "npcList.colType": "Type",
    "npcList.colLocation": "Current location",
    "npcList.colStatus": "Status",
    "npcList.empty": "No NPC matches the filter.",
    "npcList.prev": "Previous",
    "npcList.next": "Next",
    "npcList.page": "Page",
    "npcList.of": "of",

    "playersList.title": "Players",
    "playersList.count": "characters",
    "playersList.new": "New character",
    "playersList.playedBy": "Played by",
    "playersList.searchPlaceholder": "Search character…",

    "questsList.title": "Quests",
    "questsList.count": "quests",
    "questsList.new": "New quest",
    "questsList.searchPlaceholder": "Search quest…",

    "common.description": "Description",
    "common.summary": "Summary",
    "common.add": "Add",

    "entityDetails.arcosBreadcrumb": "ARCS",
    "entityDetails.faccionesBreadcrumb": "FACTIONS",
    "entityDetails.locacionesBreadcrumb": "LOCATIONS",

    "arcDetail.closeArc": "Close arc",
    "arcDetail.startArc": "Start arc",
    "arcDetail.sessions": "Sessions",

    "factionDetail.alignment": "Alignment",
    "factionDetail.leader": "Leader",
    "factionDetail.members": "Members",
    "factionDetail.remove": "Remove",
    "factionDetail.noMembers": "No members yet.",
    "factionDetail.addNpcPlaceholder": "Add NPC…",
    "factionDetail.players": "Players",
    "factionDetail.noPlayers": "No players yet.",
    "factionDetail.addPlayerPlaceholder": "Add player…",

    "locationDetail.hierarchy": "Hierarchy",
    "locationDetail.subLocations": "Sub-locations",
    "locationDetail.noSubLocations": "No sub-locations registered.",

    "questDetail.priorityHigh": "High",
    "questDetail.priorityMedium": "Medium",
    "questDetail.priorityLow": "Low",
    "questDetail.hook": "Hook",
    "questDetail.priority": "Priority",
    "questDetail.notes": "DM notes",

    "npcDetail.viewSheet": "View sheet",
    "npcDetail.firstAppearance": "First appearance",
    "npcDetail.lastSeen": "Last seen",
    "npcDetail.links": "Links",
    "npcDetail.appearances": "Appearances",
    "npcDetail.relatedQuests": "Related quests",
    "npcDetail.sheetPrefix": "Sheet",

    "playerDetail.breadcrumb": "PLAYERS",
    "playerDetail.backstory": "Backstory",
    "playerDetail.viewFullBackstory": "View full backstory",
    "playerDetail.progressionNotes": "Progression notes",
    "playerDetail.viewProgression": "View progression",
    "playerDetail.historyTitlePrefix": "Backstory",
    "playerDetail.progressTitlePrefix": "Progress",

    "sessionsTimeline.title": "Sessions",
    "sessionsTimeline.sessionsWord": "sessions",
    "sessionsTimeline.in": "in",
    "sessionsTimeline.plan": "Plan session",
    "sessionsTimeline.play": "Play session",
    "sessionsTimeline.noArc": "No arc",
    "sessionsTimeline.noDate": "no date",
    "sessionsTimeline.planned": "Planned",

    "planSession.defaultSummary": "No prep notes yet.",
    "planSession.planning": "Planning",
    "planSession.tentativeDate": "Tentative date (optional)",
    "planSession.prepNotesLabel": "Prep notes (supports Markdown)",
    "planSession.prepPlaceholder":
      "What you want to happen, prepared hooks, planned scenes…",
    "planSession.expectedNpcs": "Expected NPCs",
    "planSession.noNpcsYet": "No NPCs loaded yet in this campaign.",
    "planSession.expectedQuests": "Expected quests",
    "planSession.noQuestsYet": "No quests loaded yet in this campaign.",
    "planSession.note":
      'The session stays marked as "planned" until you open it and confirm it as played, with a real date and summary.',

    "common.editing": "Editing",
    "common.unsavedChanges": "unsaved changes",
    "common.discard": "Discard",
    "common.name": "Name",
    "common.type": "Type",
    "common.status": "Status",

    "arcEdit.new": "New arc",
    "arcEdit.nameLabel": "Arc name",
    "arcEdit.namePlaceholder": "e.g. Arc III · The High Tide",
    "arcEdit.numberLabel": "Arc number",
    "arcEdit.subarcPrefix": 'Subarc (optional, e.g. 1 for "Arc',
    "arcEdit.subarcPlaceholder": "empty = main arc",
    "arcEdit.obsidianPathLabel": "Obsidian path",

    "factionEdit.new": "New faction",
    "factionEdit.image": "Emblem",
    "factionEdit.noLeader": "No leader",

    "locationEdit.new": "New location",
    "locationEdit.image": "Image",
    "locationEdit.parentLocation": "Parent location",
    "locationEdit.noParent": "— no parent —",

    "npcEdit.new": "New NPC",
    "npcEdit.detailLevel": "Detail level",
    "npcEdit.portrait": "Portrait",
    "npcEdit.detailFull": "Full",
    "npcEdit.detailMinor": "Minor",
    "npcEdit.sprenType": "Spren type",
    "npcEdit.sprenPlaceholder": "e.g. Honorspren",
    "npcEdit.ethnicity": "Ethnicity",
    "npcEdit.ethnicityPlaceholder": "e.g. Alethi",
    "npcEdit.linkWithNpc": "Link with another NPC",
    "npcEdit.linkRolePlaceholder": "Role (e.g. LINKED)",
    "npcEdit.noLink": "— no link —",
    "npcEdit.noLocation": "— no location —",
    "npcEdit.markedDead": "NPC marked as dead",
    "npcEdit.missingOrigin": "Missing origin location",
    "npcEdit.warningBody":
      "You can still save; the field is flagged as incomplete on the sheet.",

    "playerEdit.new": "New character",
    "playerEdit.characterName": "Character name",
    "playerEdit.player": "Player",
    "playerEdit.race": "Race",
    "playerEdit.class": "Class",
    "playerEdit.currentHp": "Current HP",
    "playerEdit.maxHp": "Max HP",
    "playerEdit.markedDead": "Character marked as dead",
    "playerEdit.missingRace": "Race not set",

    "questEdit.new": "New quest",
    "questEdit.title": "Title",
    "questEdit.hookLabel": "Narrative hook (supports Markdown)",
    "questEdit.notesLabel": "DM notes (private, supports Markdown)",

    "common.supportsMarkdown": "(supports Markdown)",

    "sessionEdit.confirmingPlay": "Confirming as played",
    "sessionEdit.sessionPrefix": "Session",
    "sessionEdit.confirmPlayed": "Confirm as played",
    "sessionEdit.planned": "Planned",
    "sessionEdit.tentativeDateLabel": "Tentative date",
    "sessionEdit.notSet": "not set",
    "sessionEdit.whatHappened": "What happened",
    "sessionEdit.realDate": "Real date",
    "sessionEdit.recapLabel": "History of what was played (supports Markdown)",
    "sessionEdit.recapPlaceholder": "What actually happened…",
    "sessionEdit.prepNotesKeptSeparate":
      "Prep notes stay saved separately, they don't get overwritten.",
    "sessionEdit.deleteSession": "Delete session",
    "sessionEdit.arc": "Arc",
    "sessionEdit.history": "History",
    "sessionEdit.prepNotesOnly": "Prep notes",
    "sessionEdit.originalPrepNotes": "Original prep notes",
    "sessionEdit.playedSuffix": "· played",
    "sessionEdit.plannedSuffix": "· planned",
    "sessionEdit.markAsPlayed": "Mark as played",

    "encounterDetail.breadcrumb": "ENCOUNTERS",
    "encounterDetail.addRound": "+1 round",
    "encounterDetail.startCombat": "Start combat",
    "encounterDetail.closeCombat": "Close combat",
    "encounterDetail.participants": "Participants",
    "encounterDetail.noTurnAssigned": "No turn assigned",
    "encounterDetail.noParticipantsYet": "No participants yet.",
    "encounterDetail.addFighter": "Add fighter",
    "encounterDetail.optPc": "Character",
    "encounterDetail.optCustom": "Generic enemy",
    "encounterDetail.chooseNpc": "Choose NPC…",
    "encounterDetail.choosePc": "Choose character…",
    "encounterDetail.customNamePlaceholder": "Name (e.g. Bandit 3)",
    "encounterDetail.actedTitle": "Played their turn this round",
    "encounterDetail.removeTitle": "Remove from encounter",
    "encounterDetail.fast": "Fast",
    "encounterDetail.slow": "Slow",
    "encounterDetail.viewFullSheet": "View full sheet",
    "encounterDetail.sheetTitle": "Sheet (attributes and skills)",
    "encounterDetail.kindPc": "PC",
    "encounterDetail.noName": "No name",
    "encounterDetail.fastPcs": "Fast · PCs",
    "encounterDetail.fastNpcs": "Fast · NPCs",
    "encounterDetail.slowPcs": "Slow · PCs",
    "encounterDetail.slowNpcs": "Slow · NPCs",

    "common.toastErrorSaving": "Error saving",
    "common.toastErrorCreating": "Error creating",
    "common.toastErrorDeleting": "Error deleting",
    "common.nounNpc": "NPC",
    "common.nounFaction": "faction",
    "common.nounLocation": "location",
    "common.nounArc": "arc",
    "common.nounQuest": "quest",
    "common.nounSession": "session",
    "common.nounCharacter": "character",
    "common.nounEncounter": "encounter",

    "toast.reindexed": "Vault reindexed",
    "toast.errorReindexing": "Error reindexing the vault",
    "toast.errorLoading": "Couldn't load data",
    "npcTypes.manage": "Types",
    "npcTypes.title": "NPC types",
    "npcTypes.hint": "Name and color can be changed any time. In the vault, use the key in `tipo:`.",
    "npcTypes.newPlaceholder": "New type (e.g. Monster)",
    "npcTypes.add": "Add",
    "npcTypes.delete": "Delete type",
    "npcTypes.color": "Color",
    "npcTypes.confirmDelete": "Delete this type?",
    "npcTypes.inUse": "Can't delete: NPCs use this type",
    "npcTypes.errorSaving": "Error saving the type",
    "wardails.title": "Wardails",
    "wardails.subtitle": "Sensitive topics for this campaign",
    "wardails.empty": "You haven't defined any wardails for this campaign yet.",
    "wardails.placeholder": "One topic per line, or use > [!WARNING] to highlight the most sensitive ones",
    "wardails.saved": "Wardails saved",
    "wardails.errorSaving": "Error saving the wardails",
    "footer.github": "GitHub repository",
    "footer.portfolio": "Nicolás Correa's portfolio",
    "footer.help": "Help",
    "splash.tagline": "Your tabletop campaign companion",
    "splash.enter": "Enter",
    "splash.repo": "Repository",
    "splash.credits": "Credits",
    "help.title": "Help",
    "help.back": "Back",
    "help.contents": "Contents",
    "help.docs": "Technical docs on GitHub",

    "confirm.deactivateNpc":
      "Deactivate this NPC? It stops showing in the campaign, it isn't deleted.",
    "confirm.deactivateCharacter":
      "Deactivate this character? It stops showing in the campaign, it isn't deleted.",
    "confirm.deleteSession": "Delete this session? This can't be undone.",
    "confirm.deleteEncounter": "Delete this encounter? This can't be undone.",
    "confirm.deactivateEntityBase": "Deactivate this",
    "confirm.deactivateEntitySuffix":
      "? It stops showing in the campaign, it isn't deleted.",

    "dashboard.reindexing": "Reindexing…",
    "dashboard.reindexVault": "Reindex vault",
    "dashboard.currentArc": "Current arc",
    "dashboard.lastSession": "Last session",
    "dashboard.activeQuests": "Active quests",
    "dashboard.viewAllFem": "View all",
    "dashboard.viewAllMasc": "View all",
    "dashboard.recentNpcs": "Recent NPCs",
  },
} as const;

export type TranslationKey = keyof (typeof dict)["es"];

let currentLang: Lang =
  (localStorage.getItem(STORAGE_KEY) as Lang) ||
  (navigator.language.startsWith("es") ? "es" : "en");

export function getLang(): Lang {
  return currentLang;
}

export function setLang(next: Lang) {
  currentLang = next;
  localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new Event(LANG_EVENT));
}

export function useLang(): Lang {
  const [lang, setLocalLang] = useState(currentLang);
  useEffect(() => {
    const handler = () => setLocalLang(currentLang);
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);
  return lang;
}

export function useT() {
  const lang = useLang();
  return (key: TranslationKey) => dict[lang][key];
}

export function npcLeaderWarning(lang: Lang, count: number): string {
  return lang === "es"
    ? ` Es líder de ${count} facción(es) — van a quedar sin líder visible.`
    : ` Is the leader of ${count} faction(s) — they'll be left without a visible leader.`;
}

export function arcSessionsWarning(lang: Lang, count: number): string {
  return lang === "es"
    ? ` Tiene ${count} sesión(es) asociada(s) — van a quedar sin arco visible.`
    : ` Has ${count} associated session(s) — they'll be left without a visible arc.`;
}

export function locationDependentsWarning(
  lang: Lang,
  children: number,
  npcsHere: number,
): string {
  const parts: string[] =
    lang === "es"
      ? [
          ...(children > 0 ? [`${children} sub-locación(es)`] : []),
          ...(npcsHere > 0 ? [`${npcsHere} NPC(s)`] : []),
        ]
      : [
          ...(children > 0 ? [`${children} sub-location(s)`] : []),
          ...(npcsHere > 0 ? [`${npcsHere} NPC(s)`] : []),
        ];
  if (parts.length === 0) return "";
  return lang === "es"
    ? ` Tiene ${parts.join(" y ")} que dependen de esta locación — van a quedar sin referencia visible.`
    : ` Has ${parts.join(" and ")} depending on this location — they'll be left without a visible reference.`;
}
