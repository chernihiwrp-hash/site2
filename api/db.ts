-- ============================================================================
-- Миграция для пакета изменений (выполнить в Supabase SQL Editor)
-- ============================================================================

-- 1. Кастомные фоны и баннеры фракций (для DB-фракций)
ALTER TABLE factions ADD COLUMN IF NOT EXISTS background_image text;
ALTER TABLE factions ADD COLUMN IF NOT EXISTS banner_image     text;

-- 2. То же для статических фракций (overrides)
ALTER TABLE faction_overrides ADD COLUMN IF NOT EXISTS background_image text;
ALTER TABLE faction_overrides ADD COLUMN IF NOT EXISTS banner_image     text;

-- 3. Кнопка-ссылка для документов/правил (как у новостей)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS button_data text;

-- 4. Память о голосе за мэра
CREATE TABLE IF NOT EXISTS mayor_votes (
  username      text PRIMARY KEY,
  candidate_id  bigint NOT NULL REFERENCES mayor_election(id) ON DELETE CASCADE,
  voted_at      timestamptz DEFAULT now()
);
ALTER TABLE mayor_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mayor_votes_read ON mayor_votes;
CREATE POLICY mayor_votes_read ON mayor_votes FOR SELECT USING (true);

-- 5. Каскадное удаление домов (фикс «Удаление не работает»)
ALTER TABLE house_purchase_requests
  DROP CONSTRAINT IF EXISTS house_purchase_requests_house_id_fkey;
ALTER TABLE house_purchase_requests
  ADD CONSTRAINT house_purchase_requests_house_id_fkey
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE;

-- 6. Метка «достижение получено» — чтобы не выдавать NFT повторно
CREATE TABLE IF NOT EXISTS streak_rewards (
  username    text NOT NULL,
  milestone   int  NOT NULL,
  nft_id      text,
  granted_at  timestamptz DEFAULT now(),
  PRIMARY KEY (username, milestone)
);
ALTER TABLE streak_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS streak_rewards_read ON streak_rewards;
CREATE POLICY streak_rewards_read ON streak_rewards FOR SELECT USING (true);
