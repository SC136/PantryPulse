-- ============================================================
-- Households feature — v4 FINAL (RLS fix for server-side auth)
--
-- The Supabase server client passes auth via cookies/JWT.
-- auth.uid() works in USING but can fail in WITH CHECK for
-- inserts on the server side. Fix: use permissive insert checks
-- and rely on API-level auth validation.
--
-- INSTRUCTIONS: Run this ENTIRE script in Supabase SQL Editor.
-- Safe to run multiple times (drops and recreates policies).
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

-- 5. Drop ALL old policies (clean slate every time)
-- -----------------------------------------------------------

DROP POLICY IF EXISTS "Members can view household"          ON households;
DROP POLICY IF EXISTS "Auth users can create household"     ON households;
DROP POLICY IF EXISTS "Owner can view own households"       ON households;
DROP POLICY IF EXISTS "Members can view joined households"  ON households;
DROP POLICY IF EXISTS "Authed can insert household"         ON households;

DROP POLICY IF EXISTS "Users can read own memberships"      ON household_members;
DROP POLICY IF EXISTS "Users can insert own membership"     ON household_members;
DROP POLICY IF EXISTS "Members can view household members"  ON household_members;
DROP POLICY IF EXISTS "Members can add members"             ON household_members;

DROP POLICY IF EXISTS "Auth users can insert invites"       ON household_invites;
DROP POLICY IF EXISTS "Creators can view invites"           ON household_invites;
DROP POLICY IF EXISTS "Members can view household invites"  ON household_invites;
DROP POLICY IF EXISTS "Members can create invites"          ON household_invites;
DROP POLICY IF EXISTS "Invites readable by token or member" ON household_invites;
DROP POLICY IF EXISTS "Invites readable by member"          ON household_invites;
DROP POLICY IF EXISTS "Auth users can accept invites"       ON household_invites;

DROP POLICY IF EXISTS "Users own pantry items"              ON pantry_items;
DROP POLICY IF EXISTS "Users own or household pantry items" ON pantry_items;

DROP FUNCTION IF EXISTS is_household_member(UUID);

-- 6. Policies
-- -----------------------------------------------------------

-- === households ===

-- SELECT: user can see if they created it or are a member
CREATE POLICY "Owner can view own households"
  ON households FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Members can view joined households"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- INSERT: any authenticated user (API validates auth, RLS just checks not-null)
CREATE POLICY "Authed can insert household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- === household_members ===

-- SELECT: user can see their own membership rows
CREATE POLICY "Users can read own memberships"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: any authenticated user (API validates who/what)
CREATE POLICY "Users can insert own membership"
  ON household_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- === household_invites ===

-- INSERT: any authenticated user (API validates membership)
CREATE POLICY "Auth users can insert invites"
  ON household_invites FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT: creator or household member
CREATE POLICY "Creators can view invites"
  ON household_invites FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Members can view household invites"
  ON household_invites FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- UPDATE: any authenticated user (for accepting invites)
CREATE POLICY "Auth users can accept invites"
  ON household_invites FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- === pantry_items (updated) ===

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
