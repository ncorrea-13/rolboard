-- Categorías de lore base para las campañas existentes. Las nuevas las siembra CampaignRepository.Create.
INSERT INTO lore_categories (campaign_id, key, label, color, position)
SELECT c.id, d.key, d.label, d.color, d.position
FROM campaigns c
CROSS JOIN (
    SELECT 'historia' AS key, 'Historia' AS label, '#c79a55' AS color, 0 AS position
    UNION ALL SELECT 'geografia', 'Geografía', '#6fa98c', 1
    UNION ALL SELECT 'religion', 'Religión', '#a87c9b', 2
    UNION ALL SELECT 'magia', 'Magia', '#5fa8d3', 3
    UNION ALL SELECT 'cultura', 'Cultura', '#d08a3c', 4
) d
WHERE NOT EXISTS (SELECT 1 FROM lore_categories lc WHERE lc.campaign_id = c.id);
