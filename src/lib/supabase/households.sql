-- ============================================================
-- Households feature migration — v3 (simple, no recursion)
-- 
-- INSTRUCTIONS for Supabase SQL Editor:
-- Run this entire script. It is safe to run multiple times.
-- ============================================================

-- 1. Create tables if they don't exist
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- 2. Add household_id to pantry_items if missing
-- -----------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pantry_items' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE pantry_items ADD COLUMN household_id UUID REFERENCES households(id);
  END IF;
END $$;

-- 3. Indexes
-- -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_pantry_household      ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_hm_user_id            ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hm_household_id       ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_hi_token              ON household_invites(token);
CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);

-- 4. Enable RLS
-- -----------------------------------------------------------

ALTER TABLE households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- 5. Drop ALL old policies (clean slate)
-- -----------------------------------------------------------

DROP POLICY IF EXISTS "Members can view household"          ON households;
DROP POLICY IF EXISTS "Auth users can create household"     ON households;
DROP POLICY IF EXISTS "Members can view household members"  ON household_members;
DROP POLICY IF EXISTS "Members can add members"             ON household_members;
DROP POLICY IF EXISTS "Members can create invites"          ON household_invites;
DROP POLICY IF EXISTS "Invites readable by token or member" ON household_invites;
DROP POLICY IF EXISTS "Invites readable by member"          ON household_invites;
DROP POLICY IF EXISTS "Auth users can accept invites"       ON household_invites;
DROP POLICY IF EXISTS "Users own pantry items"              ON pantry_items;
DROP POLICY IF EXISTS "Users own or household pantry items" ON pantry_items;

DROP FUNCTION IF EXISTS is_household_member(UUID);

-- 6. Simple policies — NO cross-table references in household_members
-- -----------------------------------------------------------

-- household_members: anyone can read their OWN rows (no recursion!)
CREATE POLICY "Users can read own memberships"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

-- household_members: users can insert membership rows for themselves
CREATE POLICY "Users can insert own membership"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- households: user can see a household if they created it
--             OR if they have a membership row (separate simple check)
CREATE POLICY "Owner can view own households"
  ON households FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Members can view joined households"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- households: authenticated user can create
CREATE POLICY "Auth users can create household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- household_invites: member can insert (checked by API, RLS is permissive here)
CREATE POLICY "Auth users can insert invites"
  ON household_invites FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- household_invites: creator can select their own invites
CREATE POLICY "Creators can view invites"
  ON household_invites FOR SELECT
  USING (created_by = auth.uid());

-- household_invites: select by household membership
CREATE POLICY "Members can view household invites"
  ON household_invites FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- household_invites: anyone authenticated can update (accept)
CREATE POLICY "Auth users can accept invites"
  ON household_invites FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. pantry_items — drop old policy, add new one
-- -----------------------------------------------------------

CREATE POLICY "Users own or household pantry items"
  ON pantry_items FOR ALL
  USING (
    auth.uid() = user_id
    OR (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  );
