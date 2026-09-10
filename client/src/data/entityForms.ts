import type { FormField } from "../components/EntityForm";
import type { DashboardSection } from "../screens/CampaignDashboard";
import { locationTypeLabel, type Location } from "./domain";

export type EntityKind = "arc" | "faction" | "location" | "quest";

export const entityKindLabel: Record<EntityKind, string> = {
  arc: "arco",
  faction: "facción",
  location: "locación",
  quest: "quest",
};

export function arcFields(): FormField[] {
  return [
    {
      key: "label",
      label: "Nombre del arco",
      type: "text",
      placeholder: "ej. Arco III · La Marea Alta",
    },
    { key: "summary", label: "Resumen", type: "textarea" },
    { key: "order", label: "Número de arco", type: "number" },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "planificado", label: "Planificado" },
        { value: "en_curso", label: "En curso" },
        { value: "cerrado", label: "Cerrado" },
      ],
    },
  ];
}

export function factionFields(): FormField[] {
  return [
    { key: "name", label: "Nombre", type: "text" },
    { key: "description", label: "Descripción", type: "textarea" },
  ];
}

export function locationFields(
  locations: Location[],
  excludeId?: string,
): FormField[] {
  return [
    { key: "name", label: "Nombre", type: "text" },
    {
      key: "locationType",
      label: "Tipo",
      type: "select",
      options: Object.entries(locationTypeLabel).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: "parentId",
      label: "Ubicación padre",
      type: "select",
      options: [
        { value: "", label: "— sin padre —" },
        ...locations
          .filter((l) => l.id !== excludeId)
          .map((l) => ({ value: l.id, label: l.name })),
      ],
    },
    { key: "description", label: "Descripción", type: "textarea" },
  ];
}

export function questFields(): FormField[] {
  return [
    { key: "name", label: "Título", type: "text" },
    { key: "hook", label: "Gancho narrativo", type: "textarea" },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "active", label: "Activa" },
        { value: "on_hold", label: "En pausa" },
        { value: "completed", label: "Completada" },
        { value: "failed", label: "Fallida" },
      ],
    },
    {
      key: "priority",
      label: "Prioridad",
      type: "select",
      options: [
        { value: "1", label: "Alta" },
        { value: "2", label: "Media" },
        { value: "3", label: "Baja" },
      ],
    },
  ];
}

export const entityKindSection: Record<EntityKind, DashboardSection> = {
  arc: "arcos",
  faction: "facciones",
  location: "locaciones",
  quest: "quests",
};
