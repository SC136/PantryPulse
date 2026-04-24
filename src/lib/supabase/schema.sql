-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pantry items
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'pantry' CHECK (category IN ('fridge', 'freezer', 'pantry')),
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'unit',
  purchase_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  days_until_expiry INTEGER,
  price DECIMAL(10,2),
  store VARCHAR(255),
  image_url TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-compute days_until_expiry on insert/update
CREATE OR REPLACE FUNCTION compute_days_until_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    NEW.days_until_expiry := NEW.expiry_date - CURRENT_DATE;
  ELSE
    NEW.days_until_expiry := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_days_until_expiry ON pantry_items;
CREATE TRIGGER trg_days_until_expiry
  BEFORE INSERT OR UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION compute_days_until_expiry();

-- Recipes (stored per user)
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  ingredients JSONB NOT NULL,
  instructions TEXT NOT NULL,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 2,
  tags TEXT[],
  is_favorited BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grocery list
CREATE TABLE IF NOT EXISTS grocery_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'unit',
  is_purchased BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waste log
CREATE TABLE IF NOT EXISTS waste_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  estimated_price DECIMAL(10,2),
  wasted_at TIMESTAMPTZ DEFAULT NOW(),
  reason VARCHAR(100) DEFAULT 'expired'
);

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  dietary_preferences TEXT[] DEFAULT '{}',
  cuisine_preferences TEXT[] DEFAULT '{}',
  cooking_skill VARCHAR(20) DEFAULT 'intermediate' CHECK (cooking_skill IN ('beginner', 'intermediate', 'advanced')),
  household_size INTEGER DEFAULT 2,
  has_air_fryer BOOLEAN DEFAULT FALSE,
  has_instant_pot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup (crash-proof)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS)
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies (USING = read/update/delete, WITH CHECK = insert/update)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own pantry items') THEN
    CREATE POLICY "Users own pantry items" ON pantry_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own recipes') THEN
    CREATE POLICY "Users own recipes" ON recipes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own grocery list') THEN
    CREATE POLICY "Users own grocery list" ON grocery_list FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own waste log') THEN
    CREATE POLICY "Users own waste log" ON waste_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own profile') THEN
    CREATE POLICY "Users own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pantry_user_id ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiry_date) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_pantry_category ON pantry_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_user_id ON grocery_list(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_user_id ON waste_log(user_id);
