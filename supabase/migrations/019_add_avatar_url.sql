-- Add avatar_url column to faculty table for game avatars
-- Stores data URL or URL to pixel art avatar for Phaser game

ALTER TABLE public.faculty
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Index for avatar URL lookups
CREATE INDEX IF NOT EXISTS idx_faculty_avatar_url 
ON public.faculty(avatar_url) 
WHERE avatar_url IS NOT NULL;

COMMENT ON COLUMN public.faculty.avatar_url IS 'Data URL or URL to pixel art avatar for use in Phaser game';
