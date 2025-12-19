# Inquiry Institute Grounds

A Phaser.js + Tiled application for the Inquiry Institute with avatar movement, NPC faculty interactions, and LLM-powered chat via Supabase Edge Functions.

## Features

- **Tiled Map System**: Professional tile-based maps created in Tiled Editor
- **Avatar Movement**: WASD/Arrow keys to move around the grounds
- **Collision Detection**: Walls and boundaries prevent movement
- **NPC Faculty**: Interactive faculty members placed on the map
- **Chat System**: Press E near NPCs to start conversations
- **LLM Integration**: Supabase Edge Functions with OpenAI for intelligent responses
- **RAG Support**: Vector search for faculty-specific knowledge (optional)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Tiled Editor (for map editing) - [Download](https://www.mapeditor.org/)
- Supabase account (for chat functionality)

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Start development server:**
```bash
npm run dev
```

4. **Open your browser to `http://localhost:8080`**

### Controls

- **WASD / Arrow Keys**: Move avatar
- **E**: Talk to nearby NPCs
- **Mouse Wheel**: Zoom (if implemented)
- **Middle Click / Space + Drag**: Pan camera

## Tiled Map Setup

### Creating Maps

1. Open Tiled Editor
2. Create a new map:
   - Orientation: Orthogonal
   - Tile layer format: CSV
   - Tile size: 32x32 (or your preference)

3. **Required Layers:**
   - **Ground**: Base tile layer (walkable areas)
   - **Walls**: Collision layer (set property `collides = true`)
   - **NPCs**: Object layer with point objects for faculty

4. **Adding NPCs:**
   - Create an Object Layer named "NPCs"
   - Add point objects with these properties:
     - `name`: Unique identifier (e.g., "MaryShelley")
     - `type`: "faculty"
     - `displayName`: Display name (e.g., "Mary Shelley")
     - `personaId`: Persona identifier (e.g., "faculty.maryshelley")
     - `greeting`: Initial greeting message

5. **Export:**
   - Save as JSON format (.tmj)
   - Place in `/public/maps/`
   - Ensure tileset image is in `/public/maps/`

### Example NPC Object

In Tiled, create a point object with:
- Position: Where you want the NPC on the map
- Properties:
  - `displayName` = "Mary Shelley"
  - `personaId` = "faculty.maryshelley"
  - `greeting` = "Good evening. What are we animating today?"
  - `type` = "faculty"

## Supabase Setup

### 1. Database Migration

Run the migration in your Supabase SQL editor:

```bash
# The migration file is in:
supabase/migrations/001_faculty_personas.sql
```

This creates:
- `faculty_personas` table
- `faculty_documents` table (for RAG)
- Vector similarity search function

### 2. Deploy Edge Function

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy faculty-chat
```

### 3. Set Environment Variables

In Supabase Dashboard → Edge Functions → faculty-chat → Settings:

- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
- `OPENAI_API_KEY`: Your OpenAI API key (optional, for LLM responses)

### 4. Add Faculty Personas

The migration includes sample personas. To add more:

```sql
INSERT INTO faculty_personas (persona_id, display_name, system_prompt, greeting, rag_enabled)
VALUES (
  'faculty.yourname',
  'Your Name',
  'Your system prompt describing the persona...',
  'Initial greeting message',
  false
);
```

## Project Structure

```
.
├── public/
│   └── maps/
│       ├── campus.tmj          # Tiled map JSON
│       ├── tiles.tsj           # Tileset definition
│       └── tiles.png           # Tileset image
├── src/
│   ├── main.js                 # Phaser game initialization
│   ├── scene_world.js          # Main game scene with NPCs
│   └── config.js               # Configuration
├── supabase/
│   ├── functions/
│   │   └── faculty-chat/       # Edge function for chat
│   └── migrations/
│       └── 001_faculty_personas.sql
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## Chat System Architecture

### Flow

1. Player approaches NPC (within 50px)
2. "Press E to talk" prompt appears
3. Player presses E → Chat panel opens
4. Messages sent to Supabase Edge Function
5. Edge function:
   - Looks up faculty persona
   - Optionally retrieves RAG context
   - Calls OpenAI API (or uses scripted fallback)
   - Returns response
6. Response displayed in chat panel

### Scripted vs LLM

- **Week 1 (MVP)**: Scripted responses (no API needed)
- **Week 2**: LLM-backed with OpenAI
- **Week 3**: Full RAG with vector search

The edge function automatically falls back to scripted responses if OpenAI key is not set.

## Deployment

### Build for Production

```bash
npm run build
```

Output will be in `/dist` directory.

### GitHub Pages

1. **Set up repository:**
```bash
./setup-github.sh
```

2. **Deploy:**
```bash
npm run deploy
```

### Route 53 DNS

```bash
./setup-route53.sh
```

Then configure GitHub Pages custom domain:
```bash
gh api repos/Inquiry-Institute/phaser/pages -X PUT -f cname='phaser.inquiry.institute'
```

## Technology Stack

- **Phaser.js 3.80.1**: Game framework
- **Tiled**: Map editor
- **Vite**: Build tool and dev server
- **Supabase**: Backend (database + edge functions)
- **OpenAI API**: LLM for chat (optional)
- **pgvector**: Vector search for RAG (optional)

## Adding New Faculty

1. **In Tiled:**
   - Add point object to NPCs layer
   - Set properties (displayName, personaId, greeting)

2. **In Supabase:**
   - Add persona to `faculty_personas` table
   - Optionally add documents to `faculty_documents` for RAG

3. **Reload the game** - NPCs are loaded automatically from the map!

## Multiplayer (Future)

The architecture is designed to scale to multiplayer:
- Colyseus integration
- Socket.IO for real-time presence
- Shared world state

## License

MIT

## Contributing

This project is part of the Inquiry.Institute organization. For contributions, please follow the organization's guidelines.
