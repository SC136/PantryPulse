-- ============================================================
-- Households feature migration (additive, non-breaking)
-- v2: Fixed infinite recursion in RLS policies
-- Run this in Supabase SQL Editor AFTER deploying the code.
-- ============================================================

-- 1. New tables
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

-- 2. Alter pantry_items — add nullable household_id
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

CREATE INDEX IF NOT EXISTS idx_pantry_household ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- 3. Helper function to break RLS recursion (SECURITY DEFINER bypasses RLS)
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION is_household_member(hid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid
      AND user_id = auth.uid()
  );
$$;

-- 4. RLS on new tables
-- -----------------------------------------------------------

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Drop old (broken) policies if they exist
DROP POLICY IF EXISTS "Members can view household" ON households;
DROP POLICY IF EXISTS "Auth users can create household" ON households;
DROP POLICY IF EXISTS "Members can view household members" ON household_members;
DROP POLICY IF EXISTS "Members can add members" ON household_members;
DROP POLICY IF EXISTS "Members can create invites" ON household_invites;
DROP POLICY IF EXISTS "Invites readable by token or member" ON household_invites;
DROP POLICY IF EXISTS "Auth users can accept invites" ON household_invites;
DROP POLICY IF EXISTS "Users own pantry items" ON pantry_items;
DROP POLICY IF EXISTS "Users own or household pantry items" ON pantry_items;

-- households: select only if user is a member (uses helper fn — no recursion)
CREATE POLICY "Members can view household" ON households
  FOR SELECT USING (is_household_member(id));

-- households: creator can insert
CREATE POLICY "Auth users can create household" ON households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- household_members: select — uses SECURITY DEFINER helper, no self-reference
CREATE POLICY "Members can view household members" ON household_members
  FOR SELECT USING (is_household_member(household_id));

-- household_members: insert — user can add themselves (via join) OR existing member adds
CREATE POLICY "Members can add members" ON household_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_household_member(household_id)
  );

-- household_invites: insert if member of household
CREATE POLICY "Members can create invites" ON household_invites
  FOR INSERT WITH CHECK (is_household_member(household_id));

-- household_invites: select if member of household
CREATE POLICY "Invites readable by member" ON household_invites
  FOR SELECT USING (is_household_member(household_id));

-- household_invites: update (set accepted_at) — anyone authenticated
CREATE POLICY "Auth users can accept invites" ON household_invites
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Update pantry_items RLS (replace old user-only policy)
-- -----------------------------------------------------------

CREATE POLICY "Users own or household pantry items" ON pantry_items
  FOR ALL USING (
    auth.uid() = user_id
    OR (
      household_id IS NOT NULL
      AND is_household_member(household_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      household_id IS NOT NULL
      AND is_household_member(household_id)
    )
  );

-- 6. Indexes for performance
-- -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);
CREATE INDEX IF NOT EXISTS idx_household_invites_token ON household_invites(token);
CREATE INDEX IF NOT EXISTS idx_household_invites_household ON household_invites(household_id);
