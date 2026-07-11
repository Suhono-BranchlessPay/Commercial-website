-- Temporarily disable delivery for ALL tenants until Stripe Connect can
-- settle DoorDash fees cleanly. DoorDash code stays; only config is off.
-- Re-enable later:
--   UPDATE tenants SET theme = jsonb_set(theme, '{order_types}', '["pickup","delivery"]'::jsonb)
--   WHERE id = '<tenant>';

UPDATE tenants
SET theme = jsonb_set(
  COALESCE(theme, '{}'::jsonb),
  '{order_types}',
  '["pickup"]'::jsonb,
  true
);

-- Strip "Order Delivery" CTAs from theme.copy.hero_ctas (keep Pickup + Menu).
UPDATE tenants
SET theme = jsonb_set(
  theme,
  '{copy,hero_ctas}',
  COALESCE(
    (
      SELECT jsonb_agg(cta)
      FROM jsonb_array_elements(COALESCE(theme #> '{copy,hero_ctas}', '[]'::jsonb)) AS cta
      WHERE lower(cta->>'label') NOT LIKE '%delivery%'
    ),
    '[{"label":"Order Pickup","href":"/order","style":"primary"},{"label":"View Menu","href":"/menu","style":"outline"}]'::jsonb
  ),
  true
)
WHERE theme #> '{copy,hero_ctas}' IS NOT NULL;
