// Generate pixel art avatars for faculty members
// Stores avatar data URLs in the faculty table

import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config.js';

const supabaseUrl = 'https://xougqdomkoisrxdnagcj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_sN0tF2L2uRk0d-kCV11FyA_Z3z5flmU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a simple pixel art avatar based on name
function generateAvatar(name, size = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Generate a color based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash) % 20);
  const lightness = 45 + (Math.abs(hash) % 15);
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // Draw background circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw simple face
  ctx.fillStyle = '#ffffff';
  // Eyes
  const eyeY = size * 0.4;
  const eyeSize = size * 0.15;
  ctx.beginPath();
  ctx.arc(size * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.arc(size * 0.65, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Mouth (simple smile)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.65, size * 0.2, 0, Math.PI);
  ctx.stroke();
  
  return canvas.toDataURL('image/png');
}

// Generate avatar for a faculty member
async function generateFacultyAvatar(faculty) {
  const displayName = faculty.surname 
    ? `${faculty.name} ${faculty.surname}` 
    : faculty.name;
  
  const avatarDataUrl = generateAvatar(displayName);
  
  // Update faculty record with avatar
  const { error } = await supabase
    .from('faculty')
    .update({ 
      avatar_url: avatarDataUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', faculty.id);
  
  if (error) {
    console.error(`Error updating avatar for ${faculty.id}:`, error);
    return null;
  }
  
  console.log(`✓ Generated avatar for ${displayName}`);
  return avatarDataUrl;
}

// Main function
async function main() {
  console.log('Generating avatars for faculty...');
  
  // Get all faculty
  const { data: faculty, error } = await supabase
    .from('faculty')
    .select('id, name, surname, slug, avatar_url')
    .limit(100);
  
  if (error) {
    console.error('Error fetching faculty:', error);
    return;
  }
  
  console.log(`Found ${faculty.length} faculty members`);
  
  // Generate avatars for those without one
  const withoutAvatars = faculty.filter(f => !f.avatar_url);
  console.log(`${withoutAvatars.length} faculty need avatars`);
  
  for (const member of withoutAvatars) {
    await generateFacultyAvatar(member);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Avatar generation complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateAvatar, generateFacultyAvatar };
