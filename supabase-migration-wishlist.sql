-- Wishlist: universal queue before purchase; move into cosmetics / wardrobe / vitamins / products.

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('cosmetics', 'clothing', 'vitamin', 'product')),
  name text NOT NULL,
  notes text,
  image_url text,
  price numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_items_select_own" ON public.wishlist_items;
DROP POLICY IF EXISTS "wishlist_items_insert_own" ON public.wishlist_items;
DROP POLICY IF EXISTS "wishlist_items_update_own" ON public.wishlist_items;
DROP POLICY IF EXISTS "wishlist_items_delete_own" ON public.wishlist_items;

CREATE POLICY "wishlist_items_select_own"
  ON public.wishlist_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "wishlist_items_insert_own"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "wishlist_items_update_own"
  ON public.wishlist_items FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "wishlist_items_delete_own"
  ON public.wishlist_items FOR DELETE
  USING (user_id = auth.uid());
