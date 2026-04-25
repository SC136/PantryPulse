-- ============================================================
-- QUICK FIX: Run this single script in Supabase SQL Editor
-- It drops all old policies and recreates correct ones.
-- Safe to run multiple times.
-- ============================================================

-- Drop every possible policy name we've ever used
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

-- households
CREATE POLICY "Owner can view own households" ON households FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Members can view joined households" ON households FOR SELECT USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "Authed can insert household" ON households FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- household_members
CREATE POLICY "Users can read own memberships" ON household_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own membership" ON household_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- household_invites
CREATE POLICY "Auth users can insert invites" ON household_invites FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can view invites" ON household_invites FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Members can view household invites" ON household_invites FOR SELECT USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "Auth users can accept invites" ON household_invites FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- pantry_items
CREATE POLICY "Users own or household pantry items" ON pantry_items FOR ALL
  USING (auth.uid() = user_id OR (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())))
  WITH CHECK (auth.uid() = user_id OR (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())));
