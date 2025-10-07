-- Create tracker_templates table
CREATE TABLE public.tracker_templates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  clone_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tracker_templates
ALTER TABLE public.tracker_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for tracker_templates
CREATE POLICY "Anyone can view templates"
  ON public.tracker_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own templates"
  ON public.tracker_templates FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own templates"
  ON public.tracker_templates FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own templates"
  ON public.tracker_templates FOR DELETE
  USING (auth.uid() = creator_id);

-- Create template_items table
CREATE TABLE public.template_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  template_id BIGINT NOT NULL REFERENCES public.tracker_templates(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('boolean', 'number', 'scale'))
);

-- Enable RLS on template_items
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_items
CREATE POLICY "Anyone can view template items"
  ON public.template_items FOR SELECT
  USING (true);

CREATE POLICY "Template creators can insert items"
  ON public.template_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracker_templates
      WHERE tracker_templates.id = template_items.template_id
      AND tracker_templates.creator_id = auth.uid()
    )
  );

CREATE POLICY "Template creators can update items"
  ON public.template_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tracker_templates
      WHERE tracker_templates.id = template_items.template_id
      AND tracker_templates.creator_id = auth.uid()
    )
  );

CREATE POLICY "Template creators can delete items"
  ON public.template_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tracker_templates
      WHERE tracker_templates.id = template_items.template_id
      AND tracker_templates.creator_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX idx_template_items_template_id ON public.template_items(template_id);
CREATE INDEX idx_tracker_templates_category ON public.tracker_templates(category);
CREATE INDEX idx_tracker_templates_clone_count ON public.tracker_templates(clone_count DESC);