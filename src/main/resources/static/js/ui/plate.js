// The metal a room's window is framed in: what the room is for.

/** The metal of a room's plate: what the room is for. */
export function roomMaterial(type) {
  if (['barracks', 'gate', 'entrance_hall'].includes(type)) return 'war';
  if (['warehouse', 'vault', 'trade_depot'].includes(type)) return 'trade';
  if (['quarters', 'tavern', 'farm', 'brewery'].includes(type)) return 'dwarf';
  if (type === 'expedition_hall' || type === 'wizard') return 'lore';
  return 'forge';
}
